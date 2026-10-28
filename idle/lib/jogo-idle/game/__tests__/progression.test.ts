/**
 * Fase 4.2 — Progressão, capítulos e ascensão (integridade / STALE).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyRewards,
  performClassificationRitual,
  canRitualAscend,
  createCharacter,
} from "../character.ts";
import {
  ensureChapters,
  validateEnterChapter,
  applyEnterChapter,
  publicChaptersView,
} from "../chapters.ts";
import { MORTAL_LEVEL_CAP as CAP, xpToNextLevel, levelCapFor, DIVINDADE_GOLD_COST } from "../balance.ts";
import { createItem, SUCO_CELESTIAL_TEMPLATE_ID } from "../items.ts";
import { store, storeTestApi } from "../../../../src/store.ts";
import { freshCharacter } from "./test-helpers.ts";

function ritualReadyCharacter() {
  const c = freshCharacter("GUERREIRO", "Ascender");
  c.level = CAP;
  c.experience = 0;
  c.gold = DIVINDADE_GOLD_COST;
  c.inventory = [createItem(SUCO_CELESTIAL_TEMPLATE_ID, "legendary", 1)];
  ensureChapters(c);
  return c;
}

describe("4.2 progression — XP e caps", () => {
  it("xpToNextLevel cresce com o nível e é finito", () => {
    const a = xpToNextLevel(1);
    const b = xpToNextLevel(50);
    const c = xpToNextLevel(200);
    assert.ok(a > 0 && b > a && c > b);
    assert.ok([a, b, c].every(Number.isFinite));
  });

  it("applyRewards level-up concede unspentPoints e respeita cap mortal", () => {
    const c = freshCharacter("BARBARO");
    const need = xpToNextLevel(1);
    applyRewards(c, { xp: need, gold: 10 });
    assert.equal(c.level, 2);
    assert.ok(c.unspentPoints >= 5);
    assert.equal(c.gold, 10);
    assert.equal(levelCapFor(c), CAP);

    c.level = CAP;
    c.experience = 0;
    const xpBefore = c.experience;
    applyRewards(c, { xp: xpToNextLevel(CAP) * 2, gold: 0 });
    assert.equal(c.level, CAP, "não passa do cap mortal");
    assert.ok(c.experience >= xpBefore);
  });

  it("após CELESTIAL o cap sobe e level reinicia via ritual", () => {
    const c = ritualReadyCharacter();
    assert.ok(canRitualAscend(c));
    const result = performClassificationRitual(c);
    assert.equal(result.classification, "CELESTIAL");
    assert.equal(c.ascension, "CELESTIAL");
    assert.equal(c.level, 1);
    assert.equal(c.experience, 0);
    assert.equal(levelCapFor(c), 700);
    assert.equal(c.gold, 0);
    assert.ok(!c.inventory.some((i: any) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID));
  });
});

describe("4.2 progression — ritual transacional", () => {
  it("falha de requisitos não consome Suco nem gold", () => {
    const c = ritualReadyCharacter();
    c.level = 499;
    const gold = c.gold;
    const invLen = c.inventory.length;
    assert.throws(() => performClassificationRitual(c), /nível/i);
    assert.equal(c.gold, gold);
    assert.equal(c.inventory.length, invLen);
    assert.equal(c.ascension, null);

    c.level = CAP;
    c.gold = 100;
    assert.throws(() => performClassificationRitual(c), /gold/i);
    assert.equal(c.gold, 100);
    assert.equal(c.inventory.length, invLen);

    c.gold = DIVINDADE_GOLD_COST;
    c.inventory = [];
    assert.throws(() => performClassificationRitual(c), /Suco/i);
    assert.equal(c.gold, DIVINDADE_GOLD_COST);
  });

  it("segundo ritual sem requisitos falha; primeiro é único", () => {
    const c = ritualReadyCharacter();
    performClassificationRitual(c);
    assert.equal(c.chapters.currentChapterId, "II");
    assert.throws(() => performClassificationRitual(c), /nível|Suco|gold/i);
    // Sem segundo consumo: gold já 0, inventário sem suco
    assert.equal(c.gold, 0);
    assert.ok(!c.inventory.some((i: any) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID));
  });

  it("cadeia Celestial → Divino com novo Suco+gold+lv500", () => {
    const c = ritualReadyCharacter();
    performClassificationRitual(c);
    c.level = CAP;
    c.gold = DIVINDADE_GOLD_COST;
    c.inventory.push(createItem(SUCO_CELESTIAL_TEMPLATE_ID, "legendary", 1));
    const r = performClassificationRitual(c);
    assert.equal(r.classification, "DIVINO");
    assert.equal(c.chapters.currentChapterId, "III");
    assert.equal(c.level, 1);
  });
});

describe("4.2 progression — capítulos", () => {
  it("Cap.II bloqueado antes do ritual; liberado depois", () => {
    const c = freshCharacter("MAGO");
    ensureChapters(c);
    const blocked = validateEnterChapter(c, "II");
    assert.equal(blocked.ok, false);
    assert.ok(blocked.missingRequirements.length > 0);

    const ready = ritualReadyCharacter();
    performClassificationRitual(ready);
    const ok = validateEnterChapter(ready, "II");
    assert.equal(ok.ok, true);
    // Já está em II após ritual
    assert.equal(ready.chapters.currentChapterId, "II");
  });

  it("applyEnterChapter preserva buckets e troca level/xp", () => {
    const c = ritualReadyCharacter();
    performClassificationRitual(c);
    // Progressa um pouco no Cap.II
    c.level = 10;
    c.experience = 123;
    // Desbloqueia Cap.I já completed — voltar para I
    const viewBefore = publicChaptersView(c);
    assert.ok(viewBefore);
    applyEnterChapter(c, "I");
    assert.equal(c.chapters.currentChapterId, "I");
    assert.equal(c.level, 500, "bucket Cap.I ficou em 500 no ritual");
    // Cap.II bucket salvou progresso
    assert.equal(c.chapters.season.progress.II.level, 10);
    assert.equal(c.chapters.season.progress.II.xp, 123);
  });

  it("capítulo inválido → 400", () => {
    const c = freshCharacter("ARQUEIRO");
    assert.throws(() => validateEnterChapter(c, "IX"), /inválido/i);
  });
});

describe("4.2 progression — STALE / persistência na ascensão", () => {
  it("STALE no updateCharacter após ritual não grava no disco; reload intacto", () => {
    const root = mkdtempSync(join(tmpdir(), "idle-p42-"));
    const savePath = join(root, "save.json");
    const backupDir = join(root, "backups");
    storeTestApi.resetForTests({ savePath, backupDir, evidenceDir: root });
    try {
      const state = ritualReadyCharacter();
      const now = new Date().toISOString();
      store.createCharacter({
        id: "asc-stale",
        userId: 1,
        name: state.name,
        classId: state.classId,
        level: CAP,
        experience: 0,
        gold: DIVINDADE_GOLD_COST,
        isActive: true,
        state,
        lastSeenAt: null,
        createdAt: now,
        updatedAt: now,
      });
      const row = store.findCharacter("asc-stale", 1)!;
      assert.throws(
        () =>
          store.updateCharacter(
            row.id,
            {
              level: 1,
              experience: 0,
              gold: 0,
              state: { ...row.state, ascension: "CELESTIAL", level: 1 },
            },
            "token-inexistente-stale",
          ),
        (err: any) => err?.code === "STALE_CHARACTER",
      );
      const after = store.findCharacter("asc-stale", 1)!;
      assert.equal(after.level, CAP);
      assert.equal(after.gold, DIVINDADE_GOLD_COST);
      const disk = JSON.parse(readFileSync(savePath, "utf8"));
      const saved = disk.characters.find((x: any) => x.id === "asc-stale");
      assert.equal(saved.level, CAP);
      assert.equal(saved.gold, DIVINDADE_GOLD_COST);
    } finally {
      storeTestApi.resetForTests();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ritual + persist com expected correto grava uma vez; replay não re-concede", () => {
    const root = mkdtempSync(join(tmpdir(), "idle-p42b-"));
    const savePath = join(root, "save.json");
    const backupDir = join(root, "backups");
    storeTestApi.resetForTests({ savePath, backupDir, evidenceDir: root });
    try {
      const state = ritualReadyCharacter();
      const now = new Date().toISOString();
      store.createCharacter({
        id: "asc-ok",
        userId: 1,
        name: state.name,
        classId: state.classId,
        level: state.level,
        experience: 0,
        gold: state.gold,
        isActive: true,
        state,
        lastSeenAt: null,
        createdAt: now,
        updatedAt: now,
      });
      let row = store.findCharacter("asc-ok", 1)!;
      const char = {
        ...row.state,
        id: row.id,
        name: row.name,
        classId: row.classId,
        level: row.level,
        experience: row.experience,
        gold: row.gold,
      };
      performClassificationRitual(char);
      store.updateCharacter(
        row.id,
        {
          name: char.name,
          classId: char.classId,
          level: char.level,
          experience: char.experience,
          gold: char.gold,
          state: char,
        },
        row.updatedAt,
      );
      row = store.findCharacter("asc-ok", 1)!;
      assert.equal(row.level, 1);
      assert.equal(row.gold, 0);
      assert.equal(row.state.ascension, "CELESTIAL");
      const again = {
        ...row.state,
        id: row.id,
        name: row.name,
        classId: row.classId,
        level: row.level,
        experience: row.experience,
        gold: row.gold,
      };
      assert.throws(() => performClassificationRitual(again), /nível|Suco|gold/i);
      const final = store.findCharacter("asc-ok", 1)!;
      assert.equal(final.gold, 0);
      assert.equal(final.level, 1);
    } finally {
      storeTestApi.resetForTests();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
