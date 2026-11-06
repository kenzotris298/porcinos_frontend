import { describe, expect, it } from 'vitest';
import {
  CRITERIA,
  LIBERTIES,
  criteriaForLiberty,
  isVerifiedMetricCode,
  scoreCleanDrinkers,
  scoreCleanFeeders
} from './catalog';
import { CRITERION_RUBRICS } from './rubrics';

describe('catálogo metodológico', () => {
  it('contiene las cuatro libertades con ponderación total de 100', () => {
    expect(LIBERTIES).toHaveLength(4);
    expect(LIBERTIES.reduce((total, liberty) => total + liberty.peso, 0)).toBe(100);
  });

  it('organiza 43 criterios en las libertades', () => {
    expect(CRITERIA).toHaveLength(43);
    const grouped = LIBERTIES.flatMap((liberty) => criteriaForLiberty(liberty.id));
    expect(grouped).toHaveLength(43);
  });

  it('identifica las métricas verificadas', () => {
    expect(isVerifiedMetricCode('limpieza-comederos')).toBe(true);
    expect(isVerifiedMetricCode('limpieza-bebederos')).toBe(true);
    expect(isVerifiedMetricCode('ventilacion')).toBe(false);
    expect(isVerifiedMetricCode(null)).toBe(false);
  });

  it('incluye una pregunta y rangos para cada criterio evaluable', () => {
    for (const criterion of CRITERIA) {
      const rubric = CRITERION_RUBRICS[criterion.id];
      expect(rubric?.question).toBeTruthy();
      expect(rubric?.ratings.length).toBeGreaterThan(0);
      expect(rubric?.ratings.every((rating) => Number.isInteger(rating.score))).toBe(true);
    }
  });

  it('ofrece selección directa de los rangos del procedimiento de manejo', () => {
    expect(CRITERION_RUBRICS['procedimiento-manejo']).toEqual({
      question:
        '¿Existe un procedimiento documentado que describe cómo realizar el manejo de los animales de acuerdo con la etapa productiva?',
      ratings: [
        { score: 100, description: 'Cumple.' },
        { score: 0, description: 'No cumple.' }
      ]
    });
  });

  it('aplica el ajuste de dos puntos del criterio de jaulas al resultado de la libertad', () => {
    expect(CRITERION_RUBRICS['proteccion-cerdas-grupo'].ratings.map((rating) => rating.score)).toEqual([
      2, -2
    ]);
  });
});

describe('regla de comederos', () => {
  it('asigna 100 cuando todos están limpios y sin riesgo', () => {
    expect(scoreCleanFeeders({ total: 10, limpios: 10, riesgoContaminacion: false })).toBe(100);
  });

  it('asigna 55 cuando más de la mitad están limpios', () => {
    expect(scoreCleanFeeders({ total: 10, limpios: 6, riesgoContaminacion: false })).toBe(55);
  });

  it('asigna 0 cuando hay riesgo de contaminación', () => {
    expect(scoreCleanFeeders({ total: 10, limpios: 10, riesgoContaminacion: true })).toBe(0);
  });

  it('rechaza muestras inválidas', () => {
    expect(scoreCleanFeeders({ total: 0, limpios: 0, riesgoContaminacion: false })).toBeNull();
    expect(scoreCleanFeeders({ total: 5, limpios: 8, riesgoContaminacion: false })).toBeNull();
  });
});

describe('regla de bebederos', () => {
  it('asigna 100 sin bebederos sucios', () => {
    expect(scoreCleanDrinkers({ total: 10, sucios: 0 })).toBe(100);
  });

  it('asigna 55 hasta un 25% de suciedad', () => {
    expect(scoreCleanDrinkers({ total: 8, sucios: 2 })).toBe(55);
  });

  it('asigna 20 hasta un 50% de suciedad', () => {
    expect(scoreCleanDrinkers({ total: 10, sucios: 5 })).toBe(20);
  });

  it('asigna 0 cuando supera la mitad', () => {
    expect(scoreCleanDrinkers({ total: 10, sucios: 6 })).toBe(0);
  });
});
