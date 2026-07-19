// すまラボ Phase C: X 投稿「投稿確定の検証」ヘルパー
//
// 目的（2026-07-19 恒久対策・「最後の1クリック問題」）:
//   X 投稿は「ポストする/返信ボタンをクリックした = 投稿できた」ではない。
//   アップロード未完了・送信ボタンの取りこぼし・beforeunload 等で、
//   クリックしても投稿が確定していないことがある（Kimi K3 記事で発生）。
//   そこで「クリック後に DOM で実在を確認する検証ループ」を必須化する。
//
// この .mjs は Node 実行用ではなく、**Claude in Chrome MCP の
// javascript_tool にそのまま貼る検証スニペット（文字列）を集約**するもの。
//   import { POST_EXISTS_JS, REPLY_COUNT_JS } from './x-post-verify.mjs'
//   → console.log で取り出して javascript_tool に貼る、
//     もしくは post-to-x.mjs が NEXT STEPS で印字する。
//
// 検証の考え方:
//   - 本投稿: プロフィール(/suma_labo)で「本文の一意な部分文字列」に一致する
//     投稿を数える。count===1 で確定 / 0 は未投稿 / >=2 は二重投稿(要手当)。
//   - リプライ: 親投稿の [data-testid="reply"] の aria-label の返信数が
//     クリック前 N → クリック後 N+1 に増えたら確定（これが最も確実な信号。
//     Kimi K3 では「0 件の返信」→「1 件の返信」で確定を判定できた）。

/**
 * 本投稿の実在チェック（プロフィール /suma_labo を開いた状態で実行）。
 * @param {string} uniqueText 本文の一意な部分文字列（例: 先頭 12〜20 文字）
 * @returns {string} javascript_tool に貼る式。返り値 JSON:
 *   { count, hrefs:[...], verdict:'confirmed'|'not_posted'|'duplicate' }
 */
export function postExistsJs(uniqueText) {
  const safe = JSON.stringify(String(uniqueText));
  return `(() => {
    const needle = ${safe};
    const arts = [...document.querySelectorAll('article')];
    const hits = [];
    for (const a of arts) {
      const t = a.innerText || '';
      if (t.includes(needle) && !t.includes('返信先')) {
        const href = [...a.querySelectorAll('a')].map(x=>x.getAttribute('href'))
          .find(h=>h && /^\\/suma_labo\\/status\\/\\d+$/.test(h));
        if (href) hits.push(href);
      }
    }
    const uniq = [...new Set(hits)];
    const verdict = uniq.length === 1 ? 'confirmed' : (uniq.length === 0 ? 'not_posted' : 'duplicate');
    return JSON.stringify({ count: uniq.length, hrefs: uniq, verdict });
  })()`;
}

/**
 * 親投稿の返信数を読む（本投稿の status ページを開いた状態で実行）。
 * クリック前後で呼び、count が +1 されていれば確定。
 * @returns {string} javascript_tool に貼る式。返り値 JSON:
 *   { replyCount:number|null, composerCleared:boolean }
 */
export const REPLY_COUNT_JS = `(() => {
  const btn = document.querySelector('[data-testid="reply"]');
  const label = btn ? (btn.getAttribute('aria-label') || '') : '';
  const m = label.match(/(\\d[\\d,]*)/);
  const replyCount = m ? Number(m[1].replace(/,/g, '')) : null;
  const ed = document.querySelector('[data-testid="tweetTextarea_0"]');
  const composerCleared = ed ? (ed.innerText.trim().length < 3) : true;
  return JSON.stringify({ replyCount, composerCleared });
})()`;

/**
 * 本投稿の添付画像枚数を読む（status ページ／composer どちらでも）。
 * @returns {string} javascript_tool に貼る式。返り値 JSON: { photos:number }
 */
export const MEDIA_COUNT_JS = `(() => {
  const p = document.querySelectorAll('[data-testid="tweetPhoto"]').length;
  const t = [...document.querySelectorAll('img')].filter(i=>i.src.indexOf('pbs.twimg.com/media')>-1).length;
  return JSON.stringify({ photos: Math.max(p, t) });
})()`;

/**
 * まだ送信してよいか（アップロード完了・ボタン活性）を判定する。
 * true のときだけ「再クリック」する。false なら少し待つ。
 * @returns {string} javascript_tool に貼る式。返り値 JSON:
 *   { ready:boolean, btnDisabled:string, progressbars:number }
 */
export const SEND_READY_JS = `(() => {
  const btn = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  const disabled = btn ? btn.getAttribute('aria-disabled') : 'none';
  const prog = [...document.querySelectorAll('[role="progressbar"]')].length;
  // 送信可能 = ボタンが存在し aria-disabled が true でない
  const ready = !!btn && disabled !== 'true';
  return JSON.stringify({ ready, btnDisabled: disabled, progressbars: prog });
})()`;

/** 検証ループの手順（人手/エージェント向けの定数・doc と同期） */
export const VERIFY_LOOP_STEPS = [
  '本投稿: ①ポストするをクリック → ②5秒待機 → ③プロフィール(/suma_labo)で postExistsJs(先頭一意文字列) を実行',
  '  verdict=confirmed(count===1) → 即 --record + 台帳更新（この直後に書く）',
  '  verdict=not_posted(count===0) → SEND_READY_JS が ready になるまで待って再クリック（本投稿クリックは最大2回）',
  '  verdict=duplicate(count>=2) → 停止・二重投稿として手当て（追加投稿しない）',
  'リプライ: ①クリック前に REPLY_COUNT_JS で親の返信数 N を控える → ②返信/tweetButtonInline をクリック → ③5秒待機 → ④REPLY_COUNT_JS 再取得',
  '  N→N+1 かつ composerCleared=true → 確定 → 即 --record(reply) + 台帳更新',
  '  増えていない → SEND_READY_JS が ready になるまで待って再クリック（最大2回）',
  '  2回試しても増えない → リプライは「未投稿」と明確に報告（本投稿は投稿済みのまま維持）',
];
