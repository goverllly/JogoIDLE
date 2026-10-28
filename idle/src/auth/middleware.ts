import type { NextFunction, Request, Response } from "express";
import type { BootConfig } from "./mode.ts";
import { LOCAL_DEV_PRINCIPAL, type AuthenticatedPrincipal } from "./principal.ts";
import { readSid } from "./cookies.ts";
import { resolveSession } from "./sessions.ts";
import { csrfHeaderMatches, originAllowed } from "./csrf.ts";

declare global {
  namespace Express {
    interface Request {
      principal?: AuthenticatedPrincipal;
      csrfToken?: string;
      bootConfig?: BootConfig;
    }
  }
}

function deny(res: Response, status: number, error: string, code: string) {
  res.status(status).set("Cache-Control", "no-store").json({ success: false, error, code });
}

/** Paths embedded by lobby/criar as same-origin iframes. */
function isEmbeddablePreviewPath(path: string): boolean {
  const p = String(path || "").split("?")[0];
  return (
    p === "/jogo-idle/preview.html" ||
    p === "/jogo-idle/admin-studio/preview.html"
  );
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // DENY broke the character preview iframe. Embeddable preview pages omit
  // X-Frame-Options so lobby/criar can frame them; other pages stay SAMEORIGIN
  // (blocks cross-site clickjacking, allows same-origin frames).
  if (!isEmbeddablePreviewPath(req.path)) {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }
  next();
}

export function attachBootConfig(cfg: BootConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.bootConfig = cfg;
    next();
  };
}

/**
 * Resolve principal: local mode → fixed ADMIN userId=1; protected → session cookie.
 */
export function attachPrincipal(cfg: BootConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (cfg.mode === "local") {
      req.principal = { ...LOCAL_DEV_PRINCIPAL };
      return next();
    }
    try {
      const raw = readSid(req);
      const sess = resolveSession(raw);
      if (sess) {
        req.principal = {
          userId: sess.userId,
          email: sess.email,
          role: sess.role,
          sessionId: sess.tokenHash.slice(0, 16),
          isLocalDev: false,
        };
        req.csrfToken = sess.csrfToken;
      }
      next();
    } catch {
      // Corrupt auth store → fail closed (no principal, no silent empty grant).
      return deny(res, 503, "Authentication store unavailable", "AUTH_STORE_UNAVAILABLE");
    }
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.principal) {
    return deny(res, 401, "Authentication required", "AUTH_REQUIRED");
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.principal) {
    return deny(res, 401, "Authentication required", "AUTH_REQUIRED");
  }
  if (req.principal.role !== "ADMIN") {
    return deny(res, 403, "Admin privileges required", "ADMIN_REQUIRED");
  }
  next();
}

/** Block mutating requests without valid CSRF (protected mode only). */
export function requireCsrf(cfg: BootConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (cfg.mode === "local") return next();
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    if (!req.principal || req.principal.isLocalDev) {
      return deny(res, 401, "Authentication required", "AUTH_REQUIRED");
    }
    if (!originAllowed(req, cfg.allowHttpLocal)) {
      return deny(res, 403, "Origin not allowed", "ORIGIN_DENIED");
    }
    if (!csrfHeaderMatches(req, req.csrfToken)) {
      return deny(res, 403, "Invalid CSRF token", "CSRF_INVALID");
    }
    next();
  };
}

/**
 * Protect Admin Studio HTML/assets before any static middleware can serve them.
 */
export function requireAdminPage(cfg: BootConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path || "";
    const url = req.originalUrl || path;
    const isAdminPath =
      url.startsWith("/jogo-idle/admin") ||
      path.startsWith("/jogo-idle/admin") ||
      url === "/jogo-idle/admin.html";
    if (!isAdminPath) return next();

    if (cfg.mode === "local") return next();

    if (!req.principal) {
      if (req.accepts("html")) {
        return res.redirect(302, "/jogo-idle/login.html?next=" + encodeURIComponent(url));
      }
      return deny(res, 401, "Authentication required", "AUTH_REQUIRED");
    }
    if (req.principal.role !== "ADMIN") {
      return deny(res, 403, "Admin privileges required", "ADMIN_REQUIRED");
    }
    next();
  };
}

export function localHostGuard(cfg: BootConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (cfg.mode !== "local") return next();
    const host = String(req.get("host") || "").split(":")[0]?.toLowerCase() || "";
    if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
      return deny(res, 403, "Local mode only accepts localhost Host", "HOST_DENIED");
    }
    next();
  };
}
