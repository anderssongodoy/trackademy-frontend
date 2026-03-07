import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { APP_ENV } from '../config/app-environment.token';

interface SessionResponse {
  authenticated: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  isAuthenticated(): Observable<boolean> {
    return this.http
      .get<SessionResponse>(`${this.env.apiBaseUrl}${this.env.authSessionPath}`, {
        withCredentials: true
      })
      .pipe(map((response) => response.authenticated === true));
  }
}
