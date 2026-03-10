import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CatalogApiService,
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogPeriod
} from '../infrastructure/api/catalog-api.service';

@Injectable({ providedIn: 'root' })
export class CatalogUseCase {
  private readonly api = inject(CatalogApiService);

  getCampuses(universityId?: number): Observable<CatalogCampus[]> {
    return this.api.getCampuses(universityId);
  }

  getCareers(universityId?: number): Observable<CatalogCareer[]> {
    return this.api.getCareers(universityId);
  }

  getPeriods(universityId?: number): Observable<CatalogPeriod[]> {
    return this.api.getPeriods(universityId);
  }

  getCourses(): Observable<CatalogCourse[]> {
    return this.api.getCourses();
  }
}

export type { CatalogCampus, CatalogCareer, CatalogCourse, CatalogPeriod };
