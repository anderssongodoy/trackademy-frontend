import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { APP_ENV } from './domains/identity/infrastructure/config/app-environment.token';
import { RuntimeConfigService } from './domains/identity/infrastructure/config/runtime-config.service';
import { apiErrorInterceptor } from './domains/identity/infrastructure/http/api-error.interceptor';
import { authTokenInterceptor } from './domains/identity/infrastructure/http/auth-token.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [RuntimeConfigService],
      useFactory: (cfg: RuntimeConfigService) => () => cfg.load()
    },
    {
      provide: APP_ENV,
      useFactory: (cfg: RuntimeConfigService) => cfg.apply(environment),
      deps: [RuntimeConfigService]
    },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
    provideRouter(routes)
  ]
};
