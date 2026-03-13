import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { MeUseCase, MyCurrentPeriod } from '../../application/me-use-case';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  period: MyCurrentPeriod | null = null;

  ngOnInit(): void {
    this.meUseCase.getCurrentPeriod().subscribe({
      next: (period) => {
        this.period = period;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu perfil academico actual.';
        this.isLoading = false;
      }
    });
  }
}
