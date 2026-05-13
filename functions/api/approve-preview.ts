// Cloudflare Pages Function: POST /api/approve-preview
//
// 役割:
//   Preview環境で表示される「この記事を承認して公開」ボタンから
//   送られてくる branch 名を受け取り、対応する open PR を main へ merge する。
//
// 必要なCloudflare Pages環境変数:
//   - GITHUB_TOKEN                     : pull requestをmergeできる最小権限のトークン
//   - GITHUB_OWNER (任意, default: hnishimura40)
//   - GITHUB_REPO  (任意, default: sumalabo)
//   - APPROVE_ALLOWED_BRANCH_PREFIXES (任意、CSV、default
//        "preview/,auto/imported-,auto/sumahon-")
//     後方互換で APPROVE_ALLOWED_BRANCH_PREFIX (単数) も受ける。
//
// セキュリティ:
//   - GITHUB_TOKENはサーバー側でのみ使用し、レスポンスにも含めない。
//   - フロントエンドへトークンを露出しないよう PUBLIC_ プレフィックスは使わない。
//   - branchは APPROVE_ALLOWED_BRANCH_PREFIXES のいずれかで前方一致するもののみ許可。
//   - main宛て・mainブランチ自身は弾く。
//   - PR検索は base=main, state=open に限定。
//   - PR の draft / mergeable=false は弾く (clean / has_hooks / unstable は許容)。

interface Env {
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  APPROVE_ALLOWED_BRANCH_PREFIXES?: string;
  APPROVE_ALLOWED_BRANCH_PREFIX?: string;
}

type PullSummary = {
  number: number;
  state?: string;
  mergeable?: boolean | null;
  mergeable_state?: string;
  draft?: boolean;
  title?: string;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "POSTで送ってください。" }, 405);
  }

  let body: { branch?: unknown } = {};
  try {
    body = (await request.json()) as { branch?: unknown };
  } catch {
    return jsonResponse({ ok: false, message: "リクエストJSONをパースできませんでした。" }, 400);
  }

  const branch = typeof body.branch === "string" ? body.branch.trim() : "";
  const csvPrefixes = (
    env.APPROVE_ALLOWED_BRANCH_PREFIXES ||
    env.APPROVE_ALLOWED_BRANCH_PREFIX ||
    "preview/,auto/imported-,auto/sumahon-"
  ).trim();
  const allowedPrefixes = csvPrefixes
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const owner = (env.GITHUB_OWNER || "hnishimura40").trim();
  const repo = (env.GITHUB_REPO || "sumalabo").trim();

  if (!branch) {
    return jsonResponse({ ok: false, message: "branchが指定されていません。" }, 400);
  }
  if (branch === "main" || branch === "master") {
    return jsonResponse({ ok: false, message: "mainブランチは承認操作の対象外です。" }, 400);
  }
  if (!allowedPrefixes.some((p) => branch.startsWith(p))) {
    return jsonResponse(
      {
        ok: false,
        message: `承認対象は次の prefix のいずれかで始まるブランチだけです: ${allowedPrefixes.join(", ")}`,
      },
      400,
    );
  }
  if (!env.GITHUB_TOKEN) {
    return jsonResponse(
      { ok: false, message: "GITHUB_TOKENがCloudflare Pagesに設定されていません。" },
      500,
    );
  }

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sumalabo-approve-preview",
  };

  const head = `${owner}:${branch}`;
  const listUrl =
    `https://api.github.com/repos/${owner}/${repo}/pulls` +
    `?head=${encodeURIComponent(head)}&base=main&state=open`;

  let prs: PullSummary[] = [];
  try {
    const listRes = await fetch(listUrl, { headers: ghHeaders });
    if (!listRes.ok) {
      const text = await listRes.text();
      return jsonResponse(
        {
          ok: false,
          message: `PR一覧取得に失敗しました（HTTP ${listRes.status}）。`,
          detail: text.slice(0, 500),
        },
        502,
      );
    }
    prs = (await listRes.json()) as PullSummary[];
  } catch (err) {
    return jsonResponse(
      { ok: false, message: "GitHub APIへの接続に失敗しました。", detail: String(err).slice(0, 300) },
      502,
    );
  }

  if (!Array.isArray(prs) || prs.length === 0) {
    return jsonResponse(
      {
        ok: false,
        message: `${branch} から main への open PR が見つかりませんでした。GitHub上でPRを開いてから再試行してください。`,
      },
      404,
    );
  }

  const pr = prs[0];
  if (pr.draft) {
    return jsonResponse(
      { ok: false, message: `PR #${pr.number} はドラフト状態です。Ready for reviewにしてから再試行してください。`, pullNumber: pr.number },
      409,
    );
  }
  if (pr.state && pr.state !== "open") {
    return jsonResponse(
      { ok: false, message: `PR #${pr.number} は state=${pr.state} です。open のものだけが対象です。`, pullNumber: pr.number },
      409,
    );
  }
  // mergeable は GitHub 側で初回 PR open 直後に null (計算中) になり得る。
  // false 確定なら拒否し、true / null なら通す (merge API が最終判定する)。
  if (pr.mergeable === false) {
    return jsonResponse(
      {
        ok: false,
        message: `PR #${pr.number} は mergeable=false の状態です (state: ${pr.mergeable_state || "unknown"})。GitHub 上でコンフリクトや必須チェックを解消してください。`,
        pullNumber: pr.number,
      },
      409,
    );
  }

  const mergeUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/merge`;
  let mergeRes: Response;
  try {
    mergeRes = await fetch(mergeUrl, {
      method: "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        merge_method: "merge",
        commit_title: `Merge preview branch ${branch} via approval button`,
      }),
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, message: "GitHub merge APIへの接続に失敗しました。", detail: String(err).slice(0, 300), pullNumber: pr.number },
      502,
    );
  }

  if (mergeRes.ok) {
    const mergeJson = (await mergeRes.json()) as { merged?: boolean; sha?: string; message?: string };
    return jsonResponse({
      ok: true,
      message: "Previewを承認し、mainへマージしました。",
      pullNumber: pr.number,
      merged: mergeJson.merged === true,
      sha: mergeJson.sha,
    });
  }

  const errText = await mergeRes.text();
  let parsed: { message?: string } = {};
  try {
    parsed = JSON.parse(errText);
  } catch {
    /* keep raw text */
  }
  const detail = (parsed.message || errText).slice(0, 500);

  let userMessage = `mergeに失敗しました（HTTP ${mergeRes.status}）。GitHub上でPRの状態を確認してください。`;
  if (mergeRes.status === 405) {
    userMessage = "mergeできない状態です（コンフリクト・必須チェック未完了など）。GitHub上でPRを確認してください。";
  } else if (mergeRes.status === 409) {
    userMessage = "mergeコンフリクトが発生しています。手動で解消してください。";
  } else if (mergeRes.status === 403) {
    userMessage = "GitHub tokenの権限が足りないか、ブランチ保護ルールでブロックされています。";
  } else if (mergeRes.status === 404) {
    userMessage = "PRが見つかりませんでした。";
  }

  return jsonResponse(
    {
      ok: false,
      message: userMessage,
      pullNumber: pr.number,
      detail,
    },
    mergeRes.status,
  );
};
