export type Role = 'evaluator' | 'owner';

export interface Session {
  email: string;
  name: string;
  role: Role;
  personId?: string;
  mustChangePassword: boolean;
  authBackend?: true;
  backend?: true;
}

export interface PersonRecord {
  id: string;
  cedula: string;
  nombres: string;
  celular: string;
  correo: string;
  createdAt: string;
}

export type ProductionSystem = 'breeding' | 'fattening' | 'full-cycle';

export interface Farm {
  id: string;
  personaId?: string;
  codigoDepartamento: string | null;
  codigoMunicipio: string | null;
  nombre: string;
  departamento: string;
  municipio: string;
  vereda: string;
  responsable: string;
  animales: number;
  hembrasCria: number | null;
  animalesGordos: number | null;
  tipo: ProductionSystem;
}

export type EvaluationStatus = 'En proceso' | 'Finalizada' | 'Requiere seguimiento';

export interface Evaluation {
  id: string;
  predioId: string;
  fecha: string;
  hora: string;
  evaluador: string;
  investigadorNombres: string;
  investigadorApellidos: string;
  observaciones: string;
  estado: EvaluationStatus;
  createdAt: string;
  updatedAt: string;
}

export type MeasureBase = 'Recursos' | 'Animales' | 'Gestión';
export type Applicability = 'aplica' | 'no-aplica';
export type IndicatorStatus = 'Registrado' | 'Pendiente de revisión' | 'Requiere seguimiento';

export interface MetricSample {
  total: number;
  limpios?: number;
  sucios?: number;
  riesgoContaminacion?: boolean;
  score: number;
}

export interface IndicatorRecord {
  id: string;
  evalId: string;
  metricaCatalogoId: string;
  tipo: MeasureBase;
  nombre: string;
  metodo: string;
  resultado: string;
  estado: IndicatorStatus;
  aplicabilidad: Applicability;
  puntaje: number | null;
  observaciones: string;
  metricaDatos?: MetricSample;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceRecord {
  id: string;
  indicadorId: string;
  evaluationId: string;
  nombre: string;
  tipo: string;
  tamano: number;
  createdAt: string;
  uploadedBy: string;
  dataUrl?: string;
}

export type RecommendationSource = 'plantilla_local' | 'evaluador';

export interface RecommendationRecord {
  id: string;
  evaluationId: string;
  title: string;
  action?: string;
  text: string;
  source: RecommendationSource;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationPlan {
  evaluationId: string;
  generatedAt: string;
  generatedBy: string;
  source: 'local-demo' | 'seed-demo';
}

export interface DemoDatabase {
  version: 5;
  personas: PersonRecord[];
  farms: Farm[];
  evaluations: Evaluation[];
  indicators: IndicatorRecord[];
  evidence: EvidenceRecord[];
  recommendations: RecommendationRecord[];
  recommendationPlans: RecommendationPlan[];
}

export interface LibertyScore {
  id: string;
  nombre: string;
  peso: number;
  puntuacion: number | null;
  indicadoresPuntuados: number;
  noAplicables: number;
  faltantes: string[];
}

export interface EvaluationInsights {
  evaluation: Evaluation;
  farm: Farm;
  indicators: IndicatorRecord[];
  evidence: EvidenceRecord[];
  score: number | null;
  classification: string | null;
  evaluatedCriteria: number;
  pendingCriteria: string[];
  criteriaStatus: Array<{
    id: string;
    nombre: string;
    completed: boolean;
    indicatorId?: string;
  }>;
  totalCriteria: number;
  evidenceCount: number;
  liberties: LibertyScore[];
}
