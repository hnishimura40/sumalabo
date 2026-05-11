// Cloudflare Pages Function: POST /api/push/check-secret
//
// 目的:
//   ローカル側で持っている REVIEW_NOTIFY_SECRET が、Cloudflare Pages の
//   env.REVIEW_NOTIFY_SECRET と一致しているかを、秘密値そのものを露出せずに確認する。
//
// 使い方:
//   curl -X POST https://sumalabo.com/api/push/check-secret \
//     -H "X-Notify-Secret: <ローカル側の値>"
//   または、PowerShell:
//   Invoke-RestMethod -Method Post -Uri "https://sumalabo.com/api/push/check-secret" `
//     -Headers @{ "X-Notify-Secret" = $env:REVIEW_NOTIFY_SECRET }
//
// 返すもの:
//   一致時:        { ok: true,  matched: true,  envSecretConfigured: true,
//                    headerLength: n, envSecretLength: m }
//   不一致時:      { ok: false, matched: false, envSecretConfigured: true,
//                    headerLength: n, envSecretLength: m,
//                    message: "secretが一致しません。" }
//   env未設定時:    { ok: false, envSecretConfigured: false, headerLength: n,
//                    message: "REVIEW_NOTIFY_SECRETがCloudflareに設定されていません。" }
//
// 絶対に返さないもの:
//   - secret文字列そのもの
//   - 先頭/末尾の数文字
//   - secretのhash値
//
// 文字数だけは返す。これは「PowerShell側で空白や改行が混ざっているか」を判別するのに必要で、
// 単独では元の値を推測できない（長さからの総当たりは現実的でない）。

interface Env {
  REVIEW_NOTIFY_SECRET?: string;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// 文字長は安全に返してよい（PowerShell側の改行・空白混入の検出に使う）。
// ただし、原文の文字数だけでは秘密の中身までは推測できないため、可とする。
function safeLength(value: string | undefined): number {
  if (!value) return 0;
  return value.length;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const provided =
    request.headers.get("X-Notify-Secret") ||
    request.headers.get("x-notify-secret") ||
    "";

  const headerLength = safeLength(provided);
  const envSecret = env.REVIEW_NOTIFY_SECRET || "";
  const envSecretConfigured = envSecret.length > 0;

  if (!envSecretConfigured) {
    return jsonResponse(
      {
        ok: false,
        envSecretConfigured: false,
        headerLength,
        message: "REVIEW_NOTIFY_SECRETがCloudflareに設定されていません。",
      },
      500,
    );
  }

  const envSecretLength = safeLength(envSecret);
  // タイミング攻撃を避けるため定数時間比較を行う。
  // ヘッダー値とenv値の長さが違う場合、ダミー比較をしてから false にして、
  // 早期returnによる時間差を作らない。
  const a = provided;
  const b = envSecret;
  const maxLen = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  const matched = diff === 0 && a.length === b.length;

  if (matched) {
    return jsonResponse({
      ok: true,
      matched: true,
      envSecretConfigured: true,
      headerLength,
      envSecretLength,
    });
  }

  return jsonResponse(
    {
      ok: false,
      matched: false,
      envSecretConfigured: true,
      headerLength,
      envSecretLength,
      message: "secretが一致しません。",
    },
    401,
  );
};
