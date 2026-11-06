import { describe, expect, it } from 'vitest';
import {
  DEPARTMENTS,
  MUNICIPALITIES,
  classifyProductionStratum,
  deriveProductionSystem,
  municipalitiesForDepartment
} from './colombia';

describe('catálogo territorial y estrato productivo', () => {
  it('incluye códigos territoriales únicos y municipios vinculados a un departamento', () => {
    expect(DEPARTMENTS).toHaveLength(33);
    expect(MUNICIPALITIES).toHaveLength(1122);
    expect(new Set(DEPARTMENTS.map((item) => item.code)).size).toBe(33);
    expect(new Set(MUNICIPALITIES.map((item) => item.code)).size).toBe(1122);
    expect(municipalitiesForDepartment('25').some((item) => item.code === '25473')).toBe(true);
    expect(municipalitiesForDepartment('05').some((item) => item.code === '05615')).toBe(true);
  });

  it.each([
    [2, 'backyard'],
    [3, 'family-commercial'],
    [9, 'family-commercial'],
    [10, 'commercial-industrial'],
    [99, 'commercial-industrial'],
    [100, 'review'],
    [101, 'commercial-technical']
  ] as const)('clasifica %i hembras de cría según el umbral', (count, expected) => {
    expect(
      classifyProductionStratum({
        tipo: 'breeding',
        hembrasCria: count,
        animalesGordos: 0
      }).value
    ).toBe(expected);
  });

  it.each([
    [14, 'backyard'],
    [15, 'family-commercial'],
    [99, 'family-commercial'],
    [100, 'commercial-industrial'],
    [599, 'commercial-industrial'],
    [600, 'review'],
    [601, 'commercial-technical']
  ] as const)('clasifica %i animales gordos según el umbral', (count, expected) => {
    expect(
      classifyProductionStratum({
        tipo: 'fattening',
        hembrasCria: 0,
        animalesGordos: count
      }).value
    ).toBe(expected);
  });

  it('solicita revisión si ciclo completo cae en dos estratos distintos', () => {
    expect(
      classifyProductionStratum({
        tipo: 'full-cycle',
        hembrasCria: 2,
        animalesGordos: 20
      }).value
    ).toBe('review');
  });

  it.each([
    [5, 0, 'breeding'],
    [0, 20, 'fattening'],
    [5, 20, 'full-cycle'],
    [0, 0, '']
  ] as const)('deriva el sistema a partir de las fases: %i hembras y %i gordos', (hembrasCria, animalesGordos, expected) => {
    expect(deriveProductionSystem({ hembrasCria, animalesGordos })).toBe(expected);
  });
});
