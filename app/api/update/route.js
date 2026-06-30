import { buildReport } from '../../../lib/news.js';
import { getLastUpdateTime, saveReport, setLastUpdateTime } from '../../../lib/report-store.js';

export const runtime = 'nodejs';

const COOLDOWN_SECONDS = 15 * 60;

export async function POST() {
  try {
    const now = Date.now();
    const lastUpdate = await getLastUpdateTime();
    const elapsedSeconds = Math.floor((now - lastUpdate) / 1000);

    if (lastUpdate && elapsedSeconds < COOLDOWN_SECONDS) {
      return Response.json(
        {
          error: 'Cooldown active. Please wait before checking again.',
          retryAfterSeconds: COOLDOWN_SECONDS - elapsedSeconds
        },
        { status: 429 }
      );
    }

    const payload = await buildReport();
    await saveReport(payload);
    await setLastUpdateTime(now);

    return Response.json({
      message: 'News refreshed and stored in Redis.',
      date: payload.report.date
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown update error.'
      },
      { status: 500 }
    );
  }
}