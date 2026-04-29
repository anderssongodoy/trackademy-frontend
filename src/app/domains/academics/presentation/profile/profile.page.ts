import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, interval } from 'rxjs';

import { CatalogCampus, CatalogCareer, CatalogCourse, CatalogUseCase } from '../../application/catalog-use-case';
import { MeUseCase, MyCalendarSyncAccount, MyCourse, MyCurrentPeriod } from '../../application/me-use-case';
import { WhatsappLinkCodeResponse, WhatsappLinkStatusResponse, WhatsappUseCase } from '../../application/whatsapp-use-case';
import { AuthUseCase } from '../../../identity/application/auth-use-case';
import { apiErrorMessage } from '../../../identity/infrastructure/http/api-error.interceptor';

type CatalogCycleFilter = number | 'all';

interface SelectedCourseView {
  id: number;
  label: string;
  code: string;
  name: string;
  credits: number | null;
  weeklyHours: number | null;
  modality: string | null;
  cycle: number | null;
}

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private static readonly AUTO_SYNC_STALE_MS = 15 * 60 * 1000;
  private readonly meUseCase = inject(MeUseCase);
  private readonly catalogUseCase = inject(CatalogUseCase);
  private readonly whatsappUseCase = inject(WhatsappUseCase);
  private readonly authUseCase = inject(AuthUseCase);
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private whatsappPollingSubscription: Subscription | null = null;
  private hasHandledCalendarOAuthReturn = false;

  readonly personalForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    nombrePreferido: [''],
    emailInstitucional: ['', [Validators.email]]
  });

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
  isSavingPersonal = false;
  isSavingGoals = false;
  isSavingConfig = false;
  isCoursesLoading = false;
  isWhatsappLoading = true;
  isGeneratingWhatsappCode = false;
  isUnlinkingWhatsapp = false;
  isSyncingGoogleCalendar = false;
  isDisconnectingGoogleCalendar = false;
  isAwaitingGoogleCalendarConnection = false;

  loadError = '';
  personalError = '';
  personalSuccess = '';
  goalsError = '';
  goalsSuccess = '';
  configError = '';
  configSuccess = '';
  configInfo = '';
  whatsappError = '';
  whatsappSuccess = '';
  calendarSyncError = '';
  calendarSyncSuccess = '';

  period: MyCurrentPeriod | null = null;
  campuses: CatalogCampus[] = [];
  careers: CatalogCareer[] = [];
  currentCourses: MyCourse[] = [];
  calendarSyncAccounts: MyCalendarSyncAccount[] = [];
  availableCourses: CatalogCourse[] = [];
  selectedCourseIds = new Set<number>();
  selectedCourseLabels = new Map<number, string>();
  selectedCatalogCycle: CatalogCycleFilter = 'all';
  courseQuery = '';
  whatsappStatus: WhatsappLinkStatusResponse | null = null;
  whatsappLinkCode: WhatsappLinkCodeResponse | null = null;
  private readonly courseCatalogById = new Map<number, CatalogCourse>();

  ngOnInit(): void {
    this.loadProfile();
    this.bindCareerChanges();
  }

  ngOnDestroy(): void {
    this.stopWhatsappPolling();
  }

  get displayName(): string {
    const preferred = this.period?.nombrePreferido?.trim();
    if (preferred) {
      return preferred;
    }

    const fullName = this.period?.nombre?.trim();
    if (!fullName) {
      return 'tu perfil';
    }

    return fullName.split(' ')[0] || fullName;
  }

  get fullDisplayName(): string {
    return this.period?.nombre?.trim() || 'Perfil academico';
  }

  get profileInitials(): string {
    const source = this.fullDisplayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return source || 'TA';
  }

  get heroTitle(): string {
    if (!this.period) {
      return 'Tu configuracion academica del ciclo actual';
    }

    return `${this.displayName}, ajusta tu ciclo actual`;
  }

  get onboardingStatusLabel(): string {
    const status = this.period?.onboardingEstado?.toLowerCase();
    if (status === 'completado') {
      return 'Perfil base listo';
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

  get currentCoursesCount(): number {
    return this.currentCourses.length;
  }

  get academicStatusTone(): 'ready' | 'pending' | 'progress' {
    const status = this.period?.onboardingEstado?.toLowerCase();
    if (status === 'completado') {
      return 'ready';
    }
    if (status === 'en_progreso') {
      return 'progress';
    }
    return 'pending';
  }

  get progressPercent(): number {
    const current = Math.min(this.currentCoursesCount, 12);
    return Math.round((current / 12) * 100);
  }

  get whatsappSummaryLabel(): string {
    if (this.isWhatsappLinked) {
      return 'Vinculado con WhatsApp';
    }
    if (this.whatsappHasActiveCode) {
      return 'Codigo listo para vincular';
    }
    return 'Pendiente de vinculacion';
  }

  get periodRangeLabel(): string {
    if (!this.period?.periodoFechaInicio || !this.period?.periodoFechaFin) {
      return 'Rango del periodo no disponible';
    }

    const start = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(this.period.periodoFechaInicio));

    const end = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(this.period.periodoFechaFin));

    return `${start} - ${end}`;
  }

  get selectedCoursesList(): SelectedCourseView[] {
    return [...this.selectedCourseIds].map((id) => {
      const catalogCourse = this.courseCatalogById.get(id);
      if (catalogCourse) {
        return {
          id,
          label: `${catalogCourse.codigo} - ${catalogCourse.nombre}`,
          code: catalogCourse.codigo,
          name: catalogCourse.nombre,
          credits: catalogCourse.creditos,
          weeklyHours: catalogCourse.horasSemanales,
          modality: catalogCourse.modalidad,
          cycle: catalogCourse.cicloReferencial
        };
      }

      const label = this.selectedCourseLabels.get(id) || `Curso ${id}`;
      const [code, ...nameParts] = label.split(' - ');

      return {
        id,
        label,
        code: nameParts.length ? code : `ID ${id}`,
        name: nameParts.length ? nameParts.join(' - ') : label,
        credits: null,
        weeklyHours: null,
        modality: null,
        cycle: null
      };
    });
  }

  get availableCycles(): number[] {
    return [...new Set(
      this.availableCourses
        .map((course) => course.cicloReferencial)
        .filter((cycle): cycle is number => typeof cycle === 'number')
    )].sort((a, b) => a - b);
  }

  get filteredAvailableCourses(): CatalogCourse[] {
    if (this.selectedCatalogCycle === 'all') {
      return this.availableCourses;
    }

    return this.availableCourses.filter((course) => course.cicloReferencial === this.selectedCatalogCycle);
  }

  get selectedTotalCredits(): number {
    return this.selectedCoursesList.reduce((total, course) => total + (course.credits ?? 0), 0);
  }

  get selectedTotalHours(): number {
    return this.selectedCoursesList.reduce((total, course) => total + (course.weeklyHours ?? 0), 0);
  }

  get removedCourseCount(): number {
    const currentIds = new Set(this.currentCourses.map((course) => course.cursoId));
    return [...currentIds].filter((id) => !this.selectedCourseIds.has(id)).length;
  }

  get addedCourseCount(): number {
    const currentIds = new Set(this.currentCourses.map((course) => course.cursoId));
    return [...this.selectedCourseIds].filter((id) => !currentIds.has(id)).length;
  }

  get connectedCalendarProviders(): number {
    return this.calendarSyncAccounts.filter((item) => item.conectado).length;
  }

  get isWhatsappLinked(): boolean {
    return this.whatsappStatus?.linked ?? false;
  }

  get whatsappHasActiveCode(): boolean {
    if (!this.whatsappLinkCode) {
      return false;
    }

    return new Date(this.whatsappLinkCode.expiresAt).getTime() > Date.now();
  }

  get whatsappConnectionLabel(): string {
    if (this.isWhatsappLinked) {
      return 'Vinculado';
    }
    if (this.whatsappHasActiveCode) {
      return 'Codigo activo';
    }
    return 'Pendiente';
  }

  get whatsappExpiryLabel(): string {
    if (!this.whatsappLinkCode) {
      return 'Genera un codigo y envia el primer mensaje desde WhatsApp.';
    }

    const diffMs = new Date(this.whatsappLinkCode.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) {
      return 'El codigo ya expiro. Genera uno nuevo para seguir.';
    }

    const totalMinutes = Math.ceil(diffMs / 60000);
    return `Expira en ${totalMinutes} min.`;
  }

  syncProviderLabel(provider: string): string {
    return provider === 'google' ? 'Google Calendar' : 'Outlook Calendar';
  }

  syncStatusLabel(account: MyCalendarSyncAccount): string {
    if (account.conectado && account.estado === 'active') {
      return 'Conectado';
    }
    if (account.conectado && account.estado === 'error') {
      return 'Revisar conexion';
    }
    if (account.conectado) {
      return 'Configurado';
    }
    return 'Pendiente';
  }

  syncHint(account: MyCalendarSyncAccount): string {
    if (account.conectado) {
      return account.email || 'Cuenta vinculada';
    }
    return 'Base lista. Falta activar OAuth y el primer empuje de eventos.';
  }

  syncActionLabel(account: MyCalendarSyncAccount): string {
    if (account.provider !== 'google') {
      return 'Disponible luego';
    }
    if (!account.conectado) {
      return 'Conectar con Google';
    }
    return this.isSyncingGoogleCalendar ? 'Sincronizando...' : 'Sincronizar ahora';
  }

  syncMetaLabel(account: MyCalendarSyncAccount): string {
    if (account.provider === 'google' && this.isAwaitingGoogleCalendarConnection && !account.conectado) {
      return 'Validando la conexion con Google antes del primer empuje.';
    }
    if (account.lastSyncAt) {
      return `Ultima sync: ${new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(account.lastSyncAt))}`;
    }
    if (account.conectado) {
      return 'Aun no se hizo el primer empuje al calendario.';
    }
    return 'Necesitas autenticarte con Google para vincular el calendario.';
  }

  triggerCalendarSync(account: MyCalendarSyncAccount): void {
    if (account.provider !== 'google') {
      this.calendarSyncError = 'Outlook queda pendiente para una fase posterior. Primero cerramos Google Calendar.';
      this.calendarSyncSuccess = '';
      return;
    }

    if (!account.conectado) {
      this.calendarSyncError = '';
      this.calendarSyncSuccess = 'Abriendo permisos de Google Calendar...';
      void this.authUseCase.beginGoogleOAuthLogin('/app/perfil?calendar=google-connected')
        .catch(() => {
          this.calendarSyncSuccess = '';
          this.calendarSyncError = 'No se pudo abrir la autorizacion de Google Calendar.';
        });
      return;
    }

    if (this.isSyncingGoogleCalendar) {
      return;
    }

    this.isSyncingGoogleCalendar = true;
    this.calendarSyncError = '';
    this.calendarSyncSuccess = '';

    this.meUseCase.syncGoogleCalendar().subscribe({
      next: (result) => {
        this.isSyncingGoogleCalendar = false;
        this.calendarSyncSuccess = this.buildCalendarSyncSummary(result);
        this.calendarSyncError = result.failed > 0
          ? `${result.failed} evento(s) no se pudieron sincronizar. Revisa los horarios o vuelve a intentar.`
          : '';
        this.refreshCalendarAccounts();
      },
      error: (error) => {
        this.isSyncingGoogleCalendar = false;
        this.calendarSyncError = apiErrorMessage(error, 'No se pudo sincronizar Google Calendar.');
      }
    });
  }

  disconnectCalendar(account: MyCalendarSyncAccount): void {
    if (account.provider !== 'google') {
      this.calendarSyncError = 'La desconexion de Outlook no esta habilitada en esta fase.';
      this.calendarSyncSuccess = '';
      return;
    }

    if (!account.conectado || this.isDisconnectingGoogleCalendar) {
      return;
    }

    if (!window.confirm('Se desvinculara Google Calendar y se limpiara el mapping local de eventos sincronizados. Quieres continuar?')) {
      return;
    }

    this.isDisconnectingGoogleCalendar = true;
    this.calendarSyncError = '';
    this.calendarSyncSuccess = '';

    this.meUseCase.disconnectGoogleCalendar().subscribe({
      next: (result) => {
        this.isDisconnectingGoogleCalendar = false;
        this.calendarSyncSuccess = `Google Calendar desconectado. ${result.removedMappings} mapping(s) locales eliminados.`;
        this.refreshCalendarAccounts();
      },
      error: (error) => {
        this.isDisconnectingGoogleCalendar = false;
        this.calendarSyncError = apiErrorMessage(error, 'No se pudo desconectar Google Calendar.');
      }
    });
  }

  generateWhatsappCode(): void {
    if (this.isGeneratingWhatsappCode) {
      return;
    }

    this.isGeneratingWhatsappCode = true;
    this.whatsappError = '';
    this.whatsappSuccess = '';

    this.whatsappUseCase.generateLinkCode().subscribe({
      next: (result) => {
        this.whatsappLinkCode = result;
        this.isGeneratingWhatsappCode = false;
        this.whatsappSuccess = 'Codigo generado. Abre WhatsApp y envia ese primer mensaje para completar la vinculacion.';
        this.startWhatsappPolling();
      },
      error: (error) => {
        this.isGeneratingWhatsappCode = false;
        this.whatsappError = apiErrorMessage(error, 'No se pudo generar el codigo de vinculacion de WhatsApp.');
      }
    });
  }

  openWhatsappDeepLink(): void {
    if (!this.whatsappLinkCode?.deepLink) {
      return;
    }

    window.open(this.whatsappLinkCode.deepLink, '_blank', 'noopener,noreferrer');
  }

  copyWhatsappCode(): void {
    if (!this.whatsappLinkCode) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      this.whatsappError = 'Tu navegador no permitio copiar automaticamente. Usa el codigo visible en pantalla.';
      return;
    }

    navigator.clipboard.writeText(this.whatsappLinkCode.code)
      .then(() => {
        this.whatsappError = '';
        this.whatsappSuccess = 'Codigo copiado. Pegalo en WhatsApp si no abriste el deep link.';
      })
      .catch(() => {
        this.whatsappError = 'No se pudo copiar el codigo. Usa el texto visible en pantalla.';
      });
  }

  unlinkWhatsapp(): void {
    if (this.isUnlinkingWhatsapp || !this.isWhatsappLinked) {
      return;
    }

    if (!window.confirm('Se desvinculara tu numero de WhatsApp de esta cuenta. Quieres continuar?')) {
      return;
    }

    this.isUnlinkingWhatsapp = true;
    this.whatsappError = '';
    this.whatsappSuccess = '';

    this.whatsappUseCase.unlink().subscribe({
      next: () => {
        this.isUnlinkingWhatsapp = false;
        this.whatsappLinkCode = null;
        this.whatsappSuccess = 'WhatsApp fue desvinculado. Si quieres volver a usarlo, genera un nuevo codigo.';
        this.loadWhatsappStatus();
      },
      error: (error) => {
        this.isUnlinkingWhatsapp = false;
        this.whatsappError = apiErrorMessage(error, 'No se pudo desvincular WhatsApp en este momento.');
      }
    });
  }

  savePersonal(): void {
    if (this.personalForm.invalid || this.isSavingPersonal) {
      this.personalForm.markAllAsTouched();
      return;
    }

    this.isSavingPersonal = true;
    this.personalError = '';
    this.personalSuccess = '';

    const value = this.personalForm.getRawValue();

    this.meUseCase.updatePersonalProfile({
      nombre: String(value.nombre).trim(),
      nombrePreferido: value.nombrePreferido ? String(value.nombrePreferido).trim() : null,
      emailInstitucional: value.emailInstitucional ? String(value.emailInstitucional).trim() : null
    }).subscribe({
      next: (period) => {
        this.period = period;
        this.patchPersonalForm(period);
        this.isSavingPersonal = false;
        this.personalSuccess = 'Datos personales actualizados.';
      },
      error: (error) => {
        this.isSavingPersonal = false;
        this.personalError = apiErrorMessage(error, 'No se pudo actualizar tu informacion personal.');
      }
    });
  }

  saveGoals(): void {
    if (this.goalsForm.invalid || this.isSavingGoals) {
      this.goalsForm.markAllAsTouched();
      return;
    }

    this.isSavingGoals = true;
    this.goalsError = '';
    this.goalsSuccess = '';

    const value = this.goalsForm.getRawValue();

    this.meUseCase.updateAcademicProfile({
      metaPromedioCiclo: Number(value.metaPromedioCiclo),
      horasEstudioSemanaObjetivo: Number(value.horasEstudioSemanaObjetivo)
    }).subscribe({
      next: (period) => {
        this.period = period;
        this.patchGoalsForm(period);
        this.isSavingGoals = false;
        this.goalsSuccess = 'Objetivos actualizados.';
      },
      error: (error) => {
        this.isSavingGoals = false;
        this.goalsError = apiErrorMessage(error, 'No se pudo actualizar tu perfil academico.');
      }
    });
  }

  onCourseQueryChange(value: string): void {
    this.courseQuery = value.trim();
    this.loadAvailableCourses();
  }

  selectCatalogCycle(cycle: CatalogCycleFilter): void {
    this.selectedCatalogCycle = cycle;
  }

  toggleCourse(course: CatalogCourse): void {
    this.courseCatalogById.set(course.id, course);
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
            this.syncCalendarAfterConfigurationSave();
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
        this.configError = apiErrorMessage(error, 'No se pudo reconfigurar el ciclo actual.');
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
      courses: this.meUseCase.getMyCourses(),
      syncAccounts: this.meUseCase.getCalendarSyncAccounts(),
      whatsappStatus: this.whatsappUseCase.getLinkStatus()
    }).subscribe({
      next: ({ period, campuses, careers, courses, syncAccounts, whatsappStatus }) => {
        this.period = period;
        this.campuses = campuses;
        this.careers = careers;
        this.currentCourses = courses;
        this.calendarSyncAccounts = syncAccounts;
        this.whatsappStatus = whatsappStatus;
        this.patchPersonalForm(period);
        this.patchGoalsForm(period);
        this.patchConfigForm(period);
        this.rebuildSelectedCourses(courses);
        this.loadAvailableCourses();
        this.handleCalendarOAuthReturn(syncAccounts);
        this.autoRefreshCalendarIfStale(syncAccounts);
        this.isLoading = false;
        this.isWhatsappLoading = false;
      },
      error: () => {
        this.loadError = 'No se pudo cargar tu perfil academico actual.';
        this.isLoading = false;
        this.isWhatsappLoading = false;
      }
    });
  }

  private refreshCalendarAccounts(): void {
    this.meUseCase.getCalendarSyncAccounts().subscribe({
      next: (accounts) => {
        this.calendarSyncAccounts = accounts;
        this.handleCalendarOAuthReturn(accounts);
        this.autoRefreshCalendarIfStale(accounts);
      },
      error: () => {
        this.calendarSyncError = 'Se ejecuto la operacion, pero no se pudo recargar el estado de calendario.';
      }
    });
  }

  private syncCalendarAfterConfigurationSave(): void {
    const googleAccount = this.calendarSyncAccounts.find((account) => account.provider === 'google' && account.conectado);
    if (!googleAccount) {
      return;
    }

    this.calendarSyncError = '';
    this.calendarSyncSuccess = 'Se actualizaron tus cursos. Resincronizando Google Calendar...';
    this.triggerCalendarSync(googleAccount);
  }

  private handleCalendarOAuthReturn(accounts: MyCalendarSyncAccount[]): void {
    if (this.hasHandledCalendarOAuthReturn) {
      return;
    }

    if (this.route.snapshot.queryParamMap.get('calendar') !== 'google-connected') {
      return;
    }

    this.hasHandledCalendarOAuthReturn = true;
    this.router.navigate([], {
      queryParams: { calendar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    const googleAccount = accounts.find((account) => account.provider === 'google');
    if (!googleAccount) {
      this.calendarSyncError = 'No se pudo validar el estado de Google Calendar en este momento.';
      this.calendarSyncSuccess = '';
      return;
    }

    if (!googleAccount.conectado) {
      this.awaitGoogleCalendarConnection();
      return;
    }

    this.calendarSyncSuccess = 'Cuenta de Google conectada. Iniciando la primera sincronizacion...';
    this.triggerCalendarSync(googleAccount);
  }

  private autoRefreshCalendarIfStale(accounts: MyCalendarSyncAccount[]): void {
    if (this.route.snapshot.queryParamMap.get('calendar') === 'google-connected') {
      return;
    }
    if (this.isSyncingGoogleCalendar || this.isAwaitingGoogleCalendarConnection) {
      return;
    }

    const googleAccount = accounts.find((account) => account.provider === 'google' && account.conectado);
    if (!googleAccount || !this.shouldAutoSync(googleAccount.lastSyncAt)) {
      return;
    }

    this.calendarSyncError = '';
    this.calendarSyncSuccess = googleAccount.lastSyncAt
      ? 'Detectamos cambios pendientes. Actualizando Google Calendar...'
      : 'Google Calendar ya esta conectado. Lanzando el primer empuje automaticamente...';
    this.triggerCalendarSync(googleAccount);
  }

  private awaitGoogleCalendarConnection(attempt = 0): void {
    const maxAttempts = 6;
    this.isAwaitingGoogleCalendarConnection = true;
    this.calendarSyncError = '';
    this.calendarSyncSuccess = 'Validando la conexion de Google Calendar...';

    this.meUseCase.getCalendarSyncAccounts().subscribe({
      next: (accounts) => {
        this.calendarSyncAccounts = accounts;
        const googleAccount = accounts.find((account) => account.provider === 'google');

        if (googleAccount?.conectado) {
          this.isAwaitingGoogleCalendarConnection = false;
          this.calendarSyncSuccess = 'Cuenta de Google conectada. Iniciando la primera sincronizacion...';
          this.triggerCalendarSync(googleAccount);
          return;
        }

        if (attempt + 1 >= maxAttempts) {
          this.isAwaitingGoogleCalendarConnection = false;
          this.calendarSyncError = 'Se completo el login, pero Google Calendar no quedo vinculado. Revisa los permisos y vuelve a intentar.';
          this.calendarSyncSuccess = '';
          return;
        }

        window.setTimeout(() => this.awaitGoogleCalendarConnection(attempt + 1), 1500);
      },
      error: () => {
        if (attempt + 1 >= maxAttempts) {
          this.isAwaitingGoogleCalendarConnection = false;
          this.calendarSyncError = 'Se completo el login, pero no se pudo confirmar la vinculacion de Google Calendar.';
          this.calendarSyncSuccess = '';
          return;
        }

        window.setTimeout(() => this.awaitGoogleCalendarConnection(attempt + 1), 1500);
      }
    });
  }

  private buildCalendarSyncSummary(result: { created: number; updated: number; deleted: number; unchanged: number; failed: number }): string {
    const parts = [
      `${result.created} creados`,
      `${result.updated} actualizados`,
      `${result.deleted} eliminados`,
      `${result.unchanged} sin cambios`
    ];

    if (result.failed > 0) {
      parts.push(`${result.failed} con error`);
    }

    return `Google Calendar actualizado. ${parts.join(', ')}.`;
  }

  private shouldAutoSync(lastSyncAt: string | null): boolean {
    if (!lastSyncAt) {
      return true;
    }

    const diff = Date.now() - new Date(lastSyncAt).getTime();
    return Number.isFinite(diff) && diff >= ProfilePage.AUTO_SYNC_STALE_MS;
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

      this.selectedCatalogCycle = 'all';
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

    this.catalogUseCase.getCourses(Number(carreraId), this.courseQuery, 256, 0).subscribe({
      next: (courses) => {
        this.availableCourses = courses;
        courses.forEach((course) => {
          this.courseCatalogById.set(course.id, course);
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

  private patchPersonalForm(period: MyCurrentPeriod): void {
    this.personalForm.patchValue({
      nombre: period.nombre ?? '',
      nombrePreferido: period.nombrePreferido ?? '',
      emailInstitucional: period.emailInstitucional ?? ''
    });
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

  private loadWhatsappStatus(): void {
    this.whatsappUseCase.getLinkStatus().subscribe({
      next: (status) => {
        this.whatsappStatus = status;
        this.isWhatsappLoading = false;

        if (status.linked) {
          this.whatsappLinkCode = null;
          this.stopWhatsappPolling();
        } else if (!this.whatsappHasActiveCode) {
          this.stopWhatsappPolling();
        }
      },
      error: () => {
        this.isWhatsappLoading = false;
        this.whatsappError = 'No se pudo consultar el estado de vinculacion de WhatsApp.';
        this.stopWhatsappPolling();
      }
    });
  }

  private startWhatsappPolling(): void {
    this.stopWhatsappPolling();

    this.whatsappPollingSubscription = interval(5000).subscribe(() => {
      if (!this.whatsappHasActiveCode) {
        this.stopWhatsappPolling();
        return;
      }

      this.loadWhatsappStatus();
    });
  }

  private stopWhatsappPolling(): void {
    this.whatsappPollingSubscription?.unsubscribe();
    this.whatsappPollingSubscription = null;
  }
}
