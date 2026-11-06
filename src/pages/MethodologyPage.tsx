import { BookOpen, Calculator, Layers, Scale, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Disclaimer } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import type { MeasureBase } from '../types';
import {
  CRITERIA,
  LIBERTIES,
  METHODOLOGY_CODE,
  VERIFIED_METRIC_INFO,
  criteriaForLiberty
} from '../features/indicators/catalog';

const TIPO_TONE: Record<MeasureBase, 'info' | 'accent' | 'neutral'> = {
  Recursos: 'info',
  Animales: 'accent',
  Gestión: 'neutral'
};

export function MethodologyPage() {
  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Marco de referencia"
        title="Metodología de evaluación"
        description="Estructura operativa de cuatro libertades y 43 criterios basada en la metodología EBA Porcinos 3.0."
        actions={<Badge tone="accent">{METHODOLOGY_CODE}</Badge>}
      />

      <section className="method-hero">
        <div className="method-hero__icon" aria-hidden="true">
          <BookOpen size={28} />
        </div>
        <div>
          <h2>Cómo se organiza la evaluación</h2>
          <p>
            Cada criterio pertenece a una de las cuatro libertades y se clasifica según la fuente de
            verificación: recursos del alojamiento, observación de los animales o revisión de la
            gestión documental. La puntuación de cada libertad se pondera para obtener un resultado
            global de 0 a 100.
          </p>
        </div>
        <div className="method-hero__chips">
          <span>
            <strong>{LIBERTIES.length}</strong> libertades
          </span>
          <span>
            <strong>{CRITERIA.length}</strong> criterios
          </span>
          <span>
            <strong>0–100</strong> escala
          </span>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Ponderación</p>
              <h2>Las cuatro libertades</h2>
            </div>
            <Scale size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          <div className="weight-list">
            {LIBERTIES.map((liberty, index) => {
              const total = criteriaForLiberty(liberty.id).length;
              return (
                <div className="weight-row" key={liberty.id}>
                  <span className="weight-row__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="weight-row__main">
                    <strong>{liberty.nombre}</strong>
                    <small>{total} criterios asociados</small>
                  </div>
                  <div className="weight-row__bar" aria-hidden="true">
                    <span style={{ width: `${liberty.peso}%` }} />
                  </div>
                  <span className="weight-row__value">{liberty.peso}%</span>
                </div>
              );
            })}
          </div>
          <p className="card__subtitle">
            La suma de las ponderaciones es 100%. Un criterio marcado como “no aplica” se califica
            con 0 puntos y se incluye en el promedio de su libertad.
          </p>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Cálculo</p>
              <h2>Reglas del resultado operativo</h2>
            </div>
            <Calculator size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          <ol className="step-list">
            <li>
              <strong>Promedio por libertad.</strong> Se promedian los puntajes de los criterios
              aplicables que no estén pendientes de revisión.
            </li>
            <li>
              <strong>Ponderación global.</strong> Cada promedio se multiplica por el peso de su
              libertad y se suman los cuatro valores.
            </li>
            <li>
              <strong>Resultado completo.</strong> Solo se muestra el puntaje global cuando todos los
              criterios aplicables tienen respuesta y ninguna libertad queda sin puntaje.
            </li>
            <li>
              <strong>Clasificación.</strong> 90 o más: excelente; 75–89,9: alto; 50–74,9: medio;
              menos de 50: bajo bienestar.
            </li>
          </ol>
          <div className="tone-legend">
            <span className="tone-legend__item tone-legend__item--success">75–100 Favorable</span>
            <span className="tone-legend__item tone-legend__item--warning">50–74,9 Parcial</span>
            <span className="tone-legend__item tone-legend__item--danger">0–49,9 Crítico</span>
          </div>
        </section>
      </div>

      <section className="card">
        <header className="card__header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Criterios por libertad</h2>
          </div>
          <Badge tone="neutral">
            <Layers size={13} aria-hidden="true" /> {CRITERIA.length} criterios
          </Badge>
        </header>
        <div className="methodology-grid">
          {LIBERTIES.map((liberty) => {
            const criteria = criteriaForLiberty(liberty.id);
            return (
              <article className="method-card" key={liberty.id}>
                <header className="method-card__header">
                  <div>
                    <h3>{liberty.nombre}</h3>
                    <span>{liberty.peso}% de la ponderación</span>
                  </div>
                  <Badge tone="accent">{criteria.length}</Badge>
                </header>
                <ul className="method-card__list">
                  {criteria.map((criterion) => (
                    <li key={criterion.id}>
                      <span>{criterion.nombre}</span>
                      <Badge tone={TIPO_TONE[criterion.tipo]}>{criterion.tipo}</Badge>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <div>
            <p className="eyebrow">Ejemplos de calificación</p>
            <h2>Rangos de puntaje</h2>
          </div>
          <ShieldCheck size={20} className="card__header-icon" aria-hidden="true" />
        </header>
        <p className="card__subtitle">
          En el formulario, el evaluador marca si el criterio aplica y selecciona directamente el
          rango que corresponde a su calificación. La plataforma no solicita repetir el proceso de
          verificación ni calcular la metodología.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Criterio</th>
                <th scope="col">Referencia</th>
                <th scope="col">Rangos de calificación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="data-table__primary">
                    <strong>{VERIFIED_METRIC_INFO['limpieza-comederos'].nombre}</strong>
                    <span>Recursos</span>
                  </div>
                </td>
                <td>
                  <span className="data-table__muted">
                    {VERIFIED_METRIC_INFO['limpieza-comederos'].fuente}
                  </span>
                </td>
                <td>
                  <span className="data-table__muted">
                    100 si todos están limpios y sin riesgo; 55 si más de la mitad están limpios y sin
                    riesgo; 0 en los demás casos.
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="data-table__primary">
                    <strong>{VERIFIED_METRIC_INFO['limpieza-bebederos'].nombre}</strong>
                    <span>Recursos</span>
                  </div>
                </td>
                <td>
                  <span className="data-table__muted">
                    {VERIFIED_METRIC_INFO['limpieza-bebederos'].fuente}
                  </span>
                </td>
                <td>
                  <span className="data-table__muted">
                    100 si no hay bebederos sucios; 55 si los sucios son 25% o menos; 20 si son 50% o
                    menos; 0 si superan el 50%.
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="data-table__primary">
                    <strong>Jaulas de libre acceso y/o muros de ocultación</strong>
                    <span>Recursos</span>
                  </div>
                </td>
                <td>
                  <span className="data-table__muted">
                    Criterio aplicable a grupos de más de 40 cerdas.
                  </span>
                </td>
                <td>
                  <span className="data-table__muted">
                    Cumple: +2 puntos al resultado de la libertad; no cumple: −2 puntos. Si no
                    aplica, el ajuste es 0.
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Disclaimer>
        La estructura y las reglas mostradas son de apoyo operativo y no sustituyen la metodología
        oficial, el criterio técnico del evaluador ni los procesos de certificación del ICA.
      </Disclaimer>
    </div>
  );
}
