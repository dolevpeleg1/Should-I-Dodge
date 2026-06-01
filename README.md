# Should I Dodge

A fan-made League of Legends tool that compares team compositions using champion win rates, suggests whether to dodge, and links to YouTube champion guides. **No login required.**

**Repository:** https://github.com/dolevpeleg1/Should-I-Dodge

## Features

- Enter ally and enemy team comps → get a dodge recommendation
- Browse champion win rates and fetch guide videos (YouTube Data API, optional)

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and optionally set:

   - `YOUTUBE_API_KEY` — for champion video guides (works without it for the dodge calculator)

3. Refresh champion data after a patch:

   ```bash
   npm run sync-champions
   ```

   Restart the server (`Ctrl+C`, then `npm start`) so the site loads the updated file immediately.

   Or edit `data/winrates.csv` by hand and run `npm run import-winrates` then `npm run update-champions`. New champions get 50% until you set a rate.

4. Start the app:

   ```bash
   npm start
   ```

   Open http://localhost:3000 — use the dodge calculator or champion guides with no account.

## Where the data comes from

This project **does not scrape** op.gg, u.gg, LoLalytics, or similar sites. Updates use **public sources only**:

| Data | Source | What the app does |
|------|--------|-------------------|
| Champion **names** | [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) | Fetches the official champion list each sync |
| Champion **win rates** | [Hugging Face dataset](https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats) | Downloads a public parquet snapshot once (`data/train.parquet`), reads it locally with DuckDB |

The Hugging Face file is a **community-published dataset** (historical ranked stats). Someone else collected aggregates from public stats sites; this app only **downloads and imports that file**—it does not crawl third-party websites on each run.

Win rates are **unofficial estimates** for entertainment, not live Riot meta. The dataset may lag behind the current patch. You can also maintain rates manually via `data/winrates.csv`.

## Champion data pipeline

- **`npm run sync-champions`** — (1) Import win rates from the Hugging Face parquet, write `data/winrates.csv` and update `public/championWinrates.json`. (2) Sync champion names from Data Dragon and merge win rates. Requires `duckdb` (installed as a dev dependency).
- **`npm run export-winrates`** / **`npm run import-winrates`** — Export JSON to CSV for manual edits, then import back (no Hugging Face download).
- **`npm run fetch-winrates`** / **`npm run update-champions`** — Run either step alone if needed.
- **Server cache** — Reloads `championWinrates.json` every 6 hours (`CHAMPION_CACHE_REFRESH_MS`). Restart the server after updates for immediate effect.

To refresh win rates from a newer Hugging Face release, delete `data/train.parquet` and run `npm run sync-champions` again.

## Tech stack

- Node.js, Express, EJS
- Champion names: Riot Data Dragon
- Win rates: imported from a public Hugging Face dataset (or manual CSV)

## Disclaimer

This is a fan project and is **not** associated with or endorsed by Riot Games. Dodge suggestions and win rates are **approximate and for fun**—not competitive or betting advice. Use official sources for serious decisions.

Should I Dodge is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
