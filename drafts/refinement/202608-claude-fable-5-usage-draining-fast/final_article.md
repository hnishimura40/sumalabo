# final_article.md — 2026-08-18 researched final

---


import Callout from "../../src/components/article/Callout.astro";
import CharacterBubble from "../../src/components/article/CharacterBubble.astro";
import Note from "../../src/components/article/Note.astro";
import Summary30 from "../../src/components/article/Summary30.astro";

Claude Fable 5は、AnthropicのAI「Claude」で高度な推論を担う機能です。2026年8月18日、このFable 5を使っていて、見過ごせない減り方を確認しました。

最初は5回ほどやり取りしたところで利用上限近くまで到達。そこでClaudeのUsage画面を見ながら改めて試すと、**わずか2往復で「5-hour limit」の約50％を消費**しました。

Fable 5が重いモデルなのは事実です。しかし、公式の「週間利用枠の最大50％までFable 5に使える」という説明と、「2往復で5時間枠の50％が減った」という今回の実測は別の話です。

この記事では、最初から「仕様」「バグ」「障害の影響」のどれかに決めつけず、Anthropic公式、公式Status、公式の過去事例、GitHub・Redditのユーザー報告を分けて検証します。

## 30秒で分かる結論

<Summary30>
  <ul>
    <li><strong>これは何？</strong> Claudeの高性能モデル「Fable 5」で、利用枠が普段より速く減る現象の検証です</li>
    <li><strong>何があった？</strong> 筆者の実測では、わずか2往復で5時間枠の約50％を消費しました</li>
    <li><strong>誰に関係ある？</strong> Fable 5、Claude Code、ResearchやAgent機能を使う人に関係します</li>
    <li><strong>結局どうなの？</strong> 総合判定は「異常を疑う水準」。リセット後に条件をそろえた1回テストが有効です</li>
  </ul>
</Summary30>

## そもそもFable 5とは

Fable 5は、AnthropicがClaudeで提供する、高度な推論や長い作業向けのAI機能です。ほかのClaudeモデルより利用枠を速く使うと公式に案内され、考える処理であるExtended Thinkingが常に働きます。

### 関係がある人

Fable 5を使っている人、Claude Codeで長い作業を続ける人、Research・Web検索・Agent・外部ツールを組み合わせる人です。

### あまり関係がない人

Fable 5を使わず、短い新規チャットで通常モデルだけを使う人は、今回の現象との関係が薄いです。ただし、Claude全体の利用枠は複数の画面やモデルで合算されるため、Usageが不自然に減る場合は確認する価値があります。

<Callout kind="unc" title="今回まだ分からないこと">
  <p>筆者の2往復で、会話履歴、添付ファイル、Project Knowledge、Research、Agent、Claude Code、努力レベルのどれが使われていたかをUsage画面だけでは分解できません。したがって、原因の断定ではなく、条件をそろえた1回テストで切り分けます。</p>
</Callout>

## 実測：Fable 5との2往復で5時間枠が約50％減った

<p class="lead">今回の起点は、筆者が2026年8月18日に確認した実測です。</p>

| 項目 | 実測内容 |
|---|---|
| モデル | Claude Fable 5 |
| 最初の違和感 | 約5回のやり取りで利用上限近くまで到達 |
| 再確認 | Usageを見ながら2往復 |
| 結果 | 5-hour limitを約50％消費 |
| 直前の状況 | 8月17日朝にClaude全体障害、同日夜にOpus 5／Sonnet 5障害 |
| 未確認 | 会話の総トークン、キャッシュ状態、ツール回数、Agent数、プラン種別 |

これは「2メッセージで50％」ではなく、ユーザーの依頼とClaudeの応答を1組として数えた**2往復**です。また、50％は週間枠ではなく、Usage画面の**5時間枠**で確認した数字です。

<CharacterBubble speaker="himari" mood="curious">Fableには50％制限があるんだよね。今回もそれで半分になったの?</CharacterBubble>

<CharacterBubble speaker="labo" mood="point">そこは別物だよ。公式の50％は週間枠、今回減った50％は5時間枠。まず分けて考えよう。</CharacterBubble>

## 最重要：「Fableの50％」と「今回の50％」は別物

<p class="lead"><strong>同じ50％でも、分母が違います。</strong></p>

| 表示・ルール | 何を意味する？ | 今回の実測との関係 |
|---|---|---|
| Fable 5は週間利用枠の最大50％まで | Max、Team Premiumなどで、週間枠のうちFable 5に使える上限 | 週間のモデル別上限 |
| 5-hour limitを約50％消費 | 現在の5時間セッション枠が半分減った | 今回筆者が確認した現象 |

Anthropicの[「Claude Fable 5 on your plan」](https://support.claude.com/en/articles/15424964-claude-fable-5-on-your-plan)では、Max、TeamのPremium seat、対象となるseat-based EnterpriseのPremium seatで、Fable 5を週間利用枠の最大50％まで追加料金なしで使えると説明しています。

これは「Fableを使うと毎回50％減る」という意味でも、「5時間枠の半分を使う」という意味でもありません。ほかのモデルの利用も同じ週間枠から差し引かれ、Fable用に週間枠が50％追加されるわけでもありません。

したがって、**Fableに50％ルールがあるから、2往復で5時間枠50％は正常**という説明は成り立ちません。

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">混同しやすい2つの「50％」を図で整理します。</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/202608-claude-fable-5-usage-draining-fast/slide01.webp" alt="Fable 5の週間利用上限50％と、今回2往復で消費した5時間枠50％は分母が異なることを示す図解" loading="lazy" decoding="async" />
    <figcaption>図解：週間枠の50％と5時間枠の50％は別物</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>この図で分かること</strong></p>
    <ul>
      <li><strong>公式の50％</strong>：対象プランでFable 5に使える週間利用枠の上限</li>
      <li><strong>今回の50％</strong>：筆者が2往復後に確認した5時間枠の消費</li>
      <li><strong>結論</strong>：分母が違うため、公式ルールだけで今回の急減は説明できない</li>
    </ul>
  </div>
</section>

## Claudeの利用制限は「1メッセージ何回」ではない

<p class="lead">Claudeの上限は、単純な送信回数制ではありません。</p>

Anthropicの[利用制限と会話長の公式説明](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)では、会話の長さと複雑さ、使う機能、モデル、努力レベルがUsageに影響するとされています。Claude.ai、Claude Desktop、Claude Codeなどの利用は同じ枠へ合算されます。

| 枠 | 役割 | リセット | 主な注意点 |
|---|---|---|---|
| 5時間枠 | 短時間に使える量 | セッション開始から5時間ごと | 長い会話や重い機能で速く減る |
| 週間枠 | 1週間に使える総量 | アカウントごとの固定日時 | 複数モデル・複数画面の利用を合算 |
| Fable固有の週間枠 | 週間枠のうちFableに使える部分 | 週間枠と連動 | 対象プランでは最大50％、追加枠ではない |

### プランごとの位置づけ

| プラン | 5時間枠・週間枠 | Fable 5の扱い |
|---|---|---|
| Free | 小さな5時間枠。Fable 5は対象外 | 利用不可 |
| Pro | Freeの少なくとも5倍のセッション利用量。週間枠あり | 2026年7月20日以降はusage credits |
| Max 5x | Proの5倍のセッション利用量。週間枠あり | 週間枠の最大50％まで標準利用 |
| Max 20x | Proの20倍のセッション利用量。週間枠あり | 週間枠の最大50％まで標準利用 |
| Team Standard | Proの1.25倍のセッション利用量。週間枠あり | usage credits |
| Team Premium | Proの6.25倍のセッション利用量。週間枠あり | 週間枠の最大50％まで標準利用 |
| seat-based Enterprise | seat種別で異なる | Premiumは50％枠、Standardはcredits |
| usage-based Enterprise／API | 利用量に応じた課金 | API単価で課金 |

ProとMaxの条件は[Pro公式ヘルプ](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan)と[Max公式ヘルプ](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)、Teamは[Team公式ヘルプ](https://support.claude.com/en/articles/9266767-what-is-the-team-plan)で確認できます。

ここでいう5x、20xも、固定のメッセージ数ではありません。同じ1往復でも、短い新規チャットと、巨大な履歴を抱えたResearchでは消費量が違います。

## Fable 5は本当に他モデルよりUsageを速く使う？

<p class="lead"><strong>「速く使う」は公式事実です。ただし倍率と1往復の標準消費率は非公開です。</strong></p>

[Fable 5のプラン説明](https://support.claude.com/en/articles/15424964-claude-fable-5-on-your-plan)には、Fable 5はプランの通常の週間枠から消費し、**ほかのClaudeモデルより速く使う**と明記されています。

さらに、Claude Codeの[コスト管理公式ドキュメント](https://code.claude.com/docs/en/costs)では、Fable 5はExtended Thinkingを常時使い、無効化できないと説明されています。Extended Thinkingのトークンは出力トークンとして数えられ、モデルによっては1リクエストで数万トークン規模の既定予算になり得ます。

一方、公式に見つからなかったものもあります。

- SonnetやOpusに対して何倍のUsageを使うか
- 5時間枠との換算式
- 1往復で20〜30％使うことを正常とする目安
- 2往復で50％なら正常という判定基準

Fable 5のAPI価格は[公式モデルページ](https://www.anthropic.com/claude/fable)で入力100万トークン10ドル、出力100万トークン50ドルとされています。ただし、API単価とサブスクの5時間枠の割合は同じものではありません。価格から「1往復何％」を逆算することはできません。

## 後半の1回ほど重くなり得る。Usageを増やす要因

<p class="lead">同じ質問でも、履歴と道具が増えるほど、見えない処理量が増えます。</p>

Anthropic公式ヘルプとClaude Code公式ドキュメントを合わせると、主な要因は次のように整理できます。

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">少ない往復でもUsageが重くなる代表要因です。</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/202608-claude-fable-5-usage-draining-fast/slide02.webp" alt="長い履歴、Extended Thinking、Research、Tool Use、Agent、キャッシュミスというFable 5のUsageを増やす6要因をまとめた図解" loading="lazy" decoding="async" />
    <figcaption>図解：Fable 5のUsageを増やす6つの要因</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>この図で分かること</strong></p>
    <ul>
      <li>Usageはメッセージ数ではなく、履歴・思考・ツールを含む処理量で変わる</li>
      <li>長い会話では後半の1回ほど入力コンテキストが大きくなり得る</li>
      <li>複数要因が重なるため、切り分けは新規チャットとツールなしから始める</li>
    </ul>
  </div>
</section>

| 要因 | Usageへの影響 | 公式確認 |
|---|---|---|
| 入力・出力の長さ | 長いほど増える | あり |
| 会話履歴 | 長い履歴を後続リクエストでも処理する | あり |
| 長大コンテキスト | 1行の質問でも全履歴分のUsageがかかり得る | あり |
| Project Knowledge・添付 | サイズや読み込む範囲で増える。RAGとキャッシュで軽減可能 | あり |
| Extended Thinking・高い努力レベル | 思考トークンが増え、上限へ早く届く | あり |
| Research・Web検索 | 複数検索と長い統合回答で速く減る | あり |
| Tool Use | 1往復内でも複数のAPIステップが発生 | あり |
| Agent・Agent team | 各Agentが別のコンテキストを持つ | あり |
| MCP | ツール定義や結果がコンテキストを使う | あり |
| キャッシュ切れ | 全コンテキストを再処理する | あり |
| コンテキスト圧縮 | 要約自体も大きなリクエストになる | あり |
| Scheduled Task・他sessionのメッセージ | 操作していない時間にもリクエストが起こり得る | あり |

### 長い会話は、なぜ後半の1回が重いのか

Claude Code公式は、長時間開いたsessionでは、Claudeがリクエストごとに会話全体を送り、ツール利用のたびに結果を含む別リクエストを送ると説明しています。キャッシュが有効でも、履歴はキャッシュ読取分としてUsageに影響します。

さらに、サブスクのキャッシュ寿命は1時間で、長い休憩後の最初のメッセージはキャッシュミスになり、履歴全体を再処理します。usage creditsへ移ると既定のキャッシュ寿命が5分になるという説明もあります。

通常のClaudeチャットでも、[自動コンテキスト管理を使う長い会話は利用枠を多く消費する](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)と公式に案内されています。長い会話が原因候補に上がるのは推測だけではありません。

### ResearchとWeb検索

[Researchの公式案内](https://support.anthropic.com/en/articles/11088861-using-research-on-claude-ai)では、複数の情報源を取得して包括的な回答を作るため、標準チャットより利用枠を速く使う場合があると明記されています。別の[使い分けガイド](https://support.claude.com/en/articles/11095361-when-should-i-use-web-search-extended-thinking-and-research)では、Researchは5回以上のTool callを伴う1〜3分の包括調査向けと説明されています。

見た目は1往復でも、内部では検索、ページ取得、再検索、整理、回答という複数段階です。

### AgentとTool Use

Claude Codeの公式資料では、Agent teamはplan modeで通常sessionの**約7倍**のトークンを使うことがあるとされています。各teammateが自分のコンテキストを持ち、終了するまで消費を続けます。

ただし、Fable 5が通常チャットで毎回、見えない複数Agentを必ず起動するという公式説明は確認できません。Research、Claude Code、Coworkなど、選んだ機能がAgent的に複数処理する場合と、通常チャットを分けて考える必要があります。

## 世界の同様報告を調べた

<p class="lead">2往復50％に近い報告は複数あります。ただし、いずれもユーザー申告で、原因が検証済みとは限りません。</p>

同じ投稿の転載を除き、条件が読み取れる事例を抽出しました。

<div class="is-scrollable">

| 投稿日 | モデル | プラン | 環境 | 使用時間・回数 | 消費 | 特記事項 |
|---|---|---|---|---|---|---|
| 2026/8/18 | Fable 5 | 未記載 | Claude、詳細未確認 | 2往復 | 5時間枠 約50％ | 筆者実測 |
| [2026/8/17](https://www.reddit.com/r/Claude%43ode/comments/1vr0g37/anyone_else_facing_limit_problems_today/) | 未記載 | 未記載 | Claude Code | 余白調整の依頼 | 5時間枠 40％ | コンテキスト約400Kとの申告 |
| [2026/8/17](https://www.reddit.com/r/Claude%43ode/comments/1vqoba2/something_is_seriously_wrong_with_anthropic_right/) | Fable 5ほか | Max 20x | Claude Code | 数プロンプト | 5時間枠到達、週間枠も大幅消費 | 同日の障害と時期が近い |
| [2026/8/15](https://www.reddit.com/r/Claude%43ode/comments/1vphk9s/usage_limits_are_an_absolute_joke_and_getting/) | 未記載 | 未記載 | Claude Code | 再開後、約30分 | 5時間枠全部 | 前日は2時間で5時間枠全部＋週間17％ |
| [2026/8/12](https://www.reddit.com/r/ClaudeAI/comments/1vmeqms/discussion_hub_for_new_claude_incident_degraded/) | Fable 5 | Max 20x | Claude | 約30分 | 5時間枠全部 | 公式Fable障害中の報告 |
| [2026/8/1](https://github.com/anthropics/claude-code/issues/83106) | Fable 5 | Max 5x | VS Code／Claude Code | 最後の2分 | 残り50％を消費 | GitHubの未解決Bug報告 |
| [2026/7/24](https://www.reddit.com/r/Claude%43ode/comments/1v54l0j/ridiculous_usage/) | Fable 5 High | Max 5x | Claude Code | 1プロンプト | 週間枠 +30％ | thinking中で成果物未完成との申告 |
| [2026/7/19](https://www.reddit.com/r/ClaudeAI/comments/1v0hu5z/absurd_limits_usage/) | Fable以外 | 未記載 | 新規Claude Code session | 1プロンプト、10分未満 | 5時間枠 50％ | Fable以外でも近似症状 |
| [2026/7/19](https://www.reddit.com/r/ClaudeAI/comments/1v0jugv/quick_usage_limit_hit_on_max_x5/) | Fable 5 | Max 5x | Deep Research | 5分未満 | 5時間枠全部 | 複数Fable Agentの可能性を指摘する返信 |

</div>

この表から分かるのは、「極端に速い」という体験が筆者だけではないことです。一方、長いコンテキスト、Research、High、Claude Codeなどの高負荷条件が混ざっています。報告数だけでUsage計測バグとは断定できません。

## 8月12日以降、Claudeは障害が続いていた

<p class="lead">直近に障害が複数あったのは公式事実です。ただし、Usage誤計上とは別に扱います。</p>

Anthropicの[公式Status API](https://status.claude.com/api/v2/incidents.json)をUTCから日本時間へ換算しました。Statusに記録された開始・解決時刻と、本文に明記された実影響時間が違うものは補足しています。

<div class="is-scrollable">

| 日時（UTC） | 日本時間（JST） | 障害内容 | 対象モデル | 対象サービス | 解消 |
|---|---|---|---|---|---|
| 8/12 13:50〜18:07 | 8/12 22:50〜8/13 03:07 | 複数モデルの性能低下・エラー | 後半は主にFable 5 | Claude.ai、API、Code、Cowork | 解消済み |
| 8/13 14:33〜16:08 | 8/13 23:33〜8/14 01:08 | エラー増加 | Mythos 5、Fable 5、Sonnet 5 | Claude.ai、API、Code、Cowork | 解消済み |
| 8/14 00:36〜00:51 | 8/14 09:36〜09:51 | Web版Claude Code関連の性能低下 | 特定モデル記載なし | Code on the web、Cowork Remote、Routines、Code Mobile | 解消済み |
| 8/14 07:58〜10:53 | 8/14 16:58〜19:53 | status.claude.com証明書問題 | なし | Statusページ | 解消済み |
| 8/14 20:14〜20:38 | 8/15 05:14〜05:38 | Claudeサービス障害 | 特定モデル記載なし | API、Code、Cowork | 解消済み（Status更新はJST 06:58） |
| 8/14 20:00〜8/15 00:11 | 8/15 05:00〜09:11 | Fable 5のエラー増加 | Fable 5 | Claude.ai | 解消済み（Status更新はJST 09:27） |
| 8/16 21:58〜22:34 | 8/17 06:58〜07:34 | 認証・Claude全体障害 | 特定モデル記載なし | Claude.ai、Platform、API、Code、Cowork | 解消済み |
| 8/17 13:56〜15:29 | 8/17 22:56〜8/18 00:29 | エラー・性能低下 | Opus 5→Sonnet 5 | Claude.ai、API、Code、Cowork | 解消済み |
| 8/18確認時点 | 8/18 07:04時点 | 新しいincident記録なし | — | — | Operational |

</div>

8月15日分が多く見えるのは、UTCの8月14日夜が日本では8月15日朝に当たるためです。

## 8月17日の障害が今回のUsage異常を起こした？

<p class="lead"><strong>時期は近いものの、因果関係は確認できません。</strong></p>

日本時間8月17日06:58〜07:34の障害は、Claude.ai、Platform、API、Claude Code、Coworkへ広がったcritical incidentでした。認証問題から始まり、全体の性能低下として調査され、修正後に解消しています。

同日22:56〜翌00:29には、最初にOpus 5、次にSonnet 5の性能低下も起きました。こちらの記録にFable 5は含まれていません。

しかし、どちらのStatusにも「利用量を誤計上した」「5時間枠が余計に減った」という説明はありません。AnthropicがUsage異常を公式認定していない以上、**8月17日の障害が8月18日の2往復50％を引き起こしたとは言えません**。

関連仮説として残す理由は、直近1週間にFableを含む障害が繰り返され、同時期のユーザー報告もあるためです。ただし、現時点の証拠は「時期が近い」までです。

## Anthropicには「利用枠が速く減るバグ」の公式前例がある

<p class="lead">過去に同種の症状が公式認定されたことはあります。ただし、今回も同じ原因とは限りません。</p>

Anthropic Engineeringは2026年4月23日の[Claude Code品質問題のPostmortem](https://www.anthropic.com/engineering/april-23-postmortem)で、コンテキスト管理、API、Extended Thinkingが交わる不具合を説明しました。

古いsessionが一定条件を超えた後、過去の思考ブロックを誤って落とし続け、後続リクエストでキャッシュミスが発生。それが「利用枠が想定より速く減る」という別の報告を引き起こしたとAnthropicは判断しています。

- 不具合は4月10日にClaude Code v2.1.101で修正
- 4月23日時点で全購読者の利用枠をリセット
- 原因はユーザーのプロンプトだけではなく、製品側のコンテキスト管理とキャッシュ処理

これは「Usage急減が製品側の不具合で起こり得る」ことの公式前例です。ただし、今回のFable 5、8月の障害、現在のUsage計算に同じ不具合が再発したという公式発表は見つかっていません。

## 「こうしたら直った」を追う。数字つき改善例はまだ少ない

<p class="lead">最も根拠が強い対策は、巨大な履歴を持ち越さないことです。ただし、利用者報告のBefore／Afterは限定的です。</p>

### 1. 新規チャット・新規session

Anthropic公式は、長い会話でUsage上限に近づいたら新しい会話を始めるよう案内しています。Claude Codeでも、無関係な作業へ移るときは`/clear`で新しく始めることを推奨し、古いコンテキストは以後の全メッセージでトークンを浪費すると説明しています。

ユーザー報告では、[既存sessionだけUsage limit reachedが残り、新規sessionは同じアカウントで動いた例](https://github.com/anthropics/claude-code/issues/76826)があります。これは消費率そのものの改善例ではありませんが、sessionに残った状態が原因になる場合がある証拠です。

また、Fableが誤ってusage creditsを要求したケースでは、[新しいsessionで解消したという報告](https://www.reddit.com/r/Claude%43ode/comments/1v1e5xv/fable_5_on_usage_credits_eh/)があります。こちらも「急減」の直接検証ではないため、補助証拠に留めます。

### 2. コンテキスト圧縮と短い引き継ぎ

[長いsessionで17分後に大きく枠を使った利用者](https://www.reddit.com/r/claude/comments/1v36mxo/current_session_after_17_minutes_from_a_fresh/)は、2〜3日・14時間級の会話を原因候補と見て、圧縮は2回まで、新しいsessionへ移行し、Fableを設計役、Opusを実作業役に限定したところ、session消費が「明確に改善した」と報告しています。数値のAfterは示されていないため、改善率は計算できません。

Claude Codeでは`/compact`も選択肢ですが、公式には圧縮自体が大きなリクエストになると説明されています。継続性が不要なら`/clear`はコストなしです。必要事項を短いメモへ要約して新規sessionへ渡す方が、今回の切り分けには向いています。

### 3. Agent、Tool、MCPを減らす

公式資料では、Agent teamがplan modeで約7倍のトークンを使う場合があり、稼働中のteammateは終了まで消費を続けます。MCPは未使用serverを無効化し、`/context`で占有量を確認するよう案内されています。

利用者報告では、FableにAgentを勝手に増やさせず、設計だけを任せ、実作業をほかのモデルへ回して消費が改善した例があります。ただし、この対策はClaude CodeやCoworkなどAgent機能を使う環境向けです。Claude.aiの通常チャットに、そのまま`/clear`やMCP対策を当てはめてはいけません。

### 4. Scheduled Task、loop、background processを止める

Claude Code公式は、Scheduled Taskが待機中でも間隔ごとに全コンテキストを送ること、別sessionからのメッセージも新しいturnとして処理されることを説明しています。

GitHubには、[`ScheduleWakeup`がCtrl+C後も残り、daemonがsessionを再起動し続けたとのBug報告](https://github.com/anthropics/claude-code/issues/64744)があります。申告では週末に約300ドルのAPI利用が発生しました。Redditにも、[Rufloのscheduled workerがheadless Claudeを繰り返し起動していた例](https://www.reddit.com/r/Claude%43ode/comments/1ve888h/claude_usage_strangely_rises_to_100_without_me/)があります。

「操作していないのに減る」なら、計測バグだけでなく、Routines、Scheduled Task、loop、workflow、ほかの端末、認証token、Agent teamが動いていないかを確認する価値があります。

### 5. Anthropic側の修正を待つしかなかった例

2026年4月の公式事例では、ユーザー側のキャッシュ削除ではなく、Anthropicがv2.1.101で修正し、全購読者の利用枠をリセットしました。

サーバー側の計測や製品側のキャッシュ管理が原因なら、ユーザー側で完全に直す方法はありません。条件をそろえた1回テストでも極端に減る、または何もしていないのに減る場合は、画面記録を添えてAnthropic Supportへ送る段階です。

## ブラウザキャッシュ削除、再ログイン、再インストールは効く？

<p class="lead">Usage急減の根本対策として有効だとする、信頼できる根拠は確認できませんでした。</p>

| 操作 | 期待度 | 理由 |
|---|---|---|
| ブラウザキャッシュ削除 | 低・不明 | 表示不具合には効く可能性があるが、サーバー側のUsageを戻す根拠なし |
| Cookie削除／再ログイン | 低・不明 | 認証・表示問題とは別。急減改善の一貫したAfter報告なし |
| アプリ再起動 | 低〜中 | sessionに残る状態が原因なら効く例あり。消費済み枠は戻らない |
| PC再起動 | 低 | background process停止の確認にはなるが、根本原因の特定にならない |
| Claude再インストール | 低 | 公式のUsage対策ではない。先に新規sessionと稼働中処理を確認 |

再ログインや再起動を試すなら、「直った気がする」で終えず、実施前後のUsage、時刻、session、モデル、機能を記録します。

## 対策を期待度で整理

<div class="is-scrollable">

| 対策 | 期待度 | 根拠 | 対象 |
|---|---|---|---|
| 完全な新規チャットへ短い要約だけ渡す | 高 | 公式が長い会話からの移行を推奨。session状態の改善報告あり | Claude全般 |
| 5時間枠リセット後に1回だけ測る | 高 | 条件比較ができ、残り枠の浪費も抑えられる | Claude全般 |
| Research・Web検索・不要なconnectorを切る | 高 | 公式がtoken-intensiveと明記 | Claude.ai／Desktop |
| `/clear`で無関係な作業を分ける | 高 | 公式推奨。`/clear`自体はコストなし | Claude Code |
| 読むファイルとProject instructionsを限定 | 中〜高 | 公式が未使用file削除・短いinstructionを推奨 | Claude全般 |
| Agent teamを小さくし、終了を確認 | 高 | 公式で約7倍、終了まで消費 | Claude Code／Cowork |
| `/usage`と`/context`で原因内訳を確認 | 高 | 公式機能。long context・cache missを検出 | Claude Code |
| Scheduled Task・loop・別sessionを止める | 高（該当時） | 公式仕様と具体的Bug報告 | Claude Code |
| Fableを最終判断だけに限定 | 中〜高 | 公式に他モデルより速い。常時Thinking | Fable利用者 |
| ブラウザキャッシュ削除 | 低・不明 | Usage急減への直接根拠なし | Claude.ai |
| 再ログイン | 低・不明 | 認証問題には有効でも、Usage計算とは別 | Claude.ai |
| Anthropicの修正を待つ | 状況次第 | サーバー側・製品側Bugなら必要 | 全般 |

</div>

## 残り50％を浪費しない、1回だけの再現テスト

<p class="lead"><strong>今の残り枠で何度も試さず、次の5時間枠リセット後に1回だけ行います。</strong></p>

1. Settings → Usageを開き、5時間枠リセット直後の画面を時刻入りで保存する
2. これまで使っていた巨大なチャットやsessionは再開しない
3. 完全な新規チャットを作る。Claude Codeなら新規sessionまたは`/clear`を使う
4. 必要事項だけを短い引き継ぎメモにする。大量ファイルは添付しない
5. Research、Web検索、connector、MCP、Agent、Scheduled Taskをオフまたは停止する
6. Fable 5に、結果を比較しやすい中程度の依頼を1回だけ送る
7. 応答終了後、Usage画面と時刻をもう一度保存する

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">残り枠を浪費せずに切り分ける手順です。</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/202608-claude-fable-5-usage-draining-fast/slide03.webp" alt="5時間枠リセット後に新規チャット、短い引き継ぎ、ツール停止、1回だけの比較テストを行う手順を示す図解" loading="lazy" decoding="async" />
    <figcaption>図解：残り枠を浪費しない1回テスト</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>この図で分かること</strong></p>
    <ul>
      <li>リセット直後のUsageと時刻を保存してから始める</li>
      <li>新規チャット、短い引き継ぎ、ツールなしで条件をそろえる</li>
      <li>1回の応答後に再計測し、20〜30％以上なら追加テストを止める</li>
    </ul>
  </div>
</section>

### 筆者の検証目安

| 1回の増加 | 読み方 |
|---:|---|
| 数％程度 | 旧チャット、長い履歴、ツールの影響が強い候補 |
| 10％以上 | 高負荷。依頼内容とThinking時間を確認 |
| 20〜30％以上 | 異常消費を強く疑い、追加テストを止めてSupportへ |

<Note>この数値は筆者が切り分けに使う検証目安で、Anthropicの公式な正常・異常基準ではありません。プランと依頼内容で差があるため、単独でBug認定には使えません。</Note>

新規・短文・ツールなしでも1回で20〜30％以上減るなら、使い方だけでなく、Usage計測またはサービス側の問題を疑う材料が増えます。何もしていない間にも増えるなら、追加プロンプトを送らず、稼働中sessionと認証を確認してSupportへ連絡します。

## 9つの原因仮説を比較

<div class="is-scrollable">

| 仮説 | 支持する証拠 | 反証・弱点 | 現時点の確度 |
|---|---|---|---|
| A. Fable 5の通常仕様 | 公式に他モデルより速く、Thinking常時有効 | 2往復50％の公式基準はない | やや低い |
| B. 長大な会話履歴 | 公式に全履歴再処理、長い会話ほどUsage増 | 筆者sessionの長さが未確認 | やや高い |
| C. 大量ファイル・Project Knowledge | 添付サイズは公式の消費要因 | 筆者が何を添付したか未確認。ProjectはRAG・cacheで軽減もある | 五分五分 |
| D. Agent／Tool Use | Researchは複数call、Agent teamは約7倍 | 通常チャットでAgentを使ったか未確認 | 五分五分 |
| E. Claude Code固有問題 | 長いcontext、cache miss、scheduled task、過去Bug | 筆者の利用画面が未確認 | 五分五分 |
| F. Fable以外にも起こる異常 | Fable以外で1回50％の報告あり | ユーザー申告で原因未確定 | 五分五分 |
| G. Claude側Usage計測異常 | 2026年4月に公式前例。現在も近似報告 | 今回を公式認定した発表なし | 五分五分 |
| H. 8月17日障害との関連 | 時期が近く、直近障害が多い | StatusにUsage誤計上の記載なし | 低い |
| I. 利用制限・計算方法の変更 | 利用量は状況・機能で変わり、公式は追加制限の裁量を明記 | 8月17〜18日の変更発表を確認できない | やや低い |

</div>

## 最終評価：「2往復で50％」は異常なのか

<p class="lead"><strong>総合判定：異常を疑う水準。</strong></p>

Fable 5は重く、長い会話、Research、Tool Use、Agent team、キャッシュミスが重なれば、少ない往復でも大きく減ることはあります。そのため「明らかな異常」とまでは断定できません。

しかし、公式は1往復20〜30％を正常としておらず、2往復50％をFableの週間50％ルールで説明することもできません。新規・短いチャットで、ツールやAgentなしでも同じ減り方を再現するなら、通常仕様だけでは説明しにくくなります。

| 仮説 | 5段階評価 |
|---|---|
| Fable通常仕様だけで説明可能 | やや低い |
| 長大コンテキストが主因 | やや高い |
| Agent／Toolが主因 | 五分五分 |
| Usage計測異常 | 五分五分 |
| 8月17日障害との関連 | 低い |
| 利用制限仕様変更 | やや低い |

<section class="article-slide-section article-wide-block">
  <p class="slide-intro">公式情報、実測、同様報告を分けて総合評価しました。</p>
  <figure class="article-slide-figure">
    <img src="/images/articles/202608-claude-fable-5-usage-draining-fast/slide04.webp" alt="Fable 5を2往復使って5時間枠を50％消費した現象を異常を疑う水準と評価し、注意点と対策トップ3を示す図解" loading="lazy" decoding="async" />
    <figcaption>図解：最終判定は「異常を疑う水準」</figcaption>
  </figure>
  <div class="slide-reading-note">
    <p><strong>この図で分かること</strong></p>
    <ul>
      <li>通常仕様だけで説明できるという公式根拠はない</li>
      <li>長い履歴やAgent、Tool Useがあれば急減する余地はある</li>
      <li>新規・短文・ツールなしでも再現すれば、計測異常を疑う材料が強まる</li>
    </ul>
  </div>
</section>

## 今Fable 5を使うなら、この運用が安全

<p class="lead">Fableを常時使うのではなく、難所だけに絞ると、性能と利用枠を両立しやすくなります。</p>

| 工程 | 向いている使い方 |
|---|---|
| 資料集め・一次整理 | SonnetやOpus、検索ツールで必要情報を絞る |
| 長文の要約・ファイル選別 | 通常モデルで短い引き継ぎ資料を作る |
| 最重要の深掘り | Fable 5に論点を限定して依頼 |
| 独立監査 | Fable 5に完成物と評価基準だけ渡す |
| 最終レビュー | Fable 5で矛盾、抜け、重大リスクを確認 |

Fable自身に大量の資料をゼロから探索させると、FableのThinkingに加えて検索・Tool・履歴が重なります。先に通常モデルで整理し、Fableには「何を判断してほしいか」と必要最小限の材料だけ渡す方が現実的です。

### 現時点で試す価値が高い対策TOP3

1. **次の5時間枠で、新規チャット＋短い引き継ぎ＋ツールなしの1回テスト**
2. **Claude Codeなら`/usage`・`/context`を確認し、Agent、MCP、Scheduled Task、別sessionを停止**
3. **Fableを深掘り・監査・最終レビューに限定し、資料整理はほかのモデルへ分担**

それでも1回で20〜30％以上減る、または操作していない間にも減るなら、追加テストは止めます。開始前後のUsage画面、時刻、モデル、plan、sessionの新旧、使った機能をまとめ、Anthropic Supportへ送るのが次の一手です。

## まとめ：仕様で説明できる部分と、まだ説明できない部分を分ける

<Callout kind="facts" title="Anthropic公式で確認できたこと">
  <ul>
    <li>Fable 5はほかのClaudeモデルより利用枠を速く使う</li>
    <li>対象プランの「最大50％」は週間枠の話で、今回の5時間枠50％とは別</li>
    <li>長い会話、ファイル、Research、Tool、モデル、努力レベルがUsageへ影響する</li>
    <li>Fable 5はExtended Thinkingを常時使い、Claude Codeでは無効化できない</li>
    <li>過去にcache missで利用枠が想定より速く減るBugがあり、公式修正と枠リセットが行われた</li>
  </ul>
</Callout>

<Callout kind="claims" title="ユーザー報告で確認できたこと">
  <ul>
    <li>数分、1〜数プロンプトで5時間枠の大半を使ったという報告が複数ある</li>
    <li>Max 20xやFable以外でも近似症状が報告されている</li>
    <li>新規session、短い引き継ぎ、Agent削減で改善したという報告はあるが、数字つきBefore／Afterは少ない</li>
  </ul>
</Callout>

<Callout kind="unc" title="まだ確認できないこと">
  <ul>
    <li>今回の2往復50％がFableの通常処理、長い履歴、Tool、計測異常のどれか</li>
    <li>8月17日の障害と8月18日のUsage急減の因果関係</li>
    <li>8月17〜18日に利用制限の計算方法が変更されたか</li>
  </ul>
</Callout>

不安だけを残さないために、検証は1回に絞ります。新規・短い・ツールなしで正常に戻れば、旧sessionやコンテキストが有力です。それでも極端に減るなら、ユーザー側で消耗戦を続けず、証拠をそろえてAnthropic側へ切り分けを渡す。今できる最も安全な進め方は、この順番です。

## 参考情報

### Anthropic公式・Help Center・Docs

- [Claude Fable 5 on your plan](https://support.claude.com/en/articles/15424964-claude-fable-5-on-your-plan)
- [How do usage and length limits work?](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)
- [Usage limit best practices](https://support.claude.com/en/articles/9797557-usage-limit-best-practices)
- [What is the Pro plan?](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan)
- [What is the Max plan?](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)
- [What is the Team plan?](https://support.claude.com/en/articles/9266767-what-is-the-team-plan)
- [Change the model, effort, and thinking settings](https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings)
- [Using Research on Claude](https://support.anthropic.com/en/articles/11088861-using-research-on-claude-ai)
- [Manage costs effectively — Claude Code Docs](https://code.claude.com/docs/en/costs)
- [Claude Fable 5 model page](https://www.anthropic.com/claude/fable)

### 公式障害・Postmortem

- [Claude Status — Incident API](https://status.claude.com/api/v2/incidents.json)
- [An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)

### GitHub・Redditのユーザー報告

- [GitHub #83106：Fableの最後の50％を2分で消費したとの報告](https://github.com/anthropics/claude-code/issues/83106)
- [GitHub #76826：既存sessionだけ制限状態が残り、新規sessionは動いた報告](https://github.com/anthropics/claude-code/issues/76826)
- [GitHub #64744：ScheduleWakeup loopが残り続けた報告](https://github.com/anthropics/claude-code/issues/64744)
- [Reddit：8月17日に約400K contextの小修正で5時間枠40％との報告](https://www.reddit.com/r/Claude%43ode/comments/1vr0g37/anyone_else_facing_limit_problems_today/)
- [Reddit：Fable Deep Researchが5分未満で5時間枠へ到達した報告](https://www.reddit.com/r/ClaudeAI/comments/1v0jugv/quick_usage_limit_hit_on_max_x5/)
- [Reddit：長いsessionを整理し、役割分担で消費が改善した報告](https://www.reddit.com/r/claude/comments/1v36mxo/current_session_after_17_minutes_from_a_fresh/)

<Note>この記事は2026年8月18日時点の情報です。ユーザー投稿は再現条件が統一された実験ではなく、公式事実とは分けて扱っています。各planの利用枠とFable 5の条件は変更される可能性があるため、最新のUsage画面と公式ヘルプも確認してください。</Note>
