import {
  ArrowUpRight,
  ClipboardList,
  Sparkles,
  Wand2
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge, scoreBadgeTone } from '../components/Badge';
import { Button } from '../components/Button';
import { FormField, TextArea } from '../components/FormField';
import { Modal } from '../components/Modal';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import { farmDepartmentName, farmMunicipalityName } from '../data/colombia';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { allEvaluationInsights, computeEvaluation } from '../features/evaluations/results';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from '../features/indicators/rubrics';
import { generateRecommendations } from '../features/recommendations/generator';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';
import { ApiRecommendationsPage } from './ApiRecommendationsPage';

export function RecommendationsPage() {
  const { session } = useAuth();
  if (session?.backend) {
    return <ApiRecommendationsPage canGenerate={session.role === 'evaluator'} />;
  }
  return <LocalRecommendationsPage />;
}

function LocalRecommendationsPage() {
  const {
    database,
    generateRecommendationPlan,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const [params] = useSearchParams();
  const canEdit = session?.role === 'evaluator';
  const insights = useMemo(() => allEvaluationInsights(database), [database]);
  const evaluationsEmptyState = getOperationalEmptyState(
    provenance?.evaluations,
    {
      title: 'Aún no hay evaluaciones',
      description: canEdit
        ? 'Crea una evaluación y registra indicadores para generar recomendaciones de mejora.'
        : 'Aún no hay evaluaciones asociadas a esta cuenta.'
    },
    provenanceLoading,
    provenanceError
  );
  const [selectedId, setSelectedId] = useState(
    params.get('evaluacion') ?? insights[0]?.evaluation.id ?? ''
  );
  const [generating, setGenerating] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { action: string; recommendation: string }>
  >({});
  const selected =
    insights.find((item) => item.evaluation.id === selectedId) ?? insights[0] ?? null;

  const generated = useMemo(
    () => (canEdit && selected ? generateRecommendations(selected) : []),
    [canEdit, selected]
  );

  const saved = useMemo(
    () =>
      selected
        ? [...database.recommendations]
            .filter((item) => item.evaluationId === selected.evaluation.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [database.recommendations, selected]
  );
  const recommendationsEmptyState = getOperationalEmptyState(
    provenance?.recommendations,
    {
      title: 'Sin recomendaciones guardadas',
      description: canEdit
        ? 'Genera el plan desde el análisis de esta evaluación para compartirlo con el propietario.'
        : 'El evaluador aún no ha publicado un plan de mejora para esta evaluación.'
    },
    provenanceLoading,
    provenanceError
  );

  const plan = database.recommendationPlans.find(
    (item) => item.evaluationId === selected?.evaluation.id
  );
  const generatedPercentScores = generated.filter(
    (item) => item.criterionId !== LIBERTY_ADJUSTMENT_CRITERION_ID
  );
  const averageGenerated = generatedPercentScores.length
    ? generatedPercentScores.reduce((total, item) => total + item.score, 0) /
      generatedPercentScores.length
    : null;

  function openPlanEditor() {
    if (plan || !canEdit) return;
    setPlanDrafts(
      Object.fromEntries(
        generated.map((item) => [
          item.criterionId,
          { action: item.action, recommendation: item.text }
        ])
      )
    );
    setPlanEditorOpen(true);
  }

  function generatePlanOnce(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !session || plan || generating) return;
    if (
      generated.some((item) => {
        const draft = planDrafts[item.criterionId];
        return !draft?.action.trim() || !draft.recommendation.trim();
      })
    ) {
      notify('Completa una acción y una recomendación para cada hallazgo.', 'warning');
      return;
    }
    setGenerating(true);
    try {
      generateRecommendationPlan(
        selected.evaluation.id,
        generated.map((item) => ({
          title: item.title,
          action: planDrafts[item.criterionId]?.action.trim() ?? '',
          text: planDrafts[item.criterionId]?.recommendation.trim() ?? item.text,
          source: item.source
        })),
        session.name
      );
      notify(
        generated.length
          ? 'El plan se generó y quedó publicado para el propietario.'
          : 'El análisis se completó sin recomendaciones para esta evaluación.',
        generated.length ? 'success' : 'info'
      );
      setPlanEditorOpen(false);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'No se pudo generar el plan.',
        'warning'
      );
    } finally {
      setGenerating(false);
    }
  }

  const selectedFresh = selected
    ? computeEvaluation(database, selected.evaluation, selected.farm)
    : null;

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Plan de mejora"
        title="Recomendaciones"
        description={
          canEdit
            ? 'Analiza una evaluación y publica una sola vez el plan de mejora para que el propietario pueda consultarlo.'
            : 'Consulta los planes de mejora publicados por el evaluador para tus predios.'
        }
        actions={!canEdit ? <Badge tone="info">Solo lectura</Badge> : undefined}
      />

      {insights.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={30} />}
          title={evaluationsEmptyState.title}
          description={evaluationsEmptyState.description}
          action={
            provenanceError ? (
              <Button variant="secondary" onClick={() => void retryProvenance()}>
                Reintentar
              </Button>
            ) : canEdit ? (
              <Link className="button button--primary button--md" to="/evaluaciones">
                <span>Ir a evaluaciones</span>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <section className="context-banner">
            <div className="context-banner__main">
              <p className="eyebrow">Evaluación seleccionada</p>
              <h2>{selected?.farm.nombre}</h2>
              <p>
                {selected ? farmMunicipalityName(selected.farm) : ''}, {selected ? farmDepartmentName(selected.farm) : ''} ·{' '}
                {selected ? formatDate(selected.evaluation.fecha) : ''} ·{' '}
                {selected?.evaluation.evaluador}
              </p>
            </div>
            <div className="context-banner__controls">
              <label className="context-banner__label" htmlFor="rec-evaluation-filter">
                Cambiar evaluación
              </label>
              <select
                id="rec-evaluation-filter"
                className="input input--select"
                value={selected?.evaluation.id ?? ''}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {insights.map((item) => (
                  <option key={item.evaluation.id} value={item.evaluation.id}>
                    {item.farm.nombre} · {formatDate(item.evaluation.fecha)} · {item.evaluation.id}
                  </option>
                ))}
              </select>
              {selected ? (
                <Link
                  to={`/evaluaciones/${selected.evaluation.id}`}
                  className="text-link text-link--arrow"
                >
                  Ver evaluación <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </section>

          <div className="stats-grid stats-grid--three">
            <StatCard
              label={canEdit ? 'Sugerencias detectadas' : 'Recomendaciones publicadas'}
              value={canEdit ? generated.length : saved.length}
              hint={canEdit ? 'Puntajes menores a 75 y ajustes negativos' : 'Plan publicado por el evaluador'}
              icon={<Wand2 size={19} />}
              tone="brand"
            />
            <StatCard
              label="Recomendaciones guardadas"
              value={saved.length}
              hint="Plan de mejora de la evaluación"
              icon={<Sparkles size={19} />}
            />
            <StatCard
              label="Resultado de la evaluación"
              value={
                selectedFresh?.score === null || selectedFresh?.score === undefined
                  ? '—'
                  : formatNumber(selectedFresh.score)
              }
              hint={selectedFresh?.classification ?? 'Cálculo incompleto'}
              icon={<ClipboardList size={19} />}
              tone={
                selectedFresh?.score !== null &&
                selectedFresh?.score !== undefined &&
                selectedFresh.score < 60
                  ? 'warning'
                  : 'default'
              }
            />
          </div>

          <section className="card">
            <header className="card__header">
              <div>
                <p className="eyebrow">Generación de plan</p>
                  <h2>{plan ? 'Plan ya generado' : 'Análisis de recomendaciones'}</h2>
              </div>
              <Badge tone={scoreBadgeTone(averageGenerated)}>
                {plan
                  ? 'Plan publicado'
                  : averageGenerated === null
                  ? generated.length
                    ? 'Ajuste metodológico'
                    : 'Sin hallazgos'
                  : `Promedio ${formatNumber(averageGenerated)}`}
              </Badge>
            </header>

            {plan ? (
              <Alert tone="success" title="El plan ya fue generado">
                Generado por {plan.generatedBy} el {formatDateTime(plan.generatedAt)}. No se puede
                volver a generar para esta evaluación.
              </Alert>
            ) : (
              <>
                <p className="card__subtitle">
                  {canEdit
                    ? 'Revisa las sugerencias calculadas a partir de los puntajes y confirma las acciones antes de publicar el plan.'
                    : 'El evaluador aún no ha publicado un plan de mejora para esta evaluación.'}
                </p>
                {generated.length ? (
                  <div className="suggestion-list">
                    {generated.map((item) => (
                      <article className="suggestion-card" key={item.criterionId}>
                        <div className="suggestion-card__score">
                          <strong>{item.score}</strong>
                          <small>
                            {item.criterionId === LIBERTY_ADJUSTMENT_CRITERION_ID
                              ? 'pts de ajuste'
                              : '/ 100'}
                          </small>
                        </div>
                        <div className="suggestion-card__body">
                          <div className="suggestion-card__top">
                              <Badge tone={scoreBadgeTone(item.score)}>
                                {item.criterionId === LIBERTY_ADJUSTMENT_CRITERION_ID
                                  ? 'Ajuste metodológico: −2 puntos'
                                  : item.score === 0
                                    ? 'Puntaje crítico: 0'
                                    : 'Por debajo de 75 puntos'}
                              </Badge>
                              <span>Sugerencia basada en el puntaje registrado</span>
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : canEdit ? (
                  <Alert tone="success" title="Sin criterios críticos">
                    Todos los indicadores puntuados de esta evaluación alcanzan 75 puntos o más.
                    Puedes publicar el análisis sin recomendaciones.
                  </Alert>
                ) : null}
                {canEdit ? (
                  <Button
                    icon={<Wand2 size={17} />}
                    disabled={Boolean(plan) || generating}
                    onClick={openPlanEditor}
                  >
                    Revisar acciones y recomendaciones
                  </Button>
                ) : null}
              </>
            )}
          </section>

          <section className="card">
            <header className="card__header">
              <div>
                <p className="eyebrow">Plan de acción</p>
                <h2>Recomendaciones guardadas</h2>
              </div>
            </header>

            {saved.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={28} />}
                title={recommendationsEmptyState.title}
                description={recommendationsEmptyState.description}
                action={
                  provenanceError ? (
                    <Button variant="secondary" onClick={() => void retryProvenance()}>
                      Reintentar
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="saved-list">
                {saved.map((item) => (
                  <article className="saved-card" key={item.id}>
                    <div className="saved-card__header">
                      <div>
                        <Badge tone={item.source === 'evaluador' ? 'success' : 'neutral'}>
                          {item.source === 'evaluador' ? 'Evaluador' : 'Análisis de evaluación'}
                        </Badge>
                        <h3>{item.title}</h3>
                      </div>
                    </div>
                    <p>
                      <strong>Acción:</strong>{' '}
                      {item.action || 'No se registró una acción específica para este hallazgo.'}
                    </p>
                    <p>
                      <strong>Recomendación sugerida:</strong> {item.text}
                    </p>
                    <footer>
                      <span>Creada por {item.createdBy}</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={planEditorOpen}
        title="Preparar plan de mejora"
        description="Revisa cada hallazgo, define la acción que realizará el predio y ajusta la recomendación antes de publicarla una sola vez."
        onClose={() => {
          if (!generating) setPlanEditorOpen(false);
        }}
        size="lg"
        footer={
          <Button
            type="submit"
            form="recommendation-plan-form"
            icon={<Wand2 size={16} />}
            loading={generating}
          >
            Publicar plan una sola vez
          </Button>
        }
      >
        <form id="recommendation-plan-form" className="form" onSubmit={generatePlanOnce}>
          <Alert tone="info" title="Criterios para revisar">
            Las sugerencias se basan en criterios con puntaje menor a 75 y en ajustes metodológicos
            negativos. Un puntaje de 0 se identifica como hallazgo crítico; valida el contexto y
            ajusta las acciones antes de publicar el plan.
          </Alert>
          {generated.length ? (
            generated.map((item) => (
              <section className="recommendation-draft" key={item.criterionId}>
                <header>
                  <div>
                    <Badge tone={scoreBadgeTone(item.score)}>
                      {item.criterionId === LIBERTY_ADJUSTMENT_CRITERION_ID
                        ? 'Ajuste · −2 puntos'
                        : item.score === 0
                          ? 'Crítico · 0 / 100'
                          : `${item.score} / 100`}
                    </Badge>
                    <h3>{item.title}</h3>
                  </div>
                </header>
                <FormField
                  id={`action-${item.criterionId}`}
                  label="Acción a realizar"
                  hint="Define una actividad concreta que se pueda asignar y verificar."
                  required
                >
                  <TextArea
                    id={`action-${item.criterionId}`}
                    rows={2}
                    required
                    value={planDrafts[item.criterionId]?.action ?? ''}
                    onChange={(event) =>
                      setPlanDrafts((current) => ({
                        ...current,
                        [item.criterionId]: {
                          ...current[item.criterionId],
                          action: event.target.value,
                          recommendation:
                            current[item.criterionId]?.recommendation ?? item.text
                        }
                      }))
                    }
                  />
                </FormField>
                <FormField
                  id={`recommendation-${item.criterionId}`}
                  label="Recomendación sugerida"
                  hint="Revisa el texto propuesto y ajústalo a las condiciones del predio."
                  required
                >
                  <TextArea
                    id={`recommendation-${item.criterionId}`}
                    rows={3}
                    required
                    value={planDrafts[item.criterionId]?.recommendation ?? ''}
                    onChange={(event) =>
                      setPlanDrafts((current) => ({
                        ...current,
                        [item.criterionId]: {
                          action: current[item.criterionId]?.action ?? item.action,
                          recommendation: event.target.value
                        }
                      }))
                    }
                  />
                </FormField>
              </section>
            ))
          ) : (
            <Alert tone="success" title="No se detectaron puntajes bajos">
              No hay indicadores aplicables por debajo de 75 puntos. Puedes publicar el resultado
              del análisis sin acciones de mejora.
            </Alert>
          )}
        </form>
      </Modal>
    </div>
  );
}
