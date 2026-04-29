import { AppEnvironment } from '../app/domains/identity/infrastructure/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '',
  authSessionPath: '/api/v1/auth/session',
  authMicrosoftExchangePath: '/api/v1/auth/microsoft',
  authGoogleExchangePath: '/api/v1/auth/google',
  authGoogleOAuthUrlPath: '/api/v1/auth/google/oauth-url',
  defaultUniversityId: 1,
  azureTenantId: 'consumers',
  azureFrontendClientId: '3036277a-1052-4e6a-a0d9-64fec65b3f5e',
  googleClientId: '496878262671-c2s5gs872s9u1acnbfc1c8ac6j9c1un3.apps.googleusercontent.com'
};
