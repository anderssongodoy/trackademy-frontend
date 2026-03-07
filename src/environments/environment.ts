import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  authSessionPath: '/api/v1/auth/session',
  authMicrosoftExchangePath: '/api/v1/auth/microsoft',
  defaultUniversityId: 1,
  azureTenantId: 'common',
  azureFrontendClientId: '3036277a-1052-4e6a-a0d9-64fec65b3f5e'
};
