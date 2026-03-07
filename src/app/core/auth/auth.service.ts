import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AccountInfo,
  AuthenticationResult,
  PublicClientApplication
} from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';

import { APP_ENV } from '../config/app-environment.token';
import { GoogleApi, GoogleCredentialResponse } from './google-identity.types';

interface MicrosoftExchangeResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  email: string;
  name: string;
}

interface GoogleExchangeResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  email: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly APP_TOKEN_KEY = 'trackademy.appToken';

  private readonly env = inject(APP_ENV);
  private readonly http = inject(HttpClient);
  private readonly msal = new PublicClientApplication({
    auth: {
      clientId: this.env.azureFrontendClientId,
      authority: `https://login.microsoftonline.com/${this.env.azureTenantId}`,
      redirectUri: `${window.location.origin}/auth/callback`
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

  private storeAppToken(token: string): void {
    localStorage.setItem(AuthService.APP_TOKEN_KEY, token);
  }

  private getStoredAppToken(): string | null {
    return localStorage.getItem(AuthService.APP_TOKEN_KEY);
  }

  private getGoogleApi(): GoogleApi | null {
    const w = window as Window & { google?: GoogleApi };
    return w.google ?? null;
  }

  private async exchangeMicrosoftIdentity(idToken: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<MicrosoftExchangeResponse>(
        `${this.env.apiBaseUrl}${this.env.authMicrosoftExchangePath}`,
        {
          idToken
        }
      )
    );

    this.storeAppToken(response.token);
  }

  private async exchangeGoogleIdentity(idToken: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<GoogleExchangeResponse>(
        `${this.env.apiBaseUrl}${this.env.authGoogleExchangePath}`,
        {
          idToken
        }
      )
    );

    this.storeAppToken(response.token);
  }

  async completeMicrosoftLogin(): Promise<string | null> {
    await this.initialize();
    const result = await this.msal.handleRedirectPromise();
    this.setActiveAccount(result);

    if (result?.idToken) {
      await this.exchangeMicrosoftIdentity(result.idToken);
    }

    if (result?.state) {
      return result.state;
    }

    return null;
  }

  async beginMicrosoftLogin(redirectPath: string): Promise<void> {
    await this.initialize();

    await this.msal.loginRedirect({
      scopes: ['openid', 'profile', 'email'],
      state: redirectPath
    });
  }

  async setupGoogleSignIn(containerId: string, redirectPath: string): Promise<boolean> {
    if (!this.env.googleClientId || this.env.googleClientId.trim().length === 0) {
      return false;
    }

    const google = this.getGoogleApi();
    if (!google?.accounts?.id) {
      return false;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      return false;
    }

    google.accounts.id.initialize({
      client_id: this.env.googleClientId,
      callback: async (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          return;
        }

        await this.exchangeGoogleIdentity(response.credential);
        window.location.assign(redirectPath);
      }
    });

    container.innerHTML = '';
    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 360
    });

    return true;
  }

  private getCurrentAccount(): AccountInfo | null {
    return this.msal.getActiveAccount() ?? this.msal.getAllAccounts()[0] ?? null;
  }

  async getAccessToken(): Promise<string | null> {
    return this.getStoredAppToken();
  }

  async isSignedIn(): Promise<boolean> {
    return this.getStoredAppToken() !== null;
  }
}
