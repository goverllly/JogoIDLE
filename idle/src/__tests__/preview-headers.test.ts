/**
 * Fase 6.2 — só as duas prévias aceitam iframe same-origin.
 * Outras rotas continuam com X-Frame-Options SAMEORIGIN e sem CSP.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { resolveBootConfig } from "../auth/mode.ts";
import { createApp } from "../server.ts";
import { storeTestApi } from "../store.ts";

let server: Server | undefined;
let root = "";

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = undefined;
  if (root) rmSync(root, { recursive: true, force: true });
  root = "";
  storeTestApi.resetForTests();
});

describe("headers da prévia 3D", () => {
  it("aplica frame-ancestors 'self' e SAMEORIGIN só nas duas páginas", async () => {
    root = mkdtempSync(join(tmpdir(), "jogo-idle-preview-"));
    storeTestApi.resetForTests({
      savePath: join(root, "save.json"),
      backupDir: join(root, "backups"),
      evidenceDir: root,
    });
    const app = createApp(
      resolveBootConfig({ IDLE_AUTH_MODE: "local", IDLE_BIND: "127.0.0.1" }),
    );
    server = createServer(app);
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    const base = `http://127.0.0.1:${addr.port}`;

    const previews = ["/jogo-idle/preview.html", "/jogo-idle/admin-studio/preview.html"];
    for (const path of previews) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get("content-security-policy"), "frame-ancestors 'self'");
      assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("referrer-policy"), "no-referrer");
      const html = await res.text();
      assert.match(html, /<iframe|preview\.js|preview-engine\.js|canvas/i);
    }

    const other = await fetch(`${base}/jogo-idle/lobby.html`);
    assert.equal(other.status, 200);
    assert.equal(other.headers.get("content-security-policy"), null);
    assert.equal(other.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(other.headers.get("x-content-type-options"), "nosniff");
  });
});
