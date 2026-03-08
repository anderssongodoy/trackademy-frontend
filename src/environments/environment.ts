import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '',
  authSessionPath: '/api/v1/auth/session',
  authMicrosoftExchangePath: '/api/v1/auth/microsoft',
  authGoogleExchangePath: '/api/v1/auth/google',
  defaultUniversityId: 1,
  azureTenantId: 'consumers',
  azureFrontendClientId: '3036277a-1052-4e6a-a0d9-64fec65b3f5e',
  googleClientId: '496878262671-jogi085juorc5035r4sca3q460movofo.apps.googleusercontent.com'
};
