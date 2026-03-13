import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCalendarEvent, MyCurrentPeriod, MyEvaluation } from '../../application/me-use-case';

type ReminderFilter = 'all' | 'actionable' | 'informative';
type ReminderUrgency = 'overdue' | 'today' | 'soon' | 'upcoming';
type ReminderKind = 'grade' | 'class' | 'period';

interface ReminderItem {
  id: string;
  kind: ReminderKind;
  urgency: ReminderUrgency;
  title: string;
  subtitle: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  sortTime: number;
  courseLabel: string;
  actionLabel: string;
  actionLink: string;
}

@Component({
  selector: 'app-reminders-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './reminders.page.html',
  styleUrl: './reminders.page.scss'
})
export class RemindersPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  selectedFilter: ReminderFilter = 'all';
  reminderItems: ReminderItem[] = [];

  ngOnInit(): void {
    this.loadReminders();
  }

  get filteredReminders(): ReminderItem[] {
    switch (this.selectedFilter) {
      case 'actionable':
        return this.reminderItems.filter((item) => item.kind === 'grade');
      case 'informative':
        return this.reminderItems.filter((item) => item.kind !== 'grade');
      default:
        return this.reminderItems;
    }
  }

  get stats() {
    return {
      total: this.reminderItems.length,
      actionable: this.reminderItems.filter((item) => item.kind === 'grade').length,
      today: this.reminderItems.filter((item) => item.urgency === 'today').length,
      overdue: this.reminderItems.filter((item) => item.urgency === 'overdue').length
    };
  }

  trackReminder(_index: number, item: ReminderItem): string {
    return item.id;
  }

  urgencyLabel(item: ReminderItem): string {
    switch (item.urgency) {
      case 'overdue':
        return 'Vencido';
      case 'today':
        return 'Hoy';
      case 'soon':
        return 'Muy pronto';
      default:
        return 'En camino';
    }
  }

  urgencyClass(item: ReminderItem): string {
    switch (item.urgency) {
      case 'overdue':
        return 'reminder-chip--danger';
      case 'today':
        return 'reminder-chip--warning';
      case 'soon':
        return 'reminder-chip--brand';
      default:
        return 'reminder-chip--neutral';
    }
  }

  kindLabel(item: ReminderItem): string {
    switch (item.kind) {
      case 'grade':
        return 'Pendiente';
      case 'class':
        return 'Clase';
      default:
        return 'Periodo';
    }
  }

  kindClass(item: ReminderItem): string {
    switch (item.kind) {
      case 'grade':
        return 'reminder-kind--grade';
      case 'class':
        return 'reminder-kind--class';
      default:
        return 'reminder-kind--period';
    }
  }

  private loadReminders(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getCurrentPeriod().subscribe({
      next: (period) => {
        const todayIso = this.toIsoDate(new Date());
        const endIso = this.resolveCalendarEnd(period);

        forkJoin({
          evaluations: this.meUseCase.getMyEvaluations(),
          calendar: this.meUseCase.getMyCalendar(todayIso, endIso)
        }).subscribe({
          next: ({ evaluations, calendar }) => {
            this.reminderItems = this.buildReminderItems(evaluations, calendar).slice(0, 18);
            this.isLoading = false;
          },
          error: () => {
            this.loadError = 'No se pudieron cargar tus recordatorios reales.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.loadError = 'No se pudo identificar el periodo actual.';
        this.isLoading = false;
      }
    });
  }

  private buildReminderItems(evaluations: MyEvaluation[], calendar: MyCalendarEvent[]): ReminderItem[] {
    const gradeItems = evaluations
      .filter((item) => item.nota == null && !!item.fechaEstimada)
      .map((item) => this.toGradeReminder(item));

    const calendarItems = calendar
      .filter((item) => item.origen !== 'evaluacion')
      .map((item) => this.toCalendarReminder(item))
      .filter((item): item is ReminderItem => item != null);

    return [...gradeItems, ...calendarItems]
      .sort((left, right) => left.sortTime - right.sortTime)
      .slice(0, 24);
  }

  private toGradeReminder(item: MyEvaluation): ReminderItem {
    const dueDate = new Date(`${item.fechaEstimada}T00:00:00`);
    const diffDays = this.diffInDays(dueDate, this.startOfToday());
    const urgency: ReminderUrgency = diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : diffDays <= 3 ? 'soon' : 'upcoming';

    return {
      id: `grade-${item.usuarioPeriodoCursoId}-${item.evaluacionCodigo}`,
      kind: 'grade',
      urgency,
      title: item.descripcion || item.evaluacionCodigo,
      subtitle: `${item.codigoCurso} · ${item.nombreCurso}`,
      description: `${item.evaluacionCodigo}${item.porcentaje != null ? ` · ${item.porcentaje}%` : ''}${item.semana != null ? ` · Semana ${item.semana}` : ''}`,
      dateLabel: this.formatLongDate(dueDate),
      timeLabel: diffDays < 0 ? 'Pendiente de registrar' : diffDays === 0 ? 'Se habilita hoy' : 'Se acerca la fecha estimada',
      sortTime: dueDate.getTime(),
      courseLabel: item.codigoCurso,
      actionLabel: 'Ir a notas',
      actionLink: '/app/notas'
    };
  }

  private toCalendarReminder(item: MyCalendarEvent): ReminderItem | null {
    const start = new Date(item.inicio);
    const diffDays = this.diffInDays(start, this.startOfToday());
    if (diffDays > 10) {
      return null;
    }

    const urgency: ReminderUrgency = diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : diffDays <= 2 ? 'soon' : 'upcoming';
    const isClass = item.origen === 'horario';

    return {
      id: `calendar-${item.origen}-${item.inicio}-${item.titulo}`,
      kind: isClass ? 'class' : 'period',
      urgency,
      title: item.titulo,
      subtitle: item.nombreCurso || (isClass ? 'Clase programada' : 'Evento del periodo'),
      description: item.subtitulo || (item.todoElDia ? 'Todo el dia' : this.formatTimeRange(start, new Date(item.fin))),
      dateLabel: this.formatLongDate(start),
      timeLabel: item.todoElDia ? 'Todo el dia' : this.formatTimeRange(start, new Date(item.fin)),
      sortTime: start.getTime(),
      courseLabel: item.codigoCurso || (isClass ? 'Horario' : 'Periodo'),
      actionLabel: isClass ? 'Abrir horario' : 'Ver calendario',
      actionLink: isClass ? '/app/horario' : '/app/calendario'
    };
  }

  private resolveCalendarEnd(period: MyCurrentPeriod): string {
    if (period.periodoFechaFin) {
      return period.periodoFechaFin;
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 21);
    return this.toIsoDate(fallback);
  }

  private startOfToday(): Date {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private diffInDays(target: Date, base: Date): number {
    const targetDate = new Date(target);
    targetDate.setHours(0, 0, 0, 0);
    return Math.round((targetDate.getTime() - base.getTime()) / 86400000);
  }

  private formatLongDate(value: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(value);
  }

  private formatTimeRange(start: Date, end: Date): string {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
