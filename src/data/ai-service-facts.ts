// Primary-source checks: 2026-11-15. App plans are distinct from API billing.
// Country describes the provider's corporate location, not inference/data residency.
export type ServiceFact = {
  country: string;
  countryNote: string;
  price: string;
  japan: string;
  japanStatus: 'available' | 'conditional' | 'unavailable' | 'local';
  sources: { label: string; url: string }[];
};

const s = (label: string, url: string) => ({ label, url });
const openaiCountry = s('提供法人・米国', 'https://openai.com/policies/row-terms-of-use/');
const openaiPlans = s('Proの現行料金', 'https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers');
const openaiJapan = s('ChatGPT対応国', 'https://help.openai.com/en/articles/7947663-chatgpt-supported-countries');
const claudeCountry = s('本社・米国', 'https://www.anthropic.com/transparency/voluntary-commitments');
const claudePlans = s('Claude料金・税・利用枠', 'https://claude.com/ja/pricing');
const claudeJapan = s('Claude対応国', 'https://support.claude.com/en/articles/8461763-where-can-i-access-claude');
const googleCountry = s('提供法人・米国', 'https://policies.google.com/terms?hl=en-US');
const googlePlans = s('日本のGoogle AI料金・機能', 'https://gemini.google/jp/subscriptions/?hl=ja');
const perplexityCountry = s('提供元のSan Francisco拠点', 'https://www.perplexity.ai/en-GB/hub/careers/san-francisco');
const perplexityPlans = s('日本語の料金・Computerクレジット', 'https://www.perplexity.ai/ja/hub/pricing');
const metaCountry = s('Meta本社・米国', 'https://s21.q4cdn.com/399680738/files/doc_financials/2024/ar/Meta-12-31-2024-10K-ARS.pdf');
const openaiNote = '個人向け規約の提供法人は米国DelawareのOpenAI OpCo, LLC。日本法人の有無と保存・推論場所は別。';
const claudeNote = 'Anthropicは米国San Francisco本社のPBCと公表。保存国・推論国を示す表示ではない。';
const googleNote = '提供法人Google LLCは米国Delaware設立・Mountain View住所。Google DeepMindの研究拠点や推論場所とは区別。';

export const serviceFacts: Record<string, ServiceFact> = {
  grok: {
    country: '米国', countryNote: '現行個人規約の提供法人はSpaceX Super Intelligence LLC、米国Nevada設立・Austin拠点。旧xAI表記やストア販売元と区別し、処理先・保存国を意味しない。',
    price: '新規Web向けX SubscriptionはFree $0、Plus $8/月・$80/年、Premium $30/月・$300/年、Super $100/月・$1,000/年、Ultra $200/月・$2,000/年。税別。GrokとCursorで週次枠共有、他社モデル・追加枠は別。既存SuperGrok等は継続条件、アプリ内価格とは別。',
    japan: '日本App Storeに公式アプリ・日本語対応。iOS17.4以上、ストアの年齢区分16+。規約の最低年齢・保護者同意と区別。Web・各生成機能・Grok Botの契約と地域条件は個別確認。', japanStatus: 'available',
    sources: [s('製品・画像・動画・検索', 'https://x.ai/grok'), s('現行料金・税・既存プラン', 'https://docs.x.ai/x-subscription/pricing'), s('利用枠・別製品・ファイル', 'https://docs.x.ai/grok/faq'), s('日本App Store・対応言語', 'https://apps.apple.com/jp/app/grok/id6670324846'), s('提供法人・米国・年齢条件', 'https://x.ai/legal/terms-of-service')],
  },
  'chatgpt-work': {
    country: '米国', countryNote: openaiNote,
    price: 'ChatGPT内の機能。Free $0、Go参考$8/月（米国）、Plus $20/月、Pro $100・$200・$500/月。Codexと枠を共有。追加クレジット・APIは別。税・現地通貨は購入画面。',
    japan: 'ChatGPT対応国に日本。Workの利用面・機能・段階提供はプラン別。Free/Goの制限付き提供と、有料の拡大枠を区別。', japanStatus: 'conditional',
    sources: [openaiCountry, openaiJapan, openaiPlans, s('WorkとCodexの料金共有', 'https://learn.chatgpt.com/docs/pricing'), s('WorkとCodexの提供条件', 'https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex')],
  },
  'perplexity-computer': {
    country: '米国', countryNote: 'Perplexity AIの米国拠点はSan Francisco。使う外部モデルの開発国・処理場所とは別。',
    price: 'Pro $20/月・$200/年、Max $200/月・$2,000/年。年払い相当表示$17・$167/月。Computerはクレジット制。ボーナスと月次支給は別。税・現地通貨は購入画面。',
    japan: '日本語公式料金にComputer掲載。Computerの日本専用の提供国一覧は未確認。プラン・アカウント上の利用可否を確認。', japanStatus: 'conditional',
    sources: [perplexityCountry, perplexityPlans, s('Proの公式料金案内', 'https://www.perplexity.ai/hub'), s('Maxの料金案内', 'https://www.perplexity.ai/help-center/en/articles/11680686-perplexity-max'), s('Computer', 'https://www.perplexity.ai/en-GB/products/computer')],
  },
  manus: {
    country: 'シンガポール', countryNote: 'Butterfly Effect Pte. Ltd.の法人拠点。WEF企業プロフィールはSingaporeと掲載。発祥と現法人所在地は別。2026年8月公式案内は独立運営への移行を説明し、現在のMeta傘下と一律に扱わない。',
    price: 'Free $0（日300クレジット）、Pro $20/月〜（月4,000〜）・$40/月〜（月8,000〜）。年払い17%割引。税・アプリ内価格・追加クレジットは別確認。',
    japan: '日本App Storeに公式アプリ、日本語対応を掲載。iOS17以上。Web・各機能の全アカウントへの提供保証とは分け、利用枠を確認。', japanStatus: 'conditional',
    sources: [s('企業プロフィール・所在地', 'https://www.weforum.org/organizations/butterfly-effect'), s('公式会社概要', 'https://manus.im/about'), s('現行料金・クレジット', 'https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus'), s('運営移行の公式説明', 'https://help.manus.im/en/articles/16147831-service-change-overview-what-s-happening-and-am-i-affected'), s('日本App Store・販売元・対応言語', 'https://apps.apple.com/jp/app/id6740909540')],
  },
  chatgpt: {
    country: '米国', countryNote: openaiNote,
    price: 'Free $0、Go参考$8/月（米国）、Plus $20/月、Pro $100・$200・$500/月。Pro200の新規受付は再開済み。Pro500はUltrafast対象。API別。税・現地通貨は購入画面。',
    japan: '日本は公式対応国。個別のモデル・新機能・利用上限はプランと段階提供による。', japanStatus: 'available',
    sources: [openaiCountry, openaiJapan, openaiPlans, s('Plus月払い・API別課金', 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus'), s('Go参考価格・世界展開', 'https://openai.com/index/introducing-chatgpt-go/')],
  },
  gemini: {
    country: '米国', countryNote: googleNote,
    price: '日本公式月額：Free ¥0、AI Plus ¥725、Pro ¥2,900、Ultra ¥14,500（Proの5倍枠）・¥32,000（20倍枠）。API別。掲載ページに税区分の明示なし、購入時に確認。',
    japan: '日本向けの料金・提供ページあり。画像・動画・音楽・Tasks等は、年齢・プラン・地域・利用枠を機能ごとに確認。', japanStatus: 'available',
    sources: [googleCountry, googlePlans, s('画像生成', 'https://gemini.google/overview/image-generation/'), s('動画生成', 'https://gemini.google/overview/video-generation/'), s('音楽生成', 'https://gemini.google/overview/music-generation/')],
  },
  claude: {
    country: '米国', countryNote: claudeNote,
    price: 'Free $0、Pro $20/月または年$200一括（公式表示は月相当$17）、Max $100/月、Ultra $200/月。税別。上限はモデル・作業で変動。APIは別経路。',
    japan: '日本は公式対応国。Claude全体の対応と、Duet等の個別製品の地域制限は別。', japanStatus: 'available',
    sources: [claudeCountry, claudePlans, claudeJapan],
  },
  perplexity: {
    country: '米国', countryNote: 'Perplexity AIの米国拠点はSan Francisco。外部モデルの開発国と、サービス提供元の所在地を区別。',
    price: 'Free $0、Pro $20/月・$200/年、Max $200/月・$2,000/年。年払いの公式月相当表示は$17・$167。税・現地通貨・アプリ内価格は購入経路別。',
    japan: '日本語公式料金ページ・日本App Storeに提供あり。画像生成・Computerなど個々の機能まで一律に日本対応とは扱わない。', japanStatus: 'available',
    sources: [perplexityCountry, perplexityPlans, s('Proの公式料金案内', 'https://www.perplexity.ai/hub'), s('Maxの料金案内', 'https://www.perplexity.ai/help-center/en/articles/11680686-perplexity-max'), s('日本App Store', 'https://apps.apple.com/jp/app/id1668000334')],
  },
  copilot: {
    country: '米国', countryNote: 'Microsoftの世界本社は米国Redmond。日本法人・日本での契約と、保存・推論場所は別。',
    price: '無料入口あり。日本の個人向けMicrosoft 365 Premium通常¥3,200/月・¥32,000/年（税込）。初月¥2,880／初年¥28,800の期間限定表示は通常価格と区別。法人向けは別。',
    japan: '日本ストアで提供。Premiumは1〜6人向けでもAI機能は契約者本人のみ、共有不可。端末・言語・機能条件あり。', japanStatus: 'available',
    sources: [s('世界本社・米国', 'https://www.microsoft.com/en-us/about/office-locations'), s('日本Premium料金・税込・AI共有条件', 'https://www.microsoft.com/ja-jp/microsoft-365/p/microsoft-365-premium/cfq7ttc11z3q')],
  },
  notebook: {
    country: '米国', countryNote: googleNote,
    price: '無料枠あり。日本のGoogle AI Plus ¥725/月、Pro ¥2,900/月等に利用枠を包含。独立の追加契約と一律に扱わない。税区分は購入画面。',
    japan: '日本の公式プランにGemini Notebookを掲載。Plus/Proで音声概要・ノートブック等の上限拡大。音声・動画の要約と、自由な映像生成は別。', japanStatus: 'available',
    sources: [googleCountry, googlePlans, s('改称・提供機能', 'https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/')],
  },
  dots: {
    country: '米国', countryNote: openaiNote,
    price: '個人は対象Pro（月$100・$200・$500）の利用条件。Enterpriseは別の定額／従量条件。組織preview無料は11/4〜18限定、11/18課金開始。Work/Codexへの委任は別料金条件。',
    japan: 'Proは18歳以上・段階提供。除外地域はEEA・スイス・英国で、日本は除外されていない。Business Premium・Enterprise等はワークスペース資格・管理者設定も条件。', japanStatus: 'conditional',
    sources: [openaiCountry, openaiJapan, openaiPlans, s('Dots地域・年齢・組織料金・期間条件', 'https://help.openai.com/en/articles/20001530-getting-started-with-your-dot')],
  },
  muse: {
    country: '米国', countryNote: 'Meta Platformsの本社は米国Menlo Park。常時稼働する専用VMの所在地を示す表示ではない。',
    price: '無料上限あり。公式USDはPower $20/月（週500Mトークン）、Maximum $100/月（週3B）。日本円額は公式ヘルプに未掲載。地域・アカウント・購入経路別の最終額を確認。',
    japan: '2026/10/23日本提供開始。iOS・Android・Web。契約は18歳または成年・Metaアカウント。高度音声・Avatar・専用メール等は日本で別途案内。', japanStatus: 'available',
    sources: [metaCountry, s('日本での提供開始・機能の地域差', 'https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/'), s('公式料金・週次枠・年齢条件', 'https://www.meta.com/help/subscriptions/1021145227643680/'), s('マネーフォワードMEの参照専用連携', 'https://prtimes.jp/main/html/rd/p/000001705.000008962.html')],
  },
  duet: {
    country: '米国', countryNote: claudeNote,
    price: '米国のPro $20/月・年$200、Max $100/月、Ultra $200/月（税別）の対象者向け。研究preview中はClaudeと枠を共有、背景確認も消費。',
    japan: '米国のPro・Max・Ultra向け研究preview、待機リスト。日本は対象として案内されていない。Team・Enterpriseも対象外。', japanStatus: 'unavailable',
    sources: [claudeCountry, claudePlans, s('Duetの現行地域・契約・枠共有', 'https://claude.com/product/claude-duet')],
  },
  codex: {
    country: '米国', countryNote: openaiNote,
    price: 'ChatGPT Free $0から利用枠あり。Plus $20/月、Pro $100・$200・$500/月で拡大。Workと枠共有。追加クレジット・API認証は別条件、税・現地通貨は購入画面。',
    japan: '日本はChatGPT対応国。Codex CloudはFree/Go対象外。Plus対象者・Pro等でも段階提供・管理者設定を確認。端末内実行と推論の場所は別。', japanStatus: 'conditional',
    sources: [openaiCountry, openaiJapan, openaiPlans, s('Codex利用プラン・Cloud条件', 'https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan'), s('Workとの料金共有', 'https://learn.chatgpt.com/docs/pricing')],
  },
  'claude-code': {
    country: '米国', countryNote: claudeNote,
    price: 'Claude Pro $20/月・年$200、Max $100/月、Ultra $200/月に枠を包含（税別）。Claudeの利用枠と共有。API認証経路は別。',
    japan: '日本はClaude対応国。対応OS・利用入口の差を確認。ローカルでコードを実行しても、端末内でモデル推論が完結することは意味しない。', japanStatus: 'available',
    sources: [claudeCountry, claudePlans, claudeJapan, s('Claude Code', 'https://claude.com/product/claude-code')],
  },
  cursor: {
    country: '米国', countryNote: '米国Anysphere提供。2026/8/14にSpaceXによる買収完了を公式発表。選択する他社モデルの開発国とは区別。',
    price: '現行X Subscription：Free $0、Plus $8/月（Grokのみ）、Premium $30、Super $100、Ultra $200/月・税別。他社モデルはPremium以上で別従量課金。旧Pro/Pro+は既存契約用。',
    japan: '日本専用の公式提供国一覧は未確認。規約は18歳または成年以上、地域法・輸出規制に従う。利用画面で契約・モデル・決済を確認。', japanStatus: 'conditional',
    sources: [s('法人・米国住所・年齢', 'https://cursor.com/terms-of-service'), s('SpaceX買収完了', 'https://prod.cursor.com/blog/joining-spacex'), s('現行料金・税別・追加課金', 'https://cursor.com/pricing'), s('新規販売と旧契約の区別', 'https://prod.cursor.com/docs/models-and-pricing')],
  },
};
