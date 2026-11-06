import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <Loader2 className="icon icon--spin state-panel__icon" aria-hidden="true" size={28} />
      <p>{label}</p>
    </div>
  );
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="page-loading">
      <LoadingState label={label ?? 'Cargando el módulo…'} />
    </div>
  );
}
