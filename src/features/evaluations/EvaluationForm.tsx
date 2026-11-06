import { Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { FormField, Select, TextArea, TextInput } from '../../components/FormField';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { farmMunicipalityName } from '../../data/colombia';
import { useLocalData, type EvaluationInput } from '../../data/LocalDataProvider';
import type { Evaluation } from '../../types';
import { todayAsInputValue } from '../../utils/format';
import {
  hasErrors,
  validateEvaluationDraft,
  type EvaluationDraft,
  type FieldErrors
} from '../../utils/validation';
import { useAuth } from '../auth/AuthProvider';

function emptyDraft(defaultEvaluator: string): EvaluationDraft {
  return {
    predioId: '',
    fecha: todayAsInputValue(),
    hora: '08:00',
    evaluador: defaultEvaluator,
    investigadorNombres: '',
    investigadorApellidos: '',
    observaciones: ''
  };
}

export function EvaluationForm({
  open,
  evaluation,
  onClose,
  onSaved
}: {
  open: boolean;
  evaluation?: Evaluation | null;
  onClose: () => void;
  onSaved?: (record: Evaluation) => void;
}) {
  const { database, saveEvaluation } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const [draft, setDraft] = useState<EvaluationDraft>(() => emptyDraft(session?.name ?? ''));
  const [errors, setErrors] = useState<FieldErrors<keyof EvaluationDraft>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    if (evaluation) {
      setDraft({
        predioId: evaluation.predioId,
        fecha: evaluation.fecha,
        hora: evaluation.hora,
        evaluador: evaluation.evaluador,
        investigadorNombres: evaluation.investigadorNombres,
        investigadorApellidos: evaluation.investigadorApellidos,
        observaciones: evaluation.observaciones
      });
    } else {
      setDraft(emptyDraft(session?.name ?? ''));
    }
  }, [open, evaluation, session?.name]);

  function update<K extends keyof EvaluationDraft>(key: K, value: EvaluationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateEvaluationDraft(draft);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      const input: EvaluationInput = {
        predioId: draft.predioId,
        fecha: draft.fecha,
        hora: draft.hora,
        evaluador: draft.evaluador.trim(),
        investigadorNombres: draft.investigadorNombres.trim(),
        investigadorApellidos: draft.investigadorApellidos.trim(),
        observaciones: draft.observaciones.trim()
      };
      const record = saveEvaluation(input, evaluation?.id);
      notify(evaluation ? 'Evaluación actualizada.' : 'Evaluación creada correctamente.');
      onSaved?.(record);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo guardar la evaluación.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={evaluation ? 'Editar evaluación' : 'Nueva evaluación'}
      description="Registra los datos generales de la visita al predio. Podrás agregar indicadores y evidencias después."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="evaluation-form" loading={saving} icon={<Save size={16} />}>
            {evaluation ? 'Guardar cambios' : 'Crear evaluación'}
          </Button>
        </>
      }
    >
      <form id="evaluation-form" className="form" onSubmit={handleSubmit} noValidate>
        {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

        <div className="form-grid">
          <FormField id="eval-farm" label="Predio" error={errors.predioId} required>
            <Select
              id="eval-farm"
              value={draft.predioId}
              invalid={Boolean(errors.predioId)}
              onChange={(event) => update('predioId', event.target.value)}
            >
              <option value="">Selecciona un predio</option>
              {database.farms.map((farm) => {
                return (
                  <option key={farm.id} value={farm.id}>
                    {farm.nombre} · {farmMunicipalityName(farm)}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <FormField id="eval-date" label="Fecha" error={errors.fecha} required>
            <TextInput
              id="eval-date"
              type="date"
              value={draft.fecha}
              invalid={Boolean(errors.fecha)}
              max={todayAsInputValue()}
              onChange={(event) => update('fecha', event.target.value)}
            />
          </FormField>

          <FormField id="eval-time" label="Hora">
            <TextInput
              id="eval-time"
              type="time"
              value={draft.hora}
              onChange={(event) => update('hora', event.target.value)}
            />
          </FormField>

          <FormField id="eval-evaluator" label="Evaluador" error={errors.evaluador} required>
            <TextInput
              id="eval-evaluator"
              value={draft.evaluador}
              invalid={Boolean(errors.evaluador)}
              placeholder="Nombre completo"
              onChange={(event) => update('evaluador', event.target.value)}
            />
          </FormField>

          <div className="form-grid form-grid--two">
            <FormField
              id="eval-researcher-first"
              label="Nombres del investigador"
              error={errors.investigadorNombres}
              required
            >
              <TextInput
                id="eval-researcher-first"
                value={draft.investigadorNombres}
                invalid={Boolean(errors.investigadorNombres)}
                placeholder="Nombres"
                onChange={(event) => update('investigadorNombres', event.target.value)}
              />
            </FormField>
            <FormField
              id="eval-researcher-last"
              label="Apellidos del investigador"
              error={errors.investigadorApellidos}
              required
            >
              <TextInput
                id="eval-researcher-last"
                value={draft.investigadorApellidos}
                invalid={Boolean(errors.investigadorApellidos)}
                placeholder="Apellidos"
                onChange={(event) => update('investigadorApellidos', event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField
          id="eval-notes"
          label="Observaciones generales"
          error={errors.observaciones}
          hint="Describe el contexto de la visita, condiciones encontradas o pendientes."
        >
          <TextArea
            id="eval-notes"
            rows={4}
            maxLength={2_000}
            value={draft.observaciones}
            invalid={Boolean(errors.observaciones)}
            placeholder="Ej.: Jornada de verificación con acompañamiento del personal del predio."
            onChange={(event) => update('observaciones', event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
