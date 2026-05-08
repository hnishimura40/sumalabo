import { generateMaterialsFlowMarkdown, generateRefinementFlowMarkdown } from "./generate-handoff.mjs";

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
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({ generatedDraftPath, materialsDraftPath, finalThumbnailPromptPath });

  return `# すまラボ記事本文生成プロンプト

このプロンプトは、以下のChatGPTプロジェクトに貼り付けて使用する。

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

## サムネイルとの連携メモ

- サムネイルの芯: ${thumbnailBrief.coreIdea}
- サムネイル見出し候補: ${thumbnailBrief.headlineIdeas.join(" / ")}
- サムネイル補足文候補: ${thumbnailBrief.sublineIdeas.join(" / ")}

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
これは原則として、この同じ台本チャット内で画像生成に使うためのプロンプトです。
必要に応じて、別チャットへ移すために保存しても構いません。
そのままコピペで使える完成形にしてください。

出力したサムネイル画像生成プロンプトは、${finalThumbnailPromptPath} に保存します。
${config.paths.thumbnailPromptDir}/${articleBrief.slug}.prompt.md はCLIが作る初期サムネイル案・参考プロンプトです。実際に主で使うのは、本文と資料一式を踏まえて台本チャット内で作る ${finalThumbnailPromptPath} です。

Claude in Chromeは、回答完了後に最終版サムネイル画像生成プロンプトを全文コピーし、${finalThumbnailPromptPath} に保存します。保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認します。

サムネイル画像は、原則として同じ台本チャット内で ${finalThumbnailPromptPath} の内容を使って生成してください。生成画像はいったん通常のダウンロード先に保存される想定です。ダウンロード完了を自動確認したあと、public/images/thumbnails/${articleBrief.slug}.png などへ移動・リネームします。

どうしても別チャットを使う場合は、使い回しの文脈に引っ張られないよう、その記事専用の新しいチャットを優先してください。サムネイル専用チャットは必要時の参考・例外運用です。

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
- 毎回同じ構図にしない
- 実在ロゴは使わない
- 元記事画像のコピーはしない
- スマホでも読める短い文字を入れる
- 画像の雰囲気、構図、主役、色の方向性も分かるようにする
`;
}
