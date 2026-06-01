"use strict";

/**
 * Fetches win rates (Hugging Face) and syncs champion names (Data Dragon).
 * Run after patches: npm run sync-champions
 */

const { fetchWinRates } = require("./fetchWinRatesFromHuggingFace");
const { updateChampions } = require("./updateChampions");

async function syncChampions() {
  await fetchWinRates();
  console.log("=== Step 2: Sync champion list (Data Dragon) ===\n");
  await updateChampions();
  console.log("Done. Restart the server to load changes immediately.");
}

syncChampions().catch((err) => {
  console.error("sync-champions failed:", err.message);
  process.exit(1);
});
