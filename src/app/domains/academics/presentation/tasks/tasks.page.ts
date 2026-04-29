import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import {
  MeUseCase,
  MyCalendarSyncAccount,
  MyCourse,
  MyReminder,
  MyTask,
  TaskUpsertRequest
} from '../../application/me-use-case';
import { apiErrorMessage } from '../../../identity/infrastructure/http/api-error.interceptor';

type TaskStatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';
type TaskColumnKey = 'pending' | 'in_progress' | 'completed' | 'overdue';
type TaskPriorityTone = 'high' | 'medium' | 'low' | 'neutral';
type TaskFormMode = 'create' | 'edit';

interface TaskDraft {
  usuarioPeriodoCursoId: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  prioridad: string;
  estado: string;
  fechaVencimiento: string;
  fechaRecordatorio: string;
  canalRecordatorio: string;
}

interface TaskColumn {
  key: TaskColumnKey;
  label: string;
  helper: string;
  empty: string;
  tasks: MyTask[];
}

@Component({
  selector: 'app-tasks-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss'
})
export class TasksPage implements OnInit {
  private readonly meUseCase = inject(MeUseCase);
  private readonly route = inject(ActivatedRoute);

  isLoading = true;
  isSaving = false;
  deletingTaskId: number | null = null;
  isSyncingCalendar = false;

  loadError = '';
  actionError = '';
  actionSuccess = '';

  tasks: MyTask[] = [];
  courses: MyCourse[] = [];
  reminders: MyReminder[] = [];
  calendarSyncAccounts: MyCalendarSyncAccount[] = [];

  selectedCourseId = 'all';
  selectedStatus: TaskStatusFilter = 'all';
  searchQuery = '';
  isComposerOpen = true;
  formMode: TaskFormMode = 'create';
  editingTaskId: number | null = null;

  draft: TaskDraft = this.createEmptyDraft();

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('new') === '1') {
      this.isComposerOpen = true;
    }

    this.loadSnapshot();
  }

  get activeTasks(): MyTask[] {
    return this.tasks.filter((task) => this.normalizedStatus(task) !== 'completed');
  }

  get completedTasks(): MyTask[] {
    return this.tasks.filter((task) => this.normalizedStatus(task) === 'completed');
  }

  get overdueTasksCount(): number {
    return this.tasks.filter((task) => this.isOverdue(task)).length;
  }

  get reminderTasksCount(): number {
    return this.tasks.filter((task) => !!task.fechaRecordatorio && this.normalizedStatus(task) !== 'completed').length;
  }

  get connectedGoogleCalendar(): MyCalendarSyncAccount | null {
    return this.calendarSyncAccounts.find((account) => account.provider === 'google' && account.conectado) ?? null;
  }

  get courseOptions(): Array<{ value: string; label: string }> {
    return this.courses
      .map((course) => ({
        value: `${course.usuarioPeriodoCursoId}`,
        label: `${course.codigo} · ${course.nombre}`
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  get visibleTasks(): MyTask[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.tasks
      .filter((task) => {
        const matchesCourse = this.selectedCourseId === 'all'
          || `${task.usuarioPeriodoCursoId ?? ''}` === this.selectedCourseId;
        const matchesStatus = this.matchesStatusFilter(task);
        const matchesQuery = !query || [
          task.titulo,
          task.descripcion,
          task.codigoCurso,
          task.nombreCurso,
          task.tipo,
          task.prioridad
        ].filter(Boolean).some((value) => value!.toLowerCase().includes(query));

        return matchesCourse && matchesStatus && matchesQuery;
      })
      .sort((left, right) => this.taskSortValue(left) - this.taskSortValue(right));
  }

  get taskColumns(): TaskColumn[] {
    const source = this.visibleTasks;

    if (this.selectedStatus === 'overdue') {
      return [{
        key: 'overdue',
        label: 'Vencidas',
        helper: 'Lo que ya debio moverse y necesita reaccion inmediata.',
        empty: 'No hay tareas vencidas con los filtros actuales.',
        tasks: source.filter((task) => this.isOverdue(task))
      }];
    }

    if (this.selectedStatus === 'pending') {
      return [{
        key: 'pending',
        label: 'Pendientes',
        helper: 'Trabajo abierto que aun no empieza o sigue en cola.',
        empty: 'No hay tareas pendientes con esos filtros.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'pending')
      }];
    }

    if (this.selectedStatus === 'in_progress') {
      return [{
        key: 'in_progress',
        label: 'En progreso',
        helper: 'Bloques que ya estas ejecutando y conviene cerrar pronto.',
        empty: 'No hay tareas en progreso ahora mismo.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'in_progress')
      }];
    }

    if (this.selectedStatus === 'completed') {
      return [{
        key: 'completed',
        label: 'Completadas',
        helper: 'Registro historico de lo que ya cerraste.',
        empty: 'Aun no hay tareas completadas con este filtro.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'completed')
      }];
    }

    return [
      {
        key: 'pending',
        label: 'Pendientes',
        helper: 'Todo lo que sigue abierto y aun no empieza.',
        empty: 'No hay tareas pendientes.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'pending')
      },
      {
        key: 'in_progress',
        label: 'En progreso',
        helper: 'Trabajo activo que ya deberia empujar tu semana.',
        empty: 'No hay tareas en progreso.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'in_progress')
      },
      {
        key: 'completed',
        label: 'Completadas',
        helper: 'Cierres listos para que no pierdas contexto.',
        empty: 'No hay tareas completadas.',
        tasks: source.filter((task) => this.normalizedStatus(task) === 'completed')
      }
    ];
  }

  get upcomingReminders(): MyReminder[] {
    return [...this.reminders]
      .filter((item) => item.estado !== 'cancelado')
      .sort((left, right) => this.reminderSortValue(left) - this.reminderSortValue(right))
      .slice(0, 6);
  }

  setStatus(filter: TaskStatusFilter): void {
    this.selectedStatus = filter;
  }

  openCreateComposer(): void {
    this.isComposerOpen = true;
    this.formMode = 'create';
    this.editingTaskId = null;
    this.draft = this.createEmptyDraft();
    this.actionError = '';
    this.actionSuccess = '';
  }

  editTask(task: MyTask): void {
    this.isComposerOpen = true;
    this.formMode = 'edit';
    this.editingTaskId = task.id;
    this.draft = {
      usuarioPeriodoCursoId: task.usuarioPeriodoCursoId ? `${task.usuarioPeriodoCursoId}` : '',
      titulo: task.titulo,
      descripcion: task.descripcion ?? '',
      tipo: task.tipo ?? 'tarea',
      prioridad: task.prioridad ?? 'media',
      estado: this.taskStatusValue(task),
      fechaVencimiento: this.toDateTimeLocal(task.fechaVencimiento),
      fechaRecordatorio: this.toDateTimeLocal(task.fechaRecordatorio),
      canalRecordatorio: task.canalRecordatorio ?? 'app'
    };
    this.actionError = '';
    this.actionSuccess = '';
  }

  focusTaskFromReminder(reminder: MyReminder): void {
    const task = this.tasks.find((item) => item.id === reminder.tareaId);
    if (task) {
      this.editTask(task);
    }
  }

  markCompleted(task: MyTask, completed: boolean): void {
    const current = this.normalizedStatus(task);
    const nextStatus = completed ? 'completada' : 'pendiente';

    if ((completed && current === 'completed') || (!completed && current !== 'completed')) {
      return;
    }

    this.mutateTask(task.id, {
      usuarioPeriodoCursoId: task.usuarioPeriodoCursoId,
      titulo: task.titulo,
      descripcion: task.descripcion,
      tipo: task.tipo,
      prioridad: task.prioridad,
      estado: nextStatus,
      fechaVencimiento: task.fechaVencimiento,
      fechaRecordatorio: task.fechaRecordatorio,
      canalRecordatorio: task.canalRecordatorio
    }, completed ? 'Tarea marcada como completada.' : 'Tarea reabierta.');
  }

  deleteTask(task: MyTask): void {
    if (this.deletingTaskId || !window.confirm(`Se eliminara "${task.titulo}". Quieres continuar?`)) {
      return;
    }

    this.deletingTaskId = task.id;
    this.actionError = '';
    this.actionSuccess = '';

    this.meUseCase.deleteTask(task.id).subscribe({
      next: () => {
        this.deletingTaskId = null;
        if (this.editingTaskId === task.id) {
          this.openCreateComposer();
        }
        this.refreshAfterMutation('Tarea eliminada.');
      },
      error: (error) => {
        this.deletingTaskId = null;
        this.actionError = apiErrorMessage(error, 'No se pudo eliminar la tarea.');
      }
    });
  }

  submitTask(): void {
    if (this.isSaving) {
      return;
    }

    const validationError = this.validateDraft();
    if (validationError) {
      this.actionError = validationError;
      this.actionSuccess = '';
      return;
    }

    const payload = this.toPayload();
    this.isSaving = true;
    this.actionError = '';
    this.actionSuccess = '';

    if (this.formMode === 'edit' && this.editingTaskId) {
      this.mutateTask(this.editingTaskId, payload, 'Tarea actualizada.');
      return;
    }

    this.meUseCase.createTask(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.openCreateComposer();
        this.refreshAfterMutation('Tarea creada.');
      },
      error: (error) => {
        this.isSaving = false;
        this.actionError = apiErrorMessage(error, 'No se pudo crear la tarea.');
      }
    });
  }

  cancelEdit(): void {
    this.openCreateComposer();
  }

  dueLabel(task: MyTask): string {
    if (!task.fechaVencimiento) {
      return 'Sin vencimiento';
    }

    return this.formatDateTime(task.fechaVencimiento);
  }

  reminderLabel(task: MyTask): string {
    if (!task.fechaRecordatorio) {
      return 'Sin recordatorio';
    }

    return this.formatDateTime(task.fechaRecordatorio);
  }

  reminderDateLabel(reminder: MyReminder): string {
    if (!reminder.fechaEnvio) {
      return 'Sin fecha';
    }

    return this.formatDateTime(reminder.fechaEnvio);
  }

  taskTypeLabel(task: MyTask): string {
    switch ((task.tipo ?? '').toLowerCase()) {
      case 'entrega':
        return 'Entrega';
      case 'estudio':
        return 'Estudio';
      case 'otro':
        return 'Otro';
      default:
        return 'Tarea';
    }
  }

  taskPriorityLabel(task: MyTask): string {
    switch ((task.prioridad ?? '').toLowerCase()) {
      case 'alta':
        return 'Alta';
      case 'baja':
        return 'Baja';
      default:
        return 'Media';
    }
  }

  taskPriorityTone(task: MyTask): TaskPriorityTone {
    switch ((task.prioridad ?? '').toLowerCase()) {
      case 'alta':
        return 'high';
      case 'baja':
        return 'low';
      case 'media':
        return 'medium';
      default:
        return 'neutral';
    }
  }

  taskStatusLabel(task: MyTask): string {
    switch (this.normalizedStatus(task)) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
        return 'En progreso';
      default:
        return this.isOverdue(task) ? 'Vencida' : 'Pendiente';
    }
  }

  private loadSnapshot(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      tasks: this.meUseCase.getMyTasks(),
      courses: this.meUseCase.getMyCourses(),
      reminders: this.meUseCase.getMyReminders().pipe(catchError(() => of([]))),
      syncAccounts: this.meUseCase.getCalendarSyncAccounts().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ tasks, courses, reminders, syncAccounts }) => {
        this.tasks = tasks;
        this.courses = courses;
        this.reminders = reminders;
        this.calendarSyncAccounts = syncAccounts;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudieron cargar tus tareas manuales.';
        this.isLoading = false;
      }
    });
  }

  private mutateTask(taskId: number, payload: TaskUpsertRequest, successMessage: string): void {
    this.isSaving = true;
    this.meUseCase.updateTask(taskId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.refreshAfterMutation(successMessage);
      },
      error: (error) => {
        this.isSaving = false;
        this.actionError = apiErrorMessage(error, 'No se pudo actualizar la tarea.');
      }
    });
  }

  private refreshAfterMutation(successMessage: string): void {
    if (!this.connectedGoogleCalendar) {
      this.actionSuccess = successMessage;
      this.actionError = '';
      this.reloadData();
      return;
    }

    this.isSyncingCalendar = true;
    this.actionSuccess = `${successMessage} Actualizando Google Calendar...`;
    this.actionError = '';

    this.meUseCase.syncGoogleCalendar().subscribe({
      next: () => {
        this.isSyncingCalendar = false;
        this.actionSuccess = `${successMessage} Google Calendar quedo al dia.`;
        this.actionError = '';
        this.reloadData();
      },
      error: (error) => {
        this.isSyncingCalendar = false;
        this.actionSuccess = '';
        this.actionError = apiErrorMessage(error, `${successMessage} El cambio local quedo guardado, pero Google Calendar no se pudo actualizar.`);
        this.reloadData();
      }
    });
  }

  private reloadData(): void {
    forkJoin({
      tasks: this.meUseCase.getMyTasks(),
      reminders: this.meUseCase.getMyReminders().pipe(catchError(() => of([]))),
      syncAccounts: this.meUseCase.getCalendarSyncAccounts().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ tasks, reminders, syncAccounts }) => {
        this.tasks = tasks;
        this.reminders = reminders;
        this.calendarSyncAccounts = syncAccounts;
      },
      error: (error) => {
        this.actionError = apiErrorMessage(error, 'Se guardo el cambio, pero no se pudo recargar la vista de tareas.');
      }
    });
  }

  private validateDraft(): string {
    if (!this.draft.titulo.trim()) {
      return 'Ponle un titulo a la tarea antes de guardarla.';
    }

    if (this.draft.fechaRecordatorio && this.draft.fechaVencimiento) {
      const reminder = new Date(this.draft.fechaRecordatorio).getTime();
      const due = new Date(this.draft.fechaVencimiento).getTime();
      if (Number.isFinite(reminder) && Number.isFinite(due) && reminder > due) {
        return 'El recordatorio no puede quedar despues del vencimiento.';
      }
    }

    return '';
  }

  private toPayload(): TaskUpsertRequest {
    return {
      usuarioPeriodoCursoId: this.draft.usuarioPeriodoCursoId ? Number(this.draft.usuarioPeriodoCursoId) : null,
      titulo: this.draft.titulo.trim(),
      descripcion: this.cleanText(this.draft.descripcion),
      tipo: this.cleanText(this.draft.tipo),
      prioridad: this.cleanText(this.draft.prioridad),
      estado: this.cleanText(this.draft.estado),
      fechaVencimiento: this.draft.fechaVencimiento ? new Date(this.draft.fechaVencimiento).toISOString() : null,
      fechaRecordatorio: this.draft.fechaRecordatorio ? new Date(this.draft.fechaRecordatorio).toISOString() : null,
      canalRecordatorio: this.draft.fechaRecordatorio ? (this.cleanText(this.draft.canalRecordatorio) ?? 'app') : null
    };
  }

  private createEmptyDraft(): TaskDraft {
    return {
      usuarioPeriodoCursoId: '',
      titulo: '',
      descripcion: '',
      tipo: 'tarea',
      prioridad: 'media',
      estado: 'pendiente',
      fechaVencimiento: '',
      fechaRecordatorio: '',
      canalRecordatorio: 'app'
    };
  }

  private normalizedStatus(task: MyTask): 'pending' | 'in_progress' | 'completed' {
    const raw = (task.estado ?? '').toLowerCase();
    if (raw === 'completada') {
      return 'completed';
    }
    if (raw === 'en_progreso') {
      return 'in_progress';
    }
    return 'pending';
  }

  private taskStatusValue(task: MyTask): string {
    const raw = (task.estado ?? '').toLowerCase();
    if (raw === 'completada' || raw === 'en_progreso' || raw === 'pendiente') {
      return raw;
    }
    return 'pendiente';
  }

  private matchesStatusFilter(task: MyTask): boolean {
    switch (this.selectedStatus) {
      case 'pending':
        return this.normalizedStatus(task) === 'pending';
      case 'in_progress':
        return this.normalizedStatus(task) === 'in_progress';
      case 'completed':
        return this.normalizedStatus(task) === 'completed';
      case 'overdue':
        return this.isOverdue(task);
      default:
        return true;
    }
  }

  private isOverdue(task: MyTask): boolean {
    if (this.normalizedStatus(task) === 'completed' || !task.fechaVencimiento) {
      return false;
    }

    return new Date(task.fechaVencimiento).getTime() < Date.now();
  }

  private taskSortValue(task: MyTask): number {
    if (this.normalizedStatus(task) === 'completed') {
      return -(new Date(task.updatedAt).getTime());
    }

    if (task.fechaVencimiento) {
      return new Date(task.fechaVencimiento).getTime();
    }

    return Number.MAX_SAFE_INTEGER - new Date(task.createdAt).getTime();
  }

  private reminderSortValue(reminder: MyReminder): number {
    if (!reminder.fechaEnvio) {
      return Number.MAX_SAFE_INTEGER;
    }
    return new Date(reminder.fechaEnvio).getTime();
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  private toDateTimeLocal(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private cleanText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
