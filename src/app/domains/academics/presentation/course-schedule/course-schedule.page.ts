import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { CatalogCourse, CatalogUseCase } from '../../application/catalog-use-case';
import { MeUseCase, MyCourse, MyScheduleEntry, ScheduleBlockRequest } from '../../application/me-use-case';

interface DayOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-course-schedule-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './course-schedule.page.html',
  styleUrl: './course-schedule.page.scss'
})
export class CourseSchedulePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);
  private readonly formRevision = signal(0);
  private readonly subscriptions = new Subscription();

  readonly dayOptions: DayOption[] = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miercoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sabado' },
    { value: 7, label: 'Domingo' }
  ];

  readonly sessionTypes = ['Teoria', 'Practica', 'Laboratorio', 'Asesoria'];
  readonly timeOptions = this.buildTimeOptions();
  readonly currentStep = signal(1);
  readonly selectedDays = signal<number[]>([]);

  readonly form = this.formBuilder.group({
    planes: this.formBuilder.array([])
  });

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly course = signal<MyCourse | null>(null);
  readonly catalogCourse = signal<CatalogCourse | null>(null);

  readonly totalBlocks = computed(() => this.catalogCourse()?.horasSemanales ?? 0);
  readonly assignedBlocks = computed(() => {
    this.formRevision();
    return this.planControls.controls.reduce((total, control) => total + Number(control.get('bloques')?.value ?? 0), 0);
  });
  readonly missingBlocks = computed(() => Math.max(this.totalBlocks() - this.assignedBlocks(), 0));
  readonly extraBlocks = computed(() => Math.max(this.assignedBlocks() - this.totalBlocks(), 0));
  readonly completionPercent = computed(() => {
    const total = this.totalBlocks();
    if (!total) {
      return 0;
    }
    return Math.min(Math.round((this.assignedBlocks() / total) * 100), 100);
  });

  get planControls(): UntypedFormArray {
    return this.form.get('planes') as UntypedFormArray;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => this.bumpRevision())
    );

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isNaN(id)) {
      this.isLoading.set(false);
      this.loadError.set('No se pudo identificar el curso a configurar.');
      return;
    }

    forkJoin({
      courses: this.meUseCase.getMyCourses(),
      schedules: this.meUseCase.getMySchedule()
    }).subscribe({
      next: ({ courses, schedules }) => {
        const course = courses.find((item) => item.usuarioPeriodoCursoId === id) ?? null;
        if (!course) {
          this.isLoading.set(false);
          this.loadError.set('No encontramos el curso solicitado.');
          return;
        }

        this.course.set(course);
        this.catalogUseCase.getCourseByCode(course.codigo).subscribe({
          next: (catalogCourse) => {
            this.catalogCourse.set(catalogCourse);
            this.hydratePlans(id, schedules);
            this.isLoading.set(false);
          },
          error: () => {
            this.hydratePlans(id, schedules);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('No se pudo cargar la configuracion del curso.');
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  isDaySelected(day: number): boolean {
    return this.selectedDays().includes(day);
  }

  toggleDay(day: number): void {
    const current = [...this.selectedDays()];
    const exists = current.includes(day);

    if (exists) {
      this.selectedDays.set(current.filter((value) => value !== day));
      this.removePlan(day);
    } else {
      current.push(day);
      current.sort((a, b) => a - b);
      this.selectedDays.set(current);
      this.addPlan(day);
    }

    if (this.currentStep() > 1 && this.selectedDays().length === 0) {
      this.currentStep.set(1);
    }

    this.bumpRevision();
  }

  goToStep(step: number): void {
    if (step === 2 && this.selectedDays().length === 0) {
      return;
    }

    if (step === 3 && !this.canAdvanceToTimeStep()) {
      return;
    }

    this.currentStep.set(step);
  }

  canAdvanceToTimeStep(): boolean {
    return this.selectedDays().length > 0 && this.missingBlocks() === 0 && this.extraBlocks() === 0;
  }

  applySuggestedDistribution(): void {
    const days = this.selectedDays();
    const total = this.totalBlocks();

    if (days.length === 0 || total === 0) {
      return;
    }

    const base = Math.floor(total / days.length);
    let remainder = total % days.length;

    days.forEach((day) => {
      const plan = this.getPlan(day);
      if (!plan) {
        return;
      }

      const blocks = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) {
        remainder -= 1;
      }

      plan.get('bloques')?.setValue(blocks);
    });

    this.bumpRevision();
  }

  increaseBlocks(day: number): void {
    const plan = this.getPlan(day);
    if (!plan) {
      return;
    }

    plan.get('bloques')?.setValue(Number(plan.get('bloques')?.value ?? 0) + 1);
    this.bumpRevision();
  }

  decreaseBlocks(day: number): void {
    const plan = this.getPlan(day);
    if (!plan) {
      return;
    }

    const current = Number(plan.get('bloques')?.value ?? 1);
    plan.get('bloques')?.setValue(Math.max(current - 1, 1));
    this.bumpRevision();
  }

  getPlan(day: number): UntypedFormGroup | null {
    return (this.planControls.controls.find((control) => Number(control.get('diaSemana')?.value) === day) as UntypedFormGroup) ?? null;
  }

  planForDay(day: number): UntypedFormGroup {
    return this.getPlan(day) as UntypedFormGroup;
  }

  endTimeFor(day: number): string {
    const plan = this.getPlan(day);
    if (!plan) {
      return '--:--';
    }

    const startValue = plan.get('horaInicio')?.value as string;
    const blocks = Number(plan.get('bloques')?.value ?? 1);
    return this.calculateEndTime(startValue, blocks);
  }

  dayLabel(day: number): string {
    return this.dayOptions.find((item) => item.value === day)?.label ?? 'Dia';
  }

  distributionLabel(day: number): string {
    const plan = this.getPlan(day);
    const blocks = Number(plan?.get('bloques')?.value ?? 0);
    if (blocks === 0) {
      return 'Sin bloques';
    }

    return `${blocks} bloque${blocks === 1 ? '' : 's'} de 45 min`;
  }

  exampleRange(blocks: number): string {
    if (blocks <= 0) {
      return '--:-- a --:--';
    }
    return `20:15 a ${this.calculateEndTime('20:15', blocks)}`;
  }

  goBack(): void {
    const course = this.course();
    if (!course) {
      return;
    }

    history.length > 1 ? history.back() : location.assign(`/app/cursos/${course.usuarioPeriodoCursoId}`);
  }

  save(): void {
    const course = this.course();
    if (!course) {
      return;
    }

    this.saveError.set('');
    this.saveSuccess.set('');

    if (this.selectedDays().length === 0) {
      this.saveError.set('Selecciona al menos un dia para este curso.');
      return;
    }

    if (!this.canAdvanceToTimeStep()) {
      this.saveError.set('La distribucion de bloques debe coincidir exactamente con las horas semanales del curso.');
      return;
    }

    if (this.form.invalid) {
      this.planControls.markAllAsTouched();
      this.saveError.set('Completa la hora de inicio y los datos visibles antes de guardar.');
      return;
    }

    const payload: ScheduleBlockRequest[] = this.selectedDays().map((day) => {
      const plan = this.planForDay(day);
      return {
        diaSemana: day,
        horaInicio: plan.get('horaInicio')?.value as string,
        horaFin: this.endTimeFor(day),
        duracionMin: 45,
        tipoSesion: this.cleanText(plan.get('tipoSesion')?.value as string),
        ubicacion: this.cleanText(plan.get('ubicacion')?.value as string),
        urlVirtual: this.cleanText(plan.get('urlVirtual')?.value as string)
      };
    });

    this.isSaving.set(true);
    this.meUseCase.updateCourseSchedule(course.usuarioPeriodoCursoId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set('Horario guardado correctamente.');
      },
      error: (error) => {
        this.isSaving.set(false);
        this.saveError.set(typeof error?.error === 'string' ? error.error : 'No se pudo guardar el horario del curso.');
      }
    });
  }

  private hydratePlans(usuarioPeriodoCursoId: number, schedules: MyScheduleEntry[]): void {
    this.planControls.clear();

    const selected = schedules
      .filter((item) => item.usuarioPeriodoCursoId === usuarioPeriodoCursoId)
      .sort((a, b) => (a.diaSemana ?? 0) - (b.diaSemana ?? 0) || (a.bloqueNro ?? 0) - (b.bloqueNro ?? 0));

    if (selected.length === 0) {
      this.selectedDays.set([]);
      this.currentStep.set(1);
      this.bumpRevision();
      return;
    }

    const grouped = new Map<number, MyScheduleEntry[]>();
    selected.forEach((entry) => {
      const day = entry.diaSemana ?? 1;
      const existing = grouped.get(day) ?? [];
      existing.push(entry);
      grouped.set(day, existing);
    });

    const days = [...grouped.keys()].sort((a, b) => a - b);
    this.selectedDays.set(days);

    days.forEach((day) => {
      const entries = grouped.get(day) ?? [];
      const first = entries[0];
      const totalBlocks = entries.reduce(
        (sum, entry) => sum + this.blocksBetween(entry.horaInicio, entry.horaFin, entry.duracionMin ?? 45),
        0
      );

      this.planControls.push(this.createPlanGroup({
        diaSemana: day,
        bloques: Math.max(totalBlocks, 1),
        horaInicio: first?.horaInicio ?? '07:00',
        tipoSesion: first?.tipoSesion ?? 'Teoria',
        ubicacion: first?.ubicacion ?? '',
        urlVirtual: first?.urlVirtual ?? ''
      }));
    });

    this.currentStep.set(this.canAdvanceToTimeStep() ? 3 : 2);
    this.bumpRevision();
  }

  private addPlan(day: number): void {
    this.planControls.push(this.createPlanGroup({ diaSemana: day }));
    this.sortPlans();
  }

  private removePlan(day: number): void {
    const index = this.planControls.controls.findIndex((control) => Number(control.get('diaSemana')?.value) === day);
    if (index >= 0) {
      this.planControls.removeAt(index);
    }
  }

  private sortPlans(): void {
    const sorted = [...this.planControls.controls]
      .map((control) => control.value)
      .sort((a, b) => Number(a.diaSemana) - Number(b.diaSemana));

    this.planControls.clear();
    sorted.forEach((value) => this.planControls.push(this.createPlanGroup(value)));
    this.bumpRevision();
  }

  private createPlanGroup(value?: Partial<{ diaSemana: number; bloques: number; horaInicio: string; tipoSesion: string; ubicacion: string; urlVirtual: string }>): UntypedFormGroup {
    return this.formBuilder.group({
      diaSemana: [value?.diaSemana ?? 1, [Validators.required, Validators.min(1), Validators.max(7)]],
      bloques: [value?.bloques ?? 1, [Validators.required, Validators.min(1)]],
      horaInicio: [value?.horaInicio ?? '07:00', Validators.required],
      tipoSesion: [value?.tipoSesion ?? 'Teoria'],
      ubicacion: [value?.ubicacion ?? ''],
      urlVirtual: [value?.urlVirtual ?? '']
    });
  }

  private buildTimeOptions(): string[] {
    const options: string[] = [];
    let totalMinutes = 7 * 60;
    while (totalMinutes <= 23 * 60 + 15) {
      options.push(this.minutesToTime(totalMinutes));
      totalMinutes += 45;
    }
    return options;
  }

  private calculateEndTime(startTime: string, blocks: number): string {
    const start = this.timeToMinutes(startTime);
    return this.minutesToTime(start + blocks * 45);
  }

  private blocksBetween(horaInicio: string | null, horaFin: string | null, duration: number): number {
    if (!horaInicio || !horaFin) {
      return 1;
    }

    const diff = this.timeToMinutes(horaFin) - this.timeToMinutes(horaInicio);
    if (diff <= 0 || duration <= 0) {
      return 1;
    }

    return Math.max(Math.round(diff / duration), 1);
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private cleanText(value: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private bumpRevision(): void {
    this.formRevision.update((value) => value + 1);
  }
}