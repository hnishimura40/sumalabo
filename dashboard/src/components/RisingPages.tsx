import type { SiteDashboard } from '../types/dashboard';
import { formatNumber } from '../lib/format';

interface Props {
  sites: SiteDashboard[];
  limit?: number;
}

interface RisingRow {
  siteName: string;
  siteId: string;
  accent: string;
  path: string;
  title: string;
  views: number;
  delta: number;
}

export function RisingPages({ sites, limit = 8 }: Props) {
  const rows: RisingRow[] = sites.flatMap((s) =>
    s.risingPages.map((p) => ({
      siteName: s.site.name,
      siteId: s.site.id,
      accent: s.site.accent,
      path: p.path,
      title: p.title,
      views: p.views,
      delta: p.delta ?? 0,
    })),
  );
  rows.sort((a, b) => b.delta - a.delta);

  return (
    <section
      aria-label="急上昇記事ランキング"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">
          🚀 急上昇記事
        </h2>
        <p className="text-xs text-slate-400">伸び率順 (全サイト横断)</p>
      </header>
      <ol className="space-y-2">
        {rows.slice(0, limit).map((r, idx) => (
          <li
            key={`${r.siteId}-${r.path}`}
            className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/5"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-200 ring-1 ring-white/10">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink-50">{r.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-slate-400">
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 font-medium ring-1 ring-white/10"
                    style={{ color: r.accent }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: r.accent }}
                      aria-hidden
                    />
                    {r.siteName}
                  </span>
                  <span className="truncate">{r.path}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold tabular-nums text-emerald-300">
                +{(r.delta * 100).toFixed(0)}%
              </div>
              <div className="text-[0.7rem] tabular-nums text-slate-400">
                {formatNumber(r.views)} PV
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
