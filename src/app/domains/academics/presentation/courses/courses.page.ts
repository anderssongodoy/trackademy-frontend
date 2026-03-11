import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyCourse } from '../../application/me-use-case';

@Component({
  selector: 'app-courses-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './courses.page.html',
  styleUrl: './courses.page.scss'
})
export class CoursesPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  readonly searchControl = new FormControl('');

  courses: MyCourse[] = [];
  filteredCourses: MyCourse[] = [];
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getMyCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.applyFilter(this.searchControl.value ?? '');
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tus cursos. Verifica la conexión con el backend.';
        this.isLoading = false;
      }
    });

    this.searchControl.valueChanges.subscribe((value) => {
      this.applyFilter(value ?? '');
    });
  }

  private applyFilter(query: string): void {
    const normalized = this.normalizeText(query);
    if (!normalized) {
      this.filteredCourses = this.courses;
      return;
    }

    this.filteredCourses = this.courses.filter((course) => {
      const name = this.normalizeText(course.nombre);
      const code = this.normalizeText(course.codigo);
      return name.includes(normalized) || code.includes(normalized);
    });
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}
