export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  authSessionPath: string;
  defaultUniversityId: number;
  azureTenantId: string;
  azureFrontendClientId: string;
  azureApiScope: string;
}
