import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SessionService } from '../../../../shared/session/session.service';

interface LandingFeature {
  title: string;
  description: string;
  tone: string;
  icon: string;
}

interface LandingBenefit {
  title: string;
  description: string;
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
      title: 'Horario inteligente',
      description: 'Visualiza y sincroniza tu horario con Outlook sin perder clases ni entregas clave.',
      tone: 'indigo',
      icon: '??'
    },
    {
      title: 'Gestión de tareas',
      description: 'Organiza entregas con prioridad, recordatorios y estados claros de avance.',
      tone: 'violet',
      icon: '?'
    },
    {
      title: 'Calculadora de notas',
      description: 'Calcula tu promedio actual y proyecta tu nota final en tiempo real.',
      tone: 'rose',
      icon: '??'
    },
    {
      title: 'Recordatorios',
      description: 'Alertas personalizadas para exámenes, entregas y fechas institucionales.',
      tone: 'teal',
      icon: '??'
    },
    {
      title: 'Analítica académica',
      description: 'Rendimiento, tendencias y carga académica para mejores decisiones.',
      tone: 'amber',
      icon: '??'
    },
    {
      title: 'Sílabos integrados',
      description: 'Información completa del curso y cronograma en un solo lugar.',
      tone: 'blue',
      icon: '??'
    }
  ];

  readonly benefits: LandingBenefit[] = [
    {
      title: 'Mejor organización',
      description: 'Toda tu vida académica en un solo espacio.'
    },
    {
      title: 'Ahorra tiempo',
      description: 'Menos pasos manuales y más foco en estudiar.'
    },
    {
      title: 'Decisiones con data',
      description: 'Insights claros para mejorar tu rendimiento.'
    }
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}

