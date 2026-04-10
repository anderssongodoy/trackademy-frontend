import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ApiErrorResponse {
  code?: string;
  message?: string;
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      return throwError(() => error);
    })
  );
};

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const responseError = error.error;
  if (typeof responseError === 'string' && responseError.trim()) {
    return responseError.trim();
  }

  if (isApiErrorResponse(responseError) && responseError.message?.trim()) {
    return responseError.message.trim();
  }

  return fallback;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null;
}
