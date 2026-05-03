import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { FeedbackApiService } from '../infrastructure/api/feedback-api.service';
import { CreateFeedbackReportRequest, FeedbackReport } from '../domain/feedback-report.model';

@Injectable({ providedIn: 'root' })
export class FeedbackUseCase {
  private readonly api = inject(FeedbackApiService);

  crearReporte(request: CreateFeedbackReportRequest): Observable<FeedbackReport> {
    return this.api.crearReporte(request);
  }
}
