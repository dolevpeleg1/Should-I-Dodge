# Should I Dodge

A fan-made **League of Legends** web app that compares team compositions using approximate champion win rates, suggests whether dodging might be worth it, and can surface a YouTube guide for a champion. **No Riot account or login required.**

**Repository:** [github.com/dolevpeleg1/Should-I-Dodge](https://github.com/dolevpeleg1/Should-I-Dodge)

---

## What it does

| Page | Route | Description |
|------|--------|-------------|
| Home | `GET /` | Overview and links to both tools |
| Dodge calculator | `GET /dodgeCalculator` | Pick ally and enemy teams (5 champions each) |
| Matchup result | `POST /results` | Average win rate per side and a dodge / favorable / even verdict |
| Champion guides | `GET /championPage` | Search a champion and embed a YouTube guide (optional API key) |

**Dodge logic (simplified):** For each side, the app sums win rates for the five champions (unknown names are skipped), divides by five for an average, then compares ally vs enemy. Higher ally average → favorable; higher enemy → dodge; tie → even. This is a rough heuristic for fun—not live matchmaking or MMR.

---

## Features

- **5v5 comp comparison** with type-to-search champion autocomplete from bundled data
- **Verdict** based on average win rates (not ML or live game data)
- **Champion guides** via YouTube Data API v3 when `YOUTUBE_API_KEY` is set
- **Data refresh scripts** to pull names from Riot Data Dragon and win rates from a public Hugging Face dataset (or manual CSV)
- **Responsive layout** for phones and tablets (see [Responsive design](#responsive-design))
- **Deployable on Vercel** — serverless Express via `api/index.js` and `vercel.json` (see [Deployment](#deployment))

---

## Quick start

**Requirements:** Node.js 18+ (recommended), npm

1. **Clone and install**

   ```bash
   git clone https://github.com/dolevpeleg1/Should-I-Dodge.git
   cd Should-I-Dodge
   npm install
   ```

2. **Environment (optional)**

   ```bash
   cp .env.example .env
   ```

   | Variable | Required | Purpose |
   |----------|----------|---------|
   | `YOUTUBE_API_KEY` | No | Champion guide search; calculator works without it |
   | `CHAMPION_CACHE_REFRESH_MS` | No | How often the server reloads `public/championWinrates.json` (default: 6 hours; `0` disables) |

3. **Run the app**

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000). For auto-reload during development: `npm run dev`.

4. **Refresh champion data after a patch** (optional)

   ```bash
   npm run sync-champions
   ```

   Restart the server (`Ctrl+C`, then `npm start`) so changes load immediately. The server also reloads the JSON file on a timer if `CHAMPION_CACHE_REFRESH_MS` is set.

To put the app online, see [Deployment](#deployment).

---

## Deployment

This app runs as a single **Express** server locally (`npm start`) and on **[Vercel](https://vercel.com)** as a serverless function (`api/index.js` re-exporting `app.js`). Static assets in `public/` (CSS, `championWinrates.json`) are served by Vercel’s CDN; all page routes go through Express for EJS rendering and POST handlers.

| | Local | Vercel |
|---|--------|--------|
| Start | `npm start` → port 3000 | Automatic on push or `vercel --prod` |
| Env vars | `.env` (from `.env.example`) | Project → Settings → Environment Variables |
| Champion data sync | `npm run sync-champions` | Run locally, commit JSON, redeploy |
| JSON hot-reload | Optional (`CHAMPION_CACHE_REFRESH_MS`) | Disabled (`VERCEL` is set) |

The **dodge calculator** needs no secrets. **Champion guides** require `YOUTUBE_API_KEY` in production.

### Deploy with GitHub (recommended)

1. Push this repo to GitHub.
2. Open [vercel.com/new](https://vercel.com/new) and import **Should-I-Dodge**.
3. Use the defaults: **no** custom build command, **no** output directory override.
4. Add `YOUTUBE_API_KEY` under Environment Variables if you want guide search (Production + Preview).
5. Deploy. Future pushes to `main` trigger automatic redeploys.

### Deploy with the CLI

```bash
npm i -g vercel    # once
vercel login
vercel             # preview URL
vercel --prod      # production URL
```

Run these from the project root. Link the folder to your Vercel account when prompted.

### Environment variables on Vercel

| Name | Required | Notes |
|------|----------|--------|
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 for `/championPage` guides |
| `CHAMPION_CACHE_REFRESH_MS` | No | Leave unset on Vercel; periodic reload is off in serverless |

Restrict the YouTube key in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) to **YouTube Data API v3** and monitor quota.

### Updating data in production

1. Locally: `npm run sync-champions` (or edit `data/winrates.csv` and `npm run import-winrates`).
2. Commit `public/championWinrates.json` (and `data/winrates.csv` if you want it in the repo).
3. Push — Vercel redeploys with the new bundle.

Do **not** run Hugging Face / DuckDB sync scripts on Vercel; they are for local dev only.

### Other hosts

Any Node host that runs `node app.js` (Railway, Render, Fly.io, etc.) works without `api/index.js`. Set `PORT` if the platform provides it, and use the same env vars as above.

---

## Project layout

```
app.js              Express app (local: port 3000; Vercel: api/index.js)
api/index.js        Vercel serverless entry
vercel.json         Rewrites all routes to the Express app
router.js           Routes and dodge / YouTube handlers
lib/
  championData.js   Loads and caches championWinrates.json
  mergeChampionData.js  Merges Data Dragon names with win rates
public/
  championWinrates.json  Bundled champion + win rate data
  style.css
templates/          EJS views (calculator, results, guides)
scripts/            Data pipeline (sync, import/export, Hugging Face)
data/
  winrates.csv      Editable win rates (import/export workflow)
```

---

## Where the data comes from

This project **does not scrape** op.gg, u.gg, LoLalytics, or similar sites. Updates use **public sources only**:

| Data | Source | What the app does |
|------|--------|-------------------|
| Champion **names** | [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) | Fetches the official champion list on sync |
| Champion **win rates** | [Hugging Face: HakimT/lol-champion-ranked-stats](https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats) | Downloads a public parquet snapshot (`data/train.parquet`), reads it locally with DuckDB |

The Hugging Face file is a **community-published dataset** (historical ranked stats). Someone else aggregated public stats; this app **downloads and imports that file**—it does not crawl third-party sites on each run.

Win rates are **unofficial estimates** for entertainment, not live Riot meta. The dataset may lag the current patch. You can maintain rates manually via `data/winrates.csv`.

---

## Champion data pipeline

| Command | What it does |
|---------|----------------|
| `npm run sync-champions` | Import win rates from Hugging Face parquet → update `data/winrates.csv` and `public/championWinrates.json`, then sync names from Data Dragon and merge |
| `npm run fetch-winrates` | Hugging Face / parquet step only |
| `npm run update-champions` | Data Dragon merge only |
| `npm run export-winrates` | Write current JSON win rates to `data/winrates.csv` for manual edits |
| `npm run import-winrates` | Import CSV back into JSON (no Hugging Face download) |

- **DuckDB** is a dev dependency used when reading parquet during fetch/sync.
- **New champions** without a rate get **50%** until you set one.
- To pull a newer Hugging Face release: delete `data/train.parquet` and run `npm run sync-champions` again.

---

## Tech stack

- **Runtime:** Node.js, Express 5, EJS
- **Client:** Server-rendered HTML + CSS in `public/`
- **Data:** Riot Data Dragon, Hugging Face dataset (or manual CSV), optional YouTube Data API v3
- **Hosting:** Vercel (serverless) or any Node process host — see [Deployment](#deployment)

---

## Responsive design

The UI is built with plain CSS in `public/style.css`—no separate mobile app. Layout adapts from desktop down to iPhone-sized screens.

| Breakpoint | Behavior |
|------------|----------|
| **≤768px** | Dodge calculator teams stack vertically; hero cards and result stats use a single column; buttons and form links go full width |
| **≤480px** | Compact header with full-width nav taps; tighter padding and typography |

**Mobile-friendly details:**

- Viewport meta and `theme-color` for mobile browsers
- Safe-area padding for notched iPhones (`viewport-fit=cover`)
- Touch targets at least ~44px on buttons, nav links, and champion selects
- 16px form controls to avoid iOS zoom-on-focus
- Scroll-based background on small screens (fixed parallax only on wider viewports)
- Embedded YouTube guides scale with `aspect-ratio: 16 / 9`

To check on a phone: run the app locally, open `http://<your-computer-ip>:3000` on the same Wi‑Fi, or deploy and test in Safari/Chrome mobile. Resize the browser devtools device toolbar for a quick desktop preview.

---

## AI use

**In the product:** Dodge recommendations are **not** generated by an LLM. They are deterministic: average win rates from `public/championWinrates.json` and simple comparison in `router.js`. Champion guides use the **YouTube Data API** (keyword search), not generative AI.

**In development:** I Built the project end-to-end, using Cursor as an AI assistant to support development of the dodge calculator, route handling, verdict logic, data refresh workflow, UI styling, testing, and final review.

---

## Disclaimer

This is a **fan project** and is **not** associated with or endorsed by Riot Games. Dodge suggestions and win rates are **approximate and for fun**—not competitive, betting, or esports advice. Use official sources for serious decisions.

*Should I Dodge is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.*
