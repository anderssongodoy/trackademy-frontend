import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { APP_ENV } from './domains/identity/infrastructure/config/app-environment.token';
import { apiErrorInterceptor } from './domains/identity/infrastructure/http/api-error.interceptor';
import { authTokenInterceptor } from './domains/identity/infrastructure/http/auth-token.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_ENV,
      useValue: environment
    },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
    provideRouter(routes)
  ]
};
