export function ProgressBar({
  value,
  max = 100,
  label,
  tone,
  hideValue = false
}: {
  value: number | null | undefined;
  max?: number;
  label?: string;
  tone?: 'success' | 'warning' | 'danger' | 'accent';
  hideValue?: boolean;
}) {
  const safeMax = max > 0 ? max : 100;
  const percent =
    value === null || value === undefined || !Number.isFinite(value)
      ? 0
      : Math.min(100, Math.max(0, (value / safeMax) * 100));
  const resolvedTone = tone ?? (percent >= 75 ? 'success' : percent >= 50 ? 'warning' : 'danger');

  return (
    <div className="progress">
      {label ? (
        <div className="progress__header">
          <span>{label}</span>
          {!hideValue ? (
            <span>{value === null || value === undefined ? 'Sin puntaje' : `${Math.round(percent)}%`}</span>
          ) : null}
        </div>
      ) : null}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={value ?? 0}
        aria-label={label ?? 'Avance'}
      >
        <span className={`progress__bar progress__bar--${resolvedTone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
