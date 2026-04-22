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
      eyebrow: 'Cursos',
      title: 'Tu carga academica clara',
      description: 'Selecciona los cursos del periodo y revisa creditos, horas, modalidad y ciclo referencial sin mezclar todo.'
    },
    {
      eyebrow: 'Horario',
      title: 'Bloques visibles por dia',
      description: 'Consulta tus clases por dia y detecta que cursos aun necesitan horario configurado.'
    },
    {
      eyebrow: 'Silabos',
      title: 'Detalle real del curso',
      description: 'Accede a sumilla, unidades, evaluaciones y descarga del PDF del silabo cuando el backend lo tenga disponible.'
    },
    {
      eyebrow: 'Notas',
      title: 'Registro sin hojas sueltas',
      description: 'Guarda notas por evaluacion y ve el acumulado segun el peso registrado, sin confundir una nota con promedio final.'
    },
    {
      eyebrow: 'Dashboard',
      title: 'Resumen accionable',
      description: 'Ve proximas evaluaciones, horario del dia, avance del ciclo y cursos que requieren atencion.'
    },
    {
      eyebrow: 'Perfil',
      title: 'Contexto personal del periodo',
      description: 'Mantiene campus, periodo actual, meta de promedio y objetivos basicos para que las pantallas tengan contexto.'
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
    'Horario desde tu periodo',
    'Evaluaciones desde silabo y notas',
    'PDF de silabo solo si existe',
    'Periodo actual segun fechas'
  ];

  ngOnInit(): void {
    this.signedIn.set(this.session.isSignedIn());
  }
}
