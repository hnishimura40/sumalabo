// Checked 2026-11-15. Product capabilities, app access and model benchmarks are separate facts.
export const serviceModelsCheckedAt='2026-11-15';
export type Capability = {status:'yes'|'limited'|'no'; text:string; source:string};
const yes=(text:string,source:string):Capability=>({status:'yes',text,source});
const limited=(text:string,source:string):Capability=>({status:'limited',text,source});
const no=(text:string,source:string):Capability=>({status:'no',text,source});
export const capabilityLabels={yes:'○',limited:'△',no:'×'};
export const capabilityNames={yes:'対応',limited:'一部・別条件で対応',no:'標準機能に非対応'};
// Explicit negative statements and catalogue/scope judgements are not the same evidence.
export const negativeEvidence:Record<string,{basis:string;reason:string}>={
 'chatgpt.video':{basis:'公式の終了案内',reason:'SoraのWeb・アプリ・APIの終了を公式ヘルプに明記。'},
 'claude.image':{basis:'公式の非対応説明',reason:'写真・イラストは生成しないと公式ヘルプに明記。HTML/SVGの図解とは区別。'},
 'claude.video':{basis:'公式が生成方式を説明',reason:'Motionは映像生成モデルを使わず、文字・図形・画像をコードで動かすと明記。'},
 'chatgpt.music':{basis:'標準機能一覧と比較範囲の照合',reason:'公式の提供機能は文章・画像・ファイル・音声等。専用の楽曲生成として掲載される機能はなく、歌詞・音声会話・外部アプリはこの行に含めない。'},
 'claude.music':{basis:'標準機能一覧と比較範囲の照合',reason:'料金・機能一覧の音声モード、コード実行、ファイル作成を、専用の楽曲生成モデルとして数えない。'},
 'grok.music':{basis:'モデルの入出力と比較範囲の照合',reason:'公式一覧の文章・画像・動画・音声モデルと、独立した楽曲生成を区別。動画に含まれる音声はこの行の対象外。'},
 'copilot.music':{basis:'公式が素材の出所を説明',reason:'Createの動画BGMはMicrosoftの素材ライブラリと説明。既存BGMの追加を新曲の生成として数えない。'},
 'muse.video':{basis:'サービスの提供面を分けた判定',reason:'パーソナルAI秘書Museと、映像生成を提供するMeta AI/Vibesは別サービス。外部サービスへ操作を依頼することは標準搭載と数えない。'},
 'muse.music':{basis:'標準機能一覧と比較範囲の照合',reason:'Muse公式の文書・画像・調査・タスク実行と、専用の楽曲生成を区別。他社アプリの操作やコードによる音声合成はこの行の対象外。'},
};
export const capabilityAxes=[
 {key:'free',label:'無料で使う',scope:'無料枠のある機能。使用量の上限を含む。'},
 {key:'files',label:'文章・資料を作る',scope:'文章作成、資料の読解、ファイル作成。'},
 {key:'research',label:'Webで調べる',scope:'学習済み知識への回答と、Web検索・調査を区別。'},
 {key:'image',label:'写真・イラスト生成',scope:'生成モデルによる画像。SVGやグラフの描画は別。'},
 {key:'video',label:'新しい映像を生成',scope:'生成モデルによる映像。素材編集やコードのアニメとは別。'},
 {key:'music',label:'歌・BGMを生成',scope:'専用の楽曲生成。歌詞・既存曲の再生・読み上げ・動画の音声は別。'},
 {key:'voice',label:'声で会話する',scope:'読み上げだけでなく、音声でやり取りする機能。'},
 {key:'automation',label:'閉じた後も仕事を続ける',scope:'バックグラウンドや予約実行。プラン・別アプリの違いも表示。'},
] as const;
export type CapabilityKey=typeof capabilityAxes[number]['key'];
const googlePlans='https://gemini.google/jp/subscriptions/?hl=ja';
const googleTasks='https://support.google.com/gemini/answer/17094507?hl=en';
const chatPlans='https://chatgpt.com/pricing/';
const chatTools='https://help.openai.com/en/articles/9260256-chatgpt-capabilities-overview';
const claudePlans='https://claude.com/ja/pricing';
const claudeImages='https://support.claude.com/en/articles/9002504-can-claude-produce-images';
const claudeMotion='https://support.claude.com/en/articles/17454997-get-started-with-claude-motion';
const grokTools='https://docs.x.ai/grok/overview';
const grokFaq='https://docs.x.ai/grok/faq';
const copilotTools='https://support.microsoft.com/en-us/microsoft-365-copilot/learning/changes-microsoft-copilot-app';
const copilotCreate='https://support.microsoft.com/en-au/microsoft-365-copilot/frequently-asked-questions-about-create-in-the-microsoft-365-copilot-app';
const museTools='https://ai.meta.com/muse/';
const musePlans='https://www.meta.com/help/subscriptions/1021145227643680/';
const museJapan='https://about.fb.com/ja/news/2026/10/muse-personal-ai-agent-launches-in-japan/';
export const capabilityFacts:Record<string,Record<CapabilityKey,Capability>>={
 gemini:{
  free:yes('会話・画像編集・Deep Research・Liveに無料枠',googlePlans),
  files:yes('文章・資料の読解、Canvasで作成',googlePlans),
  research:yes('Deep ResearchでWebを調査',googlePlans),
  image:yes('Nano Bananaで生成・編集。無料枠あり','https://gemini.google/overview/image-generation/'),
  video:yes('Gemini Omni。AI Plus以上・18歳以上','https://gemini.google/overview/video-generation/'),
  music:yes('Lyriaで歌・インスト。18歳以上・生成枠あり','https://gemini.google/overview/music-generation/'),
  voice:yes('Gemini Liveで音声会話','https://gemini.google/overview/gemini-live/'),
  automation:yes('Tasksは日本で無料枠あり。18歳以上・個人アカウント',googleTasks),
 },
 chatgpt:{
  free:yes('通常会話、画像・調査・Workに制限付き無料枠',chatPlans),
  files:yes('文章・ファイル分析、Workで資料や成果物',chatTools),
  research:yes('Search・Deep Research。無料枠もあり',chatPlans),
  image:yes('画像の生成・編集。無料枠あり',chatTools),
  video:no('SoraはWeb・アプリ4/26、API9/24に終了','https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation'),
  music:no('専用の楽曲生成なし。歌詞や音声会話とは別',chatTools),
  voice:yes('Liveなどで会話。利用モード・枠はプラン別','https://help.openai.com/en/articles/20001274-chatgpt-voice'),
  automation:limited('TasksはPlus以上。常時秘書DotsはPro $100/月〜',chatPlans),
 },
 claude:{
  free:yes('Web検索・ファイル作成・Artifactsに無料枠',claudePlans),
  files:yes('Docs・Slides・Artifacts、Word/Excel/PDF等','https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude'),
  research:yes('Web検索。ResearchはPro以上',claudePlans),
  image:no('写真・イラスト生成なし。SVGの図解は作れる',claudeImages),
  video:no('生成映像なし。Motionはコードのアニメ・法人向け',claudeMotion),
  music:no('専用の楽曲生成なし。歌詞や作曲コードは別',claudePlans),
  voice:yes('音声モード。プランの使用量上限あり',claudePlans),
  automation:yes('Coworkのクラウド・予約実行。Pro以上','https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork'),
 },
 grok:{
  free:yes('会話・音声の無料枠。有料枠終了後も別枠で使える',grokFaq),
  files:yes('文章・PDF・表計算・画像などを分析',grokFaq),
  research:yes('WebとXを検索。出典・元投稿もたどれる','https://x.ai/grok'),
  image:yes('Imagineで生成・編集。利用枠あり',grokTools),
  video:yes('Imagineで映像を生成・編集。新規Premium以上','https://x.ai/pricing'),
  music:no('独立した楽曲生成なし。動画の音声とは別','https://docs.x.ai/developers/models'),
  voice:yes('音声で会話。無料枠あり',grokFaq),
  automation:limited('別アプリGrok Bot。新規Premium $30/月以上','https://docs.x.ai/x-subscription/grok-bot'),
 },
 copilot:{
  free:yes('チャット・画像生成・ファイル添付。容量上限あり',copilotTools),
  files:yes('文章・添付資料。Officeアプリ連携は対象契約','https://www.microsoft.com/en-us/copilot/solutions/individuals'),
  research:yes('Web検索、対象契約でResearcher', 'https://www.microsoft.com/en-us/copilot/solutions/individuals'),
  image:yes('画像を生成・編集。無料枠あり',copilotTools),
  video:limited('短い生成映像は米国Frontier。素材編集はClipchamp','https://support.microsoft.com/en-us/microsoft-365-copilot/create-ai-generated-short-clips-in-the-microsoft-365-copilot-app'),
  music:no('新曲の生成なし。CreateのBGMは素材ライブラリ',copilotCreate),
  voice:limited('Copilot Voice。対象Microsoft契約・地域・段階提供','https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-with-voice-features-in-microsoft-365-copilot'),
  automation:limited('Cowork・予約プロンプト。対象契約で段階提供',copilotTools),
 },
 muse:{
  free:yes('AI秘書のタスク実行を無料で開始。上限後は回復待ち可',musePlans),
  files:yes('文書作成、予定・メールや調べものを依頼',museTools),
  research:yes('専用ブラウザで調査・監視、アプリとも連携',museTools),
  image:yes('画像生成を公式機能として提供',museTools),
  video:no('Museの標準機能なし。Meta AIのVibesは別サービス','https://ai.meta.com/meta-ai/vibes/'),
  music:no('Museの標準機能に専用の楽曲生成なし',museTools),
  voice:limited('高度音声は日本での提供を別途案内',museJapan),
  automation:yes('無料枠から。アプリを閉じてもクラウドで継続',museTools),
 },
};

export const serviceModelRows=[
 {id:'gemini',name:'Gemini',models:'無料：Auto／AI Plus：Gemini 4 Hydrogen／Pro：Neon／Ultra：Carbon',access:'無料は自動選択。AI PlusはHydrogen、ProはNeon・Hydrogen、UltraはCarbonとNeonの上位アクセス。',media:'画像：Nano Banana／動画：Gemini Omni／音楽：Lyria',note:'日本の個人向けプランで確認。アプリの自動選択と、APIのモデル名・評価条件は別。',checkedAt:'2026-11-19',source:googlePlans},
 {id:'chatgpt',name:'ChatGPT',models:'Chat：GPT-6／GPT-6 Pro（Astra）。Work・Codex：GPT-6.2 Astra・Solを順次提供',access:'6.2はPlus・Pro等の対象Work・Codexへ段階提供。無料枠・通常のChatへの追加とは別。既存の6.1 Sol・Terra等もプラン・設定により表示。',media:'画像生成・Liveは別の機能。Soraは提供終了。',note:'6.2は通常のChatには追加されない。Workは資料・スライド等の作成、Codexは開発。利用可否はプラン・権限・段階提供による。',checkedAt:'2026-11-18',source:'https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex',extraSource:'https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt'},
 {id:'claude',name:'Claude',models:'Haiku 5.5／Sonnet 5.5／Opus 5.5／Fable 5.2',access:'軽い仕事はHaiku、日常はSonnet、複雑な仕事はOpus・Fable。FableはProでは使用クレジット、Max・Ultraでは週次枠の最大半分。',media:'図解：HTML/SVG／Motion：コードのアニメ。写真生成モデルはなし。',note:'FableとOpusは別モデル。APIクレジットでアプリの使用量が増えるわけではない。',checkedAt:'2026-11-21',source:'https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings',extraSource:'https://claude.com/ja/pricing'},
 {id:'grok',name:'Grok',models:'Grok 4.7',access:'会話・コードを担当。推論量はlow〜xhigh。画像・映像には別モデルを使う。',media:'画像：Grok Imagine Image 2.0／動画：Video 1.5／音声：Voice',note:'Web・X検索は検索ツールで情報を取得する。',source:'https://docs.x.ai/developers/models'},
 {id:'copilot',name:'Copilot',models:'GPT系／Claude系（Researcherのモデル選択）',access:'Microsoft 365の対象ライセンス。Claudeの利用は管理者設定、Model CouncilはFrontier。',media:'画像作成／Clipchamp素材編集／生成クリップは米国先行',note:'Copilot全体に一つの固定モデル名・点数は付けない。',source:'https://support.microsoft.com/en-us/microsoft-365-copilot/use-model-council-with-researcher-in-microsoft-365-copilot'},
 {id:'muse',name:'Muse',models:'公開設計：Muse Spark 1.3／API・Code系列：Muse Wonder・Wonder Full',access:'11/6からWonderを使って学習した専用モデルをMuse・Meta AIへ順次導入。WonderのAPI・Code提供と、アプリの内部モデルは区別。',media:'Museの画像生成、Meta AIのMuse Image/Videoは提供面を区別。',note:'専用モデルの改善を、Wonder Fullの評価値や無料枠の点数に置き換えない。',checkedAt:'2026-11-23',source:'https://research.meta.ai/blog/specialized-models-for-muse-and-metaai',extraSource:'https://about.fb.com/news/2026/10/introducing-muse-wonder-models/'},
];

export const serviceStories:Record<string,{headline:string;question:string;answer:string;tryIt:string;boundary:string;source:string}>={
 gemini:{headline:'画像・動画・音楽を、一つの入口で。',question:'旅行の写真から、紹介動画もBGMも作りたい！ AIを何個も契約するの？',answer:'Geminiは、画像のNano Banana、動画のGemini Omni、曲のLyriaへ進めるのが選びどころ。相談だけで終わらず、作品づくりへつなげやすいよ。Googleの資料やメールと使う人にも入口がまとまる。',tryIt:'例えば「この写真をもとに旅行紹介の構成を考えて。次に画像、動画、BGMを作りたい」と順番に頼む。',boundary:'動画は有料AIプラン・18歳以上。曲にも年齢・生成枠がある。すべて無料・無制限ではない。',source:googlePlans},
 chatgpt:{headline:'調べる → 考える → 成果物にする。',question:'調査結果を読むだけじゃなく、比較表や説明資料まで仕上げたいな。',answer:'SearchやDeep Researchで調べ、文章・表・画像にまとめ、WorkやCodexで実際の作業へつなげられる。やることが途中で変わっても、相談しながら成果物へ進む使い方を選びやすいよ。',tryIt:'例えば「3案を調べ、根拠付きの比較表を作り、家族向けの説明資料にして」と依頼をつなぐ。',boundary:'Work・Codex・Dotsは枠と入口が別。Spaceの共有ページはFreeでは開けない。ProのAPIクレジットでアプリの上限は増えない。Soraは終了済み。',source:chatPlans},
 claude:{headline:'長い資料を読み、文章と資料を仕上げる。',question:'手元の資料を読んで、筋の通った説明や、使えるファイルにしてほしい。',answer:'Claudeは、文章・資料からDocs、Slides、ArtifactsやOffice形式のファイルへ進めるのが選びどころ。図はSVGやHTMLで、コードはClaude Codeで作れる。写真を描くAIとは、強みの場所が違うんだ。',tryIt:'例えば「この資料の矛盾を整理して、結論・根拠・未記載の点を分けた報告書にして」と頼む。',boundary:'写真・イラスト生成は×。Motionはコードのアニメ。Coworkの継続作業は有料。Max・UltraのAPIクレジットで、アプリやCodeの上限は増えない。',source:'https://claude.com/ja/pricing'},
 grok:{headline:'Xの今を調べて、画像・映像へ。',question:'いまXで何が話題？ 元の投稿や公式発表までたどって確かめたい。',answer:'GrokはWebとXを検索でき、Imagineの画像・動画生成も同じサービスから使える。話題を集めて背景を整理したり、見つけた題材を創作につなげたい人に向いているよ。',tryIt:'例えば「この話題の元投稿と公式発表を分け、事実と感想を整理して」と頼む。',boundary:'検索した投稿が正しいとは限らない。常時稼働のGrok Botは別アプリで、新規契約ではPremium以上。',source:'https://x.ai/grok'},
 copilot:{headline:'いつものWord・Excel・PowerPointのそばで。',question:'新しいAI画面へコピーするより、いつもの仕事のファイルと一緒に使いたい！',answer:'Copilotの選びどころはMicrosoft 365との近さ。表計算の数字を読み、文書へまとめ、プレゼンにする仕事で、アプリと契約の組合せから選べる。対象契約のResearcherやCoworkも使い分けよう。',tryIt:'例えば「売上表の変化を説明し、会議用の要点とスライドの構成を作って」と、対象のアプリで頼む。',boundary:'無料チャットとOffice内のAIは同じ契約ではない。個人PremiumのAI機能は契約者本人だけ。',source:'https://www.microsoft.com/en-us/copilot/solutions/individuals'},
 muse:{headline:'無料から、動き続けるAI秘書を持つ。',question:'「調べておいて」を無料で頼めて、アプリを閉じても続けてくれるの？',answer:'そこがMuseの大きな選びどころ。無料枠でタスク実行を始められ、専用クラウド環境で用事を続ける。調べもの、予定、価格の監視などを頼み、結果を受け取るAI秘書を、いきなり月額契約せず試せるんだ。',tryIt:'例えば「旅行の候補を調べておいて」「この商品の価格を見守って」と依頼する。重要な送信や購入は本人の確認を挟む。',boundary:'無料は使用量上限あり。上限後は回復を待つか有料へ。無料枠の固定トークン数は公表されていない。高度音声の日本提供は別案内。',source:museTools},
};
