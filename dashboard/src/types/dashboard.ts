export type SiteId = 'ainitoryu' | 'sumalab' | 'miradia';

export type SiteCategory = '野球・競馬' | 'AI・IT・ガジェット' | 'まとめ・ニュース導線';

export interface SiteMeta {
  id: SiteId;
  name: string;
  url: string;
  category: SiteCategory;
  /** Tailwindで使うアクセントカラー (HEXまたはCSS color) */
  accent: string;
}

export interface DailyViewPoint {
  /** YYYY-MM-DD */
  date: string;
  views: number;
}

export interface PageStat {
  path: string;
  title: string;
  views: number;
  /** 直近期間の伸び率 (例: 0.32 = +32%) */
  delta?: number;
}

export interface SearchQueryStat {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ImprovementHint {
  /** 対象記事のパス。サイト横断のヒントの場合は省略 */
  path?: string;
  title: string;
  reason: string;
  /** 'high' | 'medium' | 'low' */
  priority: 'high' | 'medium' | 'low';
}

export interface SiteMetrics {
  todayViews: number;
  yesterdayViews: number;
  last7DaysViews: number;
  last28DaysViews: number;
  users: number;
  sessions: number;
  searchClicks: number;
  searchImpressions: number;
  /** 0–1 の小数で保持 */
  searchCtr: number;
  averagePosition: number;
}

export interface SiteDashboard {
  site: SiteMeta;
  metrics: SiteMetrics;
  dailyViews: DailyViewPoint[];
  topPages: PageStat[];
  risingPages: PageStat[];
  topQueries: SearchQueryStat[];
  improvements: ImprovementHint[];
  /** データ取得元 (sample / ga4 / search-console) と取得時刻 */
  source: 'sample' | 'ga4' | 'search-console' | 'mixed';
  fetchedAt: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  sites: SiteDashboard[];
}
