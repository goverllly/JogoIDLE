/**
 * Auth user accounts. userId=1 is reserved for legacy local identity — never assigned here.
 */

import { createHash } from "node:crypto";
import { AuthIoError, atomicWriteAuthJson, defaultAuthPaths, readAuthJson } from "./auth-io.ts";
import { hashPassword, verifyPassword } from "./password.ts";

export type UserRole = "PLAYER" | "ADMIN";

export type AuthUser = {
  userId: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsersFile = {
  schemaVersion: 1;
  nextUserId: number;
  users: AuthUser[];
};

/** Reserved for standalone local principal / legacy characters. */
export const LEGACY_LOCAL_USER_ID = 1;

const MIN_NEXT_ID = 2;

let paths = defaultAuthPaths();
let cache: UsersFile | null = null;

export function configureAuthUsersPaths(p: Partial<ReturnType<typeof defaultAuthPaths>>) {
  paths = { ...defaultAuthPaths(), ...p };
  cache = null;
}

function emptyUsers(): UsersFile {
  return { schemaVersion: 1, nextUserId: MIN_NEXT_ID, users: [] };
}

function validateUsersFile(parsed: unknown): UsersFile {
  if (!parsed || typeof parsed !== "object") throw new AuthIoError("AUTH_STRUCTURE_INVALID", "users root");
  const o = parsed as Record<string, unknown>;
  if (o.schemaVersion !== 1) throw new AuthIoError("AUTH_STRUCTURE_INVALID", "users schemaVersion");
  if (!Array.isArray(o.users)) throw new AuthIoError("AUTH_STRUCTURE_INVALID", "users.users");
  const nextUserId = typeof o.nextUserId === "number" && o.nextUserId >= MIN_NEXT_ID ? o.nextUserId : MIN_NEXT_ID;
  const users: AuthUser[] = [];
  for (const u of o.users) {
    if (!u || typeof u !== "object") throw new AuthIoError("AUTH_STRUCTURE_INVALID", "user row");
    const row = u as AuthUser;
    if (typeof row.userId !== "number" || row.userId === LEGACY_LOCAL_USER_ID) {
      throw new AuthIoError("AUTH_STRUCTURE_INVALID", "userId must be number and not 1");
    }
    if (typeof row.email !== "string" || typeof row.passwordHash !== "string") {
      throw new AuthIoError("AUTH_STRUCTURE_INVALID", "email/hash");
    }
    if (row.role !== "PLAYER" && row.role !== "ADMIN") {
      throw new AuthIoError("AUTH_STRUCTURE_INVALID", "role");
    }
    users.push({
      userId: row.userId,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      disabled: Boolean(row.disabled),
      createdAt: String(row.createdAt || ""),
      updatedAt: String(row.updatedAt || ""),
    });
  }
  return { schemaVersion: 1, nextUserId, users };
}

function load(): UsersFile {
  if (cache) return cache;
  cache = readAuthJson(paths.usersPath, emptyUsers(), validateUsersFile);
  return cache;
}

function save(data: UsersFile) {
  atomicWriteAuthJson(paths.usersPath, data);
  cache = data;
}

export function normalizeEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function findUserByEmail(email: string): AuthUser | null {
  const n = normalizeEmail(email);
  return load().users.find((u) => u.email === n) || null;
}

export function findUserById(userId: number): AuthUser | null {
  return load().users.find((u) => u.userId === userId) || null;
}

export type CreateUserOpts = {
  email: string;
  password: string;
  role: UserRole;
  /** Extra floor for next id (e.g. max character userId in save). */
  avoidUserIds?: number[];
};

export async function createUser(opts: CreateUserOpts): Promise<AuthUser> {
  const email = normalizeEmail(opts.email);
  if (!email || !email.includes("@")) {
    throw Object.assign(new Error("Invalid email"), { status: 400, code: "INVALID_EMAIL" });
  }
  const data = load();
  if (data.users.some((u) => u.email === email)) {
    throw Object.assign(new Error("Email already registered"), { status: 409, code: "EMAIL_EXISTS" });
  }
  const passwordHash = await hashPassword(opts.password);
  const avoid = new Set<number>([LEGACY_LOCAL_USER_ID, ...(opts.avoidUserIds || [])]);
  for (const u of data.users) avoid.add(u.userId);

  let userId = Math.max(MIN_NEXT_ID, data.nextUserId);
  while (avoid.has(userId)) userId += 1;

  const now = new Date().toISOString();
  const user: AuthUser = {
    userId,
    email,
    passwordHash,
    role: opts.role,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
  data.users.push(user);
  data.nextUserId = userId + 1;
  save(data);
  return { ...user };
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = findUserByEmail(email);
  if (!user || user.disabled) return null;
  const ok = await verifyPassword(user.passwordHash, password);
  return ok ? { ...user } : null;
}

export function setUserRole(userId: number, role: UserRole): AuthUser {
  const data = load();
  const user = data.users.find((u) => u.userId === userId);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  user.role = role;
  user.updatedAt = new Date().toISOString();
  save(data);
  // Privilege is revalidated on every resolveSession() from the live user record (not cached on session).
  return { ...user };
}

export function setUserDisabled(userId: number, disabled: boolean): AuthUser {
  const data = load();
  const user = data.users.find((u) => u.userId === userId);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  user.disabled = disabled;
  user.updatedAt = new Date().toISOString();
  save(data);
  // Disabled users fail resolveSession(); callers may also revokeAllSessionsForUser.
  return { ...user };
}

export function listUsersPublic(): Omit<AuthUser, "passwordHash">[] {
  return load().users.map(({ passwordHash: _, ...rest }) => rest);
}

/** Test helper */
export function resetUsersForTests(p?: Partial<ReturnType<typeof defaultAuthPaths>>) {
  if (p) configureAuthUsersPaths(p);
  cache = null;
  save(emptyUsers());
}

export function clearUsersCacheForTests() {
  cache = null;
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}
