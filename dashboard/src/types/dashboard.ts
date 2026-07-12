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

/* -------------------------------------------------------------------------- */
/*  Phase 3B: Search Console                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 検索メトリクス (metrics.search* / topQueries) の出所。
 *   - 'sc':     Search Console live 値
 *   - 'sample': sample-dashboard.json の架空値
 *   - 'none':   SC 未接続 (プロパティ未解決 / API 失敗)。metrics.search* は 0 埋め
 * 旧スナップショット (Phase 3A 以前) にはこのフィールドが無いので optional。
 */
export type SearchSource = 'sc' | 'sample' | 'none';

export interface DiscoverStatus {
  /** Discover 掲載中か。true=直近28日で表示あり / false=0件 / null=SC未接続 */
  listed: boolean | null;
  impressions28d: number;
  clicks28d: number;
}

/** SC type=web の直近28日 vs その前28日 (日別56日取得から分割集計) */
export interface SearchTrend {
  clicks28d: number;
  clicksPrev28d: number;
  impressions28d: number;
  impressionsPrev28d: number;
}

/** 記事の動性ステータス。分類しきい値は scripts/fetch-dashboard-data.mjs の MOMENTUM 定数を正とする */
export type ArticleMomentumStatus = 'rising' | 'falling' | 'new' | 'stable';

export interface ArticleMomentumEntry {
  path: string;
  title: string;
  /** 直近7日の PV */
  pv7: number;
  /** その前の7日の PV */
  pvPrev7: number;
  /** 前週比 (%)。前週PV=0 のときは null（新着扱い） */
  deltaPct: number | null;
  status: ArticleMomentumStatus;
  /** 直近14日のデイリー PV（日付昇順・欠測日は 0） */
  trend: number[];
}

export interface SiteDashboard {
  site: SiteMeta;
  metrics: SiteMetrics;
  dailyViews: DailyViewPoint[];
  topPages: PageStat[];
  risingPages: PageStat[];
  topQueries: SearchQueryStat[];
  improvements: ImprovementHint[];
  /** 記事ごとの動性（7日PV上位∪前週比上位∪新着、最大30記事/サイト）。未取得スナップショットでは省略 */
  articles?: ArticleMomentumEntry[];
  /** 検索メトリクスの出所。旧スナップショットでは省略 (UI 側でフォールバック判定) */
  searchSource?: SearchSource;
  /** Discover 掲載状況 (直近28日)。旧スナップショットでは省略 */
  discover?: DiscoverStatus;
  /** SC 検索クリック/表示の前期比較。SC 未接続時・旧スナップショットでは省略 */
  searchTrend?: SearchTrend;
  /** サイト内回遊 PV 割合 (0〜1)。リファラーのホストが自サイトと同一の PV / 全 PV */
  internalNavShare?: number;
  /** データ取得元 (sample / ga4 / search-console) と取得時刻 */
  source: 'sample' | 'ga4' | 'search-console' | 'mixed';
  fetchedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Phase 3A 統計データ構造 (GA4 由来の生統計を後段分析できる形で保持)        */
/*                                                                            */
/*  既存 UI は SiteDashboard.metrics / dailyViews / topPages / risingPages を */
/*  そのまま使う。statsBlock はオプショナルで、表示用とは独立の生統計を入れる */
/*  ことで、ランキングや 7/28/90 日切替などの分析を後付けできるようにする。   */
/* -------------------------------------------------------------------------- */

export interface DailySitePoint {
  /** YYYY-MM-DD */
  date: string;
  views: number;
  users: number;
  sessions: number;
  engagedSessions: number;
  /** 0–1 の小数 (sessions == 0 のときは 0) */
  engagementRate: number;
}

export interface PageStatExtended {
  path: string;
  title: string;
  views7d: number;
  views28d: number;
  views90d: number;
  users28d: number;
  sessions28d: number;
}

export interface ChannelStat {
  /** GA4 の sessionDefaultChannelGroup 値 */
  channel: string;
  views: number;
  users: number;
  sessions: number;
}

export interface DeviceStat {
  /** GA4 の deviceCategory 値 (desktop / mobile / tablet) */
  device: string;
  views: number;
  users: number;
  sessions: number;
}

export interface TrendScore {
  path: string;
  title: string;
  views7d: number;
  views28d: number;
  views90d: number;
  /** (views7d / 7) / (views28d / 28) に相当する増勢スコア。1.0 が定常、>1 が急上昇 */
  trendScore: number;
}

export interface SiteStatsBlock {
  siteId: SiteId;
  totals: {
    views7d: number;
    views28d: number;
    views90d: number;
    users28d: number;
    sessions28d: number;
    avgEngagementRate28d: number;
  };
  /** 日付昇順、最大 90 点 */
  dailySiteStats: DailySitePoint[];
  /** views90d 降順、最大 50 行。7/28/90 日 PV をマージ済み */
  pageStats: PageStatExtended[];
  /** 直近 28 日のチャネル別集計、views 降順 */
  channelStats: ChannelStat[];
  /** 直近 28 日のデバイス別集計、views 降順 */
  deviceStats: DeviceStat[];
  /** trendScore 降順、最大 10 件 (views28d が一定以上のページのみ) */
  trendScores: TrendScore[];
  /** このサイトに限ったデータ取得元 */
  source: 'ga4' | 'sample';
  fetchedAt: string;
}

export interface DashboardStats {
  generatedAt: string;
  dataRange: {
    /** YYYY-MM-DD (含む) */
    start: string;
    /** YYYY-MM-DD (含む) */
    end: string;
    days: number;
  };
  meta: {
    warnings: string[];
    source: 'ga4' | 'sample' | 'mixed';
  };
  siteStats: SiteStatsBlock[];
}

export interface DashboardSnapshot {
  generatedAt: string;
  /** 既存 UI 互換のサイト別表示データ */
  sites: SiteDashboard[];
  /** Phase 3A で追加: 後段分析用の生統計。未取得時は省略可 */
  stats?: DashboardStats;
}
