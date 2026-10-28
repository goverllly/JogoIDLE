/**
 * Server-side sessions: cookie holds raw token; disk stores SHA-256(token) only.
 */

import { createHash, randomBytes } from "node:crypto";
import { AuthIoError, atomicWriteAuthJson, defaultAuthPaths, readAuthJson } from "./auth-io.ts";
import { findUserById, type UserRole } from "./users.ts";

export type SessionRecord = {
  /** SHA-256 hex of the browser cookie token — never the raw token. */
  tokenHash: string;
  userId: number;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type SessionsFile = {
  schemaVersion: 1;
  sessions: SessionRecord[];
};

let paths = defaultAuthPaths();
let cache: SessionsFile | null = null;
let ttlSec = 7 * 24 * 3600;

export function configureSessions(opts: {
  paths?: Partial<ReturnType<typeof defaultAuthPaths>>;
  ttlSec?: number;
}) {
  if (opts.paths) paths = { ...defaultAuthPaths(), ...opts.paths };
  if (opts.ttlSec) ttlSec = opts.ttlSec;
  cache = null;
}

function emptySessions(): SessionsFile {
  return { schemaVersion: 1, sessions: [] };
}

function validateSessions(parsed: unknown): SessionsFile {
  if (!parsed || typeof parsed !== "object") throw new AuthIoError("AUTH_STRUCTURE_INVALID", "sessions root");
  const o = parsed as Record<string, unknown>;
  if (o.schemaVersion !== 1 || !Array.isArray(o.sessions)) {
    throw new AuthIoError("AUTH_STRUCTURE_INVALID", "sessions schema");
  }
  return { schemaVersion: 1, sessions: o.sessions as SessionRecord[] };
}

function load(): SessionsFile {
  if (cache) return cache;
  cache = readAuthJson(paths.sessionsPath, emptySessions(), validateSessions);
  return cache;
}

function save(data: SessionsFile) {
  // Prune expired/revoked older than 7 days past expiry
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  data.sessions = data.sessions.filter((s) => {
    if (s.revokedAt && Date.parse(s.revokedAt) < cutoff) return false;
    if (Date.parse(s.expiresAt) < cutoff) return false;
    return true;
  });
  atomicWriteAuthJson(paths.sessionsPath, data);
  cache = data;
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export type CreatedSession = {
  rawToken: string;
  csrfToken: string;
  expiresAt: string;
  userId: number;
};

/** Create session; returns raw token for Set-Cookie only. */
export function createSession(userId: number): CreatedSession {
  const rawToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSec * 1000).toISOString();
  const data = load();
  data.sessions.push({
    tokenHash: hashSessionToken(rawToken),
    userId,
    csrfToken,
    createdAt: now.toISOString(),
    expiresAt,
    revokedAt: null,
  });
  save(data);
  return { rawToken, csrfToken, expiresAt, userId };
}

export type ResolvedSession = {
  userId: number;
  role: UserRole;
  email: string;
  csrfToken: string;
  tokenHash: string;
  expiresAt: string;
};

/**
 * Resolve cookie token → live user role from user store (not cached role on session).
 */
export function resolveSession(rawToken: string | undefined | null): ResolvedSession | null {
  if (!rawToken || typeof rawToken !== "string") return null;
  const tokenHash = hashSessionToken(rawToken);
  const data = load();
  const rec = data.sessions.find((s) => s.tokenHash === tokenHash);
  if (!rec || rec.revokedAt) return null;
  if (Date.parse(rec.expiresAt) <= Date.now()) return null;
  const user = findUserById(rec.userId);
  if (!user || user.disabled) return null;
  return {
    userId: user.userId,
    role: user.role,
    email: user.email,
    csrfToken: rec.csrfToken,
    tokenHash,
    expiresAt: rec.expiresAt,
  };
}

export function revokeSession(rawToken: string): boolean {
  const tokenHash = hashSessionToken(rawToken);
  const data = load();
  const rec = data.sessions.find((s) => s.tokenHash === tokenHash);
  if (!rec || rec.revokedAt) return false;
  rec.revokedAt = new Date().toISOString();
  save(data);
  return true;
}

export function revokeAllSessionsForUser(userId: number): number {
  const data = load();
  let n = 0;
  const now = new Date().toISOString();
  for (const s of data.sessions) {
    if (s.userId === userId && !s.revokedAt) {
      s.revokedAt = now;
      n += 1;
    }
  }
  if (n) save(data);
  return n;
}

export function resetSessionsForTests(p?: Partial<ReturnType<typeof defaultAuthPaths>>) {
  if (p) configureSessions({ paths: p });
  cache = null;
  save(emptySessions());
}

/** Drop in-memory cache so the next load() re-reads disk (restart simulation). */
export function clearSessionsCacheForTests() {
  cache = null;
}
