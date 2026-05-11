import { useEffect, useState } from 'react';
import type { DashboardSnapshot } from './types/dashboard';
import { loadDashboard } from './lib/dataLoader';
import { formatDateTime } from './lib/format';
import { SummaryCards } from './components/SummaryCards';
import { SiteCard } from './components/SiteCard';
import { ViewsChart } from './components/ViewsChart';
import { TopPagesTable } from './components/TopPagesTable';
import { RisingPages } from './components/RisingPages';
import { SearchInsights } from './components/SearchInsights';
import { ImprovementCards } from './components/ImprovementCards';

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard()
      .then(setSnapshot)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-bold text-rose-700">読み込みエラー</h1>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </pre>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-500">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <header className="sticky top-0 z-10 border-b border-ink-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-2 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-ink-900 sm:text-xl">
              📡 メディア司令室
            </h1>
            <p className="text-[0.7rem] text-ink-500">
              生成: {formatDateTime(snapshot.generatedAt)} · データソース:{' '}
              {snapshot.sites.every((s) => s.source === 'sample') ? 'sample-dashboard.json' : 'mixed'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[0.7rem] text-ink-500">
            {snapshot.sites.every((s) => s.source === 'sample') ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-200">
                サンプル表示
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                ライブデータ
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <SummaryCards sites={snapshot.sites} />

        <section
          aria-label="サイト別カード"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {snapshot.sites.map((s) => (
            <SiteCard key={s.site.id} site={s} />
          ))}
        </section>

        <ViewsChart sites={snapshot.sites} />

        <div className="grid gap-5 lg:grid-cols-2">
          <RisingPages sites={snapshot.sites} />
          <ImprovementCards sites={snapshot.sites} />
        </div>

        <TopPagesTable sites={snapshot.sites} />

        <SearchInsights sites={snapshot.sites} />

        <footer className="pb-4 pt-2 text-center text-[0.7rem] text-ink-500">
          個人用ダッシュボード / 外部公開しない設定で運用
        </footer>
      </main>
    </div>
  );
}
