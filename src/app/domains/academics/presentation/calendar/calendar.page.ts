import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { MeUseCase, MyCalendarEvent } from '../../application/me-use-case';

interface CalendarDayGroup {
  label: string;
  items: MyCalendarEvent[];
}

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, DatePipe],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss'
})
export class CalendarPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  events: MyCalendarEvent[] = [];
  groups: CalendarDayGroup[] = [];

  ngOnInit(): void {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    this.meUseCase.getMyCalendar(this.toIsoDate(start), this.toIsoDate(end)).subscribe({
      next: (events) => {
        this.events = events;
        this.groups = this.groupByDay(events);
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar el calendario del periodo.';
        this.isLoading = false;
      }
    });
  }

  private groupByDay(events: MyCalendarEvent[]): CalendarDayGroup[] {
    const map = new Map<string, MyCalendarEvent[]>();

    events.forEach((event) => {
      const key = event.inicio.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(event);
      map.set(key, current);
    });

    return [...map.entries()].map(([label, items]) => ({
      label,
      items: items.sort((a, b) => a.inicio.localeCompare(b.inicio))
    }));
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
