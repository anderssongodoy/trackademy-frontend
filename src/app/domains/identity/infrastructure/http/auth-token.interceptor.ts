import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { APP_ENV } from '../config/app-environment.token';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const env = inject(APP_ENV);
  const apiBaseUrl = env.apiBaseUrl?.trim() ?? '';
  const isApiRequest = apiBaseUrl.length > 0
    ? req.url.startsWith(apiBaseUrl)
    : req.url.startsWith('/api/');

  if (!isApiRequest) {
    return next(req);
  }

  return from(authService.getAccessToken()).pipe(
    mergeMap((token) => {
      if (!token) {
        return next(req);
      }

      return next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    })
  );
};
