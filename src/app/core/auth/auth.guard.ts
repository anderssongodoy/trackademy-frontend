import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  return authSession.isAuthenticated().pipe(
    map((authenticated) => {
      if (authenticated) {
        return true;
      }

      return router.createUrlTree(['/auth/sign-in'], {
        queryParams: {
          redirect: state.url
        }
      });
    }),
    catchError(() =>
      of(
        router.createUrlTree(['/auth/sign-in'], {
          queryParams: {
            redirect: state.url
          }
        })
      )
    )
  );
};
