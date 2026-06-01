"use strict";

const path = require("path");
const duckdb = require("duckdb");

const PARQUET_PATH = path.join(
  __dirname,
  "..",
  "data",
  "train.parquet"
);

function patchScoreSql(column) {
  return `TRY_CAST(split_part(${column}, '.', 1) AS INTEGER) * 100 + COALESCE(TRY_CAST(NULLIF(split_part(${column}, '.', 2), '') AS INTEGER), 0)`;
}

const NUMERIC_PATCH_FILTER = "regexp_matches(patch, '^[0-9]+\\.[0-9]+$')";

function queryAll(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * @returns {Promise<{ latestPatch: string, rows: { champion: string, winrate: number }[] }>}
 */
async function loadWinRatesFromParquet(parquetPath = PARQUET_PATH) {
  const db = new duckdb.Database(":memory:");
  const escaped = parquetPath.replace(/'/g, "''");

  // Latest patch rows often have winrate=0 (incomplete ingest). Per champion,
  // use the most recent date with a positive win rate, then average roles.
  const rows = await queryAll(
    db,
    `WITH filtered AS (
       SELECT champion, role, winrate, patch, date
       FROM read_parquet('${escaped}')
       WHERE winrate > 0 AND winrate < 80 AND ${NUMERIC_PATCH_FILTER}
     ),
     latest AS (
       SELECT champion, MAX(date) AS max_date
       FROM filtered
       GROUP BY champion
     )
     SELECT
       f.champion,
       AVG(f.winrate)::DOUBLE AS winrate,
       MAX(f.patch) AS patch
     FROM filtered f
     INNER JOIN latest l
       ON f.champion = l.champion AND f.date = l.max_date
     GROUP BY f.champion
     ORDER BY f.champion`
  );

  const patchCounts = new Map();
  for (const row of rows) {
    patchCounts.set(row.patch, (patchCounts.get(row.patch) || 0) + 1);
  }
  const latestPatch =
    [...patchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";

  db.close();

  return {
    latestPatch,
    rows: rows.map((r) => ({
      champion: r.champion,
      winrate: r.winrate,
    })),
  };
}

module.exports = { loadWinRatesFromParquet, PARQUET_PATH };
