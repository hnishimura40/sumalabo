// scripts/automation/autonomy-notify.mjs — autonomy イベント通知ヘルパー。
//
// rollback 実行 / rollback 失敗 (paused 化) / 自動降格 / 自動 Phase B 完了などを
// 既存の Web Push 経路（/api/push/notify-review-ready）で通知する。
// review item の status を更新することで PWA の review 一覧にも状態が出る。
//
// 例外を投げない（通知失敗で本処理を壊さない）。secret の値は出力しない。

import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";

/**
 * @param {object} opts
 * @param {string} opts.slug 対象記事 slug（イベントの主対象）
 * @param {string} opts.status review item に記録する状態 (rolled_back / autonomy_paused / auto_demoted / published 等)
 * @param {string} [opts.title] 通知タイトル（PWA 一覧に出る）
 * @param {string} [opts.previewUrl] 参照 URL（本番 URL 可。省略時 /review/）
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function notifyAutonomyEvent({ slug, status, title, previewUrl }) {
  try {
    const res = await notifyReviewReady({
      item: {
        slug,
        status,
        title: title || `[autonomy] ${status}: ${slug}`,
        // notifyReviewReady は https の previewUrl 必須（ローカルURL事故ガード）。
        // autonomy イベントは記事本番 URL か review 一覧を参照先にする。
        previewUrl: previewUrl || `https://sumalabo.com/review/`,
      },
    });
    return { ok: !!res?.ok, reason: res?.reason };
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : "notify_threw" };
  }
}
