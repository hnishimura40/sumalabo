// generate-slide-plan.mjs
//
// articleUnderstanding (+ 任意で本文要約) を入力に、最終 slidePlan を返す
// 決定論的ジェネレータ。Phase B 完了後の slide_plan_finalize 段階で呼ばれる。
//
// 設計方針:
// - 枚数は記事内容で動的に決まる。固定枚数禁止 (5 枚固定 / 7 枚固定など禁止)。
// - 原則目安: 2〜8 枚。短い速報・軽いニュースは 0〜2 枚も許容。
// - 3 枚未満を即 fail にしない (slideCountReasonable は warning から開始)。
// - 異常値 (10 枚超) は PR-B の hard gate 側で blocking 扱いする。ここでは
//   生成しない (上限 8 で trim する)。
// - 各 slide には purpose / format / title / mustInclude / characterRole / props /
//   factCaveats を持たせ、ひまり・らぼまるが置物化しないように characterRole
//   は必ず非空にする。
//
// 入力:
//   understanding: articleUnderstanding (slideNeeded / slidePlan を含む)
//   bodySummary?:  本文要約 (任意。Phase B 後に渡すと精度が上がる)
//   articleVariant override 等は understanding 側で吸収済み。
//
// 出力:
//   {
//     count: number,
//     reason: string,
//     slides: Array<{
//       id, purpose, format, title, mustInclude[], characterRole{himari, labomaru},
//       props[], factCaveats[]
//     }>
//   }
//
// 重要:
// - 「普通の人」表現は出力に含めない (公開コピーに漏れるため)。
// - mustInclude は短く保つ (1 要素 ≤ 60 字目安、合計 ≤ 4 行)。

/** @type {Record<string, { title: string; format: string; mustIncludeBuilder: (ctx: any) => string[]; characterRole: { himari: string; labomaru: string }; props: string[] }>} */
const PURPOSE_RECIPES = {
  overview: {
    title: "これは何の話？",
    format: "card-3col",
    mustIncludeBuilder: (ctx) => [
      `${ctx.theme} の全体像を 3 点で整理`,
      "報道・噂段階か、公式情報かを明示",
      "関連カテゴリ (iPhone / Android / AI / 周辺機器 等) を示す",
    ],
    characterRole: {
      himari: "驚き／興味の表情。胸元 or 手元のアイテムを指して『これ何？』",
      labomaru: "整理係。3 点の箇条書きを指し棒で示す",
    },
    props: ["吹き出し", "メモカード", "対象アイテム風アイコン"],
  },
  "pros-cons": {
    title: "期待できること / 注意したいこと",
    format: "card-3col",
    mustIncludeBuilder: (ctx) => [
      "期待できる点 (買う前に魅力に感じる側)",
      "注意したい点 (未確定 / 価格 / プライバシー など)",
      `現時点の見方 (${ctx.buyWaitOrWatch || "買う / 待つ / 様子見"})`,
    ],
    characterRole: {
      himari: "期待側で笑顔。便利そうな道具を手に取って見る",
      labomaru: "注意カードを掲げる。バランス役",
    },
    props: ["比較ボード", "注意カード", "笑顔の吹き出し"],
  },
  "decision-guide": {
    title: "今どう考える？ 判断ガイド",
    format: "decision-3way",
    mustIncludeBuilder: (ctx) => [
      "今動く / 様子見 / 比較してから の 3 分岐",
      "各分岐に該当する人物像を 1 行で",
      `判断軸 (${ctx.buyWaitOrWatch || "価格 / 対応機種 / 日本語対応"})`,
    ],
    characterRole: {
      himari: "迷い顔。3 つの選択肢を見比べる",
      labomaru: "フローチャート板を持ち、矢印で誘導する",
    },
    props: ["フローチャート板", "選択肢カード×3", "矢印"],
  },
  comparison: {
    title: "他の選択肢との違いを比較",
    format: "table-4col",
    mustIncludeBuilder: () => [
      "比較対象 4 件 (例: 主役 / 競合 A / 競合 B / 既存代替)",
      "比較軸 4 件 (使い方 / 強み / 気になる点 / 向いている人)",
      "差別化ポイントを 1 行で言語化",
    ],
    characterRole: {
      himari: "比較ボードの片側で『どっちが合うかな？』",
      labomaru: "もう片側で軸を整理する",
    },
    props: ["比較ボード", "虫眼鏡", "アイコン列"],
  },
  checkpoints: {
    title: "続報で確認したいチェックポイント",
    format: "card-list",
    mustIncludeBuilder: () => [
      "確認項目 5〜6 個 (発売時期 / 価格 / 対応機種 / 日本語対応 / バッテリー / プライバシー など)",
      "各項目に短い解説を添える",
      "結論: 確定情報が出るまで情報収集と比較がベスト",
    ],
    characterRole: {
      himari: "チェックリストを覗き込む。『これも見ておこう』",
      labomaru: "虫眼鏡を持ち、各項目を点検する",
    },
    props: ["チェックリスト", "虫眼鏡", "番号付きカード"],
  },
  flow: {
    title: "仕組み・流れを 1 枚で",
    format: "flow-3step",
    mustIncludeBuilder: () => [
      "入口 → 中継 → 出口 (or 入力 → 処理 → 出力) の 3 ステップ",
      "各ステップが何を担当しているかを 1 行で",
      "全体として何が変わるかを最後に 1 文",
    ],
    characterRole: {
      himari: "ステップ間を指でなぞる。『ここからここに行くのか』",
      labomaru: "フロー板に矢印を書き込む",
    },
    props: ["フロー板", "矢印", "ステップカード×3"],
  },
  structure: {
    title: "基本構造を整理",
    format: "structure-diagram",
    mustIncludeBuilder: () => [
      "用語 / 構成要素を 4〜6 個",
      "各要素が何を意味するかを 1 行で",
      "読者にとって何が大事かを結論で",
    ],
    characterRole: {
      himari: "用語カードを並び替えながら理解する役",
      labomaru: "全体図を指し棒で示す",
    },
    props: ["用語カード", "指し棒", "全体図枠"],
  },
};

/**
 * understanding + 任意の bodySummary を元に最終 slidePlan を生成する。
 *
 * @param {object} args
 * @param {object} args.understanding         articleUnderstanding (slideNeeded / slidePlan 等を含む)
 * @param {string} [args.bodySummary]         本文要約 (任意)
 * @param {number} [args.maxSlides]           上限枚数 (default 8)
 * @returns {{
 *   count: number,
 *   reason: string,
 *   slides: Array<{
 *     id: string,
 *     purpose: string,
 *     format: string,
 *     title: string,
 *     mustInclude: string[],
 *     characterRole: { himari: string, labomaru: string },
 *     props: string[],
 *     factCaveats: string[]
 *   }>
 * }}
 */
export function generateSlidePlan({ understanding, bodySummary, maxSlides = 8 } = {}) {
  if (!understanding) {
    throw new Error("generateSlidePlan: understanding is required");
  }

  // 1. slideNeeded=false (短い速報) は 0 枚で返す
  if (understanding.slideNeeded === false) {
    return {
      count: 0,
      reason: "slideNeeded=false (短い速報・軽いニュース判定)。スライド無し運用。",
      slides: [],
    };
  }

  // 2. understanding.slidePlan が既に存在すれば、それを土台にして bodySummary で
  //    必要なら微調整する。なければ variant / tone から組み立てる。
  const variant = understanding.articleVariant || "news";
  const tone = understanding._meta?.tone || "neutral";
  const theme = understanding.articleTheme || "本記事";
  const hasComplexTopic = !!understanding._meta?.hasComplexTopic;

  let purposes = [];

  // 既存 slidePlan があれば purpose 列を引き継ぐ
  if (
    understanding.slidePlan &&
    Array.isArray(understanding.slidePlan.slides) &&
    understanding.slidePlan.slides.length > 0
  ) {
    purposes = understanding.slidePlan.slides
      .map((s) => s.purpose)
      .filter((p) => PURPOSE_RECIPES[p]);
  }

  // 既存が無ければ variant / tone から組み立てる
  if (purposes.length === 0) {
    purposes.push("overview");
    if (variant === "news") {
      purposes.push("pros-cons");
      purposes.push("decision-guide");
      if (tone === "rumor") purposes.push("comparison");
      purposes.push("checkpoints");
    } else if (variant === "comparison") {
      purposes.push("comparison");
      purposes.push("comparison");
      purposes.push("decision-guide");
      purposes.push("checkpoints");
    } else {
      // foundation
      purposes.push("structure");
      purposes.push("decision-guide");
    }
    if (hasComplexTopic && !purposes.includes("flow") && !purposes.includes("structure")) {
      purposes.push("flow");
    }
  }

  // 3. bodySummary に "比較" / "判断" / "確認" 等が多く含まれる場合の微調整。
  //    ここではシンプルに、bodySummary 長から枚数加減のヒントだけ取る。
  if (typeof bodySummary === "string" && bodySummary.length > 0) {
    // 長文要約 (>4000 chars) ならボリュームを増やすため checkpoints / comparison
    // が無ければ追加。短文要約なら decision-guide だけに絞る。
    if (bodySummary.length > 4000) {
      if (!purposes.includes("checkpoints")) purposes.push("checkpoints");
    } else if (bodySummary.length < 1500) {
      // 短い記事は overview + decision-guide の 2 枚に絞る
      purposes = purposes.filter((p) => p === "overview" || p === "decision-guide");
      if (purposes.length === 0) purposes = ["overview", "decision-guide"];
    }
  }

  // 4. 上限 trim
  const trimmedCount = Math.min(purposes.length, maxSlides);
  const finalPurposes = purposes.slice(0, trimmedCount);

  // 5. slide entries
  const ctx = {
    theme,
    tone,
    buyWaitOrWatch: understanding.buyWaitOrWatch,
  };
  const slides = finalPurposes.map((purpose, i) => {
    const recipe = PURPOSE_RECIPES[purpose] || PURPOSE_RECIPES.overview;
    const id = `fig${String(i + 1).padStart(2, "0")}-${purpose}`;
    const factCaveats = [];
    if (tone === "rumor" && (purpose === "overview" || purpose === "pros-cons")) {
      factCaveats.push("公式発表ではない", "報道・噂段階");
    }
    return {
      id,
      purpose,
      format: recipe.format,
      title: recipe.title,
      mustInclude: recipe.mustIncludeBuilder(ctx),
      characterRole: { ...recipe.characterRole },
      props: [...recipe.props],
      factCaveats,
    };
  });

  // 6. reason 文字列
  const reasonParts = [];
  reasonParts.push(`variant=${variant}, tone=${tone}`);
  if (hasComplexTopic) reasonParts.push("複雑トピック判定あり");
  if (bodySummary)
    reasonParts.push(`bodySummary長 ${bodySummary.length} 字を反映`);
  reasonParts.push(`論点 ${slides.length} 個を ${slides.length} 枚に展開`);
  if (purposes.length > trimmedCount) {
    reasonParts.push(`上限 ${maxSlides} 枚に trim (${purposes.length}→${trimmedCount})`);
  }

  return {
    count: slides.length,
    reason: reasonParts.join(" / "),
    slides,
  };
}

/**
 * slidePlan の構造的バリデーション (PR-B の hard gate で呼ぶ想定の補助関数)。
 * blocking / warning / ok の 3 状態を返す。
 */
export function validateSlidePlan(slidePlan, { maxBlockingCount = 10 } = {}) {
  if (!slidePlan || typeof slidePlan !== "object") {
    return { verdict: "blocking", reason: "slidePlan_missing" };
  }
  if (!Array.isArray(slidePlan.slides)) {
    return { verdict: "blocking", reason: "slides_not_array" };
  }
  const count = slidePlan.slides.length;
  // 異常値: 上限を大きく超える
  if (count >= maxBlockingCount) {
    return {
      verdict: "blocking",
      reason: `slide_count_too_high (${count} >= ${maxBlockingCount})`,
    };
  }
  // 0 枚は許容 (短い速報)
  if (count === 0) {
    return { verdict: "ok", reason: "no_slides_intentional", count };
  }
  // 警告ライン: 2 未満 or 8 超
  if (count < 2 || count > 8) {
    return {
      verdict: "warning",
      reason: `slide_count_unusual (${count})`,
      count,
    };
  }
  // 各 slide の characterRole が両方非空 (置物化禁止)
  for (let i = 0; i < slidePlan.slides.length; i++) {
    const s = slidePlan.slides[i];
    if (!s.characterRole || !s.characterRole.himari || !s.characterRole.labomaru) {
      return {
        verdict: "blocking",
        reason: `slide_${i}_character_role_missing`,
        count,
      };
    }
    // 「置物」「立っているだけ」「無表情」「待機」を含むのは blocking
    const combined = `${s.characterRole.himari} ${s.characterRole.labomaru}`;
    if (/置物|立っているだけ|無表情|待機/.test(combined)) {
      return {
        verdict: "blocking",
        reason: `slide_${i}_character_static`,
        count,
      };
    }
  }
  return { verdict: "ok", count };
}
