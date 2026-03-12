import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface CatalogCourseUnit {
  nro: number;
  titulo: string;
  semanaInicio: number | null;
  semanaFin: number | null;
  logroEspecifico: string | null;
  temario: string[];
}

export interface CatalogCourseEvaluation {
  codigo: string;
  tipo: string | null;
  descripcion: string | null;
  porcentaje: number | null;
  semana: number | null;
  observacion: string | null;
}

export interface CatalogCourseDetail {
  curso: CatalogCourse;
  version: string | null;
  anio: number | null;
  periodoTexto: string | null;
  sumilla: string | null;
  fundamentacion: string | null;
  metodologia: string | null;
  logroGeneral: string | null;
  unidades: CatalogCourseUnit[];
  evaluaciones: CatalogCourseEvaluation[];
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

  getCourses(carreraId?: number, query?: string, limit?: number, offset?: number): Observable<CatalogCourse[]> {
    let params = new HttpParams();
    if (carreraId) {
      params = params.set('carreraId', carreraId.toString());
    }
    if (query) {
      params = params.set('q', query);
    }
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (offset != null) {
      params = params.set('offset', offset.toString());
    }

    return this.http.get<CatalogCourse[]>(`${this.env.apiBaseUrl}/api/v1/catalog/cursos`, { params });
  }

  getCourseByCode(codigo: string): Observable<CatalogCourse> {
    return this.http.get<CatalogCourse>(`${this.env.apiBaseUrl}/api/v1/catalog/cursos/${codigo}`);
  }

  getCourseDetailByCode(codigo: string): Observable<CatalogCourseDetail> {
    return this.http.get<CatalogCourseDetail>(`${this.env.apiBaseUrl}/api/v1/catalog/cursos/${codigo}/detalle`);
  }
}