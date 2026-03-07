import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, inject } from '@angular/core';

import { APP_ENV } from '../config/app-environment.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly env = inject(APP_ENV);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  beginMicrosoftLogin(): void {
    const loginUrl = `${this.env.apiBaseUrl}${this.env.microsoftAuthPath}`;
    this.document.location.href = loginUrl;
  }
}
