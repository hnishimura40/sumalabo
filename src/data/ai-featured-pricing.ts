// Representative individual plans, not the lowest or every available paid tier.
// Price/free-limit review is separate from the older feature and benchmark snapshots.
export const featuredPricingCheckedAt='2026-11-16';
export const featuredPricing:Record<string,{free:string;paid:string;example:string;source:string}>={
 gemini:{free:'文章・相談、画像の生成と編集、Deep Research、Liveを無料枠で使える。',paid:'利用量と上位モデルを拡大。AI Plusから動画生成、ProはGemini 4 Neon、UltraはCarbonやNeonの上位アクセス。',example:'AI Plus ¥725/月',source:'https://gemini.google/jp/subscriptions/?hl=ja'},
 chatgpt:{free:'文章・相談に加え、画像生成・調査・デスクトップ版Workなどを制限付きの枠で試せる。',paid:'Plusは調査・ファイル・画像等の利用枠を拡大。Work・CodexにはGPT-6.2を順次提供。常時秘書Dotsは対象Proの別入口。',example:'Plus $20/月',source:'https://chatgpt.com/pricing/'},
 claude:{free:'文章・資料の作成、Web検索、ファイル作成、Artifactsを使用量の上限内で使える。',paid:'ProからCowork・CodeやSheets・Whiteboards（ベータ）を利用可。Max・UltraはAPIクレジット付き。アプリの使用量とは別枠。',example:'Pro $20/月（税別）',source:'https://claude.com/ja/pricing'},
 grok:{free:'会話・音声・画像生成に無料枠。新規X Subscriptionの無料プランに動画生成は含まれない。',paid:'利用枠を拡大。新規Premium以上で動画生成・Grok Bot。Plusはこの2機能の対象外。Cursor等と週次枠を共有。',example:'Plus $8/月（税別）',source:'https://docs.x.ai/x-subscription/pricing'},
 copilot:{free:'チャット、画像生成、ファイル添付を利用枠の範囲で使える。',paid:'対象Microsoft 365契約でOfficeアプリ内のAIや高度な機能・使用量を拡大。PremiumのAIは契約者本人用。',example:'Premium ¥3,200/月（税込）',source:'https://www.microsoft.com/ja-jp/microsoft-365/p/microsoft-365-premium/cfq7ttc11z3q'},
 muse:{free:'AI秘書に用事を頼み、アプリを閉じてもタスクを続けてもらえる。上限後は無料枠の回復を待って再開できる。',paid:'継続して任せられる使用量を増やす。Power・Maximumの2段階。無料枠で足りれば契約を急がなくてよい。',example:'Power $20/月',source:'https://www.meta.com/help/subscriptions/1021145227643680/'},
};
