import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
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
  nivelConfianza?: number | null;
  comentarioConfianza?: string | null;
  horarios: {
    diaSemana: number | null;
    horaInicio: string | null;
    bloques: number | null;
    tipoSesion: string | null;
    ubicacion: string | null;
    urlVirtual: string | null;
  }[];
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

  readonly franjasForm: UntypedFormArray = this.fb.array([]);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    nombrePreferido: [''],
    emailInstitucional: ['', [Validators.email]],
    campusId: [null as number | null, [Validators.required]],
    carreraId: [null as number | null, [Validators.required]],
    periodoId: [null as number | null, [Validators.required]],
    cicloActual: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    metaPromedioCiclo: [14, [Validators.required, Validators.min(0), Validators.max(20)]],
    horasEstudioSemanaObjetivo: [8, [Validators.required, Validators.min(1), Validators.max(80)]],
    franjasPreferidasEstudio: this.franjasForm
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

  timeOptions = this.buildTimeOptions();
  blockOptions = [1, 2, 3, 4, 5, 6, 7, 8];

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
          modalidad: [course.modalidad ?? ''],
          nivelConfianza: [null],
          comentarioConfianza: [''],
          horarios: this.fb.array([])
        })
      );
      this.applyCourseFilter();
      return;
    }

    this.selectedCourseIds.delete(course.id);
    this.courseDetailForm.removeControl(controlName);
    this.applyCourseFilter();
  }

  addHorario(courseId: number): void {
    const horarios = this.getHorariosFormArray(courseId);
    horarios.push(
      this.fb.group({
        diaSemana: [null],
        horaInicio: [null],
        bloques: [1],
        tipoSesion: [''],
        ubicacion: [''],
        urlVirtual: ['']
      })
    );
  }

  removeHorario(courseId: number, index: number): void {
    const horarios = this.getHorariosFormArray(courseId);
    horarios.removeAt(index);
  }

  getHorariosFormArray(courseId: number): UntypedFormArray {
    return this.courseDetailForm.get(`${courseId}`)?.get('horarios') as UntypedFormArray;
  }

  addFranja(): void {
    this.franjasForm.push(
      this.fb.group({
        diaSemana: [null],
        horaInicio: [''],
        horaFin: [''],
        prioridad: [1],
        tipo: ['estudio']
      })
    );
  }

  removeFranja(index: number): void {
    this.franjasForm.removeAt(index);
  }

  getHoraFinPreview(horaInicio: string | null, bloques: number | null): string {
    const computed = this.computeHoraFin(horaInicio, bloques);
    return computed ?? '--:--';
  }

  private computeHoraFin(horaInicio: string | null, bloques: number | null): string | null {
    if (!horaInicio || !bloques) {
      return null;
    }
    const [h, m] = horaInicio.split(':').map(Number);
    const total = h * 60 + m + bloques * 45;
    const endHours = Math.floor(total / 60) % 24;
    const endMinutes = total % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  private buildTimeOptions(): string[] {
    const options: string[] = [];
    let minutes = 7 * 60;
    const end = 24 * 60;
    while (minutes < end) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      minutes += 45;
    }
    return options;
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
      return;
    }

    if (this.currentStep === 2) {
      if (this.selectedCourseIds.size === 0) {
        this.submitError = 'Selecciona al menos un curso para continuar.';
        return;
      }
      this.currentStep = 3;
      return;
    }

    if (this.currentStep === 3) {
      this.currentStep = 4;
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
        horarios: (detail.horarios || []).map((h) => ({
          diaSemana: h.diaSemana ?? null,
          horaInicio: h.horaInicio || null,
          horaFin: this.computeHoraFin(h.horaInicio, h.bloques),
          tipoSesion: h.tipoSesion || null,
          ubicacion: h.ubicacion || null,
          urlVirtual: h.urlVirtual || null
        }))
      };
    });

    const franjasPreferidasEstudio = this.franjasForm.value
      .filter((f: any) => f.diaSemana || f.horaInicio || f.horaFin)
      .map((f: any) => ({
        diaSemana: f.diaSemana ?? null,
        horaInicio: f.horaInicio || null,
        horaFin: f.horaFin || null,
        prioridad: f.prioridad ?? 1,
        tipo: f.tipo || 'estudio'
      }));

    const confianzaPorCurso = Array.from(this.selectedCourseIds)
      .map((courseId) => {
        const detail = this.courseDetailForm.get(`${courseId}`)?.value as CourseDetailForm | undefined;
        if (!detail || detail.nivelConfianza == null) {
          return null;
        }
        return {
          cursoId: courseId,
          nivelConfianza: detail.nivelConfianza,
          comentario: detail.comentarioConfianza || null
        };
      })
      .filter((item): item is { cursoId: number; nivelConfianza: number; comentario: string | null } => item !== null);

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
        franjasPreferidasEstudio,
        confianzaPorCurso
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
