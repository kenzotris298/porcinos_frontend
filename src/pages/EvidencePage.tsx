import { ChevronLeft, Eye, FileText, Folder, FolderOpen, Images, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TextInput } from '../components/FormField';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { EvidenceViewer } from '../features/evidence/EvidenceViewer';
import { useAuth } from '../features/auth/AuthProvider';
import { useLocalData } from '../data/LocalDataProvider';
import type { EvidenceRecord } from '../types';
import { evidenceLabel, isImage } from '../utils/file';
import { formatBytes, formatDate, formatDateTime, formatNumber } from '../utils/format';
import { ApiEvidencePage } from './ApiEvidencePage';

type TypeFilter = 'todos' | 'imagen' | 'pdf';

export function EvidencePage() {
  const { session } = useAuth();
  if (session?.backend) return <ApiEvidencePage />;
  return <LocalEvidencePage />;
}

function LocalEvidencePage() {
  const { database } = useLocalData();
  const { session } = useAuth();
  const canEdit = session?.role === 'evaluator';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const evaluationId = searchParams.get('evaluacion') ?? '';
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EvidenceRecord | null>(null);
  const selectedEvaluation = database.evaluations.find((item) => item.id === evaluationId);
  const selectedEvidence = useMemo(
    () => database.evidence.filter((item) => item.evaluationId === evaluationId),
    [database.evidence, evaluationId]
  );
  const visibleEvidence = selectedEvaluation ? selectedEvidence : database.evidence;
  const images = visibleEvidence.filter((item) => isImage(item.tipo)).length;
  const documents = visibleEvidence.filter((item) => item.tipo === 'application/pdf').length;
  const totalSize = visibleEvidence.reduce((total, item) => total + item.tamano, 0);
  const filteredEvidence = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return selectedEvidence.filter((item) => {
      const indicatorName = database.indicators.find((indicator) => indicator.id === item.indicadorId)?.nombre ?? '';
      const matchesType =
        typeFilter === 'todos' ||
        (typeFilter === 'imagen' && isImage(item.tipo)) ||
        (typeFilter === 'pdf' && item.tipo === 'application/pdf');
      const matchesSearch =
        !term ||
        item.nombre.toLocaleLowerCase('es-CO').includes(term) ||
        indicatorName.toLocaleLowerCase('es-CO').includes(term);
      return matchesType && matchesSearch;
    });
  }, [database.evidence, database.indicators, selectedEvidence, search, typeFilter]);
  const filteredEvaluations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    return database.evaluations.filter((evaluation) => {
      const farm = database.farms.find((item) => item.id === evaluation.predioId);
      const farmName = farm?.nombre ?? 'Predio';
      return !term ||
        farmName.toLocaleLowerCase('es-CO').includes(term) ||
        formatDate(evaluation.fecha).toLocaleLowerCase('es-CO').includes(term);
    });
  }, [database.evaluations, database.farms, search]);

  function openFolder(id: string) {
    setTypeFilter('todos');
    setSearch('');
    setSearchParams({ evaluacion: id });
  }

  function closeFolder() {
    setTypeFilter('todos');
    setSearch('');
    setSearchParams({});
  }

  return (
    <div className="page stack">
      <PageHeader
        eyebrow="Soportes de la evaluación"
        title="Evidencias"
        description="Fotografías y documentos que respaldan los hallazgos registrados en cada indicador."
        actions={<Badge tone="info">Vista de consulta</Badge>}
      />
      <div className="mini-stats">
        <span><Images size={17} aria-hidden="true" /><strong>{formatNumber(visibleEvidence.length)}</strong> archivos</span>
        <span><strong>{images}</strong> imágenes</span>
        <span><FileText size={17} aria-hidden="true" /><strong>{documents}</strong> documentos</span>
        <span><strong>{formatBytes(totalSize)}</strong> en total</span>
      </div>
      <section aria-label="Evidencias registradas">
        {selectedEvaluation ? (
          <div className="evidence-explorer">
            <header className="evidence-explorer__header">
              <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} onClick={closeFolder}>
                Todas las carpetas
              </Button>
              <div>
                <p className="eyebrow">Carpeta de evaluación</p>
                <h2>{database.farms.find((farm) => farm.id === selectedEvaluation.predioId)?.nombre ?? 'Predio'}</h2>
                <p className="text-muted">{formatDate(selectedEvaluation.fecha)}</p>
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
                  onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="imagen">Imágenes</option>
                  <option value="pdf">Documentos PDF</option>
                </select>
              </label>
              <span className="filters-bar__count">{filteredEvidence.length} de {selectedEvidence.length}</span>
            </section>
            {!selectedEvidence.length ? (
              <EmptyState
                icon={<Images size={30} />}
                title="No hay evidencias registradas"
                description="Carga un archivo asociado a un indicador de esta evaluación."
                action={canEdit
                  ? <Button onClick={() => navigate(`/evaluaciones/${encodeURIComponent(selectedEvaluation.id)}`)}>Cargar evidencia</Button>
                  : undefined}
              />
            ) : !filteredEvidence.length ? (
              <EmptyState
                icon={<Search size={30} />}
                title="Sin resultados"
                description="No encontramos evidencias que coincidan con los filtros seleccionados."
                action={<Button variant="secondary" onClick={() => { setSearch(''); setTypeFilter('todos'); }}>Limpiar filtros</Button>}
              />
            ) : (
              <div className="evidence-grid">
                {filteredEvidence.map((item) => (
                  <article className="evidence-card" key={item.id}>
                    <button
                      type="button"
                      className="evidence-card__preview"
                      onClick={() => setSelected(item)}
                      aria-label={`Ver evidencia ${item.nombre}`}
                    >
                      {item.dataUrl && isImage(item.tipo) ? (
                        <img src={item.dataUrl} alt="" />
                      ) : (
                        <span className="evidence-card__placeholder">
                          <FileText size={36} aria-hidden="true" />
                          <small>{evidenceLabel(item.tipo)}</small>
                        </span>
                      )}
                      <span className="evidence-card__overlay"><Eye size={18} aria-hidden="true" /> Ver</span>
                    </button>
                    <div className="evidence-card__body">
                      <div className="evidence-card__top">
                        <Badge tone={isImage(item.tipo) ? 'info' : 'neutral'}>{evidenceLabel(item.tipo)}</Badge>
                        <span>{formatBytes(item.tamano)}</span>
                      </div>
                      <h2 title={item.nombre}>{item.nombre}</h2>
                      <p>{database.indicators.find((indicator) => indicator.id === item.indicadorId)?.nombre ?? 'Indicador'}</p>
                      <p className="evidence-card__evaluation">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : !database.evaluations.length ? (
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
              {filteredEvaluations.map((evaluation) => {
                const farmName = database.farms.find((farm) => farm.id === evaluation.predioId)?.nombre ?? 'Predio';
                const count = database.evidence.filter((item) => item.evaluationId === evaluation.id).length;
                return (
                  <button
                    className={`evidence-folder${count ? ' evidence-folder--filled' : ' evidence-folder--empty'}`}
                    key={evaluation.id}
                    type="button"
                    onClick={() => openFolder(evaluation.id)}
                    aria-label={`Abrir carpeta ${farmName}, ${count} evidencias`}
                  >
                    <span className="evidence-folder__art" aria-hidden="true">
                      {count ? (
                        <span className="evidence-folder__papers">
                          <FileText size={28} />
                          {count > 1 ? <FileText size={28} /> : null}
                        </span>
                      ) : null}
                      {count ? <FolderOpen size={58} /> : <Folder size={58} />}
                      <span className="evidence-folder__count">{count} {count === 1 ? 'archivo' : 'archivos'}</span>
                    </span>
                    <span className="evidence-folder__name">{farmName}</span>
                    <span className="evidence-folder__date">Evaluación · {formatDate(evaluation.fecha)}</span>
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
      <EvidenceViewer
        evidence={selected}
        indicatorName={selected
          ? database.indicators.find((item) => item.id === selected.indicadorId)?.nombre ?? 'Indicador'
          : ''}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
