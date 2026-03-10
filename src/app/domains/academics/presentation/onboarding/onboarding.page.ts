import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CatalogUseCase,
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogPeriod
} from '../../application/catalog-use-case';
import { OnboardingUseCase } from '../../application/onboarding-use-case';

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
  private readonly catalogUseCase = inject(CatalogUseCase);
  private readonly onboardingUseCase = inject(OnboardingUseCase);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    nombrePreferido: [''],
    emailInstitucional: ['', [Validators.email]],
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
  filteredCourses: CatalogCourse[] = [];

  selectedCourseIds = new Set<number>();

  courseQuery = '';
  coursePageSize = 12;
  courseOffset = 0;
  hasMoreCourses = false;
  isCourseLoading = false;
  courseError = '';
  showSelectedOnly = false;

  currentStep = 1;

  isLoading = true;
  isSubmitting = false;
  loadingError = '';
  submitError = '';

  ngOnInit(): void {
    this.isLoading = true;
    this.loadingError = '';

    forkJoin({
      campuses: this.catalogUseCase.getCampuses(),
      careers: this.catalogUseCase.getCareers(),
      periods: this.catalogUseCase.getPeriods()
    }).subscribe({
      next: ({ campuses, careers, periods }) => {
        this.campuses = campuses;
        this.careers = careers;
        this.periods = periods;
        this.isLoading = false;
        this.bindCareerChanges();
      },
      error: () => {
        this.loadingError =
          'No se pudo cargar la data inicial del backend. Verifica API, CORS y disponibilidad.';
        this.isLoading = false;
      }
    });
  }

  private bindCareerChanges(): void {
    this.form.get('carreraId')?.valueChanges.subscribe((value) => {
      const carreraId = value ?? null;
      this.resetCourseSelection();
      if (!carreraId) {
        this.courses = [];
        this.applyCourseFilter();
        return;
      }
      this.loadCourses(true);
    });
  }

  onCourseQueryChange(value: string): void {
    this.courseQuery = value;
    this.loadCourses(true);
  }

  toggleShowSelected(value: boolean): void {
    this.showSelectedOnly = value;
    this.applyCourseFilter();
  }

  get visibleCourses(): CatalogCourse[] {
    return this.filteredCourses;
  }

  showMoreCourses(): void {
    if (!this.hasMoreCourses || this.isCourseLoading) {
      return;
    }
    this.loadCourses(false);
  }

  private loadCourses(reset: boolean): void {
    const carreraId = this.form.get('carreraId')?.value ?? null;
    if (!carreraId) {
      return;
    }

    if (reset) {
      this.courseOffset = 0;
      this.courses = [];
      this.filteredCourses = [];
      this.hasMoreCourses = false;
    }

    this.isCourseLoading = true;
    this.courseError = '';

    this.catalogUseCase.getCourses(carreraId, this.courseQuery, this.coursePageSize, this.courseOffset).subscribe({
      next: (courses) => {
        if (reset) {
          this.courses = courses;
        } else {
          this.courses = [...this.courses, ...courses];
        }
        this.courseOffset += courses.length;
        this.hasMoreCourses = courses.length === this.coursePageSize;
        this.applyCourseFilter();
        this.isCourseLoading = false;
      },
      error: () => {
        this.courseError = 'No se pudo cargar los cursos. Intenta nuevamente.';
        this.isCourseLoading = false;
      }
    });
  }

  private applyCourseFilter(): void {
    if (this.showSelectedOnly) {
      this.filteredCourses = this.courses.filter((course) => this.selectedCourseIds.has(course.id));
      return;
    }
    this.filteredCourses = this.courses;
  }

  toggleCourse(course: CatalogCourse, enabled: boolean): void {
    const controlName = `${course.id}`;

    if (enabled) {
      this.selectedCourseIds.add(course.id);
      this.courseDetailForm.addControl(
        controlName,
        this.fb.group({
          seccion: [''],
          profesor: [''],
          modalidad: [course.modalidad ?? '']
        })
      );
      this.applyCourseFilter();
      return;
    }

    this.selectedCourseIds.delete(course.id);
    this.courseDetailForm.removeControl(controlName);
    this.applyCourseFilter();
  }

  private resetCourseSelection(): void {
    this.selectedCourseIds.clear();
    Object.keys(this.courseDetailForm.controls).forEach((key) => this.courseDetailForm.removeControl(key));
  }

  nextStep(): void {
    this.submitError = '';
    if (this.currentStep === 1) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      this.currentStep = 2;
    }
  }

  prevStep(): void {
    this.submitError = '';
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  submit(): void {
    this.submitError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (!value.campusId || !value.carreraId || !value.periodoId || !value.nombre) {
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
        seccion: detail.seccion || null,
        profesor: detail.profesor || null,
        modalidad: detail.modalidad || null,
        horarios: []
      };
    });

    this.isSubmitting = true;

    this.onboardingUseCase
      .submitBasicOnboarding({
        nombre: value.nombre,
        nombrePreferido: value.nombrePreferido || null,
        emailInstitucional: value.emailInstitucional || null,
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
