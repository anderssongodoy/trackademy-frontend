import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CatalogCourseDetail, CatalogCourseEvaluation, CatalogCourseUnit, CatalogUseCase } from '../../application/catalog-use-case';
import { MeUseCase, MyCourse, MyEvaluation, MyScheduleEntry } from '../../application/me-use-case';
import { apiErrorMessage } from '../../../identity/infrastructure/http/api-error.interceptor';

interface HeroFact {
  label: string;
  value: string;
}

@Component({
  selector: 'app-course-detail-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './course-detail.page.html',
  styleUrl: './course-detail.page.scss'
})
export class CourseDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);

  readonly metadataForm = this.formBuilder.group({
    seccion: [''],
    profesor: ['', [Validators.maxLength(120)]]
  });

  course: MyCourse | null = null;
  evaluations: MyEvaluation[] = [];
  scheduleEntries: MyScheduleEntry[] = [];
  courseDetail: CatalogCourseDetail | null = null;
  isLoading = true;
  loadError = '';
  isSavingMetadata = false;
  metadataError = '';
  metadataSuccess = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isNaN(id)) {
      this.isLoading = false;
      this.loadError = 'Identificador de curso invalido.';
      return;
    }

    this.meUseCase.getMyCourses().subscribe({
      next: (courses) => {
        this.course = courses.find((item) => item.usuarioPeriodoCursoId === id) ?? null;
        if (!this.course) {
          this.loadError = 'No encontramos el curso solicitado.';
          this.isLoading = false;
          return;
        }

        this.patchMetadataForm(this.course);

        forkJoin({
          evaluations: this.meUseCase.getMyEvaluations(this.course.cursoId),
          detail: this.catalogUseCase.getCourseDetailByCode(this.course.codigo),
          schedules: this.meUseCase.getMySchedule()
        }).subscribe({
          next: ({ evaluations, detail, schedules }) => {
            this.evaluations = evaluations;
            this.courseDetail = detail;
            this.scheduleEntries = schedules
              .filter((item) => item.usuarioPeriodoCursoId === id)
              .sort((a, b) => {
                if ((a.diaSemana ?? 0) !== (b.diaSemana ?? 0)) {
                  return (a.diaSemana ?? 0) - (b.diaSemana ?? 0);
                }
                return (a.horaInicio || '').localeCompare(b.horaInicio || '');
              });
            this.isLoading = false;
          },
          error: () => {
            this.loadError = 'No se pudo cargar el detalle completo del curso.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.loadError = 'No se pudo cargar el detalle del curso.';
        this.isLoading = false;
      }
    });
  }

  get gradedEvaluationsCount(): number {
    return this.evaluations.filter((item) => item.nota != null).length;
  }

  get pendingEvaluationsCount(): number {
    return this.evaluations.filter((item) => item.nota == null && !item.exonerado).length;
  }

  get configuredSessionsCount(): number {
    return this.scheduleEntries.length;
  }

  get averageGradeLabel(): string {
    const grades = this.evaluations
      .map((item) => item.nota)
      .filter((grade): grade is number => grade != null);

    if (grades.length === 0) {
      return '--';
    }

    const total = grades.reduce((sum, grade) => sum + grade, 0);
    return (total / grades.length).toFixed(1);
  }

  get progressPercent(): number {
    if (this.evaluations.length === 0) {
      return 0;
    }

    return Math.round((this.gradedEvaluationsCount / this.evaluations.length) * 100);
  }

  get nextEvaluation(): MyEvaluation | null {
    return this.evaluations
      .filter((item) => item.nota == null && !item.exonerado)
      .sort((left, right) => {
        const leftDate = left.fechaEstimada ? new Date(left.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDate = right.fechaEstimada ? new Date(right.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;

        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }

        return (left.semana ?? Number.MAX_SAFE_INTEGER) - (right.semana ?? Number.MAX_SAFE_INTEGER);
      })[0] ?? null;
  }

  get groupedSchedule(): Array<{ key: string; label: string; items: MyScheduleEntry[] }> {
    const grouped = new Map<number, MyScheduleEntry[]>();

    this.scheduleEntries.forEach((entry) => {
      const day = entry.diaSemana ?? 0;
      const existing = grouped.get(day) ?? [];
      existing.push(entry);
      grouped.set(day, existing);
    });

    return [...grouped.entries()].map(([day, items]) => ({
      key: `${day}`,
      label: this.dayLabel(day),
      items
    }));
  }

  get heroFacts(): HeroFact[] {
    if (!this.courseDetail) {
      return [];
    }

    return [
      { label: 'Creditos', value: `${this.courseDetail.curso.creditos}` },
      { label: 'Horas semanales', value: `${this.courseDetail.curso.horasSemanales}` },
      { label: 'Bloques reales', value: `${this.configuredSessionsCount}` },
      { label: 'Periodo', value: this.courseDetail.periodoTexto || 'Sin periodo' }
    ];
  }

  get modalityLabel(): string {
    return this.course?.modalidad || this.courseDetail?.curso.modalidad || 'No definida';
  }

  get professorLabel(): string {
    return this.course?.profesor || 'Profesor pendiente de confirmar';
  }

  get nextEvaluationLabel(): string {
    if (!this.nextEvaluation) {
      return 'No hay evaluaciones pendientes';
    }
    return this.nextEvaluation.descripcion || this.nextEvaluation.tipo || this.nextEvaluation.evaluacionCodigo;
  }

  get overviewCards(): Array<{ label: string; value: string; detail: string; tone: 'violet' | 'mint' | 'warm' | 'soft' }> {
    return [
      {
        label: 'Promedio actual',
        value: this.averageGradeLabel,
        detail: `${this.gradedEvaluationsCount} evaluaciones con nota`,
        tone: 'soft'
      },
      {
        label: 'Pendientes',
        value: `${this.pendingEvaluationsCount}`,
        detail: 'evaluaciones por registrar',
        tone: 'warm'
      },
      {
        label: 'Avance del curso',
        value: `${this.progressPercent}%`,
        detail: `${this.gradedEvaluationsCount}/${this.evaluations.length || 0} atendidas`,
        tone: 'mint'
      },
      {
        label: 'Version del silabo',
        value: this.courseDetail?.version || '--',
        detail: `${this.courseDetail?.anio || '--'}`,
        tone: 'violet'
      }
    ];
  }

  saveMetadata(): void {
    if (!this.course) {
      return;
    }

    this.metadataError = '';
    this.metadataSuccess = '';

    if (this.metadataForm.invalid) {
      this.metadataForm.markAllAsTouched();
      return;
    }

    const value = this.metadataForm.getRawValue();
    this.isSavingMetadata = true;

    this.meUseCase.updateCourseMetadata(this.course.usuarioPeriodoCursoId, {
      seccion: this.cleanText(value.seccion),
      profesor: this.cleanText(value.profesor)
    }).subscribe({
      next: (updatedCourse) => {
        this.course = updatedCourse;
        this.patchMetadataForm(updatedCourse);
        this.metadataSuccess = 'Datos del curso actualizados.';
        this.isSavingMetadata = false;
      },
      error: (error) => {
        this.metadataError = apiErrorMessage(error, 'No se pudo guardar la seccion o el profesor.');
        this.isSavingMetadata = false;
      }
    });
  }

  trackEvaluation(_index: number, evaluation: MyEvaluation): string {
    return `${evaluation.evaluacionCodigo}-${evaluation.semana ?? 'na'}`;
  }

  trackUnit(_index: number, unit: CatalogCourseUnit): number {
    return unit.nro;
  }

  topicsFor(unit: CatalogCourseUnit): string[] {
    return unit.temas ?? unit.temario ?? [];
  }

  formatScheduleEntry(entry: MyScheduleEntry): string {
    const start = this.normalizeTime(entry.horaInicio);
    const end = this.normalizeTime(entry.horaFin);
    return `${start} - ${end}`;
  }

  evaluationSubtitle(item: MyEvaluation): string {
    if (item.fechaEstimada) {
      return new Date(item.fechaEstimada).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    }

    if (item.semana != null) {
      return `Semana ${item.semana}`;
    }

    return 'Fecha por definir';
  }

  evaluationStatusLabel(item: MyEvaluation): string {
    if (item.exonerado) {
      return 'Exonerado';
    }
    if (item.nota != null) {
      return 'Registrado';
    }
    if (item.fechaEstimada) {
      return 'Pendiente';
    }
    return 'Por definir';
  }

  syllabusEvaluationLabel(item: CatalogCourseEvaluation): string {
    const parts = [item.tipo, item.descripcion, item.semana != null ? `Semana ${item.semana}` : null].filter(Boolean);
    return parts.join(' · ') || 'Evaluacion';
  }

  private patchMetadataForm(course: MyCourse): void {
    this.metadataForm.patchValue({
      seccion: course.seccion || '',
      profesor: course.profesor || ''
    }, { emitEvent: false });
  }

  private cleanText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeTime(value: string | null): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return '--:--';
    }

    const [hours = '--', minutes = '--'] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  private dayLabel(day: number | null): string {
    switch (day) {
      case 1:
        return 'Lunes';
      case 2:
        return 'Martes';
      case 3:
        return 'Miercoles';
      case 4:
        return 'Jueves';
      case 5:
        return 'Viernes';
      case 6:
        return 'Sabado';
      case 7:
        return 'Domingo';
      default:
        return 'Sin dia';
    }
  }
}
