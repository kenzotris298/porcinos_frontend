export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
] as const;

export type AcceptedEvidenceType = (typeof ACCEPTED_EVIDENCE_TYPES)[number];

const EXTENSION_MAP: Record<string, AcceptedEvidenceType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf'
};

export interface EvidenceFileCheck {
  valid: boolean;
  error?: string;
  mediaType?: AcceptedEvidenceType;
}

export function detectMediaType(file: File): AcceptedEvidenceType | null {
  if (ACCEPTED_EVIDENCE_TYPES.includes(file.type as AcceptedEvidenceType)) {
    return file.type as AcceptedEvidenceType;
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MAP[extension] ?? null;
}

export function validateEvidenceFile(file: File): EvidenceFileCheck {
  if (file.size <= 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    return { valid: false, error: 'La evidencia debe pesar máximo 5 MB.' };
  }
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return { valid: false, error: 'Solo se admiten imágenes JPG, PNG, WebP o documentos PDF.' };
  }
  return { valid: true, mediaType };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer el archivo seleccionado.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

export function isImage(mediaType: string): boolean {
  return mediaType.startsWith('image/');
}

export function evidenceLabel(mediaType: string): string {
  const labels: Record<string, string> = {
    'image/jpeg': 'Imagen JPG',
    'image/png': 'Imagen PNG',
    'image/webp': 'Imagen WebP',
    'image/svg+xml': 'Ilustración',
    'application/pdf': 'Documento PDF'
  };
  return labels[mediaType] ?? mediaType;
}
