import { AlertCircle, CheckCircle2, Info, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
  actions
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="alert__icon" aria-hidden="true" size={20} />
      <div className="alert__content">
        {title ? <p className="alert__title">{title}</p> : null}
        <div className="alert__body">{children}</div>
        {actions ? <div className="alert__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="disclaimer">
      <ShieldAlert aria-hidden="true" size={18} />
      <p>{children}</p>
    </div>
  );
}
