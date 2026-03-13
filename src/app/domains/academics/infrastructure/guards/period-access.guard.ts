import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { MeUseCase } from '../../application/me-use-case';

export const periodAccessGuard: CanActivateFn = () => {
  const meUseCase = inject(MeUseCase);
  const router = inject(Router);

  return meUseCase.getCurrentPeriod().pipe(
    map((currentPeriod) => {
      const status = currentPeriod?.onboardingEstado?.toLowerCase();
      return status === 'completado' ? true : router.createUrlTree(['/onboarding']);
    }),
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return of(router.createUrlTree(['/onboarding']));
      }

      return of(router.createUrlTree(['/auth/sign-in']));
    })
  );
};
