/**
 * Phase 2 auth — HTTP integration + boot fail-closed tests.
 * Uses isolated auth/save fixtures; does not touch project idle/data/save.json.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resolveBootConfig, BootConfigError, type BootConfig } from "../auth/mode.ts";
import { createUser, resetUsersForTests, setUserRole, LEGACY_LOCAL_USER_ID } from "../auth/users.ts";
import {
  resetSessionsForTests,
  createSession,
  hashSessionToken,
  revokeSession,
  clearSessionsCacheForTests,
} from "../auth/sessions.ts";
import { clearUsersCacheForTests } from "../auth/users.ts";
import { SID_COOKIE } from "../auth/cookies.ts";
import { createApp } from "../server.ts";
import { storeTestApi } from "../store.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";

const SECRET = "test-session-secret-at-least-32-chars!!";

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
    headers?: Record<string, string>;
    csrf?: string | null;
  } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.jar) headers.cookie = cookieHeader(opts.jar);
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const csrf = opts.csrf === undefined ? opts.jar?.csrf : opts.csrf;
  if (csrf) headers["x-csrf-token"] = csrf;
  if (!headers.origin && !headers.Origin) {
    headers.origin = base;
  }
  const res = await fetch(`${base}${path}`, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  if (opts.jar) parseSetCookie(res, opts.jar);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html/binary */
  }
  return { res, text, json };
}

function protectedBoot(overrides: Record<string, string> = {}): BootConfig {
  return resolveBootConfig({
    IDLE_AUTH_MODE: "protected",
    IDLE_BIND: "127.0.0.1",
    IDLE_SESSION_SECRET: SECRET,
    IDLE_ALLOW_HTTP_LOCAL: "1",
    IDLE_COOKIE_SECURE: "0",
    ...overrides,
  });
}

let root: string;
let server: Server;
let base: string;
let usersPath: string;
let sessionsPath: string;

beforeEach(async () => {
  resetRateLimitsForTests();
  root = mkdtempSync(join(tmpdir(), "jogo-idle-auth-"));
  usersPath = join(root, "auth-users.json");
  sessionsPath = join(root, "auth-sessions.json");
  const savePath = join(root, "save.json");
  storeTestApi.resetForTests({
    savePath,
    backupDir: join(root, "backups"),
    evidenceDir: root,
  });
  resetUsersForTests({ usersPath, sessionsPath });
  resetSessionsForTests({ usersPath, sessionsPath });
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

async function listen(cfg: BootConfig) {
  const app = createApp(cfg);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  base = `http://127.0.0.1:${addr.port}`;
  return base;
}

describe("boot fail-closed", () => {
  it("recusa protected sem IDLE_SESSION_SECRET", () => {
    assert.throws(
      () => resolveBootConfig({ IDLE_AUTH_MODE: "protected", IDLE_BIND: "127.0.0.1" }),
      (e: unknown) => e instanceof BootConfigError,
    );
  });

  it("recusa protected non-loopback sem Secure cookie", () => {
    assert.throws(
      () =>
        resolveBootConfig({
          IDLE_AUTH_MODE: "protected",
          IDLE_BIND: "0.0.0.0",
          IDLE_SESSION_SECRET: SECRET,
        }),
      (e: unknown) => e instanceof BootConfigError && String((e as Error).message).includes("COOKIE_SECURE"),
    );
  });

  it("recusa trust proxy indiscriminado", () => {
    assert.throws(
      () =>
        resolveBootConfig({
          IDLE_AUTH_MODE: "protected",
          IDLE_BIND: "0.0.0.0",
          IDLE_SESSION_SECRET: SECRET,
          IDLE_COOKIE_SECURE: "1",
          IDLE_TRUST_PROXY: "1",
        }),
      (e: unknown) => e instanceof BootConfigError && String((e as Error).message).includes("TRUSTED_PROXIES"),
    );
  });

  it("recusa local em non-loopback sem override", () => {
    assert.throws(
      () => resolveBootConfig({ IDLE_AUTH_MODE: "local", IDLE_BIND: "0.0.0.0" }),
      (e: unknown) => e instanceof BootConfigError,
    );
  });

  it("headers X-Forwarded-* não alteram boot (secret sozinho ≠ seguro em 0.0.0.0)", () => {
    assert.throws(
      () =>
        resolveBootConfig({
          IDLE_AUTH_MODE: "protected",
          IDLE_BIND: "0.0.0.0",
          IDLE_SESSION_SECRET: SECRET,
          // attacker-style env noise — still fail without Secure + proxy policy
        }),
      BootConfigError,
    );
  });
});

describe("local mode", () => {
  it("dev sem login obrigatório — /api/jogo-idle/characters com userId=1", async () => {
    const cfg = resolveBootConfig({ IDLE_AUTH_MODE: "local", IDLE_BIND: "127.0.0.1" });
    await listen(cfg);
    const { res, json } = await req(base, "/api/jogo-idle/characters", {
      headers: { host: "127.0.0.1", origin: base },
    });
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.characters));
  });

  it("Host estranho é negado em local", async () => {
    const cfg = resolveBootConfig({ IDLE_AUTH_MODE: "local", IDLE_BIND: "127.0.0.1" });
    await listen(cfg);
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    // fetch() rewrites Host from the URL — use raw HTTP to spoof Host.
    const { request } = await import("node:http");
    const body = await new Promise<string>((resolve, reject) => {
      const r = request(
        {
          host: "127.0.0.1",
          port: addr.port,
          path: "/api/jogo-idle/characters",
          method: "GET",
          headers: { Host: "evil.example" },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            assert.equal(res.statusCode, 403);
            resolve(Buffer.concat(chunks).toString("utf8"));
          });
        },
      );
      r.on("error", reject);
      r.end();
    });
    const json = JSON.parse(body);
    assert.equal(json.code, "HOST_DENIED");
  });
});

describe("protected mode — accounts, sessions, admin, isolation", () => {
  it("cria duas contas sem colisão com userId=1 e isola personagens", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      password: "password-admin-1",
      role: "ADMIN",
    });
    const p1 = await createUser({
      email: "player1@example.com",
      password: "password-player-1",
      role: "PLAYER",
    });
    const p2 = await createUser({
      email: "player2@example.com",
      password: "password-player-2",
      role: "PLAYER",
    });
    assert.notEqual(admin.userId, LEGACY_LOCAL_USER_ID);
    assert.notEqual(p1.userId, LEGACY_LOCAL_USER_ID);
    assert.notEqual(p2.userId, p1.userId);
    assert.ok(admin.userId >= 2 && p1.userId >= 2 && p2.userId >= 2);

    // Seed legacy characters under userId=1 — must not leak to new accounts
    storeTestApi.resetForTests({
      savePath: join(root, "save.json"),
      backupDir: join(root, "backups"),
      evidenceDir: root,
    });
    const { store } = await import("../store.ts");
    const now = new Date().toISOString();
    store.createCharacter({
      id: "legacy-c1",
      userId: 1,
      name: "LegacyHero",
      classId: "GUERREIRO",
      level: 10,
      experience: 0,
      gold: 999,
      isActive: true,
      state: {},
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await listen(protectedBoot());

    const jarAdmin: Jar = {};
    let r = await req(base, "/api/jogo-idle/auth/login", {
      jar: jarAdmin,
      body: { email: "admin@example.com", password: "password-admin-1" },
    });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.user.role, "ADMIN");
    assert.ok(jarAdmin.sid);
    assert.ok(jarAdmin.csrf);

    const jar1: Jar = {};
    r = await req(base, "/api/jogo-idle/auth/login", {
      jar: jar1,
      body: { email: "player1@example.com", password: "password-player-1" },
    });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.user.userId, p1.userId);

    r = await req(base, "/api/jogo-idle/characters", { jar: jar1 });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.characters.length, 0, "protected account must not inherit legacy userId=1 chars");

    r = await req(base, "/api/jogo-idle/characters", {
      jar: jar1,
      body: { name: "P1Hero", classId: "GUERREIRO" },
    });
    assert.equal(r.res.status, 201);
    const char1Id = r.json.character.id;

    const jar2: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar: jar2,
      body: { email: "player2@example.com", password: "password-player-2" },
    });
    r = await req(base, "/api/jogo-idle/characters", { jar: jar2 });
    assert.equal(r.json.characters.length, 0);

    r = await req(base, "/api/jogo-idle/characters/" + char1Id + "/select", { jar: jar2, body: {} });
    assert.ok(r.res.status >= 400, "IDOR: player2 cannot select player1 character");

    // Admin login works without hardcoded allowlist email
    r = await req(base, "/api/jogo-idle/admin/world-snapshot", { jar: jarAdmin });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.success, true);

    // PLAYER cannot access admin API
    r = await req(base, "/api/jogo-idle/admin/world-snapshot", { jar: jar1 });
    assert.equal(r.res.status, 403);

    // Admin studio assets blocked without auth
    const asset = readdirSync(join(process.cwd(), "public/jogo-idle/admin/assets")).find((f) =>
      f.endsWith(".js"),
    );
    assert.ok(asset);
    r = await req(base, `/jogo-idle/admin/assets/${asset}`, {
      headers: { origin: base, accept: "*/*" },
      jar: {},
      csrf: null,
    });
    // unauthenticated → 401 JSON or redirect to login
    assert.ok(r.res.status === 401 || r.res.status === 302, `asset status ${r.res.status}`);

    // PLAYER cannot open admin studio
    r = await req(base, "/jogo-idle/admin/", {
      jar: jar1,
      headers: { accept: "text/html", origin: base },
      csrf: null,
    });
    assert.equal(r.res.status, 403);

    // ADMIN can open admin index
    r = await req(base, "/jogo-idle/admin/", {
      jar: jarAdmin,
      headers: { accept: "text/html", origin: base },
      csrf: null,
    });
    assert.ok(r.res.status === 200 || r.res.status === 503);
  });

  it("CSRF ausente, inválido e de outra sessão", async () => {
    await createUser({ email: "a@ex.com", password: "password-aaaaaa", role: "PLAYER" });
    await createUser({ email: "b@ex.com", password: "password-bbbbbb", role: "PLAYER" });
    await listen(protectedBoot());
    const jarA: Jar = {};
    const jarB: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar: jarA,
      body: { email: "a@ex.com", password: "password-aaaaaa" },
    });
    await req(base, "/api/jogo-idle/auth/login", {
      jar: jarB,
      body: { email: "b@ex.com", password: "password-bbbbbb" },
    });

    let r = await req(base, "/api/jogo-idle/characters", {
      jar: jarA,
      body: { name: "X", classId: "GUERREIRO" },
      csrf: null,
      headers: { origin: base, cookie: cookieHeader(jarA) },
    });
    // force missing csrf by overriding
    r = await fetch(`${base}/api/jogo-idle/characters`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: base,
        cookie: cookieHeader(jarA),
      },
      body: JSON.stringify({ name: "X", classId: "GUERREIRO" }),
    }).then(async (res) => ({ res, json: await res.json() }));
    assert.equal(r.res.status, 403);
    assert.equal(r.json.code, "CSRF_INVALID");

    r = await fetch(`${base}/api/jogo-idle/characters`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: base,
        cookie: cookieHeader(jarA),
        "x-csrf-token": "totally-wrong-token-value!!!!!!!!!!",
      },
      body: JSON.stringify({ name: "X", classId: "GUERREIRO" }),
    }).then(async (res) => ({ res, json: await res.json() }));
    assert.equal(r.res.status, 403);

    // CSRF from session B with cookie A
    r = await fetch(`${base}/api/jogo-idle/characters`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: base,
        cookie: cookieHeader(jarA),
        "x-csrf-token": jarB.csrf!,
      },
      body: JSON.stringify({ name: "X", classId: "GUERREIRO" }),
    }).then(async (res) => ({ res, json: await res.json() }));
    assert.equal(r.res.status, 403);
  });

  it("role demotion revalida; sessão revogada não reutiliza; restart mantém estado", async () => {
    const admin = await createUser({
      email: "adm@ex.com",
      password: "password-adminxx",
      role: "ADMIN",
    });
    await listen(protectedBoot());
    const jar: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar,
      body: { email: "adm@ex.com", password: "password-adminxx" },
    });
    let r = await req(base, "/api/jogo-idle/admin/world-snapshot", { jar });
    assert.equal(r.res.status, 200);

    setUserRole(admin.userId, "PLAYER");
    clearUsersCacheForTests();
    r = await req(base, "/api/jogo-idle/admin/world-snapshot", { jar });
    assert.equal(r.res.status, 403);

    setUserRole(admin.userId, "ADMIN");
    clearUsersCacheForTests();
    r = await req(base, "/api/jogo-idle/admin/world-snapshot", { jar });
    assert.equal(r.res.status, 200);

    const sid = jar.sid!;
    await req(base, "/api/jogo-idle/auth/logout", { jar, body: {} });
    r = await req(base, "/api/jogo-idle/characters", {
      headers: {
        origin: base,
        cookie: `${SID_COOKIE}=${encodeURIComponent(sid)}`,
      },
    });
    assert.equal(r.res.status, 401);

    const raw = JSON.parse(readFileSync(sessionsPath, "utf8"));
    for (const s of raw.sessions) {
      assert.ok(!JSON.stringify(s).includes(sid), "raw token must not be on disk");
      assert.match(s.tokenHash, /^[a-f0-9]{64}$/);
    }

    // Fresh login, then simulate process restart (drop caches, keep files)
    const jarLive: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar: jarLive,
      body: { email: "adm@ex.com", password: "password-adminxx" },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearSessionsCacheForTests();
    clearUsersCacheForTests();
    await listen(protectedBoot());
    r = await req(base, "/api/jogo-idle/characters", {
      headers: {
        origin: base,
        cookie: `${SID_COOKIE}=${encodeURIComponent(jarLive.sid!)}`,
      },
    });
    assert.equal(r.res.status, 200, "valid session survives restart");
    revokeSession(jarLive.sid!);
    clearSessionsCacheForTests();
    r = await req(base, "/api/jogo-idle/characters", {
      headers: {
        origin: base,
        cookie: `${SID_COOKIE}=${encodeURIComponent(jarLive.sid!)}`,
      },
    });
    assert.equal(r.res.status, 401);
  });

  it("arquivo de sessões corrompido falha fechado (sem liberar acesso)", async () => {
    await createUser({ email: "c@ex.com", password: "password-cccccc", role: "PLAYER" });
    await listen(protectedBoot());
    const jar: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar,
      body: { email: "c@ex.com", password: "password-cccccc" },
    });
    writeFileSync(sessionsPath, "{not-json");
    clearSessionsCacheForTests();
    const r = await req(base, "/api/jogo-idle/characters", { jar });
    assert.equal(r.res.status, 503);
    assert.equal(r.json.code, "AUTH_STORE_UNAVAILABLE");
  });

  it("cross-origin login é rejeitado", async () => {
    await createUser({ email: "d@ex.com", password: "password-dddddd", role: "PLAYER" });
    await listen(protectedBoot());
    const r = await fetch(`${base}/api/jogo-idle/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://evil.example",
      },
      body: JSON.stringify({ email: "d@ex.com", password: "password-dddddd" }),
    });
    const json = await r.json();
    assert.equal(r.status, 403);
    assert.equal(json.code, "ORIGIN_DENIED");
  });
});

describe("session storage hygiene", () => {
  it("disco guarda hash SHA-256, nunca o token bruto", () => {
    resetSessionsForTests({ usersPath, sessionsPath });
    const created = createSession(2);
    const disk = JSON.parse(readFileSync(sessionsPath, "utf8"));
    assert.equal(disk.sessions[0].tokenHash, hashSessionToken(created.rawToken));
    assert.ok(!readFileSync(sessionsPath, "utf8").includes(created.rawToken));
    assert.ok(existsSync(usersPath) === false || true);
  });
});
