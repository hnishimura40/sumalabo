import { generateMaterialsFlowMarkdown, generateRefinementFlowMarkdown, generateThumbnailRetryFlowMarkdown } from "./generate-handoff.mjs";

function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

function linkItems(items = []) {
  return items.map((item) => `- ${item.label}: ${item.href}\n  ${item.description}`).join("\n");
}

/**
 * Detects whether an article is a "comparison" article based on slug or
 * sumalaboUse. Comparison articles use `type: foundation` in frontmatter
 * but require a different visual structure (decision-guide-grid + table
 * as the centerpiece).
 */
function detectArticleVariant(articleBrief) {
  const slug = (articleBrief?.slug || "").toLowerCase();
  const sumalaboUse = (articleBrief?.sumalaboUse || "").toLowerCase();
  const baseType = (articleBrief?.articleType || "foundation").toLowerCase();
  if (slug.includes("comparison") || slug.includes("-vs-") || sumalaboUse.includes("comparison")) {
    return "comparison";
  }
  if (baseType === "news") return "news";
  return "foundation";
}

/**
 * Renders the "新標準記事構成" contract for the ChatGPT Phase B prompt.
 * This is the system-level fix for the "文字の壁" problem: every article
 * (news / comparison / foundation) gets a fixed visual structure with
 * required blocks per type. ChatGPT is told to comply with these blocks
 * before writing the body.
 */
function renderTypeContract(articleBrief) {
  const variant = detectArticleVariant(articleBrief);

  const commonRequired = `### 全タイプ共通の必須ブロック

本文は次の順を厳守してください。各ブロックを省略しないでください。

**[Zone 1: 判断ゾーン] — 冒頭 1 スクロール以内に置く (1500 字以内)**
1. \`<div class="summary-box"><p class="box-label">3行でわかるまとめ</p>\` + 3 bullet (1 行ずつ)
2. \`<div class="check-box"><p class="box-label">この記事で整理すること</p>\` + 4 bullet 前後
3. \`<div class="summary-box"><p class="box-label">先に結論</p>\` + 2-3 段落の詳細結論

**[Zone 2: 理解ゾーン] — 記事中盤**
4. **必須**: \`<div class="table-card"><table>...</table></div>\` または \`<table>\` で用語整理または比較を表に
5. **必須**: \`<section class="decision-guide-panel"><ul class="decision-list">...</ul></section>\` で「○○な人 / ○○な人」を提示
6. **必須**: \`<CharacterDialogue image="/images/characters/duo_talk_half.webp" lines={[...]}/>\` を 1 回 (内容を理解した後の反応)

**[Zone 3: 深掘りゾーン] — 記事末尾**
7. **必須**: \`## 参考情報\` セクション (公式・元報道リンク最低 2 件)

長い段落 (400 字超) が続いたら \`<div class="info-box">\` や \`<div class="check-box">\` に分割してください。
**「長文を短くする」のではなく、「判断・比較・注意点を、表・カード・図解・フローで先に見せる」方針です。**
`;

  if (variant === "news") {
    return `## 記事構成契約 (本文を書く前に必ず読む)

このプロンプトは記事タイプ **news (ニュース記事)** として扱われます。

${commonRequired}

### ニュース記事の追加必須ブロック

- リーク / 噂 / 公式発表前の話題の場合は、Zone 2 の冒頭に \`<div class="info-box">\` で「公式発表ではなく報道・リーク段階の情報である」旨を 1 段落で注記する
- Zone 2 に \`<div class="check-box">\` で「期待できること / 注意したいこと / 普通の人への影響」 を 3-5 bullet で配置
- Zone 2 に \`<section class="decision-guide-panel">\` で「待つ人 / 待たなくてよい人 / 比較すべき人」 の 3 軸 (\`<ul class="decision-list">\`)
- Zone 3 に \`## 今すぐできる判断\` を必ず置く (現時点で読者が取れるアクションを 2-4 個)
- Zone 3 末尾に \`## 参考情報\` (公式情報 + 元報道)
`;
  }

  if (variant === "comparison") {
    return `## 記事構成契約 (本文を書く前に必ず読む)

このプロンプトは記事タイプ **comparison (比較記事)** として扱われます。

${commonRequired}

### 比較記事の追加必須ブロック

- Zone 1 (判断ゾーン) の末尾に \`<div class="decision-guide-grid">\` で「あなたはどっち？」の 2-3 カード並列を置く
- Zone 2 の最も目立つ位置に **メイン比較表** (\`<div class="table-card"><table>...</table></div>\`) — 比較対象 × 観点 のマトリクス
- Zone 2 に \`<section class="decision-guide-panel">\` で「用途別おすすめ」 (\`<ul class="decision-list">\`)
- Zone 2 に \`<div class="info-box">\` で「失敗しやすい選び方」 を 1-3 注意点
- Zone 2 の任意で「価格帯別」または「メーカー別」の \`<section class="decision-guide-panel">\` を追加してよい
- Zone 3 末尾に \`## 参考情報\`
`;
  }

  // foundation (基礎解説)
  return `## 記事構成契約 (本文を書く前に必ず読む)

このプロンプトは記事タイプ **foundation (基礎解説記事)** として扱われます。

${commonRequired}

### 基礎解説記事の追加必須ブロック

- Zone 2 の核心位置に **用語表** (\`<div class="table-card"><table>...</table></div>\`) — 用語 × 意味 × 普通の人にとっての影響 のマトリクス
- Zone 2 に「仕組みを 1 段落で」 (\`<div class="info-box">\` 内に 1 段落、または本文 1 段落で要点だけ)
- Zone 2 に \`<section class="decision-guide-panel">\` で「向いている人 / 向いていない人」 (\`<ul class="decision-list">\`)
- Zone 3 に \`## 次に読むべき記事\` を必ず置く (基礎 → 比較 / ニュース への導線、関連記事 2-3 個)
- Zone 3 末尾に \`## 参考情報\`
`;
}

function renderUnderstanding(understanding) {
  if (!understanding) return "";
  const props = Array.isArray(understanding.thumbnailProps) && understanding.thumbnailProps.length
    ? understanding.thumbnailProps.map((p) => `「${p}」`).join(" / ")
    : "(指定なし)";
  const blocks = Array.isArray(understanding.visualExplainBlocksNeeded) && understanding.visualExplainBlocksNeeded.length
    ? understanding.visualExplainBlocksNeeded.map((b) => `- ${b}`).join("\n")
    : "- (指定なし)";
  return `## この記事の理解 (本文・サムネを作る前に把握すること)

この記事は、タイトルだけで書いてはいけません。次の理解を必ず本文とサムネ提案に反映してください。

- 記事テーマ: ${understanding.articleTheme || "(未設定)"}
- 読者の疑問: ${understanding.readerQuestion || "(未設定)"}
- 読者の不安: ${understanding.readerAnxiety || "(未設定)"}
- 読者が判断したい点: ${understanding.readerDecisionPoint || "(未設定)"}
- 普通の人にとっての変化: ${understanding.whatChangesForNormalUsers || "(未設定)"}
- 判断軸: ${understanding.buyWaitOrWatch || "(未設定)"}
- ひまりの反応 (記事内容を読んだ後): ${understanding.himariReaction || "(未設定)"}
- らぼまるの役割 (整理係): ${understanding.labomaruRole || "(未設定)"}
- サムネで使う道具の候補: ${props}
- サムネ構図の方向性: ${understanding.thumbnailCompositionIdea || "(未設定)"}

## 必須の視覚整理ブロック (本文に必ず含める)

本文は文字の壁にしません。冒頭に次を順に置き、難しい話は表・カードに逃がします。

${blocks}

### 本文とスライドの役割分担 (重要)

この記事は本文に図解スライド (fig01〜figNN.png) を挿入する前提です。本文だけで
全てを説明しようとせず、**スライドが視覚的に補完する** 設計にしてください。

- 各 H2 直下は **2〜3 段落の short intro** で論点を切り出し、図に渡す
- 同じ内容を本文の長文段落とスライドで二重に説明しない (重複削減)
- スライド枚数は記事内容に応じて変動 (典型 2〜8 枚、短い速報なら 0〜2 枚もあり)
- スライドで先に整理した論点は、本文では「読み取りポイント」「補足」程度に短縮する
- スライドの配置・内容は別途 `slidePlan` から自動生成されるので、本文プロンプト側で
  「ここに fig が入る前提」と言及するだけで十分。プロンプト内で fig の画像生成
  まで指示する必要はない。

具体的な書き方:
1. 本文冒頭は \`<div class="summary-box">\` で「3行でわかるまとめ」を3つの bullet で出す
2. その直下に \`<div class="check-box">\` で「この記事で整理すること」を4 bullet 前後で出す
3. その下に既存の \`<div class="summary-box">\` 「先に結論」を 2-3 段落で出す (詳細な前提・出典・但し書き)
4. 本文中盤で「判断軸 (${understanding.buyWaitOrWatch || "買う / 待つ / 様子見"})」を比較表または判断カードで表現する
5. 用語説明は \`<table>\` または \`<div class="table-card">\` で表に整理する (本文ベタ書き禁止)
6. 長い段落 (400字超) が続くようなら \`<div class="info-box">\` などに分割する

## サムネの作り方 (台本チャット内で最終版を作る際に守る)

- ひまりとらぼまるは記事内容を理解した上で描く。**置物にしない。**
- 表情・ポーズは上記の「ひまりの反応」「らぼまるの役割」に基づき、喜怒哀楽を出す
- 道具は上記「サムネで使う道具の候補」から記事に合うものを 2-3 個選ぶ
- 構図は上記「サムネ構図の方向性」を起点に、テンプレ化しない
- 安全化を理由に、感情・面白さ・自由さを削らない
- ベース画像 \`himari-base.png\` / \`labomaru-base.png\` を canvas + DataTransfer 経路で添付する前提でプロンプトを書く
- 大きな文字は 2 つまで、補助文字は 2 つまで (文字で全部説明しない)
- 実在ロゴ・実機写真コピーは使わない
- 「悲報」「化石」「爆死」など強い煽り表現は使わない (AUP 回避だが、感情そのものは削らない)

`;
}

export function generateArticlePrompt({ articleBrief, thumbnailBrief, understanding, config }) {
  const articleProjectUrl = config.chatgptTargets.articleProjectUrl;
  const generatedDraftPath = `${config.paths.generatedDraftDir}/${articleBrief.slug}.md`;
  const materialsDraftPath = `${config.paths.materialsDraftDir}/${articleBrief.slug}.materials.md`;
  const finalThumbnailPromptPath = `${config.paths.materialsDraftDir}/${articleBrief.slug}${config.paths.finalThumbnailPromptSuffix}`;
  const thumbnailOutputPath = `${config.paths.thumbnailOutputDir}/${articleBrief.slug}.png`;
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({ generatedDraftPath, materialsDraftPath, finalThumbnailPromptPath });
  const thumbnailRetryFlow = generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath });

  return `# すまラボ記事本文生成プロンプト

このプロンプトは、以下のChatGPTプロジェクトに貼り付けて使用する。

本文・台本生成用:
${articleProjectUrl}

## 目的

以下のニュース素材をもとに、すまラボ向けの記事本文を作成してください。

すまラボは、スマホ・AI・ガジェットの難しい話を、ふだんスマホを使う人にもわかるように整理するメディアです。単なるニュース紹介ではなく、「何の話か」「なぜ話題か」「日常使いに関係するか / 買い替え判断に関係するか」「今すぐ動くべきか、様子見でよいか」まで整理してください。

## 公開コピーの言い回しルール (重要)

外向きに出る本文・H1・H2・summary-box・先に結論・サムネ用テキストでは、**「普通の人」という直接表現を 1 回も使わないでください**。内部の編集方針としての「普通の人にもわかる」は OK ですが、本文として出すと「自分は普通じゃないのか」と読者が感じる、または防御的なボイラープレートに見えるためです。

代わりに、以下の文脈別の言い回しを使ってください:
- 「ふだんスマホを使う人」「日常使いで」「日常のスマホ利用で」
- 「買う前に見るポイント」「使う前に知っておきたい」「買う・待つの判断軸」
- 「スマホ選び目線で」「ガジェット好きにとって」
- 「便利？それとも様子見？」「日常使いで困る場面はある？」

タイトル / description / thumbnailAlt / H2 / box-label のいずれにも「普通の人」「普通の人向け」を**入れない**。本文中の言及も 0 回が望ましい (どうしても必要なら 1 回までに留め、引用元の言い回しを残す場合に限定)。

${renderUnderstanding(understanding)}

${renderTypeContract(articleBrief)}

## 対象記事

- slug: ${articleBrief.slug}
- 記事タイトル案: ${articleBrief.articleTitle}
- カテゴリ: ${articleBrief.category}
- type: ${articleBrief.articleType}
- 分類: ${articleBrief.sumalaboUse}
- トピック分類: ${articleBrief.topicCategory}
- 優先度: ${articleBrief.priority}

## 元ニュース

- 参考元: ${articleBrief.sourceMedia}
- URL: ${articleBrief.sourceUrl}
- 元記事タイトル: ${articleBrief.sourceTitle}
- 公開日: ${articleBrief.sourcePublishedAt || "不明"}

## 元記事の要点メモ

以下は話題理解のための要点メモです。本文へ長文のまま貼らず、すまラボ向けに言い換えて再構成してください。

${listItems(articleBrief.sourceKeyPoints)}

## すまラボでの切り口

${articleBrief.coreAngle}

## 推奨構成

${listItems(articleBrief.suggestedStructure)}

## 関連記事候補

実在する記事だけに自然にリンクしてください。無理に全部入れないでください。

${linkItems(articleBrief.internalLinkCandidates)}

## サムネイルとの連携メモ

- サムネイルの芯: ${thumbnailBrief.coreIdea}
- サムネイル見出し候補: ${thumbnailBrief.headlineIdeas.join(" / ")}
- サムネイル補足文候補: ${thumbnailBrief.sublineIdeas.join(" / ")}

## 必ず守ること

${listItems(articleBrief.cautions)}

## 出力形式

- Markdown本文として出力
- frontmatterは不要
- 本文の先頭に \`# タイトル\`（H1）を **入れない**（frontmatter title がレイアウト側でH1として描画されるため、本文側のH1は重複表示になる）
- 本文冒頭は、記事タイトルの再掲ではなく、短い導入文または \`<div class="summary-box">\` から始める
- メタ的な制作メモは本文に入れない（「以下、本文」「ここから本文」「最終稿として」「初稿」などは絶対に出力しない）
- 表示用に残ってしまう Markdown 記号（孤立した \`**\` や \`\`\`md / \`\`\`markdown フェンス）を残さない
- 専門用語は短く説明する
- 見出しだけでも流れが分かる構成にする
- 補助ボックス（\`summary-box\` / \`check-box\` / \`info-box\` / \`table-card\`）の中に H1〜H3 見出しを置かない。「結論」「注意」「現時点の見方」などはボックス先頭の \`<p class="box-label">\` か短い段落として書く
- ニュース系記事では、ひまり・らぼまるの短い補助会話または案内ブロックを **1回だけ** 自然に入れる（漫才化しない、固定構図にしない、内容を理解した後の反応として配置）
- 記事本文は資料の貼り付けではなく、読者が読み進めやすい導入→展開→まとめの流れにする
- キャラクター会話を入れる場合は1〜2回まで、短くする
- 最後に、読者が次に読むべき既存記事への自然な導線を入れる
- 記事末尾に必ず \`## 参考情報\` セクションを作る（後述のルールに従う）

## 参考情報セクションのルール

記事末尾に \`## 参考情報\` セクションを必ず作り、以下を守ってください。これは公開記事に出すセクションです。

- 公式情報（公式サイト、公式ブログ、公式ドキュメント）と元報道（Bloomberg、TechCrunch、Reuters、4Gamer、ITmedia、ASCII などの一次・二次情報）、必要なら関連報道のリンクを最低2件以上入れる
- 各項目はMarkdownリンク形式で、ホスト名から記事内容が分かる体裁にする
- 報道ベースの記事の場合は、参考情報セクションの末尾に「Apple公式発表ではないため、〜は今後変わる可能性があります」のような注記を1文添える
- 公開記事の本文・参考情報・リンク欄に「すまほん」「smhn.info」を **絶対に出さない**
- すまほんは内部の話題発見元として扱い、参考情報には出さず、公式情報・元報道・関連報道を優先する
- 元記事URLが内部参考元（すまほん）しかない場合でも、Bloomberg や Apple公式のように一次情報・二次情報をたどってURLを2件以上揃える
- 報道ベースの記事では、本文中の冒頭または導入近くで「現時点ではApple公式発表ではなく、報道ベースの情報です」のような注意文を1文添える

参考情報セクションの例（フォーマットの参考。記事に応じて差し替える）:

\`\`\`
## 参考情報

- Bloomberg「[記事タイトル](https://www.bloomberg.com/...)」
- Bloomberg日本語版「[記事タイトル](https://www.bloomberg.com/jp/...)」
- Apple公式「[製品ページタイトル](https://www.apple.com/...)」

※この記事は、現時点の報道内容と公式情報をもとに、普通の人にも分かりやすく整理したものです。発売時期・仕様・日本展開などは今後変わる可能性があります。
\`\`\`

${refinementFlow}

${materialsFlow}

## 最終稿の保存ルール

- 初稿をそのまま保存しない
- 初稿・途中稿・チェック結果は ${generatedDraftPath} には保存しない
- Claude in Chromeが同じChatGPTチャット内でチェックと修正を行う
- ChatGPTが回答中の間は次の操作をしない
- 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
- 回答完了後、Claude in Chromeがその最終稿だけを全文コピーして ${generatedDraftPath} に保存する
- 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する
- 続けて、ブログ化用の資料一式を出力してもらい、回答完了後に全文コピーする
- Claude in Chromeがブログ化用資料一式を ${materialsDraftPath} に保存する
- 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する
- 本文ファイルと資料ファイルを混ぜない
- メタ情報は本文には入れず、資料側にだけ入れる

## サムネイル画像生成プロンプト作成の指示

続いて、上記の記事内容とブログ化用資料一式を踏まえて、すまラボ用サムネイルの画像生成プロンプトを作成してください。
このプロンプトは、別途毎回新規ChatGPTチャットで画像生成に使う想定です。台本チャット内では画像生成しません。
そのままコピペで使える完成形にしてください。

出力したサムネイル画像生成プロンプトは、${finalThumbnailPromptPath} に保存します。
${config.paths.thumbnailPromptDir}/${articleBrief.slug}.prompt.md はCLIが作る初期サムネイル案・参考プロンプトです。実際に主で使うのは、本文と資料一式を踏まえて台本チャット内で作る ${finalThumbnailPromptPath} です。

Claude in Chromeは、回答完了後に最終版サムネイル画像生成プロンプトを全文コピーし、${finalThumbnailPromptPath} に保存します。保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認します。

サムネイル画像生成は、別途新規ChatGPTチャットを開き、ベース画像（らぼまる・ひまり）2枚をUWSC経由で添付してから、${finalThumbnailPromptPath} の内容を送信して行います。生成画像はいったん通常のダウンロード先に保存される想定で、ダウンロード完了を自動確認したあと、public/images/thumbnails/${articleBrief.slug}.png などへ移動・リネームします。元の拡張子に合わせる（無理にpngへ変えない）。

サムネイル画像生成専用の新規ChatGPTチャットを使う理由は、添付ファイルや過去の文脈を毎回クリーンに保ち、テーマに合った構図を素直に出すためです。使い回しチャットや台本チャットの中では生成しないでください。

${thumbnailRetryFlow}

サムネイル画像生成プロンプトには以下を含めてください。

- サムネの狙い
- 大きく入れる文字案
- 補足文字案
- 構図の要約
- 画像生成用プロンプト本文

サムネイル方針:

- すまラボらしく、普通の人にもわかりやすい
- 難しいITニュースをやさしく整理する印象
- 固定テンプレではなく、この話題に合った自由な構図
- らぼまる、ひまりは必要に応じて使う
- 「ひまりが質問、らぼまるが説明」の固定構図にしない
- 2人とも記事内容を理解した後の反応を見せる
- 良いニュースなら前向きな反応、悪いニュースなら悲しむ・心配する反応、判断が分かれる話なら慎重・困惑など、話題に応じたリアクションにする
- 毎回同じ構図にしない
- 実在ロゴは使わない
- 元記事画像のコピーはしない
- スマホでも読める短い文字を入れる
- 画像の雰囲気、構図、主役、色の方向性も分かるようにする
`;
}
