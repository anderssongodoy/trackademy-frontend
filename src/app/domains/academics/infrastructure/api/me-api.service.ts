import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

export interface MyCurrentPeriod {
  usuarioId: number;
  nombre: string | null;
  nombrePreferido: string | null;
  emailInstitucional: string | null;
  usuarioPeriodoId: number;
  periodoId: number;
  campusId: number;
  campusNombre: string | null;
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

export interface MyCalendarSyncAccount {
  provider: string;
  conectado: boolean;
  email: string | null;
  calendarId: string | null;
  syncDirection: string | null;
  estado: string | null;
  lastSyncAt: string | null;
}

export interface CalendarSyncExecutionResponse {
  provider: string;
  connected: boolean;
  accountEmail: string | null;
  calendarId: string | null;
  from: string;
  to: string;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  failed: number;
}

export interface CalendarDisconnectResponse {
  provider: string;
  disconnected: boolean;
  removedMappings: number;
}

export interface MyTask {
  id: number;
  usuarioPeriodoId: number;
  usuarioPeriodoCursoId: number | null;
  cursoId: number | null;
  codigoCurso: string | null;
  nombreCurso: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: string | null;
  prioridad: string | null;
  estado: string | null;
  fechaVencimiento: string | null;
  fechaRecordatorio: string | null;
  canalRecordatorio: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyReminder {
  id: number;
  tareaId: number | null;
  usuarioPeriodoCursoId: number | null;
  cursoId: number | null;
  codigoCurso: string | null;
  nombreCurso: string | null;
  titulo: string;
  descripcion: string | null;
  fechaEnvio: string | null;
  canal: string | null;
  estado: string | null;
  origen: string | null;
}

export interface TaskUpsertRequest {
  usuarioPeriodoCursoId: number | null;
  titulo: string;
  descripcion: string | null;
  tipo: string | null;
  prioridad: string | null;
  estado: string | null;
  fechaVencimiento: string | null;
  fechaRecordatorio: string | null;
  canalRecordatorio: string | null;
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
  campusId: number | null;
  campusNombre: string | null;
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

export interface MyEvaluationsResponse {
  promedioAcumulado: number;
  porcentajeEvaluado: number;
  evaluacionesRegistradas: number;
  evaluacionesPendientes: number;
  evaluaciones: MyEvaluation[];
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

export interface PersonalProfileUpdateRequest {
  nombre: string;
  nombrePreferido: string | null;
  emailInstitucional: string | null;
}

export interface PeriodConfigurationUpdateRequest {
  campusId: number;
  carreraId: number;
  cicloActual: number;
  cursoIds: number[];
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

  updatePersonalProfile(payload: PersonalProfileUpdateRequest): Observable<MyCurrentPeriod> {
    return this.http.put<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual/personal`, payload);
  }

  updatePeriodConfiguration(payload: PeriodConfigurationUpdateRequest): Observable<MyCurrentPeriod> {
    return this.http.put<MyCurrentPeriod>(`${this.env.apiBaseUrl}/api/v1/me/periodo-actual/configuracion`, payload);
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

  getCalendarSyncAccounts(): Observable<MyCalendarSyncAccount[]> {
    return this.http.get<MyCalendarSyncAccount[]>(`${this.env.apiBaseUrl}/api/v1/me/calendar-sync-accounts`);
  }

  getMyTasks(): Observable<MyTask[]> {
    return this.http.get<MyTask[]>(`${this.env.apiBaseUrl}/api/v1/me/tareas`);
  }

  createTask(payload: TaskUpsertRequest): Observable<MyTask> {
    return this.http.post<MyTask>(`${this.env.apiBaseUrl}/api/v1/me/tareas`, payload);
  }

  updateTask(taskId: number, payload: TaskUpsertRequest): Observable<MyTask> {
    return this.http.put<MyTask>(`${this.env.apiBaseUrl}/api/v1/me/tareas/${taskId}`, payload);
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/api/v1/me/tareas/${taskId}`);
  }

  getMyReminders(from?: string, to?: string): Observable<MyReminder[]> {
    if (from && to) {
      return this.http.get<MyReminder[]>(`${this.env.apiBaseUrl}/api/v1/me/recordatorios`, {
        params: { from, to }
      });
    }

    return this.http.get<MyReminder[]>(`${this.env.apiBaseUrl}/api/v1/me/recordatorios`);
  }

  syncGoogleCalendar(from?: string, to?: string): Observable<CalendarSyncExecutionResponse> {
    if (from && to) {
      return this.http.post<CalendarSyncExecutionResponse>(
        `${this.env.apiBaseUrl}/api/v1/me/calendar-sync/google/sync`,
        null,
        { params: { from, to } }
      );
    }

    return this.http.post<CalendarSyncExecutionResponse>(`${this.env.apiBaseUrl}/api/v1/me/calendar-sync/google/sync`, null);
  }

  disconnectGoogleCalendar(): Observable<CalendarDisconnectResponse> {
    return this.http.delete<CalendarDisconnectResponse>(`${this.env.apiBaseUrl}/api/v1/me/calendar-sync/google`);
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
    return this.getMyEvaluationsSummary(cursoId).pipe(
      map((response) => response.evaluaciones)
    );
  }

  getMyEvaluationsSummary(cursoId?: number): Observable<MyEvaluationsResponse> {
    if (cursoId) {
      return this.http.get<MyEvaluationsResponse>(`${this.env.apiBaseUrl}/api/v1/me/evaluaciones`, {
        params: { cursoId: cursoId.toString() }
      });
    }

    return this.http.get<MyEvaluationsResponse>(`${this.env.apiBaseUrl}/api/v1/me/evaluaciones`);
  }
}
