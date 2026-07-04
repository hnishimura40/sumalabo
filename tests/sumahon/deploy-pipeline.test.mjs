// tests/sumahon/deploy-pipeline.test.mjs — deploy スクリプトの「verify 後クラッシュ」再現テスト。
//
// 背景 (2026-07-04): Windows の Node で fetch(undici) のハンドルが残ったまま
// stepVerify 完了直後にプロセスが 0xC0000409 で無言終了し、last-good 退避・
// 事後検査・result JSON 出力が実行されなかった。修正として deploy スクリプトの
// HTTP を node:http/https に統一し、cache-purge は子プロセスへ隔離した。
//
// このテストは「verify 成功 → last-good 退避 → 事後検査 → result JSON まで
// 1 プロセスで完走すること」を実測する（L1 昇格の必須条件）。
// wrangler 実行は --skip-wrangler（テスト専用フラグ）でスキップし、
// verify / 事後検査の宛先はローカル HTTP サーバーに差し替える。

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const execFileAsync = promisify(execFile);

const SLUG = "202606-claude-fable-5-launch";
const DIST_ARTICLE = join(ROOT, "dist", "articles", SLUG, "index.html");

test("verify成功 → last-good退避 → 事後検査 → result JSON まで1プロセスで完走する", { skip: !existsSync(DIST_ARTICLE) && "dist が未ビルドのためスキップ（npm run build 後に実行）" }, async () => {
  // 本番を模したローカルサーバー: verify-publication は published を返し、
  // 事後検査用の記事/トップ/一覧/OGP画像も配信する
  const server = createServer((req, res) => {
    if (req.url.startsWith("/verify")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "published", failedChecks: [], productionUrl: `http://127.0.0.1:0/articles/${SLUG}/` }));
    } else if (req.url === `/articles/${SLUG}/`) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<html><head><title>テスト記事</title><meta property="og:image" content="/img.png"/></head><body>article ${SLUG}</body></html>`);
    } else if (req.url === "/articles/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<html><body><a href="/articles/${SLUG}/">${SLUG}</a></body></html>`);
    } else if (req.url === "/img.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(Buffer.from("89504e470d0a1a0a", "hex"));
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><title>top</title><body>top</body></html>");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  let result;
  try {
    result = await execFileAsync(
      process.execPath,
      [
        join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs"),
        `--slug=${SLUG}`,
        "--skip-build",
        "--skip-git-sync",
        "--skip-wrangler",
        `--verify-url=${base}/verify?slug=${SLUG}`,
        "--verify-timeout-ms=30000",
      ],
      {
        cwd: ROOT,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 120000,
        env: {
          ...process.env,
          REVIEW_NOTIFY_SECRET: "",
          CLOUDFLARE_API_TOKEN: "", // canonical 記録は best-effort スキップさせる
          CLOUDFLARE_ACCOUNT_ID: "",
          DEPLOY_POST_VERIFY_EXTRA_ARGS: `--base-url=${base} --no-notify --no-rollback --recheck-delay-ms=0`,
        },
      },
    );
  } catch (e) {
    server.close();
    assert.fail(`deploy スクリプトが exit ${e.code} で失敗（クラッシュ再発の疑い）。stdout末尾=${(e.stdout || "").slice(-800)}`);
  }
  server.close();

  const out = result.stdout;
  // 1. verify 成功後に無言終了せず、result JSON まで到達している
  assert.match(out, /---RESULT JSON---/, "result JSON が出力されている（無言終了していない）");
  const json = JSON.parse(out.slice(out.indexOf("---RESULT JSON---") + "---RESULT JSON---".length));
  assert.equal(json.ok, true);
  assert.equal(json.steps.verify.status, "ok", "strict verify 成功");
  // 2. last-good 退避が実行された
  assert.equal(json.steps.lastGoodSnapshot.status, "ok", "last-good 退避が完走");
  const meta = JSON.parse(readFileSync(join(ROOT, "builds", "last-good", "last-good.json"), "utf-8"));
  assert.equal(meta.slug, SLUG);
  // 3. 事後検査が実行され合格した
  assert.equal(json.steps.postPublishVerify.status, "ok", "post-publish verify が完走");
  const verifyLog = JSON.parse(readFileSync(join(ROOT, "logs", "publish", `${SLUG}.verify.json`), "utf-8"));
  assert.equal(verifyLog.hardFail, false);
});
