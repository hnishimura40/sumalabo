#!/usr/bin/env node
/**
 * dashboard/scripts/deploy-local.mjs
 *
 * 0 円ローカルデプロイ用スクリプト。GitHub Actions を使わずに、
 *   1. dashboard-latest.json を生成 (GA4 Secrets 未設定なら sample fallback)
 *   2. Vite で dist/ をビルド
 *   3. Wrangler で dist/ を Cloudflare Pages へ Direct Upload
 * を順に実行する。
 *
 * 前提:
 *   - 事前に `npx wrangler login` で Cloudflare OAuth セッションが確立されていること
 *     (または環境変数 CLOUDFLARE_API_TOKEN を export しておく)
 *   - 本スクリプトは Cloudflare API Token をファイルに保存しない。
 *     wrangler 自身の認証情報管理 (`~/.config/.wrangler/` 等) に任せる。
 *   - 生成された `public/data/dashboard-latest.json` は gitignore 対象なので
 *     何度走らせても commit に紛れ込まない。
 *
 * 使い方:
 *   cd dashboard
 *   npm ci           # 初回 / 依存更新後のみ
 *   npm run deploy:local
 *
 * 個別環境変数 (どれもオプション):
 *   CLOUDFLARE_PAGES_PROJECT  Pages プロジェクト名 (default: media-command-center)
 *   WRANGLER_BRANCH           Production 扱いするブランチ (default: main)
 *   CLOUDFLARE_API_TOKEN      OAuth セッションの代わりに API Token で動かしたい場合
 */

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DASHBOARD = resolve(__dirname, '..');

const PROJECT = process.env.CLOUDFLARE_PAGES_PROJECT || 'media-command-center';
const BRANCH = process.env.WRANGLER_BRANCH || 'main';

function step(title) {
  console.log(`\n=== ${title} ===`);
}

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: DASHBOARD,
    shell: true,
  });
  if (r.status !== 0) {
    console.error(`\n[deploy-local] Step failed (${cmd}). Exit code: ${r.status}`);
    if (cmd === 'npx' && args.includes('wrangler')) {
      console.error('\nHint:');
      console.error('  - Run `npx wrangler login` once to establish an OAuth session, then retry.');
      console.error('  - Or set CLOUDFLARE_API_TOKEN env var with a token that has');
      console.error('    "Account → Cloudflare Pages → Edit" permission, then retry.');
      console.error('  - Verify the Pages project exists: `npx wrangler pages project list`');
    }
    process.exit(r.status || 1);
  }
}

step('1. Generate dashboard-latest.json (live GA4 or sample fallback)');
run('npm', ['run', 'fetch-data']);

step('2. Build (vite)');
run('npm', ['run', 'build']);

step(`3. Deploy dist/ to Cloudflare Pages — project=${PROJECT}, branch=${BRANCH}`);
run('npx', [
  'wrangler',
  'pages',
  'deploy',
  'dist',
  '--project-name',
  PROJECT,
  '--branch',
  BRANCH,
]);

console.log('\n[deploy-local] All steps succeeded.');
console.log('Next:');
console.log(`  - Open https://${PROJECT}-<suffix>.pages.dev/ in an authenticated browser`);
console.log('  - Verify the new deployment with header right-side badge (🟡 sample / 🟢 live).');
console.log('  - Confirm in a private window that Cloudflare Access still prompts on apex/*/JSON.');
