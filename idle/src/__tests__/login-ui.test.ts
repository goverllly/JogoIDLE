/**
 * Portal de login: contrato da página e códigos reais de POST /auth/login.
 * Não toca no save pessoal. Diretório de auth é temporário.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveBootConfig } from "../auth/mode.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";
import { resetSessionsForTests } from "../auth/sessions.ts";
import { createUser, resetUsersForTests } from "../auth/users.ts";
import { createApp } from "../server.ts";
import { storeTestApi } from "../store.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SECRET = "login-ui-secret-at-least-32-chars!!";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function loginRouteSlice(routes: string): string {
  const start = routes.indexOf('app.post("/api/jogo-idle/auth/login"');
  const end = routes.indexOf('app.post("/api/jogo-idle/auth/logout"');
  assert.ok(start >= 0 && end > start, "recorte do POST /auth/login");
  return routes.slice(start, end);
}

describe("portal de login", () => {
  const html = read("public/jogo-idle/login.html");
  const css = read("public/jogo-idle/login.css");
  const routes = read("src/auth/routes.ts");

  it("mapeia cada código que o POST /auth/login realmente devolve", () => {
    const codes = [...loginRouteSlice(routes).matchAll(/code:\s*"([A-Z0-9_]+)"/g)].map((m) => m[1]);
    assert.deepEqual(codes, ["LOCAL_MODE", "ORIGIN_DENIED", "RATE_LIMIT", "AUTH_FAILED"]);
    for (const code of codes) {
      assert.match(html, new RegExp(code), code);
    }
    assert.match(html, /CSRF_INVALID/);
    assert.match(html, /AUTH_STORE_UNAVAILABLE/);
    assert.equal(html.includes("data.error"), false);
    assert.equal(html.includes("Invalid credentials"), false);
  });

  it("usa o endpoint real, o e-mail e um único POST", () => {
    assert.match(html, /from "\.\/http\.js"/);
    assert.match(html, /sanitizeLoginNext/);
    assert.match(html, /\/api\/jogo-idle\/auth\/login/);
    assert.match(html, /\/api\/jogo-idle\/auth\/me/);
    assert.match(html, /type="email"/);
    assert.match(html, /autocomplete="username"/);
    assert.match(html, /autocomplete="current-password"/);
    assert.match(html, /email:\s*emailInput\.value/);
    assert.match(html, /password:\s*passwordInput\.value/);
    assert.equal((html.match(/method:\s*"POST"/g) || []).length, 1);
    assert.equal((html.match(/await fetch\(/g) || []).length, 2);
    assert.match(html, /if \(pending\) return/);
    assert.equal((html.match(/location\.href/g) || []).length, 1);
    assert.match(html, /location\.replace\(next\)/);
    assert.match(html, /<form[^>]*\shidden/);
    assert.match(html, /class="login-page is-checking"/);
    assert.equal(html.includes("jogo_idle_sid"), false);
    assert.equal(html.includes("localStorage"), false);
    assert.equal(html.includes("sessionStorage"), false);
    assert.equal(/esqueci|criar conta|cadastre-se|código de convite/i.test(html), false);
    assert.equal(html.includes("maximum-scale"), false);
  });

  it("separa o enquadramento desktop e mobile e mantém o gradiente sem a imagem", () => {
    assert.match(css, /--login-background-image:\s*url\("\/jogo-idle\/assets\/login\/castelo-lua\.webp"\)/);
    assert.match(css, /--login-background-position:\s*22% center/);
    assert.match(css, /--login-background-position-mobile:\s*32% center/);
    assert.match(css, /background-position:\s*var\(--login-background-position\)/);
    assert.match(css, /background-position:\s*var\(--login-background-position-mobile\)/);
    const scene = css.slice(css.indexOf(".login-scene {"), css.indexOf(".login-scene__art"));
    assert.match(scene, /linear-gradient/);
    assert.equal(scene.includes("--login-background-image"), false);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /font-size:\s*1rem/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /#f4b52b/);
    assert.match(css, /#071524/);
    const webp = readFileSync(join(ROOT, "public/jogo-idle/assets/login/castelo-lua.webp"));
    assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(webp.subarray(8, 12).toString("ascii"), "WEBP");
    assert.ok(webp.length > 100_000 && webp.length < 800_000);
  });
});

type Jar = { sid?: string; csrf?: string; sidHttpOnly?: boolean; csrfHttpOnly?: boolean };

function parseSetCookie(res: Response, jar: Jar) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    if (c.startsWith("jogo_idle_sid=")) {
      jar.sid = decodeURIComponent(c.split(";")[0].slice("jogo_idle_sid=".length));
      jar.sidHttpOnly = /;\s*HttpOnly/i.test(c);
    }
    if (c.startsWith("jogo_idle_csrf=")) {
      jar.csrf = decodeURIComponent(c.split(";")[0].slice("jogo_idle_csrf=".length));
      jar.csrfHttpOnly = /;\s*HttpOnly/i.test(c);
    }
  }
}

async function postLogin(base: string, body: { email: string; password: string }, jar?: Jar) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: base,
  };
  if (jar?.sid) headers.cookie = `jogo_idle_sid=${encodeURIComponent(jar.sid)}`;
  const res = await fetch(`${base}/api/jogo-idle/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (jar) parseSetCookie(res, jar);
  const json = await res.json();
  return { res, json };
}

describe("login protegido com dados temporários", () => {
  let root = "";
  let server: Server | undefined;
  let base = "";

  beforeEach(() => {
    resetRateLimitsForTests();
    root = mkdtempSync(join(tmpdir(), "jogo-idle-login-ui-"));
    const usersPath = join(root, "auth-users.json");
    const sessionsPath = join(root, "auth-sessions.json");
    storeTestApi.resetForTests({
      savePath: join(root, "save.json"),
      backupDir: join(root, "backups"),
      evidenceDir: root,
    });
    resetUsersForTests({ usersPath, sessionsPath });
    resetSessionsForTests({ usersPath, sessionsPath });
  });

  afterEach(async () => {
    if (server) {
      const current = server;
      server = undefined;
      await new Promise<void>((resolve) => current.close(() => resolve()));
    }
    storeTestApi.resetForTests();
    if (root) rmSync(root, { recursive: true, force: true });
    root = "";
  });

  async function listen(mode: "protected" | "local") {
    const cfg = resolveBootConfig(
      mode === "protected"
        ? {
            IDLE_AUTH_MODE: "protected",
            IDLE_BIND: "127.0.0.1",
            IDLE_SESSION_SECRET: SECRET,
            IDLE_ALLOW_HTTP_LOCAL: "1",
            IDLE_COOKIE_SECURE: "0",
          }
        : { IDLE_AUTH_MODE: "local", IDLE_BIND: "127.0.0.1" },
    );
    server = createServer(createApp(cfg));
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    base = `http://127.0.0.1:${addr.port}`;
  }

  it("não distingue usuário ausente de senha errada e limita a rajada", async () => {
    await createUser({
      email: "guest@example.com",
      password: "password-guest-1",
      role: "PLAYER",
    });
    await listen("protected");
    const wrong = await postLogin(base, { email: "guest@example.com", password: "wrong-password" });
    const missing = await postLogin(base, { email: "nobody@example.com", password: "wrong-password" });
    assert.equal(wrong.res.status, 401);
    assert.equal(missing.res.status, 401);
    assert.equal(wrong.json.code, "AUTH_FAILED");
    assert.equal(missing.json.code, "AUTH_FAILED");
    assert.equal(wrong.json.error, missing.json.error);

    for (let i = 0; i < 3; i++) {
      const again = await postLogin(base, { email: "guest@example.com", password: "wrong-password" });
      assert.equal(again.res.status, 401);
      assert.equal(again.json.code, "AUTH_FAILED");
    }
    const limited = await postLogin(base, { email: "guest@example.com", password: "password-guest-1" });
    assert.equal(limited.res.status, 429);
    assert.equal(limited.json.code, "RATE_LIMIT");
    assert.equal(limited.json.success, false);
  });

  it("abre sessão, exige CSRF no logout e aceita um novo login", async () => {
    await createUser({
      email: "guest@example.com",
      password: "password-guest-1",
      role: "PLAYER",
    });
    await listen("protected");
    const jar: Jar = {};
    const ok = await postLogin(base, { email: "guest@example.com", password: "password-guest-1" }, jar);
    assert.equal(ok.res.status, 200);
    assert.equal(ok.json.success, true);
    assert.equal(ok.json.user.role, "PLAYER");
    assert.equal(jar.sidHttpOnly, true);
    assert.equal(jar.csrfHttpOnly, false);
    assert.ok(jar.sid);
    assert.ok(jar.csrf);

    const me = await fetch(`${base}/api/jogo-idle/auth/me`, {
      headers: { cookie: `jogo_idle_sid=${encodeURIComponent(jar.sid!)}`, origin: base },
    });
    const meJson = await me.json();
    assert.equal(meJson.authenticated, true);
    assert.equal(meJson.user.email, "guest@example.com");

    const bareLogout = await fetch(`${base}/api/jogo-idle/auth/logout`, {
      method: "POST",
      headers: {
        origin: base,
        cookie: `jogo_idle_sid=${encodeURIComponent(jar.sid!)}; jogo_idle_csrf=${encodeURIComponent(jar.csrf!)}`,
      },
    });
    const bareJson = await bareLogout.json();
    assert.equal(bareLogout.status, 403);
    assert.equal(bareJson.code, "CSRF_INVALID");

    const logout = await fetch(`${base}/api/jogo-idle/auth/logout`, {
      method: "POST",
      headers: {
        origin: base,
        "x-csrf-token": jar.csrf!,
        cookie: `jogo_idle_sid=${encodeURIComponent(jar.sid!)}; jogo_idle_csrf=${encodeURIComponent(jar.csrf!)}`,
      },
    });
    assert.equal(logout.status, 200);

    const after = await fetch(`${base}/api/jogo-idle/auth/me`, {
      headers: { cookie: `jogo_idle_sid=${encodeURIComponent(jar.sid!)}`, origin: base },
    });
    assert.equal((await after.json()).authenticated, false);

    const again = await postLogin(base, { email: "guest@example.com", password: "password-guest-1" });
    assert.equal(again.res.status, 200);
    assert.equal(again.json.user.role, "PLAYER");
  });

  it("no modo local o POST de login responde LOCAL_MODE e /me já está autenticado", async () => {
    await listen("local");
    const denied = await postLogin(base, { email: "guest@example.com", password: "password-guest-1" });
    assert.equal(denied.res.status, 400);
    assert.equal(denied.json.code, "LOCAL_MODE");
    const me = await fetch(`${base}/api/jogo-idle/auth/me`);
    const json = await me.json();
    assert.equal(json.authenticated, true);
    assert.equal(json.mode, "local");
  });
});
