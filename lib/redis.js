import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

export const keys = {
  latest: 'nbdn:latest',
  reports: 'nbdn:reports',
  report: (date) => `nbdn:report:${date}`,
  html: (date) => `nbdn:html:${date}`,
  rss: (date) => `nbdn:rss:${date}`,
  latestRss: 'nbdn:rss:latest',
  cooldown: 'nbdn:update:cooldown'
};