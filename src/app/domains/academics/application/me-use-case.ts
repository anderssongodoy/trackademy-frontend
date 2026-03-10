import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MeApiService, MyCourse, MyCurrentPeriod } from '../infrastructure/api/me-api.service';

@Injectable({ providedIn: 'root' })
export class MeUseCase {
  private readonly api = inject(MeApiService);

  getCurrentPeriod(email: string): Observable<MyCurrentPeriod> {
    return this.api.getCurrentPeriod(email);
  }

  getMyCourses(email: string): Observable<MyCourse[]> {
    return this.api.getMyCourses(email);
  }
}

export type { MyCourse, MyCurrentPeriod };
