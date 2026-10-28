/**
 * Atomic JSON save I/O for the standalone store.
 *
 * Durability notes (OS / FS):
 * - rename() within the same directory is atomic on POSIX and modern NTFS.
 * - fsync(file) after writing the temp file reduces risk of empty/truncated
 *   principal after power loss; not available / no-op on some sandboxed envs.
 * - fsync(directory) after rename improves durability of the directory entry
 *   on ext4/XFS; Windows and some network FS may ignore or fail — failures
 *   are logged as best-effort, never treated as success of a bad write.
 * - Cross-device rename is not used (temp always beside the target).
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
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { StoreError } from "./store-errors.ts";

/** Current schema written by this build. Older files without the field are accepted. */
export const STORE_SCHEMA_VERSION = 1;

export type CharacterRow = {
  id: string;
  userId: number;
  name: string;
  classId: string;
  level: number;
  experience: number;
  gold: number;
  isActive: boolean;
  state: Record<string, unknown>;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogState = {
  dropChance: number;
  deletedIds: string[];
  overrides: Record<string, unknown>;
  updatedAt: string;
};

export type AdminActionRow = {
  id: string;
  at: string;
  adminEmail: string;
  action: string;
  summary: string;
  payload?: Record<string, unknown> | null;
};

export type SaveFile = {
  schemaVersion?: number;
  characters: CharacterRow[];
  catalog: CatalogState | null;
  adminActions: AdminActionRow[];
  fame: Record<string, unknown> | null;
  /** Unknown top-level keys preserved for forward compatibility. */
  [key: string]: unknown;
};

export type ValidatedSave = {
  data: SaveFile;
  /** Raw object keys beyond the known set, already merged into data. */
  unknownKeys: string[];
};

const KNOWN_KEYS = new Set([
  "schemaVersion",
  "characters",
  "catalog",
  "adminActions",
  "fame",
]);

export function emptySave(): SaveFile {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    characters: [],
    catalog: null,
    adminActions: [],
    fame: null,
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function assertCharacterRow(row: unknown, index: number): CharacterRow {
  if (!isPlainObject(row)) {
    throw new StoreError(
      "STORE_STRUCTURE_INVALID",
      `characters[${index}] must be an object`,
      500,
    );
  }
  for (const key of ["id", "name", "classId", "createdAt", "updatedAt"] as const) {
    if (typeof row[key] !== "string" || !row[key]) {
      throw new StoreError(
        "STORE_STRUCTURE_INVALID",
        `characters[${index}].${key} must be a non-empty string`,
        500,
      );
    }
  }
  if (typeof row.userId !== "number" || !Number.isFinite(row.userId)) {
    throw new StoreError("STORE_STRUCTURE_INVALID", `characters[${index}].userId invalid`, 500);
  }
  if (typeof row.level !== "number" || typeof row.experience !== "number" || typeof row.gold !== "number") {
    throw new StoreError("STORE_STRUCTURE_INVALID", `characters[${index}] numeric fields invalid`, 500);
  }
  if (typeof row.isActive !== "boolean") {
    throw new StoreError("STORE_STRUCTURE_INVALID", `characters[${index}].isActive must be boolean`, 500);
  }
  if (!isPlainObject(row.state)) {
    throw new StoreError("STORE_STRUCTURE_INVALID", `characters[${index}].state must be object`, 500);
  }
  return row as CharacterRow;
}

/**
 * Validate parsed JSON as a save document.
 * - Missing schemaVersion: OK (legacy).
 * - schemaVersion > STORE_SCHEMA_VERSION: STORE_SCHEMA_INCOMPATIBLE (not recoverable corruption).
 * - Unknown keys: kept.
 */
export function validateSaveDocument(parsed: unknown): ValidatedSave {
  if (!isPlainObject(parsed)) {
    throw new StoreError("STORE_STRUCTURE_INVALID", "Save root must be a JSON object", 500);
  }

  if ("schemaVersion" in parsed && parsed.schemaVersion !== undefined && parsed.schemaVersion !== null) {
    if (typeof parsed.schemaVersion !== "number" || !Number.isFinite(parsed.schemaVersion)) {
      throw new StoreError("STORE_STRUCTURE_INVALID", "schemaVersion must be a number", 500);
    }
    if (parsed.schemaVersion > STORE_SCHEMA_VERSION) {
      throw new StoreError(
        "STORE_SCHEMA_INCOMPATIBLE",
        `Save schemaVersion ${parsed.schemaVersion} is newer than supported ${STORE_SCHEMA_VERSION}`,
        500,
      );
    }
  }

  if (!("characters" in parsed)) {
    throw new StoreError("STORE_STRUCTURE_INVALID", "Missing required field: characters", 500);
  }
  if (!Array.isArray(parsed.characters)) {
    throw new StoreError("STORE_STRUCTURE_INVALID", "characters must be an array", 500);
  }

  const characters = parsed.characters.map((row, i) => assertCharacterRow(row, i));

  let catalog: CatalogState | null = null;
  if (parsed.catalog != null) {
    if (!isPlainObject(parsed.catalog)) {
      throw new StoreError("STORE_STRUCTURE_INVALID", "catalog must be object or null", 500);
    }
    catalog = parsed.catalog as CatalogState;
  }

  let adminActions: AdminActionRow[] = [];
  if (parsed.adminActions !== undefined && parsed.adminActions !== null) {
    if (!Array.isArray(parsed.adminActions)) {
      throw new StoreError("STORE_STRUCTURE_INVALID", "adminActions must be an array", 500);
    }
    adminActions = parsed.adminActions as AdminActionRow[];
  }

  let fame: Record<string, unknown> | null = null;
  if (parsed.fame != null) {
    if (!isPlainObject(parsed.fame)) {
      throw new StoreError("STORE_STRUCTURE_INVALID", "fame must be object or null", 500);
    }
    fame = parsed.fame;
  }

  const unknownKeys: string[] = [];
  const data: SaveFile = {
    schemaVersion:
      typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : STORE_SCHEMA_VERSION,
    characters,
    catalog,
    adminActions,
    fame,
  };

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_KEYS.has(key)) {
      unknownKeys.push(key);
      data[key] = parsed[key];
    }
  }

  return { data, unknownKeys };
}

export type ReadSaveResult =
  | { kind: "missing" }
  | { kind: "ok"; data: SaveFile; rawText: string }
  | { kind: "error"; error: StoreError };

function mapReadFsError(err: unknown): StoreError {
  const e = err as NodeJS.ErrnoException;
  if (e?.code === "ENOENT") {
    return new StoreError("STORE_ENOENT", "Save file not found", 404, err);
  }
  if (e?.code === "EACCES" || e?.code === "EPERM") {
    return new StoreError("STORE_PERMISSION", "Permission denied reading save file", 500, err);
  }
  return new StoreError("STORE_IO_READ", `Failed to read save file: ${e?.message || String(err)}`, 500, err);
}

/**
 * Read and validate save. Distinguishes missing file from corrupt / incompatible.
 * Never deletes or renames the principal path.
 */
export function readSaveFile(filePath: string): ReadSaveResult {
  if (!existsSync(filePath)) {
    return { kind: "missing" };
  }

  let rawText: string;
  try {
    rawText = readFileSync(filePath, "utf8");
  } catch (err) {
    return { kind: "error", error: mapReadFsError(err) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return {
      kind: "error",
      error: new StoreError("STORE_JSON_INVALID", "Save file contains invalid JSON", 500, err),
    };
  }

  try {
    const { data } = validateSaveDocument(parsed);
    return { kind: "ok", data, rawText };
  } catch (err) {
    if (err instanceof StoreError) {
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new StoreError("STORE_STRUCTURE_INVALID", "Save structure validation failed", 500, err),
    };
  }
}

function fsyncPathBestEffort(targetPath: string): void {
  try {
    const fd = openSync(targetPath, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    /* best-effort */
  }
}

function fsyncDirBestEffort(dirPath: string): void {
  try {
    const fd = openSync(dirPath, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    /* Windows / some FS: unsupported */
  }
}

export type AtomicWriteOptions = {
  /** Injected for tests — when true, fail after temp write before rename. */
  failBeforeRename?: boolean;
  /** Injected for tests — when true, fail while writing temp. */
  failDuringTempWrite?: boolean;
};

/**
 * Serialize, write exclusive temp beside target, fsync, rename, fsync dir.
 * On failure before rename, principal file is left untouched.
 */
export function atomicWriteJson(filePath: string, data: SaveFile, options: AtomicWriteOptions = {}): void {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      throw new StoreError("STORE_PERMISSION", "Permission denied creating data directory", 500, err);
    }
    throw new StoreError("STORE_IO_WRITE", `Failed to create data directory: ${e?.message}`, 500, err);
  }

  let payload: string;
  try {
    // Ensure we stamp current schema on write (legacy upgrades).
    const toWrite: SaveFile = { ...data, schemaVersion: STORE_SCHEMA_VERSION };
    validateSaveDocument(toWrite);
    payload = JSON.stringify(toWrite, null, 2);
    // Round-trip check
    validateSaveDocument(JSON.parse(payload));
  } catch (err) {
    if (err instanceof StoreError) throw err;
    throw new StoreError("STORE_STRUCTURE_INVALID", "Refused to write invalid save payload", 500, err);
  }

  const tmpPath = join(dir, `.save-${process.pid}-${Date.now()}-${randomBytes(4).toString("hex")}.tmp`);

  try {
    if (options.failDuringTempWrite) {
      throw new StoreError("STORE_IO_WRITE", "Injected failure during temp write", 500);
    }

    const fd = openSync(tmpPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
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

    if (options.failBeforeRename) {
      throw new StoreError("STORE_IO_WRITE", "Injected failure before rename", 500);
    }

    renameSync(tmpPath, filePath);
    fsyncPathBestEffort(filePath);
    fsyncDirBestEffort(dir);
  } catch (err) {
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      /* ignore cleanup */
    }
    if (err instanceof StoreError) throw err;
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      throw new StoreError("STORE_PERMISSION", "Permission denied writing save file", 500, err);
    }
    throw new StoreError("STORE_IO_WRITE", `Failed to write save file: ${e?.message || String(err)}`, 500, err);
  }
}

/** Optional forensic copy; never moves/renames the principal save. */
export function copyCorruptEvidence(filePath: string, evidenceDir: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    mkdirSync(evidenceDir, { recursive: true });
    const dest = join(
      evidenceDir,
      `save.json.corrupt-evidence-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
    writeFileSync(dest, readFileSync(filePath));
    return dest;
  } catch {
    return null;
  }
}
