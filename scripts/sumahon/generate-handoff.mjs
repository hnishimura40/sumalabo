function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateRefinementFlowMarkdown({ generatedDraftPath } = {}) {
  const draftPath = generatedDraftPath || "drafts/generated/{slug}.md";

  return `## 本文生成後の精錬フロー

すまラボでは、ChatGPTの初稿をそのまま保存しません。同じChatGPTチャット内で複数回チェック・修正し、最後に出した最終稿だけを保存します。

1. 初稿を生成する
2. メタ的な内容が残っていないか確認する
3. 記事ボリュームが十分か確認する
4. 元記事の趣旨を壊していないか確認する
5. すまラボらしく普通の人にもわかりやすいか確認する
6. 難しいITニュースを噛み砕けているか確認する
7. 公式発表、報道、予測、未確定情報を混同していないか確認する
8. 不足があれば修正する
9. 必要なら再チェックする
10. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
11. その最終稿だけを ${draftPath} に保存する

初稿・途中稿・チェック結果は ${draftPath} には保存しません。必要な場合だけ別メモとして残してください。`;
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
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });

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
3. ChatGPT 5.5で本文の初稿を生成する
4. 同じチャット内で下記の精錬フローに沿ってチェック・修正する
5. 最後に最終稿だけを ${paths.generatedDraftPath} に保存する
6. Chromeでサムネイル生成用ChatGPTチャットを開く
7. ${paths.thumbnailPromptPath} の内容を貼り付ける
8. サムネイル画像を生成する
9. 生成画像を ${paths.thumbnailOutputPath} に保存する
10. import コマンドでMDX化・サムネイル反映・preview作成へ進む

${refinementFlow}

## 追加メモ

- 外部APIはCLIから呼びません。
- OpenAI APIキーやClaude APIキーは不要です。
- 本文・サムネイルともに、生成後は人間が確認してください。
- ChatGPTの初稿をそのまま保存せず、精錬後の最終稿だけを保存してください。
`;
}

export function generateChromeStepsMarkdown({ slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });

  return `# Chrome操作手順: ${slug}

重要:
普段使っているEdgeは操作しないでください。
ブラウザ操作は必ずChromeだけで行ってください。

## 本文生成

1. Chromeで以下を開く

   ${config.chatgptTargets.articleProjectUrl}

2. 以下のファイルの内容を貼る

   ${paths.articlePromptPath}

3. ChatGPT 5.5で本文の初稿を生成する

4. 同じチャット内で、下記の精錬フローに沿ってチェック・修正する

5. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する

6. 最終稿だけを以下に保存する

   ${paths.generatedDraftPath}

${refinementFlow}

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
