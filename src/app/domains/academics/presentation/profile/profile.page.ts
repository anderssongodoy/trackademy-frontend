import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { CatalogCampus, CatalogCareer, CatalogCourse, CatalogUseCase } from '../../application/catalog-use-case';
import { MeUseCase, MyCourse, MyCurrentPeriod } from '../../application/me-use-case';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);
  private readonly fb = inject(UntypedFormBuilder);

  readonly goalsForm = this.fb.group({
    metaPromedioCiclo: [14, [Validators.required, Validators.min(0), Validators.max(20)]],
    horasEstudioSemanaObjetivo: [8, [Validators.required, Validators.min(1), Validators.max(80)]]
  });

  readonly configForm = this.fb.group({
    campusId: [null as number | null, [Validators.required]],
    carreraId: [null as number | null, [Validators.required]],
    cicloActual: [1, [Validators.required, Validators.min(1), Validators.max(12)]]
  });

  isLoading = true;
  isSavingGoals = false;
  isSavingConfig = false;
  isCoursesLoading = false;
  loadError = '';
  saveError = '';
  saveSuccess = '';
  configError = '';
  configSuccess = '';
  configInfo = '';
  period: MyCurrentPeriod | null = null;
  campuses: CatalogCampus[] = [];
  careers: CatalogCareer[] = [];
  currentCourses: MyCourse[] = [];
  availableCourses: CatalogCourse[] = [];
  selectedCourseIds = new Set<number>();
  selectedCourseLabels = new Map<number, string>();
  courseQuery = '';

  ngOnInit(): void {
    this.loadProfile();
    this.bindCareerChanges();
  }

  get onboardingStatusLabel(): string {
    const status = this.period?.onboardingEstado?.toLowerCase();
    if (status === 'completado') {
      return 'Perfil inicial completo';
    }
    if (status === 'en_progreso') {
      return 'Perfil en progreso';
    }
    return 'Perfil pendiente';
  }

  get campusName(): string {
    return this.campuses.find((item) => item.id === this.period?.campusId)?.nombre || 'Sin campus definido';
  }

  get careerName(): string {
    return this.careers.find((item) => item.id === this.period?.carreraId)?.nombre || 'Sin carrera definida';
  }

  get selectedCoursesList(): Array<{ id: number; label: string }> {
    return [...this.selectedCourseIds].map((id) => ({
      id,
      label: this.selectedCourseLabels.get(id) || `Curso ${id}`
    }));
  }

  get removedCourseCount(): number {
    const currentIds = new Set(this.currentCourses.map((course) => course.cursoId));
    return [...currentIds].filter((id) => !this.selectedCourseIds.has(id)).length;
  }

  get addedCourseCount(): number {
    const currentIds = new Set(this.currentCourses.map((course) => course.cursoId));
    return [...this.selectedCourseIds].filter((id) => !currentIds.has(id)).length;
  }

  saveGoals(): void {
    if (this.goalsForm.invalid || this.isSavingGoals) {
      this.goalsForm.markAllAsTouched();
      return;
    }

    this.isSavingGoals = true;
    this.saveError = '';
    this.saveSuccess = '';

    const value = this.goalsForm.getRawValue();

    this.meUseCase.updateAcademicProfile({
      metaPromedioCiclo: Number(value.metaPromedioCiclo),
      horasEstudioSemanaObjetivo: Number(value.horasEstudioSemanaObjetivo)
    }).subscribe({
      next: (period) => {
        this.period = period;
        this.patchGoalsForm(period);
        this.isSavingGoals = false;
        this.saveSuccess = 'Objetivos actualizados.';
      },
      error: () => {
        this.isSavingGoals = false;
        this.saveError = 'No se pudo actualizar tu perfil academico.';
      }
    });
  }

  onCourseQueryChange(value: string): void {
    this.courseQuery = value.trim();
    this.loadAvailableCourses();
  }

  toggleCourse(course: CatalogCourse): void {
    if (this.selectedCourseIds.has(course.id)) {
      this.selectedCourseIds.delete(course.id);
    } else {
      this.selectedCourseIds.add(course.id);
    }
    this.selectedCourseLabels.set(course.id, `${course.codigo} - ${course.nombre}`);
  }

  removeSelectedCourse(courseId: number): void {
    this.selectedCourseIds.delete(courseId);
  }

  isSelected(courseId: number): boolean {
    return this.selectedCourseIds.has(courseId);
  }

  saveConfiguration(): void {
    if (this.configForm.invalid || this.isSavingConfig) {
      this.configForm.markAllAsTouched();
      return;
    }

    const selectedIds = [...this.selectedCourseIds];
    if (selectedIds.length === 0) {
      this.configError = 'Debes dejar al menos un curso seleccionado.';
      this.configSuccess = '';
      return;
    }

    const removedCount = this.removedCourseCount;
    const campusChanged = this.configForm.getRawValue().campusId !== this.period?.campusId;
    const careerChanged = this.configForm.getRawValue().carreraId !== this.period?.carreraId;

    const warningParts = [
      'Se actualizara la configuracion base del ciclo actual.'
    ];
    if (campusChanged || careerChanged) {
      warningParts.push('Si cambias campus o carrera, estas redefiniendo el contexto academico del periodo.');
    }
    if (removedCount > 0) {
      warningParts.push(`Se eliminaran ${removedCount} curso(s) y con eso tambien se borraran su horario configurado y sus notas registradas en este periodo.`);
    }
    warningParts.push('Estas seguro de continuar?');

    if (!window.confirm(warningParts.join('\n\n'))) {
      return;
    }

    this.isSavingConfig = true;
    this.configError = '';
    this.configSuccess = '';

    const value = this.configForm.getRawValue();

    this.meUseCase.updatePeriodConfiguration({
      campusId: Number(value.campusId),
      carreraId: Number(value.carreraId),
      cicloActual: Number(value.cicloActual),
      cursoIds: selectedIds
    }).subscribe({
      next: (period) => {
        this.period = period;
        this.patchConfigForm(period);
        this.configInfo = '';

        this.meUseCase.getMyCourses().subscribe({
          next: (courses) => {
            this.currentCourses = courses;
            this.rebuildSelectedCourses(courses);
            this.loadAvailableCourses();
            this.isSavingConfig = false;
            this.configSuccess = 'Configuracion del ciclo actualizada.';
          },
          error: () => {
            this.currentCourses = [];
            this.isSavingConfig = false;
            this.configError = 'Se actualizo el ciclo, pero no se pudieron recargar los cursos.';
          }
        });
      },
      error: (error) => {
        this.isSavingConfig = false;
        this.configError = typeof error?.error === 'string' ? error.error : 'No se pudo reconfigurar el ciclo actual.';
      }
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      period: this.meUseCase.getCurrentPeriod(),
      campuses: this.catalogUseCase.getCampuses(),
      careers: this.catalogUseCase.getCareers(),
      courses: this.meUseCase.getMyCourses()
    }).subscribe({
      next: ({ period, campuses, careers, courses }) => {
        this.period = period;
        this.campuses = campuses;
        this.careers = careers;
        this.currentCourses = courses;
        this.patchGoalsForm(period);
        this.patchConfigForm(period);
        this.rebuildSelectedCourses(courses);
        this.loadAvailableCourses();
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu perfil academico actual.';
        this.isLoading = false;
      }
    });
  }

  private bindCareerChanges(): void {
    this.configForm.get('carreraId')?.valueChanges.subscribe((carreraId) => {
      if (!this.period) {
        return;
      }

      const normalized = carreraId ? Number(carreraId) : null;
      this.configError = '';
      this.configSuccess = '';
      if (!normalized) {
        this.availableCourses = [];
        return;
      }

      if (normalized !== this.period.carreraId) {
        this.selectedCourseIds.clear();
        this.selectedCourseLabels.clear();
        this.configInfo = 'Cambiaron los cursos disponibles por la nueva carrera. Debes confirmar de nuevo los cursos que quieres conservar.';
      } else {
        this.rebuildSelectedCourses(this.currentCourses);
        this.configInfo = '';
      }

      this.loadAvailableCourses();
    });
  }

  private loadAvailableCourses(): void {
    const carreraId = this.configForm.getRawValue().carreraId;
    if (!carreraId) {
      this.availableCourses = [];
      return;
    }

    this.isCoursesLoading = true;

    this.catalogUseCase.getCourses(Number(carreraId), this.courseQuery, 30, 0).subscribe({
      next: (courses) => {
        this.availableCourses = courses;
        courses.forEach((course) => {
          this.selectedCourseLabels.set(course.id, `${course.codigo} - ${course.nombre}`);
        });
        this.isCoursesLoading = false;
      },
      error: () => {
        this.availableCourses = [];
        this.isCoursesLoading = false;
        this.configError = 'No se pudo cargar el catalogo de cursos para esta carrera.';
      }
    });
  }

  private rebuildSelectedCourses(courses: MyCourse[]): void {
    this.selectedCourseIds = new Set(courses.map((course) => course.cursoId));
    this.selectedCourseLabels = new Map(
      courses.map((course) => [course.cursoId, `${course.codigo} - ${course.nombre}`])
    );
  }

  private patchGoalsForm(period: MyCurrentPeriod): void {
    this.goalsForm.patchValue({
      metaPromedioCiclo: period.metaPromedioCiclo ?? 14,
      horasEstudioSemanaObjetivo: period.horasEstudioSemanaObjetivo ?? 8
    });
  }

  private patchConfigForm(period: MyCurrentPeriod): void {
    this.configForm.patchValue({
      campusId: period.campusId ?? null,
      carreraId: period.carreraId ?? null,
      cicloActual: period.cicloActual ?? 1
    }, { emitEvent: false });
  }
}
