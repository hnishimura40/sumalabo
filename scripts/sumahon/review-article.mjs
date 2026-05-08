function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function makeFinding(review, severity, message) {
  return { review, severity, message };
}

export function reviewArticle({ mdx, source, generated }) {
  const findings = [];
  const hasSummary = mdx.includes("先に結論");
  const hasReaderSection = mdx.includes("普通の人にどう関係するのか");
  const hasUnknowns = mdx.includes("まだ分からないこと");
  const hasGuide = mdx.includes("<CharacterGuideCard");
  const hasSourceCopyRisk = source.keyPoints.some((point) => point.length > 45 && mdx.includes(point));
  const riskyWords = ["絶対", "必ず買うべき", "完全に", "間違いなく", "確実に"];
  const needsOfficialCheck = includesAny(source.sourceTitle, ["噂", "リーク", "予測", "見通し", "報道", "価格", "発売", "対応"]);

  if (!hasSummary) {
    findings.push(makeFinding("editor", "major", "先に結論の整理が不足しています。"));
  }

  if (!hasReaderSection) {
    findings.push(makeFinding("reader", "major", "普通の人への関係を説明するセクションが不足しています。"));
  }

  if (!hasUnknowns) {
    findings.push(makeFinding("factcheck", "major", "未確定情報や確認点を分けるセクションが不足しています。"));
  }

  if (includesAny(mdx, riskyWords)) {
    findings.push(makeFinding("factcheck", "major", "断定・煽りに見える表現があります。"));
  }

  if (hasSourceCopyRisk) {
    findings.push(makeFinding("sourceRespect", "major", "元記事の要点文と同一の長い文が本文に含まれています。"));
  }

  if (!hasGuide) {
    findings.push(makeFinding("quality", "minor", "関連記事導線が不足しています。"));
  }

  if (needsOfficialCheck && !mdx.includes("公式情報")) {
    findings.push(makeFinding("factcheck", "minor", "公式情報確認を促す表現を追加した方が安全です。"));
  }

  if (!generated.thumbnailPrompt) {
    findings.push(makeFinding("quality", "minor", "サムネイル作成用プロンプトが不足しています。"));
  }

  if (!generated.xPostDraft) {
    findings.push(makeFinding("quality", "minor", "X投稿案が不足しています。"));
  }

  const hasBlockingRisk = findings.some((finding) => finding.severity === "major");

  return {
    checkedAt: new Date().toISOString(),
    sourceUrl: source.sourceUrl,
    articleTitle: generated.title,
    reviews: {
      editor: {
        ok: hasSummary && hasReaderSection,
        notes: "単なるニュース要約ではなく、読者への関係と未確定点を分けているかを確認。",
      },
      reader: {
        ok: hasSummary && mdx.includes("## 何が話題なのか"),
        notes: "見出しだけで流れが追えるかを確認。",
      },
      factcheck: {
        ok: !findings.some((finding) => finding.review === "factcheck" && finding.severity === "major"),
        notes: "公式発表、報道、噂、予測を混同していないかを確認。",
      },
      sourceRespect: {
        ok: !hasSourceCopyRisk,
        notes: "元記事の長文コピーや単純な言い換えになっていないかを確認。",
      },
      quality: {
        ok: Boolean(generated.description && generated.thumbnailPrompt && generated.xPostDraft),
        notes: "title、description、内部リンク、サムネイル案、X投稿案を確認。",
      },
    },
    findings,
    publishable: !hasBlockingRisk,
    provisionalDecision: hasBlockingRisk ? "要修正" : "preview確認後に公開可",
  };
}
