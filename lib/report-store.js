import { keys, redis } from './redis.js';

function assertRedis() {
  if (!redis) {
    throw new Error('Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  }
}

export async function saveReport({ report, html, rss }) {
  assertRedis();

  const date = report.date;
  await redis.set(keys.latest, JSON.stringify(report));
  await redis.set(keys.report(date), JSON.stringify(report));
  await redis.set(keys.html(date), html);
  await redis.set(keys.rss(date), rss);
  await redis.set(keys.latestRss, rss);
  await redis.zadd(keys.reports, { score: new Date(report.generatedAt).getTime(), member: date });
}

export async function getLatestReport() {
  assertRedis();

  const raw = await redis.get(keys.latest);
  return raw ? JSON.parse(raw) : null;
}

export async function getReportByDate(date) {
  assertRedis();

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
  assertRedis();

  return await redis.zrange(keys.reports, 0, -1, { rev: true });
}

export async function getLastUpdateTime() {
  assertRedis();

  const value = await redis.get(keys.cooldown);
  return value ? Number(value) : 0;
}

export async function setLastUpdateTime(timestamp) {
  assertRedis();

  await redis.set(keys.cooldown, String(timestamp));
}