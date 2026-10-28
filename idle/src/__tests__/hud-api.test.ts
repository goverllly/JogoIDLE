/**
 * Phase 3 — HUD draft/publish concurrency + auth gates (HTTP).
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
import { storeTestApi } from "../store.ts";
import { resetRateLimitsForTests } from "../auth/rate-limit.ts";
import {
  createEmptyHudDocument,
  replaceHudCatalogPayload,
  getHudPublished,
  getHudDraft,
} from "../../lib/jogo-idle/hud-layout.ts";
import { mergeComponentProps } from "../../lib/jogo-idle/hud-builder-state.ts";

const SECRET = "hud-test-session-secret-32chars-min!!";

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
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.jar) headers.cookie = cookieHeader(opts.jar);
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const csrf = opts.csrf === undefined ? opts.jar?.csrf : opts.csrf;
  if (csrf) headers["x-csrf-token"] = csrf;
  if (!headers.origin) headers.origin = base;
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

function localBoot(): BootConfig {
  return resolveBootConfig({ IDLE_AUTH_MODE: "local", IDLE_BIND: "127.0.0.1" });
}

let root: string;
let server: Server;
let base: string;

beforeEach(() => {
  resetRateLimitsForTests();
  root = mkdtempSync(join(tmpdir(), "jogo-idle-hud-"));
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
  replaceHudCatalogPayload({ draft: null, published: null, history: [] });
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = undefined as unknown as Server;
  }
  storeTestApi.resetForTests();
  replaceHudCatalogPayload({ draft: null, published: null, history: [] });
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

async function loginAdmin() {
  await createUser({
    email: "hud-admin@ex.com",
    password: "password-hud-admin",
    role: "ADMIN",
    avoidUserIds: [LEGACY_LOCAL_USER_ID],
  });
  const jar: Jar = {};
  const r = await req(base, "/api/jogo-idle/auth/login", {
    jar,
    body: { email: "hud-admin@ex.com", password: "password-hud-admin" },
  });
  assert.equal(r.res.status, 200);
  return jar;
}

describe("HUD API — draft concurrency and publish", () => {
  it("dois saves com mesma expectedDraftRevision: segundo 409", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    layout = mergeComponentProps(layout, "stage-left", { width: "200px" }, "desktop");
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.draft.draftRevision, 1);

    const stale = structuredClone(layout);
    stale.tokens = { ...(stale.tokens || {}), slotRarityFillMix: 50 };
    r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout: stale, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 409);
    assert.equal(r.json.code, "HUD_DRAFT_CONFLICT");
    assert.equal(getHudDraft()?.draftRevision, 1);
  });

  it("rascunho não afeta layout publicado / GET público", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    layout = mergeComponentProps(layout, "stage-left", { width: "333px" }, "desktop");
    await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    const pub = await req(base, "/api/jogo-idle/hud-layout", {
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(pub.res.status, 200);
    assert.equal(pub.json.layout, null);
    assert.equal(getHudPublished(), null);
  });

  it("ADMIN publica; PLAYER não; CSRF inválido rejeitado em protected", async () => {
    await listen(protectedBoot());
    const adminJar = await loginAdmin();
    await createUser({
      email: "hud-player@ex.com",
      password: "password-hud-player",
      role: "PLAYER",
    });
    const playerJar: Jar = {};
    await req(base, "/api/jogo-idle/auth/login", {
      jar: playerJar,
      body: { email: "hud-player@ex.com", password: "password-hud-player" },
    });

    let layout = createEmptyHudDocument("admin", "draft");
    layout = mergeComponentProps(layout, "stage-left", { width: "210px" }, "desktop");
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      jar: adminJar,
      body: { layout, expectedDraftRevision: 0 },
    });
    assert.equal(r.res.status, 200);
    const draftRev = r.json.draft.draftRevision;

    r = await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      jar: playerJar,
      body: { expectedPublishedRevision: 0, expectedDraftRevision: draftRev },
    });
    assert.equal(r.res.status, 403);

    r = await fetch(`${base}/api/jogo-idle/admin/hud-layout/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: base,
        cookie: cookieHeader(adminJar),
        "x-csrf-token": "wrong-csrf-token-value!!!!!!!!!!!",
      },
      body: JSON.stringify({ expectedPublishedRevision: 0, expectedDraftRevision: draftRev }),
    }).then(async (res) => ({ res, json: await res.json() }));
    assert.equal(r.res.status, 403);

    r = await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      jar: adminJar,
      body: { expectedPublishedRevision: 0, expectedDraftRevision: draftRev },
    });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.published.revision, 1);

    const pub = await req(base, "/api/jogo-idle/hud-layout");
    assert.equal(pub.json.layout.revision, 1);
    assert.equal(pub.json.layout.components["stage-left"].base.width, "210px");
  });

  it("publish com published/draft revision desatualizada → 409", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    const draftRev = r.json.draft.draftRevision;
    await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: { expectedPublishedRevision: 0, expectedDraftRevision: draftRev },
      headers: { origin: base, host: "127.0.0.1" },
    });

    layout = getHudDraft()!;
    r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: {
        layout: mergeComponentProps(layout, "stage-left", { width: "100px" }, "desktop"),
        expectedDraftRevision: layout.draftRevision ?? 0,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });
    const newDraftRev = r.json.draft.draftRevision;

    r = await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: { expectedPublishedRevision: 0, expectedDraftRevision: newDraftRev },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 409);
    assert.equal(r.json.code, "HUD_REVISION_CONFLICT");

    r = await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: { expectedPublishedRevision: 1, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 409);
    assert.equal(r.json.code, "HUD_DRAFT_CONFLICT");
  });

  it("publish falha na persistência preserva published anterior", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    layout = mergeComponentProps(layout, "stage-left", { width: "180px" }, "desktop");
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: {
        expectedPublishedRevision: 0,
        expectedDraftRevision: r.json.draft.draftRevision,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(getHudPublished()?.revision, 1);

    layout = getHudDraft()!;
    layout = mergeComponentProps(layout, "stage-left", { width: "999px" }, "desktop");
    r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: layout.draftRevision ?? 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });

    storeTestApi.setWriteOptions({ failBeforeRename: true });
    r = await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: {
        expectedPublishedRevision: 1,
        expectedDraftRevision: r.json.draft.draftRevision,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });
    storeTestApi.setWriteOptions({});
    assert.ok(r.res.status >= 400);
    assert.equal(getHudPublished()?.revision, 1);
    assert.equal(getHudPublished()?.components["stage-left"]?.base?.width, "180px");
  });

  it("restore default incrementa draftRevision; published intacto; sanitização no save", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    layout = mergeComponentProps(layout, "stage-left", { width: "250px" }, "desktop");
    // Inject illegal prop that sanitize strips
    (layout.components["stage-left"].base as any).backgroundImage = "url(evil)";
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 200);
    assert.equal(r.json.draft.components["stage-left"].base.backgroundImage, undefined);
    assert.equal(r.json.draft.components["stage-left"].base.width, "250px");

    await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: {
        expectedPublishedRevision: 0,
        expectedDraftRevision: r.json.draft.draftRevision,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });

    r = await req(base, "/api/jogo-idle/admin/hud-layout/restore", {
      body: { toDefault: true, expectedDraftRevision: getHudDraft()?.draftRevision ?? 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.res.status, 200);
    assert.ok((r.json.draft.draftRevision ?? 0) >= 1);
    assert.equal(Object.keys(r.json.draft.components || {}).length, 0);
    assert.equal(getHudPublished()?.revision, 1);
    assert.equal(getHudPublished()?.components["stage-left"].base.width, "250px");
  });

  it("reload após publish apresenta revision e histórico", async () => {
    await listen(localBoot());
    let layout = createEmptyHudDocument("admin", "draft");
    let r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: {
        expectedPublishedRevision: 0,
        expectedDraftRevision: r.json.draft.draftRevision,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });
    layout = mergeComponentProps(getHudDraft()!, "stage-left", { width: "111px" }, "desktop");
    r = await req(base, "/api/jogo-idle/admin/hud-layout/draft", {
      method: "PUT",
      body: { layout, expectedDraftRevision: getHudDraft()?.draftRevision ?? 0 },
      headers: { origin: base, host: "127.0.0.1" },
    });
    await req(base, "/api/jogo-idle/admin/hud-layout/publish", {
      body: {
        expectedPublishedRevision: 1,
        expectedDraftRevision: r.json.draft.draftRevision,
      },
      headers: { origin: base, host: "127.0.0.1" },
    });

    r = await req(base, "/api/jogo-idle/admin/hud-layout", {
      headers: { origin: base, host: "127.0.0.1" },
    });
    assert.equal(r.json.publishedRevision, 2);
    assert.ok(Array.isArray(r.json.history));
    assert.ok(r.json.history.length >= 1);
    assert.equal(r.json.history[0].revision, 1);
  });
});
