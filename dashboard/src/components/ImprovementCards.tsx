import type { ImprovementHint, SiteDashboard } from '../types/dashboard';

interface Props {
  sites: SiteDashboard[];
}

interface Row extends ImprovementHint {
  siteName: string;
  siteId: string;
  accent: string;
}

const priorityOrder: Record<ImprovementHint['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const priorityStyle: Record<ImprovementHint['priority'], string> = {
  high: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  low: 'bg-white/5 text-slate-400 ring-white/10',
};

const priorityLabel: Record<ImprovementHint['priority'], string> = {
  high: '優先度: 高',
  medium: '優先度: 中',
  low: '優先度: 低',
};

export function ImprovementCards({ sites }: Props) {
  const rows: Row[] = sites.flatMap((s) =>
    s.improvements.map((h) => ({
      ...h,
      siteName: s.site.name,
      siteId: s.site.id,
      accent: s.site.accent,
    })),
  );
  rows.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <section
      aria-label="改善候補カード"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">
          💡 改善候補
        </h2>
        <p className="text-xs text-slate-400">手動メモ + 将来の自動シグナル候補</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, idx) => (
          <li
            key={`${r.siteId}-${idx}`}
            className="flex flex-col gap-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/5 sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-medium ring-1 ring-white/10"
                style={{ color: r.accent }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: r.accent }}
                  aria-hidden
                />
                {r.siteName}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ring-inset ${priorityStyle[r.priority]}`}
              >
                {priorityLabel[r.priority]}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-50">{r.title}</div>
              {r.path ? (
                <div className="mt-0.5 truncate text-[0.7rem] text-slate-400">{r.path}</div>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{r.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
