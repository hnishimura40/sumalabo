# 記事コンポーネント v3 — MDX での使用ルール（orchestrator 向け）

> **状態: 未有効化。** このルールは testMode の無人 run が完了した後、ユーザー宣言で有効化する。
> 有効化するまで orchestrator / night driver は従来どおりの MDX（HTML クラスベース）で記事を作る。
> 有効化時は本ブランチ（feat/orchestrator-v3-components）を merge し、
> `docs/night_driver_prompt.md` への参照追記を反映する。

デザイン刷新（PR #116〜#119、2026-07-06 本番反映済み）で追加した記事コンポーネント群を、
新規記事の MDX から使うためのルール。実装: `src/components/article/`、
ショーケース: https://sumalabo.com/design-preview/ 、設計図: `docs/design/sumalabo-design-preview-v3.html`

## import（MDX 冒頭・frontmatter 直後）

```mdx
import Summary30 from "../../src/components/article/Summary30.astro";
import Callout from "../../src/components/article/Callout.astro";
import Chip from "../../src/components/article/Chip.astro";
import NumCards from "../../src/components/article/NumCards.astro";
import Timeline from "../../src/components/article/Timeline.astro";
import TimelineItem from "../../src/components/article/TimelineItem.astro";
import ComparisonTable from "../../src/components/article/ComparisonTable.astro";
import Note from "../../src/components/article/Note.astro";
import CharacterBubble from "../../src/components/article/CharacterBubble.astro";
```

※ 使うものだけ import する（未使用 import は build 警告のもと）。

## 各コンポーネントの使いどころ

| コンポーネント | 使いどころ | ルール |
|---|---|---|
| `Summary30` | 記事冒頭（「先に結論」の直後 or 代替） | `<ol><li>` で要点 3〜5 個。1 記事 1 回 |
| `Callout kind="facts"` | 公式発表で確定した事実 | 一次情報リンクとセットで |
| `Callout kind="claims"` | 報道ベース（未確認含む） | 出典メディア名を本文で明示 |
| `Callout kind="unc"` | 未確定・変わる可能性 | 「〜時点」を必ず書く |
| `Chip` | 文中の確度ラベル | 1 段落 2 個まで。乱用しない |
| `NumCards` | 価格・日付・数量など数字が主役の要点 | 3 枚組が基本。数字は事実確認済みのもののみ |
| `Timeline` + `TimelineItem` | 経緯・続報の整理 | 今後動く点は `hot` を付ける |
| `ComparisonTable` | プラン・機種などの比較 | 4 列以内。`ok:` / `ng:` プレフィックスで◯×強調 |
| `Note` | 「調査時点」注記・軽い補足 | 強い注意は `Callout kind="unc"` を使う |
| `CharacterBubble` | ひまり=読者目線の疑問、らぼまる=整理・注意 | mood: himari `curious/aha/explain`、labo `smile/point/worried`。`labo worried` は unc ボックス併設が定型 |

## 既存ルールとの関係

- 図解スライド（`article-slide-section` + `slide-reading-note`）の書式は **従来どおり**（CLAUDE.md 準拠）。v3 コンポーネントはそれを置き換えない
- 確度の 3 区分（facts / claims / uncertain）は editorial_selection.md の区分と一致させる
- 禁則チェック・gate・build の通過条件は変更なし

## 有効化手順（ユーザー宣言後）

1. このブランチを main に merge
2. `docs/night_driver_prompt.md` の MDX 化ステップに「`docs/article_components_v3.md` に従い、Summary30 と確度 Callout を新規記事で使用する」の 1 行を追記（このブランチに含めてある）
3. 次の記事 1 本で実使用を確認し、問題なければ標準化
