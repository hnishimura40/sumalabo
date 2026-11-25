// Broad news discovery precedes AI angle selection. Coverage and front-page
// placement are attention proxies, not search volume, shares or proof of AI use.
function host(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

function isGeneralListing(source) {
  try {
    const url = new URL(source.url);
    return source.role === "general-news" && url.hostname === "news.google.com" &&
      !url.searchParams.has("q") && (url.pathname === "/rss" || /^\/rss\/headlines\/section\/topic\/[A-Z]+$/.test(url.pathname));
  } catch { return false; }
}

export function annotateNewsAngles(results, config, now, tokenize) {
  const watch = config.newsAngleWatch;
  if (!watch?.enabled) return results;
  const fresh = item => {
    const hours = (now - Date.parse(item.pubDate)) / 3600000;
    return Number.isFinite(hours) && hours >= 0 && hours <= (config.maxAgeHours || 48);
  };
  const rows = results.flatMap(result => {
    const source = config.sources.find(s => s.id === result.source) || {};
    if (!result.ok || source.type === "app-store-chart") return [];
    return result.items.filter(fresh).map(item => {
      const position = result.items.indexOf(item) + 1;
      let publisher = host(item.publisher?.url);
      // A Google News proxy hostname is never an independent publisher.
      if (!publisher && host(source.url) !== "news.google.com") publisher = host(source.url);
      if (publisher === "news.google.com") publisher = null;
      return { item, source, position, publisher, tokens: tokenize(item.title),
        listing: isGeneralListing(source) && position <= watch.topListingLimit };
    });
  });
  const related = (a,b) => {
    if (a.item.title === b.item.title) return true;
    let intersection = 0;
    for (const token of a.tokens) if (b.tokens.has(token)) intersection++;
    const union = a.tokens.size + b.tokens.size - intersection;
    return intersection >= 4 && union > 0 && intersection / union >= watch.similarityThreshold;
  };
  const evidence = row => ({ source:row.source.id, scope:row.source.name, feedUrl:row.source.url, position:row.position,
    title:row.item.title, link:row.item.link, pubDate:row.item.pubDate, publisher:row.publisher });
  for (const row of rows) {
    const relatedRows = rows.filter(other => related(row,other));
    const publishers = [...new Set(relatedRows.map(r=>r.publisher).filter(Boolean))];
    const listings = relatedRows.filter(r=>r.listing);
    const verified = listings.length > 0 || publishers.length >= watch.minPublisherCount;
    const title = row.item.title.normalize("NFKC").toLowerCase();
    const text = `${title} ${row.item.description || ""}`.replace(/<[^>]*>/g," ").normalize("NFKC").toLowerCase();
    const hit = (word, target) => {
      const term = word.normalize("NFKC").toLowerCase();
      return /^[a-z]+$/.test(term) ? new RegExp(`(^|[^a-z0-9])${term}($|[^a-z0-9])`,"u").test(target) : target.includes(term);
    };
    const angles = [];
    if (verified) {
      for (const rule of watch.angleRules) {
        const target = rule.directAi ? title : text;
        const matched = rule.groups.map(group => group.filter(word => hit(word, target)));
        if (matched.every(group => group.length > 0)) {
          angles.push({ id: rule.id, question: rule.question, matched, ...(rule.directAi ? { directAi: true } : {}) });
        }
      }
    }
    row.item.newsTrend = { verified, basis:listings.length ? "major_news_listing" : verified ? "multiple_publishers" : "insufficient_evidence",
      observedAt:new Date(now).toISOString(), publisherCount:publishers.length,
      // Keep distinct coverage evidence, including more than one publisher.
      coverage:[...new Map(relatedRows.filter(r=>r.publisher).map(r=>[r.publisher,evidence(r)])).values()].slice(0,watch.maxEvidence),
      listings:listings.slice(0,watch.maxEvidence).map(evidence), aiAngles:angles };
  }
  return results;
}
