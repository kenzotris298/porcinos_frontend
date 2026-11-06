import { FileCheck2, FileText, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { FormField, Select } from '../../components/FormField';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { useLocalData } from '../../data/LocalDataProvider';
import { useAuth } from '../auth/AuthProvider';
import {
  MAX_EVIDENCE_BYTES,
  isImage,
  readFileAsDataUrl,
  validateEvidenceFile
} from '../../utils/file';
import { formatBytes } from '../../utils/format';

export function EvidenceUploadForm({
  open,
  defaultEvaluationId,
  onClose
}: {
  open: boolean;
  defaultEvaluationId?: string;
  onClose: () => void;
}) {
  const { database, addEvidence } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [evaluationId, setEvaluationId] = useState('');
  const [indicatorId, setIndicatorId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEvaluationId(defaultEvaluationId ?? '');
    setIndicatorId('');
    setFile(null);
    setMediaType('');
    setPreview(null);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    setDragging(false);
  }, [open, defaultEvaluationId]);

  const indicators = useMemo(
    () => database.indicators.filter((indicator) => indicator.evalId === evaluationId),
    [database.indicators, evaluationId]
  );

  async function acceptFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const check = validateEvidenceFile(nextFile);
    if (!check.valid || !check.mediaType) {
      setFile(null);
      setPreview(null);
      setMediaType('');
      setErrors((current) => ({ ...current, file: check.error ?? 'Archivo no válido.' }));
      return;
    }
    setFile(nextFile);
    setMediaType(check.mediaType);
    setErrors((current) => ({ ...current, file: '' }));
    try {
      const data = await readFileAsDataUrl(nextFile);
      setPreview(isImage(check.mediaType) ? data : null);
    } catch {
      setPreview(null);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void acceptFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFile(event.dataTransfer.files?.[0]);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setMediaType('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!evaluationId) nextErrors.evaluationId = 'Selecciona la evaluación.';
    if (!indicatorId) nextErrors.indicatorId = 'Selecciona el indicador asociado.';
    if (!file || !mediaType) nextErrors.file = 'Adjunta una imagen o documento PDF.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!file || !session) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      addEvidence({
        indicadorId: indicatorId,
        evaluationId,
        nombre: file.name,
        tipo: mediaType,
        tamano: file.size,
        uploadedBy: session.name,
        dataUrl
      });
      notify('Evidencia cargada correctamente.');
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo cargar la evidencia.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Cargar evidencia"
      description="Adjunta una fotografía o documento que respalde el hallazgo de un indicador."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="evidence-form"
            loading={saving}
            icon={<UploadCloud size={16} />}
          >
            Cargar evidencia
          </Button>
        </>
      }
    >
      <form id="evidence-form" className="form" onSubmit={handleSubmit} noValidate>
        {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

        <div className="form-grid">
          <FormField id="ev-evaluation" label="Evaluación" error={errors.evaluationId} required>
            <Select
              id="ev-evaluation"
              value={evaluationId}
              invalid={Boolean(errors.evaluationId)}
              onChange={(event) => {
                setEvaluationId(event.target.value);
                setIndicatorId('');
                if (errors.evaluationId) {
                  setErrors((current) => ({ ...current, evaluationId: '' }));
                }
              }}
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
            id="ev-indicator"
            label="Indicador asociado"
            error={errors.indicatorId}
            hint={evaluationId ? undefined : 'Primero selecciona una evaluación.'}
            required
          >
            <Select
              id="ev-indicator"
              value={indicatorId}
              disabled={!evaluationId}
              invalid={Boolean(errors.indicatorId)}
              onChange={(event) => {
                setIndicatorId(event.target.value);
                if (errors.indicatorId) {
                  setErrors((current) => ({ ...current, indicatorId: '' }));
                }
              }}
            >
              <option value="">
                {evaluationId
                  ? indicators.length
                    ? 'Selecciona un indicador'
                    : 'Esta evaluación no tiene indicadores'
                  : 'Selecciona un indicador'}
              </option>
              {indicators.map((indicator) => (
                <option key={indicator.id} value={indicator.id}>
                  {indicator.nombre}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          id="ev-file"
          label="Archivo"
          error={errors.file}
          hint={`JPG, PNG, WebP o PDF · máximo ${formatBytes(MAX_EVIDENCE_BYTES)}.`}
          required
        >
          <input
            ref={inputRef}
            id="ev-file"
            type="file"
            className="visually-hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
          />
          <label
            htmlFor="ev-file"
            className={`dropzone ${dragging ? 'is-dragging' : ''} ${errors.file ? 'dropzone--invalid' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <>
                <span className="dropzone__preview">
                  {preview ? (
                    <img src={preview} alt="" />
                  ) : (
                    <FileText size={26} aria-hidden="true" />
                  )}
                </span>
                <span className="dropzone__text">
                  <strong>{file.name}</strong>
                  <small>{formatBytes(file.size)} · listo para cargar</small>
                </span>
                <span className="dropzone__check">
                  <FileCheck2 size={19} aria-hidden="true" />
                </span>
              </>
            ) : (
              <>
                <span className="dropzone__icon">
                  <UploadCloud size={26} aria-hidden="true" />
                </span>
                <span className="dropzone__text">
                  <strong>Haz clic o arrastra un archivo aquí</strong>
                  <small>La evidencia quedará asociada al indicador seleccionado.</small>
                </span>
              </>
            )}
          </label>
        </FormField>

        {file ? (
          <button type="button" className="text-button" onClick={clearFile}>
            Quitar archivo seleccionado
          </button>
        ) : null}
      </form>
    </Modal>
  );
}
