#!/usr/bin/env node
// Codex画像出力のライフサイクル管理。
// 生成 → 独立検品合格 → リポジトリ正本採用 → 本番deploy/verify成功の証跡が
// そろった記事だけを月別archiveへ移し、30日経過後に削除する。

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DEFAULT_OUTPUT_ROOT = "D:\\downloads\\sumalabo-codex";
export const STATE_FILE = ".sumalabo-image-state.json";
export const LEDGER_FILE = "cleanup-ledger.jsonl";
export const RETENTION_DAYS = 30;

function outputRoot(override) {
  return path.resolve(override || process.env.SUMALABO_CODEX_IMAGE_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT);
}

function validSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(slug);
}

function assertSlug(slug) {
  if (!validSlug(slug)) throw new Error(`invalid_slug:${slug || "(empty)"}`);
}

function directOutputDir(slug, rootOverride) {
  assertSlug(slug);
  return path.join(outputRoot(rootOverride), slug);
}

function statePath(slug, rootOverride) {
  return path.join(directOutputDir(slug, rootOverride), STATE_FILE);
}

function readJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
  catch { return fallback; }
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ledger(rootOverride, event) {
  const root = outputRoot(rootOverride);
  mkdirSync(root, { recursive: true });
  appendFileSync(path.join(root, LEDGER_FILE), `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf8");
}

export function updateImageOutputState(slug, patch, { root: rootOverride } = {}) {
  const file = statePath(slug, rootOverride);
  if (!existsSync(path.dirname(file))) throw new Error(`output_dir_missing:${path.dirname(file)}`);
  const prior = readJson(file, { schemaVersion: 1, slug });
  const next = {
    ...prior,
    ...patch,
    slug,
    updatedAt: new Date().toISOString(),
  };
  writeJson(file, next);
  return next;
}

export function markGenerated(slug, outputs, options = {}) {
  return updateImageOutputState(slug, {
    generation: {
      status: "complete",
      completedAt: new Date().toISOString(),
      outputCount: outputs.length,
      outputs: outputs.map(({ id, path: file, width, height, sha256, bytes }) => ({ id, file, width, height, sha256, bytes })),
    },
  }, options);
}

export function markInspection(slug, { pass, source, regenerated = 0 }, options = {}) {
  return updateImageOutputState(slug, {
    inspection: {
      status: pass ? "passed" : "failed",
      checkedAt: new Date().toISOString(),
      source: source || null,
      regenerated,
    },
  }, options);
}

export function markAdopted(slug, destinations, options = {}) {
  return updateImageOutputState(slug, {
    adoption: {
      status: "complete",
      completedAt: new Date().toISOString(),
      destinations,
    },
  }, options);
}

function adoptionExists(state) {
  const destinations = state?.adoption?.destinations;
  return state?.adoption?.status === "complete"
    && Array.isArray(destinations)
    && destinations.length > 0
    && destinations.every((file) => existsSync(file));
}

function deploySucceeded(proof) {
  return proof?.ok === true
    && proof?.verifyStatus === "ok"
    && (!proof?.postPublishStatus || proof.postPublishStatus === "ok" || proof.postPublishStatus === "skipped");
}

export function archiveAfterSuccessfulDeploy({ slug, deploymentProof, root: rootOverride, now = new Date(), dryRun = false }) {
  const root = outputRoot(rootOverride);
  const source = directOutputDir(slug, root);
  if (!existsSync(source)) return { ok: true, status: "not_found", slug, source };
  const state = readJson(path.join(source, STATE_FILE));
  if (state?.inspection?.status !== "passed") {
    ledger(root, { action: "archive_skipped", slug, reason: "inspection_not_passed", source });
    return { ok: true, status: "skipped", reason: "inspection_not_passed", slug, source };
  }
  if (!adoptionExists(state)) {
    ledger(root, { action: "archive_skipped", slug, reason: "repository_adoption_not_proven", source });
    return { ok: true, status: "skipped", reason: "repository_adoption_not_proven", slug, source };
  }
  if (!deploySucceeded(deploymentProof)) {
    ledger(root, { action: "archive_skipped", slug, reason: "deployment_not_verified", source });
    return { ok: true, status: "skipped", reason: "deployment_not_verified", slug, source };
  }

  const month = now.toISOString().slice(0, 7).replace("-", "");
  const destination = path.join(root, "archive", month, slug);
  if (existsSync(destination)) {
    ledger(root, { action: "archive_skipped", slug, reason: "destination_exists", source, destination });
    return { ok: true, status: "skipped", reason: "destination_exists", slug, source, destination };
  }
  if (dryRun) return { ok: true, status: "would_archive", slug, source, destination };

  const archivedAt = now.toISOString();
  writeJson(path.join(source, STATE_FILE), {
    ...state,
    archive: { status: "archived", archivedAt, destination },
    deployment: deploymentProof,
    updatedAt: archivedAt,
  });
  mkdirSync(path.dirname(destination), { recursive: true });
  renameSync(source, destination);
  ledger(root, { action: "archive_moved", slug, source, destination, archivedAt });
  return { ok: true, status: "archived", slug, source, destination, archivedAt };
}

function archivedSlugDirs(rootOverride) {
  const archiveRoot = path.join(outputRoot(rootOverride), "archive");
  if (!existsSync(archiveRoot)) return [];
  const found = [];
  for (const month of readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!month.isDirectory() || !/^\d{6}$/.test(month.name)) continue;
    const monthDir = path.join(archiveRoot, month.name);
    for (const article of readdirSync(monthDir, { withFileTypes: true })) {
      if (article.isDirectory() && validSlug(article.name)) found.push(path.join(monthDir, article.name));
    }
  }
  return found;
}

export function pruneExpiredArchives({ root: rootOverride, now = new Date(), retentionDays = RETENTION_DAYS, dryRun = false } = {}) {
  const root = outputRoot(rootOverride);
  const cutoff = now.getTime() - retentionDays * 86400000;
  const results = [];
  for (const dir of archivedSlugDirs(root)) {
    const state = readJson(path.join(dir, STATE_FILE), {});
    const archivedMs = Date.parse(state?.archive?.archivedAt || "") || statSync(dir).mtimeMs;
    if (archivedMs > cutoff) continue;
    const slug = path.basename(dir);
    if (dryRun) {
      results.push({ slug, status: "would_delete", directory: dir });
      continue;
    }
    rmSync(dir, { recursive: true, force: true });
    ledger(root, {
      action: "archive_expired_deleted",
      slug,
      directory: dir,
      archivedAt: new Date(archivedMs).toISOString(),
      retentionDays,
    });
    results.push({ slug, status: "deleted", directory: dir });
  }
  return { ok: true, retentionDays, deleted: results };
}

function directArticleDirs(rootOverride) {
  const root = outputRoot(rootOverride);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive" && validSlug(entry.name))
    .map((entry) => entry.name);
}

function legacyInspectionProof(slug, repoRoot) {
  const factcheck = path.join(repoRoot, "logs", "article", `${slug}.factcheck.json`);
  const fc = readJson(factcheck);
  if (fc?.pass === true) return { pass: true, source: factcheck };
  const trial = path.join(repoRoot, "logs", "article", `${slug}.codex-image-trial-report.md`);
  if (existsSync(trial)) {
    const text = readFileSync(trial, "utf8");
    if (text.includes("## 目視検品") && text.includes("`orchestrator組み込み可`")) {
      return { pass: true, source: trial };
    }
  }
  return { pass: false, source: null };
}

function adoptedFiles(slug, repoRoot) {
  const thumbnail = path.join(repoRoot, "public", "images", "thumbnails", `${slug}.webp`);
  const articleDir = path.join(repoRoot, "public", "images", "articles", slug);
  const slides = existsSync(articleDir)
    ? readdirSync(articleDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".webp")).map((entry) => path.join(articleDir, entry.name))
    : [];
  return existsSync(thumbnail) && slides.length > 0 ? [thumbnail, ...slides] : [];
}

async function productionPublished(slug, baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/articles/${slug}/?image-cleanup=${Date.now()}`;
  try {
    const response = await fetch(url, { headers: { "cache-control": "no-cache" } });
    if (!response.ok) return { ok: false, status: response.status, url };
    const html = await response.text();
    return { ok: html.includes(`/articles/${slug}/`), status: response.status, url };
  } catch (error) {
    return { ok: false, status: 0, url, error: error.message || String(error) };
  }
}

// 2026-07-20導入時の既存フォルダ移行用。通常運用はdeploy末尾の
// archiveAfterSuccessfulDeployを使い、このreconcileを毎回は実行しない。
export async function reconcilePublishedOutputs({
  root: rootOverride,
  repoRoot = ROOT,
  baseUrl = "https://sumalabo.com",
  now = new Date(),
  dryRun = false,
} = {}) {
  const root = outputRoot(rootOverride);
  const productionBaseUrl = baseUrl || "https://sumalabo.com";
  const results = [];
  for (const slug of directArticleDirs(root)) {
    const article = path.join(repoRoot, "content", "articles", `${slug}.mdx`);
    const inspection = legacyInspectionProof(slug, repoRoot);
    const destinations = adoptedFiles(slug, repoRoot);
    const published = await productionPublished(slug, productionBaseUrl);
    if (!existsSync(article) || !inspection.pass || destinations.length === 0 || !published.ok) {
      const reason = !existsSync(article) ? "article_missing"
        : !inspection.pass ? "inspection_not_passed"
          : destinations.length === 0 ? "repository_adoption_not_proven"
            : "production_not_verified";
      ledger(root, { action: "reconcile_skipped", slug, reason, productionStatus: published.status });
      results.push({ slug, status: "skipped", reason, productionStatus: published.status });
      continue;
    }
    const manifest = readJson(path.join(repoRoot, "logs", "article", `${slug}.codex-images.json`), { outputs: [] });
    const rawFiles = readdirSync(directOutputDir(slug, root), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
      .map((entry) => ({ id: path.basename(entry.name, ".png"), path: path.join(directOutputDir(slug, root), entry.name) }));
    if (!dryRun) {
      markGenerated(slug, manifest.outputs?.length ? manifest.outputs : rawFiles, { root });
      markInspection(slug, { pass: true, source: inspection.source }, { root });
      markAdopted(slug, destinations, { root });
    }
    const archived = dryRun
      ? { ok: true, status: "would_archive", slug, source: directOutputDir(slug, root), destination: path.join(root, "archive", now.toISOString().slice(0, 7).replace("-", ""), slug) }
      : archiveAfterSuccessfulDeploy({
          slug,
          root,
          now,
          deploymentProof: {
            ok: true,
            verifyStatus: "ok",
            postPublishStatus: "ok",
            productionUrl: published.url.replace(/\?.*$/, ""),
            verifiedAt: now.toISOString(),
            source: "legacy_reconcile",
          },
        });
    results.push(archived);
  }
  return { ok: true, checked: results.length, results };
}

function parseArgs(argv) {
  const args = { archiveSlug: null, prune: false, reconcilePublished: false, dryRun: false, root: null, baseUrl: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--archive-slug") args.archiveSlug = argv[++i];
    else if (argv[i] === "--prune") args.prune = true;
    else if (argv[i] === "--reconcile-published") args.reconcilePublished = true;
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--root") args.root = argv[++i];
    else if (argv[i] === "--base-url") args.baseUrl = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prune) {
    console.log(JSON.stringify(pruneExpiredArchives(args), null, 2));
    return;
  }
  if (args.reconcilePublished) {
    console.log(JSON.stringify(await reconcilePublishedOutputs(args), null, 2));
    return;
  }
  if (args.archiveSlug) {
    console.error("--archive-slug はdeploy成功証跡を持つ公開フロー内部専用です。");
    process.exitCode = 2;
    return;
  }
  console.error("usage: --prune | --reconcile-published [--dry-run] [--root PATH] [--base-url URL]");
  process.exitCode = 2;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
