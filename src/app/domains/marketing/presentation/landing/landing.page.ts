import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss'
})
export class LandingPage implements OnInit {
  private readonly session = inject(SessionService);

  readonly signedIn = signal(false);

  readonly features: LandingFeature[] = [
    {
      eyebrow: 'Plan',
      title: 'Periodo y carga en orden',
      description: 'Campus, ciclo, cursos, creditos y modalidad quedan en una vista consistente para no reconstruir contexto cada semana.'
    },
    {
      eyebrow: 'Agenda',
      title: 'Clases y tareas visibles',
      description: 'Horario, calendario y tareas conviven para mostrar que toca hoy, que vence pronto y donde falta configurar datos.'
    },
    {
      eyebrow: 'Notas',
      title: 'Avance academico medible',
      description: 'Registra notas por evaluacion, ve cuanto peso ya tiene nota real y detecta cursos que necesitan atencion.'
    },
    {
      eyebrow: 'Cursos',
      title: 'Silabos sin inventar datos',
      description: 'El detalle del curso muestra sumilla, unidades, evaluaciones y PDF solo cuando existe informacion real.'
    }
  ];

  readonly workflow: WorkflowStep[] = [
    {
      index: '01',
      title: 'Configura tu periodo',
      description: 'Trackademy calcula el periodo actual por fechas y registra tu campus, carrera, ciclo y meta.'
    },
    {
      index: '02',
      title: 'Marca tus cursos',
      description: 'Filtra por ciclo, busca cursos y arma la carga con la que vas a trabajar durante el semestre.'
    },
    {
      index: '03',
      title: 'Haz seguimiento',
      description: 'Usa dashboard, notas, horario y detalle de curso para saber que viene y que falta registrar.'
    }
  ];

  readonly proofPoints = [
    'Cursos desde catalogo',
    'Horario por periodo',
    'Evaluaciones desde silabo',
    'Notas con peso real',
    'Recordatorios conectados'
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}
