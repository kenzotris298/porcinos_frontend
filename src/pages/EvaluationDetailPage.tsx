import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Images,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserRound
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Disclaimer } from '../components/Alert';
import { Badge, scoreBadgeTone, statusTone } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader, StatCard } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import {
  farmDepartmentName,
  farmMunicipalityName,
  productionSystemLabel
} from '../data/colombia';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { EvaluationForm } from '../features/evaluations/EvaluationForm';
import { computeEvaluation } from '../features/evaluations/results';
import { EvidenceUploadForm } from '../features/evidence/EvidenceUploadForm';
import { IndicatorForm } from '../features/indicators/IndicatorForm';
import { IndicatorList } from '../features/indicators/IndicatorList';
import type { IndicatorRecord } from '../types';
import { formatBytes, formatDate, formatDateTime, formatNumber } from '../utils/format';
import { ApiEvaluationDetailPage } from './ApiEvaluationPages';

export function EvaluationDetailPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiEvaluationDetailPage />;
  return <LocalEvaluationDetailPage />;
}

function LocalEvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    database,
    deleteEvaluation,
    deleteIndicator,
    finalizeEvaluation,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const [evaluationFormOpen, setEvaluationFormOpen] = useState(false);
  const [indicatorFormOpen, setIndicatorFormOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorRecord | null>(null);
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false);
  const [deletingEvaluation, setDeletingEvaluation] = useState(false);
  const [deletingIndicator, setDeletingIndicator] = useState<IndicatorRecord | null>(null);
  const [confirmFinalization, setConfirmFinalization] = useState(false);
  const [selectedPendingCriterionId, setSelectedPendingCriterionId] = useState('');

  const evaluation = database.evaluations.find((item) => item.id === id);
  const farm = evaluation ? database.farms.find((item) => item.id === evaluation.predioId) : undefined;

  const insights = useMemo(
    () => (evaluation && farm ? computeEvaluation(database, evaluation, farm) : null),
    [database, evaluation, farm]
  );

  const canEdit = session?.role === 'evaluator';
  const unavailableState = getOperationalEmptyState(
    provenance?.evaluations,
    {
      title: 'No pudimos abrir esta evaluación',
      description: 'Revisa el listado de evaluaciones y confirma que el identificador sea correcto.'
    },
    provenanceLoading,
    provenanceError
  );

  if (!evaluation || !farm || !insights) {
    return (
      <div className="page stack">
        <PageHeader
          backTo="/evaluaciones"
          backLabel="Volver a evaluaciones"
          eyebrow="Evaluación"
          title={unavailableState.title}
          description={unavailableState.description}
        />
        <EmptyState
          icon={<ClipboardList size={30} />}
          title={unavailableState.title}
          description={unavailableState.description}
          action={
            <>
              {provenanceError ? (
                <Button variant="secondary" onClick={() => void retryProvenance()}>
                  Reintentar
                </Button>
              ) : null}
              <Link className="button button--primary button--md" to="/evaluaciones">
                <span>Ver evaluaciones</span>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  const evidence = [...database.evidence]
    .filter((item) => item.evaluationId === evaluation.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recommendations = [...database.recommendations]
    .filter((item) => item.evaluationId === evaluation.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const indicators = [...insights.indicators].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
  const evaluationId = evaluation.id;
  const indicatorName = (indicatorId: string) =>
    database.indicators.find((item) => item.id === indicatorId)?.nombre ?? 'Indicador';

  function openCreateIndicator() {
    setEditingIndicator(null);
    setSelectedPendingCriterionId('');
    setIndicatorFormOpen(true);
  }

  function openPendingCriterion(criterion: {
    id: string;
    indicatorId?: string;
  }) {
    setEditingIndicator(
      criterion.indicatorId
        ? database.indicators.find((item) => item.id === criterion.indicatorId) ?? null
        : null
    );
    setSelectedPendingCriterionId(criterion.id);
    setIndicatorFormOpen(true);
  }

  function openEditIndicator(indicator: IndicatorRecord) {
    setEditingIndicator(indicator);
    setIndicatorFormOpen(true);
  }

  function confirmDeleteEvaluation() {
    try {
      deleteEvaluation(evaluationId);
      notify('Evaluación eliminada junto con sus registros asociados.', 'info');
      navigate('/evaluaciones', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar la evaluación.', 'warning');
    }
  }

  function submitEvaluation() {
    try {
      finalizeEvaluation(evaluationId);
      notify('Evaluación enviada y finalizada.');
      setConfirmFinalization(false);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'No se pudo enviar la evaluación.',
        'warning'
      );
    }
  }

  function confirmDeleteIndicator() {
    if (!deletingIndicator) return;
    try {
      deleteIndicator(deletingIndicator.id);
      notify('Indicador eliminado junto con sus evidencias.', 'info');
      setDeletingIndicator(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar el indicador.', 'warning');
    }
  }

  return (
    <div className="page stack">
      <PageHeader
        backTo="/evaluaciones"
        backLabel="Volver a evaluaciones"
        eyebrow={`Evaluación ${evaluation.id}`}
        title={farm.nombre}
        description={`${farmMunicipalityName(farm)}, ${farmDepartmentName(farm)} · ${formatDate(evaluation.fecha)} · ${evaluation.hora}`}
        actions={
          canEdit ? (
            <>
              {evaluation.estado !== 'Finalizada' ? (
                <Button
                  icon={<Send size={16} />}
                  disabled={insights.pendingCriteria.length > 0}
                  onClick={() => setConfirmFinalization(true)}
                  title={
                    insights.pendingCriteria.length > 0
                      ? 'Completa todos los criterios antes de enviar.'
                      : undefined
                  }
                >
                  Enviar evaluación
                </Button>
              ) : null}
              <Button
                variant="secondary"
                icon={<Pencil size={16} />}
                onClick={() => setEvaluationFormOpen(true)}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                icon={<Trash2 size={16} />}
                onClick={() => setDeletingEvaluation(true)}
              >
                Eliminar
              </Button>
            </>
          ) : (
            <Badge tone="info">Perfil de solo consulta</Badge>
          )
        }
      />

      <section className="detail-hero">
        <div className="detail-hero__main">
          <div className="detail-hero__badges">
            <Badge tone={statusTone(evaluation.estado)}>{evaluation.estado}</Badge>
            <Badge tone={scoreBadgeTone(insights.score)}>
              {insights.classification ?? 'Resultado incompleto'}
            </Badge>
          </div>
          <h2>Resumen de la visita</h2>
          <p className="detail-hero__description">
            {evaluation.observaciones ||
              'La evaluación no tiene observaciones generales registradas.'}
          </p>
          <div className="detail-meta">
            <span>
              <MapPin size={15} aria-hidden="true" />
              {farm.vereda}, {farmMunicipalityName(farm)}
            </span>
            <span>
              <UserRound size={15} aria-hidden="true" />
              {evaluation.evaluador}
            </span>
            <span>
              <ClipboardList size={15} aria-hidden="true" />
              Investigador: {evaluation.investigadorNombres} {evaluation.investigadorApellidos}
            </span>
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              Actualizada {formatDateTime(evaluation.updatedAt)}
            </span>
          </div>
          <p className="detail-hero__farm">
            {productionSystemLabel(farm.tipo)} · {formatNumber(farm.animales)} animales · Responsable {farm.responsable}
          </p>
        </div>
        <div className="detail-hero__score">
          <div className={`score-tile score-tile--${scoreBadgeTone(insights.score)}`}>
            <strong>{insights.score === null ? '—' : formatNumber(insights.score)}</strong>
            <small>{insights.score === null ? 'incompleto' : 'de 100'}</small>
          </div>
          <span>Índice de bienestar porcino</span>
          <Badge tone={scoreBadgeTone(insights.score)}>
            {insights.classification ?? 'Clasificación pendiente'}
          </Badge>
          <small>
            {insights.evaluatedCriteria} de {insights.totalCriteria} criterios evaluados
          </small>
        </div>
      </section>

      {canEdit &&
      evaluation.estado !== 'Finalizada' &&
      insights.pendingCriteria.length > 0 ? (
        <Alert tone="warning" title="Aún no se puede enviar">
          Completa los {insights.pendingCriteria.length} criterios pendientes para habilitar el
          envío y finalizar la evaluación.
        </Alert>
      ) : null}

      <div className="stats-grid stats-grid--three">
        <StatCard
          label="Criterios evaluados"
          value={`${insights.evaluatedCriteria} / ${insights.totalCriteria}`}
          hint="Criterios con respuesta válida"
          icon={<ListChecks size={19} />}
          tone="brand"
        />
        <StatCard
          label="Pendientes"
          value={insights.pendingCriteria.length}
          hint={insights.pendingCriteria.length ? 'Requieren completarse' : 'Evaluación completa'}
          icon={<ClipboardList size={19} />}
          tone={insights.pendingCriteria.length ? 'warning' : 'default'}
        />
        <StatCard
          label="Evidencias"
          value={evidence.length}
          hint="Soportes asociados a la visita"
          icon={<Images size={19} />}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Ponderación</p>
              <h2>Las cuatro libertades</h2>
            </div>
            <Link to="/metodologia" className="text-link">
              Metodología
            </Link>
          </header>
          <div className="liberty-list">
            {insights.liberties.map((liberty) => (
              <div className="liberty-item" key={liberty.id}>
                <ProgressBar
                  label={`${liberty.nombre} (${liberty.peso}%)`}
                  value={liberty.puntuacion}
                />
                <p className="liberty-item__meta">
                  {liberty.indicadoresPuntuados} criterios puntuados
                  {liberty.noAplicables > 0 ? ` · ${liberty.noAplicables} no aplican` : ''}
                  {liberty.faltantes.length > 0
                    ? ` · ${liberty.faltantes.length} pendientes`
                    : ' · sin pendientes'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Seguimiento</p>
              <h2>Criterios evaluados y pendientes</h2>
            </div>
            <Badge tone={insights.pendingCriteria.length ? 'warning' : 'success'}>
              {insights.pendingCriteria.length}
            </Badge>
          </header>
          <p className="card__subtitle">
            {insights.pendingCriteria.length
              ? canEdit
                ? 'Verde: registrado. Ámbar: pendiente; selecciónalo para agregar su indicador.'
                : 'Verde: registrado. Ámbar: pendiente de respuesta.'
              : 'Todos los criterios cuentan con respuesta y puntuación.'}
          </p>
          <ul className="pending-list pending-list--status">
            {insights.criteriaStatus.map((criterion) => (
              <li
                key={criterion.id}
                className={
                  criterion.completed
                    ? 'pending-list__item pending-list__item--complete'
                    : 'pending-list__item pending-list__item--pending'
                }
              >
                {canEdit && !criterion.completed ? (
                  <button
                    type="button"
                    className="pending-list__action"
                    onClick={() => openPendingCriterion(criterion)}
                    aria-label={`${criterion.indicatorId ? 'Revisar' : 'Agregar'} indicador: ${criterion.nombre}`}
                  >
                    <span className="pending-list__indicator" aria-hidden="true" />
                    <span>{criterion.nombre}</span>
                    <span className="pending-list__hint">
                      {criterion.indicatorId ? 'Revisar indicador' : 'Agregar indicador'}
                    </span>
                  </button>
                ) : (
                  <span className="pending-list__label">
                    <span className="pending-list__indicator" aria-hidden="true" />
                    <span>{criterion.nombre}</span>
                    <span className="pending-list__hint">
                      {criterion.completed ? 'Registrado' : 'Pendiente'}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <header className="card__header">
          <div>
            <p className="eyebrow">Registro</p>
            <h2>Indicadores ({indicators.length})</h2>
          </div>
          {canEdit ? (
            <Button size="sm" icon={<Plus size={15} />} onClick={openCreateIndicator}>
              Agregar indicador
            </Button>
          ) : null}
        </header>
        {indicators.length ? (
          <IndicatorList
            items={indicators}
            canEdit={canEdit}
            onEdit={openEditIndicator}
            onDelete={setDeletingIndicator}
          />
        ) : (
          <EmptyState
            icon={<ListChecks size={28} />}
            title="Sin indicadores registrados"
            description="Agrega el primer criterio evaluado para comenzar a calcular el resultado del predio."
            action={
              canEdit ? (
                <Button size="sm" icon={<Plus size={15} />} onClick={openCreateIndicator}>
                  Agregar indicador
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      <div className="dashboard-grid dashboard-grid--two">
        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Soportes</p>
              <h2>Evidencias ({evidence.length})</h2>
            </div>
            {canEdit ? (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={15} />}
                onClick={() => setEvidenceFormOpen(true)}
              >
                Cargar
              </Button>
            ) : null}
          </header>
          {evidence.length ? (
            <div className="file-list">
              {evidence.map((item) => (
                <Link
                  to={`/evidencias?evaluacion=${evaluation.id}`}
                  className="file-row"
                  key={item.id}
                >
                  <span className="file-row__thumb">
                    {item.dataUrl && item.tipo.startsWith('image/') ? (
                      <img src={item.dataUrl} alt="" />
                    ) : (
                      <FileText size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="file-row__text">
                    <strong>{item.nombre}</strong>
                    <small>
                      {indicatorName(item.indicadorId)} · {formatBytes(item.tamano)}
                    </small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted">Esta evaluación todavía no tiene evidencias cargadas.</p>
          )}
        </section>

        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Plan de mejora</p>
              <h2>Recomendaciones ({recommendations.length})</h2>
            </div>
          </header>
          {recommendations.length ? (
            <div className="recommendation-list">
              {recommendations.map((item) => (
                <article className="recommendation-item" key={item.id}>
                  <div className="recommendation-item__top">
                    <Sparkles size={16} aria-hidden="true" />
                    <h3>{item.title}</h3>
                  </div>
                  {item.action ? (
                    <p>
                      <strong>Acción:</strong> {item.action}
                    </p>
                  ) : null}
                  <p>{item.text}</p>
                  <footer>
                    <span>{item.createdBy}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted">
              Aún no se ha publicado un plan. El evaluador puede generarlo desde el módulo de
              recomendaciones.
            </p>
          )}
          <Link
            to={`/recomendaciones?evaluacion=${evaluation.id}`}
            className="text-link text-link--arrow"
          >
            Consultar plan de mejora <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <Disclaimer>
        Este resultado se calcula a partir de los criterios, puntajes y datos registrados.
        No constituye un dictamen ni una certificación oficial del ICA.
      </Disclaimer>

      <EvaluationForm
        open={evaluationFormOpen}
        evaluation={evaluation}
        onClose={() => setEvaluationFormOpen(false)}
      />
      <IndicatorForm
        open={indicatorFormOpen}
        indicator={editingIndicator}
        defaultEvalId={evaluation.id}
        defaultCriterionId={selectedPendingCriterionId}
        onClose={() => setIndicatorFormOpen(false)}
      />
      <EvidenceUploadForm
        open={evidenceFormOpen}
        defaultEvaluationId={evaluation.id}
        onClose={() => setEvidenceFormOpen(false)}
      />
      <ConfirmDialog
        open={deletingEvaluation}
        title="Eliminar evaluación"
        message="Se eliminarán también los indicadores, evidencias y recomendaciones asociados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar evaluación"
        onConfirm={confirmDeleteEvaluation}
        onClose={() => setDeletingEvaluation(false)}
      />
      <ConfirmDialog
        open={confirmFinalization}
        title="Enviar y finalizar evaluación"
        message="Al enviarla, la evaluación quedará marcada como finalizada. ¿Deseas continuar?"
        confirmLabel="Enviar evaluación"
        onConfirm={submitEvaluation}
        onClose={() => setConfirmFinalization(false)}
      />
      <ConfirmDialog
        open={Boolean(deletingIndicator)}
        title="Eliminar indicador"
        message="Se eliminará el indicador y sus evidencias asociadas. El resultado de la evaluación se recalculará."
        confirmLabel="Eliminar indicador"
        onConfirm={confirmDeleteIndicator}
        onClose={() => setDeletingIndicator(null)}
      />
    </div>
  );
}
