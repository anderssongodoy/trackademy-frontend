import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCalendarEvent, MyCourse, MyDashboardSummary, MyEvaluation, MyScheduleEntry } from '../../application/me-use-case';

interface SetupStep {
  key: 'schedule' | 'grades' | 'calendar-sync';
  title: string;
  description: string;
  status: 'done' | 'pending' | 'in_progress' | 'upcoming';
  ctaLabel: string;
  ctaLink: string;
  detail: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  summary: MyDashboardSummary | null = null;
  courses: MyCourse[] = [];
  schedule: MyScheduleEntry[] = [];
  evaluations: MyEvaluation[] = [];

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      summary: this.meUseCase.getDashboard(),
      courses: this.meUseCase.getMyCourses(),
      schedule: this.meUseCase.getMySchedule(),
      evaluations: this.meUseCase.getMyEvaluations()
    }).subscribe({
      next: ({ summary, courses, schedule, evaluations }) => {
        this.summary = summary;
        this.courses = courses;
        this.schedule = schedule;
        this.evaluations = evaluations;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu dashboard. Revisa tu sesion o el backend.';
        this.isLoading = false;
      }
    });
  }

  get currentPeriod() {
    return this.summary?.periodoActual ?? null;
  }

  get displayName(): string | null {
    const preferred = this.currentPeriod?.nombrePreferido?.trim();
    if (preferred) {
      return preferred;
    }

    const fullName = this.currentPeriod?.nombre?.trim();
    if (!fullName) {
      return null;
    }

    return fullName.split(' ')[0] || fullName;
  }

  get heroTitle(): string {
    return this.displayName
      ? `${this.displayName}, este es tu panorama de hoy`
      : 'Tu panorama academico para hoy';
  }

  get configuredCourseCount(): number {
    const ids = new Set(this.schedule.map((item) => item.usuarioPeriodoCursoId));
    return this.courses.filter((course) => ids.has(course.usuarioPeriodoCursoId)).length;
  }

  get pendingCourseCount(): number {
    return Math.max(this.courses.length - this.configuredCourseCount, 0);
  }

  get pendingDueGradesCount(): number {
    const today = this.startOfToday().getTime();
    return this.evaluations.filter((item) => {
      if (item.nota != null || item.exonerado || !item.fechaEstimada) {
        return false;
      }

      const estimated = new Date(`${item.fechaEstimada}T00:00:00`).getTime();
      return estimated <= today;
    }).length;
  }

  get setupSteps(): SetupStep[] {
    const scheduleStatus: SetupStep['status'] =
      this.courses.length === 0 || this.pendingCourseCount === 0 ? 'done'
      : this.configuredCourseCount > 0 ? 'in_progress'
      : 'pending';

    const gradesStatus: SetupStep['status'] =
      this.pendingDueGradesCount === 0 ? 'done'
      : this.summary?.notasRegistradas ? 'in_progress'
      : 'pending';

    return [
      {
        key: 'schedule',
        title: 'Arma tu horario',
        description: 'Primero deja listos tus bloques para que el calendario y los recordatorios tengan contexto real.',
        status: scheduleStatus,
        ctaLabel: this.pendingCourseCount === 0 ? 'Revisar horario' : 'Configurar horario',
        ctaLink: '/app/horario',
        detail: this.pendingCourseCount === 0
          ? 'Todos tus cursos activos ya tienen bloques registrados.'
          : `${this.pendingCourseCount} curso${this.pendingCourseCount === 1 ? '' : 's'} aun necesitan horario.`
      },
      {
        key: 'grades',
        title: 'Sube las notas que te falten',
        description: 'Con tus notas reales, Trackademy puede mostrarte un panorama academico mucho mas honesto.',
        status: gradesStatus,
        ctaLabel: this.pendingDueGradesCount === 0 ? 'Revisar notas' : 'Registrar notas',
        ctaLink: '/app/notas',
        detail: this.pendingDueGradesCount === 0
          ? 'No tienes notas vencidas pendientes por registrar.'
          : `Hay ${this.pendingDueGradesCount} evaluacion${this.pendingDueGradesCount === 1 ? '' : 'es'} que ya deberias cerrar.`
      },
      {
        key: 'calendar-sync',
        title: 'Conecta tu calendario externo',
        description: 'Cuando activemos Google Calendar u Outlook, aqui lo vas a vincular para centralizar todo.',
        status: 'upcoming',
        ctaLabel: 'Ver calendario',
        ctaLink: '/app/calendario',
        detail: 'Este paso queda preparado, pero todavia no esta habilitado.'
      }
    ];
  }

  get setupCompletedCount(): number {
    return this.setupSteps.filter((step) => step.status === 'done').length;
  }

  get setupProgressPercent(): number {
    return Math.round((this.setupCompletedCount / this.setupSteps.length) * 100);
  }

  get nextSetupStep(): SetupStep | null {
    return this.setupSteps.find((step) => step.status === 'pending' || step.status === 'in_progress') ?? null;
  }

  get nextSetupLabel(): string {
    if (!this.nextSetupStep) {
      return 'Base inicial completa';
    }
    return this.nextSetupStep.title;
  }

  get upcomingEvaluations(): MyEvaluation[] {
    return this.summary?.proximasEvaluaciones ?? [];
  }

  get upcomingSessions(): MyCalendarEvent[] {
    return this.summary?.proximasSesiones ?? [];
  }

  get periodEvents(): MyCalendarEvent[] {
    return this.summary?.proximosEventosPeriodo ?? [];
  }

  get currentWeekLabel(): string {
    const week = this.summary?.semanaActual;
    return week == null ? 'Semana no calculada' : `Semana ${week}`;
  }

  get cycleProgressPercent(): number {
    return this.summary?.progresoPeriodoPct ?? 0;
  }

  get cycleProgressLabel(): string {
    if (this.summary?.progresoPeriodoPct == null) {
      return 'Sin fechas del periodo';
    }
    return `${this.summary.progresoPeriodoPct}% del ciclo completado`;
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date());
  }

  get onboardingStatusLabel(): string {
    const status = this.currentPeriod?.onboardingEstado?.toLowerCase();
    if (status === 'completado') {
      return 'Perfil academico listo';
    }
    if (status === 'en_progreso') {
      return 'Perfil academico en progreso';
    }
    return 'Perfil academico pendiente';
  }

  get nextEvaluation(): MyEvaluation | null {
    return this.upcomingEvaluations[0] ?? null;
  }

  get nextSession(): MyCalendarEvent | null {
    return this.upcomingSessions[0] ?? null;
  }

  get nextPeriodEvent(): MyCalendarEvent | null {
    return this.periodEvents[0] ?? null;
  }

  get dueSoonCount(): number {
    const today = this.startOfToday().getTime();
    const nextWeek = today + (7 * 86400000);
    return this.upcomingEvaluations.filter((item) => {
      if (!item.fechaEstimada) {
        return false;
      }
      const date = new Date(`${item.fechaEstimada}T00:00:00`).getTime();
      return date >= today && date <= nextWeek;
    }).length;
  }

  get configuredScheduleLabel(): string {
    const value = this.summary?.horariosRegistrados ?? 0;
    return `${value} bloque${value === 1 ? '' : 's'} en agenda`;
  }

  get quickFocusLabel(): string {
    if (this.nextSetupStep && this.nextSetupStep.status !== 'done') {
      return `Lo siguiente: ${this.nextSetupStep.title}`;
    }
    if (this.nextEvaluation) {
      return `Siguiente nota: ${this.nextEvaluation.evaluacionCodigo}`;
    }
    if (this.nextSession) {
      return `Siguiente clase: ${this.nextSession.titulo}`;
    }
    if (this.nextPeriodEvent) {
      return `Siguiente evento: ${this.nextPeriodEvent.titulo}`;
    }
    return 'Sin eventos proximos';
  }

  formatEventDate(value: string | null, includeTime = false): string {
    if (!value) {
      return 'Fecha pendiente';
    }

    return new Intl.DateTimeFormat('es-PE', includeTime
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short' }
    ).format(new Date(value));
  }

  setupStepLabel(step: SetupStep): string {
    switch (step.status) {
      case 'done':
        return 'Listo';
      case 'in_progress':
        return 'En progreso';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Proximamente';
    }
  }

  private startOfToday(): Date {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }
}
