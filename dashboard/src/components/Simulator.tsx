import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  SimulatorBreakdownRow,
  SimulatorEventStat,
  SimulatorStats,
  SimulatorWindow,
} from '../types/dashboard';
import { formatNumber, formatPercent, formatShortDate } from '../lib/format';

interface Props {
  simulator?: SimulatorStats | null;
}

/**
 * イベント名の日本語表示。並び順もこの順。
 * 対応はシミュレーター本体 (baseball-sim) README の v3.23 一覧と
 * web/index.html・modes.js・myteam.js の simTrack 呼び出しから決めた。
 */
const EVENT_LABELS: Array<[string, string]> = [
  ['sim_game', '試合を見る'],
  ['sim_manager', '監督モード'],
  ['sim_season', 'シーズン'],
  ['sim_matchup', '対戦'],
  ['sim_order', '打順ラボ'],
  ['sim_pennant_start', 'ペナント開幕'],
  ['sim_pennant_play', 'ペナント進行'],
  ['sim_myteam_play', 'マイチーム'],
  ['sim_secret', '隠し要素'],
  ['sim_tab', 'タブ切替'],
];
const EVENT_LABEL = new Map(EVENT_LABELS);

/** sim_pennant_play の how */
const HOW_LABEL: Record<string, string> = {
  one: '1試合進める',
  n10: '10試合進める',
  end: '最後まで進める',
  watch: '試合を見る',
  manager: '監督モード',
};

/** sim_tab の tab (シミュレーターのタブ名) */
const TAB_LABEL: Record<string, string> = {
  game: '1試合観戦',
  matchup: '対戦シミュレーション',
  season: 'シーズン再現',
  order: '打順ラボ',
  pennant: 'ペナント',
  zukan: '選手名鑑',
};

const PARAM_TITLE: Record<string, string> = {
  season: '年度別',
  how: 'ペナントの進め方',
  tab: '切り替えたタブ',
};

const OPEN_COLOR = '#94a3b8';
const PLAY_COLOR = '#f1b81d';

function rate(w: SimulatorWindow): string {
  return w.playRate === null ? '—' : formatPercent(w.playRate, 1);
}

function WindowCard({ title, w }: { title: string; w: SimulatorWindow }) {
  const items: Array<[string, string, string]> = [
    ['開いた人', formatNumber(w.openUsers), `表示 ${formatNumber(w.openViews)}回`],
    ['遊んだ人', formatNumber(w.playUsers), `操作 ${formatNumber(w.playEvents)}回`],
    ['遊んだ人の割合', rate(w), '遊んだ人 ÷ 開いた人'],
  ];
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/5 sm:p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-200">{title}</h3>
      <dl className="grid grid-cols-3 gap-2">
        {items.map(([label, value, sub]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.7rem] text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums text-ink-50 sm:text-2xl">{value}</dd>
            <dd className="text-[0.65rem] text-slate-500">{sub}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function eventRows(d7: SimulatorEventStat[], d28: SimulatorEventStat[]) {
  const known = EVENT_LABELS.map(([name]) => name);
  const extra = [...new Set([...d28, ...d7].map((e) => e.name))].filter((n) => !EVENT_LABEL.has(n));
  return [...known, ...extra].map((name) => ({
    name,
    label: EVENT_LABEL.get(name) ?? name,
    d7: d7.find((e) => e.name === name),
    d28: d28.find((e) => e.name === name),
  }));
}

function valueLabel(param: string, value: string): string {
  if (param === 'how') return HOW_LABEL[value] ?? value;
  if (param === 'tab') return TAB_LABEL[value] ?? value;
  if (param === 'season') return /^\d{4}$/.test(value) ? `${value}年` : value;
  return value;
}

function BreakdownTable({ param, rows }: { param: string; rows: SimulatorBreakdownRow[] }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
      <h4 className="mb-1 text-xs font-semibold text-slate-200">
        {PARAM_TITLE[param] ?? param}（直近28日）
      </h4>
      {rows.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-500">データなし</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-[0.65rem] text-slate-400">
            <tr>
              <th className="py-1 pr-2 font-medium">値</th>
              <th className="py-1 pr-2 font-medium">操作</th>
              <th className="py-1 pr-2 text-right font-medium">回数</th>
              <th className="py-1 text-right font-medium">人数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.slice(0, 12).map((r) => (
              <tr key={`${r.event}\n${r.value}`}>
                <td className="py-1.5 pr-2 font-medium text-ink-50">{valueLabel(param, r.value)}</td>
                <td className="py-1.5 pr-2 text-slate-400">{EVENT_LABEL.get(r.event) ?? r.event}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-200">{formatNumber(r.count)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-400">{formatNumber(r.users)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Simulator({ simulator }: Props) {
  const shell = (body: JSX.Element) => (
    <section
      aria-label="シミュレーター"
      className="rounded-2xl bg-ink-800 p-4 shadow-dark-soft ring-1 ring-white/10 sm:p-5"
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-50 sm:text-lg">⚾ シミュレーター</h2>
        <p className="text-xs text-slate-400">AI二刀流 /sim/ · GA4</p>
      </header>
      {body}
    </section>
  );

  if (!simulator) {
    return shell(
      <p className="py-4 text-center text-xs text-slate-500">
        {simulator === null ? 'シミュレーターのデータを取得できませんでした' : 'シミュレーターのデータは未取得です'}
      </p>,
    );
  }

  // 日別推移: データが出始めた日から表示 (前は 0 が続くだけなので)。最低14日
  const firstIdx = simulator.daily.findIndex((d) => d.openViews > 0 || d.playEvents > 0);
  const from = firstIdx < 0 ? simulator.daily.length - 14 : Math.min(firstIdx, simulator.daily.length - 14);
  const daily = simulator.daily.slice(Math.max(0, from));
  const rows = eventRows(simulator.events.d7, simulator.events.d28);
  const params = Object.keys(simulator.breakdowns);

  return shell(
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <WindowCard title="直近7日" w={simulator.windows.d7} />
        <WindowCard title="直近28日" w={simulator.windows.d28} />
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-200">日別の推移（人数）</h3>
        <div className="h-56 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: '#151a2a',
                  color: '#f7f8fb',
                  fontSize: 12,
                }}
                itemStyle={{ color: '#f7f8fb' }}
                labelStyle={{ color: '#cbd5e1' }}
                cursor={{ stroke: 'rgba(255,255,255,0.18)' }}
                labelFormatter={(value) => formatShortDate(String(value))}
                formatter={(value: number, name) => [
                  `${formatNumber(value)}人`,
                  name === 'openUsers' ? '開いた人' : '遊んだ人',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8, color: '#cbd5e1' }}
                formatter={(value) => (value === 'openUsers' ? '開いた人' : '遊んだ人')}
              />
              <Line type="monotone" dataKey="openUsers" stroke={OPEN_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="playUsers" stroke={PLAY_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-200">操作ごとの回数と人数</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-xs">
            <thead className="text-[0.65rem] text-slate-400">
              <tr>
                <th className="py-1 pr-2 font-medium">操作</th>
                <th className="py-1 pr-2 text-right font-medium">7日 回数</th>
                <th className="py-1 pr-2 text-right font-medium">7日 人数</th>
                <th className="py-1 pr-2 text-right font-medium">28日 回数</th>
                <th className="py-1 text-right font-medium">28日 人数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.name} title={r.name}>
                  <td className="py-1.5 pr-2 font-medium text-ink-50">{r.label}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-200">{formatNumber(r.d7?.count ?? 0)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-400">{formatNumber(r.d7?.users ?? 0)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-200">{formatNumber(r.d28?.count ?? 0)}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-400">{formatNumber(r.d28?.users ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {params.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {params.map((p) => (
            <BreakdownTable key={p} param={p} rows={simulator.breakdowns[p].d28} />
          ))}
        </div>
      ) : null}

      <p className="text-[0.65rem] leading-relaxed text-slate-500">
        開いた人 = /sim/ を表示した人。遊んだ人 = 自分で操作した人（sim_ で始まるイベント。計測はシミュレーター v3.23・2026-11-08 から）。
        人数は期間内の重複を除いた数で、日別の合計とは一致しません。
        {simulator.missingBreakdownParams.length > 0
          ? ` 年度別・進め方別・タブ別は GA4 のカスタムディメンション（${simulator.missingBreakdownParams.join(' / ')}）を登録すると表示されます。`
          : ''}
      </p>
    </div>,
  );
}
