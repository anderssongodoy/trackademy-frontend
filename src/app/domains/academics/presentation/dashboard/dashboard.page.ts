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

interface PulseItem {
  tone: 'violet' | 'green' | 'amber';
  title: string;
  detail: string;
  meta: string;
}

interface CalendarCell {
  dayNumber: number | null;
  isoDate: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  isActive: boolean;
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

  get pendingGradesCount(): number {
    return this.evaluations.filter((item) => item.nota == null && !item.exonerado).length;
  }

  get hasRegisteredGrades(): boolean {
    return (this.summary?.notasRegistradas ?? 0) > 0;
  }

  get setupSteps(): SetupStep[] {
    const scheduleStatus: SetupStep['status'] =
      this.courses.length === 0 || this.pendingCourseCount === 0 ? 'done'
      : this.configuredCourseCount > 0 ? 'in_progress'
      : 'pending';

    const gradesStatus: SetupStep['status'] =
      this.pendingGradesCount === 0 ? 'done'
      : this.pendingDueGradesCount > 0 ? 'pending'
      : this.hasRegisteredGrades ? 'done' : 'upcoming';

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
        title: 'Activa tu seguimiento de notas',
        description: 'Con tus notas reales, Trackademy puede mostrarte un panorama academico mucho mas honesto.',
        status: gradesStatus,
        ctaLabel: this.pendingDueGradesCount > 0 ? 'Registrar notas' : 'Revisar notas',
        ctaLink: '/app/notas',
        detail: this.pendingGradesCount === 0
          ? 'Ya no quedan notas pendientes por registrar en este ciclo.'
          : this.pendingDueGradesCount > 0
            ? `Hay ${this.pendingDueGradesCount} evaluacion${this.pendingDueGradesCount === 1 ? '' : 'es'} que ya deberias cerrar.`
            : this.hasRegisteredGrades
              ? 'Ya empezaste a registrar notas. Manten este seguimiento vivo durante el ciclo.'
              : 'Todavia no toca registrar la primera nota, pero este paso se activara cuando llegue tu siguiente evaluacion.'
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

  get nextSetupStep(): SetupStep | null {
    return this.setupSteps.find((step) => step.status !== 'done') ?? null;
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

  get onboardingStatusLabel(): string {
    const status = this.currentPeriod?.onboardingEstado?.toLowerCase();
    if (status === 'completado') {
      return 'Perfil listo';
    }
    if (status === 'en_progreso') {
      return 'Perfil en progreso';
    }
    return 'Perfil pendiente';
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

  get heroLeadCount(): number {
    return this.dueSoonCount > 0 ? this.dueSoonCount : this.summary?.evaluacionesPendientes ?? 0;
  }

  get heroLeadLabel(): string {
    const count = this.heroLeadCount;
    return count === 1 ? 'evaluacion pendiente' : 'evaluaciones pendientes';
  }

  get heroTitle(): string {
    const name = this.displayName ?? 'hola';
    return `Hola, ${name}, tienes ${this.heroLeadCount} ${this.heroLeadLabel} esta semana.`;
  }

  get heroSummary(): string {
    if (this.pendingCourseCount > 0) {
      return `${this.pendingCourseCount} curso${this.pendingCourseCount === 1 ? '' : 's'} todavia necesitan bloques para que el sistema pueda ordenar mejor tu ciclo.`;
    }

    if (this.todaySessions.length > 0) {
      return `Tu dia ya tiene ${this.todaySessions.length} clase${this.todaySessions.length === 1 ? '' : 's'} identificada${this.todaySessions.length === 1 ? '' : 's'} y ${this.summary?.evaluacionesPendientes ?? 0} evaluaciones siguen abiertas.`;
    }

    if (this.nextSetupStep) {
      return `Tu base academica ya avanzo ${this.setupCompletedCount}/${this.setupSteps.length} pasos. Lo siguiente que mas impacto tiene es ${this.nextSetupStep.title.toLowerCase()}.`;
    }

    return `Mantienes ${this.cycleProgressLabel.toLowerCase()} con ${this.summary?.cursosActivos ?? 0} curso${(this.summary?.cursosActivos ?? 0) === 1 ? '' : 's'} activos.`;
  }

  get todaySessions(): MyCalendarEvent[] {
    const todayItems = this.upcomingSessions.filter((item) => this.isSameDay(item.inicio, new Date()));
    if (todayItems.length > 0) {
      return todayItems.slice(0, 4);
    }
    return this.upcomingSessions.slice(0, 4);
  }

  get classesTodayCount(): number {
    return this.upcomingSessions.filter((item) => this.isSameDay(item.inicio, new Date())).length;
  }

  get nextEvaluationCountdownDays(): string {
    if (!this.nextEvaluation?.fechaEstimada) {
      return '--';
    }

    const start = this.startOfToday().getTime();
    const target = new Date(`${this.nextEvaluation.fechaEstimada}T00:00:00`).getTime();
    const diff = Math.max(Math.ceil((target - start) / 86400000), 0);
    return diff.toString().padStart(2, '0');
  }

  get nextEvaluationWeekLabel(): string {
    if (this.nextEvaluation?.semana == null) {
      return '--';
    }
    return this.nextEvaluation.semana.toString().padStart(2, '0');
  }

  get nextEvaluationWeightLabel(): string {
    if (this.nextEvaluation?.porcentaje == null) {
      return '--';
    }
    return `${Math.round(this.nextEvaluation.porcentaje)}%`;
  }

  get nextEvaluationDateLabel(): string {
    if (!this.nextEvaluation?.fechaEstimada) {
      return 'Fecha pendiente';
    }
    return this.formatDate(this.nextEvaluation.fechaEstimada, { day: '2-digit', month: 'long' });
  }

  get pulseItems(): PulseItem[] {
    const items: PulseItem[] = [];

    if (this.nextEvaluation) {
      items.push({
        tone: 'violet',
        title: `${this.nextEvaluation.codigoCurso} · ${this.nextEvaluation.evaluacionCodigo}`,
        detail: this.nextEvaluation.nombreCurso,
        meta: this.nextEvaluationDateLabel
      });
    }

    if (this.nextSession) {
      items.push({
        tone: 'green',
        title: this.nextSession.titulo,
        detail: this.nextSession.subtitulo || this.nextSession.nombreCurso || 'Sesion programada',
        meta: this.formatDate(this.nextSession.inicio, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      });
    }

    if (this.nextSetupStep) {
      items.push({
        tone: 'amber',
        title: this.nextSetupStep.title,
        detail: this.nextSetupStep.detail,
        meta: this.nextSetupStep.status === 'in_progress' ? 'En progreso' : 'Siguiente foco'
      });
    } else if (this.nextPeriodEvent) {
      items.push({
        tone: 'amber',
        title: this.nextPeriodEvent.titulo,
        detail: this.nextPeriodEvent.subtitulo || 'Evento institucional',
        meta: this.formatDate(this.nextPeriodEvent.inicio, { day: '2-digit', month: 'short' })
      });
    }

    return items.slice(0, 3);
  }

  get calendarMonthLabel(): string {
    return this.capitalize(
      new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date())
    );
  }

  get calendarWeekdayLabels(): string[] {
    return ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  }

  get calendarCells(): CalendarCell[] {
    const today = this.startOfToday();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const offset = (firstOfMonth.getDay() + 6) % 7;
    const firstCellDate = new Date(year, month, 1 - offset);

    return Array.from({ length: 35 }, (_, index) => {
      const cellDate = new Date(firstCellDate);
      cellDate.setDate(firstCellDate.getDate() + index);
      const isoDate = cellDate.toISOString().slice(0, 10);

      return {
        dayNumber: cellDate.getDate(),
        isoDate,
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: this.isSameDay(isoDate, today),
        isActive: this.isCalendarActive(isoDate)
      };
    });
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

  scheduleRowMeta(item: MyCalendarEvent): string {
    const parts = [
      item.subtitulo || item.nombreCurso || '',
      item.codigoCurso || item.tipo || ''
    ].filter(Boolean);

    return parts.join(' · ');
  }

  scheduleTimeLabel(item: MyCalendarEvent): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(item.inicio));
  }

  scheduleDateLabel(item: MyCalendarEvent): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    }).format(new Date(item.inicio)));
  }

  scheduleRowTag(item: MyCalendarEvent): string {
    if (item.tipo) {
      return item.tipo;
    }
    if (item.codigoCurso) {
      return item.codigoCurso;
    }
    return 'Agenda';
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

  private isCalendarActive(isoDate: string): boolean {
    return [...this.upcomingSessions, ...this.periodEvents].some((item) => item.inicio.slice(0, 10) === isoDate);
  }

  private isSameDay(value: string, baseDate: Date): boolean {
    const date = new Date(value);
    return date.getFullYear() === baseDate.getFullYear()
      && date.getMonth() === baseDate.getMonth()
      && date.getDate() === baseDate.getDate();
  }

  private formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', options).format(new Date(value)));
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private startOfToday(): Date {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }
}
