import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CatalogApiService,
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogPeriod
} from '../../../domains/academics/infrastructure/api/catalog-api.service';
import { OnboardingApiService } from '../../../domains/academics/infrastructure/api/onboarding-api.service';

interface CourseDetailForm {
  seccion: string;
  profesor: string;
  modalidad: string;
}

@Component({
  selector: 'app-onboarding-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss'
})
export class OnboardingPage implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    campusId: [null as number | null, [Validators.required]],
    carreraId: [null as number | null, [Validators.required]],
    periodoId: [null as number | null, [Validators.required]],
    cicloActual: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    metaPromedioCiclo: [14, [Validators.required, Validators.min(0), Validators.max(20)]],
    horasEstudioSemanaObjetivo: [8, [Validators.required, Validators.min(1), Validators.max(80)]]
  });

  readonly courseDetailForm: UntypedFormGroup = this.fb.group({});

  campuses: CatalogCampus[] = [];
  careers: CatalogCareer[] = [];
  periods: CatalogPeriod[] = [];
  courses: CatalogCourse[] = [];

  selectedCourseIds = new Set<number>();

  isLoading = true;
  isSubmitting = false;
  loadingError = '';
  submitError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadingError = '';

    forkJoin({
      campuses: this.catalogApi.getCampuses(),
      careers: this.catalogApi.getCareers(),
      periods: this.catalogApi.getPeriods(),
      courses: this.catalogApi.getCourses()
    }).subscribe({
      next: ({ campuses, careers, periods, courses }) => {
        this.campuses = campuses;
        this.careers = careers;
        this.periods = periods;
        this.courses = courses;
        this.isLoading = false;
      },
      error: () => {
        this.loadingError =
          'No se pudo cargar la data inicial del backend. Verifica API, CORS y disponibilidad.';
        this.isLoading = false;
      }
    });
  }

  toggleCourse(course: CatalogCourse, enabled: boolean): void {
    const controlName = `${course.id}`;

    if (enabled) {
      this.selectedCourseIds.add(course.id);
      this.courseDetailForm.addControl(
        controlName,
        this.fb.group({
          seccion: ['', [Validators.required]],
          profesor: ['', [Validators.required]],
          modalidad: [course.modalidad ?? '', [Validators.required]]
        })
      );
      return;
    }

    this.selectedCourseIds.delete(course.id);
    this.courseDetailForm.removeControl(controlName);
  }

  submit(): void {
    this.submitError = '';

    if (this.form.invalid || this.courseDetailForm.invalid) {
      this.form.markAllAsTouched();
      this.courseDetailForm.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (!value.campusId || !value.carreraId || !value.periodoId || !value.email || !value.nombre) {
      this.submitError = 'Faltan campos obligatorios para completar el onboarding.';
      return;
    }

    const cursos = Array.from(this.selectedCourseIds).map((courseId) => {
      const detail = this.courseDetailForm.get(`${courseId}`)?.value as CourseDetailForm | undefined;

      if (!detail) {
        throw new Error(`Missing details for selected course ${courseId}`);
      }

      return {
        cursoId: courseId,
        seccion: detail.seccion,
        profesor: detail.profesor,
        modalidad: detail.modalidad,
        horarios: []
      };
    });

    this.isSubmitting = true;

    this.onboardingApi
      .submitBasicOnboarding({
        email: value.email,
        nombre: value.nombre,
        campusId: value.campusId,
        carreraId: value.carreraId,
        periodoId: value.periodoId,
        cicloActual: value.cicloActual ?? 1,
        metaPromedioCiclo: value.metaPromedioCiclo ?? 14,
        horasEstudioSemanaObjetivo: value.horasEstudioSemanaObjetivo ?? 8,
        cursos,
        franjasPreferidasEstudio: [],
        confianzaPorCurso: []
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/app/dashboard']);
        },
        error: () => {
          this.submitError = 'No se pudo registrar el onboarding. Revisa los datos y vuelve a intentar.';
          this.isSubmitting = false;
        }
      });
  }
}
