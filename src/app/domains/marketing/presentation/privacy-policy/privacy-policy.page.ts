import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy-page',
  imports: [RouterLink],
  templateUrl: './privacy-policy.page.html',
  styleUrl: './privacy-policy.page.scss'
})
export class PrivacyPolicyPage {
  protected readonly updatedAt = '23 de abril de 2026';
}
