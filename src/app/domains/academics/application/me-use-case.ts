import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MeApiService, MyCourse, MyCurrentPeriod } from '../infrastructure/api/me-api.service';

@Injectable({ providedIn: 'root' })
export class MeUseCase {
  private readonly api = inject(MeApiService);

  getCurrentPeriod(): Observable<MyCurrentPeriod> {
    return this.api.getCurrentPeriod();
  }

  getMyCourses(): Observable<MyCourse[]> {
    return this.api.getMyCourses();
  }
}

export type { MyCourse, MyCurrentPeriod };
