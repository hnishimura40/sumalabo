#!/usr/bin/env node
// scripts/maintenance/safe-worktree-remove.mjs — worktree を安全に撤去する。
//
// 背景（2026-07-25/26 に 3 回起きた node_modules 消失）:
//   worktree 内に本体 node_modules への symlink / junction が張られていると、
//   `git worktree remove --force` がリンクを辿って **本体側の実体を削除する**。
//   3 回目は「リンクあり」を検出して表示までしたのに、同じコマンドチェーンで
//   撤去まで走らせてしまい再発した。**検出は撤去を止めなければ意味がない**。
//
// そこでこのスクリプトは、各段階を「失敗したら即中止（先へ進まない）」の
// ゲートとして実装する。撤去は必ずこれを経由すること（生の
// `git worktree remove` を直接叩かない。CLAUDE.md の店じまいチェックリスト参照）。
//
// 処理フロー（いずれか失敗で即中止）:
//   1. 対象 worktree 内の node_modules を検出し、symlink / junction / 実体を判別
//   2. symlink / junction なら除去（実体ディレクトリはそのままで可）
//   3. 本体リポジトリの node_modules 健全性を確認（astro が解決できること）
//   4. git worktree remove を実行
//   5. 撤去後に再度 本体の健全性を確認
//   6. git worktree list を表示
//
// 使い方:
//   node scripts/maintenance/safe-worktree-remove.mjs <worktree-path> [--force] [--dry-run]
//   npm run worktree:remove -- <worktree-path> --force
//
// 終了コード: 0 = 撤去成功 / 1 = 中止（ゲート不合格・引数エラー）

import { existsSync, lstatSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

// ---- 純関数（テスト対象） ----

/**
 * node_modules の種別を判定する。
 * 戻り値: { kind: "none"|"symlink"|"junction"|"directory", path, entryCount }
 * Windows の junction は lstat では directory に見え isSymbolicLink() が false に
 * なるため、実体ディレクトリと区別するには中身の有無だけでは足りない。
 * ここでは fs の情報で判別できる範囲（symlink か否か）＋ 呼び出し側が渡す
 * junction 判定関数で切り分ける。
 */
export function classifyNodeModules(worktreePath, { isJunction } = {}) {
  const p = path.join(worktreePath, "node_modules");
  let st;
  try {
    st = lstatSync(p);
  } catch {
    return { kind: "none", path: p, entryCount: 0 };
  }
  if (st.isSymbolicLink()) {
    return { kind: "symlink", path: p, entryCount: 0 };
  }
  if (st.isDirectory()) {
    if (typeof isJunction === "function" && isJunction(p)) {
      return { kind: "junction", path: p, entryCount: 0 };
    }
    let entryCount = 0;
    try {
      entryCount = readdirSync(p).length;
    } catch {
      entryCount = 0;
    }
    return { kind: "directory", path: p, entryCount };
  }
  return { kind: "none", path: p, entryCount: 0 };
}

/** 撤去してよいか（リンク種別が解消済みか）を判定する純関数。 */
export function canProceedAfterLinkHandling(kind) {
  // none / directory は本体を巻き込まないので撤去してよい。
  // symlink / junction が残っていたら撤去してはいけない。
  return kind === "none" || kind === "directory";
}

/** 本体 node_modules の健全性（astro が解決できるか）。 */
export function isRepoNodeModulesHealthy(repoRoot = REPO_ROOT) {
  const pkg = path.join(repoRoot, "node_modules", "astro", "package.json");
  const bin = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "astro.cmd" : "astro",
  );
  return existsSync(pkg) && existsSync(bin);
}

// ---- 実行系 ----

function log(msg) {
  console.log(msg);
}

function abort(msg) {
  console.error(`\n✗ 中止: ${msg}`);
  console.error("  本体を壊さないため、ここで処理を打ち切りました。手当てしてから再実行してください。");
  process.exit(1);
}

/** Windows の junction 判定（PowerShell の LinkType を見る）。 */
function isJunctionWin(p) {
  if (process.platform !== "win32") return false;
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", `(Get-Item -LiteralPath '${p.replace(/'/g, "''")}' -Force).LinkType`],
    { encoding: "utf-8", windowsHide: true },
  );
  const out = (r.stdout || "").trim();
  return out === "Junction" || out === "SymbolicLink";
}

/** symlink / junction を、指す先を消さずに外す。 */
function removeLink(target, kind) {
  if (kind === "symlink") {
    unlinkSync(target);
    return;
  }
  // junction は rmdir 相当で「リンクだけ」外れる（rmSync の recursive は使わない）
  rmSync(target, { recursive: false });
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const target = args.find((a) => !a.startsWith("--"));

  if (!target) {
    console.error("Usage: node scripts/maintenance/safe-worktree-remove.mjs <worktree-path> [--force] [--dry-run]");
    process.exit(1);
  }
  const wt = path.resolve(target);
  if (!existsSync(wt)) abort(`worktree が見つかりません: ${wt}`);

  log(`=== safe-worktree-remove: ${wt} ===`);

  // (1) 検出
  const nm = classifyNodeModules(wt, { isJunction: isJunctionWin });
  const label = {
    none: "なし",
    symlink: "シンボリックリンク（★本体を巻き込む危険）",
    junction: "ジャンクション（★本体を巻き込む危険）",
    directory: `実体ディレクトリ（${nm.entryCount} 件・本体とは無関係）`,
  }[nm.kind];
  log(`[1/6] node_modules 検出: ${label}`);

  // (2) リンクなら除去（実体はそのまま）
  if (nm.kind === "symlink" || nm.kind === "junction") {
    if (dryRun) {
      log("[2/6] --dry-run のためリンク除去をスキップ（実行時は除去します）");
      log("dry-run 終了");
      process.exit(0);
    }
    try {
      removeLink(nm.path, nm.kind);
      log("[2/6] リンクを除去しました（指す先の本体 node_modules は残ります）");
    } catch (e) {
      abort(`リンクの除去に失敗しました: ${e.message}`);
    }
    const after = classifyNodeModules(wt, { isJunction: isJunctionWin });
    if (!canProceedAfterLinkHandling(after.kind)) {
      abort(`リンクが残っています（kind=${after.kind}）。撤去すると本体を巻き込みます`);
    }
  } else {
    log("[2/6] 除去不要（リンクではありません）");
  }

  // (3) 撤去前の本体健全性
  if (!isRepoNodeModulesHealthy()) {
    abort("撤去前チェック: 本体の node_modules で astro が解決できません（先に npm ci で復旧してください）");
  }
  log("[3/6] 撤去前の本体 node_modules: 健全（astro 解決 OK）");

  if (dryRun) {
    log("[4/6] --dry-run のため git worktree remove は実行しません");
    log("dry-run 終了（ここまでのゲートは全て通過）");
    process.exit(0);
  }

  // (4) 撤去
  const rmArgs = ["worktree", "remove", wt];
  if (force) rmArgs.push("--force");
  const r = spawnSync("git", rmArgs, { cwd: REPO_ROOT, encoding: "utf-8", windowsHide: true });
  if (r.status !== 0) {
    abort(`git worktree remove が失敗しました: ${(r.stderr || "").trim()}`);
  }
  log("[4/6] git worktree remove: 成功");

  // (5) 撤去後の本体健全性
  if (!isRepoNodeModulesHealthy()) {
    console.error("\n✗ 撤去後チェック: 本体の node_modules が壊れました。直ちに `npm ci` で復旧してください。");
    process.exit(1);
  }
  log("[5/6] 撤去後の本体 node_modules: 健全（astro 解決 OK）");

  // (6) 最終状態
  const list = spawnSync("git", ["worktree", "list"], { cwd: REPO_ROOT, encoding: "utf-8", windowsHide: true });
  log("[6/6] git worktree list:");
  log((list.stdout || "").trimEnd());
  log("\n✓ 撤去完了");
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
