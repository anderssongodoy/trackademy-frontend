export interface FeedbackReport {
  id: number;
  usuarioId: number;
  tipo: 'sugerencia' | 'error' | 'silabo_desactualizado' | 'curso_faltante' | 'otro';
  motivo: string;
  descripcion: string;
  nombreReportante: string;
  emailReportante: string;
  whatsappReportante?: string;
  imagenUrl?: string;
  cursoId?: number;
  carreraId?: number;
  ciclo?: number;
  paginaActual?: string;
  fechaReporte: string;
  numeroReporte: string;
  estado: 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackReportRequest {
  tipo: 'sugerencia' | 'error' | 'silabo_desactualizado' | 'curso_faltante' | 'otro';
  motivo: string;
  descripcion: string;
  nombreReportante: string;
  emailReportante: string;
  whatsappReportante?: string;
  imagenUrl?: string;
  cursoId?: number;
  carreraId?: number;
  ciclo?: number;
  paginaActual?: string;
}
