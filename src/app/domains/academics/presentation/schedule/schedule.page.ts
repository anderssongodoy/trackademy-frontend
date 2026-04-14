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
  courseCode: string;
  courseName: string;
  meta: string;
  context: string;
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

  readonly days = [
    { label: 'Lunes', short: 'Lun' },
    { label: 'Martes', short: 'Mar' },
    { label: 'Miercoles', short: 'Mie' },
    { label: 'Jueves', short: 'Jue' },
    { label: 'Viernes', short: 'Vie' },
    { label: 'Sabado', short: 'Sab' },
    { label: 'Domingo', short: 'Dom' }
  ];

  readonly hourLabels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

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

  get gridBlocks(): ScheduleGridBlock[] {
    return this.schedule.map((entry) => {
      const startMinutes = this.toMinutes(entry.horaInicio);
      const durationMinutes = entry.duracionMin ?? Math.max(this.toMinutes(entry.horaFin) - startMinutes, 60);
      const topRem = Math.max((startMinutes - 480) / 60 * 3, 0);
      const heightRem = Math.max(durationMinutes / 60 * 3, 2.6);

      return {
        key: `${entry.usuarioPeriodoCursoId}-${entry.bloqueNro}-${entry.diaSemana}`,
        dayNumber: entry.diaSemana ?? 1,
        topRem,
        heightRem,
        courseCode: entry.codigo,
        courseName: entry.nombre,
        meta: this.sessionMeta(entry),
        context: this.sessionContext(entry),
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
    return `${day.entries.length} bloque${day.entries.length === 1 ? '' : 's'} · ${hours.toFixed(totalMinutes % 60 === 0 ? 0 : 1)} h`;
  }

  sessionMeta(entry: MyScheduleEntry): string {
    return entry.tipoSesion || entry.modalidad || 'Sesion de clase';
  }

  sessionContext(entry: MyScheduleEntry): string {
    return entry.ubicacion || entry.urlVirtual || 'Ubicacion pendiente';
  }

  blockStyle(block: ScheduleGridBlock): Record<string, string> {
    return {
      gridColumn: `${block.dayNumber + 1}`,
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
}
