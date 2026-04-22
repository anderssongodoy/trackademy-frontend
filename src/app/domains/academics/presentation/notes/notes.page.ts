import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MeUseCase, MyEvaluation } from '../../application/me-use-case';
import { apiErrorMessage } from '../../../identity/infrastructure/http/api-error.interceptor';

interface EvaluationGroup {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  acumulado: string;
  acumuladoValue: number;
  promedioRegistrado: string;
  promedioRegistradoValue: number | null;
  registradas: number;
  pendientes: number;
  vencidas: number;
  totalPeso: number;
  pesoRegistrado: number;
  pesoPendiente: number;
  progresoPeso: number;
  notaNecesaria: number | null;
  riesgo: 'critico' | 'atencion' | 'estable';
  riesgoDetalle: string;
  items: MyEvaluation[];
}

interface AlertItem {
  code: string;
  course: string;
  severity: 'critico' | 'atencion';
  accumulated: string;
  detail: string;
}

@Component({
  selector: 'app-notes-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.scss'
})
export class NotesPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  evaluations: MyEvaluation[] = [];
  selectedCourseId = 'all';
  selectedStatus = 'all';
  draftGrades = new Map<string, string>();
  savingKeys = new Set<string>();
  feedbackByKey = new Map<string, { type: 'success' | 'error'; message: string }>();

  ngOnInit(): void {
    this.loadEvaluations();
  }

  get filteredEvaluations(): MyEvaluation[] {
    return this.evaluations.filter((item) => {
      const matchesCourse = this.selectedCourseId === 'all' || `${item.usuarioPeriodoCursoId}` === this.selectedCourseId;
      const matchesStatus = this.selectedStatus === 'all'
        || (this.selectedStatus === 'pending' && item.nota == null && !item.exonerado)
        || (this.selectedStatus === 'graded' && item.nota != null)
        || (this.selectedStatus === 'due' && this.isDue(item));

      return matchesCourse && matchesStatus;
    });
  }

  get groupedEvaluations(): EvaluationGroup[] {
    const groups = new Map<number, MyEvaluation[]>();

    this.filteredEvaluations.forEach((item) => {
      const current = groups.get(item.usuarioPeriodoCursoId) ?? [];
      current.push(item);
      groups.set(item.usuarioPeriodoCursoId, current);
    });

    return [...groups.entries()]
      .map(([usuarioPeriodoCursoId, items]) => {
        const sortedItems = items.slice().sort((left, right) => {
          const leftDate = left.fechaEstimada ? new Date(left.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
          const rightDate = right.fechaEstimada ? new Date(right.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
          if (leftDate !== rightDate) {
            return leftDate - rightDate;
          }
          return (left.semana ?? Number.MAX_SAFE_INTEGER) - (right.semana ?? Number.MAX_SAFE_INTEGER);
        });
        const totalPeso = items.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
        const pesoRegistrado = items
          .filter((item) => item.nota != null)
          .reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
        const acumuladoValue = this.weightedAccumulated(items);
        const promedioRegistradoValue = pesoRegistrado > 0
          ? Number(((acumuladoValue * 100) / pesoRegistrado).toFixed(1))
          : null;
        const pesoPendiente = Math.max(0, totalPeso - pesoRegistrado);
        const notaNecesaria = pesoPendiente > 0
          ? Number((((13 - acumuladoValue) * 100) / pesoPendiente).toFixed(1))
          : null;
        const vencidas = items.filter((item) => this.isDue(item)).length;
        const risk = this.resolveRisk(acumuladoValue, pesoPendiente, notaNecesaria, vencidas);

        return {
          usuarioPeriodoCursoId,
          cursoId: items[0].cursoId,
          codigoCurso: items[0].codigoCurso,
          nombreCurso: items[0].nombreCurso,
          acumulado: this.formatScore(acumuladoValue),
          acumuladoValue,
          promedioRegistrado: promedioRegistradoValue == null ? '--' : this.formatScore(promedioRegistradoValue),
          promedioRegistradoValue,
          registradas: items.filter((item) => item.nota != null).length,
          pendientes: items.filter((item) => item.nota == null && !item.exonerado).length,
          vencidas,
          totalPeso,
          pesoRegistrado,
          pesoPendiente,
          progresoPeso: totalPeso > 0 ? Math.min(100, Math.round((pesoRegistrado / totalPeso) * 100)) : 0,
          notaNecesaria,
          riesgo: risk.riesgo,
          riesgoDetalle: risk.detalle,
          items: sortedItems
        };
      })
      .sort((left, right) => left.nombreCurso.localeCompare(right.nombreCurso));
  }

  get courseOptions(): Array<{ value: string; label: string }> {
    const unique = new Map<string, string>();

    this.evaluations.forEach((item) => {
      unique.set(`${item.usuarioPeriodoCursoId}`, `${item.codigoCurso} - ${item.nombreCurso}`);
    });

    return [...unique.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  get stats() {
    const groups = this.groupedEvaluations;
    const primaryValue = groups.length === 0
      ? null
      : groups.reduce((sum, group) => sum + group.acumuladoValue, 0) / groups.length;
    const registeredWeight = groups.reduce((sum, group) => sum + group.pesoRegistrado, 0);
    const totalWeight = groups.reduce((sum, group) => sum + group.totalPeso, 0);

    return {
      total: this.filteredEvaluations.length,
      pending: this.filteredEvaluations.filter((item) => item.nota == null && !item.exonerado).length,
      graded: this.filteredEvaluations.filter((item) => item.nota != null).length,
      accumulated: primaryValue == null ? '--' : this.formatScore(primaryValue),
      registeredWeight: totalWeight === 0 ? '--' : `${Math.round((registeredWeight / totalWeight) * 100)}%`,
      riskCourses: groups.filter((item) => item.riesgo !== 'estable').length
    };
  }

  get pendingDueCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.evaluations.filter((item) => {
      if (item.nota != null || item.exonerado || !item.fechaEstimada) {
        return false;
      }

      const estimated = new Date(`${item.fechaEstimada}T00:00:00`);
      return estimated.getTime() <= today.getTime();
    }).length;
  }

  get alerts(): AlertItem[] {
    return this.groupedEvaluations
      .filter((group): group is EvaluationGroup & { riesgo: 'critico' | 'atencion' } => group.riesgo !== 'estable')
      .slice(0, 3)
      .map((group) => ({
        code: group.codigoCurso,
        course: group.nombreCurso,
        severity: group.riesgo,
        accumulated: group.acumulado,
        detail: group.riesgoDetalle
      }));
  }

  get primaryMetricLabel(): string {
    return this.selectedCourseId === 'all' ? 'Acumulado medio' : 'Acumulado del curso';
  }

  draftValue(item: MyEvaluation): string {
    const key = this.keyFor(item);
    return this.draftGrades.get(key) ?? (item.nota != null ? `${item.nota}` : '');
  }

  updateDraft(item: MyEvaluation, value: string): void {
    this.draftGrades.set(this.keyFor(item), value);
    this.feedbackByKey.delete(this.keyFor(item));
  }

  saveGrade(item: MyEvaluation): void {
    const key = this.keyFor(item);
    if (!this.canEditEvaluation(item)) {
      this.feedbackByKey.set(key, { type: 'error', message: this.editBlockReason(item) });
      return;
    }

    const rawValue = (this.draftGrades.get(key) ?? '').trim();
    if (!rawValue) {
      this.feedbackByKey.set(key, { type: 'error', message: 'Ingresa una nota entre 0 y 20.' });
      return;
    }

    const grade = Number(rawValue);
    if (Number.isNaN(grade) || grade < 0 || grade > 20) {
      this.feedbackByKey.set(key, { type: 'error', message: 'La nota debe estar entre 0 y 20.' });
      return;
    }

    this.savingKeys.add(key);
    this.feedbackByKey.delete(key);

    this.meUseCase.saveEvaluationGrade(item.usuarioPeriodoCursoId, item.evaluacionCodigo, {
      nota: grade,
      fechaReal: item.fechaReal,
      exonerado: Boolean(item.exonerado),
      esRezagado: Boolean(item.esRezagado),
      comentarios: item.comentarios ?? null
    }).subscribe({
      next: (updated) => {
        this.evaluations = this.evaluations.map((evaluation) =>
          this.keyFor(evaluation) === key ? { ...evaluation, ...updated } : evaluation
        );
        this.draftGrades.set(key, `${updated.nota ?? grade}`);
        this.feedbackByKey.set(key, { type: 'success', message: 'Nota guardada.' });
        this.savingKeys.delete(key);
      },
      error: (error) => {
        this.feedbackByKey.set(key, {
          type: 'error',
          message: apiErrorMessage(error, 'No se pudo guardar la nota.')
        });
        this.savingKeys.delete(key);
      }
    });
  }

  feedback(item: MyEvaluation): { type: 'success' | 'error'; message: string } | null {
    return this.feedbackByKey.get(this.keyFor(item)) ?? null;
  }

  isSaving(item: MyEvaluation): boolean {
    return this.savingKeys.has(this.keyFor(item));
  }

  evaluationDateLabel(item: MyEvaluation): string {
    if (item.fechaEstimada) {
      return new Date(item.fechaEstimada).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    }
    if (item.semana != null) {
      return `Semana ${item.semana}`;
    }
    return 'Fecha por definir';
  }

  weightLabel(item: MyEvaluation): string {
    return item.porcentaje != null ? `${item.porcentaje}%` : 'Sin peso';
  }

  statusLabel(item: MyEvaluation): string {
    if (item.nota != null) {
      return 'Registrada';
    }
    if (item.exonerado) {
      return 'Exonerado';
    }
    if (!this.canEditEvaluation(item)) {
      return 'Programada';
    }
    return 'Pendiente';
  }

  currentEvaluation(group: EvaluationGroup): MyEvaluation | null {
    return group.items.find((item) => item.nota == null && !item.exonerado) ?? group.items[0] ?? null;
  }

  canEditEvaluation(item: MyEvaluation): boolean {
    if (item.nota != null || !item.fechaEstimada) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const estimated = new Date(`${item.fechaEstimada}T00:00:00`);
    return estimated.getTime() <= today.getTime();
  }

  editBlockReason(item: MyEvaluation): string {
    if (this.canEditEvaluation(item)) {
      return '';
    }

    return `Disponible cuando llegue la fecha estimada${item.fechaEstimada ? ` (${this.evaluationDateLabel(item)})` : ''}.`;
  }

  private loadEvaluations(): void {
    this.meUseCase.getMyEvaluations().subscribe({
      next: (evaluations) => {
        this.evaluations = evaluations;
        evaluations.forEach((item) => {
          if (item.nota != null) {
            this.draftGrades.set(this.keyFor(item), `${item.nota}`);
          }
        });
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudieron cargar tus evaluaciones.';
        this.isLoading = false;
      }
    });
  }

  private keyFor(item: MyEvaluation): string {
    return `${item.usuarioPeriodoCursoId}-${item.evaluacionCodigo}`;
  }

  private weightedAccumulated(items: MyEvaluation[]): number {
    const total = items.reduce((sum, item) => {
      if (item.nota == null || item.porcentaje == null) {
        return sum;
      }
      return sum + (item.nota * item.porcentaje / 100);
    }, 0);

    return Number(total.toFixed(2));
  }

  private isDue(item: MyEvaluation): boolean {
    if (item.nota != null || item.exonerado || !item.fechaEstimada) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const estimated = new Date(`${item.fechaEstimada}T00:00:00`);
    return estimated.getTime() <= today.getTime();
  }

  private resolveRisk(
    acumulado: number,
    pesoPendiente: number,
    notaNecesaria: number | null,
    vencidas: number
  ): { riesgo: EvaluationGroup['riesgo']; detalle: string } {
    const maxPossible = acumulado + (pesoPendiente * 20 / 100);

    if (maxPossible < 13) {
      return { riesgo: 'critico', detalle: 'Ya no alcanza 13 incluso con notas maximas.' };
    }

    if (notaNecesaria != null && notaNecesaria > 18) {
      return { riesgo: 'critico', detalle: `Necesita ${this.formatScore(notaNecesaria)} promedio en lo pendiente.` };
    }

    if (vencidas > 0) {
      return { riesgo: 'atencion', detalle: `${vencidas} evaluacion${vencidas === 1 ? '' : 'es'} vencida${vencidas === 1 ? '' : 's'} sin nota.` };
    }

    if (notaNecesaria != null && notaNecesaria > 15) {
      return { riesgo: 'atencion', detalle: `Debe promediar ${this.formatScore(notaNecesaria)} en lo pendiente.` };
    }

    return { riesgo: 'estable', detalle: 'Sin riesgo visible con las notas registradas.' };
  }

  private formatScore(value: number): string {
    return value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
  }
}
