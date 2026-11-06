import { afterEach, describe, expect, it } from 'vitest';
import { createSeedDatabase } from './seed';
import { loadDatabase, STORAGE_KEY } from './store';
import { CRITERION_RUBRICS } from '../features/indicators/rubrics';

describe('persistencia local de personas', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('migra datos v1 a códigos DIVIPOLA y conserva las evaluaciones y vínculos', () => {
    const { personas: _personas, ...seedV1 } = createSeedDatabase();
    const legacy = {
      ...seedV1,
      version: 1 as const,
      farms: seedV1.farms.map(
        ({
          personaId: _personaId,
          codigoDepartamento: _codigoDepartamento,
          codigoMunicipio: _codigoMunicipio,
          hembrasCria: _hembrasCria,
          animalesGordos: _animalesGordos,
          tipo: _tipo,
          ...farm
        }) => ({ ...farm, tipo: 'Ciclo completo' })
      )
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const result = loadDatabase();

    expect(result.error).toBeNull();
    expect(result.database.version).toBe(5);
    expect(result.database.personas.length).toBeGreaterThan(0);
    expect(result.database.evaluations).toHaveLength(seedV1.evaluations.length);
    expect(result.database.recommendationPlans.length).toBeGreaterThan(0);
    expect(result.database.farms.find((farm) => farm.id === 'PR-001')).toMatchObject({
      personaId: 'PER-001',
      codigoDepartamento: '25',
      codigoMunicipio: '25473',
      hembrasCria: 5,
      animalesGordos: 80,
      tipo: 'full-cycle'
    });
  });

  it('migra datos v2 y mantiene las personas ya registradas', () => {
    const seed = createSeedDatabase();
    const legacy = {
      ...seed,
      version: 2 as const,
      farms: seed.farms.map(
        ({
          codigoDepartamento: _codigoDepartamento,
          codigoMunicipio: _codigoMunicipio,
          hembrasCria: _hembrasCria,
          animalesGordos: _animalesGordos,
          tipo: _tipo,
          ...farm
        }) => ({ ...farm, tipo: 'Engorde' })
      )
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const result = loadDatabase();

    expect(result.error).toBeNull();
    expect(result.database.version).toBe(5);
    expect(result.database.personas).toEqual(seed.personas);
    expect(result.database.farms.find((farm) => farm.id === 'PR-003')).toMatchObject({
      personaId: 'PER-003',
      codigoDepartamento: '76',
      codigoMunicipio: '76520',
      hembrasCria: 0,
      animalesGordos: 80,
      tipo: 'fattening'
    });
  });

  it('mantiene cada puntaje predefinido dentro de los rangos del criterio', () => {
    const database = createSeedDatabase();

    for (const indicator of database.indicators) {
      const allowedScores = CRITERION_RUBRICS[indicator.metricaCatalogoId]?.ratings.map(
        (rating) => rating.score
      );
      if (indicator.aplicabilidad === 'no-aplica') {
        expect(indicator.puntaje).toBe(0);
      } else {
        expect(allowedScores, indicator.metricaCatalogoId).toContain(indicator.puntaje);
      }
    }
  });

  it('recupera y migra los datos guardados con la clave anterior', () => {
    const legacyKey = 'bienestar-porcino.demo.v1';
    const seeded = createSeedDatabase();
    const previous = {
      ...seeded,
      version: 4 as const,
      indicators: seeded.indicators.map((indicator) =>
        indicator.id === 'IND-EV-2026-001-limpieza-comederos'
          ? { ...indicator, puntaje: 88, aplicabilidad: 'aplica' as const }
          : indicator.id === 'IND-EV-2026-002-proteccion-cerdas-grupo'
            ? { ...indicator, puntaje: 100, aplicabilidad: 'aplica' as const }
          : indicator
      )
    };
    window.localStorage.setItem(legacyKey, JSON.stringify(previous));

    const result = loadDatabase();

    expect(result.error).toBeNull();
    expect(result.database.version).toBe(5);
    expect(
      result.database.indicators.find(
        (indicator) => indicator.id === 'IND-EV-2026-001-limpieza-comederos'
      )?.puntaje
    ).toBe(100);
    expect(
      result.database.indicators.find(
        (indicator) =>
          indicator.id === 'IND-EV-2026-002-proteccion-cerdas-grupo'
      )
    ).toMatchObject({ aplicabilidad: 'aplica', puntaje: 2, estado: 'Registrado' });
    expect(window.localStorage.getItem(legacyKey)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
