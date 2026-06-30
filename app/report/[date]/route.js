import { getReportByDate } from '../../../lib/report-store.js';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const { html, report } = await getReportByDate(params.date);

  if (!report) {
    return new Response('<!DOCTYPE html><html><body><h1>Report not found</h1></body></html>', {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  return new Response(html || '<!DOCTYPE html><html><body><h1>Report unavailable</h1></body></html>', {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}