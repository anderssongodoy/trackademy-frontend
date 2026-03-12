import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCourse, MyCurrentPeriod } from '../../application/me-use-case';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  currentPeriod: MyCurrentPeriod | null = null;
  courses: MyCourse[] = [];

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      period: this.meUseCase.getCurrentPeriod(),
      courses: this.meUseCase.getMyCourses()
    }).subscribe({
      next: ({ period, courses }) => {
        this.currentPeriod = period;
        this.courses = courses;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu información. Revisa tu sesión o el backend.';
        this.isLoading = false;
      }
    });
  }

  get currentWeekLabel(): string {
    const start = this.parseDate(this.currentPeriod?.periodoFechaInicio);
    if (!start) {
      return '—';
    }
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
    if (diffDays < 0) {
      return '—';
    }
    const week = Math.floor(diffDays / 7) + 1;
    return `Semana ${week}`;
  }

  get cycleProgressPercent(): number {
    const start = this.parseDate(this.currentPeriod?.periodoFechaInicio);
    const end = this.parseDate(this.currentPeriod?.periodoFechaFin);
    if (!start || !end) {
      return 0;
    }
    const total = end.getTime() - start.getTime();
    if (total <= 0) {
      return 0;
    }
    const now = new Date();
    const elapsed = Math.min(Math.max(now.getTime() - start.getTime(), 0), total);
    return Math.round((elapsed / total) * 100);
  }

  get cycleProgressLabel(): string {
    if (!this.currentPeriod?.periodoFechaInicio || !this.currentPeriod?.periodoFechaFin) {
      return 'Sin fechas del periodo';
    }
    return `${this.cycleProgressPercent}% del ciclo`;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }
}
