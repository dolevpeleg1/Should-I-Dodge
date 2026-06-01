"use strict";

const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(
  __dirname,
  "..",
  "public",
  "championWinrates.json"
);
const CSV_PATH = path.join(__dirname, "..", "data", "winrates.csv");

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const lines = ["name,win_rate"];

for (const c of data.champions) {
  const name =
    c.name.includes(",") || c.name.includes('"')
      ? `"${c.name.replace(/"/g, '""')}"`
      : c.name;
  lines.push(`${name},${c.win_rate}`);
}

fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
fs.writeFileSync(CSV_PATH, `${lines.join("\n")}\n`, "utf8");
console.log(`Exported ${data.champions.length} champions to ${CSV_PATH}`);
