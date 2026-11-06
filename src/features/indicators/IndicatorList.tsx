import { Pencil, Trash2 } from 'lucide-react';
import { Badge, scoreBadgeTone, statusTone } from '../../components/Badge';
import type { IndicatorRecord } from '../../types';
import { findCriterion } from './catalog';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from './rubrics';

export function IndicatorList({
  items,
  canEdit,
  onEdit,
  onDelete,
  getEvaluationLabel
}: {
  items: IndicatorRecord[];
  canEdit: boolean;
  onEdit?: (indicator: IndicatorRecord) => void;
  onDelete?: (indicator: IndicatorRecord) => void;
  getEvaluationLabel?: (indicator: IndicatorRecord) => string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Criterio</th>
            {getEvaluationLabel ? <th scope="col">Evaluación</th> : null}
            <th scope="col">Tipo</th>
            <th scope="col">Estado</th>
            <th scope="col" className="data-table__number">
              Puntaje
            </th>
            {canEdit ? <th scope="col" className="data-table__actions">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((indicator) => {
            const criterion = findCriterion(indicator.metricaCatalogoId);
            return (
              <tr key={indicator.id}>
                <td>
                  <div className="data-table__primary">
                    <strong>{indicator.nombre}</strong>
                    <span>{criterion?.libertadNombre ?? indicator.tipo}</span>
                  </div>
                </td>
                {getEvaluationLabel ? (
                  <td>
                    <span className="data-table__muted">{getEvaluationLabel(indicator)}</span>
                  </td>
                ) : null}
                <td>
                  <Badge tone="neutral">{indicator.tipo}</Badge>
                </td>
                <td>
                  <Badge tone={statusTone(indicator.estado)}>{indicator.estado}</Badge>
                </td>
                <td className="data-table__number">
                  {indicator.aplicabilidad === 'no-aplica' ? (
                    <Badge tone="danger">No aplica · 0 pts</Badge>
                  ) : indicator.puntaje === null ? (
                    <Badge tone="neutral">Sin puntaje</Badge>
                  ) : indicator.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID ? (
                    <Badge tone={indicator.puntaje < 0 ? 'danger' : 'success'}>
                      {indicator.puntaje > 0 ? '+' : ''}
                      {indicator.puntaje} pts de ajuste
                    </Badge>
                  ) : (
                    <Badge tone={scoreBadgeTone(indicator.puntaje)}>{indicator.puntaje} pts</Badge>
                  )}
                </td>
                {canEdit ? (
                  <td className="data-table__actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button icon-button--sm"
                        aria-label={`Editar ${indicator.nombre}`}
                        onClick={() => onEdit?.(indicator)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--sm icon-button--danger"
                        aria-label={`Eliminar ${indicator.nombre}`}
                        onClick={() => onDelete?.(indicator)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
