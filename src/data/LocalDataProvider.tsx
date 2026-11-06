import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type {
  DemoDatabase,
  Evaluation,
  EvidenceRecord,
  Farm,
  IndicatorRecord,
  PersonRecord,
  RecommendationRecord,
  Session
} from '../types';
import { DEPARTMENTS, municipalitiesForDepartment } from './colombia';
import { useAuth } from '../features/auth/AuthProvider';
import { loadDatabase, newId, saveDatabase } from './store';
import { apiRequest } from '../api/client';

export type EvaluationInput = Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt' | 'estado'>;
export type PersonInput = Omit<PersonRecord, 'id' | 'createdAt'>;
export type FarmInput = Omit<Farm, 'id'>;
export type IndicatorInput = Omit<IndicatorRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type EvidenceInput = Omit<EvidenceRecord, 'id' | 'createdAt'>;
export type GeneratedRecommendationInput = Pick<
  RecommendationRecord,
  'title' | 'text' | 'source'
> & Pick<RecommendationRecord, 'action'>;

export type ProvenanceResource =
  | 'people'
  | 'farms'
  | 'evaluations'
  | 'indicators'
  | 'evidence'
  | 'recommendations'
  | 'activity';

export interface ProvenanceSummary {
  cutoffConfigured: boolean;
  storedCount: number;
  eligibleCount: number;
  withheldCount: number;
  state: 'empty' | 'eligible' | 'withheld' | 'mixed';
}

export type OperationalProvenance = Record<ProvenanceResource, ProvenanceSummary>;

interface ProvenanceApiResponse {
  provenance?: ProvenanceSummary;
}

function requireProvenanceSummary(
  response: ProvenanceApiResponse,
  resource: ProvenanceResource
): ProvenanceSummary {
  const summary = response.provenance;
  if (
    !summary ||
    typeof summary.cutoffConfigured !== 'boolean' ||
    typeof summary.storedCount !== 'number' ||
    typeof summary.eligibleCount !== 'number' ||
    typeof summary.withheldCount !== 'number' ||
    !['empty', 'eligible', 'withheld', 'mixed'].includes(summary.state)
  ) {
    throw new Error(`El backend no devolvió metadatos de procedencia válidos para ${resource}.`);
  }
  return summary;
}

interface LocalDataContextValue {
  database: DemoDatabase;
  storageError: string | null;
  provenance: OperationalProvenance | null;
  provenanceLoading: boolean;
  provenanceError: string | null;
  dismissStorageError: () => void;
  retryProvenance: () => void;
  addPerson: (input: PersonInput) => PersonRecord;
  addFarm: (input: FarmInput) => Farm;
  saveEvaluation: (input: EvaluationInput, id?: string) => Evaluation;
  finalizeEvaluation: (id: string) => Evaluation;
  deleteEvaluation: (id: string) => void;
  saveIndicator: (input: IndicatorInput, id?: string) => IndicatorRecord;
  deleteIndicator: (id: string) => void;
  addEvidence: (input: EvidenceInput) => EvidenceRecord;
  deleteEvidence: (id: string) => void;
  generateRecommendationPlan: (
    evaluationId: string,
    items: GeneratedRecommendationInput[],
    generatedBy: string
  ) => RecommendationRecord[];
}

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

export function getOperationalEmptyState(
  status: ProvenanceSummary | undefined,
  fallback: { title: string; description: string },
  loading: boolean,
  error: string | null
): { title: string; description: string } {
  if (error) {
    return {
      title: 'No se pudo consultar la información',
      description: error
    };
  }
  if (loading) {
    return {
      title: 'Consultando información',
      description: 'Espera mientras se verifica el estado de los registros.'
    };
  }
  if (!status) return fallback;
  if (status.state === 'empty') {
    return {
      title: fallback.title,
      description: `${fallback.description} No hay registros almacenados.`
    };
  }
  if (status.eligibleCount > 0) {
    return {
      title: 'Módulo pendiente de activación',
      description: 'No se muestran registros hasta que se autorice la activación del módulo.'
    };
  }
  return {
    title: 'No hay registros elegibles',
    description: 'Hay registros almacenados, pero ninguno cumple las condiciones de procedencia aprobadas.'
  };
}

function now(): string {
  return new Date().toISOString();
}

function emptyDatabase(): DemoDatabase {
  return {
    version: 5,
    personas: [],
    farms: [],
    evaluations: [],
    indicators: [],
    evidence: [],
    recommendations: [],
    recommendationPlans: []
  };
}

function requireEvaluator(session: Session | null): void {
  if (session?.authBackend || session?.backend) {
    throw new Error(
      'Los módulos operativos siguen desconectados mientras se verifica la procedencia de los registros existentes.'
    );
  }
  if (session?.role !== 'evaluator') {
    throw new Error('Esta acción está disponible solo para evaluadores.');
  }
}

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [initial] = useState(() =>
    import.meta.env.MODE === 'test'
      ? loadDatabase()
      : { database: emptyDatabase(), error: null }
  );
  const [database, setDatabase] = useState<DemoDatabase>(initial.database);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const [provenance, setProvenance] = useState<OperationalProvenance | null>(null);
  const [provenanceLoading, setProvenanceLoading] = useState(false);
  const [provenanceError, setProvenanceError] = useState<string | null>(null);
  const recommendationGenerationLocks = useRef(new Set<string>());
  const provenanceRequestId = useRef(0);

  const retryProvenance = useCallback(async () => {
    const requestId = ++provenanceRequestId.current;
    if (!session?.authBackend || session.mustChangePassword) {
      setProvenance(null);
      setProvenanceError(null);
      setProvenanceLoading(false);
      return;
    }

    setProvenanceLoading(true);
    setProvenanceError(null);
    try {
      const [
        peopleResponse,
        farmsResponse,
        evaluationsResponse,
        indicatorsResponse,
        evidenceResponse,
        recommendationsResponse,
        activityResponse
      ] = await Promise.all([
        apiRequest<ProvenanceApiResponse>('/people'),
        apiRequest<ProvenanceApiResponse>('/farms'),
        apiRequest<ProvenanceApiResponse>('/evaluations'),
        apiRequest<ProvenanceApiResponse>('/indicators'),
        apiRequest<ProvenanceApiResponse>('/evidence'),
        apiRequest<ProvenanceApiResponse>('/recommendation-plans'),
        apiRequest<ProvenanceApiResponse>('/activity?limit=1')
      ]);
      const nextProvenance: OperationalProvenance = {
        people: requireProvenanceSummary(peopleResponse, 'people'),
        farms: requireProvenanceSummary(farmsResponse, 'farms'),
        evaluations: requireProvenanceSummary(evaluationsResponse, 'evaluations'),
        indicators: requireProvenanceSummary(indicatorsResponse, 'indicators'),
        evidence: requireProvenanceSummary(evidenceResponse, 'evidence'),
        recommendations: requireProvenanceSummary(recommendationsResponse, 'recommendations'),
        activity: requireProvenanceSummary(activityResponse, 'activity')
      };
      if (requestId === provenanceRequestId.current) setProvenance(nextProvenance);
    } catch (error) {
      if (requestId === provenanceRequestId.current) {
        setProvenance(null);
        setProvenanceError(
          error instanceof Error ? error.message : 'No se pudo consultar el estado de los registros.'
        );
      }
    } finally {
      if (requestId === provenanceRequestId.current) setProvenanceLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void retryProvenance();
    return () => {
      provenanceRequestId.current += 1;
    };
  }, [retryProvenance]);

  const visibleDatabase = useMemo<DemoDatabase>(() => {
    if (session?.role !== 'owner') return database;
    const owner = database.personas.find(
      (person) =>
        person.id === session.personId &&
        person.correo.trim().toLowerCase() === session.email.trim().toLowerCase()
    );
    if (!owner) {
      return {
        ...database,
        personas: [],
        farms: [],
        evaluations: [],
        indicators: [],
        evidence: [],
        recommendations: [],
        recommendationPlans: []
      };
    }

    const farms = database.farms.filter((farm) => farm.personaId === owner.id);
    const farmIds = new Set(farms.map((farm) => farm.id));
    const evaluations = database.evaluations.filter((evaluation) => farmIds.has(evaluation.predioId));
    const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));
    return {
      ...database,
      personas: [owner],
      farms,
      evaluations,
      indicators: database.indicators.filter((item) => evaluationIds.has(item.evalId)),
      evidence: database.evidence.filter((item) => evaluationIds.has(item.evaluationId)),
      recommendations: database.recommendations.filter((item) =>
        evaluationIds.has(item.evaluationId)
      ),
      recommendationPlans: database.recommendationPlans.filter((item) =>
        evaluationIds.has(item.evaluationId)
      )
    };
  }, [database, session]);

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') return;
    try {
      saveDatabase(database);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'No se pudieron guardar los datos.');
    }
  }, [database]);

  const saveEvaluation = useCallback(
    (input: EvaluationInput, id?: string): Evaluation => {
      requireEvaluator(session);
      const timestamp = now();
      const existing = id
        ? database.evaluations.find((evaluation) => evaluation.id === id)
        : undefined;
      const record: Evaluation = id
        ? {
            ...input,
            id,
            estado: existing?.estado ?? 'En proceso',
            createdAt: existing?.createdAt ?? timestamp,
            updatedAt: timestamp
          }
        : {
            ...input,
            id: newId('EV'),
            estado: 'En proceso',
            createdAt: timestamp,
            updatedAt: timestamp
          };
      setDatabase((current) => ({
        ...current,
        evaluations: id
          ? current.evaluations.map((evaluation) =>
              evaluation.id === id ? record : evaluation
            )
          : [record, ...current.evaluations]
      }));
      return record;
    },
    [database.evaluations, session]
  );

  const finalizeEvaluation = useCallback(
    (id: string): Evaluation => {
      requireEvaluator(session);
      const existing = database.evaluations.find((evaluation) => evaluation.id === id);
      if (!existing) throw new Error('No se encontró la evaluación que se quiere enviar.');
      if (existing.estado === 'Finalizada') {
        throw new Error('Esta evaluación ya fue enviada y está finalizada.');
      }
      const record: Evaluation = {
        ...existing,
        estado: 'Finalizada',
        updatedAt: now()
      };
      setDatabase((current) => ({
        ...current,
        evaluations: current.evaluations.map((evaluation) =>
          evaluation.id === id ? record : evaluation
        )
      }));
      return record;
    },
    [database.evaluations, session]
  );

  const addPerson = useCallback(
    (input: PersonInput): PersonRecord => {
      requireEvaluator(session);
      const email = input.correo.trim().toLowerCase();
      if (
        database.personas.some(
          (person) =>
            person.cedula === input.cedula.trim() || person.correo.toLowerCase() === email
        )
      ) {
        throw new Error('Ya existe una persona con esa cédula o correo electrónico.');
      }
      const record: PersonRecord = {
        ...input,
        cedula: input.cedula.trim(),
        correo: email,
        id: newId('PER'),
        createdAt: now()
      };
      setDatabase((current) => ({
        ...current,
        personas: [record, ...current.personas]
      }));
      return record;
    },
    [database.personas, session]
  );

  const addFarm = useCallback(
    (input: FarmInput): Farm => {
      requireEvaluator(session);
      if (!input.personaId || !database.personas.some((person) => person.id === input.personaId)) {
        throw new Error('Selecciona una persona registrada para vincular el predio.');
      }
      if (!DEPARTMENTS.some((department) => department.code === input.codigoDepartamento)) {
        throw new Error('Selecciona un departamento válido.');
      }
      if (
        !municipalitiesForDepartment(input.codigoDepartamento ?? '').some(
          (municipality) => municipality.code === input.codigoMunicipio
        )
      ) {
        throw new Error('Selecciona un municipio válido para el departamento.');
      }
      if (!Number.isInteger(input.animales) || input.animales < 1) {
        throw new Error('La cantidad total de animales debe ser un entero mayor que cero.');
      }
      if (
        (input.tipo !== 'fattening' &&
          (!Number.isInteger(input.hembrasCria) ||
            input.hembrasCria === null ||
            input.hembrasCria < 1 ||
            input.hembrasCria > input.animales)) ||
        (input.tipo !== 'breeding' &&
          (!Number.isInteger(input.animalesGordos) ||
            input.animalesGordos === null ||
            input.animalesGordos < 1 ||
            input.animalesGordos > input.animales)) ||
        (input.tipo === 'full-cycle' &&
          (input.hembrasCria ?? 0) + (input.animalesGordos ?? 0) > input.animales)
      ) {
        throw new Error('Las cantidades por etapa no coinciden con el sistema productivo o el total.');
      }
      const record: Farm = {
        ...input,
        id: newId('PR')
      };
      setDatabase((current) => ({
        ...current,
        farms: [record, ...current.farms]
      }));
      return record;
    },
    [database.personas, session]
  );

  const deleteEvaluation = useCallback((id: string) => {
    requireEvaluator(session);
    setDatabase((current) => {
      const indicatorIds = new Set(
        current.indicators.filter((item) => item.evalId === id).map((item) => item.id)
      );
      return {
        ...current,
        evaluations: current.evaluations.filter((evaluation) => evaluation.id !== id),
        indicators: current.indicators.filter((indicator) => indicator.evalId !== id),
        evidence: current.evidence.filter(
          (evidence) => evidence.evaluationId !== id && !indicatorIds.has(evidence.indicadorId)
        ),
        recommendations: current.recommendations.filter(
          (recommendation) => recommendation.evaluationId !== id
        )
      };
    });
  }, [session]);

  const saveIndicator = useCallback(
    (input: IndicatorInput, id?: string): IndicatorRecord => {
      requireEvaluator(session);
      const timestamp = now();
      const existing = id ? database.indicators.find((item) => item.id === id) : undefined;
      const record: IndicatorRecord = {
        ...input,
        id: id ?? newId('IND'),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp
      };
      setDatabase((current) => ({
        ...current,
        indicators: id
          ? current.indicators.map((indicator) => (indicator.id === id ? record : indicator))
          : [record, ...current.indicators]
      }));
      return record;
    },
    [database.indicators, session]
  );

  const deleteIndicator = useCallback((id: string) => {
    requireEvaluator(session);
    setDatabase((current) => ({
      ...current,
      indicators: current.indicators.filter((indicator) => indicator.id !== id),
      evidence: current.evidence.filter((evidence) => evidence.indicadorId !== id)
    }));
  }, [session]);

  const addEvidence = useCallback((input: EvidenceInput): EvidenceRecord => {
    requireEvaluator(session);
    const record: EvidenceRecord = {
      ...input,
      id: newId('EVI'),
      createdAt: now()
    };
    setDatabase((current) => ({
      ...current,
      evidence: [record, ...current.evidence]
    }));
    return record;
  }, [session]);

  const deleteEvidence = useCallback((id: string) => {
    requireEvaluator(session);
    setDatabase((current) => ({
      ...current,
      evidence: current.evidence.filter((evidence) => evidence.id !== id)
    }));
  }, [session]);

  const generateRecommendationPlan = useCallback(
    (
      evaluationId: string,
      items: GeneratedRecommendationInput[],
      generatedBy: string
    ): RecommendationRecord[] => {
      requireEvaluator(session);
      if (!database.evaluations.some((evaluation) => evaluation.id === evaluationId)) {
        throw new Error('No se encontró la evaluación para generar el plan.');
      }
      if (
        recommendationGenerationLocks.current.has(evaluationId) ||
        database.recommendationPlans.some((plan) => plan.evaluationId === evaluationId) ||
        database.recommendations.some((item) => item.evaluationId === evaluationId)
      ) {
        throw new Error('El plan de recomendaciones de esta evaluación ya fue generado.');
      }

      recommendationGenerationLocks.current.add(evaluationId);
      try {
        const timestamp = now();
        const records = items.map((item) => ({
          ...item,
          evaluationId,
          createdBy: generatedBy,
          id: newId('REC'),
          createdAt: timestamp,
          updatedAt: timestamp
        }));
        setDatabase((current) => ({
          ...current,
          recommendations: [...records, ...current.recommendations],
          recommendationPlans: [
            {
              evaluationId,
              generatedAt: timestamp,
              generatedBy,
              source: 'local-demo'
            },
            ...current.recommendationPlans
          ]
        }));
        return records;
      } catch (error) {
        recommendationGenerationLocks.current.delete(evaluationId);
        throw error;
      }
    },
    [database.evaluations, database.recommendationPlans, database.recommendations, session]
  );

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  const value = useMemo<LocalDataContextValue>(
    () => ({
      database: visibleDatabase,
      storageError,
      provenance,
      provenanceLoading,
      provenanceError,
      dismissStorageError,
      retryProvenance,
      addPerson,
      addFarm,
      saveEvaluation,
      finalizeEvaluation,
      deleteEvaluation,
      saveIndicator,
      deleteIndicator,
      addEvidence,
      deleteEvidence,
      generateRecommendationPlan
    }),
    [
      visibleDatabase,
      storageError,
      provenance,
      provenanceLoading,
      provenanceError,
      dismissStorageError,
      retryProvenance,
      addPerson,
      addFarm,
      saveEvaluation,
      finalizeEvaluation,
      deleteEvaluation,
      saveIndicator,
      deleteIndicator,
      addEvidence,
      deleteEvidence,
      generateRecommendationPlan
    ]
  );

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export function useLocalData(): LocalDataContextValue {
  const context = useContext(LocalDataContext);
  if (!context) throw new Error('useLocalData debe usarse dentro de LocalDataProvider');
  return context;
}
