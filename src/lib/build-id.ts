// ビルドIDの単一ソース。ビルド時(サーバ側)に一度だけ評価され、
//  - /version.json（新デプロイ検知のポーリング先）
//  - BaseLayout の <meta name="sumalabo-build">（そのページが焼かれた版）
// の両方で同じ値を使う。両者が食い違ったら「新しい版が出た」と判定する。
import { execSync } from "node:child_process";

function gitHead(): string {
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

function resolveCommit(): string {
  // 本番反映は wrangler Direct Upload（リポジトリ上でローカルビルド）で、
  // 「実際にデプロイされる版」は常に作業ツリーの HEAD。よって git HEAD を最優先にする。
  // 以前は CF_PAGES_COMMIT_SHA / GITHUB_SHA を優先していたが、これらが stale だと
  // 実デプロイ版と食い違う（version.json が古いコミットを指す）ため、順序を反転した。
  // env は git が使えない環境（浅いクローンで .git 無し等）のフォールバックに限定する。
  // ※ GitHub Actions / CF Pages Git 連携でも対象コミットが checkout されるため
  //   git HEAD は正しい値を返す。
  const head = gitHead();
  if (head) return head;
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "";
  if (fromEnv) return fromEnv.slice(0, 12);
  return "";
}

export const COMMIT = resolveCommit();
export const BUILT_AT = new Date().toISOString();
// commit が取れればそれを使う（同一コミットの再ビルドで誤検知しないため）。
// 取れない環境ではビルド時刻にフォールバック。
export const BUILD_ID = COMMIT || BUILT_AT;
