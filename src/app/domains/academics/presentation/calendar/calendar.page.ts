import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { MeUseCase, MyCalendarEvent, MyCurrentPeriod } from '../../application/me-use-case';

type CalendarFilter = 'all' | 'evaluacion' | 'horario' | 'periodo';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss'
})
export class CalendarPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  isLoading = true;
  loadError = '';
  events: MyCalendarEvent[] = [];
  currentPeriod: MyCurrentPeriod | null = null;
  currentMonth = this.startOfMonth(new Date());
  selectedDateIso = this.toIsoDate(new Date());
  calendarCells: CalendarCell[] = [];
  selectedFilter: CalendarFilter = 'all';

  ngOnInit(): void {
    this.loadCalendar();
  }

  get currentMonthLabel(): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(this.currentMonth));
  }

  get selectedDateLabel(): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date(`${this.selectedDateIso}T00:00:00`)));
  }

  get todayDateLabel(): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date()));
  }

  get filteredEvents(): MyCalendarEvent[] {
    return this.events.filter((item) => this.matchesFilter(item, this.selectedFilter));
  }

  get selectedDayEvents(): MyCalendarEvent[] {
    return this.filteredEventsForDate(this.selectedDateIso);
  }

  get todayEvents(): MyCalendarEvent[] {
    return this.filteredEventsForDate(this.toIsoDate(new Date()));
  }

  get todayBadgeLabel(): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short'
    }).format(new Date()).toUpperCase();
  }

  get upcomingEvents(): MyCalendarEvent[] {
    const todayIso = this.toIsoDate(new Date());
    return this.filteredEvents
      .filter((item) => item.inicio.slice(0, 10) >= todayIso)
      .slice()
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 3);
  }

  get monthDensityLabel(): string {
    const total = this.monthStats.total;
    if (total === 0) {
      return 'Mes ligero';
    }
    if (total <= 4) {
      return 'Carga contenida';
    }
    if (total <= 8) {
      return 'Carga media';
    }
    return 'Mes intenso';
  }

  get monthStats() {
    const currentMonthEvents = this.filteredEvents.filter((item) => this.isSameMonth(new Date(item.inicio), this.currentMonth));
    return {
      total: currentMonthEvents.length,
      classes: currentMonthEvents.filter((item) => item.origen === 'horario').length,
      evaluations: currentMonthEvents.filter((item) => item.origen === 'evaluacion').length,
      period: currentMonthEvents.filter((item) => item.origen === 'periodo').length
    };
  }

  get filterOptions(): Array<{ key: CalendarFilter; label: string }> {
    return [
      { key: 'all', label: 'Ver todos' },
      { key: 'evaluacion', label: 'Evaluaciones' },
      { key: 'horario', label: 'Clases' },
      { key: 'periodo', label: 'Eventos' }
    ];
  }

  get hasScheduledClasses(): boolean {
    return this.events.some((item) => item.origen === 'horario');
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = this.startOfMonth(today);
    this.selectedDateIso = this.toIsoDate(today);
    this.loadCalendar();
  }

  selectDate(isoDate: string): void {
    this.selectedDateIso = isoDate;
    this.rebuildCalendar();
  }

  setFilter(filter: CalendarFilter): void {
    this.selectedFilter = filter;
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
        return 'event-chip--success';
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

  dayPillLabel(item: MyCalendarEvent): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(item.inicio));
  }

  upcomingDateLabel(item: MyCalendarEvent): string {
    return this.capitalize(new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(item.inicio)));
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
        const availableDates = new Set(this.filteredEvents.map((item) => item.inicio.slice(0, 10)));
        if (!availableDates.has(this.selectedDateIso) && this.filteredEvents.length > 0) {
          this.selectedDateIso = this.filteredEvents[0].inicio.slice(0, 10);
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
    const start = this.startOfCalendarGrid(this.currentMonth);
    const cells: CalendarCell[] = [];
    const cursor = new Date(start);
    const todayIso = this.toIsoDate(new Date());

    for (let index = 0; index < 42; index += 1) {
      const isoDate = this.toIsoDate(cursor);
      const dayEvents = this.filteredEventsForDate(isoDate);

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

  private matchesFilter(item: MyCalendarEvent, filter: CalendarFilter): boolean {
    return filter === 'all' || item.origen === filter;
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

  private filteredEventsForDate(isoDate: string): MyCalendarEvent[] {
    return this.filteredEvents.filter((item) => item.inicio.slice(0, 10) === isoDate);
  }

  private startOfMonth(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  private startOfCalendarGrid(value: Date): Date {
    const firstOfMonth = this.startOfMonth(value);
    const day = firstOfMonth.getDay();
    const offset = day === 0 ? 6 : day - 1;
    const result = new Date(firstOfMonth);
    result.setDate(result.getDate() - offset);
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

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
