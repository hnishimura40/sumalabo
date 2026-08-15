#!/usr/bin/env node
import crypto from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch { return fallback; }
}

function sha256(file) {
  return crypto.createHash("sha256").update(readFileSync(file)).digest("hex");
}

function resolveArtifact(root, value) {
  const normalized = String(value || "").replace(/^\//, "");
  return path.isAbsolute(normalized) ? normalized : path.resolve(root, normalized.startsWith("images/") ? path.join("public", normalized) : normalized);
}

export function pendingBundlePath({ root = ROOT, slug, runId }) {
  return path.join(root, "logs", "social", `${slug}.${runId}.x-pending.json`);
}

export function createPendingBundle({ root = ROOT, slug, runId, startedAt, warnings = [] }) {
  if (!slug || !runId || !startedAt) throw new Error("slug, runId and startedAt are required");
  const xPostFile = path.join(root, "logs", "social", `${slug}.x-post.json`);
  const xPost = readJson(xPostFile);
  if (!xPost) throw new Error(`x_post_json_missing:${xPostFile}`);
  const images = Array.isArray(xPost.attachmentPlan?.attach) ? xPost.attachmentPlan.attach : [];
  if (images.length !== 4 || new Set(images).size !== 4) throw new Error(`x_attachment_plan_invalid:${images.length}`);
  const resolvedImages = images.map((item) => resolveArtifact(root, item));
  const missing = resolvedImages.filter((file) => !existsSync(file));
  if (missing.length) throw new Error(`x_images_missing:${missing.join(",")}`);
  if (!xPost.primary?.text || /https?:\/\//i.test(xPost.primary.text)) throw new Error("x_primary_invalid");
  const articleUrl = `https://sumalabo.com/articles/${slug}/`;
  if (String(xPost.reply?.text || "").trim() !== articleUrl) throw new Error("x_reply_invalid");
  const manifest = {
    schemaVersion: 1,
    state: "x_pending",
    slug,
    runId,
    startedAt,
    createdAt: new Date().toISOString(),
    articleUrl,
    warningChecks: [...new Set(warnings.map(String).filter(Boolean))],
    xPost: { path: path.relative(root, xPostFile).replace(/\\/g, "/"), sha256: sha256(xPostFile) },
    primary: { text: xPost.primary.text, charCount: xPost.primary.charCount },
    reply: { text: xPost.reply.text },
    images: resolvedImages.map((file, index) => ({ index, path: path.relative(root, file).replace(/\\/g, "/"), sha256: sha256(file) })),
    recoveryCommand: `npm run social:recover-x-pending -- --slug ${slug}`,
  };
  const file = pendingBundlePath({ root, slug, runId });
  if (existsSync(file)) throw new Error(`x_pending_manifest_exists:${file}`);
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, file };
}

export function latestPendingBundle({ root = ROOT, slug, runId = null }) {
  const directory = path.join(root, "logs", "social");
  if (!existsSync(directory)) return null;
  const values = readdirSync(directory)
    .filter((name) => name.endsWith(".x-pending.json") && (!slug || name.startsWith(`${slug}.`)))
    .map((name) => ({ file: path.join(directory, name), value: readJson(path.join(directory, name)) }))
    .filter(({ value }) => value?.state === "x_pending" && (!runId || value.runId === runId))
    .sort((a, b) => Date.parse(b.value.createdAt) - Date.parse(a.value.createdAt));
  return values[0] ? { ...values[0].value, file: values[0].file } : null;
}

export function verifyPendingBundle({ root = ROOT, slug, runId = null }) {
  const manifest = latestPendingBundle({ root, slug, runId });
  if (!manifest) return { ok: false, reason: "x_pending_manifest_missing" };
  const xPostFile = path.resolve(root, manifest.xPost.path);
  if (!existsSync(xPostFile) || sha256(xPostFile) !== manifest.xPost.sha256) return { ok: false, reason: "x_post_json_changed", file: manifest.file };
  if (!Array.isArray(manifest.images) || manifest.images.length !== 4) return { ok: false, reason: "x_pending_images_invalid", file: manifest.file };
  for (const image of manifest.images) {
    const file = path.resolve(root, image.path);
    if (!existsSync(file) || sha256(file) !== image.sha256) return { ok: false, reason: "x_pending_image_changed", image: image.path, file: manifest.file };
  }
  return { ok: true, slug: manifest.slug, runId: manifest.runId, createdAt: manifest.createdAt, warningChecks: manifest.warningChecks, file: manifest.file, recoveryCommand: manifest.recoveryCommand };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next == null || next.startsWith("--")) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const root = args.root ? path.resolve(args.root) : ROOT;
  if (command === "create") {
    console.log(JSON.stringify(createPendingBundle({ root, slug: args.slug, runId: args["run-id"], startedAt: args["started-at"], warnings: String(args.warnings || "").split(",") }), null, 2));
    return;
  }
  if (command === "verify") {
    const result = verifyPendingBundle({ root, slug: args.slug, runId: args["run-id"] || null });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 30;
    return;
  }
  console.error("usage: create|verify --slug X [--run-id ID]");
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
