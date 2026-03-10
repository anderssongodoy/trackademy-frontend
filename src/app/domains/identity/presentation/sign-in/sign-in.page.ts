import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthUseCase } from '../../application/auth-use-case';
import { AuthSessionUseCase } from '../../application/auth-session-use-case';
import { MeUseCase } from '../../../academics/application/me-use-case';

@Component({
  selector: 'app-sign-in-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss'
})
export class SignInPage implements OnInit {
  protected readonly googleUnavailable = signal(false);
  protected readonly microsoftLoading = signal(false);
  protected readonly authError = signal<string | null>(null);

  private readonly authUseCase = inject(AuthUseCase);
  private readonly sessionUseCase = inject(AuthSessionUseCase);
  private readonly meUseCase = inject(MeUseCase);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      const redirectState = await this.authUseCase.completeMicrosoftLogin();

      if (redirectState) {
        await this.navigateAfterAuth();
        return;
      }

      const alreadySignedIn = await this.authUseCase.isSignedIn();
      if (alreadySignedIn) {
        await this.navigateAfterAuth();
        return;
      }

      const googleReady = await this.authUseCase.setupGoogleSignIn('google-signin-button', '/auth/sign-in');
      this.googleUnavailable.set(!googleReady);
    } catch {
      this.authError.set('No se pudo completar la autenticacion. Intenta de nuevo y revisa que tu cuenta este permitida.');
    }
  }

  async signInWithMicrosoft(): Promise<void> {
    this.authError.set(null);
    this.microsoftLoading.set(true);
    try {
      await this.authUseCase.beginMicrosoftLogin('/auth/sign-in');
    } catch {
      this.microsoftLoading.set(false);
      this.authError.set('No se pudo iniciar sesion con Microsoft. Verifica popups/cookies y vuelve a intentar.');
    }
  }

  private async navigateAfterAuth(): Promise<void> {
    const authenticated = await firstValueFrom(this.sessionUseCase.isAuthenticated());
    if (!authenticated) {
      this.authError.set('No pudimos validar tu sesion. Intenta de nuevo.');
      return;
    }

    try {
      const currentPeriod = await firstValueFrom(this.meUseCase.getCurrentPeriod());
      const isOnboardingComplete = currentPeriod?.onboardingEstado?.toLowerCase() === 'completado';

      if (isOnboardingComplete) {
        await this.router.navigateByUrl('/app/dashboard');
        return;
      }

      await this.router.navigateByUrl('/app/onboarding');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        await this.router.navigateByUrl('/app/onboarding');
        return;
      }
      this.authError.set('No pudimos validar tu periodo. Intenta nuevamente.');
    }
  }
}

