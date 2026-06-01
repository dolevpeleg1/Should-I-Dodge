"use strict";

/**
 * Merges Riot Data Dragon champion names with win rates from championWinrates.json.
 * Run after patches: npm run sync-champions (or npm run update-champions alone)
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const {
  buildWinRateMap,
  mergeDdragonWithWinRates,
  DEFAULT_WIN_RATE,
} = require("../lib/mergeChampionData");

const DATA_PATH = path.join(__dirname, "..", "public", "championWinrates.json");
const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const LOCALE = "en_US";

async function fetchLatestDdragonVersion() {
  const { data } = await axios.get(VERSIONS_URL, { timeout: 30000 });
  if (!Array.isArray(data) || !data.length) {
    throw new Error("No versions returned from Data Dragon");
  }
  return data[0];
}

async function fetchChampions(version) {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${LOCALE}/champion.json`;
  const { data } = await axios.get(url, { timeout: 30000 });
  const list = Object.values(data.data).map((c) => ({
    name: c.name,
    id: c.id,
  }));
  list.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return list;
}

function readExistingData() {
  if (!fs.existsSync(DATA_PATH)) {
    return { champions: [], win_rate_source: null };
  }
  const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  return {
    champions: Array.isArray(parsed.champions) ? parsed.champions : [],
    win_rate_source: parsed.win_rate_source ?? null,
  };
}

async function updateChampions() {
  console.log("Fetching Data Dragon version…");
  const version = await fetchLatestDdragonVersion();
  console.log(`Latest patch: ${version}`);

  console.log("Fetching champion list…");
  const ddragonChampions = await fetchChampions(version);

  const existing = readExistingData();
  const winRateMap = buildWinRateMap(existing.champions);
  const { champions, newChampions, usingDefaultRate } = mergeDdragonWithWinRates(
    ddragonChampions,
    winRateMap,
    DEFAULT_WIN_RATE
  );

  const output = {
    updated_at: new Date().toISOString(),
    ddragon_version: version,
    win_rate_source:
      existing.win_rate_source ??
      "fan-maintained (edit win_rate values in this file; new champions default to 50.0)",
    champions,
  };

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${champions.length} champions to ${DATA_PATH}`);
  console.log(
    `  ${newChampions} new (using default ${DEFAULT_WIN_RATE}% win rate) — update those manually when you have stats`
  );
  console.log(
    `  ${champions.length - usingDefaultRate} kept existing win rates`
  );
}

module.exports = { updateChampions };

if (require.main === module) {
  updateChampions().catch((err) => {
    console.error("update-champions failed:", err.message);
    process.exit(1);
  });
}
