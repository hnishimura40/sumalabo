import test from "node:test";
import assert from "node:assert/strict";
import { scanTextForSecrets } from "../../scripts/automation/secret-scan.mjs";

test("GA4鍵事故型のGoogleサービスアカウント鍵を検出する", () => {
  const synthetic = JSON.stringify({
    type: "service_" + "account",
    private_key_id: "fixture-not-real",
    private_key: "-----BEGIN " + "PRIVATE KEY-----\\nfixture\\n-----END PRIVATE KEY-----",
    client_email: "fixture@example.invalid",
  });
  const kinds = scanTextForSecrets(synthetic, "ga4-fixture.json").map((v) => v.kind);
  assert.ok(kinds.includes("google_service_account"));
  assert.ok(kinds.includes("private_key"));
});

test("通常の記事本文や環境変数名だけでは止めない", () => {
  assert.deepEqual(scanTextForSecrets("OpenAI公式を確認。CLOUDFLARE_API_TOKEN は環境変数から読む。"), []);
});
