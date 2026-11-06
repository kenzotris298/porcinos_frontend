import { FileText } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import type { EvidenceRecord } from '../../types';
import { isImage } from '../../utils/file';
import { formatBytes, formatDateTime } from '../../utils/format';

export function EvidenceViewer({
  evidence,
  indicatorName,
  onClose
}: {
  evidence: EvidenceRecord | null;
  indicatorName: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(evidence)}
      title={evidence?.nombre ?? 'Evidencia'}
      description={evidence ? `${indicatorName} · ${formatDateTime(evidence.createdAt)}` : undefined}
      onClose={onClose}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {evidence ? (
        <div className="evidence-viewer">
          <div className="evidence-viewer__meta">
            <Badge tone="neutral">{formatBytes(evidence.tamano)}</Badge>
            <Badge tone="info">{evidence.tipo}</Badge>
            <span>Cargada por {evidence.uploadedBy}</span>
          </div>
          {evidence.dataUrl && isImage(evidence.tipo) ? (
            <figure className="evidence-viewer__figure">
              <img src={evidence.dataUrl} alt={`Evidencia ${evidence.nombre}`} />
            </figure>
          ) : evidence.dataUrl && evidence.tipo === 'application/pdf' ? (
            <iframe
              className="evidence-viewer__pdf"
              src={evidence.dataUrl}
              title={`Documento ${evidence.nombre}`}
            />
          ) : (
            <div className="evidence-viewer__placeholder">
              <FileText size={44} aria-hidden="true" />
              <h3>Archivo sin contenido adjunto</h3>
              <p>
                El registro conserva los metadatos del archivo, pero su contenido no está disponible
                para previsualización.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
