# Pulla Colombia — Project Context

Static web app (no framework, no build step) for organizing a betting pool ("pulla") for Colombia's World Cup 2026 matches. Spanish UI, Colombian flag color theme (yellow/blue/red), sports-betting aesthetic.

## Stack
- Plain HTML/CSS/JS — `index.html`, `css/styles.css`, `js/app.js`, `js/db.js`, `js/config.js`
- Persistence: Supabase (Postgres) via `@supabase/supabase-js` CDN, with `localStorage` fallback if Supabase isn't configured
- Image export: `html2canvas` (loaded dynamically from CDN)
- Deploy target: GitHub Pages / Netlify static hosting

## Core Features (implemented)
- Configure rival team (auto-detects flag emoji) and per-person entry fee (`cuota`, in COP)
- Live prize pool calculation = cuota × number of participants
- Register participants with their predicted score; edit/delete before close
- "Close registrations" button (red, with confirm modal) — locks all editing
- Export participants table + prize as a downloadable PNG image
- **Live score tracker**: input current live score, ranks participants by closeness to live score, shows estimated winnings (pot ÷ number of exact-match predictions). A prediction is only "still possible" if neither team's live goals have exceeded that participant's predicted goals for either side.
- **Finish match** button: locks everything, calculates final winners (exact score match), shows result modal, saves snapshot to Supabase `match_history` table
- **New match / clear data** button: resets active match state (`matches` table row) without touching `match_history`

## Database (Supabase)
Two tables: `matches` (single active match state, keyed by `MATCH_ID` in `app.js`) and `match_history` (one row per finished match, append-only). SQL setup is in `GUIA_SUPABASE.md`. RLS is enabled with an open `allow_all` policy (no auth — trusted small-group use case).

**Critical gotcha**: `SUPABASE_URL` in `config.js` must be just `https://PROJECT.supabase.co` — NOT `.../rest/v1/`. The SDK appends that path itself; including it causes `PGRST125 Invalid path` / 404 errors (`rest/v1/rest/v1/...`).

## Known constraints / preferences
- User prefers receiving changes as precise code fragments (what to find, what to replace, why) rather than full file rewrites, when doing incremental edits
- All user-facing text is in Spanish; code comments can be Spanish or English
- No backend server — everything runs client-side, talking directly to Supabase's REST APIs