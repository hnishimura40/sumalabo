#!/usr/bin/env node
/**
 * dashboard/scripts/fetch-dashboard-data.mjs
 *
 * ダッシュボード用のライブJSON (public/data/dashboard-latest.json) を生成するスクリプト。
 *
 * 現状 (Phase 2):
 *   - sample-dashboard.json をそのままコピーして public/data/dashboard-latest.json に書き出すだけ。
 *   - これにより GitHub Actions のワークフロー全体 (Secrets 読み込み, commit, Pages デプロイ) を
 *     実 API 連携前に動作確認できる。
 *
 * 次フェーズ (Phase 3):
 *   - 各サイトについて GA4 Data API と Search Console API を呼び、
 *     src/types/dashboard.ts の DashboardSnapshot を組み立てて書き出す。
 *   - 認証情報は GitHub Actions Secrets から process.env 経由で受け取る:
 *       GA4_PROPERTY_ID_AINITORYU / _SUMALAB / _MIRADIA
 *       GA4_SERVICE_ACCOUNT_JSON
 *       SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
 *       SEARCH_CONSOLE_SITE_AINITORYU / _SUMALAB / _MIRADIA
 *   - 推奨ライブラリ: @google-analytics/data, googleapis (Actions ランナーは Node.js 環境なので問題なし)。
 *   - 完成 JSON は source: 'ga4' | 'search-console' | 'mixed' を立て、
 *     fetchedAt に ISO8601 (JST) を入れる。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SAMPLE_PATH = resolve(ROOT, 'src/data/sample-dashboard.json');
const OUT_PATH = resolve(ROOT, 'public/data/dashboard-latest.json');

const SITE_KEYS = ['ainitoryu', 'sumalab', 'miradia'];

function logMissingSecrets() {
  const required = [
    ...SITE_KEYS.map((k) => `GA4_PROPERTY_ID_${k.toUpperCase()}`),
    'GA4_SERVICE_ACCOUNT_JSON',
    'SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON',
    ...SITE_KEYS.map((k) => `SEARCH_CONSOLE_SITE_${k.toUpperCase()}`),
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length === required.length) {
    console.log('[fetch-dashboard-data] No Google API secrets present — copying sample data.');
  } else if (missing.length > 0) {
    console.warn(
      `[fetch-dashboard-data] Partial secrets present. Missing: ${missing.join(', ')}. Falling back to sample.`,
    );
  } else {
    console.log(
      '[fetch-dashboard-data] All secrets present, but real fetch is not implemented yet (Phase 2). Copying sample.',
    );
  }
}

async function main() {
  logMissingSecrets();

  // TODO(Phase 3): ここで GA4 Data API / Search Console API を呼んで snapshot を組み立てる。
  // 例:
  //   const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  //   const { google } = await import('googleapis');
  //   ...
  //   const snapshot = await buildSnapshotFromGoogleApis();

  const sample = JSON.parse(await readFile(SAMPLE_PATH, 'utf8'));

  // fetchedAt / generatedAt は現在時刻 (JST) で更新しておくと、
  // ワークフローが回っていることが画面から分かる。
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace(/Z$/, '+09:00');
  sample.generatedAt = jst;
  if (Array.isArray(sample.sites)) {
    for (const s of sample.sites) {
      s.fetchedAt = jst;
      // 実 API 接続前なので 'sample' のまま (画面側で「サンプル表示」バッジが出る)
      s.source = 'sample';
    }
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(sample, null, 2) + '\n', 'utf8');
  console.log(`[fetch-dashboard-data] Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[fetch-dashboard-data] Failed:', err);
  process.exit(1);
});
