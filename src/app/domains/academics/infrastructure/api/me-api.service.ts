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
  usuarioPeriodoEvaluacionId: number | null;
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
  fechaReal: string | null;
  nota: number | null;
  exonerado: boolean | null;
  esRezagado: boolean | null;
  observacion: string | null;
  comentarios: string | null;
}

export interface MyCalendarEvent {
  origen: string;
  tipo: string | null;
  titulo: string;
  subtitulo: string | null;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  usuarioPeriodoCursoId: number | null;
  cursoId: number | null;
  codigoCurso: string | null;
  nombreCurso: string | null;
  referenciaCodigo: string | null;
}

export interface MyDashboardSummary {
  periodoActual: MyCurrentPeriod | null;
  semanaActual: number | null;
  progresoPeriodoPct: number | null;
  cursosActivos: number;
  horariosRegistrados: number;
  evaluacionesPendientes: number;
  notasRegistradas: number;
  proximasEvaluaciones: MyEvaluation[];
  proximasSesiones: MyCalendarEvent[];
  proximosEventosPeriodo: MyCalendarEvent[];
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

export interface EvaluationGradeRequest {
  nota: number | null;
  fechaReal: string | null;
  exonerado: boolean;
  esRezagado: boolean;
  comentarios: string | null;
}

export interface CourseMetadataUpdateRequest {
  seccion: string | null;
  profesor: string | null;
}

export interface AcademicProfileUpdateRequest {
  metaPromedioCiclo: number;
  horasEstudioSemanaObjetivo: number;
}

@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  getCurrentPeriod(): Observable<MyCurrentPeriod> {
    return this.http.get<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual`);
  }

  updateAcademicProfile(payload: AcademicProfileUpdateRequest): Observable<MyCurrentPeriod> {
    return this.http.put<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual`, payload);
  }

  getDashboard(): Observable<MyDashboardSummary> {
    return this.http.get<MyDashboardSummary>(`${this.env.apiBaseUrl}/api/v1/me/dashboard`);
  }

  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.env.apiBaseUrl}/api/v1/me/cursos`);
  }

  getMySchedule(): Observable<MyScheduleEntry[]> {
    return this.http.get<MyScheduleEntry[]>(`${this.env.apiBaseUrl}/api/v1/me/horarios`);
  }

  getMyCalendar(from?: string, to?: string): Observable<MyCalendarEvent[]> {
    if (from && to) {
      return this.http.get<MyCalendarEvent[]>(`${this.env.apiBaseUrl}/api/v1/me/calendario`, {
        params: { from, to }
      });
    }

    return this.http.get<MyCalendarEvent[]>(`${this.env.apiBaseUrl}/api/v1/me/calendario`);
  }

  updateCourseSchedule(usuarioPeriodoCursoId: number, bloques: ScheduleBlockRequest[]): Observable<ScheduleUpdateResponse> {
    return this.http.put<ScheduleUpdateResponse>(
      `${this.env.apiBaseUrl}/api/v1/me/cursos/${usuarioPeriodoCursoId}/horarios`,
      { bloques }
    );
  }

  updateCourseMetadata(usuarioPeriodoCursoId: number, payload: CourseMetadataUpdateRequest): Observable<MyCourse> {
    return this.http.put<MyCourse>(
      `${this.env.apiBaseUrl}/api/v1/me/cursos/${usuarioPeriodoCursoId}`,
      payload
    );
  }

  saveEvaluationGrade(usuarioPeriodoCursoId: number, evaluacionCodigo: string, payload: EvaluationGradeRequest): Observable<MyEvaluation> {
    return this.http.put<MyEvaluation>(
      `${this.env.apiBaseUrl}/api/v1/me/cursos/${usuarioPeriodoCursoId}/evaluaciones/${evaluacionCodigo}/nota`,
      payload
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
