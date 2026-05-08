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
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({ generatedDraftPath, materialsDraftPath });

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
- 同じChatGPTチャット内でチェックと修正を行う
- 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
- その最終稿だけを ${generatedDraftPath} に保存する
- 続けて、ブログ化用の資料一式を出力してもらい、${materialsDraftPath} に保存する
- 本文ファイルと資料ファイルを混ぜない
- メタ情報は本文には入れず、資料側にだけ入れる
`;
}
