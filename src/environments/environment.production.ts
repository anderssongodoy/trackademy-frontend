import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080',
  microsoftAuthPath: '/oauth2/authorization/microsoft',
  defaultUniversityId: 1
};
