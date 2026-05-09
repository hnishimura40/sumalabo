function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateRefinementFlowMarkdown({ generatedDraftPath } = {}) {
  const draftPath = generatedDraftPath || "drafts/generated/{slug}.md";

  return `## 本文生成後の精錬フロー

すまラボでは、ChatGPTの初稿をそのまま保存しません。Claude in Chromeが同じChatGPTチャット内で複数回チェック・修正し、最後に出力された最終稿だけを指定パスへ保存します。

1. 初稿を生成する
2. ChatGPTが回答中の間は次の操作をしない
3. 回答完了後に、メタ的な内容が残っていないか自動チェックする
4. 記事のボリュームが十分か自動チェックする
5. 元記事の趣旨を壊していないか自動チェックする
6. すまラボらしく、普通の人にもわかりやすいか自動チェックする
7. 難しいITニュースを噛み砕けているか自動チェックする
8. 公式発表、報道、予測、未確定情報を混同していないか自動チェックする
9. 不足があれば修正する
10. 必要なら再チェックする
11. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
12. ChatGPTの回答完了後に全文コピーする
13. Claude in Chromeがその最終稿だけを ${draftPath} に保存する
14. 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

初稿・途中稿・チェック結果は ${draftPath} には保存しません。必要な場合だけ別メモ扱いにしてください。`;
}

export function generateMaterialsFlowMarkdown({
  generatedDraftPath,
  materialsDraftPath,
  finalThumbnailPromptPath,
  himariBaseImagePath,
  labomaruBaseImagePath,
  thumbnailOutputPath,
} = {}) {
  const generatedPath = generatedDraftPath || "drafts/generated/{slug}.md";
  const materialsPath = materialsDraftPath || "drafts/materials/{slug}.materials.md";
  const finalPromptPath = finalThumbnailPromptPath || "drafts/materials/{slug}.thumbnail-prompt.md";
  const himariPath = himariBaseImagePath || "public/images/characters/base/himari-base.png";
  const labomaruPath = labomaruBaseImagePath || "public/images/characters/base/labomaru-base.png";
  const outputPath = thumbnailOutputPath || "public/images/thumbnails/{slug}.png";

  return `## ブログ化用の資料一式とサムネイルプロンプト保存フロー

最終稿本文を保存したあと、Claude in Chromeは同じ台本チャットで「ブログ化用資料一式」と「最終版サムネイル画像生成プロンプト」を作成し、本文とは別ファイルとして保存します。

1. 最終稿本文が ${generatedPath} に保存済みであることを自動確認する
2. 同じ台本チャットで、ブログ化用資料一式をChatGPTに出力してもらう
3. ChatGPTの回答完了後に全文コピーする
4. Claude in Chromeが資料一式を ${materialsPath} に保存する
5. 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する
6. 本文ファイルと資料ファイルを混ぜない
7. メタ情報は本文には入れず、資料側にだけ入れる
8. Claude Codeは、本文と資料一式の両方を見てブログ記事MDXとして整える
9. 続けて同じ台本チャットで、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを作ってもらう
10. ChatGPTの回答完了後に全文コピーする
11. Claude in Chromeが最終版サムネイル画像生成プロンプトを ${finalPromptPath} に保存する
12. 保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認する

サムネイル画像生成は、本文生成用チャットでは行いません。Claude in Chromeが毎回新しいサムネイル生成チャットを開き、以下のベース絵2枚をアップロードしてから、${finalPromptPath} の内容を貼り付けます。

- ひまりベース絵: ${himariPath}
- らぼまるベース絵: ${labomaruPath}

生成画像はいったん通常のダウンロード先に保存される想定です。ダウンロード完了後、Claude in ChromeまたはClaude Codeが ${outputPath} へ移動・リネームし、ファイル存在を自動確認します。`;
}

export function generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath } = {}) {
  const outputPath = thumbnailOutputPath || "public/images/thumbnails/{slug}.png";

  return `## サムネイル画像生成失敗時の自動リトライ

サムネイル画像生成でエラーが出た場合は、Claude in Chromeが最大3回まで自動リトライします。1回目・2回目は同じ最終版サムネイルプロンプトで再試行し、3回目はプロンプトを簡略化して再試行します。3回失敗した場合は、それ以上は自動生成を続けず、「サムネイル生成失敗・最終確認待ち」として記録します。

リトライ対象:
- 画像が生成されない
- エラー表示が出る
- 生成が途中で止まった
- 画像枠は出たが画像が読み込まれない
- ダウンロードできる画像が表示されない
- 記事内容と無関係な画像が生成された

リトライ手順:
1. ChatGPTが回答中・画像生成中の場合は、完了または失敗表示が出るまで次の操作をしない
2. 1回目失敗: 数秒待ってから同じ最終版サムネイルプロンプトをそのまま再送信する
3. 2回目失敗: 数秒待ってから同じ最終版サムネイルプロンプトをもう一度再送信する
4. 3回目失敗: 数秒待ってから、文字量・構図指定・細かい装飾指定を少し減らした簡略版プロンプトで再送信する
5. 簡略版でも、記事テーマ、すまラボらしさ、ひまり・らぼまるのベース絵参照、実在ロゴを使わない条件は維持する
6. 3回失敗した場合は、それ以上は自動生成を続けない

成功判定:
- サムネイル画像が画面に表示された
- ダウンロード可能な状態になった
- 画像をダウンロードできた
- ダウンロードフォルダに画像ファイルが存在する
- その画像を ${outputPath} または元拡張子に合わせたファイル名へ移動できた

ダウンロード後の確認:
1. D:\\downloads に最新画像が保存されたことを確認する
2. 最新の画像ファイルを ${outputPath} へ移動・リネームする
3. 画像ファイルの存在を自動確認する
4. 成功した画像だけをClaude Code側のMDX反映へ進める

注意:
- 無限リトライしない
- エラー時にEdgeは使わない
- Chromeだけで操作する
- 失敗した途中画像や不完全な画像は保存しない
- 関係ない画像が生成された場合は成功扱いにしない`;
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
    himariBaseImagePath: config.paths.himariBaseImagePath || "public/images/characters/base/himari-base.png",
    labomaruBaseImagePath: config.paths.labomaruBaseImagePath || "public/images/characters/base/labomaru-base.png",
    handoffPath: `${config.paths.handoffDir}/${slug}.handoff.md`,
    chromeStepsPath: `${config.paths.handoffDir}/${slug}.chrome-steps.md`,
  };
}

function thumbnailReactionPolicyMarkdown() {
  return `## サムネイル構図方針

今回から、サムネイルは「ひまりが“これ何？”と聞き、らぼまるが説明する」構図を基本形にしません。

基本方針:
- ひまり・らぼまるは、記事内容をある程度理解した状態で登場する
- 説明中ではなく、理解後の反応を見せる
- ニュースや製品内容に応じて、感情や評価を変える
- 「なるほど、こういう話か」「で、結局どうなの？」「これは便利そう」「これはちょっと困る」など、読者が記事を読んだ後の判断に近い反応を見せる

反応の目安:
- 良いニュース・便利そうな話: 前向き、感心、うれしい、わくわく
- 判断が分かれる話: 困惑、気になる、慎重、考え中
- 悪いニュース・改悪・値上げ: 悲しい、困る、残念、不安
- グッズ・周辺機器: 使ってみたい、便利そう、楽しそう
- 比較・選び方: 納得、整理できた、比較して理解した反応`;
}

export function generateHandoffMarkdown({ source, slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath: paths.generatedDraftPath,
    materialsDraftPath: paths.materialsDraftPath,
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
    himariBaseImagePath: paths.himariBaseImagePath,
    labomaruBaseImagePath: paths.labomaruBaseImagePath,
    thumbnailOutputPath: paths.thumbnailOutputPath,
  });
  const thumbnailRetryFlow = generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath: paths.thumbnailOutputPath });

  return `# ChatGPT 5.5 handoff: ${slug}

## 対象

- slug: ${slug}
- 元記事URL: ${source.sourceUrl}
- 元記事タイトル: ${source.sourceTitle}

## 本文生成

- 本文生成用ChatGPTプロジェクトURL: ${config.chatgptTargets.articleProjectUrl}
- 本文生成用promptファイル: ${paths.articlePromptPath}
- 最終稿本文の保存先: ${paths.generatedDraftPath}
- ブログ化用資料一式の保存先: ${paths.materialsDraftPath}
- 最終版サムネイル画像生成プロンプトの保存先: ${paths.finalThumbnailPromptPath}

## サムネイル生成

- CLIが生成する初期サムネイル案・参考プロンプト: ${paths.thumbnailPromptPath}
- 実際に使う最終版サムネイル画像生成プロンプト: ${paths.finalThumbnailPromptPath}
- ひまりベース絵: ${paths.himariBaseImagePath}
- らぼまるベース絵: ${paths.labomaruBaseImagePath}
- サムネイル画像の最終保存先: ${paths.thumbnailOutputPath}

標準手順では、サムネイル生成は毎回新しいチャットで行います。サムネイル専用チャットを使い回しません。本文生成用チャットとも分けます。

Claude in Chromeは新しいサムネイル生成チャットを開き、ひまり・らぼまるのベース絵2枚を毎回アップロードしてから、${paths.finalThumbnailPromptPath} の内容を貼り付けます。生成画像は通常のダウンロード先に保存された後、${paths.thumbnailOutputPath} へ移動・リネームします。

参考URLとして既存のサムネイル用ChatGPT URLがある場合でも、使い回しチャットとしては扱いません。必要時は、その記事専用の新しいチャットを開いてください。

${thumbnailReactionPolicyMarkdown()}

## ブラウザ操作ポリシー

- 使用するブラウザ: ${config.browserPolicy.useBrowser}
- 使用しないブラウザ: ${config.browserPolicy.doNotUse}
- 重要: Chromeだけを使ってください
- 重要: Edgeは操作しないでください

## Claude in Chromeが実行する作業

1. Chromeで本文生成用ChatGPTプロジェクトを開く
2. ${paths.articlePromptPath} の内容を貼り付ける
3. ChatGPT 5.5で本文の初稿を生成する
4. ChatGPTが回答中の間は次の操作をしない
5. 回答完了後、同じチャット内で精錬フローに沿ってチェック・修正する
6. 最終稿本文だけを全文コピーし、${paths.generatedDraftPath} に保存する
7. 保存後、ファイル存在と本文の完了を自動確認する
8. 同じ台本チャットでブログ化用資料一式を出力してもらう
9. 資料一式だけを全文コピーし、${paths.materialsDraftPath} に保存する
10. 保存後、ファイル存在と資料の完了を自動確認する
11. 同じ台本チャットで、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを出力してもらう
12. 最終版プロンプトだけを全文コピーし、${paths.finalThumbnailPromptPath} に保存する
13. 保存後、ファイル存在とプロンプトの完了を自動確認する
14. Chromeで新しいサムネイル生成チャットを開く
15. ひまりベース絵 ${paths.himariBaseImagePath} をアップロードする
16. らぼまるベース絵 ${paths.labomaruBaseImagePath} をアップロードする
17. ${paths.finalThumbnailPromptPath} の内容を貼り付ける
18. サムネイル画像を生成する
19. 失敗時はリトライ手順に従う
20. 成功後に画像をダウンロードする
21. D:\\downloads に保存された最新画像を確認する
22. ${paths.thumbnailOutputPath} へ移動・リネームする
23. ファイル存在を自動確認する

## Claude Codeが実行する作業

1. ${paths.generatedDraftPath} と ${paths.materialsDraftPath} を読み込む
2. サムネイル画像が配置済みなら ${paths.thumbnailOutputPath} を記事へ反映する
3. article:import-generated でMDX化する
4. review / factcheck / previewログを保存する
5. npm run build を実行する
6. build成功後、previewブランチへcommit / pushする

## 最後に人間が確認すること

- 公式情報と矛盾していないか
- 未確定情報を断定していないか
- 料金・日付・対象プランなどが最新か
- 画像・サムネイルに問題がないか
- 公開してよいか

${refinementFlow}

${materialsFlow}

${thumbnailRetryFlow}

## 追加メモ

- 外部APIはCLIから呼びません
- OpenAI APIキーやClaude APIキーは不要です
- 通常工程では自動チェックし、最後に人間が最終ファクトチェックします
- ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します
- 本文ファイルとブログ化用資料ファイルを混ぜないでください
- ${paths.thumbnailPromptPath} は初期サムネイル案・参考プロンプトです。実際に主で使うのは、台本チャットで本文・資料一式を踏まえて作る ${paths.finalThumbnailPromptPath} です
- サムネイル生成は毎回新しいチャットで行います。サムネイル専用チャットの使い回しはしません
- ひまり・らぼまるのベース絵は毎回アップロードしてから生成します`;
}

export function generateChromeStepsMarkdown({ slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath: paths.generatedDraftPath,
    materialsDraftPath: paths.materialsDraftPath,
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
    himariBaseImagePath: paths.himariBaseImagePath,
    labomaruBaseImagePath: paths.labomaruBaseImagePath,
    thumbnailOutputPath: paths.thumbnailOutputPath,
  });
  const thumbnailRetryFlow = generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath: paths.thumbnailOutputPath });

  return `# Chrome操作手順: ${slug}

重要:
- Edgeは操作しない
- Chromeだけを使う
- ChatGPTが回答中・画像生成中の間は次の操作をしない

## 本文生成

1. Chromeで本文・台本生成用ChatGPTプロジェクトを開く

   ${config.chatgptTargets.articleProjectUrl}

2. 以下のファイルの内容を貼る

   ${paths.articlePromptPath}

3. 初稿を生成する
4. 同じチャット内でチェック・修正・再チェックを行う
5. 最後に最終稿本文だけを全文再出力してもらう
6. ChatGPTの回答完了後に全文コピーする
7. Claude in Chromeが最終稿本文を以下に保存する

   ${paths.generatedDraftPath}

8. 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

${refinementFlow}

## ブログ化用資料

1. 同じ台本チャットで、ブログ化用資料一式を出力してもらう
2. ChatGPTの回答完了後に全文コピーする
3. Claude in Chromeが資料一式を以下に保存する

   ${paths.materialsDraftPath}

4. メタ情報は本文に入れず、資料側にだけ入れる
5. 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する

## 最終版サムネイルプロンプト

1. 同じ台本チャットで、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを出力してもらう
2. ChatGPTの回答完了後に全文コピーする
3. Claude in Chromeがプロンプトを以下に保存する

   ${paths.finalThumbnailPromptPath}

4. 保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認する

${materialsFlow}

## サムネイル画像生成（標準手順）

1. Chromeで新しいサムネイル生成チャットを開く
2. 既存のサムネイル専用チャットは使い回さない
3. ひまりベース絵をアップロードする

   ${paths.himariBaseImagePath}

4. らぼまるベース絵をアップロードする

   ${paths.labomaruBaseImagePath}

5. 以下の最終版サムネイルプロンプトの内容を貼る

   ${paths.finalThumbnailPromptPath}

6. サムネイル画像を生成する
7. 失敗時は既存のリトライ手順に従う
8. 成功後に画像をダウンロードする
9. D:\\downloads に保存された画像を確認する
10. 画像を以下へ移動・リネームする

   ${paths.thumbnailOutputPath}

11. 画像ファイルの存在を自動確認する

${thumbnailRetryFlow}

${thumbnailReactionPolicyMarkdown()}

## 自動確認するファイル

${listItems([
    paths.generatedDraftPath,
    paths.materialsDraftPath,
    paths.finalThumbnailPromptPath,
    paths.thumbnailOutputPath,
    paths.handoffPath,
    paths.chromeStepsPath,
  ])}

## 最後に人間が確認すること

- 公式情報と矛盾していないか
- 未確定情報を断定していないか
- 料金・日付・対象プランなどが最新か
- 画像・サムネイルに問題がないか
- 公開してよいか`;
}
