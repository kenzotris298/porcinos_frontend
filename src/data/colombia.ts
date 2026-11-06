import divipolaData from './divipola.json';
import type { Farm, ProductionSystem } from '../types';

export interface DepartmentOption {
  code: string;
  name: string;
}

export interface MunicipalityOption {
  code: string;
  departmentCode: string;
  name: string;
  type: string;
}

interface DivipolaCatalog {
  source: string;
  sourceVersion: string;
  sourceUrl: string;
  license: string;
  departments: DepartmentOption[];
  municipalities: MunicipalityOption[];
}

const catalog = divipolaData as DivipolaCatalog;

export const DEPARTMENTS = catalog.departments;
export const MUNICIPALITIES = catalog.municipalities;

export const PRODUCTION_SYSTEMS: Array<{ value: ProductionSystem; label: string }> = [
  { value: 'breeding', label: 'Cría (granjas de reproductoras)' },
  { value: 'fattening', label: 'Engorde (levante-ceba)' },
  { value: 'full-cycle', label: 'Ciclo completo / traspatio' }
];

export type ProductionStratum =
  | 'backyard'
  | 'family-commercial'
  | 'commercial-industrial'
  | 'commercial-technical'
  | 'review'
  | 'incomplete';

export interface ProductionStratumResult {
  value: ProductionStratum;
  label: string;
  detail: string;
}

const departmentsByCode = new Map(DEPARTMENTS.map((item) => [item.code, item]));
const municipalitiesByCode = new Map(MUNICIPALITIES.map((item) => [item.code, item]));
const municipalitiesByDepartment = new Map<string, MunicipalityOption[]>();
for (const municipality of MUNICIPALITIES) {
  const entries = municipalitiesByDepartment.get(municipality.departmentCode) ?? [];
  entries.push(municipality);
  municipalitiesByDepartment.set(municipality.departmentCode, entries);
}

function normalizedName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-CO');
}

export function municipalitiesForDepartment(departmentCode: string): MunicipalityOption[] {
  return municipalitiesByDepartment.get(departmentCode) ?? [];
}

export function departmentName(code: string | null): string | undefined {
  return code ? departmentsByCode.get(code)?.name : undefined;
}

export function municipalityName(code: string | null): string | undefined {
  return code ? municipalitiesByCode.get(code)?.name : undefined;
}

export function municipalityByNames(
  department: string,
  municipality: string
): MunicipalityOption | undefined {
  const targetDepartment = normalizedName(department);
  const targetMunicipality = normalizedName(municipality);
  return MUNICIPALITIES.find(
    (item) =>
      normalizedName(item.name) === targetMunicipality &&
      normalizedName(departmentName(item.departmentCode) ?? '') === targetDepartment
  );
}

export function farmDepartmentName(farm: Pick<Farm, 'codigoDepartamento' | 'departamento'>): string {
  return departmentName(farm.codigoDepartamento) ?? farm.departamento;
}

export function farmMunicipalityName(
  farm: Pick<Farm, 'codigoMunicipio' | 'municipio'>
): string {
  return municipalityName(farm.codigoMunicipio) ?? farm.municipio;
}

type CountClass = Exclude<ProductionStratum, 'review' | 'incomplete'>;

function classifyCount(
  count: number | null,
  familyMinimum: number,
  industrialMinimum: number,
  technicalMinimum: number,
  ambiguousBoundary: number
): CountClass | 'review' | null {
  if (count === null || !Number.isInteger(count) || count < 0) return null;
  if (count < familyMinimum) return 'backyard';
  if (count < industrialMinimum) return 'family-commercial';
  if (count === ambiguousBoundary) return 'review';
  if (count < technicalMinimum) return 'commercial-industrial';
  return 'commercial-technical';
}

export function deriveProductionSystem(input: {
  hembrasCria: number | null;
  animalesGordos: number | null;
}): ProductionSystem | '' {
  const { hembrasCria, animalesGordos } = input;
  if (
    hembrasCria === null ||
    animalesGordos === null ||
    !Number.isInteger(hembrasCria) ||
    !Number.isInteger(animalesGordos) ||
    hembrasCria < 0 ||
    animalesGordos < 0
  ) {
    return '';
  }
  if (hembrasCria > 0 && animalesGordos > 0) return 'full-cycle';
  if (hembrasCria > 0) return 'breeding';
  if (animalesGordos > 0) return 'fattening';
  return '';
}

export function classifyProductionStratum(input: {
  tipo: ProductionSystem | '';
  hembrasCria: number | null;
  animalesGordos: number | null;
}): ProductionStratumResult {
  const counts =
    input.tipo === 'breeding'
      ? [classifyCount(input.hembrasCria, 3, 10, 101, 100)]
      : input.tipo === 'fattening'
        ? [classifyCount(input.animalesGordos, 15, 100, 601, 600)]
        : input.tipo === 'full-cycle'
          ? [
              classifyCount(input.hembrasCria, 3, 10, 101, 100),
              classifyCount(input.animalesGordos, 15, 100, 601, 600)
            ]
          : [];

  if (counts.length === 0 || counts.some((value) => value === null)) {
    return {
      value: 'incomplete',
      label: 'Pendiente de cantidades',
      detail: 'Ingresa las cantidades que corresponden al sistema productivo.'
    };
  }
  if (counts.includes('review')) {
    return {
      value: 'review',
      label: 'Revisar clasificación',
      detail: 'La metodología no define el estrato para exactamente 100 hembras de cría o 600 animales gordos.'
    };
  }
  if (counts.some((value) => value !== counts[0])) {
    return {
      value: 'review',
      label: 'Revisar clasificación',
      detail: 'Los conteos ubican el predio en estratos distintos según la metodología.'
    };
  }

  switch (counts[0]) {
    case 'backyard':
      return {
        value: 'backyard',
        label: 'Traspatio',
        detail: 'Menos de 3 hembras de cría o menos de 15 animales gordos.'
      };
    case 'family-commercial':
      return {
        value: 'family-commercial',
        label: 'Comercial familiar',
        detail: 'De 3 a 9 hembras de cría o de 15 a 99 animales gordos.'
      };
    case 'commercial-industrial':
      return {
        value: 'commercial-industrial',
        label: 'Comercial industrial',
        detail: 'De 10 a 99 hembras de cría o de 100 a 599 animales gordos.'
      };
    case 'commercial-technical':
      return {
        value: 'commercial-technical',
        label: 'Tecnificado comercial',
        detail: 'Más de 100 hembras de cría o más de 600 animales gordos.'
      };
    default:
      return {
        value: 'incomplete',
        label: 'Pendiente de cantidades',
        detail: 'Ingresa las cantidades que corresponden al sistema productivo.'
      };
  }
}

export function productionSystemLabel(system: ProductionSystem): string {
  return PRODUCTION_SYSTEMS.find((item) => item.value === system)?.label ?? system;
}
