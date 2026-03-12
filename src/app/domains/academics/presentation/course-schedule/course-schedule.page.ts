import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

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
export class CourseSchedulePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);

  readonly dayOptions: DayOption[] = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  readonly sessionTypes = ['Teoría', 'Práctica', 'Laboratorio', 'Asesoría'];
  readonly timeOptions = this.buildTimeOptions();

  readonly form = this.formBuilder.group({
    bloques: this.formBuilder.array([])
  });

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly course = signal<MyCourse | null>(null);
  readonly catalogCourse = signal<CatalogCourse | null>(null);

  readonly totalBlocks = computed(() => this.catalogCourse()?.horasSemanales ?? 0);
  readonly assignedBlocks = computed(() =>
    this.blockControls.controls.reduce((total, control) => total + Number(control.get('bloques')?.value ?? 0), 0)
  );
  readonly remainingBlocks = computed(() => Math.max(this.totalBlocks() - this.assignedBlocks(), 0));

  get blockControls(): FormArray {
    return this.form.controls.bloques as FormArray;
  }

  ngOnInit(): void {
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
            this.hydrateSchedule(course, schedules.filter((item) => item.usuarioPeriodoCursoId === id));
            this.isLoading.set(false);
          },
          error: () => {
            this.hydrateSchedule(course, schedules.filter((item) => item.usuarioPeriodoCursoId === id));
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('No se pudo cargar la configuración del curso.');
      }
    });
  }

  addBlock(): void {
    const start = this.remainingBlocks() > 0 ? this.remainingBlocks() : 1;
    this.blockControls.push(this.createBlockGroup({ bloques: Math.min(start, 2) }));
  }

  removeBlock(index: number): void {
    this.blockControls.removeAt(index);
    if (this.blockControls.length === 0) {
      this.addBlock();
    }
  }

  availableBlockOptions(index: number): number[] {
    const startValue = this.blockControls.at(index).get('horaInicio')?.value as string;
    const currentValue = Number(this.blockControls.at(index).get('bloques')?.value ?? 1);
    const maxBlocks = this.maxBlocksForStart(startValue);
    const options = Array.from({ length: maxBlocks }, (_, item) => item + 1);
    if (!options.includes(currentValue)) {
      this.blockControls.at(index).get('bloques')?.setValue(options[options.length - 1] ?? 1);
    }
    return options;
  }

  endTimeFor(index: number): string {
    const startValue = this.blockControls.at(index).get('horaInicio')?.value as string;
    const blocks = Number(this.blockControls.at(index).get('bloques')?.value ?? 1);
    return this.calculateEndTime(startValue, blocks);
  }

  goBack(): void {
    const course = this.course();
    if (!course) {
      return;
    }
    this.router.navigate(['/app/cursos', course.usuarioPeriodoCursoId]);
  }

  save(): void {
    const course = this.course();
    if (!course) {
      return;
    }

    this.saveError.set('');
    this.saveSuccess.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Completa todos los bloques con día y hora válida.');
      return;
    }

    const payload: ScheduleBlockRequest[] = this.blockControls.controls.map((control, index) => ({
      diaSemana: Number(control.get('diaSemana')?.value),
      horaInicio: control.get('horaInicio')?.value as string,
      horaFin: this.endTimeFor(index),
      duracionMin: 45,
      tipoSesion: this.cleanText(control.get('tipoSesion')?.value as string),
      ubicacion: this.cleanText(control.get('ubicacion')?.value as string),
      urlVirtual: this.cleanText(control.get('urlVirtual')?.value as string)
    }));

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

  private hydrateSchedule(course: MyCourse, schedules: MyScheduleEntry[]): void {
    this.blockControls.clear();
    if (schedules.length === 0) {
      this.blockControls.push(this.createBlockGroup());
      return;
    }

    const sorted = [...schedules].sort((a, b) => (a.bloqueNro ?? 0) - (b.bloqueNro ?? 0));
    sorted.forEach((entry) => {
      const blocks = this.blocksBetween(entry.horaInicio, entry.horaFin, entry.duracionMin ?? 45);
      this.blockControls.push(this.createBlockGroup({
        diaSemana: entry.diaSemana ?? 1,
        horaInicio: entry.horaInicio ?? '07:00',
        bloques: blocks,
        tipoSesion: entry.tipoSesion ?? '',
        ubicacion: entry.ubicacion ?? '',
        urlVirtual: entry.urlVirtual ?? ''
      }));
    });
  }

  private createBlockGroup(value?: Partial<{ diaSemana: number; horaInicio: string; bloques: number; tipoSesion: string; ubicacion: string; urlVirtual: string }>) {
    return this.formBuilder.group({
      diaSemana: [value?.diaSemana ?? 1, [Validators.required, Validators.min(1), Validators.max(7)]],
      horaInicio: [value?.horaInicio ?? '07:00', Validators.required],
      bloques: [value?.bloques ?? 1, [Validators.required, Validators.min(1)]],
      tipoSesion: [value?.tipoSesion ?? 'Teoría'],
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

  private maxBlocksForStart(startTime: string): number {
    const start = this.timeToMinutes(startTime);
    const endOfDay = 24 * 60;
    return Math.max(Math.floor((endOfDay - start) / 45), 1);
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
}

