// tests/sumahon/safe-worktree-remove.test.mjs
// worktree 安全撤去スクリプトの「検出」と「中止分岐」が機能することを確認する。
// 本体 node_modules 消失事故（2026-07-25/26 に 3 回）の再発防止が目的なので、
// 「リンクを検出したら撤去へ進ませない」ことをテストの主眼に置く。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyNodeModules,
  canProceedAfterLinkHandling,
  isRepoNodeModulesHealthy,
} from "../../scripts/maintenance/safe-worktree-remove.mjs";

function tmpWorktree() {
  return mkdtempSync(path.join(os.tmpdir(), "wt-test-"));
}

test("1. node_modules が無ければ kind=none で撤去に進める", () => {
  const wt = tmpWorktree();
  try {
    const r = classifyNodeModules(wt);
    assert.equal(r.kind, "none");
    assert.equal(canProceedAfterLinkHandling(r.kind), true, "none は本体を巻き込まないので進んでよい");
  } finally {
    rmSync(wt, { recursive: true, force: true });
  }
});

test("2. 実体ディレクトリは kind=directory で撤去に進める（件数も数える）", () => {
  const wt = tmpWorktree();
  try {
    const nm = path.join(wt, "node_modules");
    mkdirSync(nm);
    mkdirSync(path.join(nm, "astro"));
    writeFileSync(path.join(nm, "dummy.txt"), "x");
    const r = classifyNodeModules(wt);
    assert.equal(r.kind, "directory");
    assert.equal(r.entryCount, 2);
    assert.equal(canProceedAfterLinkHandling(r.kind), true, "実体は本体と無関係なので進んでよい");
  } finally {
    rmSync(wt, { recursive: true, force: true });
  }
});

test("3. ★シンボリックリンクは kind=symlink で撤去を中止する（本体巻き込み防止）", () => {
  const wt = tmpWorktree();
  const realNm = tmpWorktree(); // 本体 node_modules に見立てた実体
  try {
    mkdirSync(path.join(realNm, "astro"), { recursive: true });
    try {
      symlinkSync(realNm, path.join(wt, "node_modules"), "junction");
    } catch {
      return; // 権限等で symlink を作れない環境ではスキップ
    }
    const r = classifyNodeModules(wt);
    assert.ok(r.kind === "symlink" || r.kind === "junction", `リンクとして検出される (kind=${r.kind})`);
    assert.equal(
      canProceedAfterLinkHandling(r.kind),
      false,
      "リンクが残ったまま撤去へ進んではいけない（3回の消失事故の原因）",
    );
  } finally {
    rmSync(wt, { recursive: true, force: true });
    rmSync(realNm, { recursive: true, force: true });
  }
});

test("4. ジャンクション判定関数が true を返す場合も撤去を中止する", () => {
  const wt = tmpWorktree();
  try {
    mkdirSync(path.join(wt, "node_modules"));
    // Windows の junction は lstat では directory に見えるため、判定関数で切り分ける
    const r = classifyNodeModules(wt, { isJunction: () => true });
    assert.equal(r.kind, "junction");
    assert.equal(canProceedAfterLinkHandling(r.kind), false, "ジャンクションも撤去を止める");

    // 判定関数が false を返せば実体扱いで進める
    const r2 = classifyNodeModules(wt, { isJunction: () => false });
    assert.equal(r2.kind, "directory");
    assert.equal(canProceedAfterLinkHandling(r2.kind), true);
  } finally {
    rmSync(wt, { recursive: true, force: true });
  }
});

test("5. 本体健全性チェックは astro が無いディレクトリを不健全と判定する", () => {
  const fake = tmpWorktree();
  try {
    assert.equal(isRepoNodeModulesHealthy(fake), false, "astro が無ければ false（撤去前ゲートで止まる）");
  } finally {
    rmSync(fake, { recursive: true, force: true });
  }
});
