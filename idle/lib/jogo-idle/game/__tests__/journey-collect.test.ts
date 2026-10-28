import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJourneyEvent,
  ensureJourney,
  journeyOnSeasonRollover,
  takeFameDelta,
} from "../journey.ts";
import { emptyCareer } from "../career.ts";
import { reconcileFameFromCharacters } from "../fame.ts";

describe("journey collect / reset / privacy", () => {
  it("season rollover preserves lifetime and past seasons", () => {
    const c = {
      id: "c-reset",
      name: "Hero",
      classId: "GUERREIRO",
      level: 50,
      career: { ...emptyCareer(), kills: 5 },
    };
    ensureJourney(c, { seasonKey: "2026-T1" });
    applyJourneyEvent(c, {
      source: "farm",
      type: "kill",
      online: true,
      durationMs: 900,
      seasonKey: "2026-T1",
    });
    const lifeBefore = c.journey.lifetime.kills;
    journeyOnSeasonRollover(c, {
      closedSeasonKey: "2026-T1",
      nextSeasonKey: "2026-T2",
    });
    assert.equal(c.journey.lifetime.kills, lifeBefore);
    assert.equal(c.journey.seasons["2026-T1"].kills, lifeBefore);
    assert.equal(c.journey.meta.activeSeasonKey, "2026-T2");
    assert.equal(c.journey.seasons["2026-T2"].kills, 0);
  });

  it("fame delta is taken once", () => {
    const c = { id: "c2", name: "A", classId: "MAGO", level: 1, career: emptyCareer() };
    ensureJourney(c);
    applyJourneyEvent(c, { source: "farm", type: "kill", online: true, durationMs: 100 });
    const d1 = takeFameDelta(c);
    assert.ok(d1 && d1.kills >= 1);
    const d2 = takeFameDelta(c);
    assert.equal(d2, null);
  });

  it("privacy hides name in reconcile hall", () => {
    const c = {
      id: "anon-1",
      name: "Secret",
      classId: "ARQUEIRO",
      level: 20,
      career: emptyCareer(),
    };
    ensureJourney(c);
    c.journey.privacy.hideFromPublicRankings = true;
    applyJourneyEvent(c, {
      source: "farm",
      type: "kill",
      online: true,
      durationMs: 100,
    });
    // pad kills
    for (let i = 0; i < 5; i++) {
      applyJourneyEvent(c, { source: "farm", type: "kill", online: true, durationMs: 100 });
    }
    const fame = reconcileFameFromCharacters([c], { scope: "local" });
    const hall = fame.hall.soulReaper;
    assert.ok(hall);
    assert.equal(hall.characterName, "Aventureiro anônimo");
    assert.equal(hall.anonymous, true);
  });

  it("ascension event does not clear season totals", () => {
    const c = {
      id: "asc",
      name: "Cel",
      classId: "MAGO",
      level: 500,
      career: emptyCareer(),
    };
    ensureJourney(c, { seasonKey: "2026-T1" });
    applyJourneyEvent(c, { source: "farm", type: "kill", online: true, durationMs: 50 });
    applyJourneyEvent(c, { source: "farm", type: "ascension" });
    applyJourneyEvent(c, { source: "farm", type: "gold_spent_ritual", amount: 100 });
    assert.equal(c.journey.lifetime.kills, 1);
    assert.equal(c.journey.seasons["2026-T1"].kills, 1);
    assert.equal(c.journey.lifetime.ascensions, 1);
    assert.equal(c.journey.lifetime.goldSpentRitual, 100);
  });
});
