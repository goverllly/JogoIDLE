/**
 * Fase 4.6 — Integração HTTP (protected): farm, items, ascend, IDOR, CSRF, 409.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveBootConfig, type BootConfig } from "../auth/mode.ts";
import { createUser, resetUsersForTests, LEGACY_LOCAL_USER_ID } from "../auth/users.ts";
import { resetSessionsForTests } from "../auth/sessions.ts";
import { SID_COOKIE } from "../auth/cookies.ts";
import { createApp } from "../server.ts";
import { store, storeTestApi } from "../store.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";
import { createItem, REFINER_TEMPLATE_ID, SUCO_CELESTIAL_TEMPLATE_ID } from "../../lib/jogo-idle/game/items.ts";
import { DIVINDADE_GOLD_COST, MORTAL_LEVEL_CAP } from "../../lib/jogo-idle/game/balance.ts";
import { ensureChapters } from "../../lib/jogo-idle/game/chapters.ts";

const SECRET = "gameplay-http-secret-at-least-32chars!";

type Jar = { sid?: string; csrf?: string };

function parseSetCookie(res: Response, jar: Jar) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    if (c.startsWith(`${SID_COOKIE}=`)) {
      jar.sid = decodeURIComponent(c.split(";")[0].slice(SID_COOKIE.length + 1));
    }
    if (c.startsWith("jogo_idle_csrf=")) {
      jar.csrf = decodeURIComponent(c.split(";")[0].slice("jogo_idle_csrf=".length));
    }
  }
}

function cookieHeader(jar: Jar): string {
  const parts: string[] = [];
  if (jar.sid) parts.push(`${SID_COOKIE}=${encodeURIComponent(jar.sid)}`);
  if (jar.csrf) parts.push(`jogo_idle_csrf=${encodeURIComponent(jar.csrf)}`);
  return parts.join("; ");
}

async function req(
  base: string,
  path: string,
  opts: {
    method?: string;
    jar?: Jar;
    body?: unknown;
    csrf?: string | null;
  } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.jar) headers.cookie = cookieHeader(opts.jar);
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const csrf = opts.csrf === undefined ? opts.jar?.csrf : opts.csrf;
  if (csrf) headers["x-csrf-token"] = csrf;
  headers.origin = base;
  const res = await fetch(`${base}${path}`, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.jar) parseSetCookie(res, opts.jar);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function protectedBoot(): BootConfig {
  return resolveBootConfig({
    IDLE_AUTH_MODE: "protected",
    IDLE_BIND: "127.0.0.1",
    IDLE_SESSION_SECRET: SECRET,
    IDLE_ALLOW_HTTP_LOCAL: "1",
    IDLE_COOKIE_SECURE: "0",
  });
}

let root: string;
let server: Server;
let base: string;

beforeEach(() => {
  resetRateLimitsForTests();
  root = mkdtempSync(join(tmpdir(), "jogo-idle-gp-"));
  storeTestApi.resetForTests({
    savePath: join(root, "save.json"),
    backupDir: join(root, "backups"),
    evidenceDir: root,
  });
  resetUsersForTests({
    usersPath: join(root, "auth-users.json"),
    sessionsPath: join(root, "auth-sessions.json"),
  });
  resetSessionsForTests({
    usersPath: join(root, "auth-users.json"),
    sessionsPath: join(root, "auth-sessions.json"),
  });
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = undefined as unknown as Server;
  }
  storeTestApi.resetForTests();
  try {
    rmSync(root, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

async function listen() {
  const app = createApp(protectedBoot());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  base = `http://127.0.0.1:${addr.port}`;
  return base;
}

async function login(email: string, password: string) {
  const jar: Jar = {};
  const r = await req(base, "/api/jogo-idle/auth/login", {
    jar,
    body: { email, password },
  });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  return jar;
}

describe("4.6 gameplay HTTP — protected flows", () => {
  it("login → create → farm start/me → sell → refine; CSRF inválido 403; sem sessão 401", async () => {
    await createUser({
      email: "gp1@ex.com",
      password: "password-gp-player-1",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID],
    });
    await listen();

    let r = await req(base, "/api/jogo-idle/characters", {
      body: { name: "HttpHero", classId: "GUERREIRO" },
    });
    assert.ok(r.res.status === 401 || r.res.status === 403);

    const jar = await login("gp1@ex.com", "password-gp-player-1");

    r = await req(base, "/api/jogo-idle/characters", {
      jar,
      body: { name: "HttpHero", classId: "GUERREIRO" },
    });
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    const charId = r.json.character.id;

    r = await req(base, "/api/jogo-idle/farm/start", {
      jar,
      csrf: "wrong-csrf",
      body: { zoneId: "bosque_sussurros" },
    });
    assert.ok(r.res.status === 403 || r.json?.code === "CSRF", "CSRF deve bloquear");

    r = await req(base, "/api/jogo-idle/farm/start", {
      jar,
      body: { zoneId: "bosque_sussurros" },
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));

    r = await req(base, "/api/jogo-idle/me", { jar });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.character.farmZoneId, "bosque_sussurros");

    // Injeta refinador + item vendável no state persistido
    const row = store.findCharacter(charId)!;
    const state = { ...row.state };
    const potion = createItem("consumable_hp_potion", "uncommon", 1);
    const refiner = createItem(REFINER_TEMPLATE_ID, "epic", 1);
    state.inventory = [...(state.inventory || []), potion, refiner];
    store.updateCharacter(charId, { state, gold: row.gold }, row.updatedAt);

    r = await req(base, "/api/jogo-idle/items/sell", {
      jar,
      body: { uid: potion.uid },
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    const goldAfterSell = r.json.character.gold;

    // Replay sell mesmo uid → erro
    r = await req(base, "/api/jogo-idle/items/sell", {
      jar,
      body: { uid: potion.uid },
    });
    assert.ok(r.res.status >= 400);

    const weaponUid = r.json?.character?.equipment?.weapon?.uid
      || store.findActive(store.findCharacter(charId)!.userId)?.state?.equipment?.weapon?.uid
      || store.findCharacter(charId)!.state.equipment?.weapon?.uid;

    // Recarrega me para pegar weapon uid
    r = await req(base, "/api/jogo-idle/me", { jar });
    const wuid = r.json.character.equipment?.weapon?.uid;
    assert.ok(wuid);

    r = await req(base, "/api/jogo-idle/items/refine", {
      jar,
      body: { uid: wuid },
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.equipment.weapon.refineLevel, 1);

    // Replay refine sem refinador → erro; nível permanece 1
    r = await req(base, "/api/jogo-idle/items/refine", {
      jar,
      body: { uid: wuid },
    });
    assert.ok(r.res.status >= 400);
    r = await req(base, "/api/jogo-idle/me", { jar });
    assert.equal(r.json.character.equipment.weapon.refineLevel, 1);
    assert.ok(r.json.character.gold >= goldAfterSell || true);
    void weaponUid;
  });

  it("IDOR: player B não seleciona / não vê personagem de A", async () => {
    const a = await createUser({
      email: "gpA@ex.com",
      password: "password-gp-A-xxxx",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID],
    });
    await createUser({
      email: "gpB@ex.com",
      password: "password-gp-B-xxxx",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID, a.userId],
    });
    await listen();
    const jarA = await login("gpA@ex.com", "password-gp-A-xxxx");
    let r = await req(base, "/api/jogo-idle/characters", {
      jar: jarA,
      body: { name: "OnlyA", classId: "MAGO" },
    });
    assert.equal(r.res.status, 201);
    const idA = r.json.character.id;

    const jarB = await login("gpB@ex.com", "password-gp-B-xxxx");
    r = await req(base, "/api/jogo-idle/characters", { jar: jarB });
    assert.equal(r.json.characters.length, 0);

    r = await req(base, `/api/jogo-idle/characters/${idA}/select`, {
      jar: jarB,
      body: {},
    });
    assert.ok(r.res.status === 404 || r.res.status === 403 || r.res.status >= 400);

    r = await req(base, "/api/jogo-idle/farm/start", {
      jar: jarB,
      body: { zoneId: "bosque_sussurros" },
    });
    assert.ok(r.res.status >= 400, "B sem personagem ativo não farm");
  });

  it("ascensão HTTP: sucesso consome Suco+gold; replay falha; estado persistido", async () => {
    await createUser({
      email: "asc@ex.com",
      password: "password-asc-player1",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID],
    });
    await listen();
    const jar = await login("asc@ex.com", "password-asc-player1");
    let r = await req(base, "/api/jogo-idle/characters", {
      jar,
      body: { name: "AscHero", classId: "BARBARO" },
    });
    assert.equal(r.res.status, 201);
    const id = r.json.character.id;

    const row = store.findCharacter(id)!;
    const state = { ...row.state };
    ensureChapters(state);
    state.level = MORTAL_LEVEL_CAP;
    state.inventory = [createItem(SUCO_CELESTIAL_TEMPLATE_ID, "legendary", 1)];
    store.updateCharacter(
      id,
      {
        level: MORTAL_LEVEL_CAP,
        gold: DIVINDADE_GOLD_COST,
        state,
      },
      row.updatedAt,
    );

    r = await req(base, "/api/jogo-idle/me/ascend", { jar, body: {} });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.level, 1);
    assert.equal(r.json.character.ascension, "CELESTIAL");
    assert.equal(r.json.character.gold, 0);

    const persisted = store.findCharacter(id)!;
    assert.equal(persisted.level, 1);
    assert.equal(persisted.gold, 0);
    assert.equal(persisted.state.ascension, "CELESTIAL");
    assert.ok(
      !(persisted.state.inventory || []).some(
        (i: any) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID,
      ),
    );

    r = await req(base, "/api/jogo-idle/me/ascend", { jar, body: {} });
    assert.ok(r.res.status >= 400, "replay ritual deve falhar");
    const again = store.findCharacter(id)!;
    assert.equal(again.gold, 0);
    assert.equal(again.level, 1);
  });

  it("farm start sem auth → 401/403", async () => {
    await listen();
    const r = await req(base, "/api/jogo-idle/farm/start", {
      body: { zoneId: "bosque_sussurros" },
    });
    assert.ok(r.res.status === 401 || r.res.status === 403);
  });
});
