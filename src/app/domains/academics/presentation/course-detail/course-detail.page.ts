import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MeUseCase, MyCourse } from '../../application/me-use-case';

@Component({
  selector: 'app-course-detail-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './course-detail.page.html',
  styleUrl: './course-detail.page.scss'
})
export class CourseDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meUseCase = inject(MeUseCase);

  course: MyCourse | null = null;
  isLoading = true;
  loadError = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (Number.isNaN(id)) {
      this.isLoading = false;
      this.loadError = 'Identificador de curso inválido.';
      return;
    }

    this.meUseCase.getMyCourses().subscribe({
      next: (courses) => {
        this.course = courses.find((item) => item.usuarioPeriodoCursoId === id) ?? null;
        if (!this.course) {
          this.loadError = 'No encontramos el curso solicitado.';
        }
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar el detalle del curso.';
        this.isLoading = false;
      }
    });
  }
}
