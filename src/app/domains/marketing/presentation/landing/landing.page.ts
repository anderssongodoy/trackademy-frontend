import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SessionService } from '../../../../shared/session/session.service';

interface LandingFeature {
  title: string;
  description: string;
  eyebrow: string;
}

interface WorkflowStep {
  index: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss'
})
export class LandingPage implements OnInit {
  private readonly session = inject(SessionService);

  readonly signedIn = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly features: LandingFeature[] = [
    {
      eyebrow: 'Operacion',
      title: 'Dashboard que empieza por lo urgente',
      description: 'Primero ves clases de hoy, evaluaciones cercanas, tareas abiertas y cursos con riesgo. Lo decorativo queda fuera.'
    },
    {
      eyebrow: 'Cursos',
      title: 'Cada curso conserva su contexto',
      description: 'Horario, silabo, evaluaciones, notas y PDF viven juntos para no saltar entre capturas, hojas y chats.'
    },
    {
      eyebrow: 'Seguimiento',
      title: 'Notas con peso real',
      description: 'El avance se calcula con evaluaciones registradas y peso acumulado, no con promedios inventados.'
    },
    {
      eyebrow: 'Rutina',
      title: 'Tareas y calendario en una misma agenda',
      description: 'Las tareas manuales, recordatorios y bloques de clase se ordenan alrededor de lo que toca resolver.'
    }
  ];

  readonly workflow: WorkflowStep[] = [
    {
      index: '01',
      title: 'Define el periodo',
      description: 'Seleccionas campus, carrera, ciclo, meta y cursos para que el sistema entienda tu contexto academico.'
    },
    {
      index: '02',
      title: 'Organiza la carga',
      description: 'Ajustas horarios, revisas silabos y dejas cada curso listo para operar durante la semana.'
    },
    {
      index: '03',
      title: 'Trabaja con prioridad',
      description: 'El dashboard, las tareas y las notas te dicen donde actuar antes de que el ciclo se desordene.'
    }
  ];

  readonly proofPoints = [
    'Cursos',
    'Horario',
    'Silabos',
    'Notas',
    'Tareas',
    'Calendario',
    'Recordatorios'
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}
