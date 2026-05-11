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
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-ink-100 text-ink-500 ring-ink-200',
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
      className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-900 sm:text-lg">
          💡 改善候補
        </h2>
        <p className="text-xs text-ink-500">手動メモ + 将来の自動シグナル候補</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, idx) => (
          <li
            key={`${r.siteId}-${idx}`}
            className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3 sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[0.7rem] font-medium ring-1 ring-ink-200"
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
              <div className="text-sm font-semibold text-ink-900">{r.title}</div>
              {r.path ? (
                <div className="mt-0.5 truncate text-[0.7rem] text-ink-500">{r.path}</div>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-ink-700">{r.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
