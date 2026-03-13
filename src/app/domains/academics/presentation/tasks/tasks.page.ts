import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MeUseCase, MyEvaluation } from '../../application/me-use-case';

type TaskStatusFilter = 'all' | 'pending' | 'done';

interface TaskItem {
  usuarioPeriodoCursoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  titulo: string;
  subtitulo: string;
  fechaLabel: string;
  fechaSort: number;
  estado: 'pending' | 'done';
  urgencia: 'atrasada' | 'hoy' | 'proxima' | 'sin-fecha' | 'completada';
  porcentaje: string;
}

@Component({
  selector: 'app-tasks-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss'
})
export class TasksPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);

  isLoading = true;
  loadError = '';
  evaluations: MyEvaluation[] = [];
  selectedCourseId = 'all';
  searchQuery = '';
  selectedStatus: TaskStatusFilter = 'all';

  ngOnInit(): void {
    this.meUseCase.getMyEvaluations().subscribe({
      next: (evaluations) => {
        this.evaluations = evaluations;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudieron cargar tus tareas derivadas del silabo.';
        this.isLoading = false;
      }
    });
  }

  get courseOptions(): Array<{ value: string; label: string }> {
    const unique = new Map<string, string>();
    this.taskItems.forEach((item) => {
      unique.set(`${item.usuarioPeriodoCursoId}`, `${item.codigoCurso} · ${item.nombreCurso}`);
    });
    return [...unique.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  get taskItems(): TaskItem[] {
    return this.evaluations
      .filter((item) => this.isTaskLike(item))
      .map((item) => this.toTaskItem(item));
  }

  get filteredTasks(): TaskItem[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.taskItems.filter((item) => {
      const matchesCourse = this.selectedCourseId === 'all' || `${item.usuarioPeriodoCursoId}` === this.selectedCourseId;
      const matchesStatus = this.selectedStatus === 'all' || item.estado === this.selectedStatus;
      const matchesQuery = !query || [
        item.codigoCurso,
        item.nombreCurso,
        item.titulo,
        item.subtitulo
      ].some((value) => value.toLowerCase().includes(query));

      return matchesCourse && matchesStatus && matchesQuery;
    }).sort((left, right) => left.fechaSort - right.fechaSort);
  }

  get stats() {
    return {
      total: this.filteredTasks.length,
      pending: this.filteredTasks.filter((item) => item.estado === 'pending').length,
      done: this.filteredTasks.filter((item) => item.estado === 'done').length,
      urgent: this.filteredTasks.filter((item) => item.urgencia === 'atrasada' || item.urgencia === 'hoy').length
    };
  }

  urgencyLabel(item: TaskItem): string {
    switch (item.urgencia) {
      case 'atrasada':
        return 'Atrasada';
      case 'hoy':
        return 'Hoy';
      case 'proxima':
        return 'Proxima';
      case 'completada':
        return 'Completada';
      default:
        return 'Sin fecha';
    }
  }

  urgencyTone(item: TaskItem): string {
    switch (item.urgencia) {
      case 'atrasada':
        return 'task-chip--danger';
      case 'hoy':
        return 'task-chip--warning';
      case 'proxima':
        return 'task-chip--brand';
      case 'completada':
        return 'task-chip--success';
      default:
        return 'task-chip--neutral';
    }
  }

  private isTaskLike(item: MyEvaluation): boolean {
    const source = `${item.evaluacionCodigo} ${item.tipo ?? ''} ${item.descripcion ?? ''}`.toLowerCase();
    if (source.includes('examen') || source.includes('parcial') || source.includes('final')) {
      return false;
    }

    return ['laboratorio', 'lab', 'proyecto', 'tarea', 'trabajo', 'avance', 'practica', 'práctica', 'entrega']
      .some((keyword) => source.includes(keyword));
  }

  private toTaskItem(item: MyEvaluation): TaskItem {
    const date = item.fechaEstimada ? new Date(`${item.fechaEstimada}T00:00:00`) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let urgencia: TaskItem['urgencia'] = 'sin-fecha';
    if (item.nota != null) {
      urgencia = 'completada';
    } else if (date) {
      if (date.getTime() < today.getTime()) {
        urgencia = 'atrasada';
      } else if (date.getTime() === today.getTime()) {
        urgencia = 'hoy';
      } else {
        urgencia = 'proxima';
      }
    }

    return {
      usuarioPeriodoCursoId: item.usuarioPeriodoCursoId,
      cursoId: item.cursoId,
      codigoCurso: item.codigoCurso,
      nombreCurso: item.nombreCurso,
      titulo: item.evaluacionCodigo,
      subtitulo: item.descripcion || item.tipo || 'Entregable del curso',
      fechaLabel: item.fechaEstimada
        ? new Date(item.fechaEstimada).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
        : 'Fecha por definir',
      fechaSort: date ? date.getTime() : Number.MAX_SAFE_INTEGER,
      estado: item.nota != null ? 'done' : 'pending',
      urgencia,
      porcentaje: item.porcentaje != null ? `${item.porcentaje}%` : 'Sin peso'
    };
  }
}
