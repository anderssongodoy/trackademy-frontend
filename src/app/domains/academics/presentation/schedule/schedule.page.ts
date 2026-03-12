import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyCourse, MyScheduleEntry } from '../../application/me-use-case';

interface DaySchedule {
  day: string;
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

  readonly days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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
        this.loadError = 'No se pudo cargar tu horario. Verifica la conexión con el backend.';
        this.isLoading = false;
      }
    });
  }

  private loadSchedule(): void {
    this.meUseCase.getMySchedule().subscribe({
      next: (schedule) => {
        this.schedule = schedule;
        this.scheduleByDay = this.buildScheduleByDay(schedule);
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu horario. Verifica la conexión con el backend.';
        this.isLoading = false;
      }
    });
  }

  private buildScheduleByDay(entries: MyScheduleEntry[]): DaySchedule[] {
    return this.days.map((day, index) => {
      const dayEntries = entries
        .filter((entry) => entry.diaSemana === index + 1)
        .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      return { day, entries: dayEntries };
    });
  }
}
