# research_report.md — Claude Opus 4.8（Turn1 Research Pass）

出所: ChatGPT「すまラボ台本」チャット（c/6a1c1064-b46c-83a4-98c2-06a189338607）から backend-api 経由で 2026-07-03 に再取得（P7復旧）。元ファイルは 2026-07 Temp クリーンアップで消失。

---

了解です。今回は **Research Pass** と **Editorial Selection** だけで止めます。

# 1. Research Pass

## facts：確認できた確定事実

### Claude Opus 4.8 の位置づけ
Claude Opus 4.8 は、Anthropic が **2026年5月28日**に発表した Opus 4.7 の後継モデル。公式発表では、Opus 4.7 を土台に、コーディング、エージェント的な作業、推論、実務系ナレッジワークの評価で改善したモデルと説明されている。価格は Opus 4.7 から据え置き。citeturn677582view0turn553641view2

### 価格・提供
通常利用の価格は、**入力100万トークンあたり5ドル、出力100万トークンあたり25ドル**。fast mode は **入力100万トークンあたり10ドル、出力100万トークンあたり50ドル**。API では `claude-opus-4-8` として利用できる。citeturn553641view2

### 主な新機能
公式発表で大きく扱われている新機能は、主に次の4つ。

- **Dynamic workflows**  
  Claude Code の research preview。Claude が作業を計画し、1セッション内で **数百の並列サブエージェント**を走らせ、出力を検証してから返す仕組み。Enterprise、Team、Max プラン向け。citeturn553641view1

- **Effort control**  
  claude.ai と Cowork で、Claude がどれくらい深く考えるかを選べる機能。高い effort では深く考え、低い effort では速く返し、利用上限の消費を抑えやすくする。citeturn553641view1

- **Messages API の途中 system**  
  Messages API で会話途中に system 指示を追加できる。長い作業中に、最初の指示を全部書き直さず、権限・予算・環境情報などを更新しやすくする狙い。プロンプトキャッシュを維持できるため、エージェント的なループで入力コストを抑える効果がある。citeturn553641view1turn553641view3

- **adaptive thinking**  
  必要な場面だけ推論を走らせる仕組み。単純な確認や短いステップでは直接返し、複雑な複数ステップ問題では考えてから答える。API Docs では、同じ effort レベルで Opus 4.7 より無駄な thinking token を減らすと説明されている。citeturn553641view3

### API・仕様面
Claude Opus 4.8 は、Claude API、Amazon Bedrock、Vertex AI では **1M token context window が既定**。Microsoft Foundry では **200k**。最大出力は **128k tokens**。ツールとプラットフォーム機能は Opus 4.7 と同等。citeturn553641view3

### 改善点
公式は、Opus 4.8 について、Opus 4.7 比で以下のような改善を挙げている。

- 長時間のエージェント的コーディング
- 長い文脈の扱い
- compaction 後の復帰
- effort レベルごとの安定性
- 必要なツール呼び出しを飛ばしにくくなった点
- adaptive thinking 有効時の無駄な thinking token 削減 citeturn553641view3

### 「正直さ」「不確実性の申告」
Anthropic は、Opus 4.8 の目立つ改善点として「honesty」を挙げている。公式発表では、作業の不確実性を自分から示しやすく、根拠の薄い主張をしにくいと説明している。また、自分が書いたコードの欠陥を見逃す確率は、前モデルより約4分の1に減ったとされている。citeturn677582view0turn553641view1

### アライメント評価
Anthropic の公式発表では、Opus 4.8 は向社会的特性の評価で新たな高水準に達し、不整合な振る舞い、たとえば欺瞞や悪用への協力の率は Opus 4.7 より大幅に低下したと説明されている。citeturn553641view1

### computer-use / browser-agent
公式発表内のテスターコメントとして、Online-Mind2Web で **84%**を記録し、Opus 4.7 と GPT-5.5 の双方より前進したと説明されている。これは、ブラウザ操作やコンピュータ操作を伴うエージェント用途を語るうえで使える数字。citeturn677582view0

### GitHub Copilot
GitHub Changelog では、Claude Opus 4.8 が **GitHub Copilot で一般提供**になったと発表されている。GitHub は、初期テストでコード理解・生成、複雑な問題解決、大規模コードベースのナビゲーションに改善があると説明している。citeturn677582search1

### 今後の Claude Mythos Preview
Anthropic は、Project Glasswing の一部として、一部組織が Claude Mythos Preview をサイバーセキュリティ用途で使っていると説明。より高い知能を持つモデル群について、サイバー面の安全対策を進めたうえで、今後数週間で提供できる見込みとしている。citeturn553641view2

---

## claims：報道ベース・断定回避が必要な情報

### 「最大1,000のサブエージェント」
一部報道では「最大1,000」規模のサブエージェントという表現がある可能性があるが、公式発表で確認できる表現は **hundreds / 数百**。記事本文では「数百」に統一するのが安全。

### ベンチマーク詳細
「SWE-Bench Pro 69.2%」「OSWorld 83.4%」「fast mode 2.5倍速」などは、公式内や報道で触れられる要素があるものの、今回の記事の主軸にはしない。fast mode の速度については公式発表に「2.5×」の記載があるが、読者向けの記事では価格・機能整理を優先し、速度比較を大きく扱わないほうがよい。citeturn553641view1turn553641view3

### 41日でのリリース理由
TechCrunch は、OpenAI Codex や Google Gemini Flash など競合リリースの圧力に触れているが、これは公式見解ではなく報道側の文脈整理。記事で使う場合も「競争が激しくなっている中での発表」と軽く触れる程度にとどめる。citeturn677582search0

### 「4.7が不評だったから急いだ」
これは公式では確認できない。記事本文では採用しない。

---

## uncertain：未確定・確認不能

### 日本での提供可否・日本語対応の細部
公式発表には「available everywhere today」という表現はあるが、日本向けの個別案内、日本語での利用可否、国内プランごとの細部は今回確認範囲では明確に特記されていない。日本の読者向けには「日本でも同じ条件で使える」と断定しない。citeturn553641view2

### claude.ai の各プランでの見え方
Enterprise / Team / Max、API、Claude Code、GitHub Copilot など、提供面が複数ある。読者に誤解させないため、「Claudeの画面で全機能がすぐ同じように使える」とは書かない。

### Claude Mythos Preview の具体的な提供日
公式は「coming weeks」としているが、具体的な日付は出ていない。記事では「数週間内の見込み」とし、確定日として扱わない。citeturn553641view2

---

## 参考URLの確認状況

| 参考URL | 到達 | 内容一致 | 使い方 |
|---|---:|---:|---|
| Anthropic公式「Introducing Claude Opus 4.8」 | ○ | ○ | 主要な一次情報。リリース日、価格、新機能、Dynamic workflows、Effort control、honesty、アライメント、Mythos 予定の根拠にする。 |
| Claude API Docs「What's new in Claude Opus 4.8」 | ○ | ○ | API ID、1M context、128k output、途中system、adaptive thinking、API上の制約・改善点の根拠にする。 |
| TechCrunch dynamic workflow 報道 | ○ | 一部一致 | 競争環境や報道側の見方の補助にとどめる。公式でない評価・推測は本文の主軸にしない。 |
| GitHub Changelog | ○ | ○ | GitHub Copilot で GA の根拠にする。開発者導線として軽く触れる。 |

---

## 「確定事実」との照合

| 項目 | 照合結果 | コメント |
|---|---|---|
| 2026年5月28日リリース、Opus 4.7後継 | 一致 | 公式発表で確認。 |
| 価格据え置き、通常 $5/$25、fast $10/$50 | 一致 | 公式発表で確認。 |
| Dynamic workflows は数百の並列サブエージェント | 一致 | 公式は「hundreds」。1,000とはしない。 |
| Effort制御 | 一致 | claude.ai / Cowork、全プランで利用可能との公式記載あり。 |
| Messages API の途中 system | 一致 | API Docs と公式発表で確認。 |
| adaptive thinking | 一致 | API Docs で確認。 |
| 1M context、Microsoft Foundry 200k、128k output | 一致 | API Docs で確認。 |
| ツールは4.7と同等 | 一致 | API Docs で確認。 |
| APIモデルID `claude-opus-4-8` | 一致 | API Docs と公式発表で確認。 |
| GitHub Copilot で GA | 一致 | GitHub Changelog で確認。 |
| 改善領域：coding / reasoning / computer-use / knowledge work / finance | おおむね一致 | 公式発表と API Docs の記載で確認。finance は公式発表のテスターコメント・評価文脈として扱うのが安全。 |
| コード欠陥見逃しが約4分の1 | 一致 | 公式発表で確認。 |
| 不確実性の申告・根拠薄い主張の抑制 | 一致 | 公式発表で確認。 |
| Online-Mind2Web 84% | 一致 | 公式発表内のテスターコメントとして確認。 |
| Claude Mythos Preview 数週間内予定 | 一致 | 公式発表で確認。ただし日付は未確定。 |

