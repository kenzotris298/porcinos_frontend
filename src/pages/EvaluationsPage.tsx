import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, scoreBadgeTone, statusTone } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { ConfirmDialog } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useToast } from '../components/ToastProvider';
import { farmDepartmentName, farmMunicipalityName } from '../data/colombia';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { EvaluationForm } from '../features/evaluations/EvaluationForm';
import { allEvaluationInsights } from '../features/evaluations/results';
import type { Evaluation } from '../types';
import { formatDate, formatNumber, formatScore } from '../utils/format';
import { ApiEvaluationsPage } from './ApiEvaluationPages';

export function EvaluationsPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiEvaluationsPage />;
  return <LocalEvaluationsPage />;
}

function LocalEvaluationsPage() {
  const {
    database,
    deleteEvaluation,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { session } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const latest = [...database.evaluations].sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.hora.localeCompare(a.hora)
    )[0];
    const date = latest ? new Date(`${latest.fecha}T00:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [deleting, setDeleting] = useState<Evaluation | null>(null);
  const canEdit = session?.role === 'evaluator';

  const insights = useMemo(() => allEvaluationInsights(database), [database]);
  const emptyState = getOperationalEmptyState(
    provenance?.evaluations,
    {
      title: 'No hay evaluaciones registradas',
      description: 'Crea la primera evaluación para comenzar a registrar criterios, evidencias y recomendaciones.'
    },
    provenanceLoading,
    provenanceError
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return insights.filter((item) => {
      const matchesStatus = !status || item.evaluation.estado === status;
      const matchesFarm = !farmFilter || item.evaluation.predioId === farmFilter;
      const matchesDate = !dateFilter || item.evaluation.fecha === dateFilter;
      const ownerCedula = canEdit
        ? database.personas.find((person) => person.id === item.farm.personaId)?.cedula ?? ''
        : '';
      const matchesTerm =
        !term ||
        item.farm.nombre.toLowerCase().includes(term) ||
        farmMunicipalityName(item.farm).toLowerCase().includes(term) ||
        ownerCedula.includes(term) ||
        item.evaluation.evaluador.toLowerCase().includes(term) ||
        item.evaluation.id.toLowerCase().includes(term) ||
        item.evaluation.investigadorApellidos.toLowerCase().includes(term);
      return matchesStatus && matchesFarm && matchesDate && matchesTerm;
    });
  }, [insights, search, status, farmFilter, dateFilter, database.personas, canEdit]);

  const recent = [...insights].sort(
    (a, b) =>
      b.evaluation.fecha.localeCompare(a.evaluation.fecha) ||
      b.evaluation.hora.localeCompare(a.evaluation.hora)
  )[0];
  const activityDates = new Set(insights.map((item) => item.evaluation.fecha));
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
    ? insights.filter((item) => item.evaluation.fecha === dateFilter)
    : [];
  const monthLabel = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric'
  }).format(calendarMonth);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(evaluation: Evaluation) {
    setEditing(evaluation);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    try {
      deleteEvaluation(deleting.id);
      notify('Evaluación eliminada junto con sus indicadores y evidencias.', 'info');
      setDeleting(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar la evaluación.', 'warning');
    }
  }

  const hasActiveFilters = Boolean(search || status || farmFilter || dateFilter);

  function dateValue(day: number): string {
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    return `${calendarMonth.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Gestión de campo"
        title={canEdit ? 'Evaluaciones' : 'Mis evaluaciones'}
        description={
          canEdit
            ? 'Consulta las visitas registradas, su avance y el resultado operativo de cada predio.'
            : 'Consulta las visitas, indicadores y resultados de tus predios vinculados.'
        }
        actions={
          canEdit ? (
            <Button icon={<Plus size={17} />} onClick={openCreate}>
              Nueva evaluación
            </Button>
          ) : (
            <Badge tone="info">Perfil de solo consulta</Badge>
          )
        }
      />

      <section className="filters-bar" aria-label="Filtros de evaluaciones">
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <TextInput
            type="search"
            placeholder={
              canEdit
                ? 'Buscar por predio, cédula, municipio o evaluador…'
                : 'Buscar por predio, municipio o fecha…'
            }
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
          <SlidersHorizontal size={16} aria-hidden="true" />
          <select
            className="input input--select"
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
            onChange={(event) => setFarmFilter(event.target.value)}
          >
            <option value="">Todos los predios</option>
            {database.farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.nombre}
              </option>
            ))}
          </select>
        </div>
        <span className="filters-bar__count">
          {filtered.length} de {insights.length}
        </span>
      </section>

      {insights.length > 0 ? (
        <section className="card recent-activity">
          <header className="card__header">
            <div>
              <p className="eyebrow">Actividad reciente</p>
              <h2>{recent ? 'Última evaluación registrada' : 'Sin actividad reciente'}</h2>
            </div>
            <CalendarDays size={20} className="card__header-icon" aria-hidden="true" />
          </header>
          <div className="recent-activity__layout">
            <div className="recent-activity__latest">
              {recent ? (
                <>
                  <p className="recent-activity__date">{formatDate(recent.evaluation.fecha)}</p>
                  <h3>{recent.farm.nombre}</h3>
                  <p>
                    {recent.evaluation.hora} · {recent.evaluation.evaluador}
                  </p>
                  <div className="recent-activity__badges">
                    <Badge tone={statusTone(recent.evaluation.estado)}>
                      {recent.evaluation.estado}
                    </Badge>
                    <Badge tone={scoreBadgeTone(recent.score)}>
                      {recent.score === null ? 'Sin puntaje' : `${formatNumber(recent.score)} pts`}
                    </Badge>
                  </div>
                  <Link
                    className="text-link text-link--arrow"
                    to={`/evaluaciones/${recent.evaluation.id}`}
                  >
                    Abrir evaluación <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <p className="text-muted">Todavía no hay evaluaciones registradas.</p>
              )}
            </div>
            <div className="activity-calendar">
              <div className="activity-calendar__header">
                <strong>{monthLabel}</strong>
                <div>
                  <button
                    type="button"
                    className="icon-button icon-button--sm"
                    aria-label="Mes anterior"
                    onClick={() =>
                      setCalendarMonth(
                        (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1)
                      )
                    }
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--sm"
                    aria-label="Mes siguiente"
                    onClick={() =>
                      setCalendarMonth(
                        (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1)
                      )
                    }
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <div className="activity-calendar__grid" role="grid" aria-label="Actividad mensual">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                  <span className="activity-calendar__weekday" key={`${day}-${index}`}>
                    {day}
                  </span>
                ))}
                {calendarDays.map((day, index) =>
                  day === null ? (
                    <span className="activity-calendar__blank" key={`blank-${index}`} />
                  ) : (
                    <button
                      type="button"
                      key={day}
                      className={`activity-calendar__day ${
                        activityDates.has(dateValue(day)) ? 'has-activity' : ''
                      } ${dateFilter === dateValue(day) ? 'is-selected' : ''}`}
                      aria-label={`${day} ${monthLabel}${
                        activityDates.has(dateValue(day)) ? ', con evaluaciones' : ', sin evaluaciones'
                      }`}
                      aria-pressed={dateFilter === dateValue(day)}
                      onClick={() =>
                        setDateFilter((current) =>
                          current === dateValue(day) ? '' : dateValue(day)
                        )
                      }
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
              <p className="activity-calendar__legend">
                <span aria-hidden="true" /> Día con evaluaciones
              </p>
              {dateFilter ? (
                <p className="activity-calendar__result" aria-live="polite">
                  {selectedDateEvaluations.length
                    ? `${selectedDateEvaluations.length} evaluación(es) el ${formatDate(dateFilter)}. El historial está filtrado por esta fecha.`
                    : `No hay evaluaciones el ${formatDate(dateFilter)}. El historial está filtrado por esta fecha.`}
                </p>
              ) : (
                <p className="activity-calendar__result">
                  Selecciona un día para consultar si hubo actividad.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="evaluation-history">
        <header className="evaluation-history__header">
          <div>
            <p className="eyebrow">Historial</p>
            <h2>Evaluaciones registradas</h2>
          </div>
          <Badge tone="neutral">{filtered.length} registros</Badge>
        </header>

      {insights.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={30} />}
          title={emptyState.title}
          description={emptyState.description}
          action={
            provenanceError ? (
              <Button variant="secondary" onClick={() => void retryProvenance()}>
                Reintentar
              </Button>
            ) : canEdit ? (
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                Crear evaluación
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={30} />}
          title="Sin resultados"
          description="No encontramos evaluaciones que coincidan con los filtros seleccionados."
          action={
            hasActiveFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setFarmFilter('');
                  setDateFilter('');
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="evaluation-grid">
          {filtered.map((item) => (
            <article className="evaluation-card" key={item.evaluation.id}>
              <div className="evaluation-card__top">
                <Badge tone={statusTone(item.evaluation.estado)}>{item.evaluation.estado}</Badge>
                <span className="evaluation-card__code">{item.evaluation.id}</span>
              </div>

              <Link
                to={`/evaluaciones/${item.evaluation.id}`}
                className="evaluation-card__body"
                aria-label={`Abrir evaluación de ${item.farm.nombre}`}
              >
                <div className="evaluation-card__heading">
                  <div>
                    <h2>{item.farm.nombre}</h2>
                    <p>
                      <MapPin size={14} aria-hidden="true" />
                      {farmMunicipalityName(item.farm)}, {farmDepartmentName(item.farm)}
                    </p>
                  </div>
                  <div className={`score-tile score-tile--${scoreBadgeTone(item.score)}`}>
                    <strong>{item.score === null ? '—' : formatNumber(item.score)}</strong>
                    <small>{item.score === null ? 'sin puntaje' : 'de 100'}</small>
                  </div>
                </div>

                <div className="evaluation-card__meta">
                  <span>
                    <CalendarDays size={15} aria-hidden="true" />
                    {formatDate(item.evaluation.fecha)} · {item.evaluation.hora}
                  </span>
                  <span>
                    <UserRound size={15} aria-hidden="true" />
                    {item.evaluation.evaluador}
                  </span>
                </div>

                <div className="evaluation-card__stats">
                  <span>
                    <strong>{item.evaluatedCriteria}</strong> / 43 criterios
                  </span>
                  <span>
                    <strong>{item.pendingCriteria.length}</strong> pendientes
                  </span>
                  <span>
                    <strong>{item.evidenceCount}</strong> evidencias
                  </span>
                </div>

                <div className="evaluation-card__footer">
                  <span>
                    {item.score === null
                      ? 'Evaluación incompleta'
                      : `${formatScore(item.score)} · ${item.classification}`}
                  </span>
                  <span className="text-link">
                    Abrir <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>

              {canEdit ? (
                <div className="evaluation-card__actions">
                  <button
                    type="button"
                    className="icon-button icon-button--sm"
                    aria-label={`Editar evaluación de ${item.farm.nombre}`}
                    onClick={() => openEdit(item.evaluation)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--sm icon-button--danger"
                    aria-label={`Eliminar evaluación de ${item.farm.nombre}`}
                    onClick={() => setDeleting(item.evaluation)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      </section>

      <EvaluationForm
        open={formOpen}
        evaluation={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(record) => {
          if (!editing) navigate(`/evaluaciones/${record.id}`);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar evaluación"
        message="Se eliminarán también los indicadores, evidencias y recomendaciones asociados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar evaluación"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
