import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CatalogUseCase,
  CatalogCampus,
  CatalogCareer,
  CatalogCourse,
  CatalogPeriod
} from '../../application/catalog-use-case';
import { AuthUseCase } from '../../../identity/application/auth-use-case';
import { OnboardingUseCase } from '../../application/onboarding-use-case';

interface CourseDetailForm {
  seccion: string;
  profesor: string;
  modalidad: string;
}

@Component({
  selector: 'app-onboarding-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss'
})
export class OnboardingPage implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly catalogUseCase = inject(CatalogUseCase);
  private readonly onboardingUseCase = inject(OnboardingUseCase);
  private readonly authUseCase = inject(AuthUseCase);
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
  fixedCareer: CatalogCareer | null = null;
  private readonly courseCache = new Map<number, CatalogCourse[]>();

  selectedCourseIds = new Set<number>();

  courseQuery = '';
  isCourseLoading = false;
  courseError = '';
  showSelectedOnly = false;

  currentStep = 1;

  isLoading = true;
  isSubmitting = false;
  loadingError = '';
  submitError = '';
  private readonly controlLabels: Record<string, string> = {
    nombre: 'Nombre completo',
    emailInstitucional: 'Correo institucional',
    campusId: 'Campus',
    carreraId: 'Carrera',
    periodoId: 'Periodo',
    cicloActual: 'Ciclo actual',
    metaPromedioCiclo: 'Meta de promedio',
    horasEstudioSemanaObjetivo: 'Horas de estudio / semana'
  };

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
        this.bindCareerChanges();
        this.selectDefaultCareer();
        this.isLoading = false;
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
      this.courseQuery = '';
      this.showSelectedOnly = false;
      if (!carreraId) {
        this.courses = [];
        this.applyCourseFilter();
        return;
      }
      this.loadCourses(carreraId);
    });
  }

  private selectDefaultCareer(): void {
    const defaultCareer = this.careers.find((career) =>
      this.normalizeSearchText(career.nombre).includes('ingenieria de sistemas')
    );

    if (!defaultCareer || this.form.get('carreraId')?.value) {
      return;
    }

    this.fixedCareer = defaultCareer;
    this.form.patchValue({ carreraId: defaultCareer.id });
  }

  onCourseQueryChange(value: string): void {
    this.courseQuery = value;
    this.applyCourseFilter();
  }

  toggleShowSelected(value: boolean): void {
    this.showSelectedOnly = value;
    this.applyCourseFilter();
  }

  get visibleCourses(): CatalogCourse[] {
    return this.filteredCourses;
  }

  private loadCourses(carreraId: number): void {
    const cachedCourses = this.courseCache.get(carreraId);
    if (cachedCourses) {
      this.courses = cachedCourses;
      this.applyCourseFilter();
      return;
    }

    this.isCourseLoading = true;
    this.courseError = '';

    this.catalogUseCase.getCourses(carreraId, undefined, 256, 0).subscribe({
      next: (courses) => {
        this.courseCache.set(carreraId, courses);
        this.courses = courses;
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
    const normalizedQuery = this.normalizeSearchText(this.courseQuery);
    const baseCourses = this.showSelectedOnly
      ? this.courses.filter((course) => this.selectedCourseIds.has(course.id))
      : this.courses;

    if (!normalizedQuery) {
      this.filteredCourses = baseCourses;
      return;
    }

    this.filteredCourses = baseCourses.filter((course) => {
      const code = this.normalizeSearchText(course.codigo);
      const name = this.normalizeSearchText(course.nombre);
      return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }

  private normalizeSearchText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
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
        this.submitError = this.getStepOneValidationMessage();
        return;
      }
      this.currentStep = 2;
    }
  }

  prevStep(): void {
    this.submitError = '';
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  getControlError(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo institucional valido o deja el campo vacio.';
    }
    if (control.hasError('minlength')) {
      return 'Ingresa al menos 3 caracteres.';
    }
    if (control.hasError('min') || control.hasError('max')) {
      return 'Revisa el rango permitido para este campo.';
    }

    return 'Revisa este campo.';
  }

  private getStepOneValidationMessage(): string {
    const priorityControls = [
      'nombre',
      'emailInstitucional',
      'campusId',
      'carreraId',
      'periodoId',
      'cicloActual',
      'metaPromedioCiclo',
      'horasEstudioSemanaObjetivo'
    ];

    const invalidLabels = priorityControls
      .filter((controlName) => this.form.get(controlName)?.invalid)
      .map((controlName) => this.controlLabels[controlName] ?? controlName);

    if (invalidLabels.length > 1) {
      return `Revisa estos campos: ${invalidLabels.join(', ')}.`;
    }

    const firstInvalid = priorityControls.find((controlName) => this.form.get(controlName)?.invalid);
    if (!firstInvalid) {
      return 'Revisa los datos base antes de continuar.';
    }

    return this.getControlError(firstInvalid) || 'Revisa los datos base antes de continuar.';
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

  async signOut(): Promise<void> {
    await this.authUseCase.signOut();
    await this.router.navigate(['/auth/sign-in']);
  }
}
