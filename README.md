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

4. Start the app:

   ```bash
   npm start
   ```

   Open http://localhost:3000

## Tech stack

- Node.js, Express, EJS
- MongoDB Atlas
- Static champion data in `public/championWinrates.json` (sourced from op.gg-style stats; not affiliated with Riot Games)

## Disclaimer

This is a fan project and is not associated with Riot Games. Champion stats are approximate and for entertainment; use official sources for competitive decisions.
