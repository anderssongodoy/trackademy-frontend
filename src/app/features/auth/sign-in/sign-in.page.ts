import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in-page',
  imports: [RouterLink],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss'
})
export class SignInPage implements OnInit {
  protected readonly googleUnavailable = signal(false);

  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
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
  }

  async signInWithMicrosoft(): Promise<void> {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/dashboard';
    await this.authService.beginMicrosoftLogin(redirect);
  }
}
