import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);
  private nextId = 1;

  show(tone: ToastTone, message: string, durationMs = 3800): void {
    const id = this.nextId++;
    this.items.update((current) => [...current, { id, tone, message }]);

    window.setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(message: string, durationMs?: number): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = 5200): void {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs = 3200): void {
    this.show('info', message, durationMs);
  }

  dismiss(id: number): void {
    this.items.update((current) => current.filter((item) => item.id !== id));
  }
}
