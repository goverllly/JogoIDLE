import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  resolveVisualLook,
  APPEARANCE_SCHEMA_VERSION,
} from "../appearance.ts";
import { createCharacter, setAppearance, ensureAppearance } from "../character.ts";
import { unlockCosmetic, setEquippedCosmetics, ensureCosmetics } from "../cosmetics.ts";

describe("appearance — normalize e schema", () => {
  it("clampa IDs inválidos e preenche schemaVersion", () => {
    const look = normalizeAppearance(
      {
        skin: "neon_pink",
        armor: "hacked",
        metal: "??",
        capeColor: "rainbow",
        scale: 99,
        stance: "Dance",
        helmet: false,
        cape: true,
      },
      "GUERREIRO",
    );
    assert.equal(look.schemaVersion, APPEARANCE_SCHEMA_VERSION);
    assert.equal(look.skin, DEFAULT_APPEARANCE.skin);
    assert.equal(look.armor, DEFAULT_APPEARANCE.armor);
    assert.equal(look.metal, DEFAULT_APPEARANCE.metal);
    assert.equal(look.capeColor, DEFAULT_APPEARANCE.capeColor);
    assert.equal(look.scale, 1.12);
    assert.equal(look.stance, "Idle");
    assert.equal(look.helmet, false);
    assert.equal(look.cape, true);
  });

  it("Arqueiro não tem elmo mesmo se cliente pedir", () => {
    const look = normalizeAppearance({ helmet: true, cape: false }, "ARQUEIRO");
    assert.equal(look.helmet, false);
    assert.equal(look.cape, false);
  });

  it("personagem antigo sem schema continua jogável", () => {
    const c = createCharacter("Veterano", "MAGO", {
      skin: "tan",
      armor: "royal",
      metal: "silver",
      capeColor: "navy",
      helmet: true,
      cape: true,
    });
    delete c.appearance.schemaVersion;
    const ensured = ensureAppearance(c);
    assert.equal(ensured.schemaVersion, APPEARANCE_SCHEMA_VERSION);
    assert.equal(ensured.skin, "tan");
    assert.equal(ensured.armor, "royal");
  });
});

describe("appearance — bloqueio pós-criação", () => {
  it("create já vem com appearanceLocked", () => {
    const c = createCharacter("Heroi", "GUERREIRO", {
      skin: "bronze",
      armor: "crimson",
      helmet: false,
      cape: true,
      capeColor: "black",
    });
    assert.equal(c.appearanceLocked, true);
    assert.equal(c.appearance.skin, "bronze");
    assert.equal(c.appearance.helmet, false);
  });

  it("setAppearance sempre 403", () => {
    const c = createCharacter("Lock", "BARBARO", { skin: "olive" });
    assert.throws(() => setAppearance(c, { skin: "ash" }), (err: Error & { status?: number }) => {
      assert.match(err.message, /criação/i);
      assert.equal(err.status, 403);
      return true;
    });
    assert.equal(c.appearance.skin, "olive");
  });
});

describe("cosmetics — não mutam birth appearance", () => {
  it("setEquippedCosmetics preserva appearance", () => {
    const c = createCharacter("Look", "GUERREIRO", {
      skin: "pale",
      armor: "steel",
      capeColor: "ivory",
      cape: true,
      helmet: false,
    });
    ensureCosmetics(c);
    unlockCosmetic(c, "cape_celestial");
    unlockCosmetic(c, "tint_obsidian");
    const before = structuredClone(c.appearance);
    setEquippedCosmetics(c, { capeId: "cape_celestial", armorTintId: "tint_obsidian" });
    assert.deepEqual(c.appearance, before);
    assert.equal(c.cosmetics.capeId, "cape_celestial");
    assert.equal(c.cosmetics.armorTintId, "tint_obsidian");
  });

  it("resolveVisualLook ignora cosméticos e devolve birth look", () => {
    const c = createCharacter("Pure", "MAGO", {
      skin: "ash",
      armor: "abyss",
      capeColor: "purple",
      metal: "sapphire",
      helmet: false,
    });
    unlockCosmetic(c, "cape_ember");
    setEquippedCosmetics(c, { capeId: "cape_ember" });
    const look = resolveVisualLook(c);
    assert.equal(look.skin, "ash");
    assert.equal(look.armor, "abyss");
    assert.equal(look.capeColor, "purple");
    assert.equal(look.metal, "sapphire");
    assert.equal(look.helmet, false);
  });
});
