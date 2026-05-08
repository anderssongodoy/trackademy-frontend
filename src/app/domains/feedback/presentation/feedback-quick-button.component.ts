import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-feedback-quick-button',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div [class]="'feedback-quick-button position-' + position">
      <a [routerLink]="routePath" class="feedback-btn">
        <span class="feedback-btn__label">{{ label }}</span>
      </a>
    </div>
  `,
  styles: [`
    .feedback-quick-button {
      &.position-floating {
        position: fixed;
        bottom: 1.75rem;
        right: 1.75rem;
        z-index: 50;
      }
      &.position-inline { display: inline-flex; }
      &.position-block { display: flex; width: 100%; }
    }

    .feedback-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      background: #c4572a;
      color: #fff;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.86rem;
      letter-spacing: 0.01em;
      box-shadow: 0 6px 20px rgba(196, 87, 42, 0.28);
      transition: background-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;

      &:hover {
        background: #b34a20;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(196, 87, 42, 0.34);
      }
      &:active { transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .feedback-quick-button.position-floating {
        bottom: 1rem;
        right: 1rem;
      }
      .feedback-btn {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
      }
    }
  `]
})
export class FeedbackQuickButtonComponent {
  @Input() position: 'floating' | 'inline' | 'block' = 'floating';
  @Input() label = 'Reportar problema';
  @Input() routePath = '/app/feedback/reportes';
}
