import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

export interface OnboardingCourseScheduleRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
  ubicacion: string;
  urlVirtual: string;
}

export interface OnboardingCourseRequest {
  cursoId: number;
  seccion: string;
  profesor: string;
  modalidad: string;
  horarios: OnboardingCourseScheduleRequest[];
}

export interface OnboardingRequest {
  email: string;
  nombre: string;
  campusId: number;
  periodoId: number;
  carreraId: number;
  cicloActual: number;
  metaPromedioCiclo: number;
  horasEstudioSemanaObjetivo: number;
  cursos: OnboardingCourseRequest[];
  franjasPreferidasEstudio: [];
  confianzaPorCurso: [];
}

export interface OnboardingResponse {
  usuarioId: number;
  usuarioPeriodoId: number;
  cursosRegistrados: number;
  horariosRegistrados: number;
  franjasRegistradas: number;
  confianzasRegistradas: number;
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  submitBasicOnboarding(payload: OnboardingRequest): Observable<OnboardingResponse> {
    return this.http.post<OnboardingResponse>(`${this.env.apiBaseUrl}/api/v1/onboarding/basic`, payload);
  }
}
