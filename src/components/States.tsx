import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="state-panel state-panel--empty">
      <span className="state-panel__icon" aria-hidden="true">
        {icon ?? <Inbox size={30} />}
      </span>
      <h2 className="state-panel__title">{title}</h2>
      <p className="state-panel__description">{description}</p>
      {action ? <div className="state-panel__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'No se pudo cargar la información',
  message,
  onRetry
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <span className="state-panel__icon state-panel__icon--danger" aria-hidden="true">
        <AlertTriangle size={30} />
      </span>
      <h2 className="state-panel__title">{title}</h2>
      <p className="state-panel__description">{message}</p>
      {onRetry ? (
        <div className="state-panel__action">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
