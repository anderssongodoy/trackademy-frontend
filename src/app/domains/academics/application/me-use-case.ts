import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AcademicProfileUpdateRequest,
  CourseMetadataUpdateRequest,
  EvaluationGradeRequest,
  MeApiService,
  MyCalendarEvent,
  MyCalendarSyncAccount,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyScheduleEntry,
  PersonalProfileUpdateRequest,
  PeriodConfigurationUpdateRequest,
  ScheduleBlockRequest,
  ScheduleUpdateResponse
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
}

export type {
  AcademicProfileUpdateRequest,
  CourseMetadataUpdateRequest,
  EvaluationGradeRequest,
  MyCalendarEvent,
  MyCalendarSyncAccount,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyScheduleEntry,
  PersonalProfileUpdateRequest,
  PeriodConfigurationUpdateRequest,
  ScheduleBlockRequest,
  ScheduleUpdateResponse
};
