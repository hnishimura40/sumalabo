#!/usr/bin/env node
// scripts/automation/phase-c-auto.mjs — Phase C（X投稿）自動起動の配線 (L2 ブラウザ)。
//
// 発火条件（すべて満たす場合のみ進む。現 level では発火しない）:
//   1. autonomy ゲート: level >= 2 かつ paused でない（trigger=auto_after_veto）
//   2. post-publish verify 合格（logs/publish/{slug}.verify.json の hardFail=false）
//   3. 二重投稿ガード（台帳未投稿）
//
// 投稿手段は autonomy.json の xPostMethod に従う（既定 browser・変更しない）:
//   - browser: 昼は Codex 対話モードを基本とする。CI/無人環境では
//     "phase_c_pending_local" を通知してキュー化し、ローカルセッションで NEXT ACTION
//     （頑丈化チェックリスト付き）を出力する。夜間runは承認済み変更まで claude-in-chrome を維持する
//   - api: post-to-x-api.mjs へ委譲（休眠中。有効化はユーザーが xPostMethod を変更したときのみ）
//
// 投稿後: x-card-check（syndication 照会）でカード確認。失敗/カード不成立は
// incident 記録 + 通知。「投稿されたか不明」な失敗は必ず照会で実在確認してから判断する。
//
// CLI:
//   node scripts/automation/phase-c-auto.mjs --slug <slug> [--trigger auto_after_veto|manual]
//   node scripts/automation/phase-c-auto.mjs --slug <slug> --posted <tweetUrl>   # 投稿完了の記録+カード確認

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { gate, loadAutonomy, recordIncident } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
import { hasPosted, recordPost } from "../sumahon/x-posted-ledger.mjs";
import { checkCardWithWait } from "./x-card-check.mjs";
import { upsertEntry } from "./ledger.mjs";
import { loadXPostOptions, resolvePostWindow, buildAttachmentPlan } from "./x-post-options.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const HARDENING = `
【Phase C ブラウザ投稿の頑丈化（Task 1-2 と同じ）】
 1. 自動化専用タブ/ウィンドウを使う。ChatGPT 等の他作業タブと分離（下書き同期の混線対策）
 2. 入力後に composer を読み戻して一致検証。不一致は selectAll→delete→再入力
 3. 送信は tweetButton の DOM 特定→click→composer 空読み戻しで確認
 4. accountIdentityJs("@suma_labo") で投稿前にアカウントDOMを確認（目視だけで済ませない）
 5. 読者が使う自然検索語でXを1回検索し、結果内で実際に使われているタグを収集・集計。最多の流入タグ0〜2個を --discovered-traffic-tags、自然検索語を --search-phrase で再生成する。#すまラボは常時1個、カテゴリタグは廃止
 6. 連結造語・企業名単体・#Google/#Apple級の巨大一般タグは禁止
 7. 投稿後 /suma_labo/status/ リンクから URL を取得し --posted で記録`;

async function main() {
  const argv = process.argv.slice(2);
  const args = { slug: null, trigger: "auto_after_veto", posted: null, variant: null, replyUrl: null, route: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") args.slug = argv[++i];
    else if (argv[i] === "--trigger") args.trigger = argv[++i];
    else if (argv[i] === "--posted") args.posted = argv[++i];
    else if (argv[i] === "--variant") args.variant = argv[++i];
    else if (argv[i] === "--reply-url") args.replyUrl = argv[++i];
    else if (argv[i] === "--route") args.route = argv[++i];
    else if (argv[i].startsWith("--slug=")) args.slug = argv[i].slice(7);
    else if (argv[i].startsWith("--trigger=")) args.trigger = argv[i].slice(10);
    else if (argv[i].startsWith("--posted=")) args.posted = argv[i].slice(9);
    else if (argv[i].startsWith("--variant=")) args.variant = argv[i].slice(10);
    else if (argv[i].startsWith("--reply-url=")) args.replyUrl = argv[i].slice(12);
    else if (argv[i].startsWith("--route=")) args.route = argv[i].slice(8);
  }
  if (!args.slug) {
    console.error("usage: --slug <slug> [--trigger auto_after_veto|manual] [--posted <tweetUrl>]");
    process.exitCode = 2;
    return;
  }

  // ---- 投稿完了の記録 + カード確認（--posted 経路） ----
  if (args.posted) {
    const idMatch = args.posted.match(/status\/(\d+)/);
    if (!idMatch) { console.error("posted URL から tweetId を特定できません"); process.exitCode = 2; return; }
    // variant: --variant 指定 > xPostOptions からの導出（全OFFなら text_only = 現状どおり）
    const plan = buildAttachmentPlan(args.slug, loadXPostOptions());
    const variant = args.variant || plan.variant;
    const isImagePost = /^images\d+/.test(String(variant)) || plan.attach.length > 0;
    if (!(await hasPosted(args.slug))) {
      await recordPost({ slug: args.slug, postUrl: args.posted, postText: "(recorded via phase-c-auto)", method: loadAutonomy().xPostMethod || "chrome", route: args.route || "codex", variant, replyUrl: args.replyUrl || null, imagesAttached: plan.attach.length });
    }
    upsertEntry(args.slug, { xPostUrl: args.posted, xPostedAt: new Date().toISOString(), xReplyUrl: args.replyUrl || null });

    // 画像投稿（images{N}）は本投稿がOGPカードではなく画像なので、カード不成立を失敗としない。
    // 画像は添付された時点で描画されるため、成功条件は「投稿が実在する」こと。
    if (isImagePost) {
      await notifyAutonomyEvent({ slug: args.slug, status: "x_posted", title: `[autonomy] Phase C完了: ${args.slug}（画像投稿 ${plan.attach.length}枚${args.replyUrl ? "＋リンクはリプライ" : ""}）`, previewUrl: `https://sumalabo.com/articles/${args.slug}/` }).catch(() => {});
      console.log(`[phase-c] 完了（画像投稿 ${plan.attach.length}枚・カード確認はスキップ）`);
      return;
    }

    // text_only（リンク付き本投稿）は従来どおり OGP カード確認する。
    console.log("[phase-c] カード確認（syndication照会、画像は非同期生成のため最大5分待ち）...");
    const card = await checkCardWithWait(idMatch[1], { waitMinutes: 5 });
    console.log(JSON.stringify(card, null, 2));
    if (!card.cardFound || card.imageOk === false) {
      recordIncident({ slug: args.slug, kind: "x_card_not_rendered", detail: JSON.stringify({ cardFound: card.cardFound, imageOk: card.imageOk }) });
      await notifyAutonomyEvent({ slug: args.slug, status: "x_card_issue", title: `[autonomy] X投稿のカードが不成立: ${args.slug}（要確認）` }).catch(() => {});
      process.exitCode = 3;
      return;
    }
    await notifyAutonomyEvent({ slug: args.slug, status: "x_posted", title: `[autonomy] Phase C完了: ${args.slug}（カード画像確認済み）`, previewUrl: `https://sumalabo.com/articles/${args.slug}/` }).catch(() => {});
    console.log("[phase-c] 完了（カード画像あり）");
    return;
  }

  // ---- 発火条件チェック ----
  const g = gate({ phase: "phase_c", trigger: args.trigger });
  if (!g.allowed) {
    console.log(`[phase-c] skip: ${g.reason} (level=${g.level}, trigger=${args.trigger})`);
    process.exitCode = 0; // 現 level では発火しない = 正常スキップ
    return;
  }
  const verifyPath = path.join(ROOT, "logs", "publish", `${args.slug}.verify.json`);
  if (!existsSync(verifyPath)) {
    console.error("[phase-c] BLOCK: post-publish verify 結果がありません（Phase B 未完了）");
    process.exitCode = 1;
    return;
  }
  const verify = JSON.parse(readFileSync(verifyPath, "utf-8"));
  if (verify.hardFail) {
    console.error("[phase-c] BLOCK: post-publish verify が hard fail のため投稿しません");
    process.exitCode = 1;
    return;
  }
  if (await hasPosted(args.slug)) {
    console.log("[phase-c] skip: 既に投稿済み（二重投稿ガード）");
    process.exitCode = 0;
    return;
  }

  const method = loadAutonomy().xPostMethod;
  if (method === "api") {
    // 休眠中の API 実装へ委譲（xPostMethod をユーザーが変更したときだけ通る）
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "automation", "post-to-x-api.mjs"), `--slug=${args.slug}`, `--trigger=${args.trigger}`], { cwd: ROOT, stdio: "inherit" });
    process.exitCode = r.status ?? 1;
    return;
  }

  // browser: CI/無人環境ではローカルセッション待ちとして通知
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    await notifyAutonomyEvent({ slug: args.slug, status: "phase_c_pending_local", title: `[autonomy] Phase C待ち: ${args.slug}（ブラウザ投稿はローカルセッションで実行）` }).catch(() => {});
    console.log("[phase-c] pending_local: ブラウザ投稿はローカルの Codex 対話セッションで実行してください");
    process.exitCode = 0;
    return;
  }

  // ローカル: Codex 対話モードへの NEXT ACTION（頑丈化チェックリスト付き）
  // xPostOptions（全OFF時は従来と完全に同一の出力・挙動になる）
  const xOpts = loadXPostOptions();
  const windowCheck = resolvePostWindow(new Date(), xOpts);
  const plan = buildAttachmentPlan(args.slug, xOpts);
  const inspectionPath = path.join(ROOT, "logs", "article", `${args.slug}.independent-inspection.json`);
  const inspectionDone = existsSync(inspectionPath);
  const handCropPath = path.join(ROOT, "logs", "article", `${args.slug}.hand-crop-inspection.json`);
  const handCrop = existsSync(handCropPath) ? JSON.parse(readFileSync(handCropPath, "utf-8")) : null;
  const handCropDone = handCrop && (handCrop.verdictCounts?.needs_revision ?? 0) === 0;

  console.log(`\n=== PHASE C NEXT ACTION [browser post] ${args.slug} ===`);
  console.log("実行経路: Codex 対話モード（docs/x-post-codex-procedure.md を貼り付けて実行）");
  if (!windowCheck.postNow) {
    console.log(`0. 投稿時間帯(postWindow ${xOpts.postWindow.start}-${xOpts.postWindow.end})より前のため、` +
      `${windowCheck.waitUntil.toISOString()} まで投稿を保留してから以下を実行（約${windowCheck.waitMinutes}分待機）`);
  }
  // 独立検品ゲート: X 直接投稿の前に、生成の文脈を持たない検品エージェントで全画像を白紙再検査する。
  if (xOpts.attachSlides) {
    if (!inspectionDone) {
      console.log(`0-検品. **【必須】独立検品を先に実行**: npm run sumalabo:inspect -- --slug ${args.slug} でプロンプト生成 →`);
      console.log(`   生成の文脈を持たない別 Task エージェントを起動し全画像を白紙検査 → 結果を logs/article/${args.slug}.independent-inspection.json に保存。`);
      console.log(`   needs_revision は該当のみ最大2回再生成→直らなければ X から除外（記事公開は止めない）。検品後に本投稿の画像は xSelection に自動で切り替わる。`);
    } else {
      console.log(`0-検品. 独立検品済み（logs/article/${args.slug}.independent-inspection.json）。selectionSource=${plan.selectionSource}。`);
      if (!handCrop) {
        console.log(`0-二段検品. **【必須】未実施**: npm run sumalabo:inspect-hands -- --slug ${args.slug}（手が見える画像だけを別Codexセッションで拡大検品）。`);
      } else {
        const c = handCrop.verdictCounts || {};
        console.log(`0-二段検品. 実施画像 ${handCrop.sourceImagesInspected || 0}枚 / ok ${c.ok || 0}・warning ${c.warning || 0}・needs_revision ${c.needs_revision || 0}。`);
      }
    }
  }
  if (!inspectionDone || !handCropDone) {
    console.error(`[phase-c] BLOCK: 一次独立検品と手の部位拡大二段検品が完了し、needs_revision が0件になるまで投稿できません: ${handCropPath}`);
    process.exitCode = 1;
    return;
  }
  console.log(`1. npm run social:generate-x-post -- --slug ${args.slug} で投稿文を生成・確認（logs/social/${args.slug}.x-post.json に本投稿文・reply・attachmentPlan が入る）`);
  if (plan.attach.length > 0) {
    console.log(`2. Chrome で x.com/compose/post を前面で開き、本投稿文を入力後、以下の画像 ${plan.attach.length} 枚を添付（独立検品の xSelection・1枚目=サムネ）:`);
    console.log("   （既存のクリップボード/ファイル選択実績方式を流用。複数枚は x-post-chrome.ps1 に -ImagePaths を渡す or 1枚ずつ添付。添付枚数の一致をDOMで検証してから投稿）");
    for (const f of plan.attach) console.log(`   - ${f}`);
    if (plan.linkInReply) {
      console.log("2b. 本投稿には記事リンクを入れない（リンク付き投稿は露出が絞られるため）。本投稿は画像＋短文＋ハッシュタグのみ。");
      console.log(`2c. 本投稿の直後に、その投稿へのリプライで記事リンクを1件だけ付ける（logs/social/${args.slug}.x-post.json の reply.text をそのまま使用）。`);
    }
    if (plan.threadBatches.length > 0) {
      console.log(`2d. さらに残りスライドを返信ツリーにぶら下げてもよい（1返信4枚まで・${plan.threadBatches.length}返信）:`);
      plan.threadBatches.forEach((batch, i) => console.log(`   返信${i + 1}: ${batch.map((f) => f.split(/[\\/]/).pop()).join(", ")}`));
    }
  } else {
    console.log("2. Chrome で x.com/compose/post を開き、投稿文を入力（下記チェックリスト厳守）");
  }
  console.log(`3. 投稿後: node scripts/automation/phase-c-auto.mjs --slug ${args.slug} --posted <tweetUrl> --variant ${plan.variant}${plan.linkInReply ? " --reply-url <replyTweetUrl>" : ""} --route codex`);
  console.log(HARDENING);
  process.exitCode = 10;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[phase-c fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
