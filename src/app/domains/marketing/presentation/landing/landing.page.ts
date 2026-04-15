import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SessionService } from '../../../../shared/session/session.service';

interface LandingFeature {
  title: string;
  description: string;
  eyebrow: string;
}

interface LandingBenefit {
  title: string;
  description: string;
}

interface LandingArchitectureCard {
  title: string;
  description: string;
  metric: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss'
})
export class LandingPage implements OnInit {
  private readonly session = inject(SessionService);

  readonly signedIn = signal(false);

  readonly features: LandingFeature[] = [
    {
      eyebrow: 'Control contextual',
      title: 'Centraliza tu operación académica',
      description: 'Convierte cursos, horario, notas y recordatorios en una sola lectura operativa del ciclo.'
    },
    {
      eyebrow: 'Seguimiento honesto',
      title: 'Toma mejores decisiones',
      description: 'Registra solo lo que ya existe y entiende qué ajustar antes de que el periodo te arrastre.'
    },
    {
      eyebrow: 'Integración real',
      title: 'MVP de ingeniería integrada',
      description: 'El producto une onboarding, estructura de cursos y dashboards sin duplicar pasos ni contexto.'
    }
  ];

  readonly benefits: LandingBenefit[] = [
    {
      title: 'Dominio del ciclo',
      description: 'Todo el periodo en un solo sistema de lectura.'
    },
    {
      title: 'Configuración útil',
      description: 'Onboarding, cursos y horario listos desde el inicio.'
    },
    {
      title: 'Contexto accionable',
      description: 'Notas, tareas y calendario conectados.'
    }
  ];

  readonly architectureCards: LandingArchitectureCard[] = [
    {
      title: 'Cursos',
      description: 'Cada curso aterriza sílabo, estructura y evaluaciones sin perder el contexto del periodo.',
      metric: '8 módulos'
    },
    {
      title: 'Tareas',
      description: 'Entregables, laboratorios y pendientes priorizados para que sepas qué cerrar primero.',
      metric: 'Prioridad viva'
    },
    {
      title: 'Notas',
      description: 'Un registro rápido y una lectura honesta del rendimiento actual, sin inventar analítica vacía.',
      metric: '17.8 objetivo'
    }
  ];

  readonly previewColumns = [
    {
      label: 'Curso',
      values: ['Arquitectura de Software', 'Base de Datos II', 'Seminario de Tesis I']
    },
    {
      label: 'Estado',
      values: ['En curso', 'Pendiente crítica', 'Documentación']
    },
    {
      label: 'Ritmo',
      values: ['85%', '72%', '61%']
    }
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}
