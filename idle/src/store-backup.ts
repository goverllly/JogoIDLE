/**
 * Local versioned backups of validated save snapshots.
 * Internal API only — no HTTP admin restore in Phase 1 (auth in Phase 2).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { StoreError } from "./store-errors.ts";
import {
  atomicWriteJson,
  readSaveFile,
  STORE_SCHEMA_VERSION,
  type AtomicWriteOptions,
  type SaveFile,
  validateSaveDocument,
} from "./store-io.ts";

export type BackupMeta = {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
  schemaVersion: number | null;
};

export type BackupPolicy = {
  /** Max backup files to retain (oldest removed first). */
  retention: number;
};

const DEFAULT_POLICY: BackupPolicy = { retention: 20 };

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

export function listBackups(backupDir: string): BackupMeta[] {
  if (!existsSync(backupDir)) return [];
  const names = readdirSync(backupDir).filter((n) => n.startsWith("save-") && n.endsWith(".json"));
  const out: BackupMeta[] = [];
  for (const fileName of names) {
    const path = join(backupDir, fileName);
    try {
      const st = statSync(path);
      const raw = readFileSync(path, "utf8");
      let schemaVersion: number | null = null;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.schemaVersion === "number") schemaVersion = parsed.schemaVersion;
      } catch {
        /* listed but invalid — restore will reject */
      }
      const m = fileName.match(/^save-(.+)\.json$/);
      out.push({
        id: fileName,
        fileName,
        path,
        createdAt: m ? isoFromBackupName(m[1]!) : new Date(st.mtimeMs).toISOString(),
        sizeBytes: st.size,
        schemaVersion,
      });
    } catch {
      /* skip unreadable */
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isoFromBackupName(slug: string): string {
  // slug like 2026-10-28T03-15-01-123Z → approximate ISO
  const m = slug.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d+))?Z$/,
  );
  if (!m) return slug;
  const ms = m[5] ? `.${m[5]}` : "";
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}${ms}Z`;
}

function backupFileName(now = new Date()): string {
  const iso = now.toISOString().replace(/[:.]/g, "-");
  return `save-${iso}.json`;
}

/** Write a backup only from an already-validated in-memory save. */
export function createBackupFromValidSave(
  backupDir: string,
  data: SaveFile,
  policy: BackupPolicy = DEFAULT_POLICY,
  writeOptions: AtomicWriteOptions = {},
): BackupMeta {
  validateSaveDocument(data);
  ensureDir(backupDir);
  const fileName = backupFileName();
  const path = join(backupDir, fileName);
  atomicWriteJson(path, data, writeOptions);
  pruneBackups(backupDir, policy.retention);
  const st = statSync(path);
  return {
    id: fileName,
    fileName,
    path,
    createdAt: new Date().toISOString(),
    sizeBytes: st.size,
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : STORE_SCHEMA_VERSION,
  };
}

export function pruneBackups(backupDir: string, retention: number): void {
  const list = listBackups(backupDir);
  for (const old of list.slice(Math.max(0, retention))) {
    try {
      unlinkSync(old.path);
    } catch {
      /* ignore */
    }
  }
}

export type RestoreResult = {
  restored: SaveFile;
  previousBackup: BackupMeta | null;
};

/**
 * Validate backup → optionally backup current valid principal → atomic replace → verify.
 */
export function restoreBackupToSavePath(opts: {
  backupPath: string;
  savePath: string;
  backupDir: string;
  /** Current in-memory valid data to preserve before overwrite; null if none. */
  currentValid: SaveFile | null;
  policy?: BackupPolicy;
  /** Applied only to the principal replace write (not the safety backup of current). */
  writeOptions?: AtomicWriteOptions;
}): RestoreResult {
  const read = readSaveFile(opts.backupPath);
  if (read.kind === "missing") {
    throw new StoreError("STORE_NOT_FOUND", "Backup file not found", 404);
  }
  if (read.kind === "error") {
    if (read.error.code === "STORE_SCHEMA_INCOMPATIBLE") throw read.error;
    throw new StoreError("STORE_BACKUP_INVALID", read.error.message, 400, read.error);
  }

  let previousBackup: BackupMeta | null = null;
  if (opts.currentValid) {
    previousBackup = createBackupFromValidSave(
      opts.backupDir,
      opts.currentValid,
      opts.policy || DEFAULT_POLICY,
    );
  }

  atomicWriteJson(opts.savePath, read.data, opts.writeOptions || {});

  const verify = readSaveFile(opts.savePath);
  if (verify.kind !== "ok") {
    throw new StoreError(
      "STORE_IO_WRITE",
      "Restore wrote file but post-verify failed",
      500,
      verify.kind === "error" ? verify.error : undefined,
    );
  }

  return { restored: verify.data, previousBackup };
}
