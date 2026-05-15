import { generateMaterialsFlowMarkdown, generateRefinementFlowMarkdown, generateThumbnailRetryFlowMarkdown } from "./generate-handoff.mjs";

function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

function linkItems(items = []) {
  return items.map((item) => `- ${item.label}: ${item.href}\n  ${item.description}`).join("\n");
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

すまラボは、スマホ・AI・ガジェットの難しい話を普通の人にもわかるように整理するメディアです。単なるニュース紹介ではなく、「何の話か」「なぜ話題か」「普通の人にどう関係するか」「今すぐ動くべきか、様子見でよいか」まで整理してください。

${renderUnderstanding(understanding)}

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
