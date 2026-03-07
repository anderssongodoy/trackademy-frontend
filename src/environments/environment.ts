import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  microsoftAuthPath: '/oauth2/authorization/microsoft',
  authSessionPath: '/api/v1/auth/session',
  defaultUniversityId: 1
};
