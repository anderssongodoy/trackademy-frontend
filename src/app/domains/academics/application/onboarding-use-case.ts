import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  OnboardingApiService,
  OnboardingRequest,
  OnboardingResponse
} from '../infrastructure/api/onboarding-api.service';

@Injectable({ providedIn: 'root' })
export class OnboardingUseCase {
  private readonly api = inject(OnboardingApiService);

  submitBasicOnboarding(payload: OnboardingRequest): Observable<OnboardingResponse> {
    return this.api.submitBasicOnboarding(payload);
  }
}

export type { OnboardingRequest, OnboardingResponse };
