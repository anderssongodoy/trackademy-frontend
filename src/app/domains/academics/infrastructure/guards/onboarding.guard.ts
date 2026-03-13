import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { MeUseCase } from '../../application/me-use-case';

export const onboardingGuard: CanActivateFn = () => {
  const meUseCase = inject(MeUseCase);
  const router = inject(Router);

  return meUseCase.getCurrentPeriod().pipe(
    map((currentPeriod) => {
      const isCompleted = currentPeriod?.onboardingEstado?.toLowerCase() === 'completado';
      return isCompleted ? router.createUrlTree(['/app/dashboard']) : true;
    }),
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return of(true);
      }

      return of(router.createUrlTree(['/app/dashboard']));
    })
  );
};
