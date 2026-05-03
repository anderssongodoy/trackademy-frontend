import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';
import { CreateFeedbackReportRequest, FeedbackReport } from '../../domain/feedback-report.model';

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly http = inject(HttpClient);
  private readonly appEnv = inject(APP_ENV);

  crearReporte(request: CreateFeedbackReportRequest): Observable<FeedbackReport> {
    const url = `${this.appEnv.apiBaseUrl}/api/v1/feedback/reportes`;
    return this.http.post<FeedbackReport>(url, request);
  }
}
