import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-of-service-page',
  imports: [RouterLink],
  templateUrl: './terms-of-service.page.html',
  styleUrl: './terms-of-service.page.scss'
})
export class TermsOfServicePage {
  protected readonly updatedAt = '23 de abril de 2026';
}
