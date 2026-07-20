// ビルドIDの単一ソース。ビルド時(サーバ側)に一度だけ評価され、
//  - /version.json（新デプロイ検知のポーリング先）
//  - BaseLayout の <meta name="sumalabo-build">（そのページが焼かれた版）
// の両方で同じ値を使う。両者が食い違ったら「新しい版が出た」と判定する。
import { execSync } from "node:child_process";

function resolveCommit(): string {
  // CI/Pages 環境なら環境変数、ローカル(wrangler direct upload)なら git から取る
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "";
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .slice(0, 12);
  } catch {
    return "";
  }
}

export const COMMIT = resolveCommit();
export const BUILT_AT = new Date().toISOString();
// commit が取れればそれを使う（同一コミットの再ビルドで誤検知しないため）。
// 取れない環境ではビルド時刻にフォールバック。
export const BUILD_ID = COMMIT || BUILT_AT;
