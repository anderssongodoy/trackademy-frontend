import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { APP_ENV } from '../config/app-environment.token';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const env = inject(APP_ENV);

  if (!req.url.startsWith(env.apiBaseUrl)) {
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
