// src/config/affiliate.ts — アフィリエイトIDの一元管理（2026-07-11 導入）
//
// 設計（二層構造）:
//   - ニュース記事（type: news）には広告を入れない（gate が強制する）
//   - 収益導線は資産記事（type: revenue / foundation の比較・選び方系）限定
//   - 主軸 = 物販（Amazon/楽天/Yahoo、もしもアフィリエイト経由）
//   - 従   = SIM 系など高単価 ASP 案件（A8.net、CTABox で使用）
//
// 使い方:
//   ASP 審査通過後、下の moshimo 各モールの ID を設定するだけで、
//   ProductCard / AffiliateLinks 経由のリンクがサイト全体で一斉に
//   アフィリエイトリンク（af.moshimo.com 経由）へ切り替わる。
//   ID が空のあいだは「素のモール URL」がそのまま出力される
//   （= 審査前でも記事が作れる。リンクは通常リンクとして機能する）。
//
//   もしも「どこでもリンク」の URL 形式:
//     https://af.moshimo.com/af/c/click?a_id={aId}&p_id={pId}&pc_id={pcId}&pl_id={plId}&url={encodeURIComponent(素のURL)}
//   a_id / p_id / pc_id / pl_id はもしも管理画面のリンク作成ページで
//   モール（提携プロモーション）ごとに表示される値をそのまま入れる。
//
//   A8.net は案件ごとに発行される既成リンク（px.a8.net/svt/ejp?a8mat=...）を
//   CTABox の href にそのまま渡す運用（メディア ID はメモとして保持）。
//
// 注意: ここに入れるのは公開ページに出力される ID のみ（secret ではない）。
//       API キー・ログインパスワード等は絶対に置かない。

export type MallStore = "amazon" | "rakuten" | "yahoo";

interface MoshimoProgram {
  /** もしもの a_id（メディア×プロモーションごと） */
  aId: string;
  /** もしもの p_id */
  pId: string;
  /** もしもの pc_id */
  pcId: string;
  /** もしもの pl_id */
  plId: string;
}

export const affiliateConfig: {
  /**
   * 楽天アフィリエイト（直リンク運用・2026-07-19 開通）。
   * ドット区切りの楽天アフィリエイト ID（管理画面に表示される値）。
   * 設定されていると楽天ボタンだけ hb.afl.rakuten.co.jp 経由の
   * 正規アフィリエイトリンク（rel="sponsored"）になる。
   * 空文字なら楽天も素の URL（通常リンク）のまま。
   */
  rakutenAffiliateId: string;
  moshimo: Record<MallStore, MoshimoProgram>;
  a8: { mediaId: string };
} = {
  rakutenAffiliateId: "55e28e2f.7241aa0f.55e28e30.472ff37b",
  moshimo: {
    // Amazon / Yahoo は ASP 未開通のため空のまま = 素の URL（通常リンク）で共存。
    amazon: { aId: "", pId: "", pcId: "", plId: "" },
    rakuten: { aId: "", pId: "", pcId: "", plId: "" },
    yahoo: { aId: "", pId: "", pcId: "", plId: "" },
  },
  a8: { mediaId: "" },
};

/** 楽天の直リンク運用が有効か（ID 設定済みか） */
function isRakutenDirectReady(): boolean {
  return Boolean(affiliateConfig.rakutenAffiliateId);
}

/** そのモールのアフィリエイト ID が設定済みか */
export function isMallAffiliateReady(store: MallStore): boolean {
  // 楽天は直リンク（rakutenAffiliateId）を優先。未設定でも moshimo 側があれば true。
  if (store === "rakuten" && isRakutenDirectReady()) return true;
  const p = affiliateConfig.moshimo[store];
  return Boolean(p && p.aId && p.pId && p.pcId && p.plId);
}

/**
 * 楽天の素の商品/ショップ URL を hb.afl.rakuten.co.jp 経由の
 * 正規アフィリエイトリンクに変換する。
 *   https://hb.afl.rakuten.co.jp/hgc/{ID}/?pc={encoded}&m={encoded}
 * pc（PC 用）・m（モバイル用）とも同じ商品 URL を URL エンコードして渡す。
 */
function buildRakutenDirectLink(rawUrl: string): string {
  const id = affiliateConfig.rakutenAffiliateId;
  const enc = encodeURIComponent(rawUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${id}/?pc=${enc}&m=${enc}`;
}

/**
 * 素のモール URL をアフィリエイトリンクに変換する。
 * ID 未設定なら素の URL をそのまま返す（通常リンク動作）。
 *   - 楽天: rakutenAffiliateId 設定時は hb.afl.rakuten.co.jp 経由（優先）
 *   - Amazon / Yahoo: moshimo ID 設定時のみ af.moshimo.com 経由
 */
export function buildMallLink(store: MallStore, rawUrl: string): { href: string; affiliate: boolean } {
  if (!rawUrl) return { href: "", affiliate: false };

  // 楽天は直リンク運用を最優先（Amazon/Yahoo が未開通でも楽天だけ稼働）。
  if (store === "rakuten" && isRakutenDirectReady()) {
    return { href: buildRakutenDirectLink(rawUrl), affiliate: true };
  }

  if (!isMallAffiliateReady(store)) return { href: rawUrl, affiliate: false };

  const p = affiliateConfig.moshimo[store];
  const href =
    `https://af.moshimo.com/af/c/click?a_id=${encodeURIComponent(p.aId)}` +
    `&p_id=${encodeURIComponent(p.pId)}&pc_id=${encodeURIComponent(p.pcId)}` +
    `&pl_id=${encodeURIComponent(p.plId)}&url=${encodeURIComponent(rawUrl)}`;
  return { href, affiliate: true };
}
