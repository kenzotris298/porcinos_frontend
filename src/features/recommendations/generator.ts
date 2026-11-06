import type { EvaluationInsights, RecommendationSource } from '../../types';
import { findCriterion, isVerifiedMetricCode } from '../indicators/catalog';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from '../indicators/rubrics';

export interface GeneratedRecommendation {
  criterionId: string;
  title: string;
  action: string;
  text: string;
  score: number;
  source: RecommendationSource;
}

const TEMPLATES: Record<string, { title: string; action: string; text: string }> = {
  'limpieza-comederos': {
    title: 'Reforzar la limpieza de comederos',
    action: 'Asignar responsable y registrar la limpieza de cada comedero antes de cada suministro.',
    text: 'Establecer un registro diario de limpieza, retirar los residuos de alimento antes de cada suministro y verificar que no exista humedad o riesgo de contaminación. Repetir la inspección en la próxima visita.'
  },
  'limpieza-bebederos': {
    title: 'Revisar la frecuencia de lavado de bebederos',
    action: 'Programar una limpieza adicional y verificar el estado de cada bebedero.',
    text: 'Programar una limpieza adicional de los bebederos, documentar la acción y verificar el interior de cada punto de agua para detectar acumulación de moho o residuos.'
  },
  'heridas-cuerpo': {
    title: 'Atender y prevenir lesiones cutáneas',
    action: 'Identificar los animales afectados y solicitar valoración veterinaria prioritaria.',
    text: 'Revisar los animales con heridas, registrar la atención veterinaria y verificar causas asociadas al alojamiento, densidad o comportamiento social durante los próximos 15 días.'
  },
  ventilacion: {
    title: 'Optimizar la ventilación de las instalaciones',
    action: 'Medir condiciones ambientales y ajustar ventilación; dejar registro de mediciones y cambios.',
    text: 'Revisar la circulación de aire, medir amoníaco y CO₂ en varios puntos y ajustar la ventilación para mantener niveles adecuados. Documentar las mediciones y la acción aplicada.'
  },
  'material-enriquecimiento': {
    title: 'Fortalecer el enriquecimiento ambiental',
    action: 'Disponer material inocuo y manipulable en los corrales y programar su inspección.',
    text: 'Disponer materiales inocuos, manipulables y masticables de forma permanente, revisar su estado y rotar los elementos para mantener el interés de los animales.'
  },
  'plan-sanitario': {
    title: 'Actualizar el plan sanitario del predio',
    action: 'Revisar y completar el plan con el médico veterinario responsable.',
    text: 'Verificar que el plan esté firmado por un médico veterinario con matrícula vigente, incluya calendario de vacunación y desparasitación, y cuente con los soportes de aplicación.'
  },
  'plan-desastres': {
    title: 'Documentar el plan para desastres naturales',
    action: 'Elaborar o actualizar el plan, asignar responsables y programar un simulacro.',
    text: 'Elaborar o actualizar el plan de respuesta ante sismos, inundaciones e incendios, socializarlo con el personal y programar un simulacro con registro de asistencia.'
  },
  'capacitacion-personal': {
    title: 'Programar capacitación en bienestar animal',
    action: 'Definir fecha, participantes y responsable para una jornada de capacitación.',
    text: 'Diseñar una jornada de formación en manejo humanitario, identificación de signos de dolor o estrés y procedimientos de sacrificio humanitario cuando aplique.'
  },
  [LIBERTY_ADJUSTMENT_CRITERION_ID]: {
    title: 'Mejorar la protección de cerdas alojadas en grupo',
    action: 'Instalar jaulas de libre acceso o muros de ocultamiento donde corresponda y verificar su disponibilidad.',
    text: 'El criterio no cumple y aplica un ajuste de −2 puntos al resultado de la libertad correspondiente. Documentar la medida correctiva y verificarla en la siguiente evaluación.'
  }
};

export function generateRecommendations(insights: EvaluationInsights): GeneratedRecommendation[] {
  return insights.indicators
    .filter(
      (indicator) =>
        indicator.aplicabilidad === 'aplica' &&
        indicator.estado !== 'Pendiente de revisión' &&
        typeof indicator.puntaje === 'number' &&
        (indicator.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID
          ? indicator.puntaje < 0
          : indicator.puntaje < 75)
    )
    .sort((a, b) => (a.puntaje ?? 0) - (b.puntaje ?? 0))
    .map((indicator) => {
      const template = TEMPLATES[indicator.metricaCatalogoId];
      return {
        criterionId: indicator.metricaCatalogoId,
        title: template?.title ?? `Revisar ${indicator.nombre.toLowerCase()}`,
        action:
          template?.action ??
          'Definir responsable y fecha para aplicar una medida correctiva, documentar su ejecución y verificar el resultado.',
        text:
          indicator.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID
            ? template?.text ??
              `El criterio "${indicator.nombre}" aplica un ajuste de ${indicator.puntaje} puntos a la libertad correspondiente.`
            : indicator.puntaje === 0
            ? `Puntaje 0/100: el criterio "${indicator.nombre}" no cumple. ${template?.text ?? 'Priorizar una intervención correctiva, documentarla y verificar su cumplimiento en la siguiente visita.'}`
            : template?.text ??
              `La puntuación de "${indicator.nombre}" fue de ${indicator.puntaje}/100, por debajo del umbral esperado de 75. Definir una acción correctiva con responsable y fecha, documentar el cambio y verificar su efecto en la siguiente evaluación.`,
        score: indicator.puntaje ?? 0,
        source: 'plantilla_local' as const
      };
    });
}

export function recommendationReason(criterionId: string): string {
  const criterion = findCriterion(criterionId);
  if (!criterion) return 'Hallazgo de la evaluación';
  if (isVerifiedMetricCode(criterion.metricaId)) return 'Regla metodológica verificada';
  return criterion.libertadNombre;
}
