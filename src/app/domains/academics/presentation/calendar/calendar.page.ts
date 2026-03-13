import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { MeUseCase, MyCalendarEvent, MyCurrentPeriod } from '../../application/me-use-case';

interface CalendarCell {
  key: string;
  date: Date;
  isoDate: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  visibleEvents: MyCalendarEvent[];
  hiddenCount: number;
}

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss'
})
export class CalendarPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly weekDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  isLoading = true;
  loadError = '';
  events: MyCalendarEvent[] = [];
  currentPeriod: MyCurrentPeriod | null = null;
  currentMonth = this.startOfMonth(new Date());
  selectedDateIso = this.toIsoDate(new Date());
  calendarCells: CalendarCell[] = [];

  ngOnInit(): void {
    this.loadCalendar();
  }

  get currentMonthLabel(): string {
    return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(this.currentMonth);
  }

  get selectedDateLabel(): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${this.selectedDateIso}T00:00:00`));
  }

  get selectedDayEvents(): MyCalendarEvent[] {
    return this.eventsForDate(this.selectedDateIso);
  }

  get upcomingEvents(): MyCalendarEvent[] {
    return this.events
      .slice()
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 6);
  }

  get monthStats() {
    const currentMonthEvents = this.events.filter((item) => this.isSameMonth(new Date(item.inicio), this.currentMonth));
    return {
      total: currentMonthEvents.length,
      classes: currentMonthEvents.filter((item) => item.origen === 'horario').length,
      evaluations: currentMonthEvents.filter((item) => item.origen === 'evaluacion').length,
      period: currentMonthEvents.filter((item) => item.origen === 'periodo').length
    };
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.rebuildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.rebuildCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = this.startOfMonth(today);
    this.selectedDateIso = this.toIsoDate(today);
    this.rebuildCalendar();
  }

  selectDate(isoDate: string): void {
    this.selectedDateIso = isoDate;
    this.rebuildCalendar();
  }

  trackCell(_index: number, cell: CalendarCell): string {
    return cell.key;
  }

  trackEvent(_index: number, item: MyCalendarEvent): string {
    return `${item.inicio}-${item.titulo}-${item.origen}`;
  }

  eventTone(item: MyCalendarEvent): string {
    switch (item.origen) {
      case 'evaluacion':
        return 'event-chip--danger';
      case 'horario':
        return 'event-chip--brand';
      case 'periodo':
        return 'event-chip--warning';
      default:
        return 'event-chip--neutral';
    }
  }

  eventTypeLabel(item: MyCalendarEvent): string {
    switch (item.origen) {
      case 'evaluacion':
        return 'Evaluacion';
      case 'horario':
        return 'Clase';
      case 'periodo':
        return 'Periodo';
      default:
        return item.origen;
    }
  }

  eventTimeLabel(item: MyCalendarEvent): string {
    if (item.todoElDia) {
      return 'Todo el dia';
    }

    const start = new Date(item.inicio);
    const end = new Date(item.fin);
    const format = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${format.format(start)} - ${format.format(end)}`;
  }

  private loadCalendar(): void {
    this.isLoading = true;
    this.loadError = '';

    const start = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);

    this.meUseCase.getCurrentPeriod().pipe(
      switchMap((currentPeriod) => {
        this.currentPeriod = currentPeriod;
        return this.meUseCase.getMyCalendar(this.toIsoDate(start), this.resolveCalendarEnd(start, currentPeriod));
      })
    ).subscribe({
      next: (events) => {
        this.events = events.sort((a, b) => a.inicio.localeCompare(b.inicio));
        const availableDates = new Set(events.map((item) => item.inicio.slice(0, 10)));
        if (!availableDates.has(this.selectedDateIso) && events.length > 0) {
          this.selectedDateIso = events[0].inicio.slice(0, 10);
        }
        this.rebuildCalendar();
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar el calendario del periodo.';
        this.isLoading = false;
      }
    });
  }

  private rebuildCalendar(): void {
    const start = this.startOfWeek(this.currentMonth);
    const end = this.endOfWeek(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0));
    const cells: CalendarCell[] = [];
    const cursor = new Date(start);
    const todayIso = this.toIsoDate(new Date());

    while (cursor <= end) {
      const isoDate = this.toIsoDate(cursor);
      const dayEvents = this.eventsForDate(isoDate);
      cells.push({
        key: isoDate,
        date: new Date(cursor),
        isoDate,
        dayNumber: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === this.currentMonth.getMonth(),
        isToday: isoDate === todayIso,
        isSelected: isoDate === this.selectedDateIso,
        visibleEvents: dayEvents.slice(0, 2),
        hiddenCount: Math.max(dayEvents.length - 2, 0)
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    this.calendarCells = cells;
  }

  private resolveCalendarEnd(start: Date, currentPeriod: MyCurrentPeriod | null): string {
    const periodEnd = currentPeriod?.periodoFechaFin;
    if (periodEnd) {
      const endDate = new Date(`${periodEnd}T00:00:00`);
      if (!Number.isNaN(endDate.getTime()) && endDate >= start) {
        return this.toIsoDate(endDate);
      }
    }

    const fallback = new Date(start.getFullYear(), start.getMonth() + 1, 35);
    return this.toIsoDate(fallback);
  }

  private eventsForDate(isoDate: string): MyCalendarEvent[] {
    return this.events.filter((item) => item.inicio.slice(0, 10) === isoDate);
  }

  private startOfMonth(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  private startOfWeek(value: Date): Date {
    const result = new Date(value);
    result.setDate(result.getDate() - result.getDay());
    return result;
  }

  private endOfWeek(value: Date): Date {
    const result = new Date(value);
    result.setDate(result.getDate() + (6 - result.getDay()));
    return result;
  }

  private isSameMonth(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
