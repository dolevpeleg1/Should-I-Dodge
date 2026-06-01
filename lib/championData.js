"use strict";

const fs = require("fs");
const path = require("path");
const { normalizeName } = require("./mergeChampionData");

const DATA_PATH = path.join(__dirname, "..", "public", "championWinrates.json");

const DEFAULT_REFRESH_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = {
  champions: [],
  updated_at: null,
  ddragon_version: null,
  win_rate_source: null,
};

function loadChampionsFromDisk() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.champions)) {
    throw new Error("championWinrates.json must contain a champions array");
  }

  cache = {
    champions: data.champions,
    updated_at: data.updated_at ?? null,
    ddragon_version: data.ddragon_version ?? null,
    win_rate_source: data.win_rate_source ?? "fan-maintained",
  };

  return cache;
}

function getChampions() {
  return cache.champions;
}

function getChampionMetadata() {
  return {
    updated_at: cache.updated_at,
    ddragon_version: cache.ddragon_version,
    win_rate_source: cache.win_rate_source,
    champion_count: cache.champions.length,
  };
}

function findChampionByName(name) {
  const key = normalizeName(name);
  return cache.champions.find((c) => normalizeName(c.name) === key);
}

function startChampionCacheRefresh(intervalMs) {
  const ms = Number(intervalMs) || DEFAULT_REFRESH_MS;

  if (ms <= 0) {
    return;
  }

  setInterval(() => {
    try {
      loadChampionsFromDisk();
      console.log(
        `[championData] Reloaded ${cache.champions.length} champions (Data Dragon ${cache.ddragon_version ?? "unknown"})`
      );
    } catch (err) {
      console.error("[championData] Cache reload failed:", err.message);
    }
  }, ms).unref();
}

loadChampionsFromDisk();

module.exports = {
  DATA_PATH,
  loadChampionsFromDisk,
  getChampions,
  getChampionMetadata,
  findChampionByName,
  startChampionCacheRefresh,
  DEFAULT_REFRESH_MS,
};
