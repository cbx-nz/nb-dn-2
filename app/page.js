import RefreshButton from './components/refresh-button.js';
import { getLatestReport, getReportDates } from '../lib/report-store.js';
import { buildReport } from '../lib/news.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHomeData() {
  try {
    const latest = await getLatestReport();
    if (latest) {
      return latest;
    }

    const payload = await buildReport();
    return payload.report;
  } catch {
    return null;
  }
}

function renderItems(items) {
  if (!items || !items.length) return <p>No data available.</p>;

  return items.map((item) => (
    <p key={item.url || item.title}>
      <strong>{item.title}</strong><br />
      <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
      {item.summary ? <><br />{item.summary}</> : null}
    </p>
  ));
}

function renderCalendarDates(dates) {
  if (!dates.length) {
    return <tr><td>No archived reports yet.</td></tr>;
  }

  const cells = dates.map((date) => (
    <td key={date}><a href={`/report/${date}`}>{date}</a></td>
  ));

  const rows = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(<tr key={dates[index]}>{cells.slice(index, index + 7)}</tr>);
  }

  return rows;
}

export default async function HomePage() {
  const [report, reportDates] = await Promise.all([getHomeData(), getReportDates().catch(() => [])]);
  const latestUpdatedAt = report?.generatedAt || null;
  const topNews = report?.news || [];
  const earthquakes = (report?.disasters || []).filter((item) => item.source === 'usgs');
  const alerts = (report?.disasters || []).filter((item) => item.source !== 'usgs');

  return (
    <main>
      <h1>just basic daily info, no ads, minimal bloat.</h1>
      <p>
        <strong>Jump to:</strong>{' '}
        <a href="#summary">Summary</a> |{' '}
        <a href="#news">News</a> |{' '}
        <a href="#stock">Stock</a> |{' '}
        <a href="#calendar">Calendar</a> |{' '}
        <a href="#rss">RSS</a>
      </p>
      <RefreshButton lastUpdatedAt={latestUpdatedAt} />

      <hr />

      <h2 id="summary">Summary</h2>
      <pre>{report ? `📆 ${report.date}\n🌍 Major Earthquakes + Global news below.\n🛰️ Save pages offline. Avoid external links on mobile data.` : 'No report available yet.'}</pre>

      <h2 id="news">Today's News</h2>
      <h3 className="section-heading section-heading--earthquakes">Earthquakes</h3>
      <div className="news-list">{renderItems(earthquakes)}</div>

      <h3 className="section-heading section-heading--news">Top News</h3>
      <div className="news-list">{renderItems(topNews)}</div>

      <h3 className="section-heading section-heading--alerts">Disaster Alerts</h3>
      <div className="news-list">{renderItems(alerts)}</div>

      <h2 id="stock">Stock Update</h2>
      <div className="grid">
        {(report?.stocks || []).map((item) => (
          <div className="card" key={item.symbol}>
            <strong>{item.label} ({item.symbol})</strong>
            {item.market ? <div className="muted">{item.market}</div> : null}
            <div className="muted">{item.note}</div>
            {item.date ? <div>Date: {item.date}</div> : null}
            {item.close ? <div>Close: {item.close}</div> : null}
            {item.change !== null ? <div>Change: {item.change}%</div> : null}
          </div>
        ))}
      </div>

      <h2 id="calendar">Past Reports</h2>
      <table>
        <tbody>
          {renderCalendarDates(reportDates)}
        </tbody>
      </table>

      <hr />

      <h2 id="rss">RSS</h2>
      <p><a href="/api/rss">/api/rss</a></p>

      <h2>About</h2>
      <ul className="section-list">
        <li>Minimal daily news, disasters, and stock updates.</li>
        <li>Set REDIS_URL for Redis storage.</li>
        <li>Optional keys: GNEWS_API_KEY, CURRENTSNEWS_API_KEY, ALPHAVANTAGE_API_KEY.</li>
        <li>Optional: set STOCK_WATCHLIST as JSON to mix US and NZ tickers supported by your market data provider.</li>
        <li>Each archived report is served as a raw HTML page with no extra CSS.</li>
      </ul>
    </main>
  );
}