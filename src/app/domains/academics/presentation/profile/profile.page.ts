import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';

import { MeUseCase, MyCurrentPeriod } from '../../application/me-use-case';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);
  private readonly fb = inject(UntypedFormBuilder);

  readonly form = this.fb.group({
    metaPromedioCiclo: [14, [Validators.required, Validators.min(0), Validators.max(20)]],
    horasEstudioSemanaObjetivo: [8, [Validators.required, Validators.min(1), Validators.max(80)]]
  });

  isLoading = true;
  isSaving = false;
  loadError = '';
  saveError = '';
  saveSuccess = '';
  period: MyCurrentPeriod | null = null;

  ngOnInit(): void {
    this.loadProfile();
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

  saveProfile(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = '';

    const value = this.form.getRawValue();

    this.meUseCase.updateAcademicProfile({
      metaPromedioCiclo: Number(value.metaPromedioCiclo),
      horasEstudioSemanaObjetivo: Number(value.horasEstudioSemanaObjetivo)
    }).subscribe({
      next: (period) => {
        this.period = period;
        this.patchForm(period);
        this.isSaving = false;
        this.saveSuccess = 'Objetivos actualizados.';
      },
      error: () => {
        this.isSaving = false;
        this.saveError = 'No se pudo actualizar tu perfil academico.';
      }
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.loadError = '';

    this.meUseCase.getCurrentPeriod().subscribe({
      next: (period) => {
        this.period = period;
        this.patchForm(period);
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu perfil academico actual.';
        this.isLoading = false;
      }
    });
  }

  private patchForm(period: MyCurrentPeriod): void {
    this.form.patchValue({
      metaPromedioCiclo: period.metaPromedioCiclo ?? 14,
      horasEstudioSemanaObjetivo: period.horasEstudioSemanaObjetivo ?? 8
    });
  }
}
