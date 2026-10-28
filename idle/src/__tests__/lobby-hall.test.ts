/**
 * Lobby 2.0 — o salão 3D fica só na prévia do lobby.
 * O estúdio de criação continua no preview sem cenário.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("lobby — salão de heróis", () => {
  const lobby = read("public/jogo-idle/lobby.html");
  const criar = read("public/jogo-idle/criar.html");
  const preview = read("public/jogo-idle/preview.js");

  it("isola o cenário no lobby e preserva o postMessage", () => {
    assert.match(lobby, /src="\/jogo-idle\/preview\.html\?hall=1"/);
    assert.match(criar, /src="\/jogo-idle\/preview\.html"/);
    assert.equal(criar.includes("hall=1"), false);
    assert.match(preview, /previewParams\.has\("hall"\)/);
    assert.match(preview, /event\.origin !== window\.location\.origin/);
    assert.match(lobby, /jogo-idle:preview/);
    assert.match(lobby, /from "\.\/http\.js"/);
    assert.equal(/cl[eé]rigo/i.test(lobby), false);
    assert.match(lobby, /Guerreiro, Bárbaro, Mago e Arqueiro/);
    assert.match(lobby, /id="btn-play"/);
    assert.match(lobby, /id="btn-delete"/);
    assert.match(lobby, /confirm\(/);
  });

  it("reusa poucos props KayKit e Kenney já presentes no jogo", () => {
    const urls = [
      "public/jogo-idle/assets/kaykit/dungeon/wall_arched.gltf",
      "public/jogo-idle/assets/kaykit/dungeon/pillar.gltf",
      "public/jogo-idle/assets/kaykit/dungeon/torch_lit.gltf",
      "public/jogo-idle/assets/kaykit/forest/Tree_1_A_Color1.gltf",
      "public/jogo-idle/assets/props/nature/tree_single_A.gltf",
      "public/jogo-idle/assets/kaykit/dungeon/floor_tile_small_weeds_A.gltf",
    ];
    for (const rel of urls) {
      assert.equal(existsSync(join(ROOT, rel)), true, rel);
      assert.match(preview, new RegExp(rel.replace("public/jogo-idle", "").replace(/\./g, "\\.")));
    }
    const hallStart = preview.indexOf("async function buildHall");
    assert.ok(hallStart > 0);
    const hallBody = preview.slice(hallStart, preview.indexOf("if (hallStage)"));
    assert.ok((hallBody.match(/url:/g) || []).length <= 9);
  });
});
