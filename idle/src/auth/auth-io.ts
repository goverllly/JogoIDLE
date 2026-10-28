/**
 * Atomic JSON persistence for auth users/sessions (same durability pattern as store-io).
 * Single-process only — not a distributed auth backend.
 */

import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
  chmodSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export class AuthIoError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthIoError";
    this.code = code;
  }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function defaultAuthPaths(env: NodeJS.ProcessEnv = process.env) {
  const dataDir = env.IDLE_AUTH_DIR || env.IDLE_DATA_DIR || join(ROOT, "data");
  return {
    dataDir,
    usersPath: env.IDLE_AUTH_USERS_PATH || join(dataDir, "auth-users.json"),
    sessionsPath: env.IDLE_AUTH_SESSIONS_PATH || join(dataDir, "auth-sessions.json"),
  };
}

export function atomicWriteAuthJson(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(data, null, 2);
  // Round-trip
  JSON.parse(payload);
  const tmp = join(dir, `.auth-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}.tmp`);
  try {
    const fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    try {
      writeSync(fd, payload, 0, "utf8");
      try {
        fsyncSync(fd);
      } catch {
        /* best-effort */
      }
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, filePath);
    try {
      chmodSync(filePath, 0o600);
    } catch {
      /* windows */
    }
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw new AuthIoError("AUTH_IO_WRITE", `Failed to write ${filePath}: ${(err as Error).message}`);
  }
}

export function readAuthJson<T>(filePath: string, fallback: T, validate: (v: unknown) => T): T {
  if (!existsSync(filePath)) return fallback;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    throw new AuthIoError("AUTH_IO_READ", `Failed to read ${filePath}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthIoError("AUTH_JSON_INVALID", `Corrupt auth file: ${filePath}`);
  }
  try {
    return validate(parsed);
  } catch (err) {
    if (err instanceof AuthIoError) throw err;
    throw new AuthIoError("AUTH_STRUCTURE_INVALID", `Invalid auth structure: ${filePath}`);
  }
}
