import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCourse, MyEvaluation, MyScheduleEntry } from '../../application/me-use-case';

interface CourseCardView extends MyCourse {
  averageGrade: number | null;
  gradedEvaluations: number;
  pendingEvaluations: number;
  nextEvaluationLabel: string;
  schedulePreview: string[];
  scheduleLocations: string[];
  weeklyHoursLabel: string;
  sessionsCount: number;
  hasSchedule: boolean;
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

  courses: MyCourse[] = [];
  courseCards: CourseCardView[] = [];
  filteredCourses: CourseCardView[] = [];
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      courses: this.meUseCase.getMyCourses(),
      schedule: this.meUseCase.getMySchedule(),
      evaluations: this.meUseCase.getMyEvaluations()
    }).subscribe({
      next: ({ courses, schedule, evaluations }) => {
        this.courses = courses;
        this.courseCards = this.buildCourseCards(courses, schedule, evaluations);
        this.applyFilter(this.searchControl.value ?? '');
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tus cursos. Verifica la conexion con el backend.';
        this.isLoading = false;
      }
    });

    this.searchControl.valueChanges.subscribe((value) => {
      this.applyFilter(value ?? '');
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

  get averageGradeLabel(): string {
    const grades = this.courseCards
      .map((course) => course.averageGrade)
      .filter((grade): grade is number => grade != null);

    if (grades.length === 0) {
      return 'Sin notas';
    }

    const total = grades.reduce((sum, grade) => sum + grade, 0);
    return (total / grades.length).toFixed(1);
  }

  trackCourse(_index: number, course: CourseCardView): number {
    return course.usuarioPeriodoCursoId;
  }

  private applyFilter(query: string): void {
    const normalized = this.normalizeText(query);

    if (!normalized) {
      this.filteredCourses = this.courseCards;
      return;
    }

    this.filteredCourses = this.courseCards.filter((course) => {
      const name = this.normalizeText(course.nombre);
      const code = this.normalizeText(course.codigo);
      const professor = this.normalizeText(course.profesor || '');
      return name.includes(normalized) || code.includes(normalized) || professor.includes(normalized);
    });
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
        schedulePreview: courseSchedule.slice(0, 3).map((entry) => this.formatScheduleEntry(entry)),
        scheduleLocations: [...new Set(courseSchedule.map((entry) => entry.ubicacion).filter(Boolean))] as string[],
        weeklyHoursLabel: weeklyHours > 0 ? `${this.formatHours(weeklyHours)} h/sem` : 'Horario pendiente',
        sessionsCount: courseSchedule.length,
        hasSchedule: courseSchedule.length > 0
      };
    });
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  private formatScheduleEntry(entry: MyScheduleEntry): string {
    const day = this.dayLabel(entry.diaSemana);
    const start = entry.horaInicio?.slice(0, 5) || '--:--';
    const end = entry.horaFin?.slice(0, 5) || '--:--';
    return `${day} ${start} - ${end}`;
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
      return `${evaluation.evaluacionCodigo} - ${new Date(evaluation.fechaEstimada).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short'
      })}`;
    }

    if (evaluation.semana != null) {
      return `${evaluation.evaluacionCodigo} - Semana ${evaluation.semana}`;
    }

    return evaluation.evaluacionCodigo;
  }

  private formatHours(hours: number): string {
    return Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  }
}
