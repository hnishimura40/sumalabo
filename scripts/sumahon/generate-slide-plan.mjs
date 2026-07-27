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

const PERFORMANCE_RECIPES = [
  {
    priority: 10,
    pattern: /充電|チャージ|charger|battery|バッテリー|電源/i,
    rationale: "充電・電源を扱う記事なので、手元のケーブルと機器で『実際に扱っている瞬間』を見せる",
    thumbnail: {
      wardrobe: "ティール差し色の軽い作業ベストまたは機器点検用ジャケット",
      props: ["USB-Cケーブル", "充電器またはバッテリー", "確認カード"],
      pose: "ひまりがケーブルと機器を手に持って接続先を確かめ、らぼまるが確認カードを示す",
      background: "明るいガジェット作業机。対象機器が一目で分かる",
    },
  },
  {
    priority: 20,
    pattern: /比較|選び方|どっち|vs|ランキング/i,
    rationale: "比較・選択の記事なので、2つ以上を身体の向きと視線で見比べる体験を主役にする",
    thumbnail: {
      wardrobe: "比較作業に合うスマートなジャケットまたは軽いスタッフベスト",
      props: ["比較対象2点", "小さな比較カード"],
      pose: "ひまりが左右の2つを手に取って見比べ、らぼまるが違いを指し示す",
      background: "左右対等の比較カウンター。勝敗や優劣の煽りは入れない",
    },
  },
  {
    priority: 30,
    pattern: /検証|試す|レビュー|実測|リコール|確認|点検|安全/i,
    rationale: "検証・確認の記事なので、調べる手元と道具を見せて体験性を出す",
    thumbnail: {
      wardrobe: "作業着または点検用ベスト。必要に応じて探偵・検査員風の軽い意匠",
      props: ["虫眼鏡", "チェックリスト", "対象物"],
      pose: "ひまりが対象物を虫眼鏡で確認し、らぼまるがチェック項目を案内する",
      background: "明るい検品・作業スペース。炎や過剰な危険演出は使わない",
    },
  },
  {
    pattern: /AI|モデル|研究|性能|Codex|ChatGPT|Claude|Gemini/i,
    rationale: "AI・技術解説なので、研究・制作の現場で手を動かす姿を見せる",
    thumbnail: {
      wardrobe: "白衣を固定化せず、テーマに応じた研究ジャケット・工具ポーチ・制作スタッフ風の装い",
      props: ["テーマを象徴する端末または道具", "グラフ・工程カード"],
      pose: "ひまりが端末や道具を実際に操作し、らぼまるが工程または判断軸を補足する",
      background: "記事テーマ固有の研究室・工房・作業机。汎用的な青い研究室だけにしない",
    },
  },
  {
    pattern: /料金|値上げ|価格|プラン|サブスク|買い時/i,
    rationale: "価格・料金の記事なので、数字を見るだけでなく支払い判断の場面を演じる",
    thumbnail: {
      wardrobe: "ビジネスカジュアルまたは買い物・相談カウンターに合う装い",
      props: ["電卓", "価格札", "財布または料金表"],
      pose: "ひまりが価格札と選択肢を見比べ、らぼまるが計算結果または注意点を示す",
      background: "売り場または相談カウンター。過剰な札束・煽り表現は使わない",
    },
  },
];

export function deriveExpression({ theme = "本記事" } = {}) {
  if (/セキュリティ|脆弱性|リコール|値上げ|トラブル|障害|不具合|プライバシー|追跡|注意|終了|漏えい/i.test(theme)) {
    return { tone: "caution", direction: "真剣・心配・調べ顔。笑顔を既定にしない" };
  }
  if (/新機能|提供開始|無料|値下げ|改善|解決|復活|延長|お得|登場|更新/i.test(theme)) {
    return { tone: "positive", direction: "明るい笑顔。記事の利点が伝わる前向きな表情" };
  }
  return { tone: "neutral", direction: "穏やかな標準表情。比較では見比べる集中顔も使う" };
}

export function derivePerformanceBlock({ theme = "本記事", variant = "news" } = {}) {
  // 複数意図が重なる場合は、記事固有の動作を描けるレシピを優先する。
  // 例: 「バッテリーのリコール検証」は製品一般より検証の演技を採る。
  const recipe = PERFORMANCE_RECIPES
    .filter((candidate) => candidate.pattern.test(theme))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || {
    rationale: `記事テーマ「${theme}」の中心名詞を、持ち物・動き・場所の3点で体験図に変換する`,
    thumbnail: {
      wardrobe: "記事テーマの現場に合う上着・ベスト・アクセサリーを最低1点。標準衣装だけにしない",
      props: [`「${theme}」を象徴する小道具`, "判断または作業に使う道具"],
      handUse: "まず手で持たせない演出を選ぶ。持たせる必要がある場合だけ片手持ち／両手持ちを固定し、空いている手は体側。手のクローズアップを避け、手は小さめで画面の主役にしない。同じ人物の両手に別々の動作を同時指定しない。小道具は自然に届く距離へ置き、腕を伸長させない",
      pose: "ひまりが覗き込む・見上げる・振り返る等の姿勢と視線で小道具を使い、らぼまるが別の位置から整理・補助する",
      background: "記事テーマが伝わる具体的な現場。奥行き・照明・環境小物まで作り込み、汎用スタジオ背景にしない",
    },
  };
  const expression = deriveExpression({ theme });
  return {
    rationale: recipe.rationale,
    identityRule: "顔・体型・髪型・耳ビレ・首輪・アンテナ・ハートは正本厳守。衣装・小道具・ポーズ・背景は演出として変えてよい",
    thumbnail: {
      ...recipe.thumbnail,
      props: [...recipe.thumbnail.props],
      handUse: `${recipe.thumbnail.handUse || "手で持たせない演出を優先し、持たせる場合だけ片手持ち／両手持ちを固定する。空いている手は体側に置く。小道具は自然に届く距離へ置き、腕を伸長させない"}。手のクローズアップを避け、手は小さめで画面の主役にしない。同じ人物の両手に別々の動作を同時指定しない。安全指定を理由に標準衣装・棒立ちへ退避しない`,
      handsFreeAlternatives: [
        "テーマ別衣装",
        "傍ら・机上の小道具",
        "首かけ・肩掛け・バッジ・ヘッドセット",
        "覗き込む・見上げる・振り返る姿勢と視線",
        "奥行き・照明・環境小物を含む背景の作り込み",
      ],
      expression: recipe.thumbnail.expression || expression.direction,
    },
    slides: {
      wardrobe: expression.tone === "neutral"
        ? "中立解説系のため標準衣装も可。ただし標準にする理由を演出ブロックへ明記する"
        : "記事テーマから導いた衣装で一貫する。標準衣装へ退避しない",
      props: ["各スライドのpurposeに意味のある道具"],
      handUse: "各小道具について片手持ち／両手持ちを明記し、空いている手は原則体側に置く。手のクローズアップを避け、手は小さめで画面の主役にしない。同じ人物の両手に別々の動作を同時指定しない。小道具は自然に届く距離へ置き、腕を伸長させない",
      handsFreeAlternatives: ["身につける小道具", "机上配置", "姿勢と視線", "背景の作り込み"],
      expression: expression.direction,
      pose: "比較・確認・操作など、各スライドのcharacterRoleを身体の動きで表す",
      background: "情報を邪魔しない範囲でテーマ固有の場所・机・工程を反映する",
      optional: variant !== "comparison",
    },
  };
}

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

  const theme = understanding.articleTheme || "本記事";
  const variant = understanding.articleVariant || "news";
  const performance = derivePerformanceBlock({ theme, variant });

  // 1. slideNeeded=false (短い速報) は 0 枚で返す
  if (understanding.slideNeeded === false) {
    return {
      count: 0,
      reason: "slideNeeded=false (短い速報・軽いニュース判定)。スライド無し運用。",
      slides: [],
      performance,
    };
  }

  // 2. understanding.slidePlan が既に存在すれば、それを土台にして bodySummary で
  //    必要なら微調整する。なければ variant / tone から組み立てる。
  const tone = understanding._meta?.tone || "neutral";
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
    performance,
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
  if (!slidePlan.performance?.thumbnail) {
    return { verdict: "blocking", reason: "performance_block_missing" };
  }
  for (const key of ["wardrobe", "props", "pose", "background"]) {
    const value = slidePlan.performance.thumbnail[key];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return { verdict: "blocking", reason: `performance_thumbnail_${key}_missing` };
    }
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
