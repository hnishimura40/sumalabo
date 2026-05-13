import type { SiteDashboard } from '../types/dashboard';
import { calcDelta, formatNumber } from '../lib/format';
import { DeltaBadge } from './DeltaBadge';

interface Props {
  sites: SiteDashboard[];
}

export function SummaryCards({ sites }: Props) {
  const sum = (pick: (s: SiteDashboard) => number) =>
    sites.reduce((acc, s) => acc + pick(s), 0);

  const today = sum((s) => s.metrics.todayViews);
  const yesterday = sum((s) => s.metrics.yesterdayViews);
  const last7 = sum((s) => s.metrics.last7DaysViews);
  const last28 = sum((s) => s.metrics.last28DaysViews);
  const users = sum((s) => s.metrics.users);
  const sessions = sum((s) => s.metrics.sessions);
  const clicks = sum((s) => s.metrics.searchClicks);
  const impressions = sum((s) => s.metrics.searchImpressions);

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const dailyDelta = calcDelta(today, yesterday);
  const weekDelta = calcDelta(last7, (last28 - last7) / 3);

  const tiles: Array<{
    label: string;
    value: string;
    sub?: React.ReactNode;
  }> = [
    {
      label: '今日のPV (3サイト合計)',
      value: formatNumber(today),
      sub: <DeltaBadge delta={dailyDelta} label="前日比" />,
    },
    {
      label: '昨日のPV',
      value: formatNumber(yesterday),
    },
    {
      label: '直近7日PV',
      value: formatNumber(last7),
      sub: <DeltaBadge delta={weekDelta} label="前週比" />,
    },
    {
      label: '直近28日PV',
      value: formatNumber(last28),
    },
    {
      label: 'ユーザー / セッション',
      value: `${formatNumber(users)} / ${formatNumber(sessions)}`,
    },
    {
      label: '検索クリック / 表示 (CTR)',
      value: `${formatNumber(clicks)} / ${formatNumber(impressions)}`,
      sub: (
        <span className="text-xs text-slate-400">
          CTR <strong className="text-ink-50">{(ctr * 100).toFixed(2)}%</strong>
        </span>
      ),
    },
  ];

  return (
    <section aria-label="全体サマリー" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10"
        >
          <div className="text-[0.7rem] font-medium uppercase tracking-wider text-slate-400">
            {t.label}
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-ink-50 sm:text-3xl">
            {t.value}
          </div>
          {t.sub ? <div className="mt-2">{t.sub}</div> : null}
        </div>
      ))}
    </section>
  );
}
