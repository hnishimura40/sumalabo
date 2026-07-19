// 収益/土台記事への内部導線マッチャー（A: 記事末尾カード / D: 一覧差し込み で共用）。
// 定義の単一ソースは data/related-guides.json（夜間run の .mjs も同じ JSON を読む）。
import config from "../../data/related-guides.json";

export interface GuideTarget {
  slug: string;
  label: string;
  blurb: string;
  categories: string[];
  keywords: string[];
  listStaple: boolean;
}

export interface RelatedGuideSettings {
  articleEndMaxCards: number;
  articleEndMinScore: number;
  keywordWeight: number;
  categoryWeight: number;
  listInsertEveryN: number;
  articleEndLabel: string;
  listLabel: string;
}

export const relatedGuideSettings: RelatedGuideSettings = config.settings;
export const guideTargets: GuideTarget[] = config.targets as GuideTarget[];

const targetSlugs = new Set(guideTargets.map((t) => t.slug));

/** その slug 自体が導線先（収益記事）なら true。導線先ページには A カードを出さない。 */
export function isGuideTarget(slug: string): boolean {
  return targetSlugs.has(slug);
}

export interface MatchInput {
  slug: string;
  category?: string;
  title?: string;
  description?: string;
  tags?: string[];
  /** 記事本文(生Markdown)。タグ・タイトルに現れない話題も拾う。 */
  body?: string;
}

export interface ScoredGuide extends GuideTarget {
  score: number;
  hitKeywords: string[];
  categoryHit: boolean;
}

function buildHaystack(input: MatchInput): string {
  return [input.title, input.description, ...(input.tags ?? []), input.body]
    .filter(Boolean)
    .join("  ")
    .toLowerCase();
}

/** 1 記事に対する 1 導線先のスコア。キーワード一致 +keywordWeight/件、カテゴリ一致 +categoryWeight。 */
export function scoreGuideTarget(target: GuideTarget, input: MatchInput): ScoredGuide {
  const haystack = buildHaystack(input);
  const hitKeywords: string[] = [];
  for (const kw of target.keywords) {
    if (!kw) continue;
    if (haystack.includes(kw.toLowerCase())) hitKeywords.push(kw);
  }
  const categoryHit = Boolean(input.category && target.categories.includes(input.category));
  const score =
    hitKeywords.length * relatedGuideSettings.keywordWeight +
    (categoryHit ? relatedGuideSettings.categoryWeight : 0);
  return { ...target, score, hitKeywords, categoryHit };
}

/**
 * 記事末尾カード用。閾値(articleEndMinScore)以上の導線先を、スコア降順で最大 articleEndMaxCards 件返す。
 * 自分自身・導線先ページ自身は除外。無関係な記事には空配列を返す（＝カードを出さない）。
 */
export function matchGuidesForArticle(input: MatchInput): ScoredGuide[] {
  // 導線先ページ自身には出さない（news / guide → 収益 の一方向に絞る）
  if (isGuideTarget(input.slug)) return [];
  return guideTargets
    .filter((t) => t.slug !== input.slug)
    .map((t) => scoreGuideTarget(t, input))
    .filter((s) => s.score >= relatedGuideSettings.articleEndMinScore)
    .sort((a, b) => b.score - a.score || b.hitKeywords.length - a.hitKeywords.length)
    .slice(0, relatedGuideSettings.articleEndMaxCards);
}

/** 一覧差し込み(D)用の定番ガイド。listStaple:true のみ。 */
export function getListStapleTargets(): GuideTarget[] {
  return guideTargets.filter((t) => t.listStaple);
}

/** 全導線先 slug（計測スクリプトへ渡す用）。 */
export function getAllTargetSlugs(): string[] {
  return guideTargets.map((t) => t.slug);
}
