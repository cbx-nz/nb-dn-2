const DEFAULT_TIMEOUT_MS = 8000;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'user-agent': 'no-bloat-daily-news',
        ...(init.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeByKey(items, keyFn) {
  return [...new Map(items.map((item) => [keyFn(item), item])).values()];
}

async function getGnewsItems() {
  const token = process.env.GNEWS_API_KEY;
  if (!token) return [];

  try {
    const data = await fetchJson(`https://gnews.io/api/v4/top-headlines?lang=en&country=us&max=5&token=${token}`);
    return (data.articles || []).map((article) => ({
      source: 'gnews',
      title: article.title,
      url: article.url,
      summary: article.description || ''
    }));
  } catch {
    return [];
  }
}

async function getCurrentsItems() {
  const token = process.env.CURRENTSNEWS_API_KEY;
  if (!token) return [];

  try {
    const data = await fetchJson(`https://api.currentsapi.services/v1/latest-news?apiKey=${token}&language=en`);
    return (data.news || []).map((article) => ({
      source: 'currents',
      title: article.title,
      url: article.url,
      summary: article.description || ''
    }));
  } catch {
    return [];
  }
}

async function getNewsItems() {
  const items = await Promise.all([getGnewsItems(), getCurrentsItems()]);
  return dedupeByKey(items.flat().filter((item) => item.title && item.url), (item) => item.url);
}

async function getDisasterItems() {
  const items = [];

  try {
    const earthquakes = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    for (const feature of earthquakes.features || []) {
      items.push({
        source: 'usgs',
        title: `M${feature.properties.mag} earthquake near ${feature.properties.place}`,
        url: feature.properties.url,
        summary: feature.properties.title
      });
    }
  } catch {
    items.push({
      source: 'usgs',
      title: 'Earthquake feed unavailable',
      url: 'https://earthquake.usgs.gov/',
      summary: 'USGS data could not be loaded.'
    });
  }

  try {
    const alerts = await fetchJson('https://api.weather.gov/alerts/active');
    for (const feature of (alerts.features || []).slice(0, 5)) {
      items.push({
        source: 'nws',
        title: feature.properties.headline || feature.properties.event || 'Active weather alert',
        url: feature.id,
        summary: feature.properties.description || ''
      });
    }
  } catch {
    items.push({
      source: 'nws',
      title: 'Weather alert feed unavailable',
      url: 'https://api.weather.gov/alerts/active',
      summary: 'NWS alerts could not be loaded.'
    });
  }

  return dedupeByKey(items.filter((item) => item.title && item.url), (item) => item.title);
}

async function getStockItems() {
  const token = process.env.ALPHAVANTAGE_API_KEY;
  const symbols = [
    { symbol: 'AAPL', label: 'Apple' },
    { symbol: 'MSFT', label: 'Microsoft' },
    { symbol: 'TSLA', label: 'Tesla' }
  ];

  if (!token) {
    return symbols.map((item) => ({
      ...item,
      change: null,
      close: null,
      note: 'Alpha Vantage key missing'
    }));
  }

  const items = [];

  for (const item of symbols) {
    try {
      const data = await fetchJson(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${item.symbol}&apikey=${token}`, {
        timeoutMs: 10000
      });
      const series = data['Time Series (Daily)'] || {};
      const dates = Object.keys(series);
      if (dates.length < 2) {
        throw new Error('Missing daily series');
      }

      const latest = series[dates[0]];
      const previous = series[dates[1]];
      const latestClose = Number(latest['4. close']);
      const previousClose = Number(previous['4. close']);
      const change = previousClose ? (((latestClose - previousClose) / previousClose) * 100).toFixed(2) : '0.00';

      items.push({
        ...item,
        date: dates[0],
        open: latest['1. open'],
        close: latest['4. close'],
        change,
        note: 'Alpha Vantage daily time series'
      });
    } catch {
      items.push({
        ...item,
        change: null,
        close: null,
        note: 'Unavailable'
      });
    }
  }

  return items;
}

function buildRssXml(report) {
  const items = report.news.slice(0, 12).map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid>${escapeXml(item.url)}</guid>
      <pubDate>${new Date(report.generatedAt).toUTCString()}</pubDate>
      <description>${escapeXml(item.summary || '')}</description>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Bloat Daily News</title>
    <link>${escapeXml(report.siteUrl)}</link>
    <description>Minimal daily news, disasters, and stock updates.</description>
    <lastBuildDate>${new Date(report.generatedAt).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

function buildArticleHtml(title, items) {
  if (!items.length) {
    return '<p>No items available.</p>';
  }

  return items.map((item) => `<p><strong>${escapeHtml(item.title)}</strong><br><a href="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a>${item.summary ? `<br>${escapeHtml(item.summary)}` : ''}</p>`).join('');
}

function buildReportHtml(report) {
  const newsHtml = buildArticleHtml('News', report.news);
  const disasterHtml = buildArticleHtml('Disasters', report.disasters);
  const stockHtml = report.stocks.map((item) => `<p><strong>${escapeHtml(item.label)} (${escapeHtml(item.symbol)})</strong><br>${item.date ? `Date: ${escapeHtml(item.date)}<br>` : ''}${item.close ? `Close: ${escapeHtml(item.close)}<br>` : ''}${item.change !== null ? `Change: ${escapeHtml(item.change)}%<br>` : ''}${escapeHtml(item.note || '')}</p>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>No Bloat Daily News - ${escapeHtml(report.date)}</title>
</head>
<body>
  <h1>No Bloat Daily News - ${escapeHtml(report.date)}</h1>
  <p>Generated at ${escapeHtml(new Date(report.generatedAt).toUTCString())}</p>
  <h2>Summary</h2>
  <p>${escapeHtml(report.summary)}</p>
  <h2>News</h2>
  ${newsHtml}
  <h2>Disasters</h2>
  ${disasterHtml}
  <h2>Stocks</h2>
  ${stockHtml}
</body>
</html>`;
}

export async function buildReport() {
  const [news, disasters, stocks] = await Promise.all([
    getNewsItems(),
    getDisasterItems(),
    getStockItems()
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();
  const report = {
    date,
    generatedAt,
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    summary: 'A compact daily briefing with news, disasters, and stock movement.',
    news,
    disasters,
    stocks
  };

  return {
    report,
    html: buildReportHtml(report),
    rss: buildRssXml(report)
  };
}

export { escapeHtml, escapeXml };