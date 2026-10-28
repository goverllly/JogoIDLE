// @ts-nocheck
/** Contadores de carreira (mortal → ritual da Divindade). */

export function emptyCareer() {
  return {
    kills: 0,
    bossKills: 0,
    goldEarned: 0,
    goldSpent: 0,
    itemsBought: 0,
    playMs: 0,
  };
}

export function ensureCareer(character) {
  if (!character.career || typeof character.career !== 'object') {
    character.career = emptyCareer();
  }
  const c = character.career;
  for (const key of Object.keys(emptyCareer())) {
    const n = Math.floor(Number(c[key]) || 0);
    c[key] = Math.max(0, Number.isFinite(n) ? n : 0);
  }
  return c;
}

export function careerAddKills(character, { boss = false } = {}) {
  const c = ensureCareer(character);
  c.kills += 1;
  if (boss) c.bossKills += 1;
}

export function careerAddGoldEarned(character, amount) {
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return;
  ensureCareer(character).goldEarned += n;
}

export function careerAddGoldSpent(character, amount) {
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return;
  ensureCareer(character).goldSpent += n;
}

export function careerAddPurchase(character, price) {
  ensureCareer(character).itemsBought += 1;
  careerAddGoldSpent(character, price);
}

export function careerAddPlayMs(character, ms) {
  const n = Math.floor(Number(ms) || 0);
  if (n <= 0) return;
  ensureCareer(character).playMs += n;
}
