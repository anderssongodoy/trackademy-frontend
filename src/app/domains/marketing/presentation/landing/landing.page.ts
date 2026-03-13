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
      description: 'Convierte tus bloques de clase en una semana legible, con foco claro en lo que aún falta configurar.',
      tone: 'indigo',
      icon: 'M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'
    },
    {
      title: 'Gestión de tareas',
      description: 'Mantén a la vista laboratorios, proyectos y entregables reales sin inflar cosas que no existen.',
      tone: 'violet',
      icon: 'M9 11l2 2 4-4m-7-5h8a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2h2'
    },
    {
      title: 'Notas con contexto',
      description: 'Registra lo que ya tienes y mira tu panorama del ciclo con una lectura mucho más honesta.',
      tone: 'rose',
      icon: 'M4 19.5V6a2 2 0 0 1 2-2h8l6 6v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm10-14v5h5'
    },
    {
      title: 'Recordatorios útiles',
      description: 'Combina clases, evaluaciones y eventos del periodo en alertas realmente accionables.',
      tone: 'teal',
      icon: 'M12 22a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1z'
    },
    {
      title: 'Analítica académica',
      description: 'Dashboard, notas y calendario se cruzan para que sepas qué hacer después del onboarding.',
      tone: 'amber',
      icon: 'M4 19h16M7 16V9m5 7V5m5 11v-4'
    },
    {
      title: 'Sílabos integrados',
      description: 'Cada curso aterriza unidades, evaluaciones y estructura real en una vista usable.',
      tone: 'blue',
      icon: 'M3 6.5 12 3l9 3.5v11L12 21l-9-3.5zm9-1.4-6 2.3L12 9.8l6-2.4zm7 3.7-6 2.3v7.3l6-2.3zm-14 0v7.3l6 2.3v-7.3z'
    }
  ];

  readonly benefits: LandingBenefit[] = [
    {
      title: 'Mejor organización',
      description: 'Toda tu vida académica en un solo espacio.'
    },
    {
      title: 'Menos fricción',
      description: 'Menos pasos manuales y más foco en estudiar.'
    },
    {
      title: 'Decisiones con data',
      description: 'Lecturas claras para priorizar qué hacer hoy.'
    }
  ];

  readonly previewSteps = [
    'Configura tu periodo, campus y cursos una sola vez.',
    'Arma tu horario para que calendario y recordatorios tengan contexto real.',
    'Registra notas y entiende rápido qué te falta cerrar.'
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}
