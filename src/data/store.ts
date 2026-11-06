import type { DemoDatabase, ProductionSystem } from '../types';
import { municipalityByNames } from './colombia';
import { createSeedDatabase } from './seed';
import {
  CRITERION_RUBRICS,
  LIBERTY_ADJUSTMENT_CRITERION_ID
} from '../features/indicators/rubrics';

export const STORAGE_KEY = 'bienestar-porcino.database.v1';
const LEGACY_STORAGE_KEY = 'bienestar-porcino.demo.v1';

export interface LoadResult {
  database: DemoDatabase;
  error: string | null;
}

interface LegacyFarm {
  id: string;
  personaId?: string;
  nombre: string;
  departamento: string;
  municipio: string;
  vereda: string;
  responsable: string;
  animales: number;
  hembrasCria?: number | null;
  animalesGordos?: number | null;
  tipo: string;
}

interface LegacyDatabase {
  version: 1 | 2;
  personas?: DemoDatabase['personas'];
  farms: LegacyFarm[];
  evaluations: DemoDatabase['evaluations'];
  indicators: DemoDatabase['indicators'];
  evidence: DemoDatabase['evidence'];
  recommendations: DemoDatabase['recommendations'];
}

interface VersionThreeDatabase {
  version: 3;
  personas: DemoDatabase['personas'];
  farms: DemoDatabase['farms'];
  evaluations: DemoDatabase['evaluations'];
  indicators: DemoDatabase['indicators'];
  evidence: DemoDatabase['evidence'];
  recommendations: DemoDatabase['recommendations'];
}

interface VersionFourDatabase extends Omit<VersionThreeDatabase, 'version'> {
  version: 4;
  recommendationPlans: DemoDatabase['recommendationPlans'];
}

function normalizePredefinedScores(
  indicators: DemoDatabase['indicators']
): DemoDatabase['indicators'] {
  return indicators.map((indicator) => {
    if (!indicator.id.startsWith('IND-EV-2026-') || indicator.puntaje === null) return indicator;
    const criterionId = indicator.metricaCatalogoId;
    const adjustment = criterionId === LIBERTY_ADJUSTMENT_CRITERION_ID;
    const allowed = CRITERION_RUBRICS[criterionId]?.ratings.map(
      (rating) => rating.score
    );
    if (!allowed?.length) return indicator;
    const puntaje =
      indicator.aplicabilidad === 'no-aplica'
        ? 0
        : allowed.includes(indicator.puntaje)
          ? indicator.puntaje
          : adjustment
            ? indicator.puntaje >= 50
              ? 2
              : -2
            : allowed.reduce((closest, score) =>
                Math.abs(score - indicator.puntaje!) < Math.abs(closest - indicator.puntaje!) ||
                (Math.abs(score - indicator.puntaje!) === Math.abs(closest - indicator.puntaje!) &&
                  score > closest)
                  ? score
                  : closest
              );
    const estado =
      indicator.estado === 'Pendiente de revisión'
        ? indicator.estado
        : indicator.aplicabilidad !== 'no-aplica' &&
            (adjustment ? puntaje < 0 : puntaje < 60)
          ? 'Requiere seguimiento'
          : 'Registrado';
    const resultado =
      indicator.aplicabilidad === 'no-aplica'
        ? 'Criterio verificado como no aplicable para el sistema productivo del predio.'
        : CRITERION_RUBRICS[criterionId]?.ratings.find((rating) => rating.score === puntaje)
            ?.description ?? indicator.resultado;
    if (
      puntaje === indicator.puntaje &&
      estado === indicator.estado &&
      resultado === indicator.resultado
    ) {
      return indicator;
    }
    return {
      ...indicator,
      puntaje,
      resultado,
      estado,
      ...(indicator.metricaDatos ? {
        metricaDatos: { ...indicator.metricaDatos, score: puntaje }
      } : {})
    };
  });
}

function plansFromRecommendations(
  recommendations: DemoDatabase['recommendations']
): DemoDatabase['recommendationPlans'] {
  const grouped = new Map<string, DemoDatabase['recommendations'][number]>();
  for (const recommendation of recommendations) {
    const current = grouped.get(recommendation.evaluationId);
    if (!current || recommendation.createdAt > current.createdAt) {
      grouped.set(recommendation.evaluationId, recommendation);
    }
  }
  return [...grouped.values()].map((recommendation) => ({
    evaluationId: recommendation.evaluationId,
    generatedAt: recommendation.createdAt,
    generatedBy: recommendation.createdBy,
    source: 'seed-demo'
  }));
}

function isDatabase(value: unknown): value is DemoDatabase {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DemoDatabase>;
  return (
    candidate.version === 5 &&
    Array.isArray(candidate.personas) &&
    Array.isArray(candidate.farms) &&
    Array.isArray(candidate.evaluations) &&
    Array.isArray(candidate.indicators) &&
    Array.isArray(candidate.evidence) &&
    Array.isArray(candidate.recommendations) &&
    Array.isArray(candidate.recommendationPlans)
  );
}

function migrateVersionThree(value: unknown): DemoDatabase | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<VersionThreeDatabase>;
  if (
    candidate.version !== 3 ||
    !Array.isArray(candidate.personas) ||
    !Array.isArray(candidate.farms) ||
    !Array.isArray(candidate.evaluations) ||
    !Array.isArray(candidate.indicators) ||
    !Array.isArray(candidate.evidence) ||
    !Array.isArray(candidate.recommendations)
  ) {
    return null;
  }
  return {
    version: 5,
    personas: candidate.personas,
    farms: candidate.farms,
    evaluations: candidate.evaluations,
    indicators: normalizePredefinedScores(candidate.indicators),
    evidence: candidate.evidence,
    recommendations: candidate.recommendations,
    recommendationPlans: plansFromRecommendations(candidate.recommendations)
  };
}

function migrateVersionFour(value: unknown): DemoDatabase | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<VersionFourDatabase>;
  if (
    candidate.version !== 4 ||
    !Array.isArray(candidate.personas) ||
    !Array.isArray(candidate.farms) ||
    !Array.isArray(candidate.evaluations) ||
    !Array.isArray(candidate.indicators) ||
    !Array.isArray(candidate.evidence) ||
    !Array.isArray(candidate.recommendations) ||
    !Array.isArray(candidate.recommendationPlans)
  ) {
    return null;
  }
  return {
    version: 5,
    personas: candidate.personas,
    farms: candidate.farms,
    evaluations: candidate.evaluations,
    indicators: normalizePredefinedScores(candidate.indicators),
    evidence: candidate.evidence,
    recommendations: candidate.recommendations,
    recommendationPlans: candidate.recommendationPlans
  };
}

function migrateLegacyDatabase(value: unknown): DemoDatabase | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<LegacyDatabase>;
  if (
    (candidate.version !== 1 && candidate.version !== 2) ||
    !Array.isArray(candidate.farms) ||
    !Array.isArray(candidate.evaluations) ||
    !Array.isArray(candidate.indicators) ||
    !Array.isArray(candidate.evidence) ||
    !Array.isArray(candidate.recommendations)
  ) {
    return null;
  }

  const seed = createSeedDatabase();
  const seededFarms = new Map(seed.farms.map((farm) => [farm.id, farm]));
  return {
    version: 5,
    personas: candidate.personas ?? seed.personas,
    farms: candidate.farms.map((farm) => {
      const seededFarm = seededFarms.get(farm.id);
      const location = municipalityByNames(farm.departamento, farm.municipio);
      const oldSystem = farm.tipo.trim().toLocaleLowerCase('es-CO');
      const tipo: ProductionSystem =
        oldSystem === 'engorde' || oldSystem === 'fattening'
          ? 'fattening'
          : oldSystem.includes('ciclo') || oldSystem === 'full-cycle'
            ? 'full-cycle'
            : 'breeding';
      return {
        ...farm,
        personaId: farm.personaId ?? seededFarm?.personaId,
        codigoDepartamento: location?.departmentCode ?? seededFarm?.codigoDepartamento ?? null,
        codigoMunicipio: location?.code ?? seededFarm?.codigoMunicipio ?? null,
        hembrasCria: farm.hembrasCria ?? seededFarm?.hembrasCria ?? null,
        animalesGordos: farm.animalesGordos ?? seededFarm?.animalesGordos ?? null,
        tipo
      };
    }),
    evaluations: candidate.evaluations,
    indicators: normalizePredefinedScores(candidate.indicators),
    evidence: candidate.evidence,
    recommendations: candidate.recommendations,
    recommendationPlans: plansFromRecommendations(candidate.recommendations)
  };
}

export function loadDatabase(): LoadResult {
  try {
    const currentRaw = window.localStorage.getItem(STORAGE_KEY);
    const legacyRaw = currentRaw ? null : window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = currentRaw ?? legacyRaw;
    if (!raw) return { database: createSeedDatabase(), error: null };
    const parsed: unknown = JSON.parse(raw);
    const migrated =
      migrateLegacyDatabase(parsed) ??
      migrateVersionThree(parsed) ??
      migrateVersionFour(parsed);
    const database = migrated ?? (isDatabase(parsed) ? parsed : null);
    if (!database) {
      return {
        database: createSeedDatabase(),
        error: 'Los datos guardados no tienen un formato válido. Se cargó la información inicial.'
      };
    }
    if (legacyRaw || migrated) {
      try {
        saveDatabase(database);
        if (legacyRaw) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch (error) {
        return {
          database,
          error:
            error instanceof Error
              ? `Los datos se cargaron, pero no se pudo completar su migración: ${error.message}`
              : 'Los datos se cargaron, pero no se pudo completar su migración.'
        };
      }
    }
    return { database, error: null };
  } catch {
    return {
      database: createSeedDatabase(),
      error: 'No fue posible leer los datos guardados. Se cargó la información inicial.'
    };
  }
}

export function saveDatabase(database: DemoDatabase): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    throw new Error(
      'No se pudieron guardar los cambios en el navegador. El espacio disponible puede estar lleno; elimina evidencias para liberar almacenamiento.'
    );
  }
}

export function removeDatabase(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // El almacenamiento puede estar bloqueado por el navegador.
  }
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random.toUpperCase()}`;
}
