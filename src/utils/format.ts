const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function parseDate(value: string): Date | null {
  if (!value) return null;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : value;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Sin registro';
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : value;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${numberFormatter.format(value)} / 100`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return numberFormatter.format(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${numberFormatter.format(value)} ${units[exponent]}`;
}

export function todayAsInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'BP';
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado.';
}

export function classificationFor(score: number | null): string | null {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= 90) return 'Excelente bienestar';
  if (score >= 75) return 'Alto bienestar';
  if (score >= 50) return 'Medio bienestar';
  return 'Bajo bienestar';
}
