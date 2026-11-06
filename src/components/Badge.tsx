import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function Badge({
  tone = 'neutral',
  children,
  className = ''
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>;
}

export function statusTone(status?: string | null): BadgeTone {
  if (!status) return 'neutral';
  const normalized = status.toLowerCase();
  if (normalized.includes('final') || normalized === 'registrado') return 'success';
  if (normalized.includes('seguimiento')) return 'warning';
  if (normalized.includes('revisión') || normalized.includes('revision')) return 'info';
  if (normalized.includes('proceso')) return 'accent';
  return 'neutral';
}

export function scoreBadgeTone(score: number | null | undefined): BadgeTone {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}
