import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CatalogApiService,
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogCourseDetail,
  CatalogCourseEvaluation,
  CatalogCourseUnit,
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

  getCourses(carreraId?: number, query?: string, limit?: number, offset?: number): Observable<CatalogCourse[]> {
    return this.api.getCourses(carreraId, query, limit, offset);
  }

  getCourseByCode(codigo: string): Observable<CatalogCourse> {
    return this.api.getCourseByCode(codigo);
  }

  getCourseDetailByCode(codigo: string): Observable<CatalogCourseDetail> {
    return this.api.getCourseDetailByCode(codigo);
  }
}

export type {
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogCourseDetail,
  CatalogCourseEvaluation,
  CatalogCourseUnit,
  CatalogPeriod
};