export function reviseArticle({ mdx, review }) {
  let revised = mdx;
  const changed = [];

  if (review.findings.some((finding) => finding.message.includes("公式情報確認"))) {
    revised = revised.replace(
      "ここを曖昧にしたまま「絶対便利」「すぐ買うべき」と決めつけると、判断を間違えやすくなります。",
      "ここを曖昧にしたまま「絶対便利」「すぐ買うべき」と決めつけると、判断を間違えやすくなります。購入や申し込みに関係する場合は、必ず公式情報や販売ページで最新状況を確認してください。",
    );
    changed.push("公式情報確認を促す注意文を追加");
  }

  if (review.findings.some((finding) => finding.message.includes("断定・煽り"))) {
    revised = revised
      .replace(/絶対/g, "かなり")
      .replace(/完全に/g, "大きく")
      .replace(/間違いなく/g, "可能性が高く")
      .replace(/確実に/g, "可能性があります");
    changed.push("断定表現を弱める調整");
  }

  return {
    mdx: revised,
    changed,
  };
}
