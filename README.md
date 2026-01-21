# CreatorScout

CreatorScout is a production-ready Next.js 14 app that discovers YouTube creators from video search results, enriches them with AI, and appends the data to a Google Sheet without overwriting existing rows.

## Features
- Search YouTube videos (not channels) to discover creators, including smaller and newer channels.
- Filter by subscriber range and minimum video count.
- Generate category, subcategory, and one-line descriptions using Mino AI.
- Extract explicit external links from channel descriptions.
- Create and append to Google Sheets with Google OAuth.
- Update subscriber counts over time without overwriting other data.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- TailwindCSS
- Google OAuth
- YouTube Data API v3
- Google Sheets API
- Mino AI API
- Zod

## Setup

### 1) Google Cloud project + APIs
1. Go to https://console.cloud.google.com and create a new project.
2. Enable APIs:
   - YouTube Data API v3
   - Google Sheets API
3. Create an OAuth Consent Screen (External or Internal), add your test users, and publish.
4. Create OAuth credentials:
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - Your Vercel domain (e.g. `https://your-app.vercel.app`)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-app.vercel.app/api/auth/callback/google`
5. Create an API key for YouTube Data API v3.

### 2) Environment variables
Create `.env.local` with:
```
YOUTUBE_API_KEY=your_youtube_api_key
MINO_API_KEY=your_mino_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
```

### 3) Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Google OAuth Scopes
The app only requests:
- `https://www.googleapis.com/auth/spreadsheets`
- `openid email profile`

## Mino API Endpoint
The Mino client uses `https://api.mino.ai/v1/chat/completions`.
If your Mino deployment uses a different endpoint, update `MINO_API_URL` in `lib/mino/index.ts`.

## Deployment (Vercel)
1. Push the repo to GitHub.
2. In Vercel, import the repo.
3. Set environment variables (same as `.env.local`) in Vercel Project Settings.
4. Update Google OAuth redirect URI to:
   - `https://your-app.vercel.app/api/auth/callback/google`
   - Update `GOOGLE_REDIRECT_URI` to match.
5. Deploy. Vercel will build with `npm run build` automatically.

## Pagination / Batch Discovery
- Configure `Pages per run` in the dashboard (max 5).
- Each page uses YouTube `nextPageToken` and deduplicates channel IDs.
- Higher page counts increase API quota usage; monitor usage in Google Cloud.

## Scheduled Discovery (Vercel Cron)
1. In Vercel, add a Cron Job with the path:
   - `/api/cron/discover?query=...&category=...&maxPages=...&maxResults=...&minVideoCount=...&sheetId=...`
2. Add an Authorization header:
   - `Authorization: Bearer <NEXTAUTH_SECRET>`
3. Provide Google OAuth tokens as headers:
   - `x-google-access-token: <access token>`
   - `x-google-refresh-token: <refresh token>`
4. The cron endpoint respects rate limits and only appends new rows or updates subscriber counts.

## CSV Export
- After a discovery run, click **Download CSV** to export the sheet.
- The export uses the same headers as the Google Sheet.

## Known Limitations
- YouTube Data API does not expose About-page external link fields. Links are extracted only from the channel description.
- Discovery is incremental and depends on YouTube search results and quota limits.
- AI fields can be empty when confidence is below 0.85.

## Security Notes
- Never commit `.env.local`.
- Rotate API keys if exposed.
- Use `NEXTAUTH_SECRET` in production to protect sessions.
- Keep cron headers private; do not expose tokens in public repos or logs.

## Notes on Data Integrity
- No scraping: only YouTube Data API v3 and Google APIs are used.
- AI responses are validated with Zod and constrained to strict JSON.
- Rows are never overwritten; only subscriber count and last updated fields are updated for existing channels.
