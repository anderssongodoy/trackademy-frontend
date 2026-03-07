import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in-page',
  imports: [RouterLink],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss'
})
export class SignInPage {
  private readonly authService = inject(AuthService);

  signInWithMicrosoft(): void {
    this.authService.beginMicrosoftLogin();
  }
}
