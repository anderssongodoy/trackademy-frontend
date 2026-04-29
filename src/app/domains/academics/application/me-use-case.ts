import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AcademicProfileUpdateRequest,
  CourseMetadataUpdateRequest,
  CalendarDisconnectResponse,
  CalendarSyncExecutionResponse,
  EvaluationGradeRequest,
  MeApiService,
  MyCalendarEvent,
  MyCalendarSyncAccount,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyEvaluationsResponse,
  MyReminder,
  MyScheduleEntry,
  MyTask,
  PersonalProfileUpdateRequest,
  PeriodConfigurationUpdateRequest,
  ScheduleBlockRequest,
  ScheduleUpdateResponse,
  TaskUpsertRequest
} from '../infrastructure/api/me-api.service';

@Injectable({ providedIn: 'root' })
export class MeUseCase {
  private readonly api = inject(MeApiService);

  getCurrentPeriod(): Observable<MyCurrentPeriod> {
    return this.api.getCurrentPeriod();
  }

  updateAcademicProfile(payload: AcademicProfileUpdateRequest): Observable<MyCurrentPeriod> {
    return this.api.updateAcademicProfile(payload);
  }

  updatePersonalProfile(payload: PersonalProfileUpdateRequest): Observable<MyCurrentPeriod> {
    return this.api.updatePersonalProfile(payload);
  }

  updatePeriodConfiguration(payload: PeriodConfigurationUpdateRequest): Observable<MyCurrentPeriod> {
    return this.api.updatePeriodConfiguration(payload);
  }

  getDashboard(): Observable<MyDashboardSummary> {
    return this.api.getDashboard();
  }

  getMyCourses(): Observable<MyCourse[]> {
    return this.api.getMyCourses();
  }

  getMySchedule(): Observable<MyScheduleEntry[]> {
    return this.api.getMySchedule();
  }

  getMyCalendar(from?: string, to?: string): Observable<MyCalendarEvent[]> {
    return this.api.getMyCalendar(from, to);
  }

  getCalendarSyncAccounts(): Observable<MyCalendarSyncAccount[]> {
    return this.api.getCalendarSyncAccounts();
  }

  getMyTasks(): Observable<MyTask[]> {
    return this.api.getMyTasks();
  }

  createTask(payload: TaskUpsertRequest): Observable<MyTask> {
    return this.api.createTask(payload);
  }

  updateTask(taskId: number, payload: TaskUpsertRequest): Observable<MyTask> {
    return this.api.updateTask(taskId, payload);
  }

  deleteTask(taskId: number): Observable<void> {
    return this.api.deleteTask(taskId);
  }

  getMyReminders(from?: string, to?: string): Observable<MyReminder[]> {
    return this.api.getMyReminders(from, to);
  }

  syncGoogleCalendar(from?: string, to?: string): Observable<CalendarSyncExecutionResponse> {
    return this.api.syncGoogleCalendar(from, to);
  }

  disconnectGoogleCalendar(): Observable<CalendarDisconnectResponse> {
    return this.api.disconnectGoogleCalendar();
  }

  updateCourseSchedule(usuarioPeriodoCursoId: number, bloques: ScheduleBlockRequest[]): Observable<ScheduleUpdateResponse> {
    return this.api.updateCourseSchedule(usuarioPeriodoCursoId, bloques);
  }

  updateCourseMetadata(usuarioPeriodoCursoId: number, payload: CourseMetadataUpdateRequest): Observable<MyCourse> {
    return this.api.updateCourseMetadata(usuarioPeriodoCursoId, payload);
  }

  saveEvaluationGrade(usuarioPeriodoCursoId: number, evaluacionCodigo: string, payload: EvaluationGradeRequest): Observable<MyEvaluation> {
    return this.api.saveEvaluationGrade(usuarioPeriodoCursoId, evaluacionCodigo, payload);
  }

  getMyEvaluations(cursoId?: number): Observable<MyEvaluation[]> {
    return this.api.getMyEvaluations(cursoId);
  }

  getMyEvaluationsSummary(cursoId?: number): Observable<MyEvaluationsResponse> {
    return this.api.getMyEvaluationsSummary(cursoId);
  }
}

export type {
  AcademicProfileUpdateRequest,
  CourseMetadataUpdateRequest,
  CalendarDisconnectResponse,
  CalendarSyncExecutionResponse,
  EvaluationGradeRequest,
  MyCalendarEvent,
  MyCalendarSyncAccount,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyEvaluationsResponse,
  MyReminder,
  MyScheduleEntry,
  MyTask,
  PersonalProfileUpdateRequest,
  PeriodConfigurationUpdateRequest,
  ScheduleBlockRequest,
  ScheduleUpdateResponse,
  TaskUpsertRequest
};
