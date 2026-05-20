// tests/sumahon/verify-checks.test.mjs
//
// verify-publication.ts の 2 つの check の挙動を pin する単体テスト:
//
//   1. hasThumbnailRef
//      `/images/thumbnails/{slug}.<ext>` の存在を HTML 内で検出する。
//      WebP 移行後も PNG / JPG / JPEG / AVIF 拡張子を許容する。
//      slug 内の正規表現メタ文字 (. * + ? 等) はエスケープ前提。
//
//   2. noProhibitedCopy
//      「普通の人」を全文検索し、0 件のときだけ pass。
//
// 本ファイルは TypeScript ソースを直接 import せず、verify-publication.ts
// と同じ「形」のロジックを JS で再現する mini check を持って仕様を
// 固定する (slide-safety.test.mjs と同じ pattern)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

// ----- mini implementation mirroring verify-publication.ts -----

function hasThumbnailRef(html, slug) {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/images/thumbnails/${escaped}\\.(png|webp|jpe?g|avif)`, "i").test(html);
}

function noProhibitedCopy(html) {
  const matches = (html.match(/普通の人/g) || []).length;
  return { ok: matches === 0, matches };
}

// ----- hasThumbnailRef tests -----

test("hasThumbnailRef: WebP thumbnail passes (post WebP migration)", () => {
  const html = `<meta property="og:image" content="https://sumalabo.com/images/thumbnails/202605-google-gemini-omni-avatar-video-launch.webp">`;
  assert.equal(hasThumbnailRef(html, "202605-google-gemini-omni-avatar-video-launch"), true);
});

test("hasThumbnailRef: PNG thumbnail still passes (backward compatible)", () => {
  const html = `<img src="/images/thumbnails/some-article.png" alt="..." />`;
  assert.equal(hasThumbnailRef(html, "some-article"), true);
});

test("hasThumbnailRef: JPEG / JPG / AVIF thumbnails pass", () => {
  for (const ext of ["jpg", "jpeg", "avif"]) {
    const html = `<img src="/images/thumbnails/test-${ext}.${ext}">`;
    assert.equal(hasThumbnailRef(html, `test-${ext}`), true, `ext=${ext}`);
  }
});

test("hasThumbnailRef: extension case-insensitive (e.g. .PNG / .WEBP)", () => {
  assert.equal(hasThumbnailRef(`<img src="/images/thumbnails/foo.PNG">`, "foo"), true);
  assert.equal(hasThumbnailRef(`<img src="/images/thumbnails/bar.WEBP">`, "bar"), true);
});

test("hasThumbnailRef: missing thumbnail returns false", () => {
  const html = `<p>article body only, no thumbnail ref</p>`;
  assert.equal(hasThumbnailRef(html, "some-article"), false);
});

test("hasThumbnailRef: wrong slug returns false", () => {
  const html = `<img src="/images/thumbnails/other-article.webp">`;
  assert.equal(hasThumbnailRef(html, "expected-article"), false);
});

test("hasThumbnailRef: slug with regex metacharacters is escaped (e.g. dots)", () => {
  // slug が "v1.0" のような場合、正規表現の . メタを literal として扱う必要がある
  const html = `<img src="/images/thumbnails/v1.0.webp">`;
  assert.equal(hasThumbnailRef(html, "v1.0"), true);
  // "v1X0" のような偽マッチを起こさないこと
  const fakeHtml = `<img src="/images/thumbnails/v1X0.webp">`;
  assert.equal(hasThumbnailRef(fakeHtml, "v1.0"), false);
});

test("hasThumbnailRef: extension svg / gif は許容しない (画像最適化ポリシー外)", () => {
  assert.equal(hasThumbnailRef(`<img src="/images/thumbnails/foo.svg">`, "foo"), false);
  assert.equal(hasThumbnailRef(`<img src="/images/thumbnails/foo.gif">`, "foo"), false);
});

// ----- noProhibitedCopy tests -----

test("noProhibitedCopy: clean HTML returns ok=true, matches=0", () => {
  const html = `<p>この記事は生活者向けに整理しています。</p>`;
  const r = noProhibitedCopy(html);
  assert.equal(r.ok, true);
  assert.equal(r.matches, 0);
});

test("noProhibitedCopy: contains 普通の人 returns ok=false with count", () => {
  const html = `<p>これは普通の人にも関係あるニュースです。</p>`;
  const r = noProhibitedCopy(html);
  assert.equal(r.ok, false);
  assert.equal(r.matches, 1);
});

test("noProhibitedCopy: 普通の人向け も「普通の人」を含むため検出される", () => {
  const html = `<p>普通の人向けに整理しました。</p>`;
  const r = noProhibitedCopy(html);
  assert.equal(r.ok, false);
  assert.equal(r.matches, 1);
});

test("noProhibitedCopy: 普通の or 一般の人 など類似だが別表現は許可", () => {
  for (const phrase of ["普通の", "一般の人", "生活者", "みんな", "誰でも"]) {
    const html = `<p>${phrase}向けに書きました。</p>`;
    const r = noProhibitedCopy(html);
    assert.equal(r.ok, true, `phrase=${phrase} should be allowed`);
  }
});

// ----- regression: ensure the gemini-omni article (post-fix) is clean -----

test("regression: gemini-omni mdx contains 0 occurrences of 普通の人 after fix", () => {
  const mdxPath = join(
    ROOT,
    "content",
    "articles",
    "202605-google-gemini-omni-avatar-video-launch.mdx",
  );
  if (!existsSync(mdxPath)) {
    // 記事ファイルがない環境ではテストをスキップ (worktree によっては別ブランチ)
    return;
  }
  const mdx = readFileSync(mdxPath, "utf-8");
  const matches = (mdx.match(/普通の人/g) || []).length;
  assert.equal(matches, 0, `普通の人 should not appear in fixed article, found ${matches}`);
});

test("regression: gemini-omni mdx references .webp thumbnail (WebP migration)", () => {
  const mdxPath = join(
    ROOT,
    "content",
    "articles",
    "202605-google-gemini-omni-avatar-video-launch.mdx",
  );
  if (!existsSync(mdxPath)) {
    return;
  }
  const mdx = readFileSync(mdxPath, "utf-8");
  assert.match(
    mdx,
    /thumbnail:\s*"\/images\/thumbnails\/202605-google-gemini-omni-avatar-video-launch\.webp"/,
    "thumbnail should reference .webp",
  );
});
