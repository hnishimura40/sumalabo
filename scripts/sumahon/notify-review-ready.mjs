// /api/push/notify-review-ready 呼び出しヘルパー。
//
// 目的:
//   Previewブランチpush + PR作成が完了したタイミングで、Cloudflare Pages 上の
//   通知API（/api/push/notify-review-ready）を叩いてPWA購読者へPush通知を送る。
//
// 設計方針:
//   - 例外を投げずに常に { ok, response, error } を返す（呼び出し側で warning ログにする）
//   - 通知送信失敗で Preview 作成自体を失敗扱いにしない
//   - APIレスポンス（成功・失敗とも）は呼び出し側で logs/preview か logs/automation に保存
//
// 環境変数:
//   - REVIEW_NOTIFY_SECRET（必須）
//   - REVIEW_NOTIFY_API_URL（任意、既定 https://sumalabo.com/api/push/notify-review-ready）

const DEFAULT_API_URL = "https://sumalabo.com/api/push/notify-review-ready";
const DEFAULT_TIMEOUT_MS = 15000;

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const out = {};
  const passthrough = ["slug", "title", "branch", "previewUrl", "prUrl", "thumbnail"];
  for (const key of passthrough) {
    if (typeof item[key] === "string" && item[key].length > 0) out[key] = item[key];
  }
  out.status = typeof item.status === "string" && item.status.length > 0 ? item.status : "review";
  if (typeof item.sourceCheckPassed === "boolean") out.sourceCheckPassed = item.sourceCheckPassed;
  if (typeof item.createdAt === "string" && item.createdAt) out.createdAt = item.createdAt;
  if (!out.slug) return null;
  return out;
}

export async function notifyReviewReady({ item, apiUrl, secret, timeoutMs } = {}) {
  const effectiveApi = (apiUrl || process.env.REVIEW_NOTIFY_API_URL || DEFAULT_API_URL).trim();
  const effectiveSecret = (secret || process.env.REVIEW_NOTIFY_SECRET || "").trim();
  const effectiveTimeout = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const cleanItem = sanitizeItem(item);

  const meta = {
    requestedAt: new Date().toISOString(),
    apiUrl: effectiveApi,
    item: cleanItem,
    secretConfigured: effectiveSecret.length > 0,
  };

  if (!effectiveSecret) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_secret",
      message: "REVIEW_NOTIFY_SECRETが未設定のため通知送信をスキップしました。",
      meta,
    };
  }

  if (!cleanItem) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_item",
      message: "通知に必要な item.slug が見当たらないため通知送信をスキップしました。",
      meta,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const res = await fetch(effectiveApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notify-Secret": effectiveSecret,
        Accept: "application/json",
      },
      body: JSON.stringify({ item: cleanItem }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    let body = null;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }

    if (res.ok && body && typeof body === "object" && body.ok) {
      return {
        ok: true,
        status: res.status,
        response: body,
        meta,
      };
    }

    return {
      ok: false,
      status: res.status,
      response: body,
      message: `通知APIが ${res.status} を返しました。`,
      meta,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      response: null,
      error: String(err && err.message ? err.message : err),
      message: "通知APIへの接続に失敗しました。",
      meta,
    };
  }
}
