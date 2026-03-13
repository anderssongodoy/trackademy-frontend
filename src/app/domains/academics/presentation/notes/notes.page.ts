import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyEvaluation } from '../../application/me-use-case';

interface EvaluationGroup {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  promedio: string;
  registradas: number;
  pendientes: number;
  totalPeso: number;
  items: MyEvaluation[];
}

interface CourseMetric {
  code: string;
  average: number;
}

@Component({
  selector: 'app-notes-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.scss'
})
export class NotesPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  evaluations: MyEvaluation[] = [];
  selectedCourseId = 'all';
  searchQuery = '';
  draftGrades = new Map<string, string>();
  savingKeys = new Set<string>();
  feedbackByKey = new Map<string, { type: 'success' | 'error'; message: string }>();

  ngOnInit(): void {
    this.loadEvaluations();
  }

  get filteredEvaluations(): MyEvaluation[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.evaluations.filter((item) => {
      const matchesCourse = this.selectedCourseId === 'all' || `${item.usuarioPeriodoCursoId}` === this.selectedCourseId;
      const matchesQuery = !query || [
        item.codigoCurso,
        item.nombreCurso,
        item.evaluacionCodigo,
        item.descripcion,
        item.tipo
      ].some((value) => value?.toLowerCase().includes(query));

      return matchesCourse && matchesQuery;
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
        const grades = items
          .map((item) => item.nota)
          .filter((grade): grade is number => grade != null);

        return {
          usuarioPeriodoCursoId,
          cursoId: items[0].cursoId,
          codigoCurso: items[0].codigoCurso,
          nombreCurso: items[0].nombreCurso,
          promedio: grades.length === 0
            ? '--'
            : (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1),
          registradas: items.filter((item) => item.nota != null).length,
          pendientes: items.filter((item) => item.nota == null && !item.exonerado).length,
          totalPeso: items.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0),
          items: items.slice().sort((left, right) => {
            const leftDate = left.fechaEstimada ? new Date(left.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
            const rightDate = right.fechaEstimada ? new Date(right.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
            if (leftDate !== rightDate) {
              return leftDate - rightDate;
            }
            return (left.semana ?? Number.MAX_SAFE_INTEGER) - (right.semana ?? Number.MAX_SAFE_INTEGER);
          })
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
    const grades = this.filteredEvaluations
      .map((item) => item.nota)
      .filter((grade): grade is number => grade != null);

    return {
      total: this.filteredEvaluations.length,
      pending: this.filteredEvaluations.filter((item) => item.nota == null && !item.exonerado).length,
      graded: this.filteredEvaluations.filter((item) => item.nota != null).length,
      average: grades.length === 0 ? '--' : (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1),
      bestGrade: grades.length === 0 ? '--' : Math.max(...grades).toFixed(1),
      approvedCourses: this.courseMetrics.filter((item) => item.average >= 13).length
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

  get courseMetrics(): CourseMetric[] {
    return this.groupedEvaluations
      .map((group) => {
        const grades = group.items
          .map((item) => item.nota)
          .filter((grade): grade is number => grade != null);

        if (grades.length === 0) {
          return null;
        }

        return {
          code: group.codigoCurso,
          average: Number((grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1))
        };
      })
      .filter((item): item is CourseMetric => item != null);
  }

  get visibleAverageValue(): number {
    return this.stats.average === '--' ? 0 : Number(this.stats.average);
  }

  get barChartBars(): Array<{ code: string; value: number; height: number }> {
    return this.courseMetrics.map((item) => ({
      code: item.code,
      value: item.average,
      height: Math.max(18, (item.average / 20) * 180)
    }));
  }

  get compareMetrics(): Array<{ code: string; value: number; baseline: number }> {
    return this.courseMetrics.slice(0, 6).map((item) => ({
      code: item.code,
      value: item.average,
      baseline: this.visibleAverageValue || 13
    }));
  }

  get compareLabels(): Array<{ code: string; x: number; y: number }> {
    const centerX = 170;
    const centerY = 135;
    const labelRadius = 112;

    return this.compareMetrics.map((item, index) => {
      const point = this.polarPoint(index, this.compareMetrics.length, labelRadius, centerX, centerY);
      return { code: item.code, x: point.x, y: point.y };
    });
  }

  get compareUserPolygon(): string {
    return this.buildPolygonPoints(this.compareMetrics.map((item) => item.value));
  }

  get compareBaselinePolygon(): string {
    return this.buildPolygonPoints(this.compareMetrics.map((item) => item.baseline));
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
      error: () => {
        this.feedbackByKey.set(key, { type: 'error', message: 'No se pudo guardar la nota.' });
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

  private buildPolygonPoints(values: number[]): string {
    const centerX = 170;
    const centerY = 135;
    const maxRadius = 88;

    return values
      .map((value, index) => {
        const point = this.polarPoint(index, values.length, (value / 20) * maxRadius, centerX, centerY);
        return `${point.x},${point.y}`;
      })
      .join(' ');
  }

  private polarPoint(index: number, total: number, radius: number, centerX: number, centerY: number) {
    const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
    return {
      x: Number((centerX + Math.cos(angle) * radius).toFixed(2)),
      y: Number((centerY + Math.sin(angle) * radius).toFixed(2))
    };
  }
}
