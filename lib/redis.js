import { createClient } from 'redis';

let redisClientPromise;

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!redisClientPromise) {
    const client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}

export async function getRedis() {
  return await createRedisClient();
}

export const keys = {
  latest: 'nbdn:latest',
  reports: 'nbdn:reports',
  report: (date) => `nbdn:report:${date}`,
  html: (date) => `nbdn:html:${date}`,
  rss: (date) => `nbdn:rss:${date}`,
  latestRss: 'nbdn:rss:latest',
  cooldown: 'nbdn:update:cooldown'
};