import { Save } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { FormField, Select } from '../../components/FormField';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { useLocalData, type IndicatorInput } from '../../data/LocalDataProvider';
import type { Applicability, IndicatorRecord } from '../../types';
import { CRITERIA, LIBERTIES, findCriterion } from './catalog';
import { CRITERION_RUBRICS, LIBERTY_ADJUSTMENT_CRITERION_ID } from './rubrics';

interface IndicatorDraft {
  evalId: string;
  libertyId: string;
  criterionId: string;
  aplicabilidad: Applicability;
  puntaje: number | null;
}

function emptyDraft(evalId = ''): IndicatorDraft {
  return {
    evalId,
    libertyId: '',
    criterionId: '',
    aplicabilidad: 'aplica',
    puntaje: null
  };
}

export function IndicatorForm({
  open,
  indicator,
  defaultEvalId,
  defaultCriterionId,
  onClose,
  onSaved
}: {
  open: boolean;
  indicator?: IndicatorRecord | null;
  defaultEvalId?: string;
  defaultCriterionId?: string;
  onClose: () => void;
  onSaved?: (record: IndicatorRecord) => void;
}) {
  const { database, saveIndicator } = useLocalData();
  const { notify } = useToast();
  const [draft, setDraft] = useState<IndicatorDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    if (indicator) {
      const currentCriterion = findCriterion(indicator.metricaCatalogoId);
      setDraft({
        evalId: indicator.evalId,
        libertyId: currentCriterion?.libertadId ?? '',
        criterionId: indicator.metricaCatalogoId,
        aplicabilidad: indicator.aplicabilidad,
        puntaje: indicator.aplicabilidad === 'no-aplica' ? 0 : indicator.puntaje
      });
    } else {
      const currentCriterion = findCriterion(defaultCriterionId ?? '');
      setDraft({
        ...emptyDraft(defaultEvalId),
        libertyId: currentCriterion?.libertadId ?? '',
        criterionId: currentCriterion?.id ?? ''
      });
    }
  }, [open, indicator, defaultEvalId, defaultCriterionId]);

  const selectedLiberty = LIBERTIES.find((item) => item.id === draft.libertyId);
  const libertyCriteria = CRITERIA.filter((item) => item.libertadId === draft.libertyId);
  const criterion = findCriterion(draft.criterionId);
  const rubric = criterion ? CRITERION_RUBRICS[criterion.id] : undefined;

  const answeredIds = useMemo(() => {
    if (!draft.evalId) return new Set<string>();
    return new Set(
      database.indicators
        .filter((item) => item.evalId === draft.evalId && item.id !== indicator?.id)
        .map((item) => item.metricaCatalogoId)
    );
  }, [database.indicators, draft.evalId, indicator?.id]);

  function update<K extends keyof IndicatorDraft>(key: K, value: IndicatorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  }

  function handleCriterionChange(value: string) {
    setDraft((current) => ({
      ...current,
      criterionId: value,
      aplicabilidad: 'aplica',
      puntaje: null
    }));
    setErrors({});
  }

  function handleLibertyChange(value: string) {
    setDraft((current) => ({
      ...current,
      libertyId: value,
      criterionId: '',
      aplicabilidad: 'aplica',
      puntaje: null
    }));
    setErrors({});
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!draft.evalId) next.evalId = 'Selecciona la evaluación.';
    if (!draft.criterionId || !criterion || !rubric) {
      next.criterionId = 'Selecciona un criterio del catálogo.';
    }
    if (draft.evalId && draft.criterionId && answeredIds.has(draft.criterionId)) {
      next.criterionId =
        'Este criterio ya tiene una respuesta en la evaluación. Edita el registro existente.';
    }
    if (
      draft.aplicabilidad === 'aplica' &&
      !rubric?.ratings.some((rating) => rating.score === draft.puntaje)
    ) {
      next.puntaje = 'Selecciona uno de los rangos de calificación.';
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!criterion || !rubric) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const applicable = draft.aplicabilidad === 'aplica';
      const selectedRange = applicable
        ? rubric.ratings.find((rating) => rating.score === draft.puntaje)
        : undefined;
      const input: IndicatorInput = {
        evalId: draft.evalId,
        metricaCatalogoId: criterion.id,
        tipo: criterion.tipo,
        nombre: criterion.nombre,
        metodo: 'Selección de rango',
        resultado: applicable ? selectedRange?.description ?? '' : 'No aplica',
        estado:
          applicable &&
          (criterion.id === LIBERTY_ADJUSTMENT_CRITERION_ID
            ? draft.puntaje === -2
            : typeof draft.puntaje === 'number' && draft.puntaje < 60)
            ? 'Requiere seguimiento'
            : 'Registrado',
        aplicabilidad: draft.aplicabilidad,
        puntaje: applicable ? draft.puntaje : 0,
        observaciones: ''
      };
      const record = saveIndicator(input, indicator?.id);
      notify(indicator ? 'Indicador actualizado.' : 'Indicador registrado.');
      onSaved?.(record);
      if (indicator) {
        onClose();
      } else {
        setDraft((current) => ({
          ...emptyDraft(current.evalId),
          libertyId: current.libertyId
        }));
        setErrors({});
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo guardar el indicador.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={indicator ? 'Editar evaluación del criterio' : 'Evaluar criterio'}
      description="Selecciona la evaluación, revisa la pregunta y marca si aplica o el rango de puntaje correspondiente."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="indicator-form"
            loading={saving}
            icon={<Save size={16} />}
            disabled={database.evaluations.length === 0}
          >
            {indicator ? 'Guardar cambios' : 'Guardar evaluación'}
          </Button>
        </>
      }
    >
      {database.evaluations.length === 0 ? (
        <Alert tone="warning" title="Primero crea una evaluación">
          Los criterios deben estar asociados a una evaluación registrada.
        </Alert>
      ) : (
        <form id="indicator-form" className="form" onSubmit={handleSubmit} noValidate>
          {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

          <div className="form-grid form-grid--two">
            <FormField id="ind-eval" label="Evaluación" error={errors.evalId} required>
              <Select
                id="ind-eval"
                value={draft.evalId}
                disabled={Boolean(indicator)}
                invalid={Boolean(errors.evalId)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    evalId: event.target.value,
                    libertyId: '',
                    criterionId: '',
                    puntaje: null
                  }))
                }
              >
                <option value="">Selecciona una evaluación</option>
                {database.evaluations.map((evaluation) => {
                  const farm = database.farms.find((item) => item.id === evaluation.predioId);
                  return (
                    <option key={evaluation.id} value={evaluation.id}>
                      {farm?.nombre ?? 'Predio'} · {evaluation.fecha} · {evaluation.id}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <FormField
              id="ind-liberty"
              label="Libertad"
              error={!draft.libertyId ? errors.criterionId : undefined}
              required
            >
              <Select
                id="ind-liberty"
                value={draft.libertyId}
                onChange={(event) => handleLibertyChange(event.target.value)}
              >
                <option value="">Selecciona una libertad</option>
                {LIBERTIES.map((liberty) => (
                  <option key={liberty.id} value={liberty.id}>
                    {liberty.nombre} · {liberty.peso}%
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {selectedLiberty ? (
            <fieldset
              className="criterion-choice-fieldset"
              aria-invalid={Boolean(errors.criterionId)}
            >
              <legend>
                Selecciona un criterio de «{selectedLiberty.nombre}»
              </legend>
              <div className="criterion-choice-legend" aria-label="Estados de criterios">
                <span className="criterion-choice-legend__item criterion-choice-legend__item--answered">
                  Respondido
                </span>
                <span className="criterion-choice-legend__item criterion-choice-legend__item--pending">
                  Pendiente
                </span>
              </div>
              <div className="criterion-choice-list">
                {libertyCriteria.map((item) => {
                  const itemRubric = CRITERION_RUBRICS[item.id];
                  const alreadyAnswered = answeredIds.has(item.id);
                  const hasResponse =
                    alreadyAnswered ||
                    (indicator?.evalId === draft.evalId &&
                      indicator.metricaCatalogoId === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`criterion-choice ${
                        draft.criterionId === item.id ? 'criterion-choice--selected' : ''
                      }${hasResponse ? ' criterion-choice--answered' : ' criterion-choice--pending'}${
                        alreadyAnswered ? ' criterion-choice--disabled' : ''
                      }`}
                    >
                      <label className="criterion-choice__option">
                        <input
                          type="radio"
                          name="ind-criterion"
                          value={item.id}
                          checked={draft.criterionId === item.id}
                          disabled={alreadyAnswered}
                          onChange={() => handleCriterionChange(item.id)}
                        />
                        <span className="criterion-choice__content">
                          <strong>{item.nombre}</strong>
                          <span
                            className={`criterion-choice__status ${
                              hasResponse
                                ? 'criterion-choice__status--answered'
                                : 'criterion-choice__status--pending'
                            }`}
                          >
                            {hasResponse ? 'Respondido' : 'Pendiente'}
                          </span>
                          {draft.criterionId !== item.id ? (
                            <span>{itemRubric?.question ?? 'Pregunta no disponible.'}</span>
                          ) : null}
                          {alreadyAnswered ? (
                            <small>Este criterio ya tiene respuesta en esta evaluación.</small>
                          ) : null}
                        </span>
                      </label>

                      {draft.criterionId === item.id && itemRubric ? (
                        <div className="criterion-choice__details">
                          <section className="criterion-question" aria-labelledby="ind-question-title">
                            <h3 id="ind-question-title">Pregunta</h3>
                            <p>{itemRubric.question}</p>
                          </section>

                          <fieldset className="applicability-fieldset">
                            <legend>Aplicabilidad</legend>
                            <div className="applicability-options">
                              <label
                                className={`applicability-option ${
                                  draft.aplicabilidad === 'aplica'
                                    ? 'applicability-option--selected'
                                    : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="ind-applicability"
                                  value="aplica"
                                  checked={draft.aplicabilidad === 'aplica'}
                                  onChange={() => {
                                    update('aplicabilidad', 'aplica');
                                    update('puntaje', null);
                                  }}
                                />
                                <span>Aplica</span>
                              </label>
                              <label
                                className={`applicability-option ${
                                  draft.aplicabilidad === 'no-aplica'
                                    ? 'applicability-option--selected'
                                    : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="ind-applicability"
                                  value="no-aplica"
                                  checked={draft.aplicabilidad === 'no-aplica'}
                                  onChange={() => {
                                    update('aplicabilidad', 'no-aplica');
                                    update('puntaje', 0);
                                  }}
                                />
                                <span>No aplica · 0 pts</span>
                              </label>
                            </div>
                          </fieldset>

                          {draft.aplicabilidad === 'aplica' ? (
                            <fieldset className="rating-fieldset">
                              <legend id="ind-ratings-title">Rangos de calificación</legend>
                                <div className="rating-options">
                                {itemRubric.ratings.map((rating, index) => (
                                  <button
                                    key={`${rating.score}-${index}`}
                                    type="button"
                                    className={`rating-option ${
                                      draft.puntaje === rating.score
                                        ? 'rating-option--selected'
                                        : ''
                                    }`}
                                    aria-pressed={draft.puntaje === rating.score}
                                    onClick={() => update('puntaje', rating.score)}
                                  >
                                    <strong>
                                      {item.id === LIBERTY_ADJUSTMENT_CRITERION_ID && rating.score > 0
                                        ? `+${rating.score}`
                                        : rating.score}{' '}
                                      pts
                                    </strong>
                                    <span>{rating.description}</span>
                                  </button>
                                ))}
                              </div>
                              {errors.puntaje ? (
                                <p
                                  className="form-field__message form-field__message--error"
                                  role="alert"
                                >
                                  {errors.puntaje}
                                </p>
                              ) : null}
                            </fieldset>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {errors.criterionId ? (
                <p className="form-field__message form-field__message--error" role="alert">
                  {errors.criterionId}
                </p>
              ) : null}
            </fieldset>
          ) : null}

        </form>
      )}
    </Modal>
  );
}
