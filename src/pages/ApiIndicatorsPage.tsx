import { ClipboardList, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { CRITERIA } from '../features/indicators/catalog';
import { formatDate } from '../utils/format';

interface ApiEvaluation {
  id: string;
  farmId: string;
  farmName?: string;
  fecha: string;
  estado: string;
}

interface ApiFarm {
  id: string;
  nombre: string;
}

interface ApiIndicator {
  id: string;
  evaluationId: string;
  criterionId: string;
  nombre: string;
  tipo: string;
  resultado: string;
  estado: string;
  aplicabilidad: string;
  puntaje: number;
  observaciones: string;
}

export function ApiIndicatorsPage() {
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [evaluationId, setEvaluationId] = useState('');
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      apiRequest<{ items: ApiEvaluation[] }>('/evaluations'),
      apiRequest<{ items: ApiFarm[] }>('/farms')
    ])
      .then(([evaluationResponse, farmResponse]) => {
        if (!active) return;
        setEvaluations(evaluationResponse.items);
        setFarms(farmResponse.items);
        setEvaluationId(evaluationResponse.items[0]?.id ?? '');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evaluaciones.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retryToken]);

  useEffect(() => {
    if (!evaluationId) {
      setIndicators([]);
      setIndicatorsLoading(false);
      return;
    }
    let active = true;
    setIndicatorsLoading(true);
    setError('');
    apiRequest<{ items: ApiIndicator[] }>(`/indicators?evaluationId=${encodeURIComponent(evaluationId)}`)
      .then((response) => { if (active) setIndicators(response.items); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los indicadores.');
      })
      .finally(() => { if (active) setIndicatorsLoading(false); });
    return () => { active = false; };
  }, [evaluationId, retryToken]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return indicators.filter((item) =>
      !term || item.nombre.toLocaleLowerCase('es-CO').includes(term) ||
      item.resultado.toLocaleLowerCase('es-CO').includes(term) ||
      item.observaciones.toLocaleLowerCase('es-CO').includes(term)
    );
  }, [indicators, search]);
  const selected = evaluations.find((item) => item.id === evaluationId);
  const missingCount = Math.max(0, CRITERIA.length - indicators.length);

  return (
    <div className="page stack">
      <PageHeader eyebrow="Catálogo de criterios" title="Indicadores" description="Indicadores registrados en el backend para las evaluaciones dentro de tu alcance." />
      {error ? (
        <Alert tone="danger" actions={<Button variant="secondary" size="sm" onClick={() => setRetryToken((value) => value + 1)}>Reintentar</Button>}>
          {error}
        </Alert>
      ) : null}
      <section className="filters-bar">
        <label className="filters-bar__select">
          <span>Evaluación</span>
          <select className="input input--select" value={evaluationId} onChange={(event) => setEvaluationId(event.target.value)}>
            {evaluations.map((evaluation) => <option key={evaluation.id} value={evaluation.id}>{farms.find((farm) => farm.id === evaluation.farmId)?.nombre ?? evaluation.farmName ?? 'Predio'} · {formatDate(evaluation.fecha)}</option>)}
          </select>
        </label>
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <TextInput type="search" aria-label="Buscar indicadores" placeholder="Buscar criterio o resultado…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </section>
      <div className="stats-grid">
        <StatCard label="Indicadores registrados" value={indicators.length} hint="En la evaluación seleccionada" icon={<ClipboardList size={19} />} />
        <StatCard label="Criterios pendientes" value={missingCount} hint="Sin registro en esta evaluación" icon={<ClipboardList size={19} />} tone={missingCount ? 'warning' : 'default'} />
        <StatCard label="Requieren seguimiento" value={indicators.filter((item) => item.estado === 'Requiere seguimiento').length} hint="Según registro del evaluador" icon={<ClipboardList size={19} />} />
      </div>
      <section className="card">
        <header className="card__header">
          <div><p className="eyebrow">{selected ? formatDate(selected.fecha) : 'Evaluación'}</p><h2>{farms.find((farm) => farm.id === selected?.farmId)?.nombre ?? selected?.farmName ?? 'Indicadores de la evaluación'}</h2></div>
          {evaluationId ? <Link to={`/evaluaciones/${evaluationId}`} className="text-link">Abrir evaluación</Link> : null}
        </header>
        {loading || indicatorsLoading ? <div className="state-panel" role="status">Cargando indicadores…</div> : !evaluations.length ? (
          <EmptyState icon={<ClipboardList size={30} />} title="No hay evaluaciones" description="Los indicadores se consultan dentro de una evaluación." />
        ) : indicators.length ? filtered.length ? <div className="saved-list">{filtered.map((item) => (
            <article className="saved-card" key={item.id}>
              <div className="saved-card__header"><div><Badge tone={item.estado === 'Registrado' ? 'success' : 'warning'}>{item.estado}</Badge><h3>{item.nombre}</h3></div></div>
              <p><strong>Puntaje:</strong> {item.aplicabilidad === 'no-aplica' ? 'No aplica · 0' : item.puntaje}</p>
              <p><strong>Resultado:</strong> {item.resultado}</p>
              {item.observaciones ? <p><strong>Observaciones:</strong> {item.observaciones}</p> : null}
            </article>
          ))}</div> : <EmptyState icon={<Search size={28} />} title="Sin resultados" description="No hay indicadores que coincidan con la búsqueda." /> : (
          <EmptyState icon={<ClipboardList size={30} />} title="Aún no hay indicadores" description="Abre la evaluación seleccionada para registrar criterios." action={<Link className="button button--primary button--md" to={`/evaluaciones/${evaluationId}`}>Abrir evaluación</Link>} />
        )}
      </section>
    </div>
  );
}
