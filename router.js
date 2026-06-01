"use strict";
const express = require("express");
const router = express.Router();
const path = require("path");
const axios = require("axios");
const {
  getChampions,
  getChampionMetadata,
  findChampionByName,
  startChampionCacheRefresh,
  DEFAULT_REFRESH_MS,
} = require("./lib/championData");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const championMeta = () => getChampionMetadata();

const refreshMs =
  Number(process.env.CHAMPION_CACHE_REFRESH_MS) || DEFAULT_REFRESH_MS;
if (!process.env.VERCEL) {
  startChampionCacheRefresh(refreshMs);
}

router.get("/", (request, response) => {
  response.render("index");
});

router.get("/dodgeCalculator", (request, response) => {
  response.render("dodgeCalculator", {
    champions: getChampions(),
    championMeta: championMeta(),
  });
});

router.post("/results", (request, response) => {
  const allyTeam = [
    request.body.top,
    request.body.jungler,
    request.body.mid,
    request.body.bot,
    request.body.support,
  ].map((champ) => champ.trim().toLowerCase());

  const enemyTeam = [
    request.body.etop,
    request.body.ejungler,
    request.body.emid,
    request.body.ebot,
    request.body.esupport,
  ].map((champ) => champ.trim().toLowerCase());

  let allyWinrateSum = 0;

  for (let ally of allyTeam) {
    const champion = findChampionByName(ally);
    if (champion) {
      allyWinrateSum += champion.win_rate;
    }
  }

  let eWinrateSum = 0;

  for (let enemy of enemyTeam) {
    const champion = findChampionByName(enemy);
    if (champion) {
      eWinrateSum += champion.win_rate;
    }
  }

  const winrate = allyWinrateSum / 5;
  const ewinrate = eWinrateSum / 5;
  let verdict = "even";
  if (winrate > ewinrate) {
    verdict = "favorable";
  } else if (winrate < ewinrate) {
    verdict = "dodge";
  }
  response.render("results", {
    winrate: winrate.toFixed(3),
    ewinrate: ewinrate.toFixed(3),
    verdict: verdict,
  });
});

router.get("/championPage", (request, response) => {
  response.render("championPage", {
    champions: getChampions(),
    championMeta: championMeta(),
  });
});

router.post("/generateVideo", (request, response) => {
  (async () => {
    const champion = request.body.targetChamp;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return response
        .status(503)
        .send(
          "Champion video guides are not configured. Set YOUTUBE_API_KEY in your environment."
        );
    }

    try {
      const query = `${champion} league of legends guide`;
      const result = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: query,
            key: apiKey,
            type: "video",
            maxResults: 1,
          },
        }
      );

      const items = result.data.items;

      if (!items.length) {
        return response.send("No video found.");
      }

      const videoId = items[0].id.videoId;
      const videoUrl = `https://www.youtube.com/embed/${videoId}`;
      response.render("videoResult", { videoUrl, champion });
    } catch (error) {
      console.error("YouTube API error:", error.message);
      response.status(500).send("Something went wrong when fetching the video.");
    }
  })();
});

module.exports = router;
