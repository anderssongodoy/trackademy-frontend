import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthUseCase } from '../../../domains/identity/application/auth-use-case';

interface ShellNavItem {
  label: string;
  route: string;
  title: string;
  icon: string;
}

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
  readonly navItems: ShellNavItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
      title: 'Dashboard',
      icon: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z'
    },
    {
      label: 'Mis Cursos',
      route: '/app/cursos',
      title: 'Mis cursos',
      icon: 'M3 6.5 12 3l9 3.5v11L12 21l-9-3.5zm9-1.4-6 2.3L12 9.8l6-2.4zm7 3.7-6 2.3v7.3l6-2.3zm-14 0v7.3l6 2.3v-7.3z'
    },
    {
      label: 'Horario',
      route: '/app/horario',
      title: 'Horario',
      icon: 'M12 7v5l3 2m7-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'
    },
    {
      label: 'Tareas',
      route: '/app/tareas',
      title: 'Tareas',
      icon: 'M9 11l2 2 4-4m-7-5h8a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2h2'
    },
    {
      label: 'Notas',
      route: '/app/notas',
      title: 'Notas',
      icon: 'M4 19.5V6a2 2 0 0 1 2-2h8l6 6v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm10-14v5h5'
    },
    {
      label: 'Calendario',
      route: '/app/calendario',
      title: 'Calendario',
      icon: 'M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'
    },
    {
      label: 'Recordatorios',
      route: '/app/recordatorios',
      title: 'Recordatorios',
      icon: 'M12 22a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1z'
    },
    {
      label: 'Perfil',
      route: '/app/perfil',
      title: 'Perfil',
      icon: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5C20 16 16.4 14 12 14Z'
    }
  ];

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
