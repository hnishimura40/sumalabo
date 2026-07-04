以下、**research_report**形式で整理します。  
前提どおり、この記事では「7/8後に実際どう表示されたか」は断定せず、**切り替え前の総整理**に寄せるのが安全です。

# research_report  
## テーマ  
Claude Fable 5、7月8日からusage credits制へ — サブスクで使える残り時間と、切り替え後どうなるか

## 調査日時  
2026年7月5日 JST時点

---

## 1. facts：公式一次情報で確認できること

### 1-1. Fable 5の復帰と対象面

Anthropic公式ブログでは、Claude Fable 5 / Mythos 5へのアクセスが復旧済みで、Fable 5は **Claude Platform、Claude.ai、Claude Code、Claude Cowork** でグローバルに利用可能になると説明されています。AWS、Google Cloud、Microsoft Foundryについては「できるだけ早く再有効化する」とされています。citeturn550019view0

Claude Appsのリリースノートでも、2026年7月1日付で「Claude Fable 5 and Claude Mythos 5 restored」と記載されています。citeturn572891view4

### 1-2. 7/7までのサブスク同梱条件

公式ブログの表現は、**Pro、Max、Team、select Enterprise plans** について、Fable 5は **7月7日まで weekly usage limits の最大50%まで同梱**、その後は **usage credits経由** になる、というものです。citeturn550019view0

Enterpriseについては脚注が重要です。**standard Enterprise seatsにはFable 5の同梱枠はなく、usage creditsでアクセス可能**。一方、**premium Enterprise seatsは7月7日までサブスク内に含まれ、各メンバーのseat usageから追加料金なしで消費**されます。7月7日後はusage creditsを有効化すれば継続利用でき、無効ならFable 5にアクセスできなくなる、と説明されています。citeturn902395view1

### 1-3. 「週次上限50%」とリセット

公式ブログで確認できるのは「weekly usage limits の最大50%まで」という範囲です。citeturn550019view0

一般的な週次上限について、Proプランのヘルプでは、weekly usage limitは全モデルにまたがって適用され、**リセット日はアカウントごとに固定**、次回リセット時刻は **Settings > Usage** で確認できるとされています。citeturn464013view3

Teamプランでも、Standard / Premium seatsともに週次上限はアカウントごとに固定時刻でリセットされ、次回リセットは **Settings > Usage** で確認できるとされています。citeturn192490search1

Usage limit best practicesでは、**Settings > Usage** に5時間セッション上限と週次上限の進捗バーが表示され、現在の5時間セッションの残り時間、週次上限のリセット時刻も確認できると説明されています。citeturn806027view0

### 1-4. usage creditsの仕組み

個人向け有料プラン、つまり **Pro、Max 5x、Max 20x** では、usage creditsを有効にすると、プラン内の利用上限に達した後も、標準APIレートの従量課金でClaudeを継続利用できます。citeturn464013view0

有効化手順は公式ヘルプ上では、**Settings > Usage → Usage credits → Enable → 支払い方法設定 → spending preferences設定 → Add fundsでプリペイド購入** という流れです。月次上限、無制限設定、auto-reloadも設定できます。citeturn464013view0

usage creditsの利用状況は **Settings > Usage** のusage dashboardで確認でき、現在の支出、月初来のコスト、利用履歴などを見られるとされています。citeturn464013view0

Team / seat-based Enterpriseでは、OwnerまたはPrimary Ownerが **Organization settings > Usage** からusage creditsを有効化します。Teamでは事前購入、seat-based Enterpriseでは月末に実利用分が請求される仕組みです。citeturn464013view1

### 1-5. usage bundles

公式ヘルプでは、Pro、Max、Team向けにusage bundlesが用意されており、**$50、$250、$1000** のバンドルを事前購入できます。割引はそれぞれ **10%、20%、30%** と説明されています。citeturn464013view2

usage bundlesの残高はClaude、Claude Desktop、Claude Mobile、Claude Code、Cowork、Claudeアカウントを使うサードパーティ製品にまたがる単一プールとして使えるとされています。citeturn464013view2

### 1-6. 有効期限・返金可否

AnthropicのSupplemental Credit Termsでは、Usage Creditsは原則として**発行または確認通知から1暦年で失効**し、返金不可、譲渡不可とされています。citeturn355899view0

API/Workbench向けの支払いヘルプでも、購入済みcreditsは購入日から1年で失効し、期限延長不可、返金不可と説明されています。citeturn109532view0

### 1-7. 7/8以降にサブスク利用者から見える変化

公式情報ベースでは、7月7日後、Fable 5はサブスクの同梱枠から外れ、usage credits経由で利用する扱いになります。usage creditsが無効なら、少なくとも対象Enterprise脚注では「Fable 5にアクセスできなくなる」と明記されています。citeturn902395view1

個人向けPro / Maxのusage creditsでは、上限に達した際に通知が出て、usage creditsが有効かつ残高があれば、継続利用を選べます。その後の利用は標準APIレートで課金されます。citeturn464013view0

Claude Codeについては、Pro / Maxの利用上限はClaude本体とClaude Codeで共有され、上限到達後はusage creditsを有効化して継続、またはリセットを待つ選択肢が提示されます。citeturn464013view5

### 1-8. API価格との関係

Fable 5のAPI価格は、ローンチ時の公式ブログで **入力100万トークンあたり$10、出力100万トークンあたり$50** とされています。citeturn902395view2

現行のClaude Platform pricingでも、Claude Fable 5は **Base Input Tokens $10 / MTok、Output Tokens $50 / MTok** と記載されており、少なくとも調査時点では同じ価格です。citeturn572891view3

---

## 2. claims：公式以外・関係者発言・報道として扱うべきこと

### 2-1. 終了時刻は報道ベースでは「7/7 23:59:59 PT」

Business Insiderは、プロモーション条件として、対象有料サブスク利用者は **2026年7月7日 11:59:59 p.m. Pacific Time** までFable 5を週次上限の最大50%まで使えると報じています。これは日本時間では **2026年7月8日 15:59:59 JST** に相当します。citeturn180895view1

ただし、Anthropic公式ブログ本文で確認できた表現は「through July 7」であり、公式本文上で秒単位の終了時刻までは確認できませんでした。記事では「公式は7/7まで、報道では米国太平洋時間7/7 23:59:59まで」と分けるのが安全です。

### 2-2. 標準サブスク復帰の見通し

Anthropicのローンチ時公式ブログでは、十分なキャパシティが確保できた後、Fable 5をサブスク標準枠に戻すことを目指す、できるだけ早くそうしたい、という趣旨の記載があります。citeturn902395view2

BleepingComputerは、Claude CodeのリードエンジニアがXで、7月7日後はいったんサブスクから外れるが、キャパシティが許せば標準サブスクに戻す方針だと説明した、と報じています。citeturn883260view0

ここは記事では「復帰予定あり」と断定するより、**“Anthropicは復帰を目指すとしているが、時期は未発表”** が安全です。

### 2-3. Fable 5は週次上限を速く消費する可能性

Business Insiderは、AnthropicがFable 5は他のClaudeモデルより週次上限を速く消費すると注意している、と報じています。citeturn180895view1

公式ヘルプ上でも、利用上限の消費量はメッセージ長、添付ファイル、会話の長さ、ツール利用、モデル選択、effort levelなどで変わると説明されています。citeturn806027view0

記事では「Fable 5は“残り時間”が固定で決まるものではなく、使い方によって減り方が大きく変わる」と説明するのがよさそうです。

---

## 3. uncertain：未確定・記事で断定しない方がよい点

### 3-1. 日本時間での公式終了時刻

公式ブログ本文では「through July 7」「after July 7」と確認できますが、公式ページ本文だけでは日本時間での厳密な切り替え時刻は確認できません。報道ベースでは7月8日15:59:59 JST相当ですが、記事内では「報道では」と明示するのが安全です。citeturn550019view0turn180895view1

### 3-2. 「50%枠」が個人の週次リセットでどう再計算されるか

一般の週次上限はアカウントごとの固定時刻にリセットされ、Settings > Usageで見られることは公式ヘルプで確認できます。citeturn464013view3turn806027view0

ただし、Fable 5専用の「50%枠」が、各ユーザーの週次リセットと完全に同じ挙動で再計算されるのか、また7/7終了間際に週次リセットが来た場合どう扱われるのかは、確認できた公式本文だけでは細かく断定できません。

### 3-3. usage credits有効化後の画面文言

公式ヘルプでは通知・確認・Settings > Usageでの表示は説明されていますが、7/8以降にFable 5選択時に実際どのような日本語/英語文言が出るかは、切り替え後の実画面確認が必要です。citeturn464013view0

### 3-4. 日本ユーザーの支払い通貨・税表示・モバイル課金との関係

公式ヘルプでは、モバイルアプリ経由で有料プランに加入した場合、usage creditsの有効化・購入はClaude web版でのみ可能と説明されています。citeturn464013view0

一方で、日本ユーザーに対するusage credits購入時の通貨表示、税、カード明細、アプリ課金との具体的な関係は、実画面で確認した方が確実です。

### 3-5. 標準サブスク復帰の時期

Anthropicは「十分なキャパシティがあれば標準サブスクに戻すことを目指す」としていますが、具体的な日付は出していません。citeturn902395view2

したがって記事では「一時的な措置の可能性があるが、いつ戻るかは未定」とするのが安全です。

---

## 記事化する場合の重要な整理

この記事の結論は、次の形がいちばん読者に伝わりやすいです。

**Fable 5は7/7まで“サブスク内で使える”が、無制限ではなく週次上限の最大50%まで。7/8以降は、少なくとも公式説明上はusage creditsでの従量課金扱いになる。標準サブスクに戻す方針は示されているが、時期は未定。**

「残り時間」という言い方は注意が必要です。Claudeの利用枠は単純な時計の残り時間ではなく、5時間セッション上限・週次上限・モデル・会話の長さ・ファイル・ツール利用で消費が変わります。読者には、**Settings > Usageで現在の消費量、セッション残り時間、週次リセット時刻を確認する** と案内するのが安全です。citeturn806027view0

---

## 参照ソース一覧

1. **Anthropic公式ブログ「Redeploying Fable 5」**  
   復帰日、対象面、7/7まで50%同梱、7/7後usage credits、Enterprise脚注、安全分類器の説明に使用。citeturn550019view0turn902395view1

2. **Anthropic公式ブログ「Claude Fable 5 and Claude Mythos 5」**  
   ローンチ時の価格、当初のサブスク同梱方針、標準サブスク復帰を目指す記述に使用。citeturn902395view2

3. **Claude Help Center「Manage usage credits for paid Claude plans」**  
   Pro / Maxでのusage credits有効化、Settings > Usage、Add funds、auto-reload、標準APIレート課金、上限到達時の通知に使用。citeturn464013view0

4. **Claude Help Center「Manage usage credits for Team and seat-based Enterprise plans」**  
   Team / EnterpriseでのOrganization settings > Usage、Owner設定、Teamは事前購入、seat-based Enterpriseは月末請求に使用。citeturn464013view1

5. **Claude Help Center「Buy usage bundles」**  
   $50 / $250 / $1000バンドル、割引、購入上限、残高の適用範囲に使用。citeturn464013view2

6. **Anthropic Supplemental Credit Terms**  
   Usage Creditsの失効、返金不可、譲渡不可に使用。citeturn355899view0

7. **Claude Platform Docs「Pricing」**  
   現行API価格、Fable 5 $10 input / $50 output、batch pricing、1M context pricingに使用。citeturn572891view3

8. **Claude Help Center「Usage limit best practices」**  
   Settings > Usageでの5時間セッション・週次上限・残り時間・リセット確認に使用。citeturn806027view0

9. **Business Insider / BleepingComputer**  
   終了時刻の報道、関係者発言ベースの標準サブスク復帰見通しの補足に使用。公式一次情報とは分けて扱うべき。citeturn180895view1turn883260view0