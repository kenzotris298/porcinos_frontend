import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Gauge,
  Images,
  Plus,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, scoreBadgeTone, statusTone } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/States';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/PageHeader';
import { farmDepartmentName, farmMunicipalityName } from '../data/colombia';
import {
  getOperationalEmptyState,
  useLocalData
} from '../data/LocalDataProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { EvaluationForm } from '../features/evaluations/EvaluationForm';
import { allEvaluationInsights, lowestCriteria } from '../features/evaluations/results';
import { formatDate, formatNumber } from '../utils/format';
import { ApiDashboardPage } from './ApiEvaluationPages';

export function DashboardPage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiDashboardPage />;
  return <LocalDashboardPage />;
}

function LocalDashboardPage() {
  const {
    database,
    provenance,
    provenanceLoading,
    provenanceError,
    retryProvenance
  } = useLocalData();
  const { session } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const insights = useMemo(() => allEvaluationInsights(database), [database]);
  const completed = insights.filter((item) => item.score !== null);
  const average = completed.length
    ? completed.reduce((total, item) => total + (item.score ?? 0), 0) / completed.length
    : null;
  const pending = insights.reduce((total, item) => total + item.pendingCriteria.length, 0);
  const reference = completed[0] ?? insights[0] ?? null;
  const priorities = reference ? lowestCriteria(reference, 4) : [];
  const recentEvidence = [...database.evidence]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const canEdit = session?.role === 'evaluator';
  const firstName = session?.name.split(' ')[0] ?? '';
  const emptyState = getOperationalEmptyState(
    provenance?.evaluations,
    {
      title: 'Aún no hay evaluaciones',
      description: 'Registra la primera visita para comenzar a documentar indicadores, evidencias y recomendaciones.'
    },
    provenanceLoading,
    provenanceError
  );

  return (
    <div className="page stack">
      <section className="hero-card">
        <div className="hero-card__content">
          <span className="hero-card__eyebrow">
            <Sparkles size={15} aria-hidden="true" />
            {canEdit ? 'Panel del evaluador' : 'Panel del propietario'}
          </span>
          <h1>Hola, {firstName}</h1>
          <p>
            {canEdit
              ? insights.length
                ? `Tienes ${insights.length} evaluaciones registradas y ${pending} criterios por completar. Revisa los hallazgos priorizados y da seguimiento a los planes de mejora.`
                : 'Comienza registrando la primera evaluación para documentar indicadores, evidencias y recomendaciones del predio.'
              : insights.length
                ? `Consulta tus ${insights.length} evaluaciones, sus indicadores, evidencias y los planes de mejora publicados por el evaluador.`
                : 'Aún no hay evaluaciones asociadas a esta cuenta. Contacta al evaluador para vincular tu predio.'}
          </p>
          <div className="hero-card__actions">
            {canEdit ? (
              <Button icon={<Plus size={17} />} onClick={() => setFormOpen(true)}>
                Nueva evaluación
              </Button>
            ) : null}
            <Link
              to="/evaluaciones"
              className="button button--secondary button--md hero-card__link"
            >
              <span>Ver evaluaciones</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hero-card__score">
          <div
            className="score-ring"
            style={{
              background: `conic-gradient(#6fbc94 ${(average ?? 0) * 3.6}deg, rgba(255,255,255,0.16) 0deg)`
            }}
          >
            <div className="score-ring__inner">
              <strong>{average === null ? '—' : formatNumber(average)}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <p>Promedio global</p>
          <span>{completed.length} evaluaciones completas</span>
        </div>
        <div className="hero-card__decor" aria-hidden="true">
          <span className="hero-card__circle hero-card__circle--one" />
          <span className="hero-card__circle hero-card__circle--two" />
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          label="Evaluaciones"
          value={database.evaluations.length}
          hint={`${completed.length} con cálculo completo`}
          icon={<ClipboardList size={19} />}
        />
        <StatCard
          label="Criterios evaluados"
          value={insights.reduce((total, item) => total + item.evaluatedCriteria, 0)}
          hint={`${pending} pendientes en total`}
          icon={<Gauge size={19} />}
          tone="brand"
        />
        <StatCard
          label="Criterios pendientes"
          value={pending}
          hint={pending > 0 ? 'Requieren completarse' : 'Sin pendientes'}
          icon={<AlertTriangle size={19} />}
          tone={pending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Evidencias"
          value={database.evidence.length}
          hint="Archivos de soporte"
          icon={<Images size={19} />}
        />
      </div>

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
              <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
                Crear evaluación
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="dashboard-grid">
            <section className="card dashboard-grid__main">
              <header className="card__header">
                <div>
                  <p className="eyebrow">Actividad reciente</p>
                  <h2>Evaluaciones</h2>
                </div>
                <Link to="/evaluaciones" className="text-link">
                  Ver todas <ChevronRight size={15} aria-hidden="true" />
                </Link>
              </header>
              <div className="evaluation-list">
                {insights.slice(0, 4).map((item) => (
                  <Link
                    key={item.evaluation.id}
                    to={`/evaluaciones/${item.evaluation.id}`}
                    className="evaluation-row"
                  >
                    <span className="evaluation-row__date">
                      <strong>{new Date(`${item.evaluation.fecha}T00:00:00`).getDate()}</strong>
                      <small>
                        {new Date(`${item.evaluation.fecha}T00:00:00`)
                          .toLocaleDateString('es-CO', { month: 'short' })
                          .replace('.', '')}
                      </small>
                    </span>
                    <span className="evaluation-row__main">
                      <strong>{item.farm.nombre}</strong>
                      <small>
                        {farmMunicipalityName(item.farm)}, {farmDepartmentName(item.farm)} · {item.evaluation.evaluador}
                      </small>
                    </span>
                    <Badge tone={statusTone(item.evaluation.estado)}>
                      {item.evaluation.estado}
                    </Badge>
                    <Badge tone={scoreBadgeTone(item.score)}>
                      {item.score === null ? 'Sin puntaje' : `${formatNumber(item.score)} pts`}
                    </Badge>
                    <ChevronRight size={17} className="evaluation-row__chevron" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="card">
              <header className="card__header">
                <div>
                  <p className="eyebrow">Referencia</p>
                  <h2>Las cuatro libertades</h2>
                </div>
                <Link to="/metodologia" className="text-link">
                  Metodología
                </Link>
              </header>
              {reference ? (
                <>
                  <p className="card__subtitle">
                    {reference.farm.nombre} · {formatDate(reference.evaluation.fecha)}
                  </p>
                  <div className="liberty-list">
                    {reference.liberties.map((liberty) => (
                      <div className="liberty-item" key={liberty.id}>
                        <ProgressBar
                          label={`${liberty.nombre} (${liberty.peso}%)`}
                          value={liberty.puntuacion}
                        />
                      </div>
                    ))}
                  </div>
                  <Link
                    to={`/evaluaciones/${reference.evaluation.id}`}
                    className="text-link text-link--arrow"
                  >
                    Ver evaluación <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </>
              ) : null}
            </section>
          </div>

          <div className="dashboard-grid dashboard-grid--two">
            <section className="card">
              <header className="card__header">
                <div>
                  <p className="eyebrow">Prioridades</p>
                  <h2>Oportunidades de mejora</h2>
                </div>
                <TrendingUp size={20} className="card__header-icon" aria-hidden="true" />
              </header>
              {priorities.length ? (
                <>
                  <p className="card__subtitle">
                    Criterios con menor puntuación en {reference?.farm.nombre}.
                  </p>
                  <div className="priority-list">
                    {priorities.map((item) => (
                      <div className="priority-item" key={item.name}>
                        <div className="priority-item__top">
                          <span>{item.name}</span>
                          <Badge tone={scoreBadgeTone(item.score)}>{item.score} pts</Badge>
                        </div>
                        <ProgressBar value={item.score} hideValue />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted">No hay criterios con puntuación baja en la referencia actual.</p>
              )}
              <Link to="/recomendaciones" className="text-link text-link--arrow">
                Ver recomendaciones <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </section>

            <section className="card">
              <header className="card__header">
                <div>
                  <p className="eyebrow">Soportes</p>
                  <h2>Evidencias recientes</h2>
                </div>
                <Link to="/evidencias" className="text-link">
                  Ver todas
                </Link>
              </header>
              {recentEvidence.length ? (
                <div className="evidence-mini-list">
                  {recentEvidence.map((evidence) => {
                    const farm = database.evaluations
                      .filter((evaluation) => evaluation.id === evidence.evaluationId)
                      .map((evaluation) =>
                        database.farms.find((item) => item.id === evaluation.predioId)
                      )[0];
                    return (
                      <Link
                        to={`/evidencias?evaluacion=${evidence.evaluationId}`}
                        className="evidence-mini"
                        key={evidence.id}
                      >
                        <span className="evidence-mini__thumb">
                          {evidence.dataUrl && evidence.tipo.startsWith('image/') ? (
                            <img src={evidence.dataUrl} alt="" />
                          ) : (
                            <Images size={20} aria-hidden="true" />
                          )}
                        </span>
                        <span className="evidence-mini__text">
                          <strong>{evidence.nombre}</strong>
                          <small>
                            {farm?.nombre ?? 'Predio'} · {formatDate(evidence.createdAt)}
                          </small>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted">Todavía no hay evidencias cargadas.</p>
              )}
              <div className="card__footer-note">
                <CalendarDays size={15} aria-hidden="true" />
                <span>Los datos se conservan en este navegador.</span>
              </div>
            </section>
          </div>
        </>
      )}

      <EvaluationForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
