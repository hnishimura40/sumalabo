import { useMemo, useState } from 'react';
import type { ArticleMomentumEntry, ArticleMomentumStatus, SiteDashboard } from '../types/dashboard';
import { formatNumber } from '../lib/format';

/**
 * ArticleMomentum — 記事ごとの動性（旧 TopPagesTable / RisingPages を統合）。
 *   - サイト切替タブ
 *   - ソート切替: 前週比 / PV / 新着順
 *   - 状態バッジ: 急上昇=緑 / 下降=赤 / 新着=青 / 安定=グレー
 *   - 直近14日推移のスパークライン（素の SVG polyline・ライブラリ不使用）
 * 分類しきい値の正は scripts/fetch-dashboard-data.mjs の MOMENTUM 定数。
 */

type SortKey = 'delta' | 'pv' | 'new';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'delta', label: '前週比' },
  { key: 'pv', label: 'PV' },
  { key: 'new', label: '新着順' },
];

const STATUS_META: Record<
  ArticleMomentumStatus,
  { label: string; badgeClass: string; sparkColor: string }
> = {
  rising: {
    label: '急上昇',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    sparkColor: '#34d399',
  },
  falling: {
    label: '下降',
    badgeClass: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    sparkColor: '#fb7185',
  },
  new: {
    label: '新着',
    badgeClass: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    sparkColor: '#38bdf8',
  },
  stable: {
    label: '安定',
    badgeClass: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    sparkColor: '#94a3b8',
  },
};

/** 新着順ソートで使うステータス優先度（新着 → 急上昇 → 安定 → 下降） */
const NEW_SORT_ORDER: Record<ArticleMomentumStatus, number> = {
  new: 0,
  rising: 1,
  stable: 2,
  falling: 3,
};

function sortArticles(articles: ArticleMomentumEntry[], sortKey: SortKey): ArticleMomentumEntry[] {
  const arr = [...articles];
  if (sortKey === 'pv') {
    arr.sort((a, b) => b.pv7 - a.pv7);
  } else if (sortKey === 'new') {
    arr.sort((a, b) => NEW_SORT_ORDER[a.status] - NEW_SORT_ORDER[b.status] || b.pv7 - a.pv7);
  } else {
    // 前週比: 絶対値の大きい順（null = 新着は先頭にまとめる）
    arr.sort((a, b) => {
      if (a.deltaPct === null && b.deltaPct === null) return b.pv7 - a.pv7;
      if (a.deltaPct === null) return -1;
      if (b.deltaPct === null) return 1;
      return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
    });
  }
  return arr;
}

function formatDelta(entry: ArticleMomentumEntry): string {
  if (entry.deltaPct === null) return 'NEW';
  const sign = entry.deltaPct > 0 ? '+' : '';
  return `${sign}${entry.deltaPct.toFixed(1)}%`;
}

/** 素の SVG polyline スパークライン（14点・軽量） */
function Sparkline({ trend, color }: { trend: number[]; color: string }) {
  const W = 96;
  const H = 28;
  const PAD = 2;
  if (!trend.length) return <div style={{ width: W, height: H }} aria-hidden />;
  const max = Math.max(...trend, 1);
  const step = (W - PAD * 2) / Math.max(trend.length - 1, 1);
  const points = trend
    .map((v, i) => {
      const x = PAD + i * step;
      const y = H - PAD - (v / max) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0"
      role="img"
      aria-label="直近14日のPV推移"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  sites: SiteDashboard[];
}

export function ArticleMomentum({ sites }: Props) {
  const [activeSiteId, setActiveSiteId] = useState(sites[0]?.site.id ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('delta');

  const activeSite = sites.find((s) => s.site.id === activeSiteId) ?? sites[0];
  const articles = useMemo(
    () => sortArticles(activeSite?.articles ?? [], sortKey),
    [activeSite, sortKey],
  );

  return (
    <section
      aria-label="記事ごとの動性"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink-50 sm:text-lg">📈 記事ごとの動性</h2>
          <p className="text-xs text-slate-400">直近7日 vs その前7日 · スパークラインは14日推移</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-ink-900/70 p-0.5 ring-1 ring-white/10" role="tablist" aria-label="並び替え">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={sortKey === opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition ${
                sortKey === opt.key
                  ? 'bg-ink-700 text-ink-50 ring-1 ring-white/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="サイト切替">
        {sites.map((s) => (
          <button
            key={s.site.id}
            type="button"
            role="tab"
            aria-selected={s.site.id === activeSite?.site.id}
            onClick={() => setActiveSiteId(s.site.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
              s.site.id === activeSite?.site.id
                ? 'bg-ink-700 text-ink-50 ring-white/20'
                : 'bg-ink-900/60 text-slate-400 ring-white/10 hover:text-slate-200'
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: s.site.accent }}
              aria-hidden
            />
            {s.site.name}
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="rounded-lg bg-ink-900/60 p-4 text-center text-sm text-slate-500 ring-1 ring-white/5">
          記事データ未取得（次回の自動更新で反映されます）
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {articles.map((a) => {
            const meta = STATUS_META[a.status];
            return (
              <li key={a.path} className="flex items-center gap-3 py-2">
                <span
                  className={`inline-flex w-14 shrink-0 justify-center rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold ring-1 ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={`${activeSite.site.url.replace(/\/$/, '')}${a.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={a.title}
                    className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-200 hover:text-ink-50 hover:underline"
                  >
                    {a.title}
                  </a>
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.65rem] text-slate-500">
                    {a.path}
                  </p>
                </div>
                <Sparkline trend={a.trend} color={meta.sparkColor} />
                <div className="w-16 shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink-50">{formatNumber(a.pv7)}</p>
                  <p
                    className={`text-[0.65rem] font-medium tabular-nums ${
                      a.deltaPct === null
                        ? 'text-sky-300'
                        : a.deltaPct > 0
                          ? 'text-emerald-300'
                          : a.deltaPct < 0
                            ? 'text-rose-300'
                            : 'text-slate-400'
                    }`}
                  >
                    {formatDelta(a)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
