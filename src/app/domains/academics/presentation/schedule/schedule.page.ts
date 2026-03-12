import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyCourse } from '../../application/me-use-case';

@Component({
  selector: 'app-schedule-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss'
})
export class SchedulePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  courses: MyCourse[] = [];
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getMyCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu horario. Verifica la conexión con el backend.';
        this.isLoading = false;
      }
    });
  }
}
