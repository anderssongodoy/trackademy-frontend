import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';

import { APP_ENV } from '../config/app-environment.token';
import { AuthService } from './auth.service';

interface SessionResponse {
  authenticated: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  private readonly authService = inject(AuthService);

  isAuthenticated(): Observable<boolean> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap((token) => {
        if (!token) {
          return of(false);
        }
        return this.http
          .get<SessionResponse>(`${this.env.apiBaseUrl}${this.env.authSessionPath}`)
          .pipe(
            map((response) => response.authenticated === true),
            catchError(() => of(false))
          );
      })
    );
  }
}