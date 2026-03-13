import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CourseMetadataUpdateRequest,
  EvaluationGradeRequest,
  MeApiService,
  MyCalendarEvent,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyScheduleEntry,
  ScheduleBlockRequest,
  ScheduleUpdateResponse
} from '../infrastructure/api/me-api.service';

@Injectable({ providedIn: 'root' })
export class MeUseCase {
  private readonly api = inject(MeApiService);

  getCurrentPeriod(): Observable<MyCurrentPeriod> {
    return this.api.getCurrentPeriod();
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
  CourseMetadataUpdateRequest,
  EvaluationGradeRequest,
  MyCalendarEvent,
  MyCourse,
  MyCurrentPeriod,
  MyDashboardSummary,
  MyEvaluation,
  MyScheduleEntry,
  ScheduleBlockRequest,
  ScheduleUpdateResponse
};
