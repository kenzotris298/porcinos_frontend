import { ChevronLeft, Eye, FileText, Folder, FolderOpen, Images, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useAuth } from '../features/auth/AuthProvider';
import { formatBytes, formatDate, formatDateTime, formatNumber } from '../utils/format';

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
  nombre: string;
}

interface ApiEvidence {
  id: string;
  evaluationId: string;
  indicatorId: string;
  nombre: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

type EvidenceTypeFilter = 'todos' | 'imagen' | 'pdf';

export function ApiEvidencePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = session?.role === 'evaluator';
  const [evaluations, setEvaluations] = useState<ApiEvaluation[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [evaluationId, setEvaluationId] = useState(searchParams.get('evaluacion') ?? '');
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [evidence, setEvidence] = useState<ApiEvidence[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EvidenceTypeFilter>('todos');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const selectedEvaluation = evaluations.find((item) => item.id === evaluationId);
  const selectedEvidence = useMemo(
    () => evidence.filter((item) => item.evaluationId === evaluationId),
    [evidence, evaluationId]
  );

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [evaluationResponse, farmResponse, evidenceResponse] = await Promise.all([
        apiRequest<{ items: ApiEvaluation[] }>('/evaluations'),
        apiRequest<{ items: ApiFarm[] }>('/farms'),
        apiRequest<{ items: ApiEvidence[] }>('/evidence')
      ]);
      setEvaluations(evaluationResponse.items);
      setFarms(farmResponse.items);
      setEvidence(evidenceResponse.items);
      setEvaluationId((current) =>
        evaluationResponse.items.some((item) => item.id === current)
          ? current
          : ''
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evaluaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEvaluations(); }, [loadEvaluations]);

  const loadDetails = useCallback(async () => {
    if (!evaluationId || !evaluations.some((item) => item.id === evaluationId)) {
      setIndicators([]);
      setDetailsLoading(false);
      return;
    }
    setDetailsLoading(true);
    setError('');
    try {
      const indicatorResponse = await apiRequest<{ items: ApiIndicator[] }>(
        `/indicators?evaluationId=${encodeURIComponent(evaluationId)}`
      );
      setIndicators(indicatorResponse.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evidencias.');
    } finally {
      setDetailsLoading(false);
    }
  }, [evaluationId, evaluations]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);

  const visibleEvidence = evaluationId ? selectedEvidence : evidence;
  const images = visibleEvidence.filter((item) => item.mimeType.startsWith('image/')).length;
  const documents = visibleEvidence.filter((item) => item.mimeType === 'application/pdf').length;
  const totalSize = visibleEvidence.reduce((total, item) => total + item.size, 0);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return selectedEvidence.filter((item) => {
      const indicatorName = indicators.find((indicator) => indicator.id === item.indicatorId)?.nombre ?? '';
      const matchesType =
        typeFilter === 'todos' ||
        (typeFilter === 'imagen' && item.mimeType.startsWith('image/')) ||
        (typeFilter === 'pdf' && item.mimeType === 'application/pdf');
      const matchesSearch =
        !term ||
        item.nombre.toLocaleLowerCase('es-CO').includes(term) ||
        indicatorName.toLocaleLowerCase('es-CO').includes(term);
      return matchesType && matchesSearch;
    });
  }, [selectedEvidence, indicators, search, typeFilter]);
  const filteredEvaluations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return evaluations.filter((item) => {
      const farmName = farms.find((farm) => farm.id === item.farmId)?.nombre ?? item.farmName ?? 'Predio';
      return !term || farmName.toLocaleLowerCase('es-CO').includes(term) || formatDate(item.fecha).toLocaleLowerCase('es-CO').includes(term);
    });
  }, [evaluations, farms, search]);
  const hasFilters = Boolean(search || typeFilter !== 'todos');
  const retry = async () => {
    await Promise.all([loadEvaluations(), loadDetails()]);
  };
  const openFolder = (id: string) => {
    setEvaluationId(id);
    setSearch('');
    setTypeFilter('todos');
    setSearchParams({ evaluacion: id });
  };
  const closeFolder = () => {
    setEvaluationId('');
    setIndicators([]);
    setSearch('');
    setTypeFilter('todos');
    setSearchParams({});
  };

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Soportes de la evaluación"
        title="Evidencias"
        description="Fotografías y documentos que respaldan los hallazgos registrados en cada indicador."
        actions={<Badge tone="info">Vista de consulta</Badge>}
      />
      {error ? (
        <Alert
          tone="danger"
          actions={<Button variant="secondary" size="sm" onClick={() => void retry()}>Reintentar</Button>}
        >
          {error}
        </Alert>
      ) : null}
      <div className="mini-stats">
        <span><Images size={17} aria-hidden="true" /><strong>{formatNumber(visibleEvidence.length)}</strong> archivos</span>
        <span><strong>{images}</strong> imágenes</span>
        <span><FileText size={17} aria-hidden="true" /><strong>{documents}</strong> documentos</span>
        <span><strong>{formatBytes(totalSize)}</strong> en total</span>
      </div>
      <section aria-label="Evidencias registradas">
        {loading || detailsLoading ? <div className="state-panel" role="status">Cargando evidencias…</div> : evaluationId ? (
          <div className="evidence-explorer">
            <header className="evidence-explorer__header">
              <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} onClick={closeFolder}>
                Todas las carpetas
              </Button>
              <div>
                <p className="eyebrow">Carpeta de evaluación</p>
                <h2>{farms.find((farm) => farm.id === selectedEvaluation?.farmId)?.nombre ?? selectedEvaluation?.farmName ?? 'Predio'}</h2>
                <p className="text-muted">{formatDate(selectedEvaluation?.fecha ?? '')}</p>
              </div>
            </header>
            <section className="filters-bar" aria-label="Filtros de evidencias">
              <div className="search-box">
                <Search size={17} aria-hidden="true" />
                <TextInput
                  type="search"
                  aria-label="Buscar evidencias"
                  placeholder="Buscar por archivo o indicador…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <label className="filters-bar__select">
                <span className="visually-hidden">Filtrar por tipo de archivo</span>
                <select
                  className="input input--select"
                  aria-label="Filtrar por tipo de archivo"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as EvidenceTypeFilter)}
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="imagen">Imágenes</option>
                  <option value="pdf">Documentos PDF</option>
                </select>
              </label>
              <span className="filters-bar__count">{filtered.length} de {selectedEvidence.length}</span>
            </section>
            {!selectedEvidence.length ? (
              <EmptyState
                icon={<Images size={30} />}
                title="No hay evidencias registradas"
                description="Carga un archivo asociado a un indicador de esta evaluación."
                action={canEdit && selectedEvaluation?.estado === 'En proceso' && indicators.length
                  ? <Button onClick={() => navigate(`/evaluaciones/${encodeURIComponent(evaluationId)}`)}>Cargar evidencia</Button>
                  : undefined}
              />
            ) : !filtered.length ? (
              <EmptyState
                icon={<Search size={30} />}
                title="Sin resultados"
                description="No encontramos evidencias que coincidan con los filtros seleccionados."
                action={hasFilters ? <Button variant="secondary" onClick={() => { setSearch(''); setTypeFilter('todos'); }}>Limpiar filtros</Button> : undefined}
              />
            ) : (
              <div className="evidence-grid">
                {filtered.map((item) => (
                  <article className="evidence-card" key={item.id}>
                    <a
                      className="evidence-card__preview"
                      href={`/api/v1/evidence/${encodeURIComponent(item.id)}/content`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver evidencia ${item.nombre}`}
                    >
                      {item.mimeType.startsWith('image/') ? (
                        <img src={`/api/v1/evidence/${encodeURIComponent(item.id)}/content`} alt="" />
                      ) : (
                        <span className="evidence-card__placeholder"><FileText size={36} aria-hidden="true" /><small>PDF</small></span>
                      )}
                      <span className="evidence-card__overlay"><Eye size={18} aria-hidden="true" /> Ver</span>
                    </a>
                    <div className="evidence-card__body">
                      <div className="evidence-card__top">
                        <Badge tone={item.mimeType.startsWith('image/') ? 'info' : 'neutral'}>
                          {item.mimeType === 'application/pdf' ? 'PDF' : item.mimeType.split('/')[1]?.toUpperCase() ?? 'Archivo'}
                        </Badge>
                        <span>{formatBytes(item.size)}</span>
                      </div>
                      <h2 title={item.nombre}>{item.nombre}</h2>
                      <p>{indicators.find((indicator) => indicator.id === item.indicatorId)?.nombre ?? 'Indicador'}</p>
                      <p className="evidence-card__evaluation">{formatDateTime(item.createdAt)}</p>
                      <div className="evidence-card__footer">
                        <span>{item.uploadedBy}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : !evaluations.length ? (
          <EmptyState
            icon={<Images size={30} />}
            title="No hay evidencias registradas"
            description="No hay evaluaciones disponibles para consultar."
          />
        ) : (
          <>
            <div className="search-box evidence-explorer__search">
              <Search size={17} aria-hidden="true" />
              <TextInput
                type="search"
                aria-label="Buscar carpetas"
                placeholder="Buscar por predio o fecha…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="evidence-folder-grid">
              {filteredEvaluations.map((item) => {
                const farmName = farms.find((farm) => farm.id === item.farmId)?.nombre ?? item.farmName ?? 'Predio';
                const folderEvidenceCount = evidence.filter((entry) => entry.evaluationId === item.id).length;
                return (
                  <button
                    className={`evidence-folder${folderEvidenceCount ? ' evidence-folder--filled' : ' evidence-folder--empty'}`}
                    key={item.id}
                    type="button"
                    onClick={() => openFolder(item.id)}
                    aria-label={`Abrir carpeta ${farmName}, ${folderEvidenceCount} evidencias`}
                  >
                    <span className="evidence-folder__art" aria-hidden="true">
                      {folderEvidenceCount > 0 ? (
                        <span className="evidence-folder__papers">
                          <FileText size={28} />
                          {folderEvidenceCount > 1 ? <FileText size={28} /> : null}
                        </span>
                      ) : null}
                      {folderEvidenceCount ? <FolderOpen size={58} /> : <Folder size={58} />}
                      <span className="evidence-folder__count">{folderEvidenceCount} {folderEvidenceCount === 1 ? 'archivo' : 'archivos'}</span>
                    </span>
                    <span className="evidence-folder__name">{farmName}</span>
                    <span className="evidence-folder__date">Evaluación · {formatDate(item.fecha)}</span>
                  </button>
                );
              })}
            </div>
            {!filteredEvaluations.length ? (
              <EmptyState icon={<Search size={30} />} title="Sin resultados" description="No encontramos carpetas que coincidan con la búsqueda." />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
