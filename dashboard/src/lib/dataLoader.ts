import sampleData from '../data/sample-dashboard.json';
import type { DashboardSnapshot } from '../types/dashboard';

const LIVE_DATA_URL = '/data/dashboard-latest.json';

/**
 * ダッシュボードのスナップショットを取得する。
 *
 * 取得優先度:
 *   1. {@link LIVE_DATA_URL} (本番: GitHub Actions が定期生成して public/data/ に配置)
 *   2. バンドル済み sample-dashboard.json (開発時 / 本番でもファイル未配置の初期状態)
 *
 * fetch が 404 や JSON パース失敗で落ちた場合は静かにサンプルへフォールバックし、
 * 画面は必ず描画できるようにする。ネットワークエラーをユーザーに見せる必要はない。
 *
 * TODO (実データ連携フェーズ):
 *   - public/data/dashboard-latest.json は scripts/fetch-dashboard-data.mjs が生成。
 *   - GA4 Data API / Search Console API 呼び出しは GitHub Actions 側で行い、
 *     生成 JSON を commit するか Cloudflare Pages 用に artifact 経由で配備する。
 *   - これにより Pages Functions / Workers ランタイムの Node 互換制限を回避できる。
 */
export async function loadDashboard(): Promise<DashboardSnapshot> {
  try {
    const res = await fetch(LIVE_DATA_URL, { cache: 'no-cache' });
    if (res.ok) {
      const data = (await res.json()) as DashboardSnapshot;
      if (data && Array.isArray(data.sites) && data.sites.length > 0) {
        return data;
      }
    }
  } catch {
    // ネットワーク/パースエラーはフォールバックで吸収
  }
  return sampleData as DashboardSnapshot;
}
