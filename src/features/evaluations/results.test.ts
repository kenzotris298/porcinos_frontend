import { describe, expect, it } from 'vitest';
import { createSeedDatabase } from '../../data/seed';
import { CRITERIA } from '../indicators/catalog';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from '../indicators/rubrics';
import { allEvaluationInsights, computeEvaluation } from './results';
import { classificationFor } from '../../utils/format';

describe('cálculo de resultados', () => {
  const database = createSeedDatabase();
  const finalEvaluation = database.evaluations.find((item) => item.id === 'EV-2026-001');
  const farm = database.farms.find((item) => item.id === finalEvaluation?.predioId);

  it('calcula un resultado completo para la evaluación finalizada', () => {
    expect(finalEvaluation).toBeDefined();
    expect(farm).toBeDefined();
    const insights = computeEvaluation(database, finalEvaluation!, farm!);
    expect(insights.pendingCriteria).toHaveLength(0);
    expect(insights.score).not.toBeNull();
    expect(insights.score).toBeGreaterThan(0);
    expect(insights.classification).toBeTruthy();
    expect(insights.liberties).toHaveLength(4);
  });

  it('deja sin resultado global una evaluación en proceso', () => {
    const evaluation = database.evaluations.find((item) => item.id === 'EV-2026-002');
    const previewFarm = database.farms.find((item) => item.id === evaluation?.predioId);
    const insights = computeEvaluation(database, evaluation!, previewFarm!);
    expect(insights.score).toBeNull();
    expect(insights.pendingCriteria.length).toBeGreaterThan(0);
    expect(insights.evaluatedCriteria).toBeLessThan(insights.totalCriteria);
    expect(insights.criteriaStatus.some((criterion) => criterion.completed)).toBe(true);
    expect(insights.criteriaStatus.some((criterion) => !criterion.completed)).toBe(true);
    expect(
      insights.criteriaStatus
        .filter((criterion) => !criterion.completed)
        .some((criterion) => criterion.indicatorId)
    ).toBe(true);
  });

  it('incluye los criterios no aplicables con 0 puntos en el promedio de la libertad', () => {
    const data = createSeedDatabase();
    const evaluation = data.evaluations.find((item) => item.id === 'EV-2026-001')!;
    const farm = data.farms.find((item) => item.id === evaluation.predioId)!;
    const nonApplicable = data.indicators.find(
      (item) => item.evalId === evaluation.id && item.metricaCatalogoId === 'jaula-cerda'
    )!;
    nonApplicable.aplicabilidad = 'no-aplica';
    nonApplicable.puntaje = null;

    const insights = computeEvaluation(data, evaluation, farm);
    const liberty = insights.liberties.find((item) => item.id === 'incomodidad-fisica-termica')!;
    const libertyIndicators = data.indicators.filter((item) => {
      const criterion = CRITERIA.find((candidate) => candidate.id === item.metricaCatalogoId);
      return item.evalId === evaluation.id && criterion?.libertadId === liberty.id;
    });
    const regularIndicators = libertyIndicators.filter(
      (item) => item.metricaCatalogoId !== LIBERTY_ADJUSTMENT_CRITERION_ID
    );
    const adjustment = libertyIndicators
      .filter((item) => item.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID)
      .reduce(
        (total, item) => total + (item.aplicabilidad === 'no-aplica' ? 0 : item.puntaje ?? 0),
        0
      );
    const expectedAverage =
      regularIndicators.reduce(
        (total, item) => total + (item.aplicabilidad === 'no-aplica' ? 0 : item.puntaje ?? 0),
        0
      ) / regularIndicators.length + adjustment;

    expect(liberty.puntuacion).toBe(Math.round(expectedAverage * 100) / 100);
    expect(liberty.noAplicables).toBe(2);
    expect(insights.score).not.toBeNull();
  });

  it('aplica +2 o −2 puntos al resultado de la libertad correspondiente', () => {
    const data = createSeedDatabase();
    const evaluation = data.evaluations.find((item) => item.id === 'EV-2026-001')!;
    const farm = data.farms.find((item) => item.id === evaluation.predioId)!;
    const adjustment = data.indicators.find(
      (item) =>
        item.evalId === evaluation.id &&
        item.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID
    )!;
    const libertyId = CRITERIA.find((item) => item.id === LIBERTY_ADJUSTMENT_CRITERION_ID)!.libertadId;
    const resultFor = () =>
      computeEvaluation(data, evaluation, farm).liberties.find((item) => item.id === libertyId)!
        .puntuacion!;
    const baseScore = resultFor();

    adjustment.aplicabilidad = 'aplica';
    adjustment.puntaje = 2;
    expect(resultFor()).toBe(baseScore + 2);

    adjustment.puntaje = -2;
    expect(resultFor()).toBe(baseScore - 2);
  });

  it('ordena las evaluaciones de la más reciente a la más antigua', () => {
    const insights = allEvaluationInsights(database);
    expect(insights).toHaveLength(4);
    const dates = insights.map((item) => item.evaluation.fecha);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('clasifica el bienestar a partir del puntaje ponderado', () => {
    expect(classificationFor(95)).toBe('Excelente bienestar');
    expect(classificationFor(80)).toBe('Alto bienestar');
    expect(classificationFor(60)).toBe('Medio bienestar');
    expect(classificationFor(40)).toBe('Bajo bienestar');
    expect(classificationFor(null)).toBeNull();
  });
});
