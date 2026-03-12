import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

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
  periodoEtiqueta: string | null;
  periodoFechaInicio: string | null;
  periodoFechaFin: string | null;
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

export interface MyScheduleEntry {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigo: string;
  nombre: string;
  modalidad: string;
  bloqueNro: number;
  diaSemana: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  duracionMin: number | null;
  tipoSesion: string | null;
  ubicacion: string | null;
  urlVirtual: string | null;
}

export interface MyEvaluation {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  evaluacionCodigo: string;
  tipo: string | null;
  descripcion: string | null;
  porcentaje: number | null;
  semana: number | null;
  fechaEstimada: string | null;
  observacion: string | null;
}

export interface ScheduleBlockRequest {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  duracionMin: number;
  tipoSesion: string | null;
  ubicacion: string | null;
  urlVirtual: string | null;
}

export interface ScheduleUpdateResponse {
  usuarioPeriodoCursoId: number;
  bloquesRegistrados: number;
}

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  getCurrentPeriod(): Observable<MyCurrentPeriod> {
    return this.http.get<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual`);
  }

  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.env.apiBaseUrl}/api/v1/me/cursos`);
  }

  getMySchedule(): Observable<MyScheduleEntry[]> {
    return this.http.get<MyScheduleEntry[]>(`${this.env.apiBaseUrl}/api/v1/me/horarios`);
  }

  updateCourseSchedule(usuarioPeriodoCursoId: number, bloques: ScheduleBlockRequest[]): Observable<ScheduleUpdateResponse> {
    return this.http.put<ScheduleUpdateResponse>(
      `${this.env.apiBaseUrl}/api/v1/me/cursos/${usuarioPeriodoCursoId}/horarios`,
      { bloques }
    );
  }

  getMyEvaluations(cursoId?: number): Observable<MyEvaluation[]> {
    if (cursoId) {
      return this.http.get<MyEvaluation[]>(`${this.env.apiBaseUrl}/api/v1/me/evaluaciones`, {
        params: { cursoId: cursoId.toString() }
      });
    }

    return this.http.get<MyEvaluation[]>(`${this.env.apiBaseUrl}/api/v1/me/evaluaciones`);
  }
}
