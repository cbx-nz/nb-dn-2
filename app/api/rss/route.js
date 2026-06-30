import { getLatestReport } from '../../../lib/report-store.js';

export const runtime = 'nodejs';

export async function GET() {
  const report = await getLatestReport();

  if (!report) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>No Bloat Daily News</title><description>No report available yet.</description></channel></rss>', {
      headers: { 'content-type': 'application/xml; charset=utf-8' }
    });
  }

  const items = (report.news || []).slice(0, 12).map((item) => `
    <item>
      <title>${item.title}</title>
      <link>${item.url}</link>
      <guid>${item.url}</guid>
      <pubDate>${new Date(report.generatedAt).toUTCString()}</pubDate>
      <description>${item.summary || ''}</description>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Bloat Daily News</title>
    <link>${process.env.SITE_URL || 'http://localhost:3000'}</link>
    <description>Minimal daily news, disasters, and stock updates.</description>
    <lastBuildDate>${new Date(report.generatedAt).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' }
  });
}