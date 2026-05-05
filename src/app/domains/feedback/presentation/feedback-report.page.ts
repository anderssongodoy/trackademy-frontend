import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FeedbackUseCase } from '../application/feedback-use-case';
import { CreateFeedbackReportRequest, FeedbackReport } from '../domain/feedback-report.model';
import { ImageCompressionService } from '../infrastructure/services/image-compression.service';

@Component({
  selector: 'app-feedback-report-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './feedback-report.page.html',
  styleUrls: ['./feedback-report.page.scss']
})
export class FeedbackReportPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly feedbackUseCase = inject(FeedbackUseCase);
  private readonly imageCompressionService = inject(ImageCompressionService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  form!: FormGroup;
  isSubmitting = signal(false);
  submitError = signal('');
  submitSuccess = signal(false);
  selectedFiles: File[] = [];
  imagePreview = signal<string | null>(null);

  readonly feedbackTypes = [
    { value: 'sugerencia', label: 'Sugerencia' },
    { value: 'error', label: 'Error/Bug' },
    { value: 'silabo_desactualizado', label: 'Sílabo Desactualizado' },
    { value: 'curso_faltante', label: 'Curso Faltante' },
    { value: 'otro', label: 'Otro' }
  ];

  ngOnInit() {
    this.initForm();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.form = this.fb.group({
      tipo: ['sugerencia', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]],
      descripcion: ['', [Validators.required, Validators.minLength(20)]],
      paginaActual: [this.getCurrentPageName(), Validators.required]
    });
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  onFilePickerClick(input: HTMLInputElement): void {
    input.click();
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processImageFile(file);
    }
  }

  private processImageFile(file: File): void {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.submitError.set('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB antes de comprimir)
    if (file.size > 5 * 1024 * 1024) {
      this.submitError.set('La imagen no debe superar 5 MB');
      return;
    }

    this.selectedFiles = [file];

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    this.submitError.set('');
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.submitError.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');

    try {
      // Procesar imagen si se seleccionó
      let imagenBase64: string | undefined;
      if (this.selectedFiles.length > 0) {
        try {
          imagenBase64 = await this.imageCompressionService.compressAndConvertToBase64(this.selectedFiles[0]);
        } catch (error) {
          this.isSubmitting.set(false);
          this.submitError.set('Error al procesar la imagen. Intenta con otra.');
          return;
        }
      }

      const request: CreateFeedbackReportRequest = {
        ...this.form.getRawValue(),
        imagenBase64
      };

      this.feedbackUseCase.crearReporte(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: FeedbackReport) => {
            this.submitSuccess.set(true);
            this.showSuccessMessage(response.numeroReporte);
            this.form.reset();
            this.selectedFiles = [];
            this.imagePreview.set(null);
            
            setTimeout(() => {
              this.router.navigate(['/app/dashboard']);
            }, 2000);
          },
          error: (error: any) => {
            this.isSubmitting.set(false);
            this.submitError.set(error.error?.message || 'Error al enviar el reporte. Intenta de nuevo.');
          }
        });
    } catch (error) {
      this.isSubmitting.set(false);
      this.submitError.set('Error procesando el reporte');
    }
  }

  private getCurrentPageName(): string {
    const path = window.location.pathname;
    const pageMap: Record<string, string> = {
      '/app/dashboard': 'Dashboard',
      '/app/cursos': 'Mis Cursos',
      '/app/horario': 'Horario',
      '/app/calendario': 'Calendario',
      '/app/tareas': 'Tareas',
      '/app/evaluaciones': 'Evaluaciones'
    };

    for (const [route, name] of Object.entries(pageMap)) {
      if (path.includes(route)) {
        return name;
      }
    }

    return path || 'Sistema';
  }

  private showSuccessMessage(numeroReporte: string) {
    alert(`✓ Reporte enviado exitosamente\nNúmero: ${numeroReporte}\nTe redirigiremos al dashboard...`);
  }

  get tipo() {
    return this.form.get('tipo');
  }

  get motivo() {
    return this.form.get('motivo');
  }

  get descripcion() {
    return this.form.get('descripcion');
  }

}
