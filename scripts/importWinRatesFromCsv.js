"use strict";

/**
 * Apply win rates from data/winrates.csv to public/championWinrates.json
 * CSV format: name,win_rate  (header required)
 */

const fs = require("fs");
const path = require("path");
const { buildWinRateMap } = require("../lib/mergeChampionData");

const CSV_PATH = path.join(__dirname, "..", "data", "winrates.csv");
const JSON_PATH = path.join(
  __dirname,
  "..",
  "public",
  "championWinrates.json"
);

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV must have a header and at least one row");
  }

  const header = lines[0].toLowerCase().replace(/\s/g, "");
  if (!header.includes("name") || !header.includes("win_rate")) {
    throw new Error("CSV header must include name and win_rate columns");
  }

  const champions = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let name;
    let win_rate;

    if (line.startsWith('"')) {
      const match = line.match(/^"((?:[^"\\]|\\.)*)"\s*,\s*([\d.]+)/);
      if (!match) throw new Error(`Invalid CSV line ${i + 1}: ${line}`);
      name = match[1].replace(/\\"/g, '"');
      win_rate = parseFloat(match[2]);
    } else {
      const idx = line.lastIndexOf(",");
      if (idx === -1) throw new Error(`Invalid CSV line ${i + 1}: ${line}`);
      name = line.slice(0, idx).trim();
      win_rate = parseFloat(line.slice(idx + 1));
    }

    if (Number.isNaN(win_rate)) {
      throw new Error(`Invalid win_rate on line ${i + 1}`);
    }
    champions.push({ name, win_rate });
  }

  return champions;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing ${CSV_PATH} — run npm run fetch-winrates or create the file.`);
    process.exit(1);
  }

  const csvChampions = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const rateMap = buildWinRateMap(csvChampions);

  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  let updated = 0;

  data.champions = data.champions.map((c) => {
    const key = c.name.trim().toLowerCase();
    if (rateMap.has(key)) {
      updated += 1;
      const win_rate = rateMap.get(key);
      rateMap.delete(key);
      return { ...c, win_rate };
    }
    return c;
  });

  for (const [key, win_rate] of rateMap) {
    const name = csvChampions.find(
      (c) => c.name.trim().toLowerCase() === key
    )?.name;
    if (name) data.champions.push({ name, win_rate });
  }

  data.champions.sort((a, b) => a.name.localeCompare(b.name, "en"));
  data.updated_at = new Date().toISOString();
  data.win_rate_source =
    "fan-maintained via data/winrates.csv (imported with npm run import-winrates)";

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Applied ${updated} win rates from CSV to ${JSON_PATH}`);
  if (rateMap.size) {
    console.log(
      `Warning: ${rateMap.size} CSV row(s) did not match JSON champion names`
    );
  }
}

main();
