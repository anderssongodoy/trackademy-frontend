import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCourse, MyCurrentPeriod, MyEvaluation, MyScheduleEntry } from '../../application/me-use-case';

interface CourseCardView extends MyCourse {
  averageGrade: number | null;
  gradedEvaluations: number;
  pendingEvaluations: number;
  nextEvaluationLabel: string;
  nextEvaluationDate: string | null;
  nextEvaluationWeightLabel: string;
  primaryScheduleLabel: string;
  secondaryScheduleLabel: string;
  weeklyHoursLabel: string;
  sessionsCount: number;
  hasSchedule: boolean;
  modalityTag: string;
  compactProfessor: string;
}

type CourseFilterKey = 'all' | 'sin-horario' | 'presencial' | 'remoto' | 'virtual' | 'hibrido';

interface CourseFilterOption {
  key: CourseFilterKey;
  label: string;
  count: number;
}

@Component({
  selector: 'app-courses-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './courses.page.html',
  styleUrl: './courses.page.scss'
})
export class CoursesPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly searchControl = new FormControl('');

  currentPeriod: MyCurrentPeriod | null = null;
  courses: MyCourse[] = [];
  courseCards: CourseCardView[] = [];
  filteredCourses: CourseCardView[] = [];
  selectedFilter: CourseFilterKey = 'all';
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      period: this.meUseCase.getCurrentPeriod(),
      courses: this.meUseCase.getMyCourses(),
      schedule: this.meUseCase.getMySchedule(),
      evaluations: this.meUseCase.getMyEvaluations()
    }).subscribe({
      next: ({ period, courses, schedule, evaluations }) => {
        this.currentPeriod = period;
        this.courses = courses;
        this.courseCards = this.buildCourseCards(courses, schedule, evaluations);
        this.applyFilters(this.searchControl.value ?? '');
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tus cursos. Verifica la conexion con el backend.';
        this.isLoading = false;
      }
    });

    this.searchControl.valueChanges.subscribe((value) => {
      this.applyFilters(value ?? '');
    });
  }

  get activeCoursesCount(): number {
    return this.courses.filter((course) => course.activo).length;
  }

  get configuredCoursesCount(): number {
    return this.courseCards.filter((course) => course.hasSchedule).length;
  }

  get pendingEvaluationsCount(): number {
    return this.courseCards.reduce((total, course) => total + course.pendingEvaluations, 0);
  }

  get filterOptions(): CourseFilterOption[] {
    const options: CourseFilterOption[] = [
      { key: 'all', label: 'Todos', count: this.courseCards.length },
      { key: 'presencial', label: 'Presencial', count: this.countByFilter('presencial') },
      { key: 'remoto', label: 'Remoto', count: this.countByFilter('remoto') },
      { key: 'virtual', label: 'Virtual', count: this.countByFilter('virtual') },
      { key: 'hibrido', label: 'Hibrido', count: this.countByFilter('hibrido') },
      { key: 'sin-horario', label: 'Sin horario', count: this.countByFilter('sin-horario') }
    ];

    return options.filter((option) => option.key === 'all' || option.count > 0);
  }

  get totalWeeklyHoursLabel(): string {
    const totalHours = this.courseCards.reduce((sum, course) => sum + this.parseWeeklyHours(course.weeklyHoursLabel), 0);
    if (totalHours === 0) {
      return 'Horario pendiente';
    }
    return `${this.formatHours(totalHours)} h/sem`;
  }

  get visibleCoursesLabel(): string {
    const count = this.filteredCourses.length;
    return `${count} curso${count === 1 ? '' : 's'} visibles`;
  }

  selectFilter(filter: CourseFilterKey): void {
    this.selectedFilter = filter;
    this.applyFilters(this.searchControl.value ?? '');
  }

  trackCourse(_index: number, course: CourseCardView): number {
    return course.usuarioPeriodoCursoId;
  }

  private applyFilters(query: string): void {
    const normalized = this.normalizeText(query);

    this.filteredCourses = this.courseCards.filter((course) => {
      const matchesSearch = !normalized || this.matchesSearch(course, normalized);
      const matchesFilter = this.matchesFilter(course, this.selectedFilter);
      return matchesSearch && matchesFilter;
    });
  }

  private matchesSearch(course: CourseCardView, normalized: string): boolean {
    const name = this.normalizeText(course.nombre);
    const code = this.normalizeText(course.codigo);
    const professor = this.normalizeText(course.profesor || '');
    const section = this.normalizeText(course.seccion || '');
    return name.includes(normalized) || code.includes(normalized) || professor.includes(normalized) || section.includes(normalized);
  }

  private matchesFilter(course: CourseCardView, filter: CourseFilterKey): boolean {
    if (filter === 'all') {
      return true;
    }

    if (filter === 'sin-horario') {
      return !course.hasSchedule;
    }

    return this.normalizeText(course.modalityTag) === filter;
  }

  private countByFilter(filter: CourseFilterKey): number {
    return this.courseCards.filter((course) => this.matchesFilter(course, filter)).length;
  }

  private buildCourseCards(
    courses: MyCourse[],
    schedule: MyScheduleEntry[],
    evaluations: MyEvaluation[]
  ): CourseCardView[] {
    return courses.map((course) => {
      const courseSchedule = schedule
        .filter((entry) => entry.usuarioPeriodoCursoId === course.usuarioPeriodoCursoId)
        .sort((a, b) => {
          if ((a.diaSemana ?? 0) !== (b.diaSemana ?? 0)) {
            return (a.diaSemana ?? 0) - (b.diaSemana ?? 0);
          }

          return (a.horaInicio || '').localeCompare(b.horaInicio || '');
        });

      const courseEvaluations = evaluations.filter((item) => item.usuarioPeriodoCursoId === course.usuarioPeriodoCursoId);
      const gradedEvaluations = courseEvaluations.filter((item) => item.nota != null);
      const pendingEvaluations = courseEvaluations.filter((item) => item.nota == null && !item.exonerado);
      const averageGrade =
        gradedEvaluations.length > 0
          ? gradedEvaluations.reduce((sum, item) => sum + (item.nota ?? 0), 0) / gradedEvaluations.length
          : null;

      const totalMinutes = courseSchedule.reduce((sum, entry) => sum + (entry.duracionMin ?? 0), 0);
      const weeklyHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
      const nextEvaluation = pendingEvaluations
        .slice()
        .sort((left, right) => {
          const leftDate = left.fechaEstimada ? new Date(left.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;
          const rightDate = right.fechaEstimada ? new Date(right.fechaEstimada).getTime() : Number.MAX_SAFE_INTEGER;

          if (leftDate !== rightDate) {
            return leftDate - rightDate;
          }

          return (left.semana ?? Number.MAX_SAFE_INTEGER) - (right.semana ?? Number.MAX_SAFE_INTEGER);
        })[0];

      return {
        ...course,
        averageGrade,
        gradedEvaluations: gradedEvaluations.length,
        pendingEvaluations: pendingEvaluations.length,
        nextEvaluationLabel: this.buildNextEvaluationLabel(nextEvaluation),
        nextEvaluationDate: nextEvaluation?.fechaEstimada ?? null,
        nextEvaluationWeightLabel: this.buildNextEvaluationWeightLabel(nextEvaluation),
        primaryScheduleLabel: this.buildPrimaryScheduleLabel(courseSchedule),
        secondaryScheduleLabel: this.buildSecondaryScheduleLabel(courseSchedule),
        weeklyHoursLabel: weeklyHours > 0 ? `${this.formatHours(weeklyHours)} h/sem` : 'Horario pendiente',
        sessionsCount: courseSchedule.length,
        hasSchedule: courseSchedule.length > 0,
        modalityTag: this.resolveModalityTag(course.modalidad),
        compactProfessor: course.profesor || 'Profesor pendiente'
      };
    });
  }

  private buildPrimaryScheduleLabel(courseSchedule: MyScheduleEntry[]): string {
    if (courseSchedule.length === 0) {
      return 'Horario pendiente';
    }

    const uniqueDays = [...new Set(courseSchedule.map((entry) => this.dayLabel(entry.diaSemana)))];
    const first = courseSchedule[0];
    const start = first.horaInicio?.slice(0, 5) || '--:--';

    if (uniqueDays.length === 1) {
      return `${uniqueDays[0]} ${start}`;
    }

    if (uniqueDays.length === 2) {
      return `${uniqueDays[0]} / ${uniqueDays[1]}`;
    }

    return `${uniqueDays.length} dias por semana`;
  }

  private buildSecondaryScheduleLabel(courseSchedule: MyScheduleEntry[]): string {
    if (courseSchedule.length === 0) {
      return 'Configura tus bloques';
    }

    const first = courseSchedule[0];
    const start = first.horaInicio?.slice(0, 5);
    const end = first.horaFin?.slice(0, 5);
    const timeRange = start && end ? `${start} - ${end}` : null;
    const type = first.tipoSesion?.trim();
    return [timeRange, type].filter(Boolean).join(' - ') || 'Sesion registrada';
  }

  private resolveModalityTag(value: string | null): string {
    const normalized = this.normalizeText(value || '');
    if (normalized.includes('remot')) {
      return 'Remoto';
    }
    if (normalized.includes('virtual')) {
      return 'Virtual';
    }
    if (normalized.includes('hibrid')) {
      return 'Hibrido';
    }
    return 'Presencial';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  private dayLabel(day: number | null): string {
    switch (day) {
      case 1:
        return 'Lun';
      case 2:
        return 'Mar';
      case 3:
        return 'Mie';
      case 4:
        return 'Jue';
      case 5:
        return 'Vie';
      case 6:
        return 'Sab';
      case 7:
        return 'Dom';
      default:
        return 'Dia';
    }
  }

  private buildNextEvaluationLabel(evaluation?: MyEvaluation): string {
    if (!evaluation) {
      return 'Sin evaluaciones pendientes';
    }

    if (evaluation.fechaEstimada) {
      return `${evaluation.evaluacionCodigo} · ${new Date(evaluation.fechaEstimada).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short'
      })}`;
    }

    if (evaluation.semana != null) {
      return `${evaluation.evaluacionCodigo} · Semana ${evaluation.semana}`;
    }

    return evaluation.evaluacionCodigo;
  }

  private buildNextEvaluationWeightLabel(evaluation?: MyEvaluation): string {
    if (!evaluation) {
      return 'Sin peso pendiente';
    }

    const weight = evaluation.porcentaje != null ? `${this.formatHours(evaluation.porcentaje)}%` : 'Peso pendiente';
    return [evaluation.descripcion, weight].filter(Boolean).join(' - ');
  }

  private parseWeeklyHours(label: string): number {
    const value = Number(label.replace(' h/sem', ''));
    return Number.isFinite(value) ? value : 0;
  }

  private formatHours(hours: number): string {
    return Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  }
}
