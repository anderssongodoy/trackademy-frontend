import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  MeApiService,
  MyCourse,
  MyCurrentPeriod,
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

  getMyCourses(): Observable<MyCourse[]> {
    return this.api.getMyCourses();
  }

  getMySchedule(): Observable<MyScheduleEntry[]> {
    return this.api.getMySchedule();
  }

  updateCourseSchedule(usuarioPeriodoCursoId: number, bloques: ScheduleBlockRequest[]): Observable<ScheduleUpdateResponse> {
    return this.api.updateCourseSchedule(usuarioPeriodoCursoId, bloques);
  }

  getMyEvaluations(cursoId?: number): Observable<MyEvaluation[]> {
    return this.api.getMyEvaluations(cursoId);
  }
}

export type { MyCourse, MyCurrentPeriod, MyScheduleEntry, MyEvaluation, ScheduleBlockRequest, ScheduleUpdateResponse };
