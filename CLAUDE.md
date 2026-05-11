# CLAUDE.md — すまラボ自動化の役割分担と運用ポリシー

このドキュメントは、すまラボ記事作成・公開ワークフローにおける **Claude Code / Claude in Chrome がやること** と **人間（運営者）がやること** の境界を固定するためのものです。今後のセッションでもこのポリシーを **既定** として動きます。

## 結論

**人間に求めるのは「最後の承認判断」だけ。** それ以外の自動化作業はすべて Claude Code 側で完結させます。

## 人間（運営者）の役割

| やること | やらないこと |
|---|---|
| PWA または Cloudflare Preview で記事を確認する | PR の作成 / マージ操作 |
| 問題がなければ承認ボタンを押す（`/api/approve-preview`） | Preview URL の探索・コピー |
| ファクトチェックの最終目視（記事の核となる主張・サムネのロゴ混入有無・参考URLの到達確認など） | secret の同期 / Cloudflare 設定確認 |
| 中止・修正方針の判断（必要時のみ） | スクリーンショット取得 |
| | ChatGPT への画像添付・コピペ |
| | `npm run build` などの手動実行 |
| | `git push` / branch 切替 |

人間が手を動かすのは **PWA の承認ボタンを押す瞬間** だけが理想形。それ以外は Claude が自分で進めてダメなら自動診断・自動リトライ・最終報告までやる。

## Claude Code / Claude in Chrome の役割

以下を **すべて自律的に** 実行する。途中で人間に対話を求めない（修正方針の選択肢を提示するなど、判断が必要なときだけ最小限聞く）:

1. **元記事の発見・要点メモ生成**（`scripts/run/sumahon-watch.mjs` などの自動ループから）
2. **記事本文生成プロンプト作成 → ChatGPT で本文生成 → 精錬 → 最終稿を `drafts/generated/{slug}.md` に保存**
3. **ブログ化用資料一式生成 → `drafts/materials/{slug}.materials.md` に保存**
4. **最終版サムネイル画像生成プロンプト作成 → `drafts/materials/{slug}.thumbnail-prompt.md` に保存**
5. **サムネ生成専用 ChatGPT チャットを開く → ベース画像 2 枚を `scripts/automation/chatgpt-attach-files-clipboard.ps1` で 1 枚ずつ CF_HDROP 貼り付け（UWSC はフォールバック）→ 画像生成 → ダウンロード → `public/images/thumbnails/{slug}.png` へ配置**
6. **MDX 化 (`article:import-generated`)**
   - `sourceCheck` (`validateSourceReferences`)
   - `articleQualityCheck` (`validateArticleQuality`、`validateCharacterVisualPresence` 含む)
   - blocking があれば自動修正 → 再検証 → なお blocking なら人間に最小限の相談
7. **`npm run build`** で 30 ページ生成を確認
8. **Preview ブランチ `preview/{slug}` を作成 → commit → push**（`git add .` は使わない。関係ない drafts / logs は add しない）
9. **PR 作成 (`gh pr create`)** — main ブランチへの直接 push は禁止
10. **Cloudflare Pages の Preview URL を `gh pr view --json comments` から自動取得** — 推測しない、コメントを必ずパースする
11. **PWA へ通知**: `scripts/run/notify-review-ready.mjs` で `/api/push/notify-review-ready` を叩き、`X-Notify-Secret` 付きで Web Push を送る。secret 未設定なら warning でスキップ（人間に同期させない、`functions/api/push/check-secret.ts` で自動確認する）
12. **visualPreviewReview** — Preview デプロイ完了後、Claude in Chrome がスマホ幅 + PC 幅のスクショを取得し、ChatGPT に 1 枚ずつ添付して 2 パスレビュー（読みやすさ / ファクトチェック）。結果は `logs/visual-review/{slug}/` に保存（main にはマージしない、`.gitignore` 対象）
13. **必要なら追加修正 → 再 build → 再 push**
14. **失敗時の自動診断**:
    - build 失敗 → エラーログを構造化して原因分類、最小修正で再試行（最大 3 回）
    - Cloudflare デプロイ失敗 → `gh pr view --json statusCheckRollup` で SUCCESS/FAILURE を判定、失敗詳細を `logs/automation/` に保存
    - secret ミスマッチ → `/api/push/check-secret` で照合、ミスマッチなら通知をスキップして警告ログ
    - スクショ添付失敗 → クリップボード経路 → UWSC フォールバック → ヘッドレスレンダリング、の順で自動切替
    - ChatGPT 応答エラー → 同プロンプトで再送 2 回、3 回目は簡略化版で再送、それでもダメなら最終報告に「未生成」として記録
15. **最終報告**: 完了サマリ（生成ファイル一覧、検証結果、PR URL、Preview URL、人間が承認時に見る観点）を 1 メッセージで提示

## 禁止事項（Claude Code 側）

- ❌ 人間に PR を作らせる（必ず `gh pr create` で自動作成）
- ❌ 人間に Preview URL を探させる（必ず `gh pr view --json comments` でパース）
- ❌ 人間にスクショ取得・画像添付を依頼する（PowerShell + Chrome MCP で自動化）
- ❌ 人間に build / push を依頼する
- ❌ 人間に secret 同期を依頼する（`/api/push/check-secret` で自動照合）
- ❌ 人間に Cloudflare 設定確認を依頼する
- ❌ `main` ブランチへの直接 push
- ❌ `git add .` の使用（関係ない drafts / logs / 素材ファイルを巻き込まないよう、必ず明示パスで add）
- ❌ `logs/visual-review/` を main に入れる（内部品質ログとして preview ブランチでも追跡せず、ローカル disk のみ）
- ❌ Edge を操作する（Chrome のみ）
- ❌ hidden file input の直接クリック / `file_upload` API の使用

## 例外: 判断を仰ぐ最小ケース

以下のいずれかに該当する場合のみ、人間に **1 度だけ** 短く相談する（実行前に必ず提示）:

1. **公開判断が割れる**: 自動修正後も sourceCheck / articleQualityCheck の blocking が残る、かつ自動リトライ 3 回が失敗
2. **記事の核となる主張が事実と矛盾している疑い**: hedge を尽くしても噂を断定しているように読める、または公式情報と明確に食い違う場合
3. **サムネに実在ロゴ・元記事画像コピーの疑い**: 自動検査ではグレー判定で、人間目視で外したい場合
4. **コスト・破壊操作の懸念**: API トークン消費が著しく増える / 既存記事を上書きする / 既存 PR を force-push で巻き戻す等

その他は自律実行。途中報告は最低限にして、最終報告で必要情報を一括提示する。

## 最終報告の固定テンプレ

```
## 完了サマリ

### 記事
- slug:
- タイトル:
- 公開予定: status="review" → 承認後 published

### 検証
- sourceCheck: ok / urlCount / sumahon非露出 / reportingNotice
- articleQualityCheck: titleDuplicate / markdownResidue / character_visual_missing 等
- npm run build: 30 pages OK

### 自動化結果
- preview ブランチ: preview/{slug} (commit: xxxx)
- PR: #NN (URL)
- Preview URL: https://xxxx.sumalabo.pages.dev/articles/{slug}/
- PWA 通知: 送信済み / skipped (理由)
- visual-review: blocking N / warning N / deferred N (logs/visual-review/{slug}/ に保存、main 非追跡)

### 人間に確認してほしい点（承認判断用）
- [ ] 記事の核となる主張に違和感がないか
- [ ] サムネに実在ロゴ・原画コピーが混入していないか
- [ ] 参考URLが正しく到達するか（任意 1 件クリック）
- [ ] スマホ表示で読みにくい箇所がないか

問題なければ Preview の「この記事を承認して公開」ボタンを押してください。
```

## 関連ドキュメント

- `docs/visual_preview_review.md` — Preview スクショ 2 パスレビューの手順とチェック観点
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付（標準）
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック
- `docs/pwa_review_notification.md` — PWA 通知の仕組み
- `docs/preview_approval_button.md` — 承認ボタンの動作
- `scripts/sumahon/generate-handoff.mjs` — handoff / chrome-steps の生成元
- `scripts/sumahon/validate-generated-article.mjs` — sourceCheck / articleQualityCheck

## 改訂

このポリシーが変わるのは、人間が **明示的に** 「役割分担を変えたい」と言ったときだけ。それ以外はこのまま固定。
