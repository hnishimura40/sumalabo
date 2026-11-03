// Apple is the ranking source. Store rank observations, never infer a continuous
// #1 streak, downloads, or model performance from one chart snapshot.
export function parseAppChart(data, source, config, now = Date.now(), previous = null) {
  const feed = data?.feed;
  const url = new URL(source.url);
  if (source.type !== "app-store-chart" || url.hostname !== "rss.marketingtools.apple.com" ||
      !url.pathname.endsWith(`/${source.country}/apps/top-free/100/apps.json`)) throw new Error("invalid_chart_source");
  if (feed?.country?.toLowerCase() !== source.country || !Array.isArray(feed.results) || !feed.results.length) throw new Error("invalid_chart_feed");
  const updated = Date.parse(feed.updated);
  if (!Number.isFinite(updated) || now - updated > 48 * 3600_000 || updated - now > 2 * 3600_000) throw new Error("stale_or_future_chart");
  const policy = config.aiTrendWatch;
  const normalize = (s) => String(s || "").normalize("NFKC").toLowerCase();
  const previousTime = Date.parse(previous?.observedAt);
  const comparable = Number.isFinite(previousTime) && now >= previousTime && now - previousTime <= 48 * 3600_000;
  const previousRows = comparable ? previous.rows || [] : [];
  const rows = feed.results.slice(0, 100).map((row, index) => ({ id: row.id, rank: index + 1, name: row.name, artistName: row.artistName, url: row.url }));
  const items = [];
  for (const row of rows) {
    if (!/^\d+$/.test(row.id || "") || !row.name || !row.artistName) continue;
    const appUrl = new URL(row.url);
    if (appUrl.hostname !== "apps.apple.com" || !appUrl.pathname.includes(`/${source.country}/`) || !appUrl.pathname.endsWith(`/id${row.id}`)) continue;
    const name = normalize(row.name);
    const ai = /(^|[^a-z0-9])ai($|[^a-z0-9])/.test(name) || (policy.appNames || []).some(word => name.includes(normalize(word)));
    if (!ai) continue;
    const before = previousRows.find(old => old.id === row.id)?.rank;
    const rise = Number.isInteger(before) ? before - row.rank : null;
    if (row.rank > policy.topRank && !(rise >= policy.minRise && row.rank <= policy.risingRankLimit)) continue;
    const appChart = {
      provider: "Apple", country: source.country, chart: "top-free", scope: "all-apps",
      appId: row.id, name: row.name, artistName: row.artistName, rank: row.rank,
      previousRank: before ?? null, previousObservedAt: comparable ? previous.observedAt : null, rise, observedAt: new Date(now).toISOString(),
      feedUpdatedAt: new Date(updated).toISOString(), feedUrl: source.url,
    };
    items.push({
      title: `${row.name}、${source.countryLabel}のApp Store無料総合${row.rank}位。何ができるAI？`,
      description: `${row.artistName}提供。Apple公式ランキングを確認。人気の指標とAIの性能指標は区別し、機能・料金・利用条件を調べる。`,
      link: row.url,
      // No manufactured publication date: this is a current rank observation.
      observedAt: appChart.observedAt, freshnessBasis: "chart_observation", appChart,
    });
  }
  return { items, snapshot: { observedAt: new Date(now).toISOString(), feedUpdatedAt: new Date(updated).toISOString(), rows } };
}

export async function fetchAppChart(source, config, now, previous) {
  try {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return { source: source.id, ok: true, ...parseAppChart(await response.json(), source, config, now, previous) };
  } catch (error) {
    return { source: source.id, ok: false, reason: error.message, items: [] };
  }
}
