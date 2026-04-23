export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  authSessionPath: string;
  authMicrosoftExchangePath: string;
  authGoogleExchangePath: string;
  authGoogleOAuthUrlPath: string;
  defaultUniversityId: number;
  azureTenantId: string;
  azureFrontendClientId: string;
  googleClientId: string;
}
