import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  MeApiService,
  MyCourse,
  MyCurrentPeriod,
  MyEvaluation,
  MyScheduleEntry
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

  getMyEvaluations(cursoId?: number): Observable<MyEvaluation[]> {
    return this.api.getMyEvaluations(cursoId);
  }
}

export type { MyCourse, MyCurrentPeriod, MyScheduleEntry, MyEvaluation };
