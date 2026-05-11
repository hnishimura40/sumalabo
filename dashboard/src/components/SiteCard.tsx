import type { SiteDashboard } from '../types/dashboard';
import { calcDelta, formatNumber, formatPercent, formatPosition } from '../lib/format';
import { DeltaBadge } from './DeltaBadge';

interface Props {
  site: SiteDashboard;
}

export function SiteCard({ site }: Props) {
  const { metrics } = site;
  const dailyDelta = calcDelta(metrics.todayViews, metrics.yesterdayViews);
  const weeklyBaseline = (metrics.last28DaysViews - metrics.last7DaysViews) / 3;
  const weeklyDelta = calcDelta(metrics.last7DaysViews, weeklyBaseline);

  return (
    <article
      className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-100"
      style={{ borderTop: `4px solid ${site.site.accent}` }}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: site.site.accent }}
              aria-hidden
            />
            <h3 className="truncate text-lg font-bold text-ink-900">{site.site.name}</h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">
            {site.site.category}
            {site.site.url ? (
              <>
                {' '}·{' '}
                <a
                  href={site.site.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-ink-200 hover:decoration-ink-500"
                >
                  サイトを開く
                </a>
              </>
            ) : (
              <span className="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-[0.65rem] text-ink-500">
                URL未設定
              </span>
            )}
          </p>
        </div>
        <DeltaBadge delta={dailyDelta} label="前日比" size="md" />
      </header>

      <div className="grid grid-cols-2 gap-px bg-ink-100">
        <Stat label="今日のPV" value={formatNumber(metrics.todayViews)} accent />
        <Stat label="昨日のPV" value={formatNumber(metrics.yesterdayViews)} />
        <Stat
          label="直近7日"
          value={formatNumber(metrics.last7DaysViews)}
          badge={<DeltaBadge delta={weeklyDelta} label="前週比" />}
        />
        <Stat label="直近28日" value={formatNumber(metrics.last28DaysViews)} />
        <Stat label="ユーザー" value={formatNumber(metrics.users)} />
        <Stat label="セッション" value={formatNumber(metrics.sessions)} />
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 text-xs sm:p-5">
        <SearchStat label="検索クリック" value={formatNumber(metrics.searchClicks)} />
        <SearchStat label="検索表示" value={formatNumber(metrics.searchImpressions)} />
        <SearchStat label="CTR" value={formatPercent(metrics.searchCtr, 2)} />
        <SearchStat label="平均掲載順位" value={formatPosition(metrics.averagePosition)} />
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  accent,
  badge,
}: {
  label: string;
  value: string;
  accent?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white p-3 sm:p-4">
      <div className="text-[0.65rem] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div
        className={`mt-0.5 tabular-nums font-bold ${
          accent ? 'text-2xl text-ink-900 sm:text-3xl' : 'text-xl text-ink-900'
        }`}
      >
        {value}
      </div>
      {badge ? <div className="mt-1">{badge}</div> : null}
    </div>
  );
}

function SearchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2">
      <div className="text-[0.65rem] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-ink-900">{value}</div>
    </div>
  );
}
