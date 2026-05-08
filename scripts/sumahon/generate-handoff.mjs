function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildHandoffPaths({ slug, config }) {
  return {
    articleBriefPath: `${config.paths.articleBriefDir}/${slug}.article.json`,
    articlePromptPath: `${config.paths.articlePromptDir}/${slug}.article.md`,
    generatedDraftPath: `${config.paths.generatedDraftDir}/${slug}.md`,
    thumbnailBriefPath: `${config.paths.thumbnailPromptDir}/${slug}.brief.json`,
    thumbnailPromptPath: `${config.paths.thumbnailPromptDir}/${slug}.prompt.md`,
    thumbnailOutputPath: `${config.paths.thumbnailOutputDir}/${slug}.png`,
    handoffPath: `${config.paths.handoffDir}/${slug}.handoff.md`,
    chromeStepsPath: `${config.paths.handoffDir}/${slug}.chrome-steps.md`,
  };
}

export function generateHandoffMarkdown({ source, slug, paths, config }) {
  return `# ChatGPT 5.5 handoff: ${slug}

## 対象

- slug: ${slug}
- 元記事URL: ${source.sourceUrl}
- 元記事タイトル: ${source.sourceTitle}

## 本文生成

- 本文生成用ChatGPTプロジェクトURL: ${config.chatgptTargets.articleProjectUrl}
- 本文生成用promptファイル: ${paths.articlePromptPath}
- 生成本文の保存先: ${paths.generatedDraftPath}

## サムネイル生成

- サムネイル生成用ChatGPTチャットURL: ${config.chatgptTargets.thumbnailChatUrl}
- サムネイル生成用promptファイル: ${paths.thumbnailPromptPath}
- サムネイル画像の保存先: ${paths.thumbnailOutputPath}

## ブラウザ操作ポリシー

- 使用するブラウザ: ${config.browserPolicy.useBrowser}
- 使用しないブラウザ: ${config.browserPolicy.doNotUse}
- 重要: Chromeだけを使ってください。
- 重要: Edgeは操作しないでください。

## 次に人間またはClaude in Chromeが行う手順

1. Chromeで本文生成用ChatGPTプロジェクトを開く
2. ${paths.articlePromptPath} の内容を貼り付ける
3. ChatGPT 5.5で本文を生成する
4. 生成された本文を ${paths.generatedDraftPath} に保存する
5. Chromeでサムネイル生成用ChatGPTチャットを開く
6. ${paths.thumbnailPromptPath} の内容を貼り付ける
7. サムネイル画像を生成する
8. 生成画像を ${paths.thumbnailOutputPath} に保存する
9. 将来の import コマンドでMDX化・サムネイル反映・preview作成へ進む

## 追加メモ

- 外部APIはCLIから呼びません。
- OpenAI APIキーやClaude APIキーは不要です。
- 本文・サムネイルともに、生成後は人間が確認してください。
`;
}

export function generateChromeStepsMarkdown({ slug, paths, config }) {
  return `# Chrome操作手順: ${slug}

重要:
普段使っているEdgeは操作しないでください。
ブラウザ操作は必ずChromeだけで行ってください。

## 本文生成

1. Chromeで以下を開く

   ${config.chatgptTargets.articleProjectUrl}

2. 以下のファイルの内容を貼る

   ${paths.articlePromptPath}

3. ChatGPT 5.5で本文を生成する

4. 生成された本文を以下に保存する

   ${paths.generatedDraftPath}

## サムネイル生成

1. Chromeで以下を開く

   ${config.chatgptTargets.thumbnailChatUrl}

2. 以下のファイルの内容を貼る

   ${paths.thumbnailPromptPath}

3. サムネイル画像を生成する

4. 生成画像を以下に保存する

   ${paths.thumbnailOutputPath}

## 完了後に確認するもの

${listItems([
    paths.generatedDraftPath,
    paths.thumbnailOutputPath,
    paths.handoffPath,
    paths.chromeStepsPath,
  ])}
`;
}
