# Should I Dodge

A fan-made League of Legends tool that compares team compositions using champion win rates, suggests whether to dodge, and links to YouTube champion guides.

**Repository:** https://github.com/dolevpeleg1/Should-I-Dodge

## Features

- Sign up / log in (MongoDB Atlas, bcrypt-hashed passwords)
- Enter ally and enemy team comps → get a dodge recommendation
- Browse champion win rates and fetch guide videos (YouTube Data API)

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   - `MONGO_CONNECTION_STRING` — from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (M0 free tier is enough)
   - `MONGO_DATABASE_NAME` — default `should_i_dodge` (created on first signup)
   - `YOUTUBE_API_KEY` — optional, for champion video guides

3. In Atlas: create a database user and allow your IP under **Network Access**.

4. Refresh champion data after a patch:

   ```bash
   npm run sync-champions
   ```

   Or edit `data/winrates.csv` by hand and run `npm run import-winrates` then `npm run update-champions`. New champions get 50% until you set a rate.

5. Start the app:

   ```bash
   npm start
   ```

   Open http://localhost:3000

## Champion data pipeline

- **`npm run sync-champions`** — Fetches win rates from the [Hugging Face dataset](https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats) (parquet + `duckdb`), then syncs champion names from [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon). One command for the full update.
- **`npm run export-winrates`** / **`npm run import-winrates`** — Export JSON to CSV for manual edits, then import back.
- **`npm run fetch-winrates`** / **`npm run update-champions`** — Run either step alone if needed.
- **Server cache** — Reloads `championWinrates.json` every 6 hours (`CHAMPION_CACHE_REFRESH_MS`). Restart the server after updates for immediate effect.

## Tech stack

- Node.js, Express, EJS
- MongoDB Atlas
- Champion names from Riot Data Dragon; win rates fan-maintained in `public/championWinrates.json`

## Disclaimer

This is a fan project and is not associated with Riot Games. Champion stats are approximate and for entertainment; use official sources for competitive decisions.

Should I Dodge is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
