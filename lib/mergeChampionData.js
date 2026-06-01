"use strict";

const DEFAULT_WIN_RATE = 50.0;

function normalizeName(name) {
  return String(name).trim().toLowerCase();
}

/** @param {{ name: string, win_rate: number }[]} champions */
function buildWinRateMap(champions) {
  const map = new Map();
  for (const champ of champions) {
    if (champ?.name != null && typeof champ.win_rate === "number") {
      map.set(normalizeName(champ.name), champ.win_rate);
    }
  }
  return map;
}

/**
 * @param {{ name: string, id: string }[]} ddragonChampions
 * @param {Map<string, number>} winRateMap
 */
function mergeDdragonWithWinRates(
  ddragonChampions,
  winRateMap,
  defaultWinRate = DEFAULT_WIN_RATE
) {
  const merged = [];
  let newChampions = 0;
  let usingDefaultRate = 0;

  for (const champ of ddragonChampions) {
    const key = normalizeName(champ.name);
    const existing = winRateMap.get(key);
    const win_rate =
      existing !== undefined ? existing : defaultWinRate;

    if (existing === undefined) {
      newChampions += 1;
      usingDefaultRate += 1;
    }

    merged.push({ name: champ.name, win_rate });
  }

  merged.sort((a, b) => a.name.localeCompare(b.name, "en"));

  return { champions: merged, newChampions, usingDefaultRate };
}

module.exports = {
  DEFAULT_WIN_RATE,
  normalizeName,
  buildWinRateMap,
  mergeDdragonWithWinRates,
};
