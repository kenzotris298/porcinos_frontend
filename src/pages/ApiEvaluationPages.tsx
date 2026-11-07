import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Images,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest, apiUrl } from '../api/client';
import { Alert } from '../components/Alert';
import { Badge, scoreBadgeTone, statusTone } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { FormField, TextArea, TextInput } from '../components/FormField';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import { CRITERIA, LIBERTIES } from '../features/indicators/catalog';
import { CRITERION_RUBRICS, LIBERTY_ADJUSTMENT_CRITERION_ID } from '../features/indicators/rubrics';
import { ProgressBar } from '../components/ProgressBar';
import { classificationFor, formatBytes, formatDate, formatDateTime, formatNumber } from '../utils/format';
import { todayAsInputValue } from '../utils/format';
import { useAuth } from '../features/auth/AuthProvider';

interface ApiFarm {
  id: string;
  nombre: string;
  personId?: string;
}

interface ApiEvaluation {
  id: string;
  farmId: string;
  farmName?: string;
  fecha: string;
  hora: string;
  estado: string;
  investigadorNombres: string;
  investigadorApellidos: string;
  observaciones: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiIndicator {
  id: string;
  evaluationId: string;
  criterionId: string;
  nombre: string;
  metodo: string;
  resultado: string;
  estado: 'Registrado' | 'Pendiente de revisión' | 'Requiere seguimiento';
  aplicabilidad: 'aplica' | 'no-aplica';
  puntaje: number;
  observaciones: string;
}

interface ApiEvidenceRecord {
  id: string;
  evaluationId: string;
  indicatorId: string;
  nombre: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface ApiRecommendationPlan {
  id: string;
  evaluationId: string;
  generatedBy: string;
  provider: string | null;
  model: string | null;
  source: string;
  title: string | null;
  recommendation: string | null;
  createdAt: string;
  actions: Array<{
    id: string;
    indicatorName: string;
    title: string | null;
    recommendation: string | null;
    action: string;
    status: string;
  }>;
}

interface ApiEvaluationResult {
  methodologyVersion: string;
  calculability: string;
  score: number | null;
  classification: string | null;
  coverage: { registered: number; total: number; pendingReview: number; missing: string[] };
  liberties?: Array<{
    id: string;
    nombre: string;
    peso: number;
    puntuacion: number | null;
    indicadoresPuntuados: number;
    noAplicables: number;
    faltantes: string[];
  }>;
  reasons: string[];
}

type EvaluationPreview =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; result: ApiEvaluationResult | null | undefined };

function evidenceToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function useBackendRole() {
  const { session } = useAuth();
  return { canEdit: session?.role === 'evaluator' };
}

export function ApiDashboardPage() {
  const { canEdit } = useBackendRole();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [indicatorCount, setIndicatorCount] = useState(0);
  const [evidence, setEvidence] = useState<Array<{
    id: string;
    evaluationId: string;
    indicatorId: string;
    nombre: string;
    mimeType: string;
    createdAt: string;
  }>>([]);
  const [latestResult, setLatestResult] = useState<ApiEvaluationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const loadDashboard = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [evaluationResponse, farmResponse, indicatorResponse, evidenceResponse] =
        await Promise.all([
          apiRequest<{ items: ApiEvaluation[] }>('/evaluations'),
          apiRequest<{ items: ApiFarm[] }>('/farms'),
          apiRequest<{ items: ApiIndicator[] }>('/indicators'),
          apiRequest<{ items: Array<{
            id: string;
            evaluationId: string;
            indicatorId: string;
            nombre: string;
            mimeType: string;
            createdAt: string;
          }> }>('/evidence')
        ]);
      if (currentRequestId !== requestId.current) return;
      setEvaluations(evaluationResponse.items);
      setFarms(farmResponse.items);
      setIndicatorCount(indicatorResponse.items.length);
      setEvidence(evidenceResponse.items);
      const latest = [...evaluationResponse.items].sort(
        (a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora)
      )[0];
      if (latest) {
        const resultResponse = await apiRequest<{ result: ApiEvaluationResult }>(
          `/evaluations/${encodeURIComponent(latest.id)}/result`
        );
        if (currentRequestId === requestId.current) setLatestResult(resultResponse.result);
      } else {
        setLatestResult(null);
      }
    } catch (reason) {
      if (currentRequestId === requestId.current) {
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el panel.');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestId.current += 1;
    };
  }, [loadDashboard]);

  const recent = [...evaluations]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))
    .slice(0, 4);
  const completed = evaluations.filter((item) => item.estado === 'Finalizada').length;
  const pending = Math.max(0, (latestResult?.coverage.total ?? 43) - (latestResult?.coverage.registered ?? 0));
  const latest = recent[0];
  const firstName = session?.name.split(' ')[0] ?? '';
  const priorities = [...(latestResult?.liberties ?? [])]
    .filter((item) => item.puntuacion !== null)
    .sort((a, b) => (a.puntuacion ?? 0) - (b.puntuacion ?? 0))
    .slice(0, 4);
  const recentEvidence = [...evidence]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div className="page stack">
      <section className="hero-card">
        <div className="hero-card__content">
          <span className="hero-card__eyebrow">
            <Gauge size={15} aria-hidden="true" />
            {canEdit ? 'Panel del evaluador' : 'Panel del propietario'}
          </span>
          <h1>Hola, {firstName}</h1>
          <p>
            {loading
              ? 'Consultando evaluaciones, indicadores y evidencias del sistema.'
              : evaluations.length
                ? canEdit
                  ? `Tienes ${evaluations.length} evaluaciones registradas y ${pending} criterios por completar. Revisa la actividad y da seguimiento a los hallazgos.`
                  : `Consulta tus ${evaluations.length} evaluaciones y el estado de bienestar de tus predios.`
                : canEdit
                  ? 'Comienza registrando la primera evaluación para documentar indicadores, evidencias y recomendaciones del predio.'
                  : 'Aún no hay evaluaciones asociadas a esta cuenta. Contacta al evaluador para vincular tu predio.'}
          </p>
          <div className="hero-card__actions">
            {canEdit ? farms.length ? (
              <Button icon={<Plus size={16} />} onClick={() => navigate('/evaluaciones?crear=1')}>
                Nueva evaluación
              </Button>
            ) : (
              <Link to="/personas-predios" className="button button--primary button--md">
                Registrar persona y predio
              </Link>
            ) : null}
            <Link to="/evaluaciones" className="button button--secondary button--md hero-card__link">
              <span>Ver evaluaciones</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hero-card__score">
          <div
            className="score-ring"
            style={{
              background: `conic-gradient(#6fbc94 ${(latestResult?.score ?? 0) * 3.6}deg, rgba(255,255,255,0.16) 0deg)`
            }}
          >
            <div className="score-ring__inner">
              <strong>{latestResult?.score == null ? '—' : formatNumber(latestResult.score)}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <p>Promedio global</p>
          <span>{completed} evaluaciones completas</span>
        </div>
        <div className="hero-card__decor" aria-hidden="true">
          <span className="hero-card__circle hero-card__circle--one" />
          <span className="hero-card__circle hero-card__circle--two" />
        </div>
      </section>

      {error ? (
        <Alert tone="danger" actions={<Button variant="secondary" size="sm" onClick={() => void loadDashboard()}>Reintentar</Button>}>
          {error}
        </Alert>
      ) : null}
      <div className="stats-grid">
        <StatCard label="Evaluaciones" value={loading ? '—' : evaluations.length} hint={`${completed} finalizadas`} icon={<ClipboardList size={19} />} />
        <StatCard label="Criterios evaluados" value={loading ? '—' : indicatorCount} hint="Registros en el sistema" icon={<Gauge size={19} />} tone="brand" />
        <StatCard label="Criterios pendientes" value={loading ? '—' : pending} hint="En la evaluación más reciente" icon={<TrendingUp size={19} />} tone={pending > 0 ? 'warning' : 'default'} />
        <StatCard label="Evidencias" value={loading ? '—' : evidence.length} hint={`${farms.length} predios en tu alcance`} icon={<Images size={19} />} />
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-grid__main">
          <header className="card__header">
            <div><p className="eyebrow">Actividad reciente</p><h2>Evaluaciones</h2></div>
            <Link to="/evaluaciones" className="text-link">Ver todas <ChevronRight size={15} aria-hidden="true" /></Link>
          </header>
          {loading ? <div className="state-panel" role="status">Cargando evaluaciones…</div> : recent.length ? (
            <div className="evaluation-list">
              {recent.map((item) => (
                <Link className="evaluation-row" to={`/evaluaciones/${item.id}`} key={item.id}>
                  <span className="evaluation-row__date">
                    <strong>{new Date(`${item.fecha}T00:00:00`).getDate()}</strong>
                    <small>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</small>
                  </span>
                  <span className="evaluation-row__main">
                    <strong>{farms.find((farm) => farm.id === item.farmId)?.nombre ?? item.farmName ?? 'Predio'}</strong>
                    <small>{formatDate(item.fecha)} · {item.investigadorNombres} {item.investigadorApellidos}</small>
                  </span>
                  <Badge tone={statusTone(item.estado)}>{item.estado}</Badge>
                  <ChevronRight size={17} className="evaluation-row__chevron" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : <p className="text-muted">Todavía no hay evaluaciones registradas.</p>}
        </section>

        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Referencia</p><h2>Las cuatro libertades</h2></div>
            <Link to="/metodologia" className="text-link">Metodología</Link>
          </header>
          {latestResult?.liberties?.length ? (
            <>
              <p className="card__subtitle">{latest?.farmName ?? 'Evaluación más reciente'} · {latest ? formatDate(latest.fecha) : ''}</p>
              <div className="liberty-list">
                {latestResult.liberties.map((liberty) => (
                  <div className="liberty-item" key={liberty.id}>
                    <ProgressBar label={`${liberty.nombre} (${liberty.peso}%)`} value={liberty.puntuacion ?? 0} />
                    <p className="liberty-item__meta">{liberty.indicadoresPuntuados} criterios puntuados · {liberty.faltantes.length} pendientes</p>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-muted">El resumen estará disponible cuando exista una evaluación con resultado.</p>}
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Prioridades</p><h2>Oportunidades de mejora</h2></div>
            <TrendingUp size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          {priorities.length ? (
            <div className="priority-list">
              {priorities.map((item) => (
                <div className="priority-item" key={item.id}>
                  <div className="priority-item__top">
                    <span>{item.nombre}</span>
                    <Badge tone={scoreBadgeTone(item.puntuacion)}>{item.puntuacion === null ? '—' : `${formatNumber(item.puntuacion)} pts`}</Badge>
                  </div>
                  <ProgressBar value={item.puntuacion ?? 0} hideValue />
                </div>
              ))}
            </div>
          ) : <p className="text-muted">No hay criterios con puntuación disponibles para priorizar.</p>}
          <Link to="/recomendaciones" className="text-link text-link--arrow">Ver recomendaciones <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </section>

        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Soportes</p><h2>Evidencias recientes</h2></div>
            <Link to="/evidencias" className="text-link">Ver todas</Link>
          </header>
          {recentEvidence.length ? (
            <div className="evidence-mini-list">
              {recentEvidence.map((item) => (
                <Link to={`/evidencias?evaluacion=${item.evaluationId}`} className="evidence-mini" key={item.id}>
                  <span className="evidence-mini__thumb"><Images size={20} aria-hidden="true" /></span>
                  <span className="evidence-mini__text">
                    <strong>{item.nombre}</strong>
                    <small>{farms.find((farm) => farm.id === evaluations.find((evaluation) => evaluation.id === item.evaluationId)?.farmId)?.nombre ?? 'Predio'} · {formatDate(item.createdAt)}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : <p className="text-muted">Todavía no hay evidencias cargadas.</p>}
          <div className="card__footer-note">
            <CalendarDays size={15} aria-hidden="true" />
            <span>Información consultada desde el sistema.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ApiEvaluationsPage() {
  const { canEdit } = useBackendRole();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { notify } = useToast();
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(params.get('crear') === '1');
  const [error, setError] = useState('');
  const [farmId, setFarmId] = useState('');
  const [fecha, setFecha] = useState(todayAsInputValue());
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5));
  const [names, setNames] = useState('');
  const [surnames, setSurnames] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [farmFilter, setFarmFilter] = useState(params.get('predio') ?? '');
  const personFilter = params.get('persona') ?? '';
  const [dateFilter, setDateFilter] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [evaluationPreviews, setEvaluationPreviews] = useState<Record<string, EvaluationPreview>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [evaluationResponse, farmResponse] = await Promise.all([
        apiRequest<{ items: ApiEvaluation[] }>('/evaluations'),
        apiRequest<{ items: ApiFarm[] }>('/farms')
      ]);
      setEvaluations(evaluationResponse.items);
      setFarms(farmResponse.items);
      setFarmId((current) => farmResponse.items.some((farm) => farm.id === current)
        ? current : farmResponse.items[0]?.id ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evaluaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    const finalized = evaluations.filter((evaluation) => evaluation.estado === 'Finalizada');

    setEvaluationPreviews(Object.fromEntries(
      finalized.map((evaluation) => [evaluation.id, { status: 'loading' as const }])
    ));
    if (!finalized.length) return;

    void Promise.all(finalized.map(async (evaluation) => {
      try {
        const response = await apiRequest<{ result?: ApiEvaluationResult | null }>(
          `/evaluations/${encodeURIComponent(evaluation.id)}/result`
        );
        return [evaluation.id, { status: 'loaded', result: response.result } satisfies EvaluationPreview] as const;
      } catch {
        return [evaluation.id, { status: 'error' } satisfies EvaluationPreview] as const;
      }
    })).then((entries) => {
      if (!cancelled) setEvaluationPreviews(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [evaluations]);

  const personFarmIds = useMemo(
    () => new Set(farms.filter((farm) => farm.personId === personFilter).map((farm) => farm.id)),
    [farms, personFilter]
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return evaluations.filter((evaluation) => {
      const farm = farms.find((item) => item.id === evaluation.farmId);
      const matchesStatus = !statusFilter || evaluation.estado === statusFilter;
      const matchesFarm = (!farmFilter || evaluation.farmId === farmFilter) &&
        (!personFilter || personFarmIds.has(evaluation.farmId));
      const matchesDate = !dateFilter || evaluation.fecha === dateFilter;
      const matchesTerm = !term || [
        farm?.nombre,
        evaluation.farmName,
        evaluation.id,
        evaluation.investigadorNombres,
        evaluation.investigadorApellidos,
        evaluation.fecha
      ].some((value) => value?.toLocaleLowerCase('es-CO').includes(term));
      return matchesStatus && matchesFarm && matchesDate && matchesTerm;
    });
  }, [evaluations, farms, search, statusFilter, farmFilter, dateFilter, personFilter, personFarmIds]);
  const recent = [...filtered].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora)
  )[0];
  const activityDates = new Set(filtered.map((evaluation) => evaluation.fecha));
  const calendarDays = (() => {
    const firstWeekday = (calendarMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0
    ).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];
  })();
  const selectedDateEvaluations = dateFilter
    ? filtered.filter((item) => item.fecha === dateFilter)
    : [];
  const monthLabel = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric'
  }).format(calendarMonth);
  const hasActiveFilters = Boolean(search || statusFilter || farmFilter || dateFilter || personFilter);

  function dateValue(day: number): string {
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    return `${calendarMonth.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
  }

  function closeCreateForm() {
    setShowForm(false);
    if (params.has('crear')) {
      const next = new URLSearchParams(params);
      next.delete('crear');
      setParams(next, { replace: true });
    }
  }

  function clearPersonFilter() {
    const next = new URLSearchParams(params);
    next.delete('persona');
    next.delete('predio');
    setParams(next, { replace: true });
    setFarmFilter('');
  }

  async function createEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest<{ id: string }>('/evaluations', {
        method: 'POST',
        body: {
          farmId,
          fecha,
          hora,
          investigadorNombres: names.trim(),
          investigadorApellidos: surnames.trim(),
          observaciones
        }
      });
      notify('Evaluación creada y guardada.');
      navigate(`/evaluaciones/${created.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvaluation(id: string) {
    if (!window.confirm('¿Eliminar esta evaluación y sus registros asociados? Esta acción no se puede deshacer.')) return;
    try {
      await apiRequest<void>(`/evaluations/${id}`, { method: 'DELETE' });
      notify('Evaluación eliminada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la evaluación.');
    }
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Gestión de campo"
        title={canEdit ? 'Evaluaciones' : 'Mis evaluaciones'}
        description={
          canEdit
            ? 'Consulta las visitas registradas, su avance y el resultado operativo de cada predio.'
            : 'Consulta las visitas y resultados de tus predios vinculados.'
        }
        actions={canEdit ? <Button icon={<Plus size={17} />} onClick={() => setShowForm(true)} disabled={!farms.length}>Nueva evaluación</Button> : undefined}
      />
      {error && !showForm ? (
        <Alert
          tone="danger"
          actions={<Button variant="secondary" size="sm" onClick={() => void load()}>Reintentar</Button>}
        >
          {error}
        </Alert>
      ) : null}
      {showForm && canEdit ? (
        <Modal
          open={showForm}
          title="Nueva visita"
          description="Completa los datos para registrar una nueva evaluación."
          onClose={closeCreateForm}
          size="lg"
        >
          {error ? (
            <Alert tone="danger" actions={<Button variant="secondary" size="sm" onClick={() => void load()}>Reintentar</Button>}>
              {error}
            </Alert>
          ) : null}
          {!farms.length ? <Alert tone="warning">Registra primero un predio para poder crear la evaluación.</Alert> : null}
          <form className="form" onSubmit={createEvaluation}>
            <FormField id="api-evaluation-farm" label="Predio" required>
              <select id="api-evaluation-farm" className="input input--select" value={farmId} onChange={(event) => setFarmId(event.target.value)} required>
                {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.nombre}</option>)}
              </select>
            </FormField>
            <div className="form-grid form-grid--two">
              <FormField id="api-evaluation-date" label="Fecha" required><TextInput id="api-evaluation-date" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} required /></FormField>
              <FormField id="api-evaluation-time" label="Hora" required><TextInput id="api-evaluation-time" type="time" value={hora} onChange={(event) => setHora(event.target.value)} required /></FormField>
              <FormField id="api-evaluation-firstname" label="Nombres del investigador" required><TextInput id="api-evaluation-firstname" value={names} maxLength={120} onChange={(event) => setNames(event.target.value)} required /></FormField>
              <FormField id="api-evaluation-lastname" label="Apellidos del investigador" required><TextInput id="api-evaluation-lastname" value={surnames} maxLength={120} onChange={(event) => setSurnames(event.target.value)} required /></FormField>
            </div>
            <FormField id="api-evaluation-notes" label="Observaciones generales"><TextArea id="api-evaluation-notes" value={observaciones} maxLength={10000} onChange={(event) => setObservaciones(event.target.value)} /></FormField>
            <Button type="submit" loading={saving} disabled={saving || !farmId}>Guardar evaluación</Button>
          </form>
        </Modal>
      ) : null}
      {personFilter ? (
        <Alert
          tone="info"
          actions={<Button variant="secondary" size="sm" onClick={clearPersonFilter}>Ver todas las evaluaciones</Button>}
        >
          Mostrando evaluaciones de los predios vinculados a la persona seleccionada.
        </Alert>
      ) : null}
      <section className="filters-bar" aria-label="Filtros de evaluaciones">
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <TextInput
            type="search"
            placeholder={canEdit
              ? 'Buscar por predio, investigador o fecha…'
              : 'Buscar por predio o fecha…'}
            aria-label="Buscar evaluaciones"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {dateFilter ? (
          <Button size="sm" variant="secondary" onClick={() => setDateFilter('')}>
            Quitar filtro: {formatDate(dateFilter)}
          </Button>
        ) : null}
        <div className="filters-bar__select">
          <Send size={16} aria-hidden="true" />
          <select
            className="input input--select"
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="En proceso">En proceso</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Requiere seguimiento">Requiere seguimiento</option>
          </select>
        </div>
        <div className="filters-bar__select">
          <MapPin size={16} aria-hidden="true" />
          <select
            className="input input--select"
            aria-label="Filtrar por predio"
            value={farmFilter}
            onChange={(event) => {
              if (personFilter) {
                const next = new URLSearchParams(params);
                next.delete('persona');
                setParams(next, { replace: true });
              }
              setFarmFilter(event.target.value);
            }}
          >
            <option value="">Todos los predios</option>
            {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.nombre}</option>)}
          </select>
        </div>
        <span className="filters-bar__count">{filtered.length} de {evaluations.length}</span>
      </section>

      <section className="card recent-activity">
        <header className="card__header">
          <div><p className="eyebrow">Actividad reciente</p><h2>{recent ? 'Última evaluación registrada' : 'Sin actividad reciente'}</h2></div>
          <CalendarDays size={20} className="card__header-icon" aria-hidden="true" />
        </header>
        <div className="recent-activity__layout">
          <div className="recent-activity__latest">
            {loading ? (
              <p className="text-muted" role="status">Cargando evaluaciones…</p>
            ) : recent ? (
              <>
                <p className="recent-activity__date">{formatDate(recent.fecha)}</p>
                <h3>{farms.find((farm) => farm.id === recent.farmId)?.nombre ?? recent.farmName ?? 'Predio'}</h3>
                <p>{recent.hora} · {recent.investigadorNombres} {recent.investigadorApellidos}</p>
                <div className="recent-activity__badges">
                  <Badge tone={statusTone(recent.estado)}>{recent.estado}</Badge>
                  <Badge tone="neutral">Resultado en detalle</Badge>
                </div>
                <Link className="text-link text-link--arrow" to={`/evaluaciones/${recent.id}`}>
                  Abrir evaluación <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </>
            ) : <p className="text-muted">Todavía no hay evaluaciones registradas.</p>}
          </div>
          <div className="activity-calendar">
            <div className="activity-calendar__header">
              <strong>{monthLabel}</strong>
              <div>
                <button type="button" className="icon-button icon-button--sm" aria-label="Mes anterior" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                  <ArrowLeft size={15} />
                </button>
                <button type="button" className="icon-button icon-button--sm" aria-label="Mes siguiente" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="activity-calendar__grid" role="grid" aria-label="Actividad mensual">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                <span className="activity-calendar__weekday" key={`${day}-${index}`}>{day}</span>
              ))}
              {calendarDays.map((day, index) => day === null ? (
                <span className="activity-calendar__blank" key={`blank-${index}`} />
              ) : (
                <button
                  type="button"
                  key={day}
                  className={`activity-calendar__day ${activityDates.has(dateValue(day)) ? 'has-activity' : ''} ${dateFilter === dateValue(day) ? 'is-selected' : ''}`}
                  aria-label={`${day} ${monthLabel}${activityDates.has(dateValue(day)) ? ', con evaluaciones' : ', sin evaluaciones'}`}
                  aria-pressed={dateFilter === dateValue(day)}
                  onClick={() => setDateFilter((current) => current === dateValue(day) ? '' : dateValue(day))}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="activity-calendar__legend"><span aria-hidden="true" /> Día con evaluaciones</p>
            <p className="activity-calendar__result" aria-live="polite">
              {dateFilter
                ? selectedDateEvaluations.length
                  ? `${selectedDateEvaluations.length} evaluación(es) el ${formatDate(dateFilter)}. El historial está filtrado por esta fecha.`
                  : `No hay evaluaciones el ${formatDate(dateFilter)}. El historial está filtrado por esta fecha.`
                : 'Selecciona un día para consultar si hubo actividad.'}
            </p>
          </div>
        </div>
      </section>

      <section className="evaluation-history">
        <header className="evaluation-history__header">
          <div><p className="eyebrow">Historial</p><h2>Evaluaciones registradas</h2></div>
          <Badge tone="neutral">{filtered.length} registros</Badge>
        </header>
        {loading ? (
          <div className="state-panel" role="status">Cargando evaluaciones…</div>
        ) : !evaluations.length ? (
          <EmptyState
            icon={<ClipboardList size={30} />}
            title="No hay evaluaciones registradas"
            description={canEdit ? 'Crea una evaluación para iniciar el registro de los indicadores.' : 'No hay evaluaciones asociadas a los predios vinculados.'}
            action={canEdit ? <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)} disabled={!farms.length}>Crear evaluación</Button> : undefined}
          />
        ) : !filtered.length ? (
          <EmptyState
            icon={<Search size={30} />}
            title="Sin resultados"
            description="No encontramos evaluaciones que coincidan con los filtros seleccionados."
            action={hasActiveFilters ? <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter(''); setFarmFilter(''); setDateFilter(''); clearPersonFilter(); }}>Limpiar filtros</Button> : undefined}
          />
        ) : (
          <div className="evaluation-grid">
            {filtered.map((evaluation) => {
              const preview = evaluationPreviews[evaluation.id];
              const result = preview?.status === 'loaded' ? preview.result : null;
              const score = result?.score ?? null;
              const previewLabel = result?.classification ||
                (result?.calculability === 'not_calculable' ? 'No calculable' : null) ||
                (preview?.status === 'loading' || (evaluation.estado === 'Finalizada' && !preview)
                  ? 'Cargando…'
                  : preview?.status === 'error'
                    ? 'No disponible'
                    : evaluation.estado === 'Finalizada' ? 'Sin resultado' : 'ver detalle');

              return (
              <article className="evaluation-card" key={evaluation.id}>
                <div className="evaluation-card__top">
                  <Badge tone={statusTone(evaluation.estado)}>{evaluation.estado}</Badge>
                  <span className="evaluation-card__code">{evaluation.id}</span>
                </div>
                <Link to={`/evaluaciones/${evaluation.id}`} className="evaluation-card__body" aria-label={`Abrir evaluación de ${farms.find((farm) => farm.id === evaluation.farmId)?.nombre ?? evaluation.farmName ?? 'Predio'}`}>
                  <div className="evaluation-card__heading">
                    <div>
                      <h2>{farms.find((farm) => farm.id === evaluation.farmId)?.nombre ?? evaluation.farmName ?? 'Predio'}</h2>
                      <p><MapPin size={14} aria-hidden="true" /> Predio registrado en el sistema</p>
                    </div>
                    <div className={`score-tile score-tile--${scoreBadgeTone(score)}`}>
                      <strong>{score == null ? '—' : formatNumber(score)}</strong>
                      <small>{previewLabel}</small>
                    </div>
                  </div>
                  <div className="evaluation-card__meta">
                    <span><CalendarDays size={15} aria-hidden="true" /> {formatDate(evaluation.fecha)} · {evaluation.hora}</span>
                    <span><UserRound size={15} aria-hidden="true" /> {evaluation.investigadorNombres} {evaluation.investigadorApellidos}</span>
                  </div>
                </Link>
                {canEdit && evaluation.estado === 'En proceso' ? (
                  <div className="evaluation-card__actions">
                    <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => void deleteEvaluation(evaluation.id)}>Eliminar</Button>
                  </div>
                ) : null}
              </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function ApiEvaluationDetailPage() {
  const { id = '', libertyId = '' } = useParams();
  const { canEdit } = useBackendRole();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<ApiEvaluation | null>(null);
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [evidence, setEvidence] = useState<ApiEvidenceRecord[]>([]);
  const [evidenceIndicatorId, setEvidenceIndicatorId] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [plans, setPlans] = useState<ApiRecommendationPlan[]>([]);
  const [result, setResult] = useState<ApiEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [error, setError] = useState('');
  const [indicatorFormOpen, setIndicatorFormOpen] = useState(false);
  const [activeLibertyId, setActiveLibertyId] = useState('');
  const [criterionId, setCriterionId] = useState('');
  const [score, setScore] = useState('');
  const [editingIndicator, setEditingIndicator] = useState<ApiIndicator | null>(null);
  const [evaluationFormOpen, setEvaluationFormOpen] = useState(false);
  const [evaluationDate, setEvaluationDate] = useState('');
  const [evaluationTime, setEvaluationTime] = useState('');
  const [researcherNames, setResearcherNames] = useState('');
  const [researcherSurnames, setResearcherSurnames] = useState('');
  const [evaluationNotes, setEvaluationNotes] = useState('');

  const load = useCallback(async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [evaluationResponse, indicatorResponse, resultResponse, evidenceResponse, planResponse] = await Promise.all([
        apiRequest<{ item: ApiEvaluation }>(`/evaluations/${id}`),
        apiRequest<{ items: ApiIndicator[] }>(`/indicators?evaluationId=${encodeURIComponent(id)}`),
        apiRequest<{ result: ApiEvaluationResult }>(`/evaluations/${id}/result`),
        apiRequest<{ items: ApiEvidenceRecord[] }>(`/evidence?evaluationId=${encodeURIComponent(id)}`),
        apiRequest<{ items: ApiRecommendationPlan[] }>('/recommendation-plans')
      ]);
      setEvaluation(evaluationResponse.item);
      setIndicators(indicatorResponse.items);
      setResult(resultResponse.result);
      setEvidence(evidenceResponse.items);
      setEvidenceIndicatorId((current) =>
        indicatorResponse.items.some((indicator) => indicator.id === current)
          ? current
          : indicatorResponse.items[0]?.id ?? ''
      );
      setPlans(planResponse.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la evaluación.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const availableCriteria = useMemo(
    () => CRITERIA.filter((criterion) => !indicators.some((indicator) => indicator.criterionId === criterion.id)),
    [indicators]
  );
  const unresolvedCriterionIds = useMemo(
    () => new Set(result?.coverage.missing ?? availableCriteria.map((criterion) => criterion.id)),
    [availableCriteria, result]
  );
  const pendingCriteriaCountForLiberty = (targetLibertyId: string) =>
    CRITERIA.filter(
      (criterion) => criterion.libertadId === targetLibertyId && unresolvedCriterionIds.has(criterion.id)
    ).length;
  const criteriaInSelectedLiberty = libertyId
    ? CRITERIA.filter((criterion) => criterion.libertadId === libertyId)
    : [];
  const activeLiberty = LIBERTIES.find((liberty) => liberty.id === activeLibertyId);
  const activeLibertyResult = result?.liberties?.find((liberty) => liberty.id === activeLibertyId);
  const activeLibertyScore = activeLibertyResult?.puntuacion;
  const activeLibertyScorePercent =
    activeLibertyScore == null || !Number.isFinite(activeLibertyScore)
      ? 0
      : Math.min(100, Math.max(0, activeLibertyScore));
  const modalLibertyPendingCount = libertyId ? pendingCriteriaCountForLiberty(libertyId) : 0;

  async function saveIndicator() {
    const rubric = CRITERION_RUBRICS[criterionId];
    const selectedRating = rubric?.ratings.find((rating) => rating.score === Number(score));
    if (!criterionId || !score || !selectedRating) {
      setError('Selecciona un criterio y un rango de calificación.');
      return;
    }
    const status: ApiIndicator['estado'] =
      selectedRating.score < (criterionId === LIBERTY_ADJUSTMENT_CRITERION_ID ? 0 : 60)
        ? 'Requiere seguimiento'
        : 'Registrado';
    setSaving(true);
    setError('');
    try {
      await apiRequest(
        editingIndicator ? `/indicators/${editingIndicator.id}` : '/indicators',
        {
          method: editingIndicator ? 'PATCH' : 'POST',
          body: {
            ...(editingIndicator ? {} : { evaluationId: id, criterionId }),
            metodo: 'Rúbrica EBA Porcinos 3.0',
            resultado: selectedRating.description,
            estado: status,
            aplicabilidad: 'aplica',
            puntaje: Number(score),
            observaciones: ''
          }
        }
      );
      setEditingIndicator(null);
      setCriterionId('');
      setScore('');
      await load(false);
      notify('Indicador guardado.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el indicador.');
    } finally {
      setSaving(false);
    }
  }

  function closeIndicatorForm() {
    setEditingIndicator(null);
    setIndicatorFormOpen(false);
    setCriterionId('');
    setScore('');
    if (libertyId) navigate(`/evaluaciones/${encodeURIComponent(id)}`, { replace: true });
  }

  function openIndicatorForm(targetLibertyId = '') {
    setEditingIndicator(null);
    setCriterionId('');
    setScore('');
    setError('');
    setIndicatorFormOpen(true);
    if (targetLibertyId) {
      navigate(`/evaluaciones/${encodeURIComponent(id)}/indicadores/${encodeURIComponent(targetLibertyId)}`);
    }
  }

  async function removeIndicator(indicatorId: string) {
    if (!window.confirm('¿Eliminar este indicador y las evidencias asociadas?')) return;
    try {
      await apiRequest<void>(`/indicators/${indicatorId}`, { method: 'DELETE' });
      notify('Indicador eliminado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar el indicador.');
    }
  }

  async function uploadIndicatorPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evidenceFile || !evidenceIndicatorId || !evaluation || uploadingEvidence) return;
    if (evidenceFile.size > 5 * 1024 * 1024) {
      setError('La foto no puede superar 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(evidenceFile.type)) {
      setError('Selecciona una foto JPEG, PNG o WebP.');
      return;
    }
    setUploadingEvidence(true);
    setError('');
    try {
      const response = await apiRequest<{ item: ApiEvidenceRecord }>('/evidence', {
        method: 'POST',
        body: {
          evaluationId: evaluation.id,
          indicatorId: evidenceIndicatorId,
          name: evidenceFile.name,
          mimeType: evidenceFile.type,
          contentBase64: evidenceToBase64(new Uint8Array(await evidenceFile.arrayBuffer()))
        }
      });
      setEvidence((current) => [...current, response.item]);
      setEvidenceFile(null);
      const fileInput = document.getElementById('evaluation-indicator-photo');
      if (fileInput instanceof HTMLInputElement) fileInput.value = '';
      notify('Foto asociada al indicador.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la foto.');
    } finally {
      setUploadingEvidence(false);
    }
  }

  async function finalize() {
    if (!window.confirm('¿Enviar y finalizar esta evaluación? Después no se podrán editar sus indicadores.')) return;
    setSaving(true);
    try {
      await apiRequest(`/evaluations/${id}/finalize`, { method: 'POST', body: {} });
      notify('Evaluación enviada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo finalizar la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  function openEvaluationForm() {
    if (!evaluation) return;
    setEvaluationDate(evaluation.fecha);
    setEvaluationTime(evaluation.hora);
    setResearcherNames(evaluation.investigadorNombres);
    setResearcherSurnames(evaluation.investigadorApellidos);
    setEvaluationNotes(evaluation.observaciones);
    setEvaluationFormOpen(true);
  }

  async function saveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/evaluations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          fecha: evaluationDate,
          hora: evaluationTime,
          investigadorNombres: researcherNames.trim(),
          investigadorApellidos: researcherSurnames.trim(),
          observaciones: evaluationNotes
        }
      });
      notify('Evaluación actualizada.');
      setEvaluationFormOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  async function removeEvaluation() {
    if (!window.confirm('¿Eliminar esta evaluación y sus registros asociados? Esta acción no se puede deshacer.')) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest<void>(`/evaluations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      notify('Evaluación eliminada.');
      navigate('/evaluaciones', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la evaluación.');
    } finally {
      setSaving(false);
    }
  }

  async function generateRecommendations() {
    if (
      !canEdit ||
      !evaluation ||
      evaluation.estado !== 'Finalizada' ||
      plans.some((item) => item.evaluationId === id) ||
      !indicators.some((indicator) =>
        indicator.aplicabilidad === 'aplica' && indicator.estado === 'Requiere seguimiento'
      ) ||
      planBusy
    ) return;
    setPlanBusy(true);
    setError('');
    try {
      const response = await apiRequest<{ item: ApiRecommendationPlan; idempotent: boolean }>(
        '/recommendation-plans/generate',
        { method: 'POST', body: { evaluationId: id } }
      );
      setPlans((current) => [
        response.item,
        ...current.filter((item) => item.evaluationId !== response.item.evaluationId)
      ]);
      notify(
        response.idempotent
          ? 'El plan ya estaba publicado y se recuperó del servidor.'
          : response.item.source === 'ia'
            ? `Las recomendaciones se generaron con ${response.item.provider} (${response.item.model}).`
            : 'Se generaron recomendaciones con plantillas EBA.',
        response.item.source === 'ia' || response.idempotent ? 'success' : 'warning'
      );
    } catch {
      const message = 'No se pudieron generar las recomendaciones en este momento. Inténtalo nuevamente más tarde.';
      setError(message);
      notify(message, 'warning');
    } finally {
      setPlanBusy(false);
    }
  }

  async function removeRecommendations() {
    const currentPlan = plans.find((item) => item.evaluationId === id);
    if (!currentPlan || !canEdit || planBusy) return;
    if (!window.confirm('¿Eliminar este plan y todas sus acciones asociadas? Esta acción no se puede deshacer.')) return;
    setPlanBusy(true);
    setError('');
    try {
      await apiRequest<void>(`/recommendation-plans/${encodeURIComponent(currentPlan.id)}`, {
        method: 'DELETE'
      });
      setPlans((current) => current.filter((item) => item.id !== currentPlan.id));
      notify('Plan eliminado. Puedes generar recomendaciones nuevas.');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No se pudo eliminar el plan.';
      setError(message);
      notify(message, 'warning');
    } finally {
      setPlanBusy(false);
    }
  }

  if (loading) return <div className="page" role="status">Cargando evaluación…</div>;
  if (!evaluation) return <div className="page stack"><PageHeader backTo="/evaluaciones" title="No se encontró la evaluación" description={error || 'No se encontró el registro solicitado.'} /></div>;

  const editable = canEdit && evaluation.estado === 'En proceso';
  const evaluatedCount = result?.coverage.registered ?? indicators.length;
  const pendingCount = result?.coverage.missing.length ?? Math.max(0, CRITERIA.length - indicators.length);
  const evaluationClassification = classificationFor(result?.score ?? null);
  const pendingCriterionDescriptions = (result?.coverage.missing ?? []).map((criterionId) => {
    const criterion = CRITERIA.find((item) => item.id === criterionId);
    const indicator = indicators.find((item) => item.criterionId === criterionId);
    const status = !indicator
      ? 'sin registro'
      : indicator.estado === 'Pendiente de revisión'
        ? 'pendiente de revisión'
        : 'respuesta sin puntaje válido';
    return `${criterion?.nombre ?? criterionId} (${status})`;
  });
  const pendingCriteriaSummary = pendingCriterionDescriptions.length > 5
    ? `${pendingCriterionDescriptions.slice(0, 5).join('; ')} y ${pendingCriterionDescriptions.length - 5} más`
    : pendingCriterionDescriptions.join('; ');
  const plan = plans.find((item) => item.evaluationId === id);
  const indicatorName = (indicatorId: string) =>
    indicators.find((item) => item.id === indicatorId)?.nombre ?? 'Indicador';
  return (
    <div className="page stack">
      <PageHeader
        backTo="/evaluaciones"
        backLabel="Volver a evaluaciones"
        eyebrow={`Evaluación ${evaluation.id}`}
        title={evaluation.farmName ?? 'Evaluación'}
        description={`${formatDate(evaluation.fecha)} · ${evaluation.hora} · ${evaluation.investigadorNombres} ${evaluation.investigadorApellidos}`}
        actions={editable
          ? <>
              <Button icon={<Send size={16} />} onClick={() => void finalize()} loading={saving} disabled={saving || pendingCount > 0}>Enviar evaluación</Button>
              <Button variant="secondary" icon={<Pencil size={15} />} onClick={openEvaluationForm}>Editar</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => void removeEvaluation()} disabled={saving}>Eliminar</Button>
            </>
          : <Badge tone={statusTone(evaluation.estado)}>{evaluation.estado}</Badge>}
      />
      {error ? (
        <Alert
          tone="danger"
          actions={<Button variant="secondary" size="sm" onClick={() => void load()}>Reintentar</Button>}
        >
          {error}
        </Alert>
      ) : null}
      <section className="detail-hero">
        <div className="detail-hero__main">
          <div className="detail-hero__badges">
            <Badge tone={statusTone(evaluation.estado)}>{evaluation.estado}</Badge>
            <Badge tone={scoreBadgeTone(result?.score)}>{evaluationClassification ?? 'Resultado incompleto'}</Badge>
          </div>
          <h2>Resumen de la visita</h2>
          <p className="detail-hero__description">
            {evaluation.observaciones || 'La evaluación no tiene observaciones generales registradas.'}
          </p>
          <div className="detail-meta">
            <span><MapPin size={15} aria-hidden="true" />{evaluation.farmName ?? 'Predio'}</span>
            <span><UserRound size={15} aria-hidden="true" />Investigador: {evaluation.investigadorNombres} {evaluation.investigadorApellidos}</span>
            <span><CalendarDays size={15} aria-hidden="true" />Actualizada {formatDateTime(evaluation.updatedAt ?? evaluation.fecha)}</span>
          </div>
          <p className="detail-hero__farm">{result?.methodologyVersion ?? 'Metodología EBA Porcinos'} · Información almacenada en el sistema</p>
        </div>
        <div className="detail-hero__score">
          <div className={`score-tile score-tile--${scoreBadgeTone(result?.score)}`}>
            <strong>{result?.score == null ? '—' : formatNumber(result.score)}</strong>
            <small>{result?.score == null ? 'incompleto' : 'de 100'}</small>
          </div>
          <span>Índice de bienestar porcino</span>
          <Badge tone={scoreBadgeTone(result?.score)}>
            {evaluationClassification ?? 'Clasificación pendiente'}
          </Badge>
          <small>{evaluatedCount} de {result?.coverage.total ?? CRITERIA.length} criterios con respuesta válida</small>
        </div>
      </section>
      {editable && pendingCount > 0 ? (
        <Alert tone="warning" title="Aún no se puede enviar">
          Completa o revisa los {pendingCount} criterios sin respuesta válida para habilitar el envío y finalizar la evaluación.
        </Alert>
      ) : null}
      {evaluationFormOpen ? (
        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Datos de la visita</p><h2>Editar evaluación</h2></div>
          </header>
          <form className="form" onSubmit={(event) => void saveEvaluation(event)}>
            <div className="form-grid form-grid--two">
              <FormField id="api-edit-evaluation-date" label="Fecha" required>
                <TextInput id="api-edit-evaluation-date" type="date" value={evaluationDate} onChange={(event) => setEvaluationDate(event.target.value)} required />
              </FormField>
              <FormField id="api-edit-evaluation-time" label="Hora" required>
                <TextInput id="api-edit-evaluation-time" type="time" value={evaluationTime} onChange={(event) => setEvaluationTime(event.target.value)} required />
              </FormField>
              <FormField id="api-edit-researcher-names" label="Nombres del investigador" required>
                <TextInput id="api-edit-researcher-names" value={researcherNames} maxLength={120} onChange={(event) => setResearcherNames(event.target.value)} required />
              </FormField>
              <FormField id="api-edit-researcher-surnames" label="Apellidos del investigador" required>
                <TextInput id="api-edit-researcher-surnames" value={researcherSurnames} maxLength={120} onChange={(event) => setResearcherSurnames(event.target.value)} required />
              </FormField>
            </div>
            <FormField id="api-edit-evaluation-notes" label="Observaciones generales">
              <TextArea id="api-edit-evaluation-notes" value={evaluationNotes} maxLength={10000} onChange={(event) => setEvaluationNotes(event.target.value)} />
            </FormField>
            <div className="page-header__actions">
              <Button type="submit" loading={saving} disabled={saving}>Guardar cambios</Button>
              <Button type="button" variant="secondary" onClick={() => setEvaluationFormOpen(false)} disabled={saving}>Cancelar</Button>
            </div>
          </form>
        </section>
      ) : null}
      <div className="stats-grid stats-grid--three">
        <StatCard label="Criterios evaluados" value={`${evaluatedCount} / ${result?.coverage.total ?? CRITERIA.length}`} hint="Criterios con puntaje válido" icon={<ListChecks size={19} />} tone="brand" />
        <StatCard label="Pendientes" value={pendingCount} hint={pendingCount ? 'Sin respuesta válida' : 'Evaluación completa'} icon={<ClipboardList size={19} />} tone={pendingCount ? 'warning' : 'default'} />
        <StatCard
          label="Resultado"
          value={result?.score == null ? 'No calculable' : formatNumber(result.score)}
          hint={evaluationClassification ?? result?.methodologyVersion ?? 'Pendiente de cálculo'}
          icon={<Gauge size={19} />}
        />
      </div>
      {result?.calculability === 'not_calculable' ? (
        <Alert tone="info" title="Resultado no calculable">
          {result.reasons.join(' ')}
        </Alert>
      ) : null}
      {pendingCount > 0 ? (
        <Alert tone="warning" title="Criterios por completar o revisar">
          Completa o revisa los {pendingCount} criterios desde el registro organizado por libertad.
          {pendingCriteriaSummary ? ` El cálculo identifica: ${pendingCriteriaSummary}.` : null}
        </Alert>
      ) : null}

      <section className="card api-liberty-browser">
        <header className="card__header">
          <div><p className="eyebrow">Ponderación y seguimiento</p><h2>Las cuatro libertades</h2></div>
          <div className="page-header__actions">
            <Link to="/metodologia" className="text-link">Metodología</Link>
            {editable ? (
              <Button size="sm" icon={<Plus size={15} />} onClick={() => openIndicatorForm()}>
                Agregar indicador
              </Button>
            ) : null}
          </div>
        </header>
        <p className="card__subtitle">Selecciona una libertad para consultar su ponderación, avance e indicadores.</p>
        <div className="api-liberty-browser__layout">
          <nav className="api-liberty-rail" aria-label="Navegación por las cuatro libertades">
            {LIBERTIES.map((liberty) => {
              const pending = pendingCriteriaCountForLiberty(liberty.id);
              const selected = activeLibertyId === liberty.id;
              return (
                <button
                  className={`api-liberty-rail__item ${selected ? 'api-liberty-rail__item--selected' : ''}`}
                  key={liberty.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveLibertyId(liberty.id)}
                >
                  <span className="api-liberty-rail__text">{liberty.nombre}</span>
                  <Badge tone={pending ? 'warning' : 'success'}>
                    {pending ? `${pending} pendientes` : 'Completa'}
                  </Badge>
                </button>
              );
            })}
          </nav>
          <div className="api-liberty-browser__content" aria-live="polite">
            {activeLiberty ? (
              <>
                <header className="api-liberty-browser__content-header">
                  <div>
                    <p className="eyebrow">{activeLiberty.peso}% de ponderación</p>
                    <h3>{activeLiberty.nombre}</h3>
                  </div>
                </header>
                <div
                  className="api-liberty-score"
                  role="progressbar"
                  aria-label={`Puntuación de ${activeLiberty.nombre}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={activeLibertyScorePercent}
                  aria-valuetext={
                    activeLibertyScore == null
                      ? 'Sin puntaje'
                      : `${formatNumber(activeLibertyScore)}%`
                  }
                >
                  <div
                    className="api-liberty-score__ring"
                    style={{
                      background: `conic-gradient(var(--brand-600) ${activeLibertyScorePercent * 3.6}deg, var(--line) 0deg)`
                    }}
                  >
                    <div className="api-liberty-score__inner">
                      <strong>{activeLibertyScore == null ? '—' : `${formatNumber(activeLibertyScore)}%`}</strong>
                    </div>
                  </div>
                  <span className="api-liberty-score__label">Resultado de la libertad</span>
                </div>
              </>
            ) : (
              <Alert tone="info">Selecciona una libertad para consultar sus indicadores y ponderación.</Alert>
            )}
          </div>
        </div>
      </section>
      {editable ? (
        <Modal
          open={indicatorFormOpen || Boolean(libertyId)}
          title={editingIndicator ? `Editar ${editingIndicator.nombre}` : 'Agregar indicador'}
          description="Elige una libertad y selecciona el rango que corresponda a lo observado."
          size="lg"
          onClose={closeIndicatorForm}
        >
          <div className="api-indicator-workflow">
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <div className="api-liberty-browser__layout api-liberty-browser__layout--modal">
              <nav className="api-liberty-rail" aria-label="Navegar por libertades">
                {LIBERTIES.map((liberty) => {
                  const pending = pendingCriteriaCountForLiberty(liberty.id);
                  const selected = libertyId === liberty.id;
                  const complete = pending === 0;
                  return (
                    <Link
                      className={`api-liberty-rail__item ${selected ? 'api-liberty-rail__item--selected' : ''}`}
                      key={liberty.id}
                      to={`/evaluaciones/${encodeURIComponent(id)}/indicadores/${encodeURIComponent(liberty.id)}`}
                      aria-current={selected ? 'page' : undefined}
                      aria-disabled={Boolean(editingIndicator) || undefined}
                      onClick={(event) => {
                        if (editingIndicator) {
                          event.preventDefault();
                          return;
                        }
                        setCriterionId('');
                        setScore('');
                        setError('');
                      }}
                    >
                      <span className="api-liberty-rail__text">{liberty.nombre}</span>
                      <Badge tone={complete ? 'success' : 'warning'}>
                        {complete ? 'Completa' : `${pending} pendientes`}
                      </Badge>
                    </Link>
                  );
                })}
              </nav>
              <div className="api-liberty-browser__content">
                {libertyId ? (
                  <>
                    <header className="api-liberty-browser__content-header">
                      <div>
                        <p className="eyebrow">Indicadores de la libertad</p>
                        <h3>{LIBERTIES.find((liberty) => liberty.id === libertyId)?.nombre ?? 'Libertad'}</h3>
                      </div>
                      <Badge tone={modalLibertyPendingCount ? 'warning' : 'success'}>
                        {modalLibertyPendingCount ? `${modalLibertyPendingCount} pendientes` : 'Completa'}
                      </Badge>
                    </header>
                    <div className="api-criterion-list">
                      {criteriaInSelectedLiberty.length ? criteriaInSelectedLiberty.map((criterion) => {
                        const rubric = CRITERION_RUBRICS[criterion.id];
                        const existingIndicator = indicators.find((indicator) => indicator.criterionId === criterion.id);
                        const criterionSelected = criterion.id === criterionId;
                        const selectedRatingIsValid = rubric.ratings.some((rating) => String(rating.score) === score);
                        const indicatorIsBeingEdited = existingIndicator?.id === editingIndicator?.id;
                        return (
                          <article
                            className={`api-criterion-card ${criterionSelected ? 'api-criterion-card--selected' : ''}`}
                            key={criterion.id}
                          >
                            <div className="api-criterion-card__header">
                              <h3>{criterion.nombre}</h3>
                              {existingIndicator ? (
                                <div className="page-header__actions">
                                  <Badge tone={indicatorIsBeingEdited || existingIndicator.estado !== 'Registrado' ? 'warning' : 'success'}>
                                    {indicatorIsBeingEdited ? 'Editando' : existingIndicator.estado} · {existingIndicator.puntaje} pts
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={<Trash2 size={15} />}
                                    onClick={() => void removeIndicator(existingIndicator.id)}
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <div className="criterion-question">
                              <h3>Pregunta de evaluación</h3>
                              <p>{rubric.question}</p>
                            </div>
                            <fieldset className="criterion-choice-fieldset">
                              <legend>Selecciona el puntaje</legend>
                              <div className="rating-options">
                                {rubric.ratings.map((rating) => {
                                  const selected = criterionSelected && score === String(rating.score);
                                  return (
                                    <button
                                      aria-label={`Puntaje ${rating.score}: ${rating.description}`}
                                      aria-pressed={selected}
                                      className={`rating-option ${selected ? 'rating-option--selected' : ''}`}
                                      key={rating.score}
                                      onClick={() => {
                                        setEditingIndicator(existingIndicator ?? null);
                                        setCriterionId(criterion.id);
                                        setScore(String(rating.score));
                                        setError('');
                                      }}
                                      type="button"
                                    >
                                      <strong>{rating.score} puntos</strong>
                                      <span>{rating.description}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>
                            {criterionSelected && selectedRatingIsValid ? (
                              <div className="api-indicator-entry">
                                <div className="page-header__actions">
                                  <Button
                                    type="button"
                                    loading={saving}
                                    disabled={saving || !selectedRatingIsValid}
                                    onClick={() => void saveIndicator()}
                                  >
                                    {editingIndicator ? 'Guardar cambios' : 'Guardar indicador'}
                                  </Button>
                                  <Button type="button" variant="secondary" onClick={closeIndicatorForm} disabled={saving}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </article>
                        );
                      }) : <Alert tone="success">Todos los criterios de esta libertad tienen un registro.</Alert>}
                    </div>
                  </>
                ) : (
                  <Alert tone="info">Selecciona una libertad para consultar sus criterios y rangos de calificación.</Alert>
                )}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
      <div className="dashboard-grid dashboard-grid--stacked">
        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Plan de mejora</p><h2>Recomendaciones</h2></div>
            <Sparkles size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          {plan ? (
            <div className="recommendation-list">
              <article className="recommendation-item">
                <div className="recommendation-item__top">
                  <Sparkles size={16} aria-hidden="true" />
                  <h3>{plan.title ?? 'Plan de mejora'}</h3>
                  {canEdit ? (
                    <button
                      type="button"
                      className="icon-button icon-button--sm icon-button--danger recommendation-item__delete"
                      aria-label="Eliminar plan de recomendaciones"
                      title="Eliminar plan"
                      onClick={() => void removeRecommendations()}
                      disabled={planBusy}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {plan.recommendation ? <p>{plan.recommendation}</p> : null}
                {plan.actions.slice(0, 3).map((action) => (
                  <p key={action.id}><strong>{action.title ?? action.indicatorName}:</strong> {action.action}</p>
                ))}
                <footer>
                  <span>{plan.generatedBy} · {plan.source === 'ia' ? `${plan.provider ?? 'IA'} ${plan.model ?? ''}` : 'Plantillas EBA'}</span>
                  <span>{formatDateTime(plan.createdAt)}</span>
                </footer>
              </article>
            </div>
          ) : (
            <>
              <p className="text-muted">
                Aún no se ha publicado un plan. Genera recomendaciones para los indicadores que requieren seguimiento.
              </p>
              {canEdit ? (
                <Button
                  icon={<Sparkles size={16} />}
                  onClick={() => void generateRecommendations()}
                  loading={planBusy}
                  disabled={
                    planBusy ||
                    evaluation.estado !== 'Finalizada' ||
                    !indicators.some((indicator) =>
                      indicator.aplicabilidad === 'aplica' && indicator.estado === 'Requiere seguimiento'
                    )
                  }
                >
                  Generar recomendaciones
                </Button>
              ) : null}
            </>
          )}
          <Link to={`/recomendaciones?evaluacion=${encodeURIComponent(id)}`} className="text-link text-link--arrow">
            {plan?.source === 'plantillas' ? 'Consultar o mejorar plan con IA' : 'Consultar plan de mejora'}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </section>
        <section className="card">
          <header className="card__header">
            <div><p className="eyebrow">Soportes</p><h2>Evidencias ({evidence.length})</h2></div>
            {canEdit && evaluation.estado === 'En proceso' ? (
              <Link to={`/evidencias?evaluacion=${encodeURIComponent(id)}`} className="button button--secondary button--sm">
                <Images size={15} aria-hidden="true" /> Ver todas
              </Link>
            ) : null}
          </header>
          {canEdit && evaluation.estado === 'En proceso' ? (
            <div className="api-liberty-browser__layout evidence-indicator-browser">
              <nav className="api-liberty-rail" aria-label="Indicadores para adjuntar fotos">
                {indicators.map((indicator) => {
                  const photoCount = evidence.filter(
                    (item) => item.indicatorId === indicator.id && item.mimeType.startsWith('image/')
                  ).length;
                  return (
                    <button
                      className={`api-liberty-rail__item ${evidenceIndicatorId === indicator.id ? 'api-liberty-rail__item--selected' : ''}`}
                      type="button"
                      key={indicator.id}
                      aria-pressed={evidenceIndicatorId === indicator.id}
                      onClick={() => {
                        setEvidenceIndicatorId(indicator.id);
                        setEvidenceFile(null);
                      }}
                    >
                      <span className="api-liberty-rail__text">{indicator.nombre}</span>
                      <Badge tone={photoCount ? 'success' : 'neutral'}>
                        {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                      </Badge>
                    </button>
                  );
                })}
              </nav>
              <div className="api-liberty-browser__content" aria-live="polite">
                {evidenceIndicatorId ? (
                  <>
                    <header className="api-liberty-browser__content-header">
                      <div>
                        <p className="eyebrow">Soporte fotográfico del indicador</p>
                        <h3>{indicators.find((item) => item.id === evidenceIndicatorId)?.nombre}</h3>
                      </div>
                    </header>
                    <form className="evidence-indicator-upload" onSubmit={uploadIndicatorPhoto}>
                      <FormField
                        id="evaluation-indicator-photo"
                        label="Seleccionar fotos"
                        hint="JPEG, PNG o WebP · máximo 5 MB por foto"
                        required
                      >
                        <TextInput
                          id="evaluation-indicator-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                          required
                        />
                      </FormField>
                      <Button
                        type="submit"
                        size="sm"
                        icon={<UploadCloud size={16} />}
                        loading={uploadingEvidence}
                        disabled={!evidenceFile || uploadingEvidence}
                      >
                        Asociar foto
                      </Button>
                    </form>
                    {evidence.some((item) =>
                      item.indicatorId === evidenceIndicatorId && item.mimeType.startsWith('image/')
                    ) ? (
                      <div className="evidence-indicator-photos">
                        {evidence
                          .filter((item) =>
                            item.indicatorId === evidenceIndicatorId && item.mimeType.startsWith('image/')
                          )
                          .map((item) => (
                            <a
                              className="evidence-indicator-photo"
                              href={apiUrl(`/evidence/${encodeURIComponent(item.id)}/content`)}
                              target="_blank"
                              rel="noreferrer"
                              key={item.id}
                            >
                              <img
                                src={apiUrl(`/evidence/${encodeURIComponent(item.id)}/content`)}
                                alt={item.nombre}
                                loading="lazy"
                                crossOrigin="use-credentials"
                              />
                              <span>{item.nombre}</span>
                            </a>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted">Este indicador todavía no tiene fotos asociadas.</p>
                    )}
                  </>
                ) : (
                  <Alert tone="info">Registra un indicador para asociarle fotos.</Alert>
                )}
              </div>
            </div>
          ) : null}
          {evidence.length ? (
            <div className="file-list">
              {evidence.map((item) => (
                <Link to={`/evidencias?evaluacion=${encodeURIComponent(id)}`} className="file-row" key={item.id}>
                  <span className="file-row__thumb">
                    {item.mimeType.startsWith('image/')
                      ? <img src={apiUrl(`/evidence/${encodeURIComponent(item.id)}/content`)} alt="" loading="lazy" crossOrigin="use-credentials" />
                      : <FileText size={20} aria-hidden="true" />}
                  </span>
                  <span className="file-row__text">
                    <strong>{item.nombre}</strong>
                    <small>{indicatorName(item.indicatorId)} · {formatBytes(item.size)}</small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : <p className="text-muted">Esta evaluación todavía no tiene evidencias cargadas.</p>}
        </section>
      </div>
      {evaluation.observaciones ? <section className="card"><h2>Observaciones generales</h2><p>{evaluation.observaciones}</p><small>Actualizado {formatDateTime(evaluation.updatedAt)}</small></section> : null}
    </div>
  );
}
