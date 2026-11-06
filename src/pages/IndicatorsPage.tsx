import {
  ClipboardList,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../components/Alert';
import { Badge, scoreBadgeTone } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader, StatCard } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import {
  CRITERIA,
  LIBERTIES,
  findCriterion
} from '../features/indicators/catalog';
import { IndicatorForm } from '../features/indicators/IndicatorForm';
import { IndicatorList } from '../features/indicators/IndicatorList';
import { LIBERTY_ADJUSTMENT_CRITERION_ID } from '../features/indicators/rubrics';
import type { IndicatorRecord, IndicatorStatus } from '../types';
import { formatDate, formatNumber } from '../utils/format';
import { ApiIndicatorsPage } from './ApiIndicatorsPage';

const STATUSES: IndicatorStatus[] = ['Registrado', 'Pendiente de revisión', 'Requiere seguimiento'];

export function IndicatorsPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiIndicatorsPage />;
  return <LocalIndicatorsPage />;
}

function LocalIndicatorsPage() {
  const {
    database,
    deleteIndicator,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [evaluationFilter, setEvaluationFilter] = useState('');
  const [libertyFilter, setLibertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IndicatorRecord | null>(null);
  const [deleting, setDeleting] = useState<IndicatorRecord | null>(null);
  const canEdit = session?.role === 'evaluator';

  const farmName = (farmId: string) =>
    database.farms.find((farm) => farm.id === farmId)?.nombre ?? 'Predio';

  const evaluationLabel = (indicator: IndicatorRecord) => {
    const evaluation = database.evaluations.find((item) => item.id === indicator.evalId);
    if (!evaluation) return indicator.evalId;
    return `${farmName(evaluation.predioId)} · ${formatDate(evaluation.fecha)}`;
  };

  const indicators = useMemo(
    () =>
      [...database.indicators].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [database.indicators]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return indicators.filter((indicator) => {
      const criterion = findCriterion(indicator.metricaCatalogoId);
      const matchesEvaluation = !evaluationFilter || indicator.evalId === evaluationFilter;
      const matchesLiberty = !libertyFilter || criterion?.libertadId === libertyFilter;
      const matchesStatus = !statusFilter || indicator.estado === statusFilter;
      const label = evaluationLabel(indicator).toLowerCase();
      const matchesTerm =
        !term ||
        indicator.nombre.toLowerCase().includes(term) ||
        indicator.resultado.toLowerCase().includes(term) ||
        label.includes(term) ||
        indicator.evalId.toLowerCase().includes(term);
      return matchesEvaluation && matchesLiberty && matchesStatus && matchesTerm;
    });
    // evaluationLabel se reconstruye con el estado actual de la base de datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators, evaluationFilter, libertyFilter, statusFilter, search, database.evaluations, database.farms]);

  const scored = indicators.filter(
    (indicator) =>
      indicator.aplicabilidad === 'aplica' &&
      indicator.estado !== 'Pendiente de revisión' &&
      indicator.metricaCatalogoId !== LIBERTY_ADJUSTMENT_CRITERION_ID &&
      typeof indicator.puntaje === 'number'
  );
  const average = scored.length
    ? scored.reduce((total, indicator) => total + (indicator.puntaje ?? 0), 0) / scored.length
    : null;
  const following = indicators.filter(
    (indicator) =>
      indicator.estado === 'Requiere seguimiento' ||
      (indicator.aplicabilidad === 'aplica' &&
        typeof indicator.puntaje === 'number' &&
        (indicator.metricaCatalogoId === LIBERTY_ADJUSTMENT_CRITERION_ID
          ? indicator.puntaje < 0
          : indicator.puntaje < 60))
  );
  const notApplicable = indicators.filter(
    (indicator) => indicator.aplicabilidad === 'no-aplica'
  );

  const hasFilters = Boolean(search || evaluationFilter || libertyFilter || statusFilter);
  const evaluationsEmptyState = getOperationalEmptyState(
    provenance?.evaluations,
    {
      title: 'Aún no hay evaluaciones',
      description: 'Los indicadores se asocian a una evaluación. Crea primero una evaluación desde el módulo de evaluaciones para comenzar a registrar criterios.'
    },
    provenanceLoading,
    provenanceError
  );
  const indicatorsEmptyState = getOperationalEmptyState(
    provenance?.indicators,
    {
      title: 'No hay indicadores registrados',
      description: 'Registra el primer criterio evaluado para documentar el estado de bienestar del predio.'
    },
    provenanceLoading,
    provenanceError
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(indicator: IndicatorRecord) {
    setEditing(indicator);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    try {
      deleteIndicator(deleting.id);
      notify('Indicador eliminado junto con sus evidencias.', 'info');
      setDeleting(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar el indicador.', 'warning');
    }
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Catálogo de criterios"
        title={canEdit ? 'Indicadores' : 'Mis indicadores'}
        description={
          canEdit
            ? `${CRITERIA.length} criterios de bienestar distribuidos en cuatro libertades. Registra hallazgos y puntuaciones por evaluación.`
            : 'Consulta los indicadores registrados en las evaluaciones de tus predios.'
        }
        actions={
          canEdit ? (
            <Button
              icon={<Plus size={17} />}
              onClick={openCreate}
              disabled={database.evaluations.length === 0}
            >
              Nuevo indicador
            </Button>
          ) : (
            <Badge tone="info">Perfil de solo consulta</Badge>
          )
        }
      />

      {database.evaluations.length === 0 && !provenanceError ? (
        <Alert tone="info" title={evaluationsEmptyState.title}>
          {evaluationsEmptyState.description}
        </Alert>
      ) : null}

      <div className="stats-grid">
        <StatCard
          label="Indicadores registrados"
          value={indicators.length}
          hint={`${scored.length} con puntaje válido`}
          icon={<ListChecks size={19} />}
          tone="brand"
        />
        <StatCard
          label="Promedio de puntajes"
          value={average === null ? '—' : formatNumber(average)}
          hint="Sobre indicadores aplicables"
          icon={<ShieldCheck size={19} />}
        />
        <StatCard
          label="Requieren seguimiento"
          value={following.length}
          hint="Puntajes bajos o alertas"
          icon={<TriangleAlert size={19} />}
          tone={following.length ? 'warning' : 'default'}
        />
        <StatCard
          label="No aplican"
          value={notApplicable.length}
          hint="Excluidos de la ponderación"
          icon={<ClipboardList size={19} />}
        />
      </div>

      <section className="filters-bar" aria-label="Filtros de indicadores">
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <TextInput
            type="search"
            placeholder="Buscar por criterio, resultado o evaluación…"
            aria-label="Buscar indicadores"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filters-bar__select">
          <ClipboardList size={16} aria-hidden="true" />
          <select
            className="input input--select"
            aria-label="Filtrar por evaluación"
            value={evaluationFilter}
            onChange={(event) => setEvaluationFilter(event.target.value)}
          >
            <option value="">Todas las evaluaciones</option>
            {database.evaluations.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>
                {farmName(evaluation.predioId)} · {formatDate(evaluation.fecha)}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-bar__select">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <select
            className="input input--select"
            aria-label="Filtrar por libertad"
            value={libertyFilter}
            onChange={(event) => setLibertyFilter(event.target.value)}
          >
            <option value="">Todas las libertades</option>
            {LIBERTIES.map((liberty) => (
              <option key={liberty.id} value={liberty.id}>
                {liberty.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-bar__select">
          <select
            className="input input--select"
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <span className="filters-bar__count">
          {filtered.length} de {indicators.length}
        </span>
      </section>

      {indicators.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={30} />}
          title={indicatorsEmptyState.title}
          description={indicatorsEmptyState.description}
          action={
            provenanceError ? (
              <Button variant="secondary" onClick={() => void retryProvenance()}>
                Reintentar
              </Button>
            ) : canEdit && database.evaluations.length ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Registrar indicador
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={30} />}
          title="Sin resultados"
          description="No encontramos indicadores que coincidan con los filtros seleccionados."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setEvaluationFilter('');
                  setLibertyFilter('');
                  setStatusFilter('');
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section className="card">
          <header className="card__header">
            <div>
              <p className="eyebrow">Registros</p>
              <h2>Indicadores evaluados</h2>
            </div>
            <Badge tone={scoreBadgeTone(average)}>
              {average === null ? 'Sin promedio' : `Promedio ${formatNumber(average)}`}
            </Badge>
          </header>
          <IndicatorList
            items={filtered}
            canEdit={canEdit}
            onEdit={openEdit}
            onDelete={setDeleting}
            getEvaluationLabel={evaluationLabel}
          />
        </section>
      )}

      <IndicatorForm
        open={formOpen}
        indicator={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar indicador"
        message="Se eliminará el indicador y sus evidencias asociadas. El resultado de la evaluación se recalculará."
        confirmLabel="Eliminar indicador"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
