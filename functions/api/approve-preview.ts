// Cloudflare Pages Function: POST /api/approve-preview
//
// 役割:
//   Preview環境で表示される「この記事を承認して公開」ボタンから
//   送られてくる branch 名を受け取り、対応する open PR を main へ merge する。
//   merge 後、KV 上の review item を status: "approved" に更新し、レスポンスで
//   後続オペレーション (production deploy / queue sync) が必要であることを示す。
//
// 必要なCloudflare Pages環境変数:
//   - GITHUB_TOKEN                     : pull requestをmergeできる最小権限のトークン
//   - GITHUB_OWNER (任意, default: hnishimura40)
//   - GITHUB_REPO  (任意, default: sumalabo)
//   - APPROVE_ALLOWED_BRANCH_PREFIXES (任意、CSV、default
//        "preview/,auto/imported-,auto/sumahon-")
//     後方互換で APPROVE_ALLOWED_BRANCH_PREFIX (単数) も受ける。
//
// 任意 binding:
//   - SUMALABO_REVIEW_KV (KVNamespace) : 紐づいていれば merge 後に当該 branch の
//     review item を status: "approved" + prUrl に更新する。失敗しても承認自体は
//     成功扱いのまま (best-effort)。
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
  SUMALABO_REVIEW_KV?: KVNamespace;
}

interface ReviewItemRecord {
  slug: string;
  title?: string;
  branch?: string;
  previewUrl?: string;
  prUrl?: string;
  thumbnail?: string;
  status?: string;
  sourceCheckPassed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // 任意の追記項目
  approvedAt?: string;
  approvedByMergeCommit?: string;
}

type ReviewItemUpdate =
  | { updated: true; slug: string; previousStatus?: string }
  | { updated: false; reason: string; detail?: string };

// merge 後に branch から KV review item を探し当てて status を approved に更新する。
// 失敗しても merge 自体は成功扱いを維持するため、例外を投げず常に値を返す。
async function markReviewItemApprovedByBranch(
  kv: KVNamespace,
  branch: string,
  prUrl: string,
  mergeCommitSha: string | undefined,
): Promise<ReviewItemUpdate> {
  try {
    const indexRaw = await kv.get("review:index", "text");
    if (!indexRaw) return { updated: false, reason: "review_index_empty" };
    let slugs: unknown;
    try {
      slugs = JSON.parse(indexRaw);
    } catch {
      return { updated: false, reason: "review_index_unparseable" };
    }
    if (!Array.isArray(slugs)) return { updated: false, reason: "review_index_not_array" };
    for (const s of slugs) {
      if (typeof s !== "string" || !s) continue;
      const raw = await kv.get(`review:item:${s}`, "text");
      if (!raw) continue;
      let item: ReviewItemRecord;
      try {
        item = JSON.parse(raw) as ReviewItemRecord;
      } catch {
        continue;
      }
      if (item && item.branch === branch) {
        const previousStatus = item.status;
        const now = new Date().toISOString();
        const updated: ReviewItemRecord = {
          ...item,
          status: "approved",
          prUrl: item.prUrl && item.prUrl.length > 0 ? item.prUrl : prUrl,
          approvedAt: now,
          approvedByMergeCommit: mergeCommitSha,
          updatedAt: now,
        };
        await kv.put(`review:item:${s}`, JSON.stringify(updated));
        return { updated: true, slug: s, previousStatus };
      }
    }
    return { updated: false, reason: "no_matching_review_item" };
  } catch (err) {
    return {
      updated: false,
      reason: "kv_update_threw",
      detail: String(err && (err as Error).message ? (err as Error).message : err).slice(0, 200),
    };
  }
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

    // merge 成功後、KV の review item を status: "approved" に best-effort で更新する。
    // KV binding 不在・該当 item 不在・KV エラーのいずれでも、承認自体は成功扱いを
    // 維持する (承認ボタンを押した時点で merge は完了しているため)。
    const prUrlForKv = `https://github.com/${owner}/${repo}/pull/${pr.number}`;
    let reviewItemUpdate: ReviewItemUpdate = { updated: false, reason: "kv_not_bound" };
    if (env.SUMALABO_REVIEW_KV) {
      reviewItemUpdate = await markReviewItemApprovedByBranch(
        env.SUMALABO_REVIEW_KV,
        branch,
        prUrlForKv,
        mergeJson.sha,
      );
    }

    return jsonResponse({
      ok: true,
      message: "Previewを承認し、mainへマージしました。",
      pullNumber: pr.number,
      merged: mergeJson.merged === true,
      sha: mergeJson.sha,
      reviewItemUpdate,
      // フロント側に「次は何が必要か」を明示する。GitHub Apps 連携を使っていないため
      // main merge では本番に自動デプロイされない。queue (data/automation/sumahon-queue.json)
      // はサーバー側からは更新できないので、CLI 側で sync する必要がある。
      needsProductionDeploy: true,
      productionDeployHint:
        "main にマージされましたが、Cloudflare Pages の GitHub Apps 連携を使っていないため本番には自動デプロイされません。" +
        "`npx wrangler pages deploy dist --project-name sumalabo --branch main` を別途実行してください。",
      needsQueueSync: true,
      queueSyncHint:
        "data/automation/sumahon-queue.json の該当 entry を status: \"published\" 相当に更新してください。" +
        "Workerからは直接書き込めないため、サーバー側 CLI / nightly タスクで /api/review-items を参照して同期するのが安全です。",
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
