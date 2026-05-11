import type { DeltaInfo } from '../lib/format';

interface Props {
  delta: DeltaInfo;
  /** 比較対象の説明 (例: 「前日比」) */
  label?: string;
  size?: 'sm' | 'md';
}

export function DeltaBadge({ delta, label, size = 'sm' }: Props) {
  const tone =
    delta.tone === 'up'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : delta.tone === 'down'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-ink-100 text-ink-500 ring-ink-200';
  const arrow = delta.tone === 'up' ? '▲' : delta.tone === 'down' ? '▼' : '—';
  const sizing = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-medium ${tone} ${sizing}`}
      aria-label={label ? `${label} ${delta.label}` : delta.label}
    >
      <span aria-hidden>{arrow}</span>
      <span>{delta.label}</span>
      {label ? <span className="text-[0.65rem] opacity-70">{label}</span> : null}
    </span>
  );
}
