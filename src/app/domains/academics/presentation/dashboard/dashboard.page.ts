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
  meta: string;
}

interface CalendarCell {
  dayNumber: number | null;
  isoDate: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  isActive: boolean;
}

interface WeekLoadPoint {
  week: number;
  label: string;
  count: number;
  weight: number;
  height: number;
  isCurrent: boolean;
}

interface WeekFocusCard {
  week: number;
  title: string;
  count: number;
  weight: number;
  evaluations: MyEvaluation[];
  isCurrent: boolean;
}

interface CourseRiskCard {
  id: number;
  code: string;
  name: string;
  accumulated: number;
  registeredWeight: number;
  pendingWeight: number;
  neededGrade: number | null;
  risk: 'critico' | 'atencion' | 'estable';
  detail: string;
}

interface TimelinePoint {
  week: number;
  isPast: boolean;
  isCurrent: boolean;
  hasEvaluations: boolean;
  evaluationCount: number;
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

  get registeredGradesCount(): number {
    return this.evaluations.filter((item) => item.nota != null).length;
  }

  get totalEvaluationWeight(): number {
    return this.evaluations.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
  }

  get registeredEvaluationWeight(): number {
    return this.evaluations
      .filter((item) => item.nota != null)
      .reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
  }

  get registeredWeightPercent(): number {
    if (this.totalEvaluationWeight <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.registeredEvaluationWeight / this.totalEvaluationWeight) * 100));
  }

  get pendingWeightPercent(): number {
    return Math.max(0, 100 - this.registeredWeightPercent);
  }

  get gradeCoverageBackground(): string {
    const value = this.registeredWeightPercent;
    return `conic-gradient(var(--brand-primary) 0 ${value}%, #e7eaf0 ${value}% 100%)`;
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
    return count === 1 ? 'evaluacion' : 'evaluaciones';
  }

  get heroTitle(): string {
    const name = this.displayName ?? 'hola';
    return `Hola, ${name}. Tu ciclo en una vista.`;
  }

  get heroSummary(): string {
    return `${this.cycleProgressLabel}. ${this.pendingGradesCount} evaluaciones pendientes y ${this.registeredWeightPercent}% del peso ya registrado.`;
  }

  get dashboardHeadline(): string {
    if (this.criticalCourseCount > 0) {
      return `${this.criticalCourseCount} curso${this.criticalCourseCount === 1 ? '' : 's'} requiere atencion`;
    }
    if (this.dueSoonCount > 0) {
      return `${this.dueSoonCount} evaluacion${this.dueSoonCount === 1 ? '' : 'es'} en los proximos 7 dias`;
    }
    return 'Sin alertas fuertes por ahora';
  }

  get weekLoad(): WeekLoadPoint[] {
    const maxWeek = Math.max(18, ...this.evaluations.map((item) => item.semana ?? 0));
    const currentWeek = this.summary?.semanaActual ?? 0;
    const raw = Array.from({ length: maxWeek }, (_, index) => {
      const week = index + 1;
      const items = this.evaluations.filter((item) => item.semana === week);
      return {
        week,
        label: `S${week}`,
        count: items.length,
        weight: items.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0),
        height: 0,
        isCurrent: week === currentWeek
      };
    });
    const maxCount = Math.max(1, ...raw.map((item) => item.count));

    return raw.map((item) => ({
      ...item,
      height: item.count === 0 ? 8 : Math.max(22, Math.round((item.count / maxCount) * 100))
    }));
  }

  get timelinePoints(): TimelinePoint[] {
    const currentWeek = this.summary?.semanaActual ?? 0;
    return this.weekLoad.map((item) => ({
      week: item.week,
      isPast: currentWeek > 0 && item.week < currentWeek,
      isCurrent: item.week === currentWeek,
      hasEvaluations: item.count > 0,
      evaluationCount: item.count
    }));
  }

  get weekFocusCards(): WeekFocusCard[] {
    const current = Math.max(this.summary?.semanaActual ?? 1, 1);
    return Array.from({ length: 6 }, (_, index) => {
      const week = current + index;
      const evaluations = this.evaluations
        .filter((item) => item.semana === week)
        .sort((left, right) => (left.fechaEstimada || '').localeCompare(right.fechaEstimada || ''));

      return {
        week,
        title: index === 0 ? 'Esta semana' : `Semana ${week}`,
        count: evaluations.length,
        weight: evaluations.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0),
        evaluations,
        isCurrent: index === 0
      };
    });
  }

  get nextEvaluationSummary(): string {
    if (!this.nextEvaluation) {
      return 'Sin evaluaciones proximas con fecha.';
    }

    return `${this.nextEvaluation.evaluacionCodigo} en semana ${this.nextEvaluation.semana ?? '--'} - ${this.nextEvaluationDateLabel}`;
  }

  get courseRiskCards(): CourseRiskCard[] {
    const grouped = new Map<number, MyEvaluation[]>();
    this.evaluations.forEach((item) => {
      const current = grouped.get(item.usuarioPeriodoCursoId) ?? [];
      current.push(item);
      grouped.set(item.usuarioPeriodoCursoId, current);
    });

    return [...grouped.entries()]
      .map(([id, items]) => {
        const accumulated = this.weightedAccumulated(items);
        const registeredWeight = items
          .filter((item) => item.nota != null)
          .reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
        const totalWeight = items.reduce((sum, item) => sum + (item.porcentaje ?? 0), 0);
        const pendingWeight = Math.max(0, totalWeight - registeredWeight);
        const neededGrade = pendingWeight > 0
          ? Number((((13 - accumulated) * 100) / pendingWeight).toFixed(1))
          : null;
        const overdue = items.filter((item) => this.isEvaluationDue(item)).length;
        const risk = this.resolveCourseRisk(accumulated, pendingWeight, neededGrade, overdue);

        return {
          id,
          code: items[0].codigoCurso,
          name: items[0].nombreCurso,
          accumulated,
          registeredWeight,
          pendingWeight,
          neededGrade,
          risk: risk.risk,
          detail: risk.detail
        };
      })
      .sort((left, right) => this.riskRank(left.risk) - this.riskRank(right.risk) || left.name.localeCompare(right.name))
      .slice(0, 5);
  }

  get criticalCourseCount(): number {
    return this.courseRiskCards.filter((item) => item.risk !== 'estable').length;
  }

  get todaySessions(): MyCalendarEvent[] {
    const todayItems = this.upcomingSessions.filter((item) => this.isSameDay(item.inicio, new Date()));
    if (todayItems.length > 0) {
      return this.uniqueSessionsByCourse(todayItems).slice(0, 4);
    }
    return this.uniqueSessionsByCourse(this.upcomingSessions).slice(0, 4);
  }

  get classesTodayCount(): number {
    return this.upcomingSessions.filter((item) => this.isSameDay(item.inicio, new Date())).length;
  }

  get scheduleHeading(): string {
    return this.classesTodayCount > 0 ? 'Horario del dia' : 'Proximas sesiones';
  }

  get scheduleSummary(): string {
    return this.classesTodayCount > 0
      ? 'Tus bloques mas cercanos de hoy.'
      : 'Mostrando las siguientes sesiones detectadas en tu agenda.';
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

  get nextEvaluationTypeLabel(): string {
    return this.nextEvaluation?.tipo || 'Evaluacion';
  }

  get pulseItems(): PulseItem[] {
    const items: PulseItem[] = [];

    if (this.nextEvaluation) {
      items.push({
        tone: 'violet',
        title: this.nextEvaluation.nombreCurso,
        meta: `${this.nextEvaluation.evaluacionCodigo} · ${this.nextEvaluationDateLabel}`
      });
    }

    if (this.nextSession) {
      items.push({
        tone: 'green',
        title: this.nextSession.titulo,
        meta: this.formatDate(this.nextSession.inicio, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      });
    }

    if (this.nextSetupStep) {
      items.push({
        tone: 'amber',
        title: this.nextSetupStep.title,
        meta: this.nextSetupStep.status === 'in_progress' ? 'En progreso' : 'Siguiente foco'
      });
    } else if (this.nextPeriodEvent) {
      items.push({
        tone: 'amber',
        title: this.nextPeriodEvent.titulo,
        meta: this.formatDate(this.nextPeriodEvent.inicio, { day: '2-digit', month: 'short' })
      });
    }

    return items.slice(0, 3);
  }

  riskLabel(value: CourseRiskCard['risk']): string {
    switch (value) {
      case 'critico':
        return 'Critico';
      case 'atencion':
        return 'Atencion';
      default:
        return 'Estable';
    }
  }

  formatScore(value: number | null): string {
    if (value == null || Number.isNaN(value)) {
      return '--';
    }
    return value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
  }

  compactEvaluationName(item: MyEvaluation): string {
    return item.evaluacionCodigo || item.tipo || 'Eval.';
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

  scheduleTimeRangeLabel(item: MyCalendarEvent): string {
    const end = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(item.fin));
    return `Hasta ${end}`;
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

  private uniqueSessionsByCourse(items: MyCalendarEvent[]): MyCalendarEvent[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.usuarioPeriodoCursoId?.toString()
        || item.cursoId?.toString()
        || item.codigoCurso
        || item.titulo;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private weightedAccumulated(items: MyEvaluation[]): number {
    return Number(items.reduce((sum, item) => {
      if (item.nota == null || item.porcentaje == null) {
        return sum;
      }
      return sum + (item.nota * item.porcentaje / 100);
    }, 0).toFixed(2));
  }

  private isEvaluationDue(item: MyEvaluation): boolean {
    if (item.nota != null || item.exonerado || !item.fechaEstimada) {
      return false;
    }

    const today = this.startOfToday().getTime();
    const target = new Date(`${item.fechaEstimada}T00:00:00`).getTime();
    return target <= today;
  }

  private resolveCourseRisk(
    accumulated: number,
    pendingWeight: number,
    neededGrade: number | null,
    overdue: number
  ): { risk: CourseRiskCard['risk']; detail: string } {
    const maxPossible = accumulated + (pendingWeight * 20 / 100);

    if (maxPossible < 13) {
      return { risk: 'critico', detail: 'No alcanza 13 incluso con notas maximas.' };
    }
    if (neededGrade != null && neededGrade > 18) {
      return { risk: 'critico', detail: `Necesita ${this.formatScore(neededGrade)} en lo pendiente.` };
    }
    if (overdue > 0) {
      return { risk: 'atencion', detail: `${overdue} evaluacion${overdue === 1 ? '' : 'es'} vencida${overdue === 1 ? '' : 's'}.` };
    }
    if (neededGrade != null && neededGrade > 15) {
      return { risk: 'atencion', detail: `Debe promediar ${this.formatScore(neededGrade)} en lo pendiente.` };
    }
    return { risk: 'estable', detail: 'Riesgo bajo con la informacion actual.' };
  }

  private riskRank(value: CourseRiskCard['risk']): number {
    if (value === 'critico') {
      return 0;
    }
    if (value === 'atencion') {
      return 1;
    }
    return 2;
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
