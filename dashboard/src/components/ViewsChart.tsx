import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SiteDashboard } from '../types/dashboard';
import { formatNumber, formatShortDate } from '../lib/format';

interface Props {
  sites: SiteDashboard[];
}

interface MergedPoint {
  date: string;
  [siteId: string]: number | string;
}

export function ViewsChart({ sites }: Props) {
  // 日付をユニオンしてマージ
  const dateSet = new Set<string>();
  sites.forEach((s) => s.dailyViews.forEach((p) => dateSet.add(p.date)));
  const dates = Array.from(dateSet).sort();

  const data: MergedPoint[] = dates.map((date) => {
    const row: MergedPoint = { date };
    sites.forEach((s) => {
      const point = s.dailyViews.find((p) => p.date === date);
      row[s.site.id] = point?.views ?? 0;
    });
    return row;
  });

  return (
    <section
      aria-label="PV推移グラフ"
      className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-900 sm:text-lg">
          PV推移 (直近28日)
        </h2>
        <p className="text-xs text-ink-500">日次 / サイト別</p>
      </div>
      <div className="h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {sites.map((s) => (
                <linearGradient key={s.site.id} id={`grad-${s.site.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.site.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.site.accent} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: '#5a6478', fontSize: 11 }}
              axisLine={{ stroke: '#dbdfe9' }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: '#5a6478', fontSize: 11 }}
              axisLine={{ stroke: '#dbdfe9' }}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #dbdfe9',
                fontSize: 12,
              }}
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value: number, name) => {
                const site = sites.find((s) => s.site.id === name);
                return [formatNumber(value), site?.site.name ?? name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => sites.find((s) => s.site.id === value)?.site.name ?? value}
            />
            {sites.map((s) => (
              <Area
                key={s.site.id}
                type="monotone"
                dataKey={s.site.id}
                stroke={s.site.accent}
                strokeWidth={2}
                fill={`url(#grad-${s.site.id})`}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
