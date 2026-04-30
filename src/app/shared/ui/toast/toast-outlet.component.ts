import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.items(); track toast.id) {
        <article class="toast" [class.toast--success]="toast.tone === 'success'" [class.toast--error]="toast.tone === 'error'" [class.toast--info]="toast.tone === 'info'">
          <p>{{ toast.message }}</p>
          <button type="button" (click)="toastService.dismiss(toast.id)" aria-label="Cerrar mensaje">x</button>
        </article>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 60;
      display: grid;
      gap: 12px;
      width: min(360px, calc(100vw - 32px));
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid rgba(226, 232, 240, 0.72);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
      pointer-events: auto;
      backdrop-filter: blur(14px);
    }

    .toast p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.45;
      color: #111827;
    }

    .toast button {
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0.72;
      text-transform: uppercase;
      font-weight: 700;
    }

    .toast--success {
      border-color: rgba(34, 197, 94, 0.25);
      background: rgba(240, 253, 244, 0.98);
    }

    .toast--error {
      border-color: rgba(239, 68, 68, 0.2);
      background: rgba(254, 242, 242, 0.99);
    }

    .toast--info {
      border-color: rgba(93, 0, 200, 0.18);
      background: rgba(247, 244, 255, 0.99);
    }

    @media (max-width: 760px) {
      .toast-stack {
        right: 14px;
        left: 14px;
        bottom: 14px;
        width: auto;
      }
    }
  `]
})
export class ToastOutletComponent {
  protected readonly toastService = inject(ToastService);
}
