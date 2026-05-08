import { existsSync } from "node:fs";

const referenceAssetCandidates = [
  "public/images/characters/duo_guide_half.webp",
  "public/images/characters/duo_talk_half.webp",
  "public/images/characters/himari_device_half.webp",
  "public/images/characters/himari_question_icon.webp",
  "public/images/characters/labomaru_normal_icon.webp",
  "public/images/characters/labomaru_chart_icon.webp",
  "public/images/characters/labomaru_worried_icon.webp",
  "assets/characters/full/himari_device_full.webp",
  "assets/characters/full/labomaru_normal_full.webp",
  "assets/characters/half/duo_talk_half.webp",
  "assets/characters/half/duo_guide_half.webp",
];

function compact(value = "", maxLength = 42) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getReferenceAssets() {
  return referenceAssetCandidates.filter((candidate) => existsSync(candidate));
}

function chooseMood(topicCategory) {
  const moods = {
    AI: "近未来 / 不思議 / やさしい整理",
    iPhone: "期待感 / まじめ / 少し驚き",
    Android: "発見 / 比較しやすい / やさしい整理",
    通信: "安心 / まじめ / 損しにくい",
    ガジェット: "ワクワク / 実用 / 少しテック感",
    ITニュース: "知的 / 近未来 / まじめ",
  };

  return moods[topicCategory] || "やさしい整理 / 少し気になる / まじめ";
}

function chooseMainSubject({ source, classification }) {
  if (classification.topicCategory === "AI") {
    return "AI機能や新しいデバイスの変化を象徴するスマホ画面・小さなAIアイコン";
  }

  if (classification.topicCategory === "iPhone") {
    return "新しいiPhoneの話題を想像させるスマホシルエットと選び方の分岐";
  }

  if (classification.topicCategory === "Android") {
    return "Androidスマホの新機能や端末の変化を示すスマホとチェックポイント";
  }

  if (classification.topicCategory === "通信") {
    return "通信プランや回線見直しを連想させるスマホ、SIM、チェックリスト";
  }

  if (classification.topicCategory === "ガジェット") {
    return "ニュースの主役になるガジェットを中心に、使い方が想像できる構図";
  }

  return `${compact(source.sourceTitle, 34)}を普通の人向けに整理するニュース解説イメージ`;
}

function makeCoreIdea({ source, classification }) {
  const category = classification.topicCategory;

  return `${category}ニュースの細かなスペック紹介ではなく、「普通の人が今知っておくと判断しやすい変化」を1枚で見せる。`;
}

function makeVisualMotifs(topicCategory) {
  const common = ["大きな短文見出し", "ミント/ティール系アクセント", "チェックマーク", "やわらかい光"];
  const motifs = {
    AI: ["AIアイコン", "スマホ画面", "吹き出し", "小さな回路モチーフ"],
    iPhone: ["スマホシルエット", "選択肢の分岐", "比較ライン", "Apple風ロゴは使わない"],
    Android: ["スマホ端末", "機能カード", "比較チップ", "実在ロゴは使わない"],
    通信: ["SIMカード", "アンテナ", "料金表", "確認リスト"],
    ガジェット: ["主役ガジェット", "使い方アイコン", "注意ポイント", "手元のスマホ"],
    ITニュース: ["ニュースカード", "AI/ITアイコン", "整理ボード", "疑問の吹き出し"],
  };

  return [...(motifs[topicCategory] || motifs.ITニュース), ...common];
}

function makeHeadlineIdeas({ source, classification }) {
  const titleKeyword = compact(source.sourceTitle.replace(/[「」]/g, ""), 18);

  return [
    `${titleKeyword}って何？`,
    `${classification.topicCategory}ニュースを整理`,
    "普通の人はここだけ確認",
  ];
}

function makeSublineIdeas(classification) {
  return [
    "何が変わるのかをやさしく解説",
    "買う・待つ・様子見の判断材料に",
    `${classification.topicCategory}の話題をかみくだく`,
  ];
}

function makeCharacterUse(topicCategory) {
  const defaults = {
    labomaru: "画面端で要点を整理する案内役。主役を邪魔しない小さめ配置。",
    himari: "読者目線で『これ何？』と気づく表情。必要なら片側だけに配置。",
    note: "必ず2人固定にしない。ニュースの主役を中心にし、キャラクターは理解補助にする。",
  };

  if (topicCategory === "AI" || topicCategory === "ガジェット") {
    return {
      labomaru: "新しい技術を指し示す案内役。小さくても視線誘導になる配置。",
      himari: "新機能を見て少し驚く読者代表。大きく出しすぎず、疑問の入口にする。",
      note: defaults.note,
    };
  }

  if (topicCategory === "通信") {
    return {
      labomaru: "注意点や確認項目をチェックする役。",
      himari: "料金や条件で迷う読者代表。必要なら表情だけで十分。",
      note: defaults.note,
    };
  }

  return defaults;
}

export function generateThumbnailBrief({ source, classification, generated }) {
  const referenceAssets = getReferenceAssets();

  return {
    slug: generated.slug,
    articleTitle: generated.title,
    category: "ニュースをかみくだく",
    articleType: "news",
    coreIdea: makeCoreIdea({ source, classification }),
    thumbnailMood: chooseMood(classification.topicCategory),
    mainSubject: chooseMainSubject({ source, classification }),
    characterUse: makeCharacterUse(classification.topicCategory),
    visualMotifs: makeVisualMotifs(classification.topicCategory),
    headlineIdeas: makeHeadlineIdeas({ source, classification }),
    sublineIdeas: makeSublineIdeas(classification),
    avoid: [
      "実在企業ロゴ",
      "元記事画像コピー",
      "文字詰め込み",
      "毎回同じ構図",
      "煽りすぎる表現",
      "細かすぎるスペック表現",
    ],
    referenceAssets,
    referenceAssetsMissing: referenceAssets.length === 0,
  };
}
