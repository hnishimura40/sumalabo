# research_report.md — Meta One（Turn1 Research Pass）

出所: ChatGPT「すまラボ台本」チャット（c/6a1b8fd1-0b98-83a9-9b82-e979c0a1e994（Meta Oneと有料プラン））から backend-api 経由で 2026-07-03 に再取得（P7復旧）。元ファイルは 2026-07 Temp クリーンアップで消失。

---

## 1. Research Pass

### facts：確認できた確定事実

#### Plus系：Instagram / Facebook / WhatsAppの追加機能課金

- Metaは、Instagram Plus、Facebook Plus、WhatsApp Plusという消費者向けサブスクリプションをグローバルに展開すると報じられている。TechCrunchでは、Instagram PlusとFacebook Plusは月額3.99ドル、WhatsApp Plusは月額2.99ドルと説明されている。citeturn333977view0
- Plus系は、投稿・閲覧・メッセージなどの基本機能を有料化するものではなく、プロフィールやアプリの見た目、ストーリー関連機能、リアクション、分析系などの追加機能を提供するレイヤーとして整理できる。TechCrunchでは、プロフィールカスタマイズ、スーパーリアクション、ストーリー分析などが例示されている。citeturn333977view0
- Meta Verifiedとは別の位置づけ。TechCrunchは、Plus系がMeta Verifiedを置き換えるものではなく、Meta Verifiedは認証・なりすまし対策・サポートに重点があると説明している。citeturn333977view0
- The Vergeも、Facebook / Instagram / WhatsApp向けのPlus系有料プランと、Meta AI向けサブスクリプションの動きを報じている。citeturn199293view0

#### Meta One：AI向け課金テスト

- Meta Oneは、Metaのサブスクリプション群をまとめるブランド・枠組みとして説明されている。TechCrunchでは、AIユーザー向けにMeta One PlusとMeta One Premiumをテストするとされている。citeturn333977view0
- AI向けプランは、Meta One Plusが月額7.99ドル、Meta One Premiumが月額19.99ドル。Premiumは、より重い処理、複雑な推論、動画・画像生成まわりの容量増に関係するものとして説明されている。citeturn333977view0
- Meta AIのカジュアル利用は無料で残ると報じられている。一方で、重いAI利用は有料レイヤーに寄っていく構造として読める。citeturn333977view0
- AI向けMeta Oneのテスト地域は、シンガポール、グアテマラ、ボリビアとされている。citeturn333977view0

#### Meta One：事業者・クリエイター向け課金テスト

- 事業者・クリエイター向けには、Meta One EssentialとMeta One Advancedのテストが予定されている。TechCrunchでは、Essentialが月額14.99ドル、Advancedが月額49.99ドルとされている。citeturn333977view0
- Essentialは認証バッジ、なりすまし対策、外部リンク整理など。Advancedは、検索結果やフィードでの見え方、分析、運用支援機能などが含まれると説明されている。citeturn333977view0
- 事業者・クリエイター向けテスト地域は、サウジアラビア、モロッコ、タイ、バングラデシュなどとされている。citeturn333977view0

#### MetaのAI投資・業績

- Metaの2026年第1四半期売上は563.11億ドルで、前年同期比33%増。家族DAPは2026年3月平均で35.6億人。citeturn199293view1
- Q1の設備投資は198.4億ドル。2026年通年の設備投資見通しは1,250億〜1,450億ドルで、従来の1,150億〜1,350億ドルから上方修正されている。citeturn199293view2
- ただし、これらの投資額と今回の課金プランを「投資回収のため」と単純に結びつけるのは断定しすぎ。背景として触れる場合も、広告依存の補完、AI利用の計算資源負荷、収益源の多層化という形で慎重に扱う。

#### 日本でのMeta AI

- Meta Japanは、2025年11月25日から日本でMeta AIを段階的に提供開始すると発表している。対象はInstagram、Facebook、Messenger、WhatsApp、meta.ai。citeturn199293view4
- 日本向け発表では、Meta AIの利用例として、質問への回答、グループチャットでの利用、画像作成・カスタマイズ・アニメーション化などが説明されている。citeturn199293view4
- 確認できた範囲では、日本向け公式発表にMeta One有料プランの日本提供時期、日本円価格、日本での対応機能は記載されていない。citeturn199293view4

---

### claims：報道ベース・断定回避が必要なもの

- 「Meta Oneは、Metaの課金サービスをまとめる中心ブランドになる」という見方は、TechCrunchの報道内容からは妥当。ただし、現時点ではテスト中のプランも含むため、完成形として断定しない。citeturn333977view0
- 「AI投資の増加が課金強化の背景にある」という見方は、The VergeがAI投資後の新収益源という文脈で説明している。ただし、Meta自身が今回の各プランを“投資回収のため”と明確に位置づけたとは言い切らない。citeturn199293view0
- 「SNSもAIも、無料＋広告だけでなく、追加機能・高負荷利用を有料にする方向へ進んでいる」という整理は記事の解釈として使える。ただし、InstagramやWhatsAppの基本利用が有料化されるという意味ではない。
- 「Meta AIの重い使い方は有料化に寄っていく」は、AI向けMeta Oneの内容から自然な整理。ただし、日本で同じ形になるかは未確定。

---

### uncertain：未確定・確認不能

- Meta One系の日本提供時期。
- Meta One系の日本円価格。
- 日本で提供される場合の機能差。
- Plus系の日本提供時期、日本円価格、日本での機能差。
- 日本版Meta AIで、今後どの機能が無料に残り、どの機能が有料になるか。
- Meta Oneが将来的にMeta Verifiedや既存の事業者向けサービスとどう統合・整理されるか。
- AIグラス向け特典など、今後追加されるとされる要素の詳細。
- 「今回の課金はAI投資回収が目的」とする直接因果。

---

## 参考URL4本の確認状況

| 参考URL | 到達 | 内容一致 | 確認内容 |
|---|---:|---:|---|
| TechCrunch | 到達 | 一致 | Plus系の価格、機能、Meta Verifiedとの違い、Meta OneのAI向け・事業者向けテスト、対象地域、Meta AIの無料継続について確認。citeturn333977view0 |
| The Verge | 到達 | 一致 | Plus系とMeta AI課金の報道、AI投資後の新収益源という文脈を確認。価格や機能の大枠もTechCrunchと整合。citeturn199293view0 |
| Meta IR Q1 2026 | 到達 | 一致 | Q1売上563.11億ドル、前年比33%増、家族DAP35.6億人、Q1設備投資198.4億ドル、通年CapEx見通し1,250億〜1,450億ドルを確認。citeturn199293view1 citeturn199293view2 |
| Meta Japan | 到達 | 一致 | 2025年11月25日から日本でMeta AIを段階提供開始、対象アプリ、利用例を確認。Meta One有料プランや日本円価格の記載は確認できず。citeturn199293view4 |

---

## 「確定事実」との照合

### 一致

- Plus系の価格：Instagram Plus $3.99/月、Facebook Plus $3.99/月、WhatsApp Plus $2.99/月で一致。
- Plus系の機能：プロフィール・アプリのカスタマイズ、スーパーリアクション、ストーリー分析などで一致。
- 基本利用は無料のまま、という整理で一致。
- Plus系はMeta Verifiedを置き換えない、という整理で一致。
- Meta One AI向け：Plus $7.99/月、Premium $19.99/月で一致。
- AI向けPremiumは、重い処理、複雑推論、動画・画像生成の容量増に関係するという整理で一致。
- Meta AIのカジュアル利用は無料継続という整理で一致。
- AI向けテスト地域：シンガポール、グアテマラ、ボリビアで一致。
- 事業者向けMeta One：Essential $14.99/月、Advanced $49.99/月で一致。
- 事業者向けテスト地域：サウジ、モロッコ、タイ、バングラデシュで一致。
- Meta Q1 2026の売上、CapEx、家族DAPの数値は一致。
- 日本でMeta AIが2025年11月25日から段階提供開始という点は一致。

### 食い違い

- 大きな食い違いは確認できなかった。
- ただし、The VergeはTechCrunchやBloomberg報道を参照する形で書いているため、細部の一次性はTechCrunchとMeta公式発表・IRを優先した方が安全。

### 補足

- Meta Japanの公式発表では、日本でMeta AIを段階提供することは確認できるが、「無料」と明記されているかまでは確認できなかった。日本向け記事では「日本でMeta AIは段階提供が始まっている。一方、Meta Oneの日本提供や価格は確認できない」と分けるのが安全。
- Meta IRは課金プランそのものの根拠ではなく、「AI・インフラ投資が非常に大きい」という背景説明に使う。
- 「Meta One＝SNS全部有料化」ではなく、「無料＋広告の土台に、追加機能・高負荷AI利用・事業者向け機能の有料レイヤーが増える」と整理するのが記事の軸として妥当。

---

