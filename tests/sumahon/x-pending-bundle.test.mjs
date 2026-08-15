import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPendingBundle, verifyPendingBundle } from "../../scripts/automation/x-pending-bundle.mjs";

const SLUG = "202608-x-pending-test";
const RUN_ID = "20260815T043000.000";

function fixture({ imageCount = 4 } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-x-pending-"));
  mkdirSync(path.join(root, "logs", "social"), { recursive: true });
  mkdirSync(path.join(root, "public", "images", "pending"), { recursive: true });
  const images = [];
  for (let index = 0; index < imageCount; index += 1) {
    const relative = `public/images/pending/${index}.png`;
    writeFileSync(path.join(root, relative), `image-${index}`);
    images.push(relative);
  }
  writeFileSync(path.join(root, "logs", "social", `${SLUG}.x-post.json`), JSON.stringify({
    articleUrl: `https://sumalabo.com/articles/${SLUG}/`,
    primary: { text: "X pending test #すまラボ", charCount: 24 },
    reply: { text: `https://sumalabo.com/articles/${SLUG}/` },
    attachmentPlan: { attach: images },
  }));
  return root;
}

test("X pending bundle preserves post, reply and exactly four hashed images", () => {
  const root = fixture();
  const created = createPendingBundle({ root, slug: SLUG, runId: RUN_ID, startedAt: "2026-08-14T19:30:00.000Z", warnings: ["x_login_href"] });
  assert.equal(created.images.length, 4);
  assert.equal(created.reply.text, `https://sumalabo.com/articles/${SLUG}/`);
  assert.match(created.recoveryCommand, /social:recover-x-pending/);
  assert.deepEqual(created.warningChecks, ["x_login_href"]);
  assert.equal(verifyPendingBundle({ root, slug: SLUG, runId: RUN_ID }).ok, true);
});

test("X pending bundle refuses an incomplete image set", () => {
  const root = fixture({ imageCount: 3 });
  assert.throws(() => createPendingBundle({ root, slug: SLUG, runId: RUN_ID, startedAt: "2026-08-14T19:30:00.000Z", warnings: ["dom_read"] }), /x_attachment_plan_invalid:3/);
});
