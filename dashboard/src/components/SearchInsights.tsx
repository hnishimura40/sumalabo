import type { SiteDashboard } from '../types/dashboard';
import {
  effectiveSearchSource,
  formatNumber,
  formatPercent,
  formatPosition,
} from '../lib/format';

interface Props {
  sites: SiteDashboard[];
  limit?: number;
}

/** サイトごとの検索データ出所バッジ (live / sample / 未接続) */
function SourceChip({ source }: { source: 'sc' | 'sample' | 'none' }) {
  if (source === 'sc') {
    return (
      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
        live
      </span>
    );
  }
  if (source === 'sample') {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-300 ring-1 ring-amber-500/30">
        sample
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[0.6rem] font-medium text-slate-400 ring-1 ring-white/10">
      未接続
    </span>
  );
}

export function SearchInsights({ sites, limit = 4 }: Props) {
  const sources = sites.map(effectiveSearchSource);
  const headerNote = sources.every((s) => s === 'sc')
    ? 'Search Console (live)'
    : sources.every((s) => s === 'none')
      ? 'Search Console 未接続'
      : 'Search Console';

  return (
    <section
      aria-label="検索流入インサイト"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">
          🔎 検索流入インサイト
        </h2>
        <p className="text-xs text-slate-400">{headerNote}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {sites.map((s) => {
          const source = effectiveSearchSource(s);
          return (
            <div key={s.site.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/5 sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.site.accent }}
                    aria-hidden
                  />
                  <h3 className="text-sm font-semibold text-slate-200">{s.site.name}</h3>
                  <SourceChip source={source} />
                </div>
                {source !== 'none' ? (
                  <div className="text-[0.7rem] tabular-nums text-slate-400">
                    CTR {formatPercent(s.metrics.searchCtr, 2)} · 平均{' '}
                    {formatPosition(s.metrics.averagePosition)}位
                  </div>
                ) : null}
              </div>
              {source === 'none' || s.topQueries.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500">
                  {source === 'none'
                    ? 'Search Console 未接続 (sites.list でプロパティ未解決)'
                    : 'クエリデータなし'}
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[0.65rem] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-1 pr-2 font-medium">クエリ</th>
                      <th className="py-1 pr-2 text-right font-medium">クリック</th>
                      <th className="py-1 pr-2 text-right font-medium">表示</th>
                      <th className="py-1 text-right font-medium">順位</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {s.topQueries.slice(0, limit).map((q) => (
                      <tr key={q.query}>
                        <td className="py-1.5 pr-2 font-medium text-ink-50">{q.query}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-slate-200">
                          {formatNumber(q.clicks)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-slate-400">
                          {formatNumber(q.impressions)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-slate-400">
                          {formatPosition(q.position)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
