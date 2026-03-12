import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthUseCase } from '../../../domains/identity/application/auth-use-case';

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly authUseCase = inject(AuthUseCase);
  private readonly router = inject(Router);

  readonly mobileOpen = signal(false);
  readonly collapsed = signal(false);

  toggleMenu(): void {
    if (window.innerWidth <= 1024) {
      this.mobileOpen.set(!this.mobileOpen());
      return;
    }
    this.collapsed.set(!this.collapsed());
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.authUseCase.signOut();
    this.router.navigate(['/auth/sign-in']);
  }
}
