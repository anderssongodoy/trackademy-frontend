import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  protected readonly googleLoading = signal(false);
  protected readonly microsoftLoading = signal(false);
  protected readonly authError = signal<string | null>(null);

  private readonly authUseCase = inject(AuthUseCase);
  private readonly sessionUseCase = inject(AuthSessionUseCase);
  private readonly meUseCase = inject(MeUseCase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    try {
      const googleRedirectCompleted = this.authUseCase.completeGoogleOAuthRedirect();
      if (googleRedirectCompleted) {
        const redirected = await this.navigateAfterAuth();
        if (redirected) {
          return;
        }
      }

      const redirectState = await this.authUseCase.completeMicrosoftLogin();

      if (redirectState) {
        const redirected = await this.navigateAfterAuth();
        if (redirected) {
          return;
        }
      }

      const alreadySignedIn = await this.authUseCase.isSignedIn();
      if (alreadySignedIn) {
        const redirected = await this.navigateAfterAuth();
        if (redirected) {
          return;
        }
      }
    } catch {
      this.authError.set('No se pudo completar la autenticacion. Intenta de nuevo y revisa que tu cuenta este permitida.');
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.authError.set(null);
    this.googleLoading.set(true);
    try {
      await this.authUseCase.beginGoogleOAuthLogin(this.buildAuthReturnPath());
    } catch {
      this.googleLoading.set(false);
      this.authError.set('No se pudo iniciar sesion con Google. Revisa la configuracion de OAuth y vuelve a intentar.');
    }
  }

  async signInWithMicrosoft(): Promise<void> {
    this.authError.set(null);
    this.microsoftLoading.set(true);
    try {
      await this.authUseCase.beginMicrosoftLogin(this.buildAuthReturnPath());
    } catch {
      this.microsoftLoading.set(false);
      this.authError.set('No se pudo iniciar sesion con Microsoft. Verifica popups/cookies y vuelve a intentar.');
    }
  }

  private async navigateAfterAuth(): Promise<boolean> {
    const authenticated = await firstValueFrom(this.sessionUseCase.isAuthenticated());
    if (!authenticated) {
      this.authUseCase.clearLocalSession();
      this.authError.set('No pudimos validar tu sesion actual. Puedes volver a entrar con Microsoft o Google.');
      return false;
    }

    try {
      const currentPeriod = await firstValueFrom(this.meUseCase.getCurrentPeriod());
      const isOnboardingComplete = currentPeriod?.onboardingEstado?.toLowerCase() === 'completado';
      const requestedRedirect = this.route.snapshot.queryParamMap.get('redirect');

      if (isOnboardingComplete) {
        await this.router.navigateByUrl(this.sanitizeRedirect(requestedRedirect));
        return true;
      }

      await this.router.navigateByUrl('/onboarding');
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        await this.router.navigateByUrl('/onboarding');
        return true;
      }
      this.authUseCase.clearLocalSession();
      this.authError.set('No pudimos validar tu periodo actual. Puedes volver a entrar y crear el onboarding de este ciclo.');
      return false;
    }
  }

  private buildAuthReturnPath(): string {
    const requestedRedirect = this.route.snapshot.queryParamMap.get('redirect');
    if (!requestedRedirect) {
      return '/auth/sign-in';
    }

    return `/auth/sign-in?redirect=${encodeURIComponent(requestedRedirect)}`;
  }

  private sanitizeRedirect(redirect: string | null): string {
    if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
      return '/app/dashboard';
    }

    return redirect;
  }
}

