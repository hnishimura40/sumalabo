import {
  generateMaterialsFlowMarkdown,
  generateRefinementFlowMarkdown,
  generateThumbnailRetryFlowMarkdown,
} from "./generate-handoff.mjs";

function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

function linkItems(items = []) {
  return items.map((item) => `- ${item.label}: ${item.href}\n  ${item.description}`).join("\n");
}

export function generateArticlePrompt({ articleBrief, thumbnailBrief, config }) {
  const articleProjectUrl = config.chatgptTargets.articleProjectUrl;
  const generatedDraftPath = `${config.paths.generatedDraftDir}/${articleBrief.slug}.md`;
  const materialsDraftPath = `${config.paths.materialsDraftDir}/${articleBrief.slug}.materials.md`;
  const finalThumbnailPromptPath = `${config.paths.materialsDraftDir}/${articleBrief.slug}${config.paths.finalThumbnailPromptSuffix}`;
  const thumbnailOutputPath = `${config.paths.thumbnailOutputDir}/${articleBrief.slug}.png`;
  const himariBaseImagePath = config.paths.himariBaseImagePath || "public/images/characters/base/himari-base.png";
  const labomaruBaseImagePath = config.paths.labomaruBaseImagePath || "public/images/characters/base/labomaru-base.png";
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath,
    materialsDraftPath,
    finalThumbnailPromptPath,
    himariBaseImagePath,
    labomaruBaseImagePath,
    thumbnailOutputPath,
  });
  const thumbnailRetryFlow = generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath });

  return `# すまラボ記事本文生成プロンプト

このプロンプトは、以下のChatGPTプロジェクトに貼り付けて使用します。

本文・台本生成用:
${articleProjectUrl}

## 目的

以下のニュース素材をもとに、すまラボ向けの記事本文を作成してください。

すまラボは、スマホ・AI・ガジェットの難しい話を普通の人にもわかるように整理するメディアです。単なるニュース紹介ではなく、「何の話か」「なぜ話題か」「普通の人にどう関係するか」「今すぐ動くべきか、様子見でよいか」まで整理してください。

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

## サムネイル連携メモ

- サムネイルの芯: ${thumbnailBrief.coreIdea}
- 見出し候補: ${thumbnailBrief.headlineIdeas.join(" / ")}
- 補足文候補: ${thumbnailBrief.sublineIdeas.join(" / ")}

## 必ず守ること

${listItems(articleBrief.cautions)}

## 出力形式

- Markdown本文として出力
- frontmatterは不要
- メタ的な制作メモは本文に入れない
- 専門用語は短く説明する
- 見出しだけでも流れが分かる構成にする
- キャラクター会話を入れる場合は1〜2回まで、短くする
- 最後に、読者が次に読むべき既存記事への自然な導線を入れる

${refinementFlow}

${materialsFlow}

## 最終稿本文の保存ルール

- 初稿をそのまま保存しない
- 初稿・途中稿・チェック結果は ${generatedDraftPath} には保存しない
- Claude in Chromeが同じChatGPTチャット内でチェックと修正を行う
- ChatGPTが回答中の間は次の操作をしない
- 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
- 回答完了後、Claude in Chromeがその最終稿だけを全文コピーして ${generatedDraftPath} に保存する
- 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

## ブログ化用資料一式の出力指示

最終稿本文を出力したあと、続けて「ブログ化用資料一式」を出力してください。資料一式は ${materialsDraftPath} に保存します。本文ファイルと資料ファイルを混ぜないでください。メタ情報は本文には入れず、資料側にだけ入れてください。

資料一式には以下を含めてください。

- 記事タイトル案
- description案
- slug案
- 記事カテゴリ
- 記事種別
- 想定読者
- この記事の役割
- 先に結論
- 見出し構成
- 要点まとめボックス案
- 本文で特に大事なポイント
- メタ的な内容が残っていないかの確認結果
- 元記事の趣旨を壊していないかの確認結果
- 公式発表・報道・予測・未確定情報の整理
- ファクトチェック注意点
- 最後に人間が確認するポイント
- 内部リンク候補
- 関連記事への導線案
- キャラクター会話を入れるならどこが自然か
- サムネイルの方向性
- サムネイルに入れる短い文字案
- X投稿案
- Claude Codeへのブログ化指示メモ

## 最終版サムネイル画像生成プロンプト作成の指示

続いて、上記の記事内容とブログ化用資料一式を踏まえて、すまラボ用サムネイルの画像生成プロンプトを作成してください。

これは、毎回新しく開くサムネイル生成チャットで、ひまり・らぼまるのベース絵をアップロードした後に貼り付けるためのプロンプトです。サムネイル専用チャットを使い回す前提にしないでください。そのままコピペで使える完成形にしてください。

最終版サムネイルプロンプトは ${finalThumbnailPromptPath} に保存します。

サムネイル生成時に使う固定ベース絵:
- ひまりベース絵: ${himariBaseImagePath}
- らぼまるベース絵: ${labomaruBaseImagePath}

サムネイルプロンプトに含める要素:

- サムネの狙い
- 大きく入れる文字案
- 補足文字案
- 構図の要約
- 画像生成用プロンプト本文

サムネイル方針:

- すまラボらしく、普通の人にもわかりやすい
- 難しいITニュースをやさしく整理する印象
- 固定テンプレではなく、この話題に合った自由な構図
- ひまり・らぼまるは必要に応じて使う
- 2人とも、記事内容をある程度理解した状態で登場する
- 説明中ではなく、理解後の反応を見せる
- 良いニュースは前向き・感心・わくわく、判断が分かれる話は慎重・考え中、悪いニュースや値上げは困る・残念・不安など、記事内容に応じて表情と感情を変える
- 毎回同じ「これ何？説明して」パターンにしない
- 実在ロゴは使わない
- 元記事画像のコピーはしない
- スマホでも読める短い文字を入れる
- 画像の雰囲気、構図、主役、色の方向性も分かるようにする

サムネイル画像生成は、Claude in Chromeが別途「新しいチャット」を開いて行います。この本文生成チャット内では、最終版サムネイルプロンプト作成までを行ってください。

${thumbnailRetryFlow}`;
}
