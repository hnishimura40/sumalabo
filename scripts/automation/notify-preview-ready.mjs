// notify-preview-ready.mjs
//
// CLI wrapper around scripts/sumahon/notify-review-ready.mjs's
// `notifyReviewReady`. Designed to be invoked by
// scripts/automation/run-claude-preview-pipeline-once.ps1 (Stage 11)
// AFTER the orchestrator has resolved a real preview URL from
// `wrangler pages deploy`.
//
// Usage:
//   node scripts/automation/notify-preview-ready.mjs \
//     --slug <slug> \
//     --title <title> \
//     --preview-url <url> \
//     --branch <branch> \
//     [--thumbnail <path>] \
//     [--pr-url <url>] \
//     [--source-url <url>] \
//     [--out <result.json>]
//
// Env:
//   REVIEW_NOTIFY_SECRET   (required, inherited from user env)
//   REVIEW_NOTIFY_API_URL  (optional, default https://sumalabo.com/api/push/notify-review-ready)
//
// Output:
//   Writes a result JSON to stdout AND (if --out is given) to the file.
//   Exit code 0 on success, 1 on failure.
//
// Safety:
//   - Never prints the secret value, only `secretConfigured: true/false`.
//   - Never prints the full API URL with secrets in query (the API uses a
//     header for the secret, not a query string).
//   - Never accepts a secret via CLI argument.

import { writeFile } from "node:fs/promises";
import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function safeApiHost(apiUrl) {
  if (!apiUrl) return null;
  try {
    const u = new URL(apiUrl);
    return u.host;
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const slug = (args["slug"] || "").toString();
  const title = (args["title"] || "").toString();
  const previewUrl = (args["preview-url"] || "").toString();
  const branch = (args["branch"] || "").toString();
  const thumbnail = (args["thumbnail"] || "").toString();
  const prUrl = (args["pr-url"] || "").toString();
  const sourceUrl = (args["source-url"] || "").toString();
  const outPath = (args["out"] || "").toString();

  const errors = [];
  if (!slug) errors.push("--slug is required");
  if (!previewUrl) errors.push("--preview-url is required");
  if (!previewUrl.startsWith("https://")) errors.push("--preview-url must start with https://");

  if (errors.length) {
    const fail = {
      ok: false,
      reason: "invalid_args",
      message: errors.join("; "),
      status: 0,
    };
    process.stdout.write(JSON.stringify(fail) + "\n");
    if (outPath) await writeFile(outPath, JSON.stringify(fail, null, 2) + "\n", "utf-8");
    process.exit(1);
  }

  const item = {
    slug,
    title: title || slug,
    branch: branch || undefined,
    previewUrl,
    thumbnail: thumbnail || undefined,
    prUrl: prUrl || undefined,
    sourceUrl: sourceUrl || undefined,
    status: "review",
    createdAt: new Date().toISOString(),
  };

  const apiUrl = process.env.REVIEW_NOTIFY_API_URL || "https://sumalabo.com/api/push/notify-review-ready";
  const apiHost = safeApiHost(apiUrl);
  const secretConfigured =
    typeof process.env.REVIEW_NOTIFY_SECRET === "string" && process.env.REVIEW_NOTIFY_SECRET.length > 0;

  // Diagnostic line to stderr (does NOT include the secret value).
  process.stderr.write(
    `[notify-preview-ready] slug=${slug} previewUrl=${previewUrl} branch=${branch || "(none)"} apiHost=${apiHost || "(unknown)"} secretConfigured=${secretConfigured}\n`
  );

  const result = await notifyReviewReady({ item });

  // Sanitize the result before printing. The helper never includes the
  // secret itself, but we drop any meta that could change shape.
  const summary = {
    ok: !!result.ok,
    sent: result.ok ? 1 : 0,
    status: typeof result.status === "number" ? result.status : 0,
    slug,
    previewUrl,
    branch: branch || null,
    prUrl: prUrl || null,
    apiHost,
    secretConfigured,
    skipped: result.skipped || false,
    reason: result.reason || result.message || null,
    response: result.response && typeof result.response === "object" ? {
      ok: result.response.ok || false,
      message: typeof result.response.message === "string" ? result.response.message.slice(0, 300) : null,
      sent: typeof result.response.sent === "number" ? result.response.sent : null,
      total: typeof result.response.total === "number" ? result.response.total : null,
    } : null,
  };

  if (outPath) {
    try {
      await writeFile(outPath, JSON.stringify(summary, null, 2) + "\n", "utf-8");
    } catch (err) {
      process.stderr.write(`[notify-preview-ready] failed to write --out: ${err && err.message ? err.message : err}\n`);
    }
  }

  // Print the result LAST and set exitCode (do not call process.exit) so
  // the Node v24 libuv async-cleanup assertion doesn't surface on Windows.
  process.stdout.write(JSON.stringify(summary) + "\n");
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((err) => {
  const fail = {
    ok: false,
    reason: "uncaught",
    message: String(err && err.message ? err.message : err),
    status: 0,
  };
  process.stdout.write(JSON.stringify(fail) + "\n");
  process.exitCode = 1;
});
