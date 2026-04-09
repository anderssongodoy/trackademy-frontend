import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  WhatsappApiService,
  WhatsappLinkCodeResponse,
  WhatsappLinkStatusResponse
} from '../infrastructure/api/whatsapp-api.service';

@Injectable({ providedIn: 'root' })
export class WhatsappUseCase {
  private readonly api = inject(WhatsappApiService);

  generateLinkCode(): Observable<WhatsappLinkCodeResponse> {
    return this.api.generateLinkCode();
  }

  getLinkStatus(): Observable<WhatsappLinkStatusResponse> {
    return this.api.getLinkStatus();
  }

  unlink(): Observable<void> {
    return this.api.unlink();
  }
}

export type { WhatsappLinkCodeResponse, WhatsappLinkStatusResponse };
