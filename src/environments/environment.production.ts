import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080',
  authSessionPath: '/api/v1/auth/session',
  defaultUniversityId: 1,
  azureTenantId: 'organizations',
  azureFrontendClientId: '3036277a-1052-4e6a-a0d9-64fec65b3f5e',
  azureApiScope: 'api://c0bbadc0-8e9c-4ed7-9ff4-6af99f23c209/access_as_user'
};
