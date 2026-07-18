# すまラボ 独立検品（Phase C 直前・X直接投稿の拡散リスク対策・slug: 202607-1password-for-claude-agentic-login）

あなたは **この画像がどう作られたかを一切知らない検品専任者**です。生成の文脈・意図・言い訳を持たず、
**白紙の目**で、添付された全画像（サムネ + スライド）を最終稿と突き合わせて検査してください。
「作った本人ならこう見る」ではなく「初めて見た読者が誤情報・崩れに気づくか」で判定します。

## 検査対象（画像は添付済み。上から順に Read して1枚ずつ判定）
- thumbnail: D:\documents\動画作成関連\すまラボ\public\images\thumbnails\202607-1password-for-claude-agentic-login.webp
- slide01-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide01-1password.webp
- slide02-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide02-1password.webp
- slide03-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide03-1password.webp
- slide04-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide04-1password.webp
- slide05-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide05-1password.webp
- slide06-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide06-1password.webp
- slide07-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide07-1password.webp
- slide08-1password: D:\documents\動画作成関連\すまラボ\public\images\articles\202607-1password-for-claude-agentic-login\slide08-1password.webp

## 突合の基準＝最終稿（final_article）
以下が記事の確定内容です。画像内の数値・日付・固有名詞・主張はこれと一致していなければなりません。
```
<!-- provenance: すまラボ立ち会い / draft + review×2 反映の最終稿 -->

# AIに「パスワードを見せずに」ログインさせる。1Password for Claudeの鍵の渡し方

## 先に結論

**1Passwordが7月16日、「1Password for Claude」を提供開始しました。AIにパスワードそのものを渡さず、“承認だけして中身は見せずに”使わせる、という新しい鍵の渡し方です。**

要点は次の3つです。

- Claudeがログインの必要な作業をするとき、1Passwordが**生体認証で承認を取り、パスワードを直接ページに注入**。パスワードやワンタイムコードはClaudeにもAnthropicにも入らない（ゼロ露出）
- 新機能「Agentic Mode」で、AIエージェントが動き始めると**保管庫が自動でロックダウン**され、明示的に許可した情報以外は見えなくなる
- 現状は**Mac限定**で、対象は**ログイン情報とワンタイムコードのみ**。他のパスワードマネージャーを使っている人が乗り換える必要はありません

「AIに仕事を任せたい。でもパスワードを渡すのは怖い」——その本音に対する、1Passwordの最初の答えです。

## 何が起きた？ 「渡さずに使わせる」という発明

1Passwordは2026年7月16日、**「1Password for Claude」**を発表・提供開始しました。

Claudeがログインの必要なブラウザ作業をするとき、1Passwordが「**どの認証情報を・なぜ使うか**」をユーザーに提示します。ユーザーが**生体認証（Touch IDなど）で承認**すると、1Passwordがその認証情報を**ページに直接注入**します。

このとき、**パスワードやワンタイムコードは、Claudeのコンテキスト・記憶・Anthropicのシステムに一切入りません**。Claudeが知るのは「どのログインを使ったか」だけです。1Password CTOのNancy Wang氏は、<Chip kind="claims">報道</Chip>「答えはエージェントに秘密を渡すことではなく、“見せずに使う”許可を与えることだ」と述べています。

## 従来 vs 新方式：どこが変わった？

<p class="lead">これまでは<strong>「AIにパスワードを渡す」</strong>しかなく、それが怖さの正体でした。新方式は<strong>「承認だけして、中身は見せない」</strong>に発想を変えています。</p>

<div class="table-card article-wide-block">

| | 従来のやり方 | 1Password for Claude |
|---|---|---|
| 鍵の渡し方 | パスワードをAIに渡す | 承認だけ・中身は見せない |
| 秘密の露出 | AIの記憶などに残りうる | Claude・Anthropicに入らない |
| アクセス範囲 | 渡したら制御しにくい | そのタスク限定・完了で終了 |

</div>

さらに、注入した**あとにページ上で秘密が露出していないかを自動でチェック**し、フォームの送信が失敗したときは**入力した値を消去**してからClaudeに制御を返します。「渡して終わり」ではなく、使う瞬間だけ・使う分だけ、という設計です。

## Agentic Mode：エージェントが動くと自動でロックダウン

<p class="lead">もう一つの柱が<strong>「Agentic Mode」</strong>です。AIエージェントがブラウザを操作し始めると、<strong>1Passwordの拡張機能が自動でロックダウン</strong>します。</p>

ロックダウン中は、拡張のUIが隠れ、エージェントが使えるのは**そのタスクで明示的に許可した認証情報だけ**になります。保管庫の中身を**閲覧したり検索したりすることもできません**。

まずはClaudeに対応し、**今後ほかのエージェントにも広げる予定**とされています（<Chip kind="claims">報道</Chip>時期は未確定）。

## 使うために必要なもの（現実的な制約）

<p class="lead">便利ですが、<strong>いま試せる範囲は限られています</strong>。必要な条件を整理します。</p>

<Callout kind="facts" title="必要なもの・対象">
  <ul>
    <li><strong>Mac</strong>（1Password for Mac 8.12.28以降）</li>
    <li>1Passwordのデスクトップアプリ＋ブラウザ拡張、Claudeのデスクトップアプリ＋ブラウザ拡張</li>
    <li>1Passwordプランはビジネス / ファミリー / 個人。Claude Team・Enterpriseは管理者が組織設定で有効化（個人はPro / Max想定）</li>
    <li>対象は<strong>ログイン情報とワンタイムコードのみ</strong>（クレジットカード・身元情報は将来対応予定 / パスキーは非対応）</li>
  </ul>
</Callout>

## 「1Passwordに乗り換えないとダメ？」——答えは、いいえ

<p class="lead">ここが一番大事な補助です。結論から言うと、<strong>乗り換えは不要</strong>です。</p>

これは「AIエージェントに認証情報をどう安全に渡すか」という**新しい課題への、1Passwordによる最初の答え（先行実装）**です。

- **Bitwarden、Google / Appleのパスワードマネージャーなどを使っている人は、現状で何も変わりません。**
- そもそも**Claudeにログイン作業を任せない使い方**なら、この機能自体が不要です。
- 注目すべきは製品名ではなく、**「エージェントにはパスワードを見せずに使わせる」という設計思想が、これから業界標準になっていく流れ**です。1Password自身も他エージェントへの拡大を予告しており、<Chip kind="claims">報道</Chip>他社の追随も予想されます。

現時点では**Mac限定**という制約もあります（Windowsユーザーは今は対象外）。焦って動く必要はなく、「こういう仕組みが始まった」と知っておくのが、いまはちょうどよい距離感です。

## 確定・報道・未確定の整理

<p class="lead">ここは<strong>確定・報道・未確定を分けて</strong>見るところです。</p>

<Callout kind="facts" title="確定（公式）">
  <ul>
    <li>7月16日に「1Password for Claude」提供開始</li>
    <li>ゼロ露出設計：承認だけ・直接注入・パスワード / OTPはClaude・Anthropicに入らない・タスク限定・露出自動チェック・送信失敗時は入力値クリア</li>
    <li>Agentic Mode：エージェント操作開始で自動ロックダウン、明示許可以外は閲覧・検索も不可</li>
    <li>Mac限定 / 対象はログイン情報とワンタイムコードのみ / 必要アプリ4点</li>
  </ul>
</Callout>

<Callout kind="claims" title="報道・見立て（断定しない）">
  <ul>
    <li>「エージェントは新しい種類のアイデンティティ」というCTO発言（設計思想が標準化する流れの位置づけ）</li>
    <li>他エージェントへの拡大予定・他社の追随予想</li>
  </ul>
</Callout>

<Callout kind="unc" title="未確定（2026年7月時点）">
  <ul>
    <li>Windows対応の時期</li>
    <li>日本語環境での提供の細部・Claude個人プラン条件の細部</li>
  </ul>
</Callout>

<CharacterBubble speaker="labo" mood="worried">対応OSや対象プランはまだ動く情報。使う前に公式の最新表示で確認してね。</CharacterBubble>

## この動きをどう見る？（補助）

<p class="lead">大事なのは、<strong>「AIに任せる」と「秘密を渡す」を切り離す発想</strong>が形になったことです。</p>

AIエージェントに作業を任せる場面はこれから増えます。そのとき毎回パスワードを渡していては危うい——という課題に、「見せずに使わせる」で答えたのが今回です。1社の製品というより、**エージェント時代の“鍵の渡し方”の一つの型**として見ておくとよさそうです。

- いまMacで1Passwordを使い、Claudeに作業も任せたい人 → 試す価値がある
- 他のパスワードマネージャー利用者・Windowsユーザー → 今は様子見でOK
- 共通して大事なのは「AIに秘密を丸ごと渡さない」という考え方

<Note>この記事は2026年7月18日時点の情報です。対応OS・対象プラン・対応範囲は変わる可能性があるため、最終的には公式の最新表示で確認してください。</Note>

## 参考情報

- 1Password公式ブログ「1Password for Claude」（1password.com/blog）
- 1Passwordサポート「Use 1Password to sign in to websites with Claude」（support.1password.com）

```

## 各スライドの意図（slide_plan・参考）
```
<!-- provenance: すまラボ立ち会い / final_article を基に slide_plan。漢字化け対策(docs/kanji_pitfalls.md)+衣装フォールバック規則(character-sheet.md 2026-07-14)適用 -->

# slide_plan: 202607-1password-for-claude-agentic-login

## thumbnail（16:9）
- テーマ: AIに「パスワードを見せずに」使わせる新しい鍵の渡し方。ポジ驚き（「えっ、見せなくていいの!?」の明るい驚き）
- 感情トーン: 【新機能・安心／ポジ驚き】。ひまり=**明るい驚き**（「見せなくていいの!?」目を輝かせる）。らぼまる=**鍵を預かる金庫番**（鍵束＋盾＋小さな金庫の小道具で「中身は見せないよ」と安心を案内）。炎/涙/パニックなし
- **装い根拠（フォールバック規則・必須記録）: 「鍵の渡し方・金庫番・守る」→ セキュリティ/守りの装い**＝らぼまるは金庫番風（鍵束・盾のアイコン・小さな金庫）、ひまりは鍵モチーフのアクセや盾の小道具を添える。標準衣装のまま棒立ちにしない。
- インパクト: 大きな鍵と盾。中央に「パスワードを渡さない」×鍵、「承認だけ」の光。実在ロゴ（1Passwordロゴ）は入れない
- 認識アンカー厳守（ひまり=金髪サイドテール+水色/ティールのリボン・青い瞳／らぼまる=白い卵型ボディ+黄緑アンテナ+黒い丸い目+胸のオレンジのハートボタン）
- 入れる文字: 「AIに“見せずに”使わせる」／サブ「1Password for Claude」

## slide01（4:5縦長）— 先に結論
- 見出し帯: 渡さずに、使わせる
- 要素: 7月16日に「1Password for Claude」提供開始 / 承認だけして中身は見せない(ゼロ露出) / エージェント操作中は保管庫を自動ロックダウン / いまMac限定・乗り換えは不要
- キャラ: ひまり「見せなくていいの!?」の明るい驚き、らぼまる「そう、承認だけでいいんだ」。標準衣装

## slide02（4:5縦長）— 何が起きた?
- 見出し帯: 7月16日「1Password for Claude」
- 要素: Claudeがログイン作業をするとき / 「どの認証情報を・なぜ使うか」を提示 / 生体認証で承認→ページに直接注入 / パスワード/OTPはClaude・Anthropicに入らない
- キャラ: ひまり「どうやって渡すの?」、らぼまる「渡さずに“注入”するんだ」。標準衣装

## slide03（4:5縦長）— 従来 vs 新方式（対比・図解主役）
- 見出し帯: 「渡す」から「見せない」へ
- 要素: 従来=パスワードをAIに渡す(記憶に残りうる) / 新方式=承認だけ・中身は見せない / 新方式=Claude・Anthropicに入らない / 新方式=そのタスク限定・完了で終了
- キャラ: ひまり「渡さなくていいんだ!」、らぼまる「使う瞬間だけ・使う分だけ」。標準衣装。左右対比のレイアウト

## slide04（4:5縦長）— 使う瞬間だけの流れ
- 見出し帯: 使う瞬間だけ・使う分だけ
- 要素: ①提示(どれを・なぜ) / ②生体認証で承認 / ③ページに直接注入 / ④露出を自動チェック・送信失敗なら入力値を消す
- キャラ: ひまり「安心だね」、らぼまる「終わったらアクセスも終わり」。標準衣装。4ステップの流れ図

## slide05（4:5縦長）— Agentic Mode
- 見出し帯: エージェントが動くと自動ロックダウン
- 要素: AIが操作を始めると1Passwordが自動ロックダウン / 明示許可した情報だけ使える / 保管庫の閲覧・検索も不可 / まずClaude、他エージェントへ拡大予定
- キャラ: ひまり「勝手に見られない?」、らぼまる「許可した鍵しか出さないよ」。標準衣装。金庫がロックする図

## slide06（4:5縦長）— 使うために必要なもの
- 見出し帯: 使うために必要なもの
- 要素: Mac(1Password for Mac 8.12.28以降) / 1Passwordアプリ+ブラウザ拡張 / Claudeアプリ+ブラウザ拡張 / 1Passwordはビジネス/ファミリー/個人
- キャラ: ひまり「用意するもの多い?」、らぼまる「4点セットとMacね」。標準衣装。チェックリスト

## slide07（4:5縦長）— できること・まだできないこと
- 見出し帯: できること / まだできないこと
- 要素: できる=ログイン情報の入力 / できる=ワンタイムコードの入力 / まだ=クレカ・身元情報(将来対応予定) / まだ=パスキーは非対応・Windowsは対象外
- キャラ: ひまり「何でもは無理か」、らぼまる「今はログインとOTPまで」。標準衣装。○×の仕分け

## slide08（4:5縦長）— 乗り換え不要 / どう見る
- 見出し帯: 乗り換えは不要・でも流れは要チェック
- 要素: 他のパスワードマネージャー利用者は変わらない / Claudeに作業を任せないなら不要 / 注目は「見せずに使わせる」設計思想の標準化 / いまMac限定は様子見でOK
- キャラ: ひまり「あわてなくていいんだね」、らぼまる「“考え方”が広がるかを見よう」。標準衣装

## 漢字化け対策メモ（docs/kanji_pitfalls.md）
- 「注入」は「入れる」「差し込む」に言い換え可。「認証情報」は帯では「ログイン情報」を優先。数字は算用数字。
- 短いラベルはひらがな・和語を優先。「1Password/Claude/Anthropic/Mac/Windows/OTP」は英字のまま。実在ロゴは描かない。

```

## (A) factcheck 12 項目（各画像で判定）
1. 事実誤認の有無（画像内記述が最終稿と矛盾しない）
2. 報道/噂段階の明示（未確定を確定と言い切っていない）
3. 比較軸のズレがない
4. タイトルと中身の一致
5. 文字量（大見出し≤2・補助≤2・各要素1〜2行）
6. 見出し/要点/図の関係が整理されている
7. ひまり・らぼまるが記事内容に即している
8. 置物化していない
9. 道具の使い方に意味がある
10. **キャラの視覚的破綻（認識アンカー一致）** — ひまり=金髪サイドテール+水色/ティールのリボン・青い瞳・正本の顔立ち/頭身 / らぼまる=白い卵型ボディ+黄緑アンテナ+黒い丸い目+胸のオレンジのハートボタン+正本の体型。逸脱・別人化・途中変化は needs_revision（blocking）。服・小道具の違いは破綻ではない
11. **文字化け・レイアウト破綻** — 日本語の文字化け・意味を成さない誤字（助詞欠落「目的ことで」等）・見切れ・重なり・枠崩れは needs_revision。**漢字の類似化け（例「目的→自的」目→自・未→末・微→徴 等。docs/kanji_pitfalls.md 参照）を重点確認**
12. **表情・トーンが記事の性質と矛盾しない** — 終了/障害/リコール等の注意・速報系は「驚き＋対処」がOK。ニコニコ/ムスッ・無表情/炎・涙・パニックは needs_revision

## (B) スライド本文と最終稿の突合
- 画像内の全テキストを読み取り、数値・日付・固有名詞・鉤括弧を**1つずつ**最終稿と照合（numbersAccurate）。
- 一致しない数字・日付・誤記があれば issues に「画像:○○ / 最終稿:○○」の形で書き、verdict=needs_revision。

## (C) X 直接投稿の選抜スコア（各スライド 0〜100）
X には**上位4枚だけ**を直接添付する。次の3点が満たされるほど高スコア:
- **文字量が少ない**（textDensity=low が高得点。high は誤字が拡散するので X 非推奨=低得点）
- **数字が正確**（numbersAccurate=false は 0 点相当）
- **単体で意味が通る**（standsAlone=true。本文前提の図は低得点）
- needs_revision のスライドは xPostScore=0。

### xSelection の作り方（厳守）
- **先頭は原則 'thumbnail'**（サムネは最強フック。ただしサムネが needs_revision なら外す）。
- 残りは xPostScore の高い順にスライドを並べ、**合計4つ**になるまで選ぶ（thumbnail 含めて4）。
- **textDensity=high と needs_revision は xSelection に入れない**（記事内専用に回す）。excludedFromX に理由付きで列挙。
- 選べるものが4未満でも構わない（無理に埋めない。3枚でも2枚でもよい）。

## 出力（StructuredOutput ツールで返す。前置きの解説文は不要）
INDEPENDENT_INSPECTION_SCHEMA に従い、slides[]（全スライド）・thumbnail・xSelection・excludedFromX・overallPass を返す。
overallPass は「全スライド+サムネに needs_revision が無い」ときだけ true。
