import type { MeasureBase } from '../../types';

/** Catálogo operativo de la metodología EBA Porcinos 3.0 usada por la plataforma. */
export const METHODOLOGY_CODE = 'EBA-Porcinos-3.0';

export type VerifiedMetricCode = 'limpieza-comederos' | 'limpieza-bebederos';

export interface LibertyDefinition {
  id: string;
  nombre: string;
  peso: number;
}

export interface CriterionDefinition {
  id: string;
  nombre: string;
  tipo: MeasureBase;
  orientacion: string;
  metricaId: '' | VerifiedMetricCode;
  libertadId: string;
  libertadNombre: string;
  pesoLibertad: number;
}

export const LIBERTIES: LibertyDefinition[] = [
  { id: 'hambre-sed-malnutricion', nombre: 'Hambre, sed y malnutrición', peso: 30 },
  { id: 'incomodidad-fisica-termica', nombre: 'Molestias físicas y térmicas', peso: 30 },
  { id: 'dolor-lesion-enfermedad', nombre: 'Dolor, lesión y enfermedad', peso: 30 },
  { id: 'comportamiento-temor-angustia', nombre: 'Comportamiento natural, temor y angustia', peso: 10 }
];

export const CRITERIA: CriterionDefinition[] = [
  {
    id: 'limpieza-comederos',
    nombre: 'Estado de los comederos',
    tipo: 'Recursos',
    metricaId: 'limpieza-comederos',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Revisa la muestra de comederos y registra cuántos están limpios y si existe riesgo de contaminación del alimento por heces o moho.'
  },
  {
    id: 'flujo-agua',
    nombre: 'Acceso al agua y flujo de los bebederos',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Afora el caudal y registra etapa, peso y tipo de bebedero. Como referencia: 0,3 L/min en lechones menores de 20 kg; 1,0–1,5 L/min entre 20 y 100 kg; 1,5–2 L/min en reproductoras y verracos.'
  },
  {
    id: 'limpieza-bebederos',
    nombre: 'Estado de limpieza de los bebederos',
    tipo: 'Recursos',
    metricaId: 'limpieza-bebederos',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Inspecciona el interior de los bebederos y registra presencia de heces o moho y el tamaño de la muestra.'
  },
  {
    id: 'altura-bebederos',
    nombre: 'Altura de los bebederos',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Registra altura y tipo de bebedero por etapa; verifica que los animales alcancen el agua sin dificultad ni lesiones.'
  },
  {
    id: 'ratio-bebederos',
    nombre: 'Número de bebederos por animal',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Registra animales por punto funcional y longitud de bebedero lineal. La referencia menciona 1 chupón por cada 10 animales, 8 cm lineales por animal y 2 puntos de agua, con excepción de alojamiento individual.'
  },
  {
    id: 'condicion-corporal',
    nombre: 'Condición corporal',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Evalúa por observación y palpación con escala 0–2; identifica animales delgados, obesos, caquéxicos o con prominencias óseas.'
  },
  {
    id: 'dieta-registro-ica',
    nombre: 'Dietas balanceadas con registro ICA',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Verifica registro ICA para alimento comercial o soporte técnico firmado por profesional competente para dietas no comerciales.'
  },
  {
    id: 'alimentacion-fisiologica',
    nombre: 'Alimentación adaptada a las necesidades fisiológicas',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Revisa formulación, registros de suministro, rotación de lotes y almacenamiento sobre estibas, evitando contaminación cruzada.'
  },
  {
    id: 'ayuno-transporte',
    nombre: 'Ayuno antes del transporte',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'hambre-sed-malnutricion',
    libertadNombre: 'Hambre, sed y malnutrición',
    pesoLibertad: 30,
    orientacion:
      'Comprueba registros del ayuno previo al transporte; la referencia indica mínimo 8 horas y suministro permanente de agua.'
  },
  {
    id: 'proteccion-ambiental',
    nombre: 'Protección ante condiciones ambientales',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Verifica techo, paredes o refugios frente a lluvia, insolación, intemperie y predadores.'
  },
  {
    id: 'ventilacion',
    nombre: 'Ventilación y concentración de gases',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Evalúa circulación de aire y gases. La referencia indica amoníaco <20 ppm y CO₂ <2.500 ppm; registra mediciones, unidades y puntos de muestreo.'
  },
  {
    id: 'iluminacion',
    nombre: 'Iluminación',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Registra horas de iluminación natural o artificial y si permite observar y revisar los animales; la referencia indica al menos 8 horas y una prueba de legibilidad.'
  },
  {
    id: 'superficie-descanso',
    nombre: 'Superficie de descanso',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Inspecciona firmeza y condición antideslizante del piso, drenaje y acumulación de líquidos.'
  },
  {
    id: 'proteccion-lechones',
    nombre: 'Resguardo para lechones',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Verifica elementos en maternidad que protejan a los lechones del aplastamiento por la cerda.'
  },
  {
    id: 'espacio-cerdas',
    nombre: 'Espacio disponible para cerdas',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Mide área útil por cerda en corrales o largo y ancho de jaulas; registra número de animales y etapa.'
  },
  {
    id: 'proteccion-cerdas-grupo',
    nombre: 'Jaulas de libre acceso o muros de ocultación en grupos de más de 40 cerdas',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'En grupos de más de 40 cerdas, registra presencia de jaulas de libre acceso o muros de ocultación; confirma si el criterio aplica al sistema.'
  },
  {
    id: 'jaula-cerda',
    nombre: 'Jaulas adecuadas al tamaño de la cerda',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Comprueba que la cerda pueda levantarse, acostarse y adoptar posturas cómodas sin golpear las estructuras.'
  },
  {
    id: 'espacio-verracos',
    nombre: 'Espacio disponible para verracos',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Mide área útil y ancho del corral o dimensiones de la jaula; registra número de animales y modalidad de alojamiento.'
  },
  {
    id: 'espacio-precebo-ceba',
    nombre: 'Espacio para precebo, ceba y reemplazos',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Registra área útil A y peso vivo promedio PV; la constante de referencia es k = A / (PV)^0,66. Confirma unidades y tabla aplicable antes de puntuar.'
  },
  {
    id: 'jadeo-temblores',
    nombre: 'Jadeo o temblores',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Observa animales en reposo y registra jadeo o temblores y su frecuencia. La referencia señala >28 respiraciones/min en adultos y >55 en lechones.'
  },
  {
    id: 'amontonamiento',
    nombre: 'Amontonamiento de animales',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Registra el porcentaje de animales tumbados con más de la mitad del cuerpo sobre otro animal.'
  },
  {
    id: 'contingencia-agua-alimento',
    nombre: 'Plan de contingencia para falta de agua y alimento',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Verifica que exista un plan documentado con acciones ante interrupciones de agua o alimento.'
  },
  {
    id: 'plan-desastres',
    nombre: 'Plan para desastres naturales',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'incomodidad-fisica-termica',
    libertadNombre: 'Molestias físicas y térmicas',
    pesoLibertad: 30,
    orientacion:
      'Comprueba que exista un plan y que el personal conozca las acciones ante sismos, inundaciones, incendios o evacuaciones.'
  },
  {
    id: 'inspeccion-animales',
    nombre: 'Facilidad de inspección de los animales',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Recorre las instalaciones y verifica que todos los corrales y zonas permitan revisar visualmente a los animales.'
  },
  {
    id: 'instalaciones-manejo',
    nombre: 'Instalaciones y elementos para manejo',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Inspecciona pasillos y elementos de conducción: accesibilidad, ausencia de obstáculos o encharcamientos y disponibilidad de elementos de arreo adecuados.'
  },
  {
    id: 'heces-cuerpo',
    nombre: 'Heces sobre el cuerpo',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Registra suciedad corporal por etapa productiva y método de muestreo, diferenciando cerdas, verracos, lechones y animales de ceba.'
  },
  {
    id: 'heridas-cuerpo',
    nombre: 'Heridas en el cuerpo',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Cuenta animales con lesiones graves o heridas abiertas; registra tamaño y ubicación. La referencia define lesión grave como herida abierta >5 cm.'
  },
  {
    id: 'identificacion-animales',
    nombre: 'Identificación de animales',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Verifica método de identificación y registra si es no mutilante (por ejemplo, chapeta, tatuaje o radiofrecuencia); señala métodos potencialmente lesivos.'
  },
  {
    id: 'plan-sanitario',
    nombre: 'Plan sanitario de prevención y diagnóstico',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Revisa que el plan esté avalado por MV/MVZ con matrícula vigente e incluya prevención, vacunación, desparasitación y diagnóstico.'
  },
  {
    id: 'programas-oficiales-ica',
    nombre: 'Programas oficiales del ICA',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Comprueba registros del predio y evidencias de cumplimiento de programas o campañas oficiales del ICA aplicables.'
  },
  {
    id: 'enfermedades-declaracion',
    nombre: 'Enfermedades de declaración obligatoria',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Verifica que haya un procedimiento para reconocer, comunicar y reportar oportunamente sospechas de enfermedades de declaración obligatoria.'
  },
  {
    id: 'tratamiento-enfermos',
    nombre: 'Tratamiento de animales enfermos',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Comprueba identificación, aislamiento, atención veterinaria y registros de tratamientos de animales enfermos.'
  },
  {
    id: 'uso-medicamentos',
    nombre: 'Buenas prácticas de uso de medicamentos (BUM)',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Revisa almacenamiento, prescripción, registro de aplicación, conservación y cumplimiento de tiempos de retiro de medicamentos.'
  },
  {
    id: 'registro-mortalidad',
    nombre: 'Registro de mortalidad',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Verifica registros de mortalidad por etapa y periodo, con número de animales muertos y población de referencia.'
  },
  {
    id: 'procedimiento-manejo',
    nombre: 'Procedimiento de manejo de los animales',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Comprueba que existan pautas de manejo humanitario y que el personal las aplique durante movilización y arreo.'
  },
  {
    id: 'descolmille',
    nombre: 'Prácticas dolorosas: descolmille o limado de colmillos',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Registra si se realiza descolmille o limado, su justificación, método, edad del animal, responsable y medidas de alivio del dolor.'
  },
  {
    id: 'descole',
    nombre: 'Prácticas dolorosas: descole',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Registra indicación, edad, método, responsable y medidas de prevención o alivio del dolor para el descole.'
  },
  {
    id: 'castracion',
    nombre: 'Castración inmunológica o quirúrgica',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Registra si la castración es inmunológica o quirúrgica y verifica protocolo, responsable y medidas de alivio del dolor.'
  },
  {
    id: 'sacrificio-humanitario',
    nombre: 'Sacrificio humanitario',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'dolor-lesion-enfermedad',
    libertadNombre: 'Dolor, lesión y enfermedad',
    pesoLibertad: 30,
    orientacion:
      'Verifica procedimientos, capacitación, elementos disponibles y registros que demuestren una pérdida rápida e irreversible de la conciencia.'
  },
  {
    id: 'material-enriquecimiento',
    nombre: 'Material de enriquecimiento',
    tipo: 'Recursos',
    metricaId: '',
    libertadId: 'comportamiento-temor-angustia',
    libertadNombre: 'Comportamiento natural, temor y angustia',
    pesoLibertad: 10,
    orientacion:
      'Comprueba acceso permanente a materiales inocuos, manipulables, destructibles o masticables que permitan explorar y reducir conductas anormales.'
  },
  {
    id: 'uso-enriquecimiento',
    nombre: 'Uso del material de enriquecimiento',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'comportamiento-temor-angustia',
    libertadNombre: 'Comportamiento natural, temor y angustia',
    pesoLibertad: 10,
    orientacion:
      'Observa la interacción con los materiales y registra el número o porcentaje de animales que los usan y las condiciones de observación.'
  },
  {
    id: 'relacion-humano-animal',
    nombre: 'Relación humano-animal',
    tipo: 'Animales',
    metricaId: '',
    libertadId: 'comportamiento-temor-angustia',
    libertadNombre: 'Comportamiento natural, temor y angustia',
    pesoLibertad: 10,
    orientacion:
      'Evalúa miedo o respuesta de huida/pánico mediante aproximación e intentos de contacto; registra etapa, protocolo y resultado.'
  },
  {
    id: 'capacitacion-personal',
    nombre: 'Capacitación del personal',
    tipo: 'Gestión',
    metricaId: '',
    libertadId: 'comportamiento-temor-angustia',
    libertadNombre: 'Comportamiento natural, temor y angustia',
    pesoLibertad: 10,
    orientacion:
      'Verifica formación y conocimientos del personal en manejo, reproducción, salud, bienestar y, cuando corresponda, sacrificio humanitario.'
  }
];

export const CRITERIA_BY_ID = new Map(CRITERIA.map((criterion) => [criterion.id, criterion]));

export const VERIFIED_METRIC_INFO: Record<
  VerifiedMetricCode,
  { nombre: string; fuente: string; orientacion: string }
> = {
  'limpieza-comederos': {
    nombre: 'Estado de los comederos',
    fuente: 'Cap. 2, tabla 4, p. 21; cap. 3, tabla 39, p. 59',
    orientacion: CRITERIA_BY_ID.get('limpieza-comederos')?.orientacion ?? ''
  },
  'limpieza-bebederos': {
    nombre: 'Estado de limpieza de los bebederos',
    fuente: 'Cap. 2, tabla 7, p. 22; cap. 3, tabla 42, p. 61',
    orientacion: CRITERIA_BY_ID.get('limpieza-bebederos')?.orientacion ?? ''
  }
};

export function criteriaForLiberty(libertadId: string): CriterionDefinition[] {
  return CRITERIA.filter((criterion) => criterion.libertadId === libertadId);
}

export function findCriterion(id: string | undefined | null): CriterionDefinition | undefined {
  return id ? CRITERIA_BY_ID.get(id) : undefined;
}

export function isVerifiedMetricCode(value: string | undefined | null): value is VerifiedMetricCode {
  return value === 'limpieza-comederos' || value === 'limpieza-bebederos';
}

export function scoreCleanFeeders(input: {
  total: number;
  limpios: number;
  riesgoContaminacion: boolean;
}): number | null {
  const { total, limpios, riesgoContaminacion } = input;
  if (!Number.isInteger(total) || !Number.isInteger(limpios) || total < 1) return null;
  if (limpios < 0 || limpios > total) return null;
  if (limpios === total && !riesgoContaminacion) return 100;
  if (limpios * 2 > total && !riesgoContaminacion) return 55;
  return 0;
}

export function scoreCleanDrinkers(input: { total: number; sucios: number }): number | null {
  const { total, sucios } = input;
  if (!Number.isInteger(total) || !Number.isInteger(sucios) || total < 1) return null;
  if (sucios < 0 || sucios > total) return null;
  if (sucios === 0) return 100;
  if (sucios * 4 <= total) return 55;
  if (sucios * 2 <= total) return 20;
  return 0;
}

export function scoreTone(score: number | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score === null || score === undefined || !Number.isFinite(score)) return 'neutral';
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}
