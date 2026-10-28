/**
 * Fase 6.2 — o botão de duelo some; o cenário de caça #arena permanece.
 * Não há deep link ?duel ou ?pvp. O hash #arena não é interceptado.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Arena PvP oculta, caça preservada", () => {
  it("esconde só os botões de duelo e não monta o modal", () => {
    const play = read("public/jogo-idle/play.html");
    const stage = play.match(/<section id="arena"[^>]*>/)?.[0] || "";
    assert.match(stage, /id="arena"/);
    assert.doesNotMatch(stage, /\shidden\b/);
    assert.match(play, /id="arena-combat-btn"[\s\S]*?\bhidden\b/);
    assert.match(play, /id="arena-combat-btn"[\s\S]*?\bdisabled\b/);
    assert.match(play, /Arena de duelos indisponível/);
    assert.doesNotMatch(play, /title="Arena de duelos com aposta"/);

    const css = read("public/jogo-idle/theme-ref.css");
    assert.match(css, /#arena-combat-btn\[hidden\][\s\S]*display:\s*none !important/);
    assert.doesNotMatch(css, /#arena\[hidden\]/);

    const app = read("public/jogo-idle/app.js");
    assert.match(app, /import \{ createArenaUI \} from '\.\/arena-ui\.js'/);
    assert.match(app, /const arenaUi = null/);
    assert.doesNotMatch(app, /createArenaUI\(/);
    assert.doesNotMatch(app, /arenaUi\.open\(/);
    assert.doesNotMatch(app, /location\.hash/);
    assert.doesNotMatch(app, /[?&]duel=/);
    assert.doesNotMatch(app, /[?&]pvp=/);
    assert.doesNotMatch(app, /searchParams/);

    const ui = read("public/jogo-idle/arena-ui.js");
    assert.match(ui, /export function createArenaUI/);
    assert.match(ui, /Duelos com aposta/);

    const server = read("src/server.ts");
    assert.match(server, /Arena PvP desligada neste standalone/);
    assert.match(server, /501/);

    const legacy = read("public/jogo-idle/index.html");
    assert.match(legacy, /class="nav__item soon"[^>]*>[\s\S]*Arena/);
    assert.doesNotMatch(legacy, /href="[^"]*arena/i);
  });
});
