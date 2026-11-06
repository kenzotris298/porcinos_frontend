import { ClipboardList, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import { apiRequest } from '../api/client';
import { useAuth } from '../features/auth/AuthProvider';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';

interface ApiEvaluation {
  id: string;
  farmId: string;
  fecha: string;
  estado: string;
  investigadorNombres: string;
  investigadorApellidos: string;
}

interface ApiFarm {
  id: string;
  nombre: string;
}

interface ApiIndicator {
  id: string;
  criterionId: string;
  nombre: string;
  puntaje: number | null;
  estado: string;
  aplicabilidad: string;
  observaciones: string;
}

interface ApiPlanAction {
  id: string;
  criterionId: string;
  indicatorName: string;
  title: string | null;
  recommendation: string | null;
  action: string;
  responsible: string | null;
  dueDate: string | null;
  status: string;
}

interface ApiPlan {
  id: string;
  evaluationId: string;
  generatedBy: string;
  provider: string | null;
  model: string | null;
  source: string;
  title: string | null;
  recommendation: string | null;
  createdAt: string;
  actions: ApiPlanAction[];
}

interface EvaluationResult {
  methodologyVersion: string;
  formula: string;
  calculability: string;
  score: number | null;
  classification: string | null;
  coverage: {
    registered: number;
    total: number;
    percentage: number;
    pendingReview: number;
    missing: string[];
  };
  reasons: string[];
}

export function ApiRecommendationsPage({ canGenerate }: { canGenerate: boolean }) {
  const { session } = useAuth();
  const mustChangePassword = session?.mustChangePassword === true;
  const [params] = useSearchParams();
  const { notify } = useToast();
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [selectedId, setSelectedId] = useState(params.get('evaluacion') ?? '');
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [removingPlan, setRemovingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (mustChangePassword) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [evaluationResponse, farmResponse, planResponse] = await Promise.all([
        apiRequest<{ items: ApiEvaluation[] }>('/evaluations'),
        apiRequest<{ items: ApiFarm[] }>('/farms'),
        apiRequest<{ items: ApiPlan[] }>('/recommendation-plans')
      ]);
      setEvaluations(evaluationResponse.items);
      setFarms(farmResponse.items);
      setPlans(planResponse.items);
      setSelectedId((current) =>
        evaluationResponse.items.some((evaluation) => evaluation.id === current)
          ? current
          : evaluationResponse.items[0]?.id ?? ''
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evaluaciones.');
    } finally {
      setLoading(false);
    }
  }, [mustChangePassword]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (mustChangePassword) {
      setLoadingDetails(false);
      return;
    }
    if (!selectedId) {
      setIndicators([]);
      setResult(null);
      return;
    }
    let active = true;
    setLoadingDetails(true);
    setError(null);
    Promise.all([
      apiRequest<{ items: ApiIndicator[] }>(
        `/indicators?evaluationId=${encodeURIComponent(selectedId)}`
      ),
      apiRequest<{ result: EvaluationResult }>(
        `/evaluations/${encodeURIComponent(selectedId)}/result`
      )
    ])
      .then(([indicatorResponse, resultResponse]) => {
        if (!active) return;
        setIndicators(indicatorResponse.items);
        setResult(resultResponse.result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar el detalle.');
        }
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, mustChangePassword]);

  const selected = evaluations.find((evaluation) => evaluation.id === selectedId);
  const farm = farms.find((item) => item.id === selected?.farmId);
  const plan = plans.find((item) => item.evaluationId === selectedId);
  const followUpIndicators = useMemo(
    () =>
      indicators.filter(
        (indicator) =>
          indicator.aplicabilidad === 'aplica' &&
          indicator.estado === 'Requiere seguimiento'
      ),
    [indicators]
  );

  async function generatePlan() {
    if (!canGenerate || !selected || generating || plan || selected.estado !== 'Finalizada') return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiRequest<{ item: ApiPlan; idempotent: boolean }>(
        '/recommendation-plans/generate',
        { method: 'POST', body: { evaluationId: selected.id } }
      );
      setPlans((current) => [
        response.item,
        ...current.filter((item) => item.evaluationId !== response.item.evaluationId)
      ]);
      await loadData();
      notify(
        response.idempotent
          ? 'El plan ya estaba publicado y se recuperó del servidor.'
          : response.item.source === 'ia'
            ? `El plan se generó con ${response.item.provider} (${response.item.model}) y se publicó correctamente.`
            : 'No hay modelos IA configurados; se publicó un plan de respaldo con plantillas EBA.',
        response.item.source === 'ia' || response.idempotent ? 'success' : 'warning'
      );
    } catch {
      const message = 'No se pudieron generar las recomendaciones en este momento. Inténtalo nuevamente más tarde.';
      setError(message);
      notify(message, 'warning');
    } finally {
      setGenerating(false);
    }
  }

  async function improvePlanWithAi() {
    if (
      !canGenerate ||
      !selected ||
      !plan ||
      plan.source !== 'plantillas' ||
      generating ||
      plan.actions.some((action) => action.status !== 'Pendiente')
    ) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiRequest<{ item: ApiPlan }>(
        `/recommendation-plans/${encodeURIComponent(plan.id)}/regenerate-with-ai`,
        { method: 'POST', body: {} }
      );
      setPlans((current) => current.map((item) =>
        item.id === response.item.id ? response.item : item
      ));
      await loadData();
      notify(
        `El plan se mejoró con ${response.item.provider} (${response.item.model}).`,
        'success'
      );
    } catch {
      const message = 'No se pudieron generar las recomendaciones en este momento. Inténtalo nuevamente más tarde.';
      setError(message);
      notify(message, 'warning');
    } finally {
      setGenerating(false);
    }
  }

  async function removePlan() {
    if (!plan || removingPlan || generating) return;
    if (!window.confirm('¿Eliminar este plan y todas sus acciones asociadas? Esta acción no se puede deshacer.')) return;
    setRemovingPlan(true);
    setError(null);
    try {
      await apiRequest<void>(`/recommendation-plans/${encodeURIComponent(plan.id)}`, {
        method: 'DELETE'
      });
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      notify('Plan de recomendaciones eliminado. Puedes generar uno nuevo.');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No se pudo eliminar el plan.';
      setError(message);
      notify(message, 'warning');
    } finally {
      setRemovingPlan(false);
    }
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Plan de mejora"
        title="Recomendaciones"
        description="Consulta planes guardados en el backend. El evaluador puede solicitar la generación con IA para una evaluación finalizada; los propietarios solo consultan."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            onClick={() => void loadData()}
            disabled={loading}
          >
            Actualizar
          </Button>
        }
      />

      {mustChangePassword ? (
        <Alert tone="warning">Cambia tu contraseña temporal para consultar los datos del backend.</Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <div className="state-panel" role="status">Cargando evaluaciones del backend…</div> : null}
      <section className="context-banner">
        <div className="context-banner__main">
          <p className="eyebrow">Evaluación seleccionada</p>
          <h2>{farm?.nombre ?? (selected ? 'Predio' : 'Sin evaluación seleccionada')}</h2>
          <p>
            {selected
              ? `${formatDate(selected.fecha)} · ${selected.investigadorNombres} ${selected.investigadorApellidos} · ${selected.estado}`
              : 'Selecciona una evaluación para consultar su plan de mejora.'}
          </p>
        </div>
        <div className="context-banner__controls">
          <label className="context-banner__label" htmlFor="rec-api-evaluation">
            Cambiar evaluación
          </label>
          <select
            id="rec-api-evaluation"
            className="input input--select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={loading || evaluations.length === 0}
          >
            <option value="">Selecciona una evaluación</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>
                {(farms.find((item) => item.id === evaluation.farmId)?.nombre ?? 'Predio')} ·{' '}
                {formatDate(evaluation.fecha)} · {evaluation.estado}
              </option>
            ))}
          </select>
        </div>
      </section>

          <div className="stats-grid stats-grid--three">
            <StatCard
              label="Indicadores registrados"
              value={loading ? '—' : result?.coverage.registered ?? indicators.length}
              hint={result ? `Cobertura ${formatNumber(result.coverage.percentage)} %` : 'Sin cobertura disponible'}
              icon={<ClipboardList size={19} />}
            />
            <StatCard
              label="Requieren seguimiento"
              value={followUpIndicators.length}
              hint="Indicadores aplicables marcados para seguimiento"
              icon={<WandSparkles size={19} />}
              tone="brand"
            />
            <StatCard
              label="Resultado metodológico"
              value={loadingDetails ? '—' : result?.score === null || result?.score === undefined ? 'No calculable' : formatNumber(result.score)}
              hint={result?.classification ?? result?.methodologyVersion ?? 'Sin resultado disponible'}
              icon={<Sparkles size={19} />}
              tone="warning"
            />
          </div>

          {result?.calculability === 'not_calculable' ? (
            <Alert tone="info" title={`Resultado no calculable · ${result.methodologyVersion}`}>
              {result.reasons.join(' ')}
            </Alert>
          ) : null}

          <section className="card">
            <header className="card__header">
              <div>
                <p className="eyebrow">Publicación en backend</p>
                <h2>{plan ? 'Plan publicado' : 'Plan de mejora con IA'}</h2>
              </div>
              <Badge tone={plan ? 'success' : 'neutral'}>
                {plan ? 'Guardado en MariaDB' : selected?.estado ?? 'Sin evaluación'}
              </Badge>
              {canGenerate && plan ? (
                <button
                  type="button"
                  className="icon-button icon-button--sm icon-button--danger"
                  aria-label="Eliminar plan de recomendaciones"
                  title="Eliminar plan"
                  onClick={() => void removePlan()}
                  disabled={removingPlan || generating}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
            </header>

            {plan ? (
              <>
                <Alert tone="success" title={plan.title ?? 'Plan de mejora publicado'}>
                  Publicado por {plan.generatedBy} el {formatDateTime(plan.createdAt)}.
                  {plan.provider ? ` Proveedor: ${plan.provider}.` : ''}
                  {plan.model ? ` Modelo: ${plan.model}.` : ''}
                  {plan.source !== 'ia' ? ' Fuente: plantillas EBA (respaldo sin IA).' : ' Fuente: IA.'}
                </Alert>
                {plan.recommendation ? <p className="card__subtitle">{plan.recommendation}</p> : null}
                {plan.actions.length ? (
                  <div className="saved-list">
                    {plan.actions.map((action) => (
                      <article className="saved-card" key={action.id}>
                        <div className="saved-card__header">
                          <div>
                            <Badge tone="info">{action.status}</Badge>
                            <h3>{action.title ?? action.indicatorName}</h3>
                          </div>
                        </div>
                        <p><strong>Acción:</strong> {action.action}</p>
                        {action.recommendation ? (
                          <p><strong>Recomendación:</strong> {action.recommendation}</p>
                        ) : null}
                        {action.responsible ? <p><strong>Responsable:</strong> {action.responsible}</p> : null}
                        {action.dueDate ? <p><strong>Fecha límite:</strong> {formatDate(action.dueDate)}</p> : null}
                        <footer><span>{action.indicatorName}</span></footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtitle">El backend no registró acciones para este plan.</p>
                )}
                {canGenerate && plan.source === 'plantillas' && selected?.estado === 'Finalizada' ? (
                  <>
                    {plan.actions.some((action) => action.status !== 'Pendiente') ? (
                      <Alert tone="info">
                        El plan ya tiene acciones en curso o completadas y no se reemplazará para conservar su seguimiento.
                      </Alert>
                    ) : (
                      <>
                        <p className="card__subtitle">
                          Puedes mejorar este plan con Gemini si está configurado. Solo se enviarán los indicadores que requieren seguimiento, sin nombres del predio ni del investigador.
                        </p>
                        <Button
                          icon={<WandSparkles size={17} />}
                          onClick={() => void improvePlanWithAi()}
                          loading={generating}
                          disabled={generating || loadingDetails}
                        >
                          Mejorar plan con IA
                        </Button>
                      </>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              canGenerate && selected ? (
                <>
                  <p className="card__subtitle">
                    La generación toma los indicadores guardados en MariaDB. El proveedor de IA no se ejecuta hasta que el evaluador solicite publicar.
                  </p>
                  {selected?.estado !== 'Finalizada' ? (
                    <Alert tone="warning">Envía y finaliza la evaluación antes de generar el plan.</Alert>
                  ) : followUpIndicators.length === 0 && !loadingDetails ? (
                    <Alert tone="warning">
                      No hay indicadores aplicables marcados «Requiere seguimiento» en esta evaluación.
                    </Alert>
                  ) : null}
                  {followUpIndicators.length > 0 ? (
                    <p className="card__subtitle">
                      El plan incluirá únicamente los indicadores marcados «Requiere seguimiento». Si Gemini no está configurado, se usarán las plantillas EBA.
                    </p>
                  ) : null}
                  <Button
                    icon={<WandSparkles size={17} />}
                    onClick={() => void generatePlan()}
                    loading={generating}
                    disabled={
                      generating ||
                      loadingDetails ||
                      selected?.estado !== 'Finalizada' ||
                      followUpIndicators.length === 0
                    }
                  >
                    Generar y publicar recomendaciones
                  </Button>
                </>
              ) : selected ? (
                <Alert tone="info">Solo el evaluador puede generar y publicar recomendaciones.</Alert>
              ) : (
                <EmptyState
                  icon={<ClipboardList size={28} />}
                  title="No hay evaluaciones disponibles"
                  description="Crea una evaluación dentro de tu alcance para consultar o publicar su plan."
                />
              )
            )}
          </section>
    </div>
  );
}
