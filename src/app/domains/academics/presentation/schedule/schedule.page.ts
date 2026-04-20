import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCourse, MyCurrentPeriod, MyScheduleEntry } from '../../application/me-use-case';

interface DaySchedule {
  day: string;
  short: string;
  dayNumber: number;
  isToday: boolean;
  entries: MyScheduleEntry[];
}

interface ScheduleGridBlock {
  key: string;
  dayNumber: number;
  topRem: number;
  heightRem: number;
  courseName: string;
  meta: string;
  timeLabel: string;
  tone: 'violet' | 'orange' | 'green' | 'slate';
}

@Component({
  selector: 'app-schedule-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss'
})
export class SchedulePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);
  private readonly hourSlotRem = 7.4;

  readonly days = [
    { label: 'Lunes', short: 'Lun' },
    { label: 'Martes', short: 'Mar' },
    { label: 'Miercoles', short: 'Mie' },
    { label: 'Jueves', short: 'Jue' },
    { label: 'Viernes', short: 'Vie' },
    { label: 'Sabado', short: 'Sab' },
    { label: 'Domingo', short: 'Dom' }
  ];

  currentPeriod: MyCurrentPeriod | null = null;
  courses: MyCourse[] = [];
  schedule: MyScheduleEntry[] = [];
  scheduleByDay: DaySchedule[] = [];
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      period: this.meUseCase.getCurrentPeriod(),
      courses: this.meUseCase.getMyCourses(),
      schedule: this.meUseCase.getMySchedule()
    }).subscribe({
      next: ({ period, courses, schedule }) => {
        this.currentPeriod = period;
        this.courses = courses;
        this.schedule = schedule;
        this.scheduleByDay = this.buildScheduleByDay(schedule);
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu horario. Verifica la conexion con el backend.';
        this.isLoading = false;
      }
    });
  }

  hasSchedule(usuarioPeriodoCursoId: number): boolean {
    return this.schedule.some((entry) => entry.usuarioPeriodoCursoId === usuarioPeriodoCursoId);
  }

  get configuredCoursesCount(): number {
    return this.courses.filter((course) => this.hasSchedule(course.usuarioPeriodoCursoId)).length;
  }

  get pendingCoursesCount(): number {
    return this.courses.length - this.configuredCoursesCount;
  }

  get totalWeeklyHours(): string {
    const totalMinutes = this.schedule.reduce((sum, entry) => sum + (entry.duracionMin ?? 0), 0);
    return totalMinutes === 0 ? '0 h' : `${(totalMinutes / 60).toFixed(totalMinutes % 60 === 0 ? 0 : 1)} h`;
  }

  get todaySchedule(): DaySchedule | null {
    return this.scheduleByDay.find((day) => day.isToday) ?? null;
  }

  get railAgenda(): DaySchedule | null {
    return this.todaySchedule;
  }

  get railAgendaLabel(): string {
    return this.todaySchedule?.day || this.todayDayLabel;
  }

  get displayStartMinutes(): number {
    if (this.schedule.length === 0) {
      return 8 * 60;
    }

    const earliest = Math.min(...this.schedule.map((entry) => this.toMinutes(entry.horaInicio)));
    const rounded = Math.floor(earliest / 60) * 60;
    return Math.max(rounded - 60, 7 * 60);
  }

  get displayEndMinutes(): number {
    if (this.schedule.length === 0) {
      return 19 * 60;
    }

    const latest = Math.max(...this.schedule.map((entry) => {
      const end = this.toMinutes(entry.horaFin);
      if (end > 0) {
        return end;
      }
      return this.toMinutes(entry.horaInicio) + (entry.duracionMin ?? 60);
    }));

    const rounded = Math.ceil(latest / 60) * 60;
    return Math.min(Math.max(rounded + 60, this.displayStartMinutes + 6 * 60), 23 * 60);
  }

  get hourLabels(): string[] {
    const labels: string[] = [];
    for (let minutes = this.displayStartMinutes; minutes <= this.displayEndMinutes; minutes += 60) {
      labels.push(this.formatMinutes(minutes));
    }
    return labels;
  }

  get hourLineCount(): number {
    return Math.max(this.hourLabels.length, 1);
  }

  get hourRowRem(): number {
    return this.hourSlotRem;
  }

  get canvasHeightRem(): number {
    return Math.max(this.hourLineCount * this.hourRowRem, 10.4);
  }

  get nextClassMessage(): string {
    const todayNumber = this.resolveTodayDayNumber();
    const currentMinutes = this.currentClockMinutes();
    const upcoming = [...this.schedule]
      .sort((a, b) => {
        const aRank = this.nextSessionRank(a, todayNumber, currentMinutes);
        const bRank = this.nextSessionRank(b, todayNumber, currentMinutes);
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return (a.horaInicio || '').localeCompare(b.horaInicio || '');
      })[0];

    if (!upcoming) {
      return 'Sin clases registradas';
    }

    return `${upcoming.nombre} a las ${this.normalizeTime(upcoming.horaInicio)}`;
  }

  get heroMeterEyebrow(): string {
    return `Hoy: ${this.todayDayLabel}`;
  }

  get nextPendingCourse(): MyCourse | null {
    return this.courses.find((course) => !this.hasSchedule(course.usuarioPeriodoCursoId)) ?? null;
  }

  get needsInitialSetup(): boolean {
    return this.courses.length > 0 && this.configuredCoursesCount === 0;
  }

  get todayPendingCutoffLabel(): string {
    const todayEntries = this.todaySchedule?.entries ?? [];
    if (todayEntries.length === 0) {
      return 'Sin clases registradas';
    }
    const last = todayEntries[todayEntries.length - 1];
    return `Terminas a las ${this.normalizeTime(last.horaFin)}`;
  }

  get todayDayLabel(): string {
    return this.days[this.resolveTodayDayNumber() - 1]?.label || 'Hoy';
  }

  get gridBlocks(): ScheduleGridBlock[] {
    return this.schedule.map((entry) => {
      const startMinutes = this.toMinutes(entry.horaInicio);
      const endMinutes = this.toMinutes(entry.horaFin);
      const apiRangeMinutes = endMinutes - startMinutes;
      const durationMinutes = apiRangeMinutes > 0
        ? apiRangeMinutes
        : (entry.duracionMin ?? 60);
      const topRem = Math.max(((startMinutes - this.displayStartMinutes) / 60) * this.hourSlotRem, 0);
      const heightRem = (durationMinutes / 60) * this.hourSlotRem;

      return {
        key: `${entry.usuarioPeriodoCursoId}-${entry.bloqueNro}-${entry.diaSemana}`,
        dayNumber: entry.diaSemana ?? 1,
        topRem,
        heightRem,
        courseName: entry.nombre,
        meta: this.sessionMeta(entry),
        timeLabel: `${this.displayTime(entry.horaInicio)} - ${this.displayTime(entry.horaFin)}`,
        tone: this.resolveTone(entry)
      };
    });
  }

  daySummaryLabel(day: DaySchedule): string {
    if (day.entries.length === 0) {
      return 'Sin clases';
    }

    const totalMinutes = day.entries.reduce((sum, entry) => sum + (entry.duracionMin ?? 0), 0);
    const hours = totalMinutes / 60;
    return `${day.entries.length} bloque${day.entries.length === 1 ? '' : 's'} - ${hours.toFixed(totalMinutes % 60 === 0 ? 0 : 1)} h`;
  }

  sessionMeta(entry: MyScheduleEntry): string {
    return entry.tipoSesion || entry.modalidad || 'Sesion de clase';
  }

  sessionContext(entry: MyScheduleEntry): string {
    return entry.ubicacion || entry.urlVirtual || 'Ubicacion pendiente';
  }

  displayTime(value: string | null): string {
    return this.normalizeTime(value);
  }

  pendingCourseAccent(course: MyCourse): string {
    const normalized = `${course.modalidad || ''}`.toLowerCase();
    if (normalized.includes('virtual') || normalized.includes('remoto')) {
      return 'pending-course--green';
    }
    return 'pending-course--danger';
  }

  blockStyle(block: ScheduleGridBlock): Record<string, string> {
    const columnWidth = 100 / 7;
    return {
      left: `calc(${(block.dayNumber - 1) * columnWidth}% + 0.08rem)`,
      width: `calc(${columnWidth}% - 0.16rem)`,
      top: `${block.topRem}rem`,
      height: `${block.heightRem}rem`
    };
  }

  blockToneClass(block: ScheduleGridBlock): string {
    return `grid-block--${block.tone}`;
  }

  private buildScheduleByDay(entries: MyScheduleEntry[]): DaySchedule[] {
    const todayDay = this.resolveTodayDayNumber();
    return this.days.map((day, index) => {
      const dayEntries = entries
        .filter((entry) => entry.diaSemana === index + 1)
        .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      return {
        day: day.label,
        short: day.short,
        dayNumber: index + 1,
        isToday: todayDay === index + 1,
        entries: dayEntries
      };
    });
  }

  private resolveTone(entry: MyScheduleEntry): ScheduleGridBlock['tone'] {
    const normalized = `${entry.tipoSesion || ''} ${entry.modalidad || ''}`.toLowerCase();
    if (normalized.includes('lab')) {
      return 'orange';
    }
    if (normalized.includes('virtual') || normalized.includes('remoto')) {
      return 'green';
    }
    if (normalized.includes('tutoria')) {
      return 'slate';
    }
    return 'violet';
  }

  private resolveTodayDayNumber(): number {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }

  private currentClockMinutes(): number {
    const now = new Date();
    return (now.getHours() * 60) + now.getMinutes();
  }

  private nextSessionRank(entry: MyScheduleEntry, todayNumber: number, currentMinutes: number): number {
    const dayNumber = entry.diaSemana ?? todayNumber;
    const startMinutes = this.toMinutes(entry.horaInicio);
    const dayOffset = (dayNumber - todayNumber + 7) % 7;
    if (dayOffset === 0 && startMinutes < currentMinutes) {
      return 7 * 1440 + startMinutes;
    }
    return dayOffset * 1440 + startMinutes;
  }

  private toMinutes(value: string | null): number {
    const trimmed = value?.trim();
    if (!trimmed) {
      return 480;
    }
    const [hours = '08', minutes = '00'] = trimmed.split(':');
    return (Number(hours) * 60) + Number(minutes);
  }

  private normalizeTime(value: string | null): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return '--:--';
    }
    const [hours = '--', minutes = '--'] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  private formatMinutes(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
