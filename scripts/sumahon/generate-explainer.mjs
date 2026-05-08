import { pickInternalLinks, todayJst, toIsoJst } from "./utils.mjs";

function escapeYaml(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function makeTitle(sourceTitle) {
  const base = sourceTitle.replace(/【.*?】/g, "").trim();

  if (base.length <= 34) {
    return `${base}とは？普通の人向けに要点を整理`;
  }

  return `${base.slice(0, 34)}…とは？普通の人向けに要点を整理`;
}

function makeDescription(sourceTitle, topicCategory) {
  return `${sourceTitle}について、何が話題なのか、普通の人にはどう関係するのか、まだ確認が必要な点をすまラボ向けにわかりやすく整理します。`;
}

function makeThumbnailPrompt(title, topicCategory) {
  return [
    `1200x675、16:9、すまラボのミント/ティール系デザイン。`,
    `テーマ: ${title}`,
    `普通の人向けに${topicCategory}ニュースを整理するイメージ。`,
    `ひまりとらぼまるは控えめに配置し、文字は大きく読みやすく。`,
    `煽りすぎず、ニュース解説・判断材料の雰囲気にする。`,
  ].join("\n");
}

function makeXPost(title) {
  return `${title}\n\n何が話題なのか、普通の人にはどう関係するのかをすまラボ向けに整理しました。\n#すまラボ #スマホ #AI #ガジェット`;
}

export function generateExplainer({ source, classification, slug }) {
  const title = makeTitle(source.sourceTitle);
  const description = makeDescription(source.sourceTitle, classification.topicCategory);
  const updated = todayJst();
  const publishAt = toIsoJst();
  const relatedLinks = pickInternalLinks(classification.topicCategory);
  const relatedSlugs = relatedLinks
    .map((link) => link.href.match(/^\/articles\/([^/]+)\//)?.[1])
    .filter(Boolean)
    .slice(0, 3);

  const keyPointItems = source.keyPoints
    .slice(0, 4)
    .map((point) => `    <li>${point}</li>`)
    .join("\n");
  const sourceMemoItems = source.keyPoints
    .slice(0, 5)
    .map((point) => `- ${point}`)
    .join("\n");
  const links = relatedLinks
    .map(
      (link) => `    {
      label: "${escapeYaml(link.label)}",
      href: "${link.href}",
      description: "${escapeYaml(link.description)}",
    }`,
    )
    .join(",\n");

  const mdx = `---
title: "${escapeYaml(title)}"
slug: "${slug}"
type: "news"
category: "ニュースをかみくだく"
description: "${escapeYaml(description)}"
thumbnail: ""
thumbnailAlt: "${escapeYaml(`${title}について、ひまりとらぼまるが普通の人向けに要点を整理しているイメージ`)}"
status: "review"
priority: ${classification.priority === "high" ? 1 : 2}
characterUse:
  recommended: true
  count: 2
  primary: "duo_talk_half.webp"
  secondary: "duo_guide_half.webp"
related:
${relatedSlugs.length > 0 ? relatedSlugs.map((item) => `  - "${item}"`).join("\n") : "  []"}
updated: "${updated}"
publishAt: "${publishAt}"
---

import CharacterDialogue from "../../src/components/characters/CharacterDialogue.astro";
import CharacterGuideCard from "../../src/components/characters/CharacterGuideCard.astro";

${source.sourceTitle} というニュースが話題になっています。

ただ、スマホ・AI・ガジェットのニュースは、専門用語やメーカー事情が多く、そのままだと「結局、自分に関係あるの？」が見えにくくなりがちです。

この記事では、今回の話題をすまラボ向けに、普通の人にもわかる言葉で整理します。

<div class="summary-box">
  <p class="box-label">先に結論</p>
  <ul>
    <li>これは、${classification.topicCategory}まわりの動きとして注目したいニュースです。</li>
    <li>すぐ購入や乗り換えを決める話というより、今後の選び方に関係する可能性があります。</li>
${keyPointItems}
    <li>価格、発売時期、対応機種、提供地域などは、公式情報で確認してから判断したいところです。</li>
  </ul>
</div>

<CharacterDialogue
  image="/images/characters/duo_talk_half.webp"
  lines={[
    { speaker: "ひまり", text: "これって、普通の人も今すぐ気にした方がいいニュースなの？" },
    { speaker: "らぼまる", text: "すぐ行動する話とは限りません。まずは何が変わる可能性があるのかを、落ち着いて整理するのが大事です。" },
  ]}
/>

## 何が話題なのか

今回の話題は、元ニュースでは次のようなポイントとして紹介されています。

${sourceMemoItems}

ここでは、元記事の細かな表現をそのまま追うのではなく、すまラボ読者が判断しやすいように「何の話か」「なぜ話題か」「どこを確認すべきか」に分けて見ていきます。

## 難しいポイントをかみくだく

このニュースでつまずきやすいのは、専門用語や企業側の発表・報道の位置づけです。

公式発表で確定している話なのか、報道や予測として語られている話なのかで、受け止め方は変わります。

特に、価格、発売日、対応機種、キャンペーン、提供地域、技術仕様のような情報は変わりやすい部分です。記事を読む段階では、断定ではなく「現時点でそう案内されている」「報道ではそう見られている」という距離感で見るのが安全です。

## 普通の人にどう関係するのか

普通の人にとって大事なのは、ニュースそのものよりも、自分のスマホ利用やガジェット選びにどう関係するかです。

たとえば、次のような観点で見ると判断しやすくなります。

| 見るポイント | 確認したいこと |
|---|---|
| 生活への影響 | 毎日のスマホ利用が便利になる話か |
| 買い替え判断 | 今のスマホを買い替える理由になるか |
| 通信費 | 料金プランや回線選びに関係するか |
| 対応機種 | 自分のスマホでも使える話か |
| 日本展開 | 日本で正式に使える、買える、サポートされる話か |

この段階で「自分にはまだ関係なさそう」と分かるだけでも、ニュースを見る意味はあります。

## まだ分からないこと

現時点では、次のような点は人間が確認したいポイントとして残ります。

- 公式発表なのか、報道・噂・予測なのか
- 日本での提供や発売があるのか
- 価格や料金がどうなるのか
- 対応機種や対応サービスはどこまで広がるのか
- 実際の使い勝手や注意点はどうなのか

ここを曖昧にしたまま「絶対便利」「すぐ買うべき」と決めつけると、判断を間違えやすくなります。

## すまラボ的な見方

すまラボとしては、この話題は「今すぐ全員が動くニュース」というより、今後のスマホ・AI・ガジェット選びの流れを見る材料として扱うのがよさそうです。

今すぐ気にしたい人は、新しいスマホやAI機能、ガジェットの変化を追っている人です。

一方で、普段使いのスマホで困っていない人は、急いで判断しなくても大丈夫です。公式情報や実際のレビュー、価格や対応状況が見えてからでも遅くありません。

<CharacterGuideCard
  image="/images/characters/duo_guide_half.webp"
  title="関連する基本記事もあわせて確認"
  text="ニュース単体で判断するより、スマホ選びやAI機能の基本とつなげて見ると理解しやすくなります。"
  links={[
${links}
  ]}
/>

## まとめ

今回のニュースは、${classification.topicCategory}まわりの変化を知るうえで参考になる話題です。

ただし、元ニュースだけで購入や乗り換えを決める必要はありません。

大事なのは、何が確定していて、何がまだ分からないのかを分けて見ることです。

すまラボでは、今後もスマホ・AI・ガジェットのニュースを、普通の人が判断しやすい形に噛み砕いて整理していきます。
`;

  return {
    title,
    description,
    slug,
    mdx,
    publishAt,
    thumbnailPrompt: makeThumbnailPrompt(title, classification.topicCategory),
    xPostDraft: makeXPost(title),
    relatedLinks,
  };
}
