/**
 * Fase 6.2 — o cliente lê jogo_idle_csrf do cookie e envia X-CSRF-Token.
 * Não desliga a validação do servidor. Dados só em diretório temporário.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveBootConfig, type BootConfig } from "../auth/mode.ts";
import { createUser, resetUsersForTests, LEGACY_LOCAL_USER_ID } from "../auth/users.ts";
import { resetSessionsForTests } from "../auth/sessions.ts";
import { SID_COOKIE } from "../auth/cookies.ts";
import { createApp } from "../server.ts";
import { store, storeTestApi } from "../store.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";
import { createItem, REFINER_TEMPLATE_ID, starterWeaponId } from "../../lib/jogo-idle/game/items.ts";
import {
  applyCsrfHeaders,
  csrfTokenFromCookieHeader,
  isSameOriginRequestUrl,
  loginRedirectFor,
  rejectIfFailed,
  sanitizeLoginNext,
} from "../../public/jogo-idle/http.js";

const SECRET = "client-csrf-secret-at-least-32-chars!";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

function cookieHeader(jar: Jar, mode: "both" | "sid" | "csrf" = "both"): string {
  const parts: string[] = [];
  if ((mode === "both" || mode === "sid") && jar.sid) {
    parts.push(`${SID_COOKIE}=${encodeURIComponent(jar.sid)}`);
  }
  if ((mode === "both" || mode === "csrf") && jar.csrf) {
    parts.push(`jogo_idle_csrf=${encodeURIComponent(jar.csrf)}`);
  }
  return parts.join("; ");
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
  root = mkdtempSync(join(tmpdir(), "jogo-idle-csrf-"));
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
  server = createServer(createApp(protectedBoot()));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  base = `http://127.0.0.1:${addr.port}`;
}

/** Uma única ida à rede, com o mesmo helper do browser. Sem segundo POST. */
async function clientReq(
  path: string,
  opts: {
    method?: string;
    jar?: Jar;
    body?: unknown;
    cookieMode?: "both" | "sid" | "csrf";
    csrfOverride?: string | null;
    pageOrigin?: string | null;
  } = {},
) {
  const method = opts.method || (opts.body !== undefined ? "POST" : "GET");
  const cookie = opts.jar ? cookieHeader(opts.jar, opts.cookieMode || "both") : "";
  const initHeaders: Record<string, string> = { "X-Trace": "kept" };
  if (opts.body !== undefined) initHeaders["Content-Type"] = "application/json";
  const headers = applyCsrfHeaders(path, { method, headers: initHeaders }, cookie, opts.pageOrigin === undefined ? base : opts.pageOrigin);
  assert.equal(headers.get("X-Trace"), "kept");
  if (opts.csrfOverride !== undefined) {
    if (opts.csrfOverride) headers.set("X-CSRF-Token", opts.csrfOverride);
    else headers.delete("X-CSRF-Token");
  }
  if (cookie) headers.set("cookie", cookie);
  headers.set("origin", base);
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.jar) parseSetCookie(res, opts.jar);
  const json = await res.json().catch(() => ({}));
  return { res, json, sentCsrf: headers.get("x-csrf-token") };
}

async function login(email: string, password: string) {
  const jar: Jar = {};
  const r = await clientReq("/api/jogo-idle/auth/login", { jar, body: { email, password } });
  assert.equal(r.res.status, 200, JSON.stringify(r.json));
  assert.ok(jar.sid);
  assert.ok(jar.csrf);
  assert.equal(r.sentCsrf, null, "login público não leva CSRF");
  return jar;
}

describe("http.js — token só do cookie CSRF", () => {
  it("ignora o sid, preserva headers e recusa URL externa ou //", () => {
    const secret = "csrf-token-value";
    const sid = "session-secret-not-csrf";
    const header = `jogo_idle_sid=${encodeURIComponent(sid)}; jogo_idle_csrf=${encodeURIComponent(secret)}`;
    assert.equal(csrfTokenFromCookieHeader(header), secret);
    assert.equal(csrfTokenFromCookieHeader(`jogo_idle_sid=${encodeURIComponent(secret)}`), null);
    assert.equal(csrfTokenFromCookieHeader("jogo_idle_csrf_extra=nope"), null);

    const kept = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
    const out = applyCsrfHeaders("/api/jogo-idle/farm/start", { method: "POST", headers: kept }, header, "http://127.0.0.1:8787");
    assert.equal(out.get("content-type"), "application/json");
    assert.equal(out.get("accept"), "application/json");
    assert.equal(out.get("x-csrf-token"), secret);
    assert.notEqual(out.get("x-csrf-token"), sid);

    const get = applyCsrfHeaders("/api/jogo-idle/me", { method: "GET", headers: kept }, header, "http://127.0.0.1:8787");
    assert.equal(get.get("x-csrf-token"), null);

    assert.equal(isSameOriginRequestUrl("//evil.example/api", "http://127.0.0.1"), false);
    const external = applyCsrfHeaders("//evil.example/steal", { method: "POST" }, header, "http://127.0.0.1");
    assert.equal(external.get("x-csrf-token"), null);
    const other = applyCsrfHeaders("https://evil.example/api", { method: "POST" }, header, "http://127.0.0.1:8787");
    assert.equal(other.get("x-csrf-token"), null);
    const same = applyCsrfHeaders("http://127.0.0.1:8787/api/jogo-idle/farm/start", { method: "POST" }, header, "http://127.0.0.1:8787");
    assert.equal(same.get("x-csrf-token"), secret);
  });

  it("login e lobby não formam um ciclo de redirecionamento", () => {
    assert.equal(sanitizeLoginNext("//evil.example"), "/jogo-idle/lobby.html");
    assert.equal(sanitizeLoginNext("https://evil.example/jogo-idle/play.html"), "/jogo-idle/lobby.html");
    assert.equal(sanitizeLoginNext("/jogo-idle/login.html"), "/jogo-idle/lobby.html");
    assert.equal(sanitizeLoginNext("/jogo-idle/login.html?next=/jogo-idle/lobby.html"), "/jogo-idle/lobby.html");
    assert.equal(sanitizeLoginNext("/jogo-idle/play.html"), "/jogo-idle/play.html");
    assert.equal(loginRedirectFor("/jogo-idle/login.html", ""), null);
    const once = loginRedirectFor("/jogo-idle/lobby.html", "");
    assert.equal(once, "/jogo-idle/login.html?next=" + encodeURIComponent("/jogo-idle/lobby.html"));
    assert.equal(loginRedirectFor("/jogo-idle/login.html", `?next=${encodeURIComponent("/jogo-idle/lobby.html")}`), null);

    const jumps: string[] = [];
    assert.throws(() =>
      rejectIfFailed(
        { ok: false, status: 403 },
        { error: "Invalid CSRF token", code: "CSRF_INVALID" },
        { pathname: "/jogo-idle/play.html", search: "", assign: (u) => jumps.push(u) },
      ),
    );
    assert.deepEqual(jumps, []);
    assert.throws(() =>
      rejectIfFailed(
        { ok: false, status: 401 },
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { pathname: "/jogo-idle/play.html", search: "", assign: (u) => jumps.push(u) },
      ),
    );
    assert.equal(jumps.length, 1);
    assert.match(jumps[0], /^\/jogo-idle\/login\.html\?next=/);
    assert.doesNotMatch(jumps[0], /login\.html\?next=.*login\.html/);
  });
});

describe("cliente protected — mutações com o helper", () => {
  it("rejeita sem token, token alheio e token inválido; aceita o token do cookie", async () => {
    const player = await createUser({
      email: "csrf-player@ex.com",
      password: "password-csrf-player",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID],
    });
    const other = await createUser({
      email: "csrf-other@ex.com",
      password: "password-csrf-other",
      role: "PLAYER",
      avoidUserIds: [LEGACY_LOCAL_USER_ID, player.userId],
    });
    await createUser({
      email: "csrf-admin@ex.com",
      password: "password-csrf-admin",
      role: "ADMIN",
      avoidUserIds: [LEGACY_LOCAL_USER_ID, player.userId, other.userId],
    });
    await listen();

    const jar = await login("csrf-player@ex.com", "password-csrf-player");
    const otherJar = await login("csrf-other@ex.com", "password-csrf-other");

    let r = await clientReq("/api/jogo-idle/characters", {
      jar,
      cookieMode: "sid",
      body: { name: "CsrfHero", classId: "GUERREIRO" },
    });
    assert.equal(r.sentCsrf, null);
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "CSRF_INVALID");

    r = await clientReq("/api/jogo-idle/characters", {
      jar,
      csrfOverride: otherJar.csrf,
      body: { name: "CsrfHero", classId: "GUERREIRO" },
    });
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "CSRF_INVALID");

    r = await clientReq("/api/jogo-idle/characters", {
      jar,
      csrfOverride: "not-a-real-token",
      body: { name: "CsrfHero", classId: "GUERREIRO" },
    });
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "CSRF_INVALID");

    r = await clientReq("/api/jogo-idle/characters", {
      jar,
      body: { name: "CsrfHero", classId: "GUERREIRO", appearance: { helmet: false } },
    });
    assert.equal(r.sentCsrf, jar.csrf);
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

    r = await clientReq("/api/jogo-idle/me/attributes", {
      jar,
      body: { str: 1, int: 0, dex: 0, con: 0 },
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.attributes.str, baseStr + 1);
    assert.equal(r.json.character.unspentPoints, 1);

    r = await clientReq("/api/jogo-idle/items/equip", { jar, body: { uid: extra.uid } });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    const equipped = r.json.character.equipment;
    const landed = equipped.weapon?.uid === extra.uid ? equipped.weapon : equipped.offhand;
    assert.equal(landed?.uid, extra.uid);

    r = await clientReq("/api/jogo-idle/items/sell", { jar, body: { uid: potion.uid } });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.ok(!r.json.character.inventory?.some((it: { uid: string }) => it.uid === potion.uid));

    r = await clientReq("/api/jogo-idle/items/refine", { jar, body: { uid: extra.uid } });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(
      r.json.character.equipment.weapon?.uid === extra.uid
        ? r.json.character.equipment.weapon.refineLevel
        : r.json.character.equipment.offhand.refineLevel,
      1,
    );

    r = await clientReq("/api/jogo-idle/farm/start", { jar, body: { zoneId: "bosque_sussurros" } });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await clientReq("/api/jogo-idle/farm/stop", { jar, body: {} });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.farmZoneId, null);

    const adminJar = await login("csrf-admin@ex.com", "password-csrf-admin");
    const before = await clientReq("/api/jogo-idle/meta", { jar: adminJar, method: "GET" });
    const originalPrice = before.json.merchant.refinerPrice;
    r = await clientReq("/api/jogo-idle/admin/config", {
      jar: adminJar,
      body: { refinerPrice: 424242 },
    });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.merchant.refinerPrice, 424242);
    const restored = await clientReq("/api/jogo-idle/admin/config", {
      jar: adminJar,
      body: { refinerPrice: originalPrice },
    });
    assert.equal(restored.res.status, 200, JSON.stringify(restored.json));

    r = await clientReq("/api/jogo-idle/admin/config", {
      jar,
      body: { refinerPrice: 111 },
    });
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "ADMIN_REQUIRED");

    r = await clientReq("/api/jogo-idle/auth/logout", { jar, body: {} });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    r = await clientReq("/api/jogo-idle/characters", { jar, method: "GET" });
    assert.equal(r.res.status, 401);
    assert.equal(r.json.code, "AUTH_REQUIRED");

    const again = await login("csrf-player@ex.com", "password-csrf-player");
    r = await clientReq("/api/jogo-idle/characters", { jar: again, method: "GET" });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.characters.length, 1);
    assert.equal(r.json.characters[0].id, charId);
    assert.equal(store.findCharacter(charId)?.userId, player.userId);
    r = await clientReq("/api/jogo-idle/me", { jar: again, method: "GET" });
    assert.equal(r.res.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.character.id, charId);
    assert.equal(r.json.character.attributes.str, baseStr + 1);
  });
});

describe("fontes do cliente", () => {
  it("um helper só, sem sid, sem localStorage e sem segundo POST", () => {
    const files = [
      "public/jogo-idle/app.js",
      "public/jogo-idle/lobby.html",
      "public/jogo-idle/criar.js",
      "public/jogo-idle/galeria.js",
      "public/jogo-idle/cronicas.js",
      "public/jogo-idle/login.html",
      "admin-ui/src/App.tsx",
    ];
    for (const rel of files) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      assert.match(text, /http\.js/, rel);
      assert.equal(text.includes("jogo_idle_sid"), false, rel);
      assert.equal(text.includes('sessionStorage.setItem("jogo_idle_csrf"'), false, rel);
      assert.equal(text.includes("sessionStorage.getItem(\"jogo_idle_csrf\")"), false, rel);
      assert.equal(text.includes("localStorage"), rel === "public/jogo-idle/app.js" ? text.includes("localStorage") : false);
    }
    const http = readFileSync(join(ROOT, "public/jogo-idle/http.js"), "utf8");
    assert.match(http, /jogo_idle_csrf/);
    assert.equal(http.includes("jogo_idle_sid="), false);
    assert.match(http, /nunca localStorage/);
    assert.equal(/localStorage\.(get|set)Item/.test(http), false);
    assert.equal((http.match(/fetch\(/g) || []).length, 0, "o helper não dispara a rede");

    const app = readFileSync(join(ROOT, "public/jogo-idle/app.js"), "utf8");
    const apiStart = app.indexOf("async function api(");
    const apiEnd = app.indexOf("async function apiMutation(");
    const apiBody = app.slice(apiStart, apiEnd);
    assert.equal((apiBody.match(/await fetch\(/g) || []).length, 1);
    const login = readFileSync(join(ROOT, "public/jogo-idle/login.html"), "utf8");
    assert.equal((login.match(/location\.href/g) || []).length, 1);
  });
});
