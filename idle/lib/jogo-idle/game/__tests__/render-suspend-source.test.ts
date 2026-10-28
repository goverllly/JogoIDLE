/**
 * Fase 5.7 — garante que setRenderSuspended não limpa timeline (diferente de setActive(false)).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../public/jogo-idle");

describe("5.7 render suspend source contract", () => {
  it("setRenderSuspended existe e não chama timeline.clear", () => {
    const src = readFileSync(join(root, "scene3d.js"), "utf8");
    assert.match(src, /function setRenderSuspended\s*\(/);
    const start = src.indexOf("function setRenderSuspended");
    assert.ok(start >= 0);
    const body = src.slice(start, start + 350);
    assert.doesNotMatch(body, /timeline\.clear/);
    assert.match(body, /syncAnimationLoop/);
  });

  it("setActive(false) path ainda limpa timeline (desativação explícita)", () => {
    const src = readFileSync(join(root, "scene3d.js"), "utf8");
    const start = src.indexOf("function setActive");
    const body = src.slice(start, start + 900);
    assert.match(body, /timeline\.clear/);
  });

  it("app.js usa setRenderSuspended no visibilitychange, não setActive(false)", () => {
    const src = readFileSync(join(root, "app.js"), "utf8");
    assert.match(src, /visibilitychange/);
    assert.match(src, /setRenderSuspended\?\.\(true\)/);
    assert.match(src, /setRenderSuspended\?\.\(false\)/);
    // Não deve desativar a arena só por aba oculta (ignora menção em comentário).
    const block = src.slice(src.indexOf("visibilitychange"), src.indexOf("visibilitychange") + 500);
    assert.doesNotMatch(block, /scene\.setActive\s*\(\s*false/);
  });
});
