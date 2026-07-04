#!/usr/bin/env node
// scripts/automation/post-publish-verify.mjs — 本番公開直後の事後検査 (L1 基盤)。
//
// deploy:production 完了直後に自動実行される。人間の事前承認を外す L1 では、
// この機械の事後検査 + 自動 rollback が是正の主役になる。
//
// 判定:
//   hard fail（即 rollback + 通知 + incident 記録）:
//     - 記事 URL が 200 でない
//     - 旧ビルド配信（記事 HTML に slug が無い = 反映されていない）
//     - homepage 誤配信（タイトルがサイト名だけで記事本文が無い）
//     - トップ (/) または記事一覧 (/articles/) が 200 でない
//   soft fail（通知のみ、rollback しない。15 分後に 1 回だけ自動再検査）:
//     - OGP/サムネ画像の応答不良（時間解決しうる）
//     - 記事一覧への掲載反映待ち
//
// 結果は logs/publish/{slug}.verify.json に記録（autonomyLevel / trigger 含む）。
//
// テスト用 override:
//   --base-url=<url>            検査対象ベース URL（本番を壊さずテストするため差し替え可）
//   --rollback-script=<path>    hard fail 時に spawn するスクリプト（stub 差し替え可）
//   --recheck-delay-ms=<n>      soft fail 再検査までの待ち（default 900000 = 15 分）
//   --no-rollback               rollback を実行せず判定だけ記録
//   --no-notify                 通知スキップ
//
// 終了コード: 0 = 合格（soft 残留含む・JSON に記録） / 1 = hard fail / 2 = 引数エラー

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { loadAutonomy, recordIncident, maybeAutoDemote } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..", "..");
const DEFAULT_ROLLBACK_SCRIPT = join(ROOT, "scripts", "automation", "rollback-production.mjs");
const DEFAULT_PURGE_SCRIPT = join(ROOT, "scripts", "automation", "cache-purge.mjs");

function parseArgs(argv) {
  const out = {
    slug: null,
    baseUrl: "https://sumalabo.com",
    trigger: "manual",
    recheckDelayMs: 15 * 60 * 1000,
    noRollback: false,
    noNotify: false,
    rollbackScript: DEFAULT_ROLLBACK_SCRIPT,
    purgeScript: DEFAULT_PURGE_SCRIPT,
    output: null,
  };
  for (const a of argv) {
    if (a === "--no-rollback") out.noRollback = true;
    else if (a === "--no-notify") out.noNotify = true;
    else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length).trim();
    else if (a.startsWith("--base-url=")) out.baseUrl = a.slice("--base-url=".length).trim().replace(/\/+$/, "");
    else if (a.startsWith("--trigger=")) out.trigger = a.slice("--trigger=".length).trim();
    else if (a.startsWith("--rollback-script=")) out.rollbackScript = a.slice("--rollback-script=".length).trim();
    else if (a.startsWith("--purge-script=")) out.purgeScript = a.slice("--purge-script=".length).trim();
    else if (a.startsWith("--recheck-delay-ms=")) {
      const n = Number(a.slice("--recheck-delay-ms=".length));
      if (Number.isFinite(n) && n >= 0) out.recheckDelayMs = n;
    } else if (a.startsWith("--output=")) out.output = a.slice("--output=".length).trim();
  }
  return out;
}

async function fetchSafe(url) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    const text = await res.text().catch(() => "");
    return { ok: true, status: res.status, text, ms: Date.now() - startedAt };
  } catch (e) {
    return { ok: false, status: 0, text: "", ms: Date.now() - startedAt, error: e && e.message };
  }
}

function extractOgImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1] : null;
}

async function runChecks({ slug, baseUrl }) {
  const articleUrl = `${baseUrl}/articles/${slug}/`;
  const [article, home, list] = await Promise.all([
    fetchSafe(articleUrl),
    fetchSafe(`${baseUrl}/`),
    fetchSafe(`${baseUrl}/articles/`),
  ]);

  const articleHtml = article.text || "";
  const slugInHtml = articleHtml.includes(slug);
  const titleMatch = articleHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  // homepage 誤配信: タイトルがサイト名だけ + slug 不在
  const homepageFallback = /^すまラボ\s*$/.test(title) && !slugInHtml;

  const hard = {
    articleHttp200: { ok: article.status === 200, actual: article.status },
    slugInHtml: { ok: slugInHtml, note: slugInHtml ? undefined : "旧ビルド配信の疑い（記事HTMLにslugが無い）" },
    notHomepageFallback: { ok: !homepageFallback, title },
    homeHttp200: { ok: home.status === 200, actual: home.status },
    articlesIndexHttp200: { ok: list.status === 200, actual: list.status },
  };

  // soft: OGP 画像応答 / 一覧掲載
  const ogImage = extractOgImage(articleHtml);
  let ogImageCheck = { ok: true, skipped: true, note: "og:image が HTML から見つからない" };
  if (ogImage) {
    const abs = ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;
    const img = await fetchSafe(abs);
    ogImageCheck = { ok: img.status === 200 && img.ms < 10_000, status: img.status, ms: img.ms, url: abs };
  }
  const soft = {
    ogImageResponsive: ogImageCheck,
    indexListsArticle: { ok: (list.text || "").includes(slug), note: "一覧掲載はCDN反映待ちがありうる" },
  };

  const hardFailed = Object.entries(hard).filter(([, v]) => !v.ok).map(([k]) => k);
  const softFailed = Object.entries(soft).filter(([, v]) => !v.ok).map(([k]) => k);
  return { at: new Date().toISOString(), articleUrl, hard, soft, hardFailed, softFailed };
}

function runRollback(args, reason) {
  console.error(`[post-publish] hard fail → rollback 起動 (${reason})`);
  // --expect-gone: 引っ込め対象の記事は rollback 先の deployment に存在しない
  // はずなので、rollback 側は「記事が消えた」ことを実フェッチで確認する。
  const r = spawnSync(
    process.execPath,
    [args.rollbackScript, `--slug=${args.slug}`, `--reason=${reason}`, "--expect-gone", ...(args.noNotify ? ["--no-notify"] : [])],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  return { invoked: true, script: args.rollbackScript, exitCode: r.status };
}

// hard fail 経路のキャッシュパージ。rollback スクリプト内でもパージするが、
// stub 差し替え（--rollback-script）時でも「hard fail → パージが走る」経路を
// 保証するため、post-publish 側からも同じパージを冪等に実行する。
function runPurge(args) {
  console.error("[post-publish] cache purge 起動（旧内容のキャッシュ残留対策）");
  const r = spawnSync(
    process.execPath,
    [args.purgeScript, `--slug=${args.slug}`],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  return { invoked: true, script: args.purgeScript, exitCode: r.status };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !/^[a-z0-9][a-z0-9-]*$/i.test(args.slug)) {
    console.error("usage: node scripts/automation/post-publish-verify.mjs --slug=<slug> [--base-url=...] [--trigger=manual|auto_after_veto]");
    process.exit(2);
  }
  const autonomy = loadAutonomy();
  const report = {
    slug: args.slug,
    baseUrl: args.baseUrl,
    trigger: args.trigger,
    autonomyLevel: autonomy.level,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    rounds: [],
    hardFail: false,
    softFailRemaining: [],
    rollback: { invoked: false },
    purge: { invoked: false },
    incidentRecorded: false,
    demotion: null,
    notify: null,
  };
  const outputPath = args.output || join(ROOT, "logs", "publish", `${args.slug}.verify.json`);

  console.log(`[post-publish] verify ${args.baseUrl}/articles/${args.slug}/ (trigger=${args.trigger}, level=${autonomy.level})`);
  const round1 = await runChecks(args);
  report.rounds.push(round1);

  if (round1.hardFailed.length > 0) {
    report.hardFail = true;
    // incident 記録 + 自動降格判定
    recordIncident({ slug: args.slug, kind: "post_publish_hard_fail", detail: round1.hardFailed.join(",") });
    report.incidentRecorded = true;
    report.demotion = maybeAutoDemote();
    if (report.demotion?.demoted && !args.noNotify) {
      await notifyAutonomyEvent({
        slug: args.slug,
        status: "auto_demoted",
        title: `[autonomy] 事故多発のため level ${report.demotion.from} → ${report.demotion.to} に自動降格`,
      });
    }
    if (!args.noRollback) {
      report.rollback = runRollback(args, `post_publish_hard_fail:${round1.hardFailed.join("+")}`);
      report.purge = runPurge(args);
    } else {
      report.rollback = { invoked: false, skipped: "--no-rollback" };
      report.purge = { invoked: false, skipped: "--no-rollback" };
    }
    if (!args.noNotify) {
      const n = await notifyAutonomyEvent({
        slug: args.slug,
        status: "publish_hard_fail",
        title: `[autonomy] 公開後検査 hard fail: ${round1.hardFailed.join(", ")}（rollback ${report.rollback.invoked ? "実行" : "スキップ"}）`,
      });
      report.notify = { ok: n.ok, reason: n.reason };
    }
    finish(report, outputPath, 1);
    return;
  }

  if (round1.softFailed.length > 0) {
    console.warn(`[post-publish] soft fail: ${round1.softFailed.join(", ")} → ${Math.round(args.recheckDelayMs / 60000)}分後に1回だけ再検査`);
    if (!args.noNotify) {
      const n = await notifyAutonomyEvent({
        slug: args.slug,
        status: "publish_soft_fail",
        title: `[autonomy] 公開後検査 soft fail（rollbackなし・再検査待ち）: ${round1.softFailed.join(", ")}`,
        previewUrl: `${args.baseUrl}/articles/${args.slug}/`,
      });
      report.notify = { ok: n.ok, reason: n.reason };
    }
    await new Promise((r) => setTimeout(r, args.recheckDelayMs));
    const round2 = await runChecks(args);
    report.rounds.push(round2);
    // 再検査で hard に転じた場合も方針どおり rollback はしない（soft 起点は通知のみ）。
    // ただし残留項目は記録して人間が見る。
    report.softFailRemaining = [...new Set([...round2.hardFailed, ...round2.softFailed])];
    if (report.softFailRemaining.length > 0 && !args.noNotify) {
      await notifyAutonomyEvent({
        slug: args.slug,
        status: "publish_soft_fail_persist",
        title: `[autonomy] 再検査でも未解決: ${report.softFailRemaining.join(", ")}（要目視）`,
      });
    }
  }

  finish(report, outputPath, 0);
}

function finish(report, outputPath, exitCode) {
  report.finishedAt = new Date().toISOString();
  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
  } catch (e) {
    console.error("[post-publish] verify.json 保存失敗:", e && e.message);
  }
  console.log("---POST-PUBLISH VERIFY JSON---");
  console.log(JSON.stringify(report, null, 2));
  // fetch のハンドルが残ったまま process.exit() すると Windows の Node が
  // 0xC0000409 でクラッシュし exit code が壊れるため、自然終了に任せる。
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error("[post-publish fatal]", err && err.message ? err.message : err);
  process.exitCode = 1;
});
