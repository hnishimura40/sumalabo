import type { SiteDashboard } from '../types/dashboard';
import { calcDelta, effectiveSearchSource, formatNumber, formatPercent } from '../lib/format';
import { DeltaBadge } from './DeltaBadge';

interface Props {
  sites: SiteDashboard[];
}

/**
 * 育成ステータスパネル (Phase 3B)。
 * 行=サイト、列=「検索」「Discover」「内部流入」の 3 指標で、
 * 各サイトが検索エンジン側でどの成長段階にいるかを一目で見る。
 *   - 検索:     SC clicks の直近28日合計 + 前28日比の矢印 (DeltaBadge 再利用)
 *   - Discover: 掲載中=緑バッジ / 未掲載=グレー / SC未接続=薄字
 *   - 内部流入: internalNavShare (自サイト リファラー PV の割合) を % 表示
 */
export function GrowthStatus({ sites }: Props) {
  return (
    <section
      aria-label="育成ステータス"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">🌱 育成ステータス</h2>
        <p className="text-xs text-slate-400">検索 / Discover / 内部流入 (直近28日)</p>
      </header>
      <ul className="grid gap-3 lg:grid-cols-3">
        {sites.map((s) => (
          <SiteRow key={s.site.id} site={s} />
        ))}
      </ul>
    </section>
  );
}

function SiteRow({ site }: { site: SiteDashboard }) {
  const searchSource = effectiveSearchSource(site);

  return (
    <li className="rounded-xl bg-white/5 p-3 ring-1 ring-white/5 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: site.site.accent }}
          aria-hidden
        />
        <h3 className="text-sm font-semibold text-slate-200">{site.site.name}</h3>
        {searchSource === 'sample' ? (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-amber-300 ring-1 ring-amber-500/30">
            sample
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SearchCell site={site} searchSource={searchSource} />
        <DiscoverCell site={site} />
        <InternalNavCell site={site} />
      </div>
    </li>
  );
}

function CellShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-800/60 px-2.5 py-2 ring-1 ring-white/5">
      <div className="text-[0.62rem] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function SearchCell({
  site,
  searchSource,
}: {
  site: SiteDashboard;
  searchSource: 'sc' | 'sample' | 'none';
}) {
  if (searchSource === 'none') {
    return (
      <CellShell label="検索クリック">
        <span className="text-xs text-slate-500">未接続</span>
      </CellShell>
    );
  }
  const trend = site.searchTrend;
  const clicks = trend ? trend.clicks28d : site.metrics.searchClicks;
  return (
    <CellShell label="検索クリック">
      <div className="text-base font-bold tabular-nums text-ink-50">{formatNumber(clicks)}</div>
      {trend ? (
        <div className="mt-0.5">
          <DeltaBadge delta={calcDelta(trend.clicks28d, trend.clicksPrev28d)} label="前期比" />
        </div>
      ) : null}
    </CellShell>
  );
}

function DiscoverCell({ site }: { site: SiteDashboard }) {
  const d = site.discover;
  // listed: true=掲載中(緑) / false=未掲載(グレー) / null or 未定義=SC未接続(薄字)
  if (!d || d.listed === null) {
    return (
      <CellShell label="Discover">
        <span className="text-xs text-slate-500">未接続</span>
      </CellShell>
    );
  }
  if (d.listed) {
    return (
      <CellShell label="Discover">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
          掲載中
        </span>
        <div className="mt-1 text-[0.65rem] tabular-nums text-slate-400">
          表示 {formatNumber(d.impressions28d)}
        </div>
      </CellShell>
    );
  }
  return (
    <CellShell label="Discover">
      <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[0.7rem] font-medium text-slate-400 ring-1 ring-white/10">
        未掲載
      </span>
    </CellShell>
  );
}

function InternalNavCell({ site }: { site: SiteDashboard }) {
  const share = site.internalNavShare;
  return (
    <CellShell label="内部流入">
      {share != null ? (
        <div className="text-base font-bold tabular-nums text-ink-50">
          {formatPercent(share, 1)}
        </div>
      ) : (
        <span className="text-xs text-slate-500">—</span>
      )}
    </CellShell>
  );
}
