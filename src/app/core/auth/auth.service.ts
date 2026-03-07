import { Injectable, inject } from '@angular/core';
import {
  AccountInfo,
  AuthenticationResult,
  PublicClientApplication
} from '@azure/msal-browser';

import { APP_ENV } from '../config/app-environment.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly env = inject(APP_ENV);
  private readonly msal = new PublicClientApplication({
    auth: {
      clientId: this.env.azureFrontendClientId,
      authority: `https://login.microsoftonline.com/${this.env.azureTenantId}`,
      redirectUri: `${window.location.origin}/auth/sign-in`
    },
    cache: {
      cacheLocation: 'localStorage'
    }
  });
  private initPromise: Promise<void> | null = null;

  private initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.msal.initialize();
    }

    return this.initPromise;
  }

  private setActiveAccount(result: AuthenticationResult | null): void {
    if (result?.account) {
      this.msal.setActiveAccount(result.account);
      return;
    }

    const account = this.msal.getActiveAccount() ?? this.msal.getAllAccounts()[0] ?? null;
    if (account) {
      this.msal.setActiveAccount(account);
    }
  }

  async completeMicrosoftLogin(): Promise<string | null> {
    await this.initialize();
    const result = await this.msal.handleRedirectPromise();
    this.setActiveAccount(result);

    if (result?.state) {
      return result.state;
    }

    return null;
  }

  async beginMicrosoftLogin(redirectPath: string): Promise<void> {
    await this.initialize();

    await this.msal.loginRedirect({
      scopes: ['openid', 'profile', 'email', this.env.azureApiScope],
      state: redirectPath
    });
  }

  private getCurrentAccount(): AccountInfo | null {
    return this.msal.getActiveAccount() ?? this.msal.getAllAccounts()[0] ?? null;
  }

  async getAccessToken(): Promise<string | null> {
    await this.initialize();
    const account = this.getCurrentAccount();

    if (!account) {
      return null;
    }

    try {
      const response = await this.msal.acquireTokenSilent({
        account,
        scopes: [this.env.azureApiScope]
      });

      return response.accessToken;
    } catch {
      return null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    await this.initialize();
    return this.getCurrentAccount() !== null;
  }
}
