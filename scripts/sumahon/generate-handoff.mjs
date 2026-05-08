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

export function generateMaterialsFlowMarkdown({ generatedDraftPath, materialsDraftPath, finalThumbnailPromptPath } = {}) {
  const generatedPath = generatedDraftPath || "drafts/generated/{slug}.md";
  const materialsPath = materialsDraftPath || "drafts/materials/{slug}.materials.md";
  const finalPromptPath = finalThumbnailPromptPath || "drafts/materials/{slug}.thumbnail-prompt.md";

  return `## ブログ化用の資料一式保存フロー

最終稿本文を出力したあと、同じChatGPTチャットで続けて「ブログ化用の資料一式」と「最終版サムネイル画像生成プロンプト」を出力してもらいます。

1. 最終稿本文は ${generatedPath} に保存する
2. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう
3. 資料一式は ${materialsPath} に保存する
4. 本文ファイルと資料ファイルを混ぜない
5. メタ情報は本文には入れず、資料側にだけ入れる
6. Claude Codeは、本文と資料一式の両方を見てブログ記事MDXとして整える
7. さらに同じ台本チャットで、記事本文と資料一式を踏まえたサムネイル画像生成プロンプトを作ってもらう
8. 最終版サムネイル画像生成プロンプトは ${finalPromptPath} に保存する
9. 最終版サムネイル画像生成プロンプトをコピーして、サムネイル専用ChatGPTチャットへ移動する

資料一式には、記事タイトル案、description案、slug案、記事カテゴリ、記事種別、想定読者、この記事の役割、先に結論、見出し構成、要点まとめボックス案、本文で特に大事なポイント、メタ的な内容が残っていないかの確認結果、元記事の趣旨を壊していないかの確認結果、公式発表・報道・予測・未確定情報の整理、ファクトチェック注意点、人間が確認すべきポイント、内部リンク候補、関連記事への導線案、キャラクター会話を入れるならどこが自然か、サムネイルの方向性、サムネイルに入れる短い文字案、X投稿案、Claude Codeへのブログ化指示メモを含めてください。

最終版サムネイル画像生成プロンプトには、サムネの狙い、大きく入れる文字案、補足文字案、構図の要約、画像生成用プロンプト本文を含めてください。すまラボらしく、普通の人にもわかりやすく、難しいITニュースをやさしく整理する印象にしてください。固定テンプレではなく、この話題に合った自由な構図にし、らぼまる・ひまりは必要に応じて使ってください。実在ロゴや元記事画像のコピーは使わず、スマホでも読める短い文字にしてください。`;
}

export function buildHandoffPaths({ slug, config }) {
  return {
    articleBriefPath: `${config.paths.articleBriefDir}/${slug}.article.json`,
    articlePromptPath: `${config.paths.articlePromptDir}/${slug}.article.md`,
    generatedDraftPath: `${config.paths.generatedDraftDir}/${slug}.md`,
    materialsDraftPath: `${config.paths.materialsDraftDir}/${slug}.materials.md`,
    finalThumbnailPromptPath: `${config.paths.materialsDraftDir}/${slug}${config.paths.finalThumbnailPromptSuffix}`,
    thumbnailBriefPath: `${config.paths.thumbnailPromptDir}/${slug}.brief.json`,
    thumbnailPromptPath: `${config.paths.thumbnailPromptDir}/${slug}.prompt.md`,
    thumbnailOutputPath: `${config.paths.thumbnailOutputDir}/${slug}.png`,
    handoffPath: `${config.paths.handoffDir}/${slug}.handoff.md`,
    chromeStepsPath: `${config.paths.handoffDir}/${slug}.chrome-steps.md`,
  };
}

export function generateHandoffMarkdown({ source, slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath: paths.generatedDraftPath,
    materialsDraftPath: paths.materialsDraftPath,
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
  });

  return `# ChatGPT 5.5 handoff: ${slug}

## 対象

- slug: ${slug}
- 元記事URL: ${source.sourceUrl}
- 元記事タイトル: ${source.sourceTitle}

## 本文生成

- 本文生成用ChatGPTプロジェクトURL: ${config.chatgptTargets.articleProjectUrl}
- 本文生成用promptファイル: ${paths.articlePromptPath}
- 生成本文の保存先: ${paths.generatedDraftPath}
- ブログ化用資料一式の保存先: ${paths.materialsDraftPath}
- 最終版サムネイル画像生成プロンプトの保存先: ${paths.finalThumbnailPromptPath}

## サムネイル生成

- サムネイル生成用ChatGPTチャットURL: ${config.chatgptTargets.thumbnailChatUrl}
- 初期サムネイル案・参考プロンプト: ${paths.thumbnailPromptPath}
- サムネイル専用チャットへ貼る最終版プロンプト: ${paths.finalThumbnailPromptPath}
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
6. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう
7. 資料一式だけを ${paths.materialsDraftPath} に保存する
8. 同じ台本チャットで、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを作ってもらう
9. 最終版サムネイル画像生成プロンプトを ${paths.finalThumbnailPromptPath} に保存する
10. Chromeでサムネイル生成用ChatGPTチャットを開く
11. ${paths.finalThumbnailPromptPath} の内容を貼り付ける
12. サムネイル画像を生成する
13. 生成画像を ${paths.thumbnailOutputPath} に保存する
14. import コマンドでMDX化・サムネイル反映・preview作成へ進む

${refinementFlow}

${materialsFlow}

## 追加メモ

- 外部APIはCLIから呼びません。
- OpenAI APIキーやClaude APIキーは不要です。
- 本文・サムネイルともに、生成後は人間が確認してください。
- ChatGPTの初稿をそのまま保存せず、精錬後の最終稿だけを保存してください。
- 本文ファイルとブログ化用資料ファイルを混ぜないでください。
- ${paths.thumbnailPromptPath} は初期サムネイル案・参考プロンプトです。最終的にサムネイル専用チャットに貼るのは ${paths.finalThumbnailPromptPath} です。
`;
}

export function generateChromeStepsMarkdown({ slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath: paths.generatedDraftPath,
    materialsDraftPath: paths.materialsDraftPath,
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
  });

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

7. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう

8. 資料一式だけを以下に保存する

   ${paths.materialsDraftPath}

9. 同じ台本チャットで、記事本文と資料一式を踏まえたサムネイル画像生成プロンプトを作ってもらう

10. 最終版サムネイル画像生成プロンプトだけを以下に保存する

   ${paths.finalThumbnailPromptPath}

${refinementFlow}

${materialsFlow}

## サムネイル生成

1. Chromeで以下を開く

   ${config.chatgptTargets.thumbnailChatUrl}

2. 以下の最終版サムネイル画像生成プロンプトを貼る

   ${paths.finalThumbnailPromptPath}

3. サムネイル画像を生成する

4. 必要なら同じサムネイル専用チャット内で微修正する

5. 生成画像を以下に保存する

   ${paths.thumbnailOutputPath}

補足:
- ${paths.thumbnailPromptPath} はCLIが作る初期サムネイル案・参考プロンプトです。
- サムネイル専用チャットへ貼るのは、台本チャットで本文・資料一式を踏まえて作った ${paths.finalThumbnailPromptPath} です。

## 完了後に確認するもの

${listItems([
    paths.generatedDraftPath,
    paths.materialsDraftPath,
    paths.finalThumbnailPromptPath,
    paths.thumbnailOutputPath,
    paths.handoffPath,
    paths.chromeStepsPath,
  ])}
`;
}
