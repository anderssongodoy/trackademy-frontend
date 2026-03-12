import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CatalogCourseDetail, CatalogCourseUnit, CatalogUseCase } from '../../application/catalog-use-case';
import { MeUseCase, MyCourse, MyEvaluation, MyScheduleEntry } from '../../application/me-use-case';

@Component({
  selector: 'app-course-detail-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './course-detail.page.html',
  styleUrl: './course-detail.page.scss'
})
export class CourseDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);

  course: MyCourse | null = null;
  evaluations: MyEvaluation[] = [];
  scheduleEntries: MyScheduleEntry[] = [];
  courseDetail: CatalogCourseDetail | null = null;
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
          this.isLoading = false;
          return;
        }

        forkJoin({
          evaluations: this.meUseCase.getMyEvaluations(this.course.cursoId),
          detail: this.catalogUseCase.getCourseDetailByCode(this.course.codigo),
          schedules: this.meUseCase.getMySchedule()
        }).subscribe({
          next: ({ evaluations, detail, schedules }) => {
            this.evaluations = evaluations;
            this.courseDetail = detail;
            this.scheduleEntries = schedules
              .filter((item) => item.usuarioPeriodoCursoId === id)
              .sort((a, b) => (a.bloqueNro ?? 0) - (b.bloqueNro ?? 0));
            this.isLoading = false;
          },
          error: () => {
            this.loadError = 'No se pudo cargar el detalle completo del curso.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.loadError = 'No se pudo cargar el detalle del curso.';
        this.isLoading = false;
      }
    });
  }

  get pendingEvaluationsCount(): number {
    return this.evaluations.length;
  }

  get minimumPassingGrade(): number {
    return 12;
  }

  get configuredBlocksCount(): number {
    return this.scheduleEntries.length;
  }

  formatBlock(entry: MyScheduleEntry): string {
    const day = this.dayLabel(entry.diaSemana);
    const start = entry.horaInicio || '--:--';
    const end = entry.horaFin || '--:--';
    return `${day} · ${start} - ${end}`;
  }

  topicsFor(unit: CatalogCourseUnit): string[] {
    return unit.temas ?? unit.temario ?? [];
  }

  private dayLabel(day: number | null): string {
    switch (day) {
      case 1:
        return 'Lunes';
      case 2:
        return 'Martes';
      case 3:
        return 'Miércoles';
      case 4:
        return 'Jueves';
      case 5:
        return 'Viernes';
      case 6:
        return 'Sábado';
      case 7:
        return 'Domingo';
      default:
        return 'Sin día';
    }
  }
}