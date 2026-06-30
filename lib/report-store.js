import { getRedis, keys } from './redis.js';

async function assertRedis() {
  const redis = await getRedis();
  if (!redis) {
    throw new Error('Redis is not configured. Set REDIS_URL.');
  }

  return redis;
}

export async function saveReport({ report, html, rss }) {
  const redis = await assertRedis();

  const date = report.date;
  await redis.set(keys.latest, JSON.stringify(report));
  await redis.set(keys.report(date), JSON.stringify(report));
  await redis.set(keys.html(date), html);
  await redis.set(keys.rss(date), rss);
  await redis.set(keys.latestRss, rss);
  await redis.zAdd(keys.reports, [{ score: new Date(report.generatedAt).getTime(), value: date }]);
}

export async function getLatestReport() {
  const redis = await assertRedis();

  const raw = await redis.get(keys.latest);
  return raw ? JSON.parse(raw) : null;
}

export async function getReportByDate(date) {
  const redis = await assertRedis();

  const [reportRaw, html, rss] = await Promise.all([
    redis.get(keys.report(date)),
    redis.get(keys.html(date)),
    redis.get(keys.rss(date))
  ]);

  return {
    report: reportRaw ? JSON.parse(reportRaw) : null,
    html: html || null,
    rss: rss || null
  };
}

export async function getReportDates() {
  const redis = await assertRedis();

  return await redis.zRange(keys.reports, 0, -1, { REV: true });
}

export async function getLastUpdateTime() {
  const redis = await assertRedis();

  const value = await redis.get(keys.cooldown);
  return value ? Number(value) : 0;
}

export async function setLastUpdateTime(timestamp) {
  const redis = await assertRedis();

  await redis.set(keys.cooldown, String(timestamp));
}