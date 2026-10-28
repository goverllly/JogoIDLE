/**
 * Fase 6.2 — backup com o servidor parado e restauração numa instância nova.
 * Diretórios só em os.tmpdir(). Não usa idle/data.
 *
 * Sessões: o cookie guarda um token aleatório; o disco guarda o SHA-256.
 * IDLE_SESSION_SECRET é exigido para o boot protected, mas não assina o cookie.
 * Copiar auth-sessions.json mantém a sessão válida mesmo com outro segredo.
 * Sem esse arquivo, o cookie antigo falha e o login por senha continua válido.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";
import { resolveBootConfig, type BootConfig } from "../auth/mode.ts";
import { createUser, resetUsersForTests, LEGACY_LOCAL_USER_ID } from "../auth/users.ts";
import { resetSessionsForTests } from "../auth/sessions.ts";
import { SID_COOKIE } from "../auth/cookies.ts";
import { createApp } from "../server.ts";
import { store, storeTestApi } from "../store.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";
import {
  createItem,
  DEFAULT_REFINER_PRICE,
  REFINER_TEMPLATE_ID,
  setRefinerPrice,
  starterWeaponId,
} from "../../lib/jogo-idle/game/items.ts";
import { applyCsrfHeaders } from "../../public/jogo-idle/http.js";

const SECRET_A = "restore-drill-secret-aaaa-32chars-min";
const SECRET_B = "restore-drill-secret-bbbb-32chars-min";
const PLAYER_EMAIL = "restore-player@example.test";
const PLAYER_PASSWORD = "restore-player-password";
const ADMIN_EMAIL = "restore-admin@example.test";
const ADMIN_PASSWORD = "restore-admin-password";
const OTHER_EMAIL = "restore-other@example.test";
const OTHER_PASSWORD = "restore-other-password";
const PRICE = 424242;
const IDLE = join(dirname(fileURLToPath(import.meta.url)), "../..");

type Jar = { sid?: string; csrf?: string };

function boot(secret: string): BootConfig {
  return resolveBootConfig({
    IDLE_AUTH_MODE: "protected",
    IDLE_BIND: "127.0.0.1",
    IDLE_SESSION_SECRET: secret,
    IDLE_ALLOW_HTTP_LOCAL: "1",
    IDLE_COOKIE_SECURE: "0",
  });
}

function cookieHeader(jar: Jar): string {
  return [
    jar.sid ? `${SID_COOKIE}=${encodeURIComponent(jar.sid)}` : "",
    jar.csrf ? `jogo_idle_csrf=${encodeURIComponent(jar.csrf)}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function absorbCookies(res: Response, jar: Jar) {
  for (const c of res.headers.getSetCookie?.() || []) {
    if (c.startsWith(`${SID_COOKIE}=`)) {
      jar.sid = decodeURIComponent(c.split(";")[0].slice(SID_COOKIE.length + 1));
    }
    if (c.startsWith("jogo_idle_csrf=")) {
      jar.csrf = decodeURIComponent(c.split(";")[0].slice("jogo_idle_csrf=".length));
    }
  }
}

async function api(base: string, path: string, jar: Jar, body?: unknown) {
  const method = body === undefined ? "GET" : "POST";
  const headers = applyCsrfHeaders(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  }, cookieHeader(jar), base);
  headers.set("cookie", cookieHeader(jar));
  headers.set("origin", base);
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  absorbCookies(res, jar);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

let srcDir = "";
let destDir = "";
let parent: Server | undefined;
let child: ChildProcess | undefined;

afterEach(async () => {
  if (child && child.exitCode == null && !child.killed) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child?.once("exit", resolve));
  }
  child = undefined;
  if (parent) {
    await new Promise<void>((resolve) => parent?.close(() => resolve()));
    parent = undefined;
  }
  try {
    setRefinerPrice(DEFAULT_REFINER_PRICE, { persist: false });
  } catch {
    /* o preço em memória não pode vazar para a suíte */
  }
  storeTestApi.resetForTests({
    savePath: join(tmpdir(), "jogo-idle-restore-reset", "save.json"),
    backupDir: join(tmpdir(), "jogo-idle-restore-reset", "backups"),
    evidenceDir: join(tmpdir(), "jogo-idle-restore-reset"),
  });
  for (const dir of [srcDir, destDir]) {
    if (dir && dir.startsWith(tmpdir())) rmSync(dir, { recursive: true, force: true });
  }
  srcDir = "";
  destDir = "";
});

describe("restauração isolada com serviço parado", () => {
  it("recupera conta, personagem, inventário, catálogo e papéis numa instância nova", async () => {
    resetRateLimitsForTests();
    srcDir = mkdtempSync(join(tmpdir(), "jogo-idle-restore-src-"));
    assert.ok(srcDir.startsWith(tmpdir()));
    assert.ok(!srcDir.includes(`${join("idle", "data")}`));
    storeTestApi.resetForTests({
      savePath: join(srcDir, "save.json"),
      backupDir: join(srcDir, "backups"),
      evidenceDir: srcDir,
    });
    resetUsersForTests({
      usersPath: join(srcDir, "auth-users.json"),
      sessionsPath: join(srcDir, "auth-sessions.json"),
    });
    resetSessionsForTests({
      usersPath: join(srcDir, "auth-users.json"),
      sessionsPath: join(srcDir, "auth-sessions.json"),
    });

    const player = await createUser({
      email: PLAYER_EMAIL,
      password: PLAYER_PASSWORD,
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID],
    });
    const admin = await createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "ADMIN",
      avoidUserIds: [LEGACY_LOCAL_USER_ID, player.userId],
    });
    await createUser({
      email: OTHER_EMAIL,
      password: OTHER_PASSWORD,
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID, player.userId, admin.userId],
    });

    parent = createServer(createApp(boot(SECRET_A)));
    await new Promise<void>((resolve) => parent?.listen(0, "127.0.0.1", resolve));
    const addr = parent.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${addr.port}`;

    const jar: Jar = {};
    let r = await api(base, "/api/jogo-idle/auth/login", jar, {
      email: PLAYER_EMAIL,
      password: PLAYER_PASSWORD,
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    const oldSid = jar.sid;
    const oldCsrf = jar.csrf;

    r = await api(base, "/api/jogo-idle/characters", jar, {
      name: "RestoreHero",
      classId: "GUERREIRO",
    });
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    const charId = r.json.character.id;
    const baseStr = r.json.character.attributes.str;

    const row = store.findCharacter(charId)!;
    const state = { ...row.state, unspentPoints: 2 };
    const potion = createItem("consumable_hp_potion", "uncommon", 1);
    const extra = createItem(starterWeaponId("GUERREIRO"), "uncommon", 1);
    const refiner = createItem(REFINER_TEMPLATE_ID, "epic", 1);
    state.inventory = [...(state.inventory || []), potion, extra, refiner];
    store.updateCharacter(charId, { state }, row.updatedAt);

    r = await api(base, "/api/jogo-idle/me/attributes", jar, { str: 1, int: 0, dex: 0, con: 0 });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(base, "/api/jogo-idle/items/equip", jar, { uid: extra.uid });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(base, "/api/jogo-idle/items/sell", jar, { uid: potion.uid });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(base, "/api/jogo-idle/items/refine", jar, { uid: extra.uid });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(base, "/api/jogo-idle/farm/start", jar, { zoneId: "bosque_sussurros" });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(base, "/api/jogo-idle/farm/stop", jar, {});
    assert.equal(r.res.status, 200, JSON.stringify(r.json));

    const adminJar: Jar = {};
    r = await api(base, "/api/jogo-idle/auth/login", adminJar, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert.equal(r.res.status, 200);
    r = await api(base, "/api/jogo-idle/admin/config", adminJar, { refinerPrice: PRICE });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.merchant.refinerPrice, PRICE);

    r = await api(base, "/api/jogo-idle/me", jar);
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    const snap = r.json.character;
    assert.equal(snap.id, charId);
    assert.equal(snap.attributes.str, baseStr + 1);
    assert.equal(store.findCharacter(charId)?.userId, player.userId);
    const usersFile = readFileSync(join(srcDir, "auth-users.json"), "utf8");
    assert.match(usersFile, /restore-player@example\.test/);
    assert.doesNotMatch(usersFile, /pedro|gmail|hotmail/i);

    await new Promise<void>((resolve) => parent?.close(() => resolve()));
    parent = undefined;

    destDir = mkdtempSync(join(tmpdir(), "jogo-idle-restore-dst-"));
    cpSync(srcDir, destDir, { recursive: true });
    for (const name of ["save.json", "auth-users.json", "auth-sessions.json"]) {
      assert.ok(readFileSync(join(destDir, name), "utf8").length > 20, name);
    }
    setRefinerPrice(1, { persist: false });
    assert.equal(setRefinerPrice(1, { persist: false }), 1);

    const port = await freePort();
    const childBase = `http://127.0.0.1:${port}`;
    const env = { ...process.env };
    for (const key of [
      "IDLE_SKIP_LISTEN",
      "IDLE_AUTH_DIR",
      "IDLE_SAVE_PATH",
      "IDLE_AUTH_USERS_PATH",
      "IDLE_AUTH_SESSIONS_PATH",
      "IDLE_BACKUP_DIR",
    ]) {
      delete env[key];
    }
    env.IDLE_AUTH_MODE = "protected";
    env.IDLE_BIND = "127.0.0.1";
    env.IDLE_ALLOW_HTTP_LOCAL = "1";
    env.IDLE_COOKIE_SECURE = "0";
    env.IDLE_SESSION_SECRET = SECRET_B;
    env.IDLE_DATA_DIR = destDir;
    env.PORT = String(port);

    let log = "";
    child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
      cwd: IDLE,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (buf) => {
      log += String(buf);
    });
    child.stderr?.on("data", (buf) => {
      log += String(buf);
    });
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`boot timeout\n${log}`)), 20000);
      const tick = () => {
        if (log.includes("Lobby:")) {
          clearTimeout(timer);
          resolve();
        }
      };
      child?.stdout?.on("data", tick);
      child?.stderr?.on("data", tick);
      child?.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`child exit ${code}\n${log}`));
      });
    });
    await ready;

    const stale: Jar = { sid: oldSid, csrf: oldCsrf };
    r = await api(childBase, "/api/jogo-idle/me", stale);
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.id, charId);
    assert.equal(r.json.character.name, "RestoreHero");
    assert.equal(r.json.character.attributes.str, snap.attributes.str);
    assert.equal(r.json.character.gold, snap.gold);
    assert.equal(r.json.character.level, snap.level);
    const gear = r.json.character.equipment;
    const landed = gear.weapon?.uid === extra.uid ? gear.weapon : gear.offhand;
    assert.equal(landed?.uid, extra.uid);
    assert.equal(landed?.refineLevel, 1);
    assert.equal(
      (r.json.character.inventory || []).some((it: { uid: string }) => it.uid === potion.uid),
      false,
    );

    r = await api(childBase, "/api/jogo-idle/meta", stale);
    assert.equal(r.json.merchant.refinerPrice, PRICE);

    const fresh: Jar = {};
    r = await api(childBase, "/api/jogo-idle/auth/login", fresh, {
      email: PLAYER_EMAIL,
      password: PLAYER_PASSWORD,
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await api(childBase, "/api/jogo-idle/me", fresh);
    assert.equal(r.json.character.id, charId);

    const other: Jar = {};
    r = await api(childBase, "/api/jogo-idle/auth/login", other, {
      email: OTHER_EMAIL,
      password: OTHER_PASSWORD,
    });
    assert.equal(r.res.status, 200);
    r = await api(childBase, "/api/jogo-idle/characters", other);
    assert.equal(r.json.characters.length, 0);
    r = await api(childBase, "/api/jogo-idle/admin/actions", other);
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "ADMIN_REQUIRED");

    const adminFresh: Jar = {};
    r = await api(childBase, "/api/jogo-idle/auth/login", adminFresh, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert.equal(r.res.status, 200);
    r = await api(childBase, "/api/jogo-idle/admin/actions", adminFresh);
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.ok(Array.isArray(r.json.actions));
    assert.ok(r.json.actions.length > 0);

    child.kill("SIGTERM");
    await new Promise((resolve) => child?.once("exit", resolve));
    child = undefined;
  });
});
