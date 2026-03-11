import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MeUseCase, MyCourse, MyCurrentPeriod } from '../../application/me-use-case';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  currentPeriod: MyCurrentPeriod | null = null;
  courses: MyCourse[] = [];

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      period: this.meUseCase.getCurrentPeriod(),
      courses: this.meUseCase.getMyCourses()
    }).subscribe({
      next: ({ period, courses }) => {
        this.currentPeriod = period;
        this.courses = courses;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu información. Revisa tu sesión o el backend.';
        this.isLoading = false;
      }
    });
  }
}
