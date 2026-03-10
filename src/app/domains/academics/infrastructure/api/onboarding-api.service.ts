import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

export interface OnboardingCourseScheduleRequest {
  diaSemana?: number | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  tipoSesion?: string | null;
  ubicacion?: string | null;
  urlVirtual?: string | null;
}

export interface OnboardingCourseRequest {
  cursoId: number;
  seccion?: string | null;
  profesor?: string | null;
  modalidad?: string | null;
  horarios: OnboardingCourseScheduleRequest[];
}

export interface OnboardingConfidenceRequest {
  cursoId: number;
  nivelConfianza: number;
  comentario?: string | null;
}

export interface OnboardingStudySlotRequest {
  diaSemana?: number | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  prioridad?: number | null;
  tipo?: string | null;
}

export interface OnboardingRequest {
  nombre: string;
  nombrePreferido?: string | null;
  emailInstitucional?: string | null;
  campusId: number;
  periodoId: number;
  carreraId: number;
  cicloActual: number;
  metaPromedioCiclo: number;
  horasEstudioSemanaObjetivo: number;
  cursos: OnboardingCourseRequest[];
  franjasPreferidasEstudio: OnboardingStudySlotRequest[];
  confianzaPorCurso: OnboardingConfidenceRequest[];
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
