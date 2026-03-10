import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../identity/infrastructure/config/app-environment.token';

export interface MyCurrentPeriod {
  usuarioId: number;
  usuarioPeriodoId: number;
  periodoId: number;
  campusId: number;
  carreraId: number;
  cicloActual: number;
  onboardingEstado: string;
  onboardingCompletadoAt: string;
  metaPromedioCiclo: number;
  horasEstudioSemanaObjetivo: number;
}

export interface MyCourse {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigo: string;
  nombre: string;
  estado: string;
  activo: boolean;
  seccion: string;
  profesor: string;
  modalidad: string;
}

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  getCurrentPeriod(email: string): Observable<MyCurrentPeriod> {
    return this.http.get<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual`, {
      params: { email }
    });
  }

  getMyCourses(email: string): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.env.apiBaseUrl}/api/v1/me/cursos`, {
      params: { email }
    });
  }
}
