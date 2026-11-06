import type {
  DemoDatabase,
  Evaluation,
  Farm,
  IndicatorRecord,
  MetricSample,
  PersonRecord
} from '../types';
import {
  CRITERIA,
  isVerifiedMetricCode,
  type CriterionDefinition
} from '../features/indicators/catalog';
import {
  CRITERION_RUBRICS,
  LIBERTY_ADJUSTMENT_CRITERION_ID
} from '../features/indicators/rubrics';

const creator = 'Sistema';

const PERSONS: PersonRecord[] = [
  {
    id: 'PER-001',
    cedula: '1000000001',
    nombres: 'María Fernanda Rojas',
    celular: '3000000001',
    correo: 'maria.rojas@example.com',
    createdAt: '2026-10-01T12:00:00.000Z'
  },
  {
    id: 'PER-002',
    cedula: '1000000002',
    nombres: 'Carlos Andrés Mejía',
    celular: '3000000002',
    correo: 'carlos.mejia@example.com',
    createdAt: '2026-10-02T12:00:00.000Z'
  },
  {
    id: 'PER-003',
    cedula: '1000000003',
    nombres: 'Luisa Fernanda Gómez',
    celular: '3000000003',
    correo: 'luisa.gomez@example.com',
    createdAt: '2026-10-03T12:00:00.000Z'
  }
];

const FARMS: Farm[] = [
  {
    id: 'PR-001',
    personaId: 'PER-001',
    codigoDepartamento: '25',
    codigoMunicipio: '25473',
    nombre: 'Granja La Esperanza',
    departamento: 'Cundinamarca',
    municipio: 'Mosquera',
    vereda: 'La Estancia',
    responsable: 'María Fernanda Rojas',
    animales: 420,
    hembrasCria: 5,
    animalesGordos: 80,
    tipo: 'full-cycle'
  },
  {
    id: 'PR-002',
    personaId: 'PER-002',
    codigoDepartamento: '05',
    codigoMunicipio: '05615',
    nombre: 'Porcícola El Roble',
    departamento: 'Antioquia',
    municipio: 'Rionegro',
    vereda: 'Cimarronas',
    responsable: 'Carlos Andrés Mejía',
    animales: 180,
    hembrasCria: 5,
    animalesGordos: 0,
    tipo: 'breeding'
  },
  {
    id: 'PR-003',
    personaId: 'PER-003',
    codigoDepartamento: '76',
    codigoMunicipio: '76520',
    nombre: 'Granja Villa Luz',
    departamento: 'Valle del Cauca',
    municipio: 'Palmira',
    vereda: 'La Torre',
    responsable: 'Luisa Fernanda Gómez',
    animales: 650,
    hembrasCria: 0,
    animalesGordos: 80,
    tipo: 'fattening'
  }
];

const EVALUATIONS: Evaluation[] = [
  {
    id: 'EV-2026-001',
    predioId: 'PR-001',
    fecha: '2026-10-28',
    hora: '08:30',
    evaluador: 'Andrea Salazar',
    investigadorNombres: 'Juan Pablo',
    investigadorApellidos: 'Restrepo',
    observaciones:
      'Jornada de verificación integral. Se revisaron las cuatro libertades con acompañamiento del personal del predio.',
    estado: 'Finalizada',
    createdAt: '2026-10-28T13:30:00.000Z',
    updatedAt: '2026-10-29T09:12:00.000Z'
  },
  {
    id: 'EV-2026-002',
    predioId: 'PR-002',
    fecha: '2026-10-30',
    hora: '09:15',
    evaluador: 'Andrea Salazar',
    investigadorNombres: 'Diana Carolina',
    investigadorApellidos: 'Pardo',
    observaciones:
      'Evaluación en curso. Falta verificar los criterios de gestión documental y la inspección de la zona de ceba.',
    estado: 'En proceso',
    createdAt: '2026-10-30T14:15:00.000Z',
    updatedAt: '2026-10-30T16:40:00.000Z'
  },
  {
    id: 'EV-2026-003',
    predioId: 'PR-003',
    fecha: '2026-11-01',
    hora: '07:45',
    evaluador: 'Carlos Andrés Mejía',
    investigadorNombres: 'Laura Sofía',
    investigadorApellidos: 'Ramírez',
    observaciones:
      'Se identificaron hallazgos relacionados con limpieza de bebederos y lesiones cutáneas. Requiere plan de acción.',
    estado: 'Requiere seguimiento',
    createdAt: '2026-11-01T12:45:00.000Z',
    updatedAt: '2026-11-02T10:05:00.000Z'
  },
  {
    id: 'EV-2026-004',
    predioId: 'PR-001',
    fecha: '2026-09-15',
    hora: '08:00',
    evaluador: 'Andrea Salazar',
    investigadorNombres: 'Juan Pablo',
    investigadorApellidos: 'Restrepo',
    observaciones:
      'Evaluación de seguimiento semestral. El predio mantiene condiciones adecuadas y un plan sanitario documentado.',
    estado: 'Finalizada',
    createdAt: '2026-09-15T13:00:00.000Z',
    updatedAt: '2026-09-16T08:20:00.000Z'
  }
];

const SCORES_EV_001 = [
  55, 88, 55, 90, 80, 74, 95, 85, 78, 92, 68, 84, 88, 76, 94, 82, 90, 62, 74, 86, 58, 91, 82,
  78, 86, 70, 64, 92, 88, 84, 76, 80, 86, 72, 68, 90, 60, 82, 84, 88, 86, 72, 78
];

const SCORES_EV_004 = [
  100, 94, 100, 92, 90, 88, 96, 90, 86, 95, 84, 92, 94, 88, 96, 90, 94, 82, 88, 92, 80, 94, 90,
  88, 92, 86, 84, 95, 92, 90, 88, 86, 90, 84, 82, 94, 78, 90, 92, 94, 90, 86, 88
];

const EV_002_CRITERIA = CRITERIA.slice(0, 17);
const EV_003_CRITERIA = [
  ...CRITERIA.slice(0, 23),
  ...CRITERIA.slice(24, 33),
  ...CRITERIA.slice(37, 43)
];

const NOTES: Record<string, string> = {
  'limpieza-comederos':
    'Muestra de 10 comederos: 9 limpios, sin riesgo de contaminación visible. Se recomienda reforzar el lavado diario.',
  'limpieza-bebederos':
    'Muestra de 8 bebederos: 1 con residuos de moho en la pared interna. Se programó limpieza adicional.',
  'heridas-cuerpo':
    'Se observaron dos animales con lesiones superficiales en la zona de ceba; se remitieron a revisión veterinaria.',
  ventilacion:
    'Medición de amoníaco en 18 ppm y CO₂ en 1.900 ppm. La ventilación cruzada funciona correctamente.',
  'material-enriquecimiento':
    'Se dispone de cuerdas y madera blanda en todos los corrales de ceba; se observó interacción de los animales.',
  'plan-sanitario':
    'El plan está firmado por médico veterinario con matrícula vigente e incluye calendario de vacunación.'
};

function resultText(score: number): string {
  if (score >= 90) {
    return 'Condición conforme. Se evidencia cumplimiento de los requisitos observados durante la visita.';
  }
  if (score >= 75) {
    return 'Cumple con observaciones menores; se recomienda mantener el seguimiento periódico.';
  }
  if (score >= 50) {
    return 'Cumple parcialmente. Se identifican oportunidades de mejora que requieren verificación.';
  }
  return 'No cumple. Se identifican condiciones que requieren acción correctiva y seguimiento.';
}

function methodFor(criterion: CriterionDefinition): string {
  if (criterion.tipo === 'Gestión') return 'Documental';
  if (criterion.tipo === 'Animales') return 'Visual';
  return criterion.id === 'limpieza-comederos' || criterion.id === 'limpieza-bebederos'
    ? 'Visual y documental'
    : 'Inspección visual sujeta a muestreo';
}

function metricFor(evaluationId: string, criterionId: string): MetricSample | undefined {
  if (criterionId === 'limpieza-comederos') {
    if (evaluationId === 'EV-2026-001') {
      return { total: 10, limpios: 9, riesgoContaminacion: false, score: 55 };
    }
    if (evaluationId === 'EV-2026-002') {
      return { total: 8, limpios: 6, riesgoContaminacion: false, score: 55 };
    }
    if (evaluationId === 'EV-2026-003') {
      return { total: 10, limpios: 4, riesgoContaminacion: true, score: 0 };
    }
    return { total: 12, limpios: 12, riesgoContaminacion: false, score: 100 };
  }
  if (criterionId === 'limpieza-bebederos') {
    if (evaluationId === 'EV-2026-001') {
      return { total: 8, sucios: 1, score: 55 };
    }
    if (evaluationId === 'EV-2026-003') {
      return { total: 10, sucios: 3, score: 20 };
    }
    return { total: 10, sucios: 0, score: 100 };
  }
  return undefined;
}

function createIndicator(
  evaluation: Evaluation,
  criterion: CriterionDefinition,
  score: number,
  options: { noAplica?: boolean; pending?: boolean; note?: string } = {}
): IndicatorRecord {
  const timestamp = `${evaluation.fecha}T${evaluation.hora}:00.000Z`;
  const metric = metricFor(evaluation.id, criterion.id);
  const allowedScores = CRITERION_RUBRICS[criterion.id]?.ratings.map((rating) => rating.score) ?? [];
  const normalizedScore =
    allowedScores.reduce(
      (closest, allowed) =>
        Math.abs(allowed - score) < Math.abs(closest - score) ||
        (Math.abs(allowed - score) === Math.abs(closest - score) && allowed > closest)
          ? allowed
          : closest,
      allowedScores[0] ?? 0
    );
  const noAplica = options.noAplica ?? false;
  const pending = options.pending ?? false;
  const finalScore = noAplica ? 0 : normalizedScore;
  return {
    id: `IND-${evaluation.id}-${criterion.id}`,
    evalId: evaluation.id,
    metricaCatalogoId: criterion.id,
    tipo: criterion.tipo,
    nombre: criterion.nombre,
    metodo: methodFor(criterion),
    resultado: noAplica
      ? 'Criterio verificado como no aplicable para el sistema productivo del predio.'
      : CRITERION_RUBRICS[criterion.id]?.ratings.find((rating) => rating.score === finalScore)
          ?.description ?? resultText(finalScore),
    estado: pending
      ? 'Pendiente de revisión'
      : !noAplica &&
          ((criterion.id === LIBERTY_ADJUSTMENT_CRITERION_ID && finalScore < 0) ||
            (criterion.id !== LIBERTY_ADJUSTMENT_CRITERION_ID && finalScore < 60))
        ? 'Requiere seguimiento'
        : 'Registrado',
    aplicabilidad: noAplica ? 'no-aplica' : 'aplica',
    puntaje: finalScore,
    observaciones: options.note ?? NOTES[criterion.id] ?? '',
    ...(metric && !noAplica ? { metricaDatos: metric } : {}),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function buildIndicators(): IndicatorRecord[] {
  const result: IndicatorRecord[] = [];

  const eval001 = EVALUATIONS[0];
  CRITERIA.forEach((criterion, index) => {
    const noAplica = criterion.id === 'proteccion-cerdas-grupo' || criterion.id === 'jaula-cerda';
    const score = metricFor(eval001.id, criterion.id)?.score ?? SCORES_EV_001[index];
    result.push(createIndicator(eval001, criterion, score, { noAplica }));
  });

  const eval002 = EVALUATIONS[1];
  EV_002_CRITERIA.forEach((criterion, index) => {
    const score = metricFor(eval002.id, criterion.id)?.score ?? Math.max(48, 74 - ((index * 3) % 20));
    result.push(
      createIndicator(eval002, criterion, score, {
        noAplica: criterion.id === LIBERTY_ADJUSTMENT_CRITERION_ID,
        pending: index === 6 || index === 12,
        note: index === 3 ? 'Pendiente confirmar altura de bebederos en la zona de maternidad.' : undefined
      })
    );
  });

  const eval003 = EVALUATIONS[2];
  EV_003_CRITERIA.forEach((criterion, index) => {
    const noAplica = index === 15 || index === 16;
    const score = metricFor(eval003.id, criterion.id)?.score ?? Math.max(35, 67 - ((index * 5) % 28));
    result.push(
      createIndicator(eval003, criterion, score, {
        noAplica,
        pending: index === 8 || index === 27,
        note: noAplica ? 'No aplica para el sistema de engorde evaluado.' : undefined
      })
    );
  });

  const eval004 = EVALUATIONS[3];
  CRITERIA.forEach((criterion, index) => {
    const noAplica = criterion.id === 'proteccion-cerdas-grupo';
    const score = metricFor(eval004.id, criterion.id)?.score ?? SCORES_EV_004[index];
    result.push(createIndicator(eval004, criterion, score, { noAplica }));
  });

  return result;
}

function svgEvidence(title: string, subtitle: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="620" viewBox="0 0 960 620">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a9a6b"/>
      <stop offset="100%" stop-color="#64754a"/>
    </linearGradient>
  </defs>
  <rect width="960" height="620" fill="url(#sky)"/>
  <circle cx="790" cy="120" r="58" fill="#fff4c2" opacity="0.82"/>
  <rect y="430" width="960" height="190" fill="url(#ground)"/>
  <path d="M120 430 L120 300 L360 210 L600 300 L600 430 Z" fill="#f1e7d3"/>
  <path d="M90 310 L360 190 L630 310 Z" fill="#a34e3f"/>
  <rect x="320" y="330" width="105" height="100" rx="8" fill="#6b4a3a"/>
  <rect x="470" y="320" width="70" height="45" rx="6" fill="#9fd3dc"/>
  <g fill="#e5b8a1">
    <ellipse cx="205" cy="510" rx="58" ry="37"/>
    <ellipse cx="760" cy="520" rx="66" ry="42"/>
  </g>
  <g fill="#cf9a82">
    <circle cx="166" cy="503" r="25"/>
    <circle cx="716" cy="512" r="28"/>
  </g>
  <g fill="#6d3f34">
    <ellipse cx="160" cy="507" rx="7" ry="5"/>
    <ellipse cx="710" cy="516" rx="8" ry="6"/>
    <ellipse cx="183" cy="495" rx="4" ry="6"/>
    <ellipse cx="732" cy="504" rx="4" ry="6"/>
  </g>
  <rect x="40" y="40" width="430" height="92" rx="16" fill="#123f36" opacity="0.86"/>
  <text x="70" y="82" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${title}</text>
  <text x="70" y="112" font-family="Arial, sans-serif" font-size="17" fill="#d7ebe4">${subtitle}</text>
  <rect x="760" y="548" width="160" height="34" rx="17" fill="#123f36" opacity="0.8"/>
  <text x="840" y="571" font-family="Arial, sans-serif" font-size="15" text-anchor="middle" fill="#ffffff">Registro EBA</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createSeedDatabase(): DemoDatabase {
  const indicators = buildIndicators();
  const findIndicator = (evalId: string, criterionId: string) =>
    indicators.find((item) => item.evalId === evalId && item.metricaCatalogoId === criterionId);

  const evidence = [
    {
      id: 'EVI-001',
      indicadorId: findIndicator('EV-2026-001', 'limpieza-comederos')?.id ?? '',
      evaluationId: 'EV-2026-001',
      nombre: 'comederos-nave-tres.svg',
      tipo: 'image/svg+xml',
      tamano: 148_320,
      createdAt: '2026-10-28T14:02:00.000Z',
      uploadedBy: 'Andrea Salazar',
      dataUrl: svgEvidence('Comederos · Nave 3', 'Muestra de 10 comederos en ceba', '#cfe8dd', '#8fc6b2')
    },
    {
      id: 'EVI-002',
      indicadorId: findIndicator('EV-2026-001', 'limpieza-bebederos')?.id ?? '',
      evaluationId: 'EV-2026-001',
      nombre: 'bebederos-maternidad.svg',
      tipo: 'image/svg+xml',
      tamano: 132_840,
      createdAt: '2026-10-28T14:16:00.000Z',
      uploadedBy: 'Andrea Salazar',
      dataUrl: svgEvidence('Bebederos · Maternidad', 'Inspección interior y registro de suciedad', '#f6e7bd', '#e8c97a')
    },
    {
      id: 'EVI-003',
      indicadorId: findIndicator('EV-2026-001', 'material-enriquecimiento')?.id ?? '',
      evaluationId: 'EV-2026-001',
      nombre: 'enriquecimiento-corral.svg',
      tipo: 'image/svg+xml',
      tamano: 165_210,
      createdAt: '2026-10-28T15:10:00.000Z',
      uploadedBy: 'Andrea Salazar',
      dataUrl: svgEvidence('Enriquecimiento · Corral 4', 'Materiales manipulables y respuesta de los animales', '#dbe6f4', '#a9c2de')
    },
    {
      id: 'EVI-004',
      indicadorId: findIndicator('EV-2026-001', 'plan-sanitario')?.id ?? '',
      evaluationId: 'EV-2026-001',
      nombre: 'plan-sanitario-2026.pdf',
      tipo: 'application/pdf',
      tamano: 684_500,
      createdAt: '2026-10-28T15:32:00.000Z',
      uploadedBy: 'Andrea Salazar'
    },
    {
      id: 'EVI-005',
      indicadorId: findIndicator('EV-2026-002', 'flujo-agua')?.id ?? '',
      evaluationId: 'EV-2026-002',
      nombre: 'aforo-bebederos.svg',
      tipo: 'image/svg+xml',
      tamano: 121_400,
      createdAt: '2026-10-30T15:05:00.000Z',
      uploadedBy: 'Andrea Salazar',
      dataUrl: svgEvidence('Aforo de bebederos', 'Medición de caudal en la zona de cría', '#d8eef0', '#96c9ce')
    },
    {
      id: 'EVI-006',
      indicadorId: findIndicator('EV-2026-003', 'heridas-cuerpo')?.id ?? '',
      evaluationId: 'EV-2026-003',
      nombre: 'lesiones-zona-ceba.svg',
      tipo: 'image/svg+xml',
      tamano: 173_900,
      createdAt: '2026-11-01T13:24:00.000Z',
      uploadedBy: 'Carlos Andrés Mejía',
      dataUrl: svgEvidence('Lesiones · Zona de ceba', 'Registro fotográfico de dos animales con heridas', '#f3d6cf', '#dba79a')
    }
  ];

  return {
    version: 5,
    personas: PERSONS.map((person) => ({ ...person })),
    farms: FARMS.map((farm) => ({ ...farm })),
    evaluations: EVALUATIONS.map((evaluation) => ({ ...evaluation })),
    indicators,
    evidence,
    recommendations: [
      {
        id: 'REC-001',
        evaluationId: 'EV-2026-001',
        title: 'Reforzar la rutina de limpieza de comederos',
        text: 'Establecer un registro diario de limpieza de comederos y retirar los residuos de alimento antes de cada suministro. Verificar que no exista humedad o riesgo de contaminación y repetir la inspección en la próxima visita.',
        source: 'evaluador',
        createdBy: 'Andrea Salazar',
        createdAt: '2026-10-29T09:20:00.000Z',
        updatedAt: '2026-10-29T09:20:00.000Z'
      },
      {
        id: 'REC-002',
        evaluationId: 'EV-2026-001',
        title: 'Revisar la frecuencia de lavado de bebederos',
        text: 'Programar una limpieza adicional de los bebederos de maternidad y documentar la acción. Verificar el interior de cada punto de agua para detectar acumulación de moho o residuos.',
        source: 'plantilla_local',
        createdBy: creator,
        createdAt: '2026-10-29T09:25:00.000Z',
        updatedAt: '2026-10-29T09:25:00.000Z'
      },
      {
        id: 'REC-003',
        evaluationId: 'EV-2026-002',
        title: 'Completar los registros de bienestar animal',
        text: 'Finalizar la verificación documental de los criterios pendientes y adjuntar los soportes del plan sanitario antes de cerrar la evaluación.',
        source: 'evaluador',
        createdBy: 'Andrea Salazar',
        createdAt: '2026-10-30T16:50:00.000Z',
        updatedAt: '2026-10-30T16:50:00.000Z'
      },
      {
        id: 'REC-004',
        evaluationId: 'EV-2026-003',
        title: 'Plan de acción para lesiones cutáneas',
        text: 'Revisar los animales con heridas, registrar la atención veterinaria y revisar las causas del alojamiento. Verificar superficies, densidad y comportamiento social durante los próximos 15 días.',
        source: 'evaluador',
        createdBy: 'Carlos Andrés Mejía',
        createdAt: '2026-11-02T10:10:00.000Z',
        updatedAt: '2026-11-02T10:10:00.000Z'
      }
    ],
    recommendationPlans: [
      {
        evaluationId: 'EV-2026-001',
        generatedAt: '2026-10-29T09:25:00.000Z',
        generatedBy: creator,
        source: 'seed-demo'
      },
      {
        evaluationId: 'EV-2026-002',
        generatedAt: '2026-10-30T16:50:00.000Z',
        generatedBy: 'Andrea Salazar',
        source: 'seed-demo'
      },
      {
        evaluationId: 'EV-2026-003',
        generatedAt: '2026-11-02T10:10:00.000Z',
        generatedBy: 'Carlos Andrés Mejía',
        source: 'seed-demo'
      }
    ]
  };
}

export function createEmptyDatabase(): DemoDatabase {
  return {
    version: 5,
    personas: PERSONS.map((person) => ({ ...person })),
    farms: FARMS.map((farm) => ({ ...farm })),
    evaluations: [],
    indicators: [],
    evidence: [],
    recommendations: [],
    recommendationPlans: []
  };
}

export { isVerifiedMetricCode };
