"use strict";

/**
 * One-time / periodic import of platinum+ win rates from Hugging Face
 * (HakimT/lol-champion-ranked-stats). Aggregates roles per champion for the
 * latest patch present in the dataset tail.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { buildWinRateMap } = require("../lib/mergeChampionData");
const {
  loadWinRatesFromParquet,
  PARQUET_PATH,
} = require("./loadWinRatesFromParquet");

const HF_ROWS_URL = "https://datasets-server.huggingface.co/rows";
const HF_PARQUET_URL =
  "https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats/resolve/main/data/train-00000-of-00001.parquet";
const DATASET = "HakimT/lol-champion-ranked-stats";
const PAGE_SIZE = 100;
const TAIL_PAGES = 40; // last ~4000 rows — covers recent patches
const REQUEST_DELAY_MS = 350;
const CSV_PATH = path.join(__dirname, "..", "data", "winrates.csv");
const JSON_PATH = path.join(
  __dirname,
  "..",
  "public",
  "championWinrates.json"
);

function normalizeSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadDdragonNameBySlug(version) {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const { data } = await axios.get(url, { timeout: 30000 });
  const map = new Map();
  for (const champ of Object.values(data.data)) {
    map.set(normalizeSlug(champ.id), champ.name);
    map.set(normalizeSlug(champ.name), champ.name);
  }
  return map;
}

async function fetchDatasetSize() {
  const { data } = await axios.get(
    "https://datasets-server.huggingface.co/size",
    { params: { dataset: DATASET, config: "default" }, timeout: 30000 }
  );
  return data.size.splits[0].num_rows;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRows(offset, length, attempt = 0) {
  try {
    const { data } = await axios.get(HF_ROWS_URL, {
      params: {
        dataset: DATASET,
        config: "default",
        split: "train",
        offset,
        length,
      },
      timeout: 60000,
    });
    return data.rows.map((r) => r.row);
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt < 5) {
      const wait = REQUEST_DELAY_MS * (attempt + 2) * 4;
      console.warn(`\nRate limited, waiting ${wait}ms…`);
      await sleep(wait);
      return fetchRows(offset, length, attempt + 1);
    }
    throw err;
  }
}

async function fetchTailRows(totalRows) {
  const start = Math.max(0, totalRows - PAGE_SIZE * TAIL_PAGES);
  const rows = [];
  for (let offset = start; offset < totalRows; offset += PAGE_SIZE) {
    const length = Math.min(PAGE_SIZE, totalRows - offset);
    const batch = await fetchRows(offset, length);
    rows.push(...batch);
    process.stdout.write(`\rFetched ${rows.length} recent rows…`);
    await sleep(REQUEST_DELAY_MS);
  }
  process.stdout.write("\n");
  return rows;
}

function parsePatch(patch) {
  const [major, minor = 0] = String(patch).split(".").map(Number);
  if (Number.isNaN(major)) return 0;
  return major * 100 + minor;
}

function findLatestPatch(rows) {
  let latest = rows[0]?.patch ?? "";
  let latestScore = parsePatch(latest);
  for (const row of rows) {
    const score = parsePatch(row.patch);
    if (score > latestScore) {
      latestScore = score;
      latest = row.patch;
    }
  }
  return latest;
}

function aggregateBySlug(rows) {
  const latestPatch = findLatestPatch(rows);

  const bySlug = new Map();
  for (const row of rows) {
    if (row.patch !== latestPatch) continue;
    const slug = normalizeSlug(row.champion);
    const entry = bySlug.get(slug) || { sum: 0, count: 0 };
    entry.sum += row.winrate;
    entry.count += 1;
    bySlug.set(slug, entry);
  }

  return { latestPatch, bySlug };
}

function slugsToChampions(bySlug, nameBySlug) {
  const champions = [];
  const unmatched = [];

  for (const [slug, { sum, count }] of bySlug) {
    const name = nameBySlug.get(slug);
    const win_rate = Math.round((sum / count) * 100) / 100;
    if (name) {
      champions.push({ name, win_rate });
    } else {
      unmatched.push({ slug, win_rate });
    }
  }

  champions.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return { champions, unmatched };
}

function writeCsv(champions) {
  const lines = ["name,win_rate"];
  for (const c of champions) {
    lines.push(`${JSON.stringify(c.name)},${c.win_rate}`);
  }
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, `${lines.join("\n")}\n`, "utf8");
}

function mergeIntoJson(fetchedChampions, latestPatch, ddragonVersion) {
  const existing = fs.existsSync(JSON_PATH)
    ? JSON.parse(fs.readFileSync(JSON_PATH, "utf8"))
    : { champions: [] };

  const fetchedMap = buildWinRateMap(fetchedChampions);
  const merged = existing.champions.map((c) => {
    const key = c.name.trim().toLowerCase();
    let updated = c;
    for (const [k, rate] of fetchedMap) {
      if (k === key) {
        updated = { ...c, win_rate: rate };
        fetchedMap.delete(k);
        break;
      }
    }
    return updated;
  });

  for (const [key, rate] of fetchedMap) {
    const name = fetchedChampions.find(
      (c) => c.name.trim().toLowerCase() === key
    )?.name;
    if (name) merged.push({ name, win_rate: rate });
  }

  merged.sort((a, b) => a.name.localeCompare(b.name, "en"));

  const output = {
    updated_at: new Date().toISOString(),
    ddragon_version: ddragonVersion ?? existing.ddragon_version ?? null,
    win_rate_source: `Hugging Face HakimT/lol-champion-ranked-stats (latest non-zero snapshot per champion, mostly patch ${latestPatch}; platinum+ avg across roles)`,
    champions: merged,
  };

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return merged.length;
}

async function ensureParquetFile() {
  if (fs.existsSync(PARQUET_PATH)) {
    return;
  }
  console.log("Downloading dataset parquet (~1.2 MB)…");
  fs.mkdirSync(path.dirname(PARQUET_PATH), { recursive: true });
  const { data } = await axios.get(HF_PARQUET_URL, {
    responseType: "arraybuffer",
    timeout: 120000,
  });
  fs.writeFileSync(PARQUET_PATH, Buffer.from(data));
  console.log(`Saved ${PARQUET_PATH}`);
}

async function loadFromHuggingFaceApi() {
  console.log("Loading dataset size from Hugging Face API…");
  const totalRows = await fetchDatasetSize();
  console.log(`Total rows: ${totalRows}`);
  const tailRows = await fetchTailRows(totalRows);
  return aggregateBySlug(tailRows);
}

async function fetchWinRates() {
  console.log("=== Step 1: Fetch win rates ===\n");
  let latestPatch;
  let bySlug;

  await ensureParquetFile();

  if (fs.existsSync(PARQUET_PATH)) {
    console.log(`Reading local parquet: ${PARQUET_PATH}`);
    const { latestPatch: patch, rows } = await loadWinRatesFromParquet();
    latestPatch = patch;
    bySlug = new Map();
    for (const row of rows) {
      bySlug.set(normalizeSlug(row.champion), {
        sum: row.winrate,
        count: 1,
      });
    }
    console.log(`Latest patch in dataset: ${latestPatch}`);
  } else {
    console.log(
      "No local parquet — using Hugging Face API (slower; may rate-limit)."
    );
    console.log(
      `Tip: download once to data/train.parquet from Hugging Face dataset page.`
    );
    ({ latestPatch, bySlug } = await loadFromHuggingFaceApi());
  }

  const { data: versions } = await axios.get(
    "https://ddragon.leagueoflegends.com/api/versions.json",
    { timeout: 30000 }
  );
  const ddragonVersion = versions[0];
  const nameBySlug = await loadDdragonNameBySlug(ddragonVersion);
  const { champions, unmatched } = slugsToChampions(bySlug, nameBySlug);

  if (!champions.length) {
    throw new Error("No champions found for latest patch in dataset tail");
  }

  console.log(`Latest patch in tail: ${latestPatch}`);
  console.log(`Champions with win rates: ${champions.length}`);
  if (unmatched.length) {
    console.log(
      `Warning: ${unmatched.length} slug(s) had no Data Dragon name match`
    );
  }

  writeCsv(champions);
  console.log(`Wrote ${CSV_PATH}`);

  const count = mergeIntoJson(champions, latestPatch, ddragonVersion);
  console.log(`Updated ${JSON_PATH} (${count} champions)\n`);
  return count;
}

module.exports = { fetchWinRates };

if (require.main === module) {
  fetchWinRates().catch((err) => {
    console.error("fetch-winrates failed:", err.message);
    process.exit(1);
  });
}
