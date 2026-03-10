import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../domains/identity/infrastructure/auth/auth.service';

@Component({
  selector: 'app-sign-in-page',
  imports: [RouterLink],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss'
})
export class SignInPage implements OnInit {
  protected readonly googleUnavailable = signal(false);
  protected readonly microsoftLoading = signal(false);
  protected readonly authError = signal<string | null>(null);

  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      const redirectState = await this.authService.completeMicrosoftLogin();

      if (redirectState) {
        await this.router.navigateByUrl(redirectState);
        return;
      }

      const alreadySignedIn = await this.authService.isSignedIn();
      if (alreadySignedIn) {
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/dashboard';
        await this.router.navigateByUrl(redirect);
        return;
      }

      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/dashboard';
      const googleReady = await this.authService.setupGoogleSignIn('google-signin-button', redirect);
      this.googleUnavailable.set(!googleReady);
    } catch {
      this.authError.set('No se pudo completar la autenticacion. Intenta de nuevo y revisa que tu cuenta este permitida.');
    }
  }

  async signInWithMicrosoft(): Promise<void> {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/dashboard';
    this.authError.set(null);
    this.microsoftLoading.set(true);
    try {
      await this.authService.beginMicrosoftLogin(redirect);
    } catch {
      this.microsoftLoading.set(false);
      this.authError.set('No se pudo iniciar sesion con Microsoft. Verifica popups/cookies y vuelve a intentar.');
    }
  }
}
