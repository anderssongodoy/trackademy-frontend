import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyCalendarEvent, MyDashboardSummary, MyEvaluation } from '../../application/me-use-case';

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

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getDashboard().subscribe({
      next: (summary) => {
        this.summary = summary;
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

  formatEventDate(value: string | null, includeTime = false): string {
    if (!value) {
      return 'Fecha pendiente';
    }

    return new Intl.DateTimeFormat('es-PE', includeTime
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short' }
    ).format(new Date(value));
  }
}
