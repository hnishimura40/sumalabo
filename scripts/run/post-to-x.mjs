#!/usr/bin/env node
// すまラボ自動化: X 投稿 CLI オーケストレータ
//
// 役割:
//   - logs/social/{slug}.x-post.json から投稿文をロード
//   - data/social/x-posted.json 台帳と照合し、二重投稿を防止
//   - --mode chrome (デフォルト): scripts/automation/x-post-chrome.ps1 を呼び、
//       Chrome を前面化 + クリップボードに投稿文をセット
//       （最終クリックは Claude in Chrome MCP が DOM で実行する想定）
//   - --mode api (将来): X API Create Post を直接叩く（環境変数が揃っていれば）
//   - --check のみで台帳照合
//   - --record で投稿成功後の台帳追記
//   - --error で失敗ログ保存
//
// 使い方:
//   投稿準備 (Chrome ルート):
//     node scripts/run/post-to-x.mjs --slug XXX [--variant primary|結論先出し|問いかけ] [--dry-run]
//
//   台帳確認のみ:
//     node scripts/run/post-to-x.mjs --check --slug XXX
//
//   投稿成功記録:
//     node scripts/run/post-to-x.mjs --record --slug XXX --postUrl https://x.com/suma_labo/status/...
//
//   失敗記録:
//     node scripts/run/post-to-x.mjs --error --slug XXX --reason "ログインが必要"
//
// 終了コード:
//   0 = 正常
//   1 = 引数エラー
//   2 = x-post.json が無い (generate-x-post.mjs を先に走らせる)
//   3 = 既に投稿済み (台帳ヒット)
//   4 = PowerShell helper 失敗
//   5 = API 投稿失敗 (将来)
//
// 重要: パスワード/認証コードを引数にも環境にも残さない。
// X API モードでも、token は process.env から読むだけで、ログには出力しない。

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { hasPosted, getPostRecord, recordPost } from "../sumahon/x-posted-ledger.mjs";
import { gate } from "../automation/autonomy.mjs";
import { notifyAutonomyEvent } from "../automation/autonomy-notify.mjs";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function loadPostJson(slug) {
  const p = `logs/social/${slug}.x-post.json`;
  if (!existsSync(p)) {
    console.error(`error: ${p} が見つかりません。先に: node scripts/run/generate-x-post.mjs --slug ${slug}`);
    process.exit(2);
  }
  return JSON.parse(await readFile(p, "utf-8"));
}

function pickVariant(postJson, variant = "primary") {
  if (variant === "primary") return { text: postJson.primary.text, charCount: postJson.primary.charCount };
  const alt = (postJson.alternates || []).find((a) => a.label === variant);
  if (!alt) {
    console.error(
      `error: variant "${variant}" が見当たりません。使えるのは: primary | ${(postJson.alternates || [])
        .map((a) => a.label)
        .join(" | ")}`,
    );
    process.exit(1);
  }
  return { text: alt.text, charCount: alt.charCount };
}

async function saveError(slug, errorRecord) {
  const dir = "logs/social";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${slug}.x-post-error.json`);
  await writeFile(p, JSON.stringify(errorRecord, null, 2) + "\n", "utf-8");
  return p;
}

function runPowerShell(args) {
  return new Promise((resolve, reject) => {
    const ps = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/automation/x-post-chrome.ps1", ...args],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    ps.stdout.on("data", (d) => (stdout += d.toString()));
    ps.stderr.on("data", (d) => (stderr += d.toString()));
    ps.on("close", (code) => resolve({ code, stdout, stderr }));
    ps.on("error", reject);
  });
}

async function modeCheck(slug) {
  const posted = await hasPosted(slug);
  const rec = posted ? await getPostRecord(slug) : null;
  console.log(JSON.stringify({ slug, posted, record: rec }, null, 2));
  process.exit(posted ? 3 : 0);
}

async function modeRecord(args) {
  const slug = args.slug;
  const postUrl = args.postUrl || "";
  const method = args.method || "chrome";
  const postJson = await loadPostJson(slug);
  const variantName = args.variant || "primary";
  const v = pickVariant(postJson, variantName);
  if (await hasPosted(slug)) {
    console.error(`error: slug "${slug}" は既に投稿済みです（台帳ヒット）。再投稿しません。`);
    process.exit(3);
  }
  const rec = await recordPost({
    slug,
    articleUrl: postJson.articleUrl,
    postText: v.text,
    postUrl,
    method,
    thumbnailAttached: Boolean(postJson.attachThumbnail),
    charCount: v.charCount,
  });
  console.log("recorded:", JSON.stringify(rec, null, 2));
  process.exit(0);
}

async function modeError(args) {
  const slug = args.slug;
  if (!slug) {
    console.error("usage: --error --slug X --reason '...'");
    process.exit(1);
  }
  const reason = args.reason || "(no reason given)";
  const stage = args.stage || "unspecified";
  const record = {
    slug,
    failedAt: new Date().toISOString(),
    stage,
    reason,
    nextAction: args.nextAction || "logs/social/x-post-error.json を確認 / 必要なら手動投稿",
  };
  const p = await saveError(slug, record);
  console.error(`x-post failed for ${slug}. saved: ${p}`);
  console.error(JSON.stringify(record, null, 2));
  process.exit(0);
}

async function modeChrome(args) {
  const slug = args.slug;
  if (!slug) {
    console.error("usage: --slug X");
    process.exit(1);
  }
  if (await hasPosted(slug)) {
    const rec = await getPostRecord(slug);
    console.error(
      `error: slug "${slug}" は既に投稿済みです (${rec?.postedAt || ""}). 再投稿しません。data/social/x-posted.json を参照。`,
    );
    process.exit(3);
  }
  const postJson = await loadPostJson(slug);
  const variantName = args.variant || "primary";
  const v = pickVariant(postJson, variantName);

  // dry-run: PowerShell を呼ばずに、何が投稿されるかだけ表示
  if (args["dry-run"] || args.dryRun) {
    console.log("=== DRY RUN (no PowerShell, no posting) ===");
    console.log("variant:", variantName);
    console.log("charCount:", v.charCount);
    console.log("attachThumbnail:", postJson.attachThumbnail);
    console.log("thumbnailPath:", postJson.thumbnailPath);
    console.log("--- post text ---");
    console.log(v.text);
    console.log("------------------");
    process.exit(0);
  }

  // PowerShell helper を呼ぶ
  const psArgs = ["-PostText", v.text];
  if (postJson.attachThumbnail && postJson.thumbnailPath) {
    const imgPath = postJson.thumbnailPath.startsWith("/")
      ? `public${postJson.thumbnailPath}`
      : postJson.thumbnailPath;
    if (existsSync(imgPath)) {
      psArgs.push("-ImagePath", imgPath);
    } else {
      console.error(`warn: thumbnail not found at ${imgPath}, posting without image`);
    }
  }

  console.log("invoking PowerShell helper (clipboard + Chrome foreground)...");
  const r = await runPowerShell(psArgs);
  if (r.stdout) console.log(r.stdout);
  if (r.stderr) console.error(r.stderr);

  if (r.code !== 0) {
    console.error(`PowerShell helper exit ${r.code}`);
    process.exit(4);
  }

  console.log("");
  console.log("=== NEXT STEPS (Claude in Chrome MCP が実行する想定) ===");
  console.log("1. Chrome MCP で x.com の compose textarea を取得しフォーカス");
  console.log("2. PowerShell SendKeys ^v でテキストを貼り付け（または直接 type）");
  console.log("3. サムネがある場合は、再度 PowerShell で -ImagePath を渡してクリップボード切り替え → 再 Ctrl+V");
  console.log("4. DOM 上で投稿文と添付件数を確認");
  console.log("5. 「ポストする」ボタンを MCP click で押す（投稿)");
  console.log("6. 完了確認後: node scripts/run/post-to-x.mjs --record --slug " + slug + " --postUrl <URL>");
  console.log("");
  console.log("失敗時: node scripts/run/post-to-x.mjs --error --slug " + slug + " --reason '...'");
  process.exit(0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Phase C 入口の autonomy ゲート（L1 基盤・kill switch）。
  // --check（台帳照合のみ・読み取り）は paused でも許可する。
  // 投稿準備 / 記録 / 失敗記録は paused: true なら停止。
  if (!args.check) {
    const g = gate({ phase: "phase_c", trigger: "manual" });
    if (!g.allowed) {
      console.error(`[autonomy] BLOCK: ${g.reason}（data/automation/autonomy.json の paused を確認してください）`);
      await notifyAutonomyEvent({ slug: args.slug || "phase-c", status: "autonomy_blocked", title: `[autonomy] Phase C停止: ${g.reason}` }).catch(() => {});
      process.exit(1);
    }
  }

  if (args.check) return modeCheck(args.slug);
  if (args.record) return modeRecord(args);
  if (args.error) return modeError(args);

  // デフォルト: Chrome 投稿準備
  return modeChrome(args);
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
