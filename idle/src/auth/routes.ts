import type { Express, Request, Response } from "express";
import type { BootConfig } from "./mode.ts";
import { authenticateUser } from "./users.ts";
import { createSession, revokeSession } from "./sessions.ts";
import { clearSessionCookies, readSid, setSessionCookies } from "./cookies.ts";
import { rateLimitConsume } from "./rate-limit.ts";
import { requireAuth } from "./middleware.ts";
import { originAllowed } from "./csrf.ts";

function ok(res: Response, body: unknown, status = 200) {
  res.status(status).set("Cache-Control", "no-store").json(body);
}

function clientIp(req: Request): string {
  return String(req.socket.remoteAddress || "unknown");
}

export function registerAuthRoutes(app: Express, cfg: BootConfig) {
  app.get("/api/jogo-idle/auth/me", (req, res) => {
    if (!req.principal) {
      return ok(res, { success: true, authenticated: false, mode: cfg.mode }, 200);
    }
    return ok(res, {
      success: true,
      authenticated: true,
      mode: cfg.mode,
      user: {
        userId: req.principal.userId,
        email: req.principal.email,
        role: req.principal.role,
        isLocalDev: req.principal.isLocalDev,
      },
      csrfToken: req.csrfToken || null,
    });
  });

  app.post("/api/jogo-idle/auth/login", async (req, res) => {
    if (cfg.mode === "local") {
      return ok(res, { success: false, error: "Login disabled in local mode", code: "LOCAL_MODE" }, 400);
    }
    // Login CSRF: reject cross-origin so a third party cannot force a session onto the victim browser.
    if (!originAllowed(req, cfg.allowHttpLocal)) {
      return ok(res, { success: false, error: "Origin not allowed", code: "ORIGIN_DENIED" }, 403);
    }
    if (!rateLimitConsume(`login:${clientIp(req)}`, 5, 60_000)) {
      return ok(res, { success: false, error: "Too many login attempts", code: "RATE_LIMIT" }, 429);
    }
    const email = String(req.body?.email || "");
    const password = String(req.body?.password || "");
    const user = await authenticateUser(email, password);
    if (!user) {
      return ok(res, { success: false, error: "Invalid credentials", code: "AUTH_FAILED" }, 401);
    }
    // Rotate: revoke previous cookie session if any (never log tokens/passwords).
    const prev = readSid(req);
    if (prev) revokeSession(prev);
    const sess = createSession(user.userId);
    const maxAge = Math.floor((Date.parse(sess.expiresAt) - Date.now()) / 1000);
    setSessionCookies(res, cfg, { rawToken: sess.rawToken, csrfToken: sess.csrfToken, maxAgeSec: maxAge });
    return ok(res, {
      success: true,
      user: { userId: user.userId, email: user.email, role: user.role },
      csrfToken: sess.csrfToken,
      expiresAt: sess.expiresAt,
    });
  });

  app.post("/api/jogo-idle/auth/logout", requireAuth, (req, res) => {
    if (cfg.mode === "protected") {
      const sid = readSid(req);
      if (sid) revokeSession(sid);
      clearSessionCookies(res, cfg);
    }
    return ok(res, { success: true });
  });
}
