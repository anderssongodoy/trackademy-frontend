import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyEvaluation } from '../../application/me-use-case';

@Component({
  selector: 'app-notes-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.scss'
})
export class NotesPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  evaluations: MyEvaluation[] = [];

  ngOnInit(): void {
    this.meUseCase.getMyEvaluations().subscribe({
      next: (evaluations) => {
        this.evaluations = evaluations;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudieron cargar tus evaluaciones.';
        this.isLoading = false;
      }
    });
  }

  get pending(): MyEvaluation[] {
    return this.evaluations.filter((item) => item.nota == null);
  }

  get completed(): MyEvaluation[] {
    return this.evaluations.filter((item) => item.nota != null);
  }
}
