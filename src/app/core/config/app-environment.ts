export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  authSessionPath: string;
  authMicrosoftExchangePath: string;
  defaultUniversityId: number;
  azureTenantId: string;
  azureFrontendClientId: string;
}
