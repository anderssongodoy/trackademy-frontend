import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_ENV } from '../../../identity/infrastructure/config/app-environment.token';

export interface WhatsappLinkCodeResponse {
  code: string;
  expiresAt: string;
  officialWhatsappNumber: string;
  instructions: string;
  prefilledMessage: string;
  deepLink: string;
}

export interface WhatsappLinkStatusResponse {
  linked: boolean;
  phoneNumberMasked: string | null;
  linkedAt: string | null;
  lastInteractionAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class WhatsappApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  generateLinkCode(): Observable<WhatsappLinkCodeResponse> {
    return this.http.post<WhatsappLinkCodeResponse>(`${this.env.apiBaseUrl}/api/v1/whatsapp/link-code`, {});
  }

  getLinkStatus(): Observable<WhatsappLinkStatusResponse> {
    return this.http.get<WhatsappLinkStatusResponse>(`${this.env.apiBaseUrl}/api/v1/whatsapp/link-status`);
  }

  unlink(): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/api/v1/whatsapp/link`);
  }
}
