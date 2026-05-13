import type { SiteDashboard } from '../types/dashboard';
import { formatNumber } from '../lib/format';

interface Props {
  sites: SiteDashboard[];
  /** 各サイトから上位N件 */
  limit?: number;
}

export function TopPagesTable({ sites, limit = 5 }: Props) {
  return (
    <section
      aria-label="人気ページランキング"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">人気ページ</h2>
        <p className="text-xs text-slate-400">直近28日 PV順</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => (
          <div key={s.site.id}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.site.accent }}
                aria-hidden
              />
              <h3 className="text-sm font-semibold text-slate-200">{s.site.name}</h3>
            </div>
            <ol className="space-y-1.5">
              {s.topPages.slice(0, limit).map((p, idx) => (
                <li
                  key={p.path}
                  className="flex items-baseline justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.7rem] font-bold text-slate-300 ring-1 ring-white/10">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-ink-50">
                        {p.title}
                      </span>
                    </div>
                    <div className="ml-7 truncate text-[0.7rem] text-slate-400">{p.path}</div>
                  </div>
                  <div className="shrink-0 tabular-nums text-sm font-bold text-ink-50">
                    {formatNumber(p.views)}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
