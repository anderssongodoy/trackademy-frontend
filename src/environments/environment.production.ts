import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '',
  authSessionPath: '/api/v1/auth/session',
  authMicrosoftExchangePath: '/api/v1/auth/microsoft',
  authGoogleExchangePath: '/api/v1/auth/google',
  defaultUniversityId: 1,
  azureTenantId: '',
  azureFrontendClientId: '',
  googleClientId: ''
};
