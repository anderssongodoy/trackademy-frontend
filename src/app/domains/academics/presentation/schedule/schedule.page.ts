import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyCourse, MyScheduleEntry } from '../../application/me-use-case';

interface DaySchedule {
  day: string;
  dayNumber: number;
  isToday: boolean;
  entries: MyScheduleEntry[];
}

@Component({
  selector: 'app-schedule-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss'
})
export class SchedulePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  courses: MyCourse[] = [];
  schedule: MyScheduleEntry[] = [];
  scheduleByDay: DaySchedule[] = [];
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getMyCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loadSchedule();
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

  private loadSchedule(): void {
    this.meUseCase.getMySchedule().subscribe({
      next: (schedule) => {
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

  private buildScheduleByDay(entries: MyScheduleEntry[]): DaySchedule[] {
    const todayDay = this.resolveTodayDayNumber();
    return this.days.map((day, index) => {
      const dayEntries = entries
        .filter((entry) => entry.diaSemana === index + 1)
        .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      return {
        day,
        dayNumber: index + 1,
        isToday: todayDay === index + 1,
        entries: dayEntries
      };
    });
  }

  private resolveTodayDayNumber(): number {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }
}
