export interface RatingRange {
  score: number;
  description: string;
}

export interface CriterionRubric {
  question: string;
  ratings: RatingRange[];
}

export const LIBERTY_ADJUSTMENT_CRITERION_ID = 'proteccion-cerdas-grupo';

function rubric(question: string, ranges: [number, string][]): CriterionRubric {
  return {
    question,
    ratings: ranges.map(([score, description]) => ({ score, description }))
  };
}

export const CRITERION_RUBRICS: Record<string, CriterionRubric> = {
  'limpieza-comederos': rubric(
    '¿Los materiales del comedero garantizan la calidad del alimento y facilitan la limpieza y desinfección?',
    [
      [100, '100% limpios y sin riesgo de contaminación.'],
      [55, 'Más del 50% limpios y sin riesgo de contaminación.'],
      [0, '50% o menos limpios, o con riesgo de contaminación.']
    ]
  ),
  'flujo-agua': rubric(
    '¿Los animales disponen de acceso permanente a suficiente cantidad de agua?',
    [
      [100, 'Bebederos conformes: 100%.'],
      [55, 'Bebederos conformes: ≥75% y <100%.'],
      [20, 'Bebederos conformes: >50% y <75%.'],
      [0, 'Bebederos no conformes: ≥50%.']
    ]
  ),
  'limpieza-bebederos': rubric(
    '¿Los bebederos garantizan el acceso de agua en condiciones higiénicas?',
    [
      [100, 'Bebederos limpios: 100%.'],
      [55, 'Bebederos sucios: ≤25%.'],
      [20, 'Bebederos sucios: >25% y ≤50%.'],
      [0, 'Bebederos sucios: >50%.']
    ]
  ),
  'altura-bebederos': rubric(
    '¿La altura de los bebederos es adecuada a la edad y el tamaño de los animales?',
    [
      [100, 'Bebederos a altura correcta: 100%.'],
      [55, 'Bebederos a altura correcta: >50%.'],
      [20, 'Bebederos a altura correcta: ≤50%.'],
      [0, 'Bebederos a altura correcta: 0%.']
    ]
  ),
  'ratio-bebederos': rubric(
    '¿Se dispone de mínimo un bebedero funcional por cada diez cerdos y dos bebederos disponibles por animal desde precebo?',
    [
      [100, '≤10 animales por bebedero y ≥2 puntos de agua por animal.'],
      [80, '≤10 animales por bebedero y <2 puntos de agua por animal.'],
      [55, '>10 animales por bebedero y ≥2 puntos de agua por animal.'],
      [20, '>10 animales por bebedero y <2 puntos de agua por animal.']
    ]
  ),
  'condicion-corporal': rubric(
    '¿Los animales presentan una buena condición corporal?',
    [
      [100, 'Gestantes, lactantes, reemplazos y verracos: puntuación 2 <10% y puntuación 1 <10%; precebo y ceba: puntuación 2 <3%.'],
      [55, 'Gestantes, lactantes, reemplazos y verracos: puntuación 2 de 10–20% y puntuación 1 de 10–15%; precebo y ceba: puntuación 2 de 3–8,4%.'],
      [20, 'Gestantes, lactantes, reemplazos y verracos: puntuación 2 de 10–20% y puntuación 1 de 15–20%; precebo y ceba: puntuación 2 de 8,5–32%.'],
      [0, 'Gestantes, lactantes, reemplazos y verracos: puntuación 1 >20% y/o puntuación 2 >20%; precebo y ceba: puntuación 2 >32%.']
    ]
  ),
  'dieta-registro-ica': rubric(
    '¿Todos los alimentos suministrados a los porcinos cumplen con la normatividad ICA vigente?',
    [
      [100, 'Dieta comercial con registro ICA.'],
      [55, 'Dieta de autoconsumo/no comercial con aval de profesional (MVZ/Zootecnista).'],
      [0, 'Dieta de autoconsumo/no comercial sin aval técnico profesional.']
    ]
  ),
  'alimentacion-fisiologica': rubric(
    '¿Se garantiza el acceso a una alimentación equilibrada, adaptada, cualitativa y cuantitativamente a las necesidades fisiológicas de cada etapa productiva?',
    [
      [100, '5 de 5 aspectos cumplidos.'],
      [55, '4 de 5 aspectos cumplidos.'],
      [20, '3 de 5 aspectos cumplidos.'],
      [0, 'Menos de 3 aspectos cumplidos o presencia de alimentos vencidos.']
    ]
  ),
  'ayuno-transporte': rubric(
    '¿Existe un registro que evidencia las horas de ayuno de los animales que van a ser transportados con destino a una planta de beneficio?',
    [
      [100, 'Dispone de registros y ayuno ≥8 horas en el 100% de los casos.'],
      [0, 'Sin registros o ayuno <8 horas.']
    ]
  ),
  'proteccion-ambiental': rubric(
    '¿Las instalaciones ofrecen protección ante condiciones ambientales?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  ventilacion: rubric(
    '¿Se cuenta con sistemas de ventilación que garantizan una correcta calidad y circulación de aire para el bienestar de los cerdos?',
    [
      [100, 'Sitios con ventilación incorrecta: 0%.'],
      [55, 'Sitios con ventilación incorrecta: ≤10%.'],
      [20, 'Sitios con ventilación incorrecta: >10% y ≤25%.'],
      [0, 'Sitios con ventilación incorrecta: >25%.']
    ]
  ),
  iluminacion: rubric(
    '¿Se dispone de iluminación apropiada, natural o artificial, como mínimo durante 8 horas al día?',
    [
      [100, 'Sitios no conformes: 0%.'],
      [55, 'Sitios no conformes: ≤10%.'],
      [20, 'Sitios no conformes: ≤25%.'],
      [0, 'Sitios no conformes: >25%.']
    ]
  ),
  'superficie-descanso': rubric(
    '¿Los animales disponen de una superficie de descanso o apoyo firme, en buen estado y antideslizante, que facilite limpieza, desinfección y drenaje?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'proteccion-lechones': rubric(
    '¿Las instalaciones donde se alojan los lechones lactantes son seguras y brindan las condiciones adecuadas para garantizar su resguardo?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'espacio-cerdas': rubric(
    '¿Las cerdas disponen de suficiente espacio?',
    [
      [100, 'Corrales: grupo <6, joven >2,17 y adulta >3,97 m²; grupo 6–39, joven >1,96 y adulta >2,70 m²; grupo ≥40, joven >1,78 y adulta >2,46 m². Jaulas: largo >2,40 m y ancho >0,70 m.'],
      [55, 'Corrales: grupo <6, joven 1,81–2,17 y adulta 2,48–3,97 m²; grupo 6–39, joven 1,64–1,96 y adulta 2,25–2,70 m²; grupo ≥40, joven 1,49–1,78 y adulta 2,05–2,46 m². Jaulas: largo 2,10–2,40 m y ancho 0,60–0,70 m.'],
      [0, 'Corrales: grupo <6, joven <1,81 o adulta <2,48 m²; grupo 6–39, joven <1,64 o adulta <2,25 m²; grupo ≥40, joven <1,49 o adulta <2,05 m². Jaulas: largo <2,10 m.']
    ]
  ),
  'proteccion-cerdas-grupo': rubric(
    '¿Los corrales donde se alojan las cerdas en grupos de más de 40 animales disponen de jaulas de libre acceso y/o muros de ocultamiento?',
    [
      [2, 'Cumple: suma 2 puntos al resultado de la libertad correspondiente.'],
      [-2, 'No cumple: resta 2 puntos al resultado de la libertad correspondiente.']
    ]
  ),
  'jaula-cerda': rubric(
    '¿El diseño y la dimensión de las jaulas y/o corrales de hembras porcinas en gestación y lactancia se ajustan a su tamaño y permiten una postura cómoda?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'espacio-verracos': rubric(
    '¿Los verracos disponen de suficiente espacio?',
    [
      [100, 'Corrales: área >7,2 m² y ancho >2,64 m. Jaulas: largo >2,88 m y ancho >0,84 m.'],
      [55, 'Corrales: área 6–7,2 m² y ancho 2,20–2,64 m. Jaulas: largo 2,40–2,88 m y ancho 0,70–0,84 m.'],
      [0, 'Corrales: área <6 m² o ancho <2,20 m. Jaulas: largo <2,40 m o ancho <0,70 m.']
    ]
  ),
  'espacio-precebo-ceba': rubric(
    '¿Los cerdos en las fases de precebo, ceba y hembras de reemplazo disponen de suficiente espacio?',
    [
      [100, 'k ≥0,040.'],
      [55, '0,034 ≤ k ≤0,039.'],
      [0, 'k ≤0,033.']
    ]
  ),
  'jadeo-temblores': rubric(
    '¿Los animales presentan jadeos o temblores?',
    [
      [100, 'Jadeo y temblores: 0% de animales afectados.'],
      [55, 'Jadeo y temblores: ≤8% de animales afectados.'],
      [0, 'Jadeo o temblores: >8% de animales afectados.']
    ]
  ),
  amontonamiento: rubric(
    '¿Los animales presentan amontonamiento?',
    [
      [100, 'Animales tumbados amontonados: 0%.'],
      [55, 'Animales tumbados amontonados: ≤20%.'],
      [0, 'Animales tumbados amontonados: >20%.']
    ]
  ),
  'contingencia-agua-alimento': rubric(
    '¿La producción cuenta con un protocolo documentado de contingencia y/o emergencia ante problemas de abastecimiento de agua y alimento?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'plan-desastres': rubric(
    '¿La producción tiene conocimiento de planes de contingencia para desastres naturales establecidos por las autoridades oficiales?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'inspeccion-animales': rubric(
    '¿Las instalaciones permiten una adecuada inspección de los animales?',
    [
      [100, 'Zonas con inspección incorrecta: 0.'],
      [55, 'Zonas con inspección incorrecta: 1.'],
      [20, 'Zonas con inspección incorrecta: 2.'],
      [0, 'Zonas con inspección incorrecta: más de 2.']
    ]
  ),
  'instalaciones-manejo': rubric(
    '¿Las instalaciones y elementos permiten el adecuado manejo y movilización de los animales sin ocasionarles lesión o sufrimiento?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'heces-cuerpo': rubric(
    '¿Los animales tienen heces en el cuerpo?',
    [
      [100, 'Cerdas y verracos: animales sucios ≤2,5%; lechones lactantes: camadas sucias ≤10%; precebo y ceba: animales sucios ≤6%.'],
      [55, 'Cerdas y verracos: >2,5% y ≤10%; lechones lactantes: >10% y ≤20%; precebo y ceba: >6% y ≤16%.'],
      [20, 'Cerdas y verracos: >10% y ≤15%; lechones lactantes: >20% y ≤30%; precebo y ceba: >16% y ≤60%.'],
      [0, 'Cerdas y verracos: >15%; lechones lactantes: >30%; precebo y ceba: >60%.']
    ]
  ),
  'heridas-cuerpo': rubric(
    '¿Los animales tienen lesiones graves en el cuerpo?',
    [
      [100, 'Animales con lesiones graves ≤5%.'],
      [55, 'Animales con lesiones graves >5% y ≤15%.'],
      [20, 'Animales con lesiones graves >15% y ≤20%.'],
      [0, 'Animales con lesiones graves >20%.']
    ]
  ),
  'identificacion-animales': rubric(
    '¿Se identifican los animales mediante métodos que no causen lesión o mutilación?',
    [
      [100, 'No identifica o usa métodos permitidos (chapeta, tatuaje, marcado en frío o RFID).'],
      [0, 'Usa métodos mutilantes (muescas en orejas o hierro caliente).']
    ]
  ),
  'plan-sanitario': rubric(
    '¿El establecimiento dispone de un plan sanitario que incluye prevención, diagnóstico y tratamiento de enfermedades de control oficial y las más frecuentes en la zona?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'programas-oficiales-ica': rubric(
    '¿Cumple con los programas oficiales de prevención, control y erradicación de enfermedades para porcinos establecidos por el ICA?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'enfermedades-declaracion': rubric(
    '¿Se informa inmediatamente al ICA ante la sospecha o presencia de una enfermedad de notificación obligatoria?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'tratamiento-enfermos': rubric(
    '¿Se identifica, aísla cuando es necesario y trata rápidamente a los porcinos enfermos?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'uso-medicamentos': rubric(
    '¿Se cumple con las Buenas Prácticas del Uso de Medicamentos?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'registro-mortalidad': rubric(
    '¿Se cuenta con el registro de mortalidad de todas las etapas productivas?',
    [
      [100, 'Lechones lactantes: 0–<10%; hembras de cría: 0–<5%; precebo ≤2% y ceba ≤1%.'],
      [80, 'Lechones lactantes: 10–<11%; hembras de cría: 5–<6%.'],
      [55, 'Lechones lactantes: 11–<12%; hembras de cría: 6–<10%; precebo 2,1–3,8% y ceba 1,1–2,8%.'],
      [20, 'Lechones lactantes: 12–≤13%; hembras de cría: 10–≤12%; precebo >3,8–5% y ceba >2,8–4,5%.'],
      [0, 'Lechones lactantes >13%; hembras de cría >12%; precebo >5% o ceba >4,5%.']
    ]
  ),
  'procedimiento-manejo': rubric(
    '¿Existe un procedimiento documentado que describe cómo realizar el manejo de los animales de acuerdo con la etapa productiva?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  descolmille: rubric(
    '¿Se realiza descolmille o limado de colmillos? Si se realiza, ¿hay evidencia de su necesidad y lo ejecuta personal capacitado y avalado por un MV o MVZ?',
    [
      [100, 'No se realiza o se hace limado selectivo por personal capacitado.'],
      [55, 'Limado rutinario por personal capacitado o corte selectivo por personal capacitado.'],
      [0, 'Corte rutinario o procedimiento por personal no capacitado.']
    ]
  ),
  descole: rubric(
    '¿Se realiza descole? Si se realiza, ¿hay evidencia de su necesidad, lo ejecuta personal capacitado y avalado por un MV o MVZ, y se utiliza anestesia y analgesia?',
    [
      [100, 'No se realiza o se realiza con anestesia/analgesia por personal capacitado y con justificación.'],
      [55, 'Se realiza antes de los 7 días, sin anestesia, por personal capacitado y con justificación.'],
      [0, 'Se realiza a partir de los 7 días sin anestesia, por personal no capacitado o sin justificación.']
    ]
  ),
  castracion: rubric(
    '¿Se realiza castración inmunológica según el rotulado o castración quirúrgica antes de los 7 días, por personal capacitado y con anestesia y analgesia?',
    [
      [100, 'No se realiza castración quirúrgica, se hace inmunocastración según rotulado o castración quirúrgica con anestesia/analgesia por personal capacitado.'],
      [55, 'Castración quirúrgica antes de los 7 días, sin anestesia y por personal capacitado.'],
      [0, 'Inmunocastración sin seguir el rotulado; castración quirúrgica desde los 7 días sin anestesia; o personal no capacitado.']
    ]
  ),
  'sacrificio-humanitario': rubric(
    '¿Se cuenta con procedimiento de sacrificio humanitario, registros y elementos adecuados para su práctica?',
    [
      [100, '3 de 3 descriptores cumplidos.'],
      [55, '2 de 3 descriptores cumplidos.'],
      [20, '1 de 3 descriptores cumplidos.'],
      [0, '0 de 3 descriptores cumplidos.']
    ]
  ),
  'material-enriquecimiento': rubric(
    '¿Los animales alojados en corrales tienen acceso permanente a material de enriquecimiento?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  ),
  'uso-enriquecimiento': rubric(
    '¿Los animales alojados en corrales usan el material de enriquecimiento?',
    [
      [100, 'Animales interactuando: ≥50%.'],
      [80, 'Animales interactuando: ≥40%.'],
      [55, 'Animales interactuando: ≥30%.'],
      [20, 'Animales interactuando: ≥20%.'],
      [0, 'Animales interactuando: <20%.']
    ]
  ),
  'relacion-humano-animal': rubric(
    '¿Se observa en el predio o granja una relación humano-animal positiva?',
    [
      [100, 'Cerdas gestantes: puntuación 2 ≤10%; precebo y ceba: corrales con pánico 0%.'],
      [55, 'Cerdas gestantes: puntuación 2 >10% y ≤20%; precebo y ceba: corrales con pánico <35%.'],
      [20, 'Precebo y ceba: corrales con pánico 35% a <75%.'],
      [0, 'Cerdas gestantes: puntuación 2 >20%; precebo y ceba: corrales con pánico ≥75%.']
    ]
  ),
  'capacitacion-personal': rubric(
    '¿El personal encargado del manejo está capacitado en uso seguro de medicamentos, manejo, reproducción, cuidado y bienestar de los cerdos, y demuestra esos conocimientos en entrevista?',
    [
      [100, 'Cumple.'],
      [0, 'No cumple.']
    ]
  )
};
