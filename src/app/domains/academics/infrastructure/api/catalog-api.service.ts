import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

export interface CatalogCampus {
  id: number;
  universidadId: number;
  nombre: string;
  timezone: string;
}

export interface CatalogCareer {
  id: number;
  universidadId: number;
  nombre: string;
}

export interface CatalogPeriod {
  id: number;
  universidadId: number;
  etiqueta: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface CatalogCourse {
  id: number;
  codigo: string;
  nombre: string;
  creditos: number;
  horasSemanales: number;
  modalidad: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  getCampuses(universityId = this.env.defaultUniversityId): Observable<CatalogCampus[]> {
    return this.http.get<CatalogCampus[]>(`${this.env.apiBaseUrl}/api/v1/catalog/campuses`, {
      params: { universidadId: universityId }
    });
  }

  getCareers(universityId = this.env.defaultUniversityId): Observable<CatalogCareer[]> {
    return this.http.get<CatalogCareer[]>(`${this.env.apiBaseUrl}/api/v1/catalog/carreras`, {
      params: { universidadId: universityId }
    });
  }

  getPeriods(universityId = this.env.defaultUniversityId): Observable<CatalogPeriod[]> {
    return this.http.get<CatalogPeriod[]>(`${this.env.apiBaseUrl}/api/v1/catalog/periodos`, {
      params: { universidadId: universityId }
    });
  }

  getCourses(): Observable<CatalogCourse[]> {
    return this.http.get<CatalogCourse[]>(`${this.env.apiBaseUrl}/api/v1/catalog/cursos`);
  }
}
