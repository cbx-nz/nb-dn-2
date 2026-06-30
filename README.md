# No Bloat Daily News

Minimal daily news site built for direct import into Vercel and Redis.

The included [example.html](example.html) is the rough page target for the slim, low-bloat layout.

## What it does

- Stores the latest report and archive data in Redis.
- Generates a compact home page with a refresh button and cooldown.
- Serves old reports as raw, no-CSS HTML pages.
- Exposes RSS at `/api/rss`.

## Environment variables

Copy `.env.example` and set:

| Variable | Description |
| --- | --- |
| `REDIS_URL` | Single Redis connection string used to store the latest report, archived reports, RSS, and cooldown state. |
| `SITE_URL` | Public base URL for the deployed site, used in generated RSS links. |
| `GNEWS_API_KEY` | Optional GNews API key used for one of the news sources. |
| `CURRENTSNEWS_API_KEY` | Optional Currents API key used for a second news source. |
| `ALPHAVANTAGE_API_KEY` | Optional Alpha Vantage API key used for stock updates. |

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Import this repository into Vercel, set the Redis and API environment variables, and deploy.

## Repository status

This folder is structured to behave like a normal GitHub repo for Vercel import:

- `app/` contains the Next.js App Router app and serverless routes.
- `lib/` contains shared server-side logic for fetching and storing reports.
- `.gitignore` excludes build output, dependencies, and local env files.
- `package.json` includes the standard Vercel/Next scripts.