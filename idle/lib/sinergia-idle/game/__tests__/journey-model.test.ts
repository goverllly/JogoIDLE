import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJourneyEvent,
  ensureJourney,
  getJourneyPeriodTotals,
  journeyOnSeasonRollover,
  publicJourney,
  resolveDisplayTotals,
} from "../journey.ts";
import { reconcileFameFromCharacters, publicFameOverview } from "../fame.ts";
import { emptyCareer } from "../career.ts";

function bareCharacter(overrides = {}) {
  return {
    id: "c1",
    userId: 1,
    name: "Teste",
    classId: "guerreiro",
    level: 10,
    gold: 500,
    career: {
      ...emptyCareer(),
      kills: 100,
      bossKills: 3,
      goldEarned: 9999,
      goldSpent: 400,
      itemsBought: 2,
      playMs: 60_000,
    },
    ...overrides,
  };
}

describe("journey model — Etapa 1", () => {
  it("seeds career as imported unclassified gold, not combat", () => {
    const c = bareCharacter();
    const j = ensureJourney(c);
    assert.equal(j.imported.kills, 100);
    assert.equal(j.imported.bossKills, 3);
    assert.equal(j.imported.goldEarnedUnclassified, 9999);
    assert.equal(j.imported.goldSpentUnclassified, 400);
    assert.equal(j.lifetime.goldEarnedCombat, 0);
    assert.equal(j.lifetime.kills, 0);
    const display = resolveDisplayTotals(j);
    assert.equal(display.kills, 100);
    assert.equal(display.goldEarnedCombat, 0);
    assert.equal(display.goldEarnedUnclassified, 9999);
  });

  it("seed is idempotent", () => {
    const c = bareCharacter();
    ensureJourney(c);
    c.career.kills = 500;
    ensureJourney(c);
    assert.equal(c.journey.imported.kills, 100);
  });

  it("lifetime survives season rollover; past season remains", () => {
    const c = bareCharacter();
    ensureJourney(c, { seasonKey: "2026-T1" });
    applyJourneyEvent(c, { source: "farm", type: "kill", online: true, durationMs: 1000 });
    assert.equal(c.journey.lifetime.kills, 1);
    assert.equal(c.journey.seasons["2026-T1"].kills, 1);
    journeyOnSeasonRollover(c, {
      closedSeasonKey: "2026-T1",
      nextSeasonKey: "2026-T2",
    });
    assert.equal(c.journey.lifetime.kills, 1);
    assert.equal(c.journey.seasons["2026-T1"].kills, 1);
    assert.equal(c.journey.seasons["2026-T2"].kills, 0);
    assert.equal(c.journey.meta.activeSeasonKey, "2026-T2");
  });

  it("duel/arena sources are no-ops", () => {
    const c = bareCharacter();
    ensureJourney(c);
    assert.equal(applyJourneyEvent(c, { source: "duel", type: "kill" }), false);
    assert.equal(applyJourneyEvent(c, { source: "arena", type: "kill" }), false);
    assert.equal(c.journey.lifetime.kills, 0);
  });

  it("offline kill does not set duration records", () => {
    const c = bareCharacter();
    ensureJourney(c);
    applyJourneyEvent(c, {
      source: "farm",
      type: "kill",
      online: false,
      catchUpId: "off-1",
      durationMs: 5000,
      enemyName: "Goblin",
    });
    assert.equal(c.journey.lifetime.kills, 1);
    assert.equal(c.journey.records.fastestWin, null);
    assert.equal(c.journey.records.longestWin, null);
  });

  it("online kill with duration updates records", () => {
    const c = bareCharacter();
    ensureJourney(c);
    applyJourneyEvent(c, {
      source: "farm",
      type: "kill",
      online: true,
      durationMs: 2500,
      enemyName: "Lobo",
      zoneId: "floresta",
    });
    assert.equal(c.journey.records.fastestWin?.value, 2500);
    assert.equal(c.journey.records.longestWin?.value, 2500);
  });

  it("offline catch-up is idempotent by catchUpId", () => {
    const c = bareCharacter();
    ensureJourney(c);
    applyJourneyEvent(c, { source: "farm", type: "offline_ms", ms: 10_000 });
    assert.equal(
      applyJourneyEvent(c, {
        source: "farm",
        type: "offline_catchup_commit",
        catchUpId: "cu-1",
      }),
      true,
    );
    assert.equal(c.journey.lifetime.offlineMs, 10_000);
    assert.equal(
      applyJourneyEvent(c, {
        source: "farm",
        type: "offline_catchup_commit",
        catchUpId: "cu-1",
      }),
      false,
    );
    applyJourneyEvent(c, { source: "farm", type: "offline_ms", ms: 5_000 });
    assert.equal(c.journey.lifetime.offlineMs, 15_000);
  });

  it("period season vs lifetime", () => {
    const c = bareCharacter();
    ensureJourney(c, { seasonKey: "2026-T1" });
    applyJourneyEvent(c, {
      source: "farm",
      type: "kill",
      online: true,
      durationMs: 100,
      seasonKey: "2026-T1",
    });
    const life = getJourneyPeriodTotals(c, "lifetime");
    const season = getJourneyPeriodTotals(c, "season", { seasonKey: "2026-T1" });
    assert.equal(life.totals.kills, 101); // 100 imported + 1
    assert.equal(season.totals.kills, 1);
  });

  it("fame overview is local scope by default", () => {
    const c = bareCharacter();
    ensureJourney(c);
    applyJourneyEvent(c, { source: "farm", type: "kill", online: true, durationMs: 100 });
    const fame = reconcileFameFromCharacters([c], { scope: "local" });
    const pub = publicFameOverview(fame);
    assert.equal(pub.scope, "local");
    assert.equal(pub.multiUser, false);
    assert.match(pub.label, /local/i);
    assert.ok(pub.globals.kills >= 1);
  });

  it("publicJourney exposes collectionStartedAt and imported separately", () => {
    const c = bareCharacter();
    const pub = publicJourney(c, "lifetime");
    assert.ok(pub.collectionStartedAt);
    assert.equal(pub.imported.goldEarnedUnclassified, 9999);
    assert.equal(pub.totals.goldEarnedCombat, 0);
    assert.equal(pub.currentGold, 500);
  });
});
