import type { MobileCarrierKey } from "./mobileCarrierLinks";

export type ArticleAffiliatePlacement = {
  carrier: MobileCarrierKey;
  description: string;
};

/**
 * 記事本文を変更せずに差し替えられる、記事単位の広告予約枠。
 * 成果URLそのものは mobileCarrierLinks.ts に集約する。
 */
export const articleAffiliatePlacements: Record<string, ArticleAffiliatePlacement[]> = {
  "mobile-plan-cost-comparison": [
    {
      carrier: "rakuten",
      description:
        "データ使用量に応じた料金と、通話・提供条件を公式サイトで確認できます。大容量・無制限タイプを検討する方は、申し込み前に最新条件をご確認ください。",
    },
  ],
};
