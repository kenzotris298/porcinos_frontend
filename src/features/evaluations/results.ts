import type {
  DemoDatabase,
  Evaluation,
  EvaluationInsights,
  Farm,
  IndicatorRecord,
  LibertyScore
} from '../../types';
import { classificationFor } from '../../utils/format';
import { CRITERIA, LIBERTIES, type CriterionDefinition } from '../indicators/catalog';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from '../indicators/rubrics';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function indicatorScore(indicator: IndicatorRecord | undefined): number | null {
  if (!indicator) return null;
  if (indicator.aplicabilidad === 'no-aplica') return 0;
  if (indicator.estado === 'Pendiente de revisión') return null;
  if (indicator.metricaDatos && Number.isInteger(indicator.metricaDatos.score)) {
    return indicator.metricaDatos.score;
  }
  return typeof indicator.puntaje === 'number' && Number.isInteger(indicator.puntaje)
    ? indicator.puntaje
    : null;
}

export function criterionResponse(
  indicators: IndicatorRecord[],
  criterion: CriterionDefinition
): IndicatorRecord | undefined {
  return indicators.find(
    (indicator) =>
      indicator.metricaCatalogoId === criterion.id ||
      (criterion.metricaId !== '' && indicator.metricaCatalogoId === criterion.metricaId)
  );
}

export function computeEvaluation(
  database: DemoDatabase,
  evaluation: Evaluation,
  farm: Farm
): EvaluationInsights {
  const indicators = database.indicators.filter((indicator) => indicator.evalId === evaluation.id);
  const evidence = database.evidence.filter((item) => item.evaluationId === evaluation.id);

  const responses = CRITERIA.map((criterion) => {
    const indicator = criterionResponse(indicators, criterion);
    const score = indicatorScore(indicator);
    const missing =
      !indicator ||
      !indicator.aplicabilidad ||
      (indicator.aplicabilidad === 'aplica' && score === null);
    return { criterion, indicator, score, missing };
  });

  const liberties: LibertyScore[] = LIBERTIES.map((liberty) => {
    const items = responses.filter((response) => response.criterion.libertadId === liberty.id);
    const scored = items.filter((item) => item.score !== null);
    const regularScores = scored.filter(
      (item) => item.criterion.id !== LIBERTY_ADJUSTMENT_CRITERION_ID
    );
    const adjustment = scored
      .filter((item) => item.criterion.id === LIBERTY_ADJUSTMENT_CRITERION_ID)
      .reduce((total, item) => total + (item.score ?? 0), 0);
    const average = regularScores.length
      ? Math.min(
          100,
          Math.max(
            0,
            round(
              regularScores.reduce((total, item) => total + (item.score ?? 0), 0) /
                regularScores.length +
                adjustment
            )
          )
        )
      : null;
    return {
      id: liberty.id,
      nombre: liberty.nombre,
      peso: liberty.peso,
      puntuacion: average,
      indicadoresPuntuados: scored.length,
      noAplicables: items.filter((item) => item.indicator?.aplicabilidad === 'no-aplica').length,
      faltantes: items
        .filter((item) => item.missing)
        .map((item) => item.criterion.nombre)
    };
  });

  const pendingCriteria = responses.filter((response) => response.missing).map((r) => r.criterion.nombre);
  const complete = pendingCriteria.length === 0 && liberties.every((liberty) => liberty.puntuacion !== null);
  const score = complete
    ? round(libertadesWeightedScore(liberties))
    : null;
  const evaluatedCriteria = responses.filter(
    (response) => response.indicator && !response.missing
  ).length;

  return {
    evaluation,
    farm,
    indicators,
    evidence,
    score,
    classification: classificationFor(score),
    evaluatedCriteria,
    pendingCriteria,
    criteriaStatus: responses.map(({ criterion, indicator, missing }) => ({
      id: criterion.id,
      nombre: criterion.nombre,
      completed: !missing,
      ...(indicator ? { indicatorId: indicator.id } : {})
    })),
    totalCriteria: CRITERIA.length,
    evidenceCount: evidence.length,
    liberties
  };
}

function libertadesWeightedScore(liberties: LibertyScore[]): number {
  return liberties.reduce(
    (total, liberty) => total + (liberty.puntuacion ?? 0) * (liberty.peso / 100),
    0
  );
}

export function allEvaluationInsights(database: DemoDatabase): EvaluationInsights[] {
  return database.evaluations
    .map((evaluation) => {
      const farm = database.farms.find((item) => item.id === evaluation.predioId);
      return farm ? computeEvaluation(database, evaluation, farm) : null;
    })
    .filter((item): item is EvaluationInsights => item !== null)
    .sort((a, b) => b.evaluation.fecha.localeCompare(a.evaluation.fecha));
}

export function lowestCriteria(
  insights: EvaluationInsights,
  limit = 5
): Array<{ name: string; score: number }> {
  return insights.indicators
    .filter(
      (indicator) =>
        indicator.aplicabilidad === 'aplica' &&
        indicator.estado !== 'Pendiente de revisión' &&
        indicator.metricaCatalogoId !== LIBERTY_ADJUSTMENT_CRITERION_ID &&
        typeof indicator.puntaje === 'number'
    )
    .map((indicator) => ({ name: indicator.nombre, score: indicator.puntaje ?? 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
