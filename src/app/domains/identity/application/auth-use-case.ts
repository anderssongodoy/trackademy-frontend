import { Injectable, inject } from '@angular/core';

import { AuthService } from '../infrastructure/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthUseCase {
  private readonly auth = inject(AuthService);

  completeMicrosoftLogin(): Promise<string | null> {
    return this.auth.completeMicrosoftLogin();
  }

  isSignedIn(): Promise<boolean> {
    return this.auth.isSignedIn();
  }

  setupGoogleSignIn(targetId: string, redirect: string): Promise<boolean> {
    return this.auth.setupGoogleSignIn(targetId, redirect);
  }

  beginMicrosoftLogin(redirect: string): Promise<void> {
    return this.auth.beginMicrosoftLogin(redirect);
  }
}
