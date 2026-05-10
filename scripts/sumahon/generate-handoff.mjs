function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateRefinementFlowMarkdown({ generatedDraftPath } = {}) {
  const draftPath = generatedDraftPath || "drafts/generated/{slug}.md";

  return `## 本文生成後の精錬フロー

すまラボでは、ChatGPTの初稿をそのまま保存しません。Claude in Chromeが同じChatGPTチャット内で複数回チェック・修正し、最後に出した最終稿だけを指定パスへ保存します。

1. 初稿を生成する
2. ChatGPTが回答中の間は次の操作をしない
3. 回答完了後に、メタ的な内容が残っていないか自動チェックする
4. 記事ボリュームが十分か自動チェックする
5. 元記事の趣旨を壊していないか自動チェックする
6. すまラボらしく普通の人にもわかりやすいか自動チェックする
7. 難しいITニュースを噛み砕けているか自動チェックする
8. 公式発表、報道、予測、未確定情報を混同していないか自動チェックする
9. 不足があれば修正する
10. 必要なら再チェックする
11. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
12. ChatGPTの回答完了後に全文コピーする
13. Claude in Chromeがその最終稿だけを ${draftPath} に保存する
14. 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

初稿・途中稿・チェック結果は ${draftPath} には保存しません。必要な場合だけ別メモとして残してください。`;
}

export function generateMaterialsFlowMarkdown({ generatedDraftPath, materialsDraftPath, finalThumbnailPromptPath } = {}) {
  const generatedPath = generatedDraftPath || "drafts/generated/{slug}.md";
  const materialsPath = materialsDraftPath || "drafts/materials/{slug}.materials.md";
  const finalPromptPath = finalThumbnailPromptPath || "drafts/materials/{slug}.thumbnail-prompt.md";

  return `## ブログ化用の資料一式保存フロー

最終稿本文を出力したあと、Claude in Chromeが台本チャットで続けて「ブログ化用の資料一式」と「最終版サムネイル画像生成プロンプト」を出力させ、指定パスへ保存します。サムネイル画像そのものの生成は、別途毎回新規ChatGPTチャットで行います。

1. 最終稿本文は ${generatedPath} に保存済みであることを自動確認する
2. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう
3. ChatGPTの回答完了後に全文コピーする
4. Claude in Chromeが資料一式を ${materialsPath} に保存する
5. 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する
6. 本文ファイルと資料ファイルを混ぜない
7. メタ情報は本文には入れず、資料側にだけ入れる
8. Claude Codeは、本文と資料一式の両方を見てブログ記事MDXとして整える
9. 続けて、記事本文と資料一式を踏まえたサムネイル画像生成プロンプトを作ってもらう
10. ChatGPTの回答完了後に全文コピーする
11. Claude in Chromeが最終版サムネイル画像生成プロンプトを ${finalPromptPath} に保存する
12. 保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認する
13. サムネイル画像生成は、毎回サムネイル専用の新規ChatGPTチャットで行う（使い回しチャットは使わない）

資料一式には、記事タイトル案、description案、slug案、記事カテゴリ、記事種別、想定読者、この記事の役割、先に結論、見出し構成、要点まとめボックス案、本文で特に大事なポイント、メタ的な内容が残っていないかの自動チェック結果、元記事の趣旨を壊していないかの自動チェック結果、公式発表・報道・予測・未確定情報の整理、ファクトチェック注意点、最終ファクトチェックで確認するポイント、内部リンク候補、関連記事への導線案、キャラクター会話を入れるならどこが自然か、サムネイルの方向性、サムネイルに入れる短い文字案、X投稿案、Claude Codeへのブログ化指示メモを含めてください。

最終版サムネイル画像生成プロンプトには、サムネの狙い、大きく入れる文字案、補足文字案、構図の要約、画像生成用プロンプト本文を含めてください。すまラボらしく、普通の人にもわかりやすく、難しいITニュースをやさしく整理する印象にしてください。固定テンプレではなく、この話題に合った自由な構図にし、らぼまる・ひまりは必要に応じて使ってください。実在ロゴや元記事画像のコピーは使わず、スマホでも読める短い文字にしてください。

サムネイル構図方針:

- 「ひまりが質問、らぼまるが説明」の固定構図にしない
- 2人とも記事内容を理解した後の反応を見せる
- 良いニュースなら前向きな反応、悪いニュースなら悲しむ・心配する反応、判断が分かれる話なら慎重・困惑など、話題に応じたリアクションにする`;
}

export function generateThumbnailImageFlowMarkdown({ finalThumbnailPromptPath, thumbnailOutputPath, thumbnailAttach } = {}) {
  const finalPromptPath = finalThumbnailPromptPath || "drafts/materials/{slug}.thumbnail-prompt.md";
  const outputPath = thumbnailOutputPath || "public/images/thumbnails/{slug}.png";
  const uwscExe = (thumbnailAttach && thumbnailAttach.uwscExe) || "D:\\documents\\uwsc5302\\UWSC.exe";
  const uwscScript = (thumbnailAttach && thumbnailAttach.uwscScript) || "scripts/automation/chatgpt-attach-base-images.uws";
  const baseDir = (thumbnailAttach && thumbnailAttach.baseImageDir) || "public/images/characters/base";
  const baseImages = (thumbnailAttach && thumbnailAttach.baseImages) || ["himari-base.png", "labomaru-base.png"];
  const downloadsDir = (thumbnailAttach && thumbnailAttach.downloadsDir) || "D:\\downloads";

  return `## サムネイル画像生成フロー（UWSC連携・新規ChatGPTチャット）

サムネイル画像生成は **毎回新規ChatGPTチャット** で行います。使い回しチャットや台本チャットの中では生成しません。ローカルのキャラクターベース画像をChatGPTへ添付するため、Claude in Chromeが「＋」→「写真とファイルを追加」までを画面上の実UIで操作し、開いたWindowsファイル選択ダイアログをUWSCで操作します。

### Claude in Chromeが自動実行する手順

1. Chromeで新規ChatGPTチャットを開く（\`https://chatgpt.com/\`）
2. 開いた新規タブをChromeウィンドウの**可視タブ**にする（古いタブを閉じるか、対象タブを最前面に切り替える。背景タブのままだとOSダイアログが上がらない）
3. PowerShellでChromeウィンドウを\`SetForegroundWindow\`し、フォアグラウンド化する
4. 入力欄左の「＋」ボタン（aria-label \`ファイルの追加など\`）を画面上の実UIとしてクリックする
   - hidden file input は直接クリックしない
   - JavaScriptで file input を直接 \`.click()\` しない
   - \`file_upload\` API は使わない
5. 開いたメニューから「写真とファイルを追加」menuitem を画面上の実UIとしてクリックする
6. Windowsファイル選択ダイアログ（クラス \`#32770\`）が出るまで200msごとにポーリングする（最大2秒程度）
7. ダイアログが出たら、PowerShellでUWSCを実行する
   \`\`\`
   & "${uwscExe}" "${uwscScript}"
   \`\`\`
8. UWSCは ${baseDir} を開き、\`"${baseImages.join('" "')}"\` をファイル名欄に入れて2画像を選択する
9. UWSC終了後、ChatGPT入力欄に2件添付されたかDOMで確認する
10. もし添付できておらず\`#32770\`がまだ開いているなら、同じUWSCスクリプトをそのまま再実行する（最大3回）。3回失敗で「サムネイル生成失敗・最終確認待ち」として記録する
11. 添付2件確認後、${finalPromptPath} を入力欄に貼り付けて送信する
12. ChatGPTが回答中・画像生成中の間は次の操作をしない
13. 画像生成完了を待ち、\`alt="画像が生成されました"\` の \`<img>\` を取得する
14. 生成画像を fetch + Blob + \`<a download>\` でダウンロードする（${downloadsDir} に保存される想定）
15. ${downloadsDir} の最新画像を ${outputPath} に移動・リネームする（拡張子は元の拡張子に合わせる。無理にpngへ変えない）
16. ファイル存在を自動確認する

### 失敗時の自動リトライ

サムネイル画像生成自体に失敗した場合は、Claude in Chromeが最大3回まで自動リトライします。1回目・2回目は同じプロンプトで再試行し、3回目はプロンプトを簡略化して再試行します。3回失敗した場合は、サムネイル生成失敗として最終確認待ちにします。

リトライ対象:
- 画像が生成されない
- エラー表示が出る
- 生成が途中で止まった
- 画像枠は出たが画像が読み込まれない
- ダウンロードできる画像が表示されない
- 記事内容と無関係な画像が生成された`;
}

export function generateThumbnailRetryFlowMarkdown({ thumbnailOutputPath } = {}) {
  const outputPath = thumbnailOutputPath || "public/images/thumbnails/{slug}.png";

  return `## サムネイル画像生成失敗時の自動リトライ

サムネイル画像生成でエラーが出た場合は、Claude in Chromeが最大3回まで自動リトライします。1回目・2回目は同じプロンプトで再試行し、3回目はプロンプトを簡略化して再試行します。3回失敗した場合は、サムネイル生成失敗として最終確認待ちにします。

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
4. 3回目失敗: 数秒待ってから、文字量・構図指定・細かすぎる装飾指定を減らした簡略版プロンプトで再送信する
5. 簡略版でも、記事テーマ、すまラボらしさ、実在ロゴを使わない条件、元記事画像をコピーしない条件は維持する
6. 3回失敗した場合は、それ以上は自動生成を続けず「サムネイル生成失敗・最終確認待ち」として記録する

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
  const thumbnailImageFlow = generateThumbnailImageFlowMarkdown({
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
    thumbnailOutputPath: paths.thumbnailOutputPath,
    thumbnailAttach: config.thumbnailAttach,
  });

  const thumbnailNewChatUrl = config.chatgptTargets.thumbnailNewChatUrl || "https://chatgpt.com/";
  const uwscExe = (config.thumbnailAttach && config.thumbnailAttach.uwscExe) || "D:\\documents\\uwsc5302\\UWSC.exe";
  const uwscScript = (config.thumbnailAttach && config.thumbnailAttach.uwscScript) || "scripts/automation/chatgpt-attach-base-images.uws";

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

- 初期サムネイル案・参考プロンプト: ${paths.thumbnailPromptPath}
- 実際に使う最終版サムネイル画像生成プロンプト: ${paths.finalThumbnailPromptPath}
- 標準手順: 毎回サムネイル生成専用の新規ChatGPTチャットを開き、ベース画像2枚をUWSC経由で添付してから最終版プロンプトを送信する
- 新規ChatGPTチャットURL: ${thumbnailNewChatUrl}
- 生成画像の最終保存先: ${paths.thumbnailOutputPath}
- UWSC実行ファイル: ${uwscExe}
- UWSCスクリプト: ${uwscScript}
- 補足: 生成画像は通常のダウンロード先に保存される想定。あとから ${paths.thumbnailOutputPath} へ移動・リネームする。拡張子だけ無理にpngへ変えない。

## ブラウザ操作ポリシー

- 使用するブラウザ: ${config.browserPolicy.useBrowser}
- 使用しないブラウザ: ${config.browserPolicy.doNotUse}
- 重要: Chromeだけを使ってください。
- 重要: Edgeは操作しないでください。
- 重要: hidden file inputの直接クリック、JavaScriptでの file input 直接発火、\`file_upload\` APIは使わないでください。
- 重要: 「＋」ボタンと「写真とファイルを追加」は画面上の実UIをクリックしてください。

## Claude in Chromeが自動実行する作業

1. Chromeで本文生成用ChatGPTプロジェクトを開く
2. ${paths.articlePromptPath} の内容を貼り付ける
3. ChatGPT 5.5で本文の初稿を生成する
4. ChatGPTが回答中の間は次の操作をしない
5. 回答完了後、同じチャット内で下記の精錬フローに沿ってチェック・修正する
6. 最後に最終稿だけを全文コピーし、${paths.generatedDraftPath} に保存する
7. 保存後、ファイル存在と本文の完了を自動確認する
8. 続けて、ブログ化用の資料一式をChatGPTに出力させる
9. 回答完了後、資料一式だけを全文コピーし、${paths.materialsDraftPath} に保存する
10. 保存後、ファイル存在と資料の完了を自動確認する
11. 続けて、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを作ってもらう
12. 回答完了後、最終版サムネイル画像生成プロンプトを全文コピーし、${paths.finalThumbnailPromptPath} に保存する
13. 保存後、ファイル存在とプロンプトの完了を自動確認する
14. **サムネイル画像生成専用の新規ChatGPTチャットを開く**（使い回しチャットや台本チャットの中では生成しない）
15. 新規タブをChromeウィンドウの**可視タブ**にし、Chromeを\`SetForegroundWindow\`でフォアグラウンド化する
16. 入力欄左の「＋」ボタン（aria-label \`ファイルの追加など\`）を画面上の実UIとしてクリックする
17. 開いたメニューから「写真とファイルを追加」menuitem を画面上の実UIとしてクリックする
18. Windowsファイル選択ダイアログ（\`#32770\`）が出るまでポーリングする
19. ダイアログ確認後、PowerShellで\`& "${uwscExe}" "${uwscScript}"\` を実行し、ベース画像2枚を添付する
20. 1回目で添付できなければ、ダイアログが残っていれば同じUWSCを最大3回まで再実行する
21. 添付2件をDOMで確認する
22. ${paths.finalThumbnailPromptPath} を入力欄に貼り付けて送信する
23. ChatGPTが画像生成中の間は次の操作をしない
24. 画像生成完了を待ち、生成画像をダウンロードする
25. ダウンロード完了を自動確認する
26. その後、${paths.thumbnailOutputPath} へ移動・リネームする（元拡張子に合わせる）

## Claude Codeが自動実行する作業

1. ${paths.generatedDraftPath} と ${paths.materialsDraftPath} を読み込む
2. サムネイル画像が配置済みなら ${paths.thumbnailOutputPath} を記事frontmatterへ反映する
3. article:import-generated でMDX化する
4. review / factcheck / previewログを保存する
5. npm run build を実行する
6. build成功後、previewブランチへcommit / pushする

## 最後に人間が確認すること

- 公式情報と矛盾していないか
- 未確定情報を断定していないか
- 料金・日付・対象プランなどが最新か
- 画像・サムネイルに問題がないか（実在ロゴ混入なし、元記事画像コピーなし、文字がスマホで読めるか）
- 公開してよいか

${refinementFlow}

${materialsFlow}

${thumbnailImageFlow}

## 追加メモ

- 外部APIはCLIから呼びません。
- OpenAI APIキーやClaude APIキーは不要です。
- 本文・サムネイルともに、通常工程ではClaude in Chrome / Claude Codeが自動実行し、最後に人間が最終ファクトチェックと公開判断のみ行います。
- ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します。
- 本文ファイルとブログ化用資料ファイルを混ぜないでください。
- ${paths.thumbnailPromptPath} は初期サムネイル案・参考プロンプトです。実際に主で使うのは、台本チャットで本文・資料一式を踏まえて作る ${paths.finalThumbnailPromptPath} です。
- サムネイル画像生成は毎回サムネイル専用の新規ChatGPTチャットで行い、使い回しチャットは使わないでください。
- UWSC連携を含む添付フローの詳細は docs/uwsc_chatgpt_file_attach_test.md を参照。
`;
}

export function generateChromeStepsMarkdown({ slug, paths, config }) {
  const refinementFlow = generateRefinementFlowMarkdown({ generatedDraftPath: paths.generatedDraftPath });
  const materialsFlow = generateMaterialsFlowMarkdown({
    generatedDraftPath: paths.generatedDraftPath,
    materialsDraftPath: paths.materialsDraftPath,
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
  });
  const thumbnailImageFlow = generateThumbnailImageFlowMarkdown({
    finalThumbnailPromptPath: paths.finalThumbnailPromptPath,
    thumbnailOutputPath: paths.thumbnailOutputPath,
    thumbnailAttach: config.thumbnailAttach,
  });

  const thumbnailNewChatUrl = config.chatgptTargets.thumbnailNewChatUrl || "https://chatgpt.com/";
  const uwscExe = (config.thumbnailAttach && config.thumbnailAttach.uwscExe) || "D:\\documents\\uwsc5302\\UWSC.exe";
  const uwscScript = (config.thumbnailAttach && config.thumbnailAttach.uwscScript) || "scripts/automation/chatgpt-attach-base-images.uws";
  const baseDir = (config.thumbnailAttach && config.thumbnailAttach.baseImageDir) || "public/images/characters/base";
  const baseImages = (config.thumbnailAttach && config.thumbnailAttach.baseImages) || ["himari-base.png", "labomaru-base.png"];

  return `# Chrome操作手順: ${slug}

重要:
- 普段使っているEdgeは操作しないでください。
- ブラウザ操作は必ずChromeだけで行ってください。
- hidden file inputの直接クリック、JavaScriptでの file input 直接発火、\`file_upload\` APIは使わないでください。
- 「＋」ボタンと「写真とファイルを追加」は画面上の実UIをクリックしてください。
- サムネイル画像生成は毎回新規ChatGPTチャットで行い、台本チャットの中や使い回しチャットでは行わないでください。

## Claude in Chromeが実行する本文生成

1. Chromeで以下を開く

   ${config.chatgptTargets.articleProjectUrl}

2. 以下のファイルの内容を貼る

   ${paths.articlePromptPath}

3. ChatGPT 5.5で本文の初稿を生成する

4. ChatGPTが回答中の間は次の操作をしない

5. 回答完了後、同じチャット内で、下記の精錬フローに沿ってチェック・修正する

6. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する

7. ChatGPTの回答完了後に全文コピーする

8. Claude in Chromeが最終稿だけを以下に保存する

   ${paths.generatedDraftPath}

9. 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

10. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう

11. ChatGPTの回答完了後に全文コピーする

12. Claude in Chromeが資料一式だけを以下に保存する

   ${paths.materialsDraftPath}

13. 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する

14. 続けて、記事本文と資料一式を踏まえたサムネイル画像生成プロンプトを作ってもらう

15. ChatGPTの回答完了後に全文コピーする

16. Claude in Chromeが最終版サムネイル画像生成プロンプトだけを以下に保存する

   ${paths.finalThumbnailPromptPath}

17. 保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認する

${refinementFlow}

${materialsFlow}

## サムネイル画像生成（標準手順・新規ChatGPTチャット + UWSC連携）

1. Chromeで新規ChatGPTチャットを開く

   ${thumbnailNewChatUrl}

2. 開いた新規タブをChromeウィンドウの**可視タブ**にする（古いタブを閉じるか、対象タブを最前面に切り替える）

3. ChromeウィンドウをPowerShellで\`SetForegroundWindow\`し、フォアグラウンド化する

4. 入力欄左の「＋」ボタン（aria-label \`ファイルの追加など\`）を画面上の実UIとしてクリックする

5. 開いたメニューから「写真とファイルを追加」menuitem を画面上の実UIとしてクリックする

6. Windowsファイル選択ダイアログ（クラス \`#32770\`）が出るまでポーリングする（200msごと、最大2秒程度）

7. ダイアログ確認後、PowerShellでUWSCを実行する

   \`\`\`
   & "${uwscExe}" "${uwscScript}"
   \`\`\`

   UWSCは ${baseDir} を開き、\`"${baseImages.join('" "')}"\` をファイル名欄に入れて2画像を選択する

8. UWSC終了後、ChatGPT入力欄に2件添付されたかDOMで確認する

9. 1回目で添付できなければ、ダイアログがまだ開いている場合は同じUWSCをそのまま再実行する（最大3回）

10. 添付2件確認後、以下の最終版サムネイル画像生成プロンプトを入力欄に貼り付けて送信する

   ${paths.finalThumbnailPromptPath}

11. ChatGPTが回答中・画像生成中の間は次の操作をしない

12. 生成完了を待ち、生成画像をダウンロードする（fetch + Blob + \`<a download>\`）

13. ダウンロード完了を自動確認する

14. その後、Claude in ChromeまたはClaude Codeが以下へ移動・リネームする

   ${paths.thumbnailOutputPath}

   元拡張子に合わせる。拡張子だけ無理にpngへ変えない。

${thumbnailImageFlow}

補足:
- ${paths.thumbnailPromptPath} はCLIが作る初期サムネイル案・参考プロンプトです。
- 実際に主で使うのは、台本チャットで本文・資料一式を踏まえて作った ${paths.finalThumbnailPromptPath} です。
- 添付フローのトラブルシューティングは docs/uwsc_chatgpt_file_attach_test.md を参照。

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
- 画像・サムネイルに問題がないか（実在ロゴ混入なし、元記事画像コピーなし、文字がスマホで読めるか）
- 公開してよいか
`;
}
