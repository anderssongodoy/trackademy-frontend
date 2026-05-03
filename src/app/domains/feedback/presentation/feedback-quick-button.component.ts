import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-feedback-quick-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div [ngClass]="['feedback-quick-button', 'position-' + position, 'variant-' + variant]">
      <a 
        routerLink="/app/feedback/reportes"
        [title]="tooltip"
        class="feedback-btn"
      >
        <span class="icon">💬</span>
        <span class="label">{{ label }}</span>
      </a>
    </div>
  `,
  styles: [`
    .feedback-quick-button {
      display: flex;
      align-items: center;

      &.position-floating {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 50;
      }

      &.position-inline {
        display: inline-flex;
      }

      &.position-block {
        display: flex;
        width: 100%;
      }

      .feedback-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background-color: #5B21B6;
        color: white;
        text-decoration: none;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(91, 33, 182, 0.3);
        cursor: pointer;

        &:hover {
          background-color: #8B5CF6;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(91, 33, 182, 0.4);
        }

        &:active {
          transform: translateY(0);
        }

        .icon {
          font-size: 1.25rem;
        }
      }

      &.variant-minimal .feedback-btn {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        background-color: transparent;
        color: #5B21B6;
        border: 2px solid #5B21B6;
        box-shadow: none;

        &:hover {
          background-color: rgba(91, 33, 182, 0.1);
          box-shadow: none;
        }
      }

      &.variant-text .feedback-btn {
        padding: 0;
        background-color: transparent;
        color: #5B21B6;
        box-shadow: none;
        font-weight: 500;

        &:hover {
          color: #8B5CF6;
          background-color: transparent;
          box-shadow: none;
        }
      }
    }

    @media (max-width: 768px) {
      .feedback-quick-button.position-floating {
        bottom: 1rem;
        right: 1rem;
      }

      .feedback-btn {
        font-size: 0.85rem !important;
        padding: 0.5rem 1rem !important;
      }
    }
  `]
})
export class FeedbackQuickButtonComponent {
  @Input() position: 'floating' | 'inline' | 'block' = 'floating';
  @Input() variant: 'primary' | 'minimal' | 'text' = 'primary';
  @Input() label = 'Reportar Problema';
  @Input() tooltip = 'Envía sugerencias, reporta errores y ayúdanos a mejorar';
}
