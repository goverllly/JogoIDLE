/**
 * Standalone JSON persistence for Jogo IDLE.
 *
 * Concurrency (single Node process):
 * - Each mutating method performs load→mutate→save synchronously; the event
 *   loop does not interleave other JS between those steps.
 * - Gameplay in local-service/admin-service often loads a character, awaits
 *   async work, then persist() with optimistic `expectedUpdatedAt`
 *   (STALE_CHARACTER / 409). That is the real logical-transaction guard.
 * - A mutex around save() alone would NOT cover that async gap — we do not
 *   claim otherwise.
 * - updatedAt uses a monotonic suffix so two updates in the same ms do not
 *   share an identical revision token.
 *
 * Multi-process / multi-instance sharing one save.json: NOT supported.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { StoreError } from "./store-errors.ts";
import {
  atomicWriteJson,
  copyCorruptEvidence,
  emptySave,
  readSaveFile,
  STORE_SCHEMA_VERSION,
  type AdminActionRow,
  type AtomicWriteOptions,
  type CatalogState,
  type CharacterRow,
  type SaveFile,
} from "./store-io.ts";
import {
  createBackupFromValidSave,
  listBackups,
  restoreBackupToSavePath,
  type BackupMeta,
  type BackupPolicy,
} from "./store-backup.ts";

export type { CharacterRow, CatalogState, AdminActionRow, SaveFile, BackupMeta };
export { StoreError, STORE_SCHEMA_VERSION };
export { isStoreError } from "./store-errors.ts";

export type StorePaths = {
  savePath: string;
  backupDir: string;
  evidenceDir: string;
};

function defaultPaths(): StorePaths {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dataDir = process.env.IDLE_DATA_DIR
    ? process.env.IDLE_DATA_DIR
    : join(root, "data");
  const savePath = process.env.IDLE_SAVE_PATH || join(dataDir, "save.json");
  return {
    savePath,
    backupDir: process.env.IDLE_BACKUP_DIR || join(dirname(savePath), "backups"),
    evidenceDir: process.env.IDLE_EVIDENCE_DIR || dirname(savePath),
  };
}

type StoreState = {
  paths: StorePaths;
  /** When set, all writes are refused until clearPersistenceBlock / successful restore. */
  block: StoreError | null;
  /** Last known valid snapshot (memory); null if never loaded successfully. */
  lastValid: SaveFile | null;
  /** Monotonic counter for updatedAt uniqueness within the process. */
  revisionSeq: number;
  writeOptions: AtomicWriteOptions;
  backupPolicy: BackupPolicy;
  /** Create a backup every N successful writes (0 = only explicit/destructive). */
  backupEveryNWrites: number;
  writesSinceBackup: number;
};

function createState(paths: StorePaths): StoreState {
  return {
    paths,
    block: null,
    lastValid: null,
    revisionSeq: 0,
    writeOptions: {},
    backupPolicy: { retention: 20 },
    backupEveryNWrites: 25,
    writesSinceBackup: 0,
  };
}

let state = createState(defaultPaths());

function nextUpdatedAt(): string {
  state.revisionSeq += 1;
  return `${new Date().toISOString()}#${state.revisionSeq}`;
}

function assertWritable(): void {
  if (state.block) {
    throw new StoreError(
      "STORE_PERSISTENCE_BLOCKED",
      `Persistence blocked: ${state.block.code} — ${state.block.message}. Restore a valid backup or fix the save file before writing.`,
      503,
      state.block,
    );
  }
}

function markBlocked(error: StoreError): void {
  state.block = error;
  // Forensic copy only — principal save.json stays in place.
  if (
    error.code === "STORE_JSON_INVALID" ||
    error.code === "STORE_STRUCTURE_INVALID" ||
    error.code === "STORE_IO_READ"
  ) {
    copyCorruptEvidence(state.paths.savePath, state.evidenceDir);
  }
}

/**
 * Load validated save. Missing file → empty (first use) only when path truly absent.
 * Corrupt / incompatible → block writes, keep file, throw on mutate paths via assertWritable
 * after marking; readers that need data throw too if blocked mid-session... 
 * For load(): if corrupt, we mark blocked and throw so callers don't proceed with empty.
 */
function load(): SaveFile {
  const result = readSaveFile(state.paths.savePath);

  if (result.kind === "missing") {
    // First use only when the file does not exist AND data dir is usable.
    if (state.block) {
      throw new StoreError(
        "STORE_PERSISTENCE_BLOCKED",
        "Save missing while persistence is blocked — refusing empty bootstrap",
        503,
        state.block,
      );
    }
    const dir = dirname(state.paths.savePath);
    try {
      mkdirSync(dir, { recursive: true });
      accessSync(dir, constants.R_OK | constants.W_OK);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      throw new StoreError(
        "STORE_PERMISSION",
        `Data directory not accessible for first-use save: ${e?.message || String(err)}`,
        500,
        err,
      );
    }
    const empty = emptySave();
    state.lastValid = structuredClone(empty);
    return empty;
  }

  if (result.kind === "error") {
    markBlocked(result.error);
    throw result.error;
  }

  // Successful read clears previous block (e.g. operator fixed file on disk).
  state.block = null;
  state.lastValid = structuredClone(result.data);
  return result.data;
}

function persistSave(data: SaveFile): void {
  assertWritable();
  atomicWriteJson(state.paths.savePath, data, state.writeOptions);
  state.lastValid = structuredClone(data);
  state.writesSinceBackup += 1;
  if (state.backupEveryNWrites > 0 && state.writesSinceBackup >= state.backupEveryNWrites) {
    try {
      createBackupFromValidSave(state.paths.backupDir, data, state.backupPolicy);
      state.writesSinceBackup = 0;
    } catch {
      /* backup failure must not roll back a successful principal write */
    }
  }
}

function backupBeforeDestructive(): void {
  if (!state.lastValid) return;
  try {
    createBackupFromValidSave(state.paths.backupDir, state.lastValid, state.backupPolicy);
    state.writesSinceBackup = 0;
  } catch {
    /* non-fatal for read path; destructive ops still proceed after attempt */
  }
}

/** Test / harness helpers — do not use in production request paths. */
export const storeTestApi = {
  resetForTests(paths?: Partial<StorePaths>, opts?: { writeOptions?: AtomicWriteOptions }) {
    state = createState({ ...defaultPaths(), ...paths } as StorePaths);
    if (paths?.savePath || paths?.backupDir || paths?.evidenceDir) {
      state.paths = {
        savePath: paths.savePath || state.paths.savePath,
        backupDir: paths.backupDir || state.paths.backupDir,
        evidenceDir: paths.evidenceDir || state.paths.evidenceDir,
      };
    }
    if (opts?.writeOptions) state.writeOptions = { ...opts.writeOptions };
  },
  setWriteOptions(opts: AtomicWriteOptions) {
    state.writeOptions = { ...opts };
  },
  getPaths(): StorePaths {
    return { ...state.paths };
  },
  getBlock(): StoreError | null {
    return state.block;
  },
  clearBlockForTests() {
    state.block = null;
  },
};

export const store = {
  get path() {
    return state.paths.savePath;
  },

  get persistenceBlocked(): boolean {
    return state.block != null;
  },

  get persistenceBlockError(): StoreError | null {
    return state.block;
  },

  listCharacters(userId: number): CharacterRow[] {
    return load()
      .characters.filter((c) => c.userId === userId)
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.createdAt.localeCompare(b.createdAt));
  },

  countCharacters(userId: number): number {
    return load().characters.filter((c) => c.userId === userId).length;
  },

  findCharacter(id: string, userId?: number): CharacterRow | null {
    const row = load().characters.find((c) => c.id === id);
    if (!row) return null;
    if (userId !== undefined && row.userId !== userId) return null;
    return row;
  },

  findActive(userId: number): CharacterRow | null {
    return load().characters.find((c) => c.userId === userId && c.isActive) || null;
  },

  createCharacter(row: CharacterRow): CharacterRow {
    const data = load();
    assertWritable();
    if (data.characters.some((c) => c.userId === row.userId && c.name === row.name)) {
      throw Object.assign(new Error("Você já tem um personagem com esse nome"), { status: 400 });
    }
    for (const c of data.characters) {
      if (c.userId === row.userId) c.isActive = false;
    }
    const stamped = { ...row, updatedAt: row.updatedAt || nextUpdatedAt() };
    data.characters.push(stamped);
    persistSave(data);
    return stamped;
  },

  selectCharacter(userId: number, characterId: string): CharacterRow {
    const data = load();
    assertWritable();
    const row = data.characters.find((c) => c.id === characterId && c.userId === userId);
    if (!row) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    for (const c of data.characters) {
      if (c.userId === userId) c.isActive = c.id === characterId;
    }
    row.updatedAt = nextUpdatedAt();
    persistSave(data);
    return row;
  },

  deleteCharacter(userId: number, characterId: string): void {
    const data = load();
    assertWritable();
    backupBeforeDestructive();
    const idx = data.characters.findIndex((c) => c.id === characterId && c.userId === userId);
    if (idx < 0) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    const wasActive = data.characters[idx]!.isActive;
    data.characters.splice(idx, 1);
    if (wasActive) {
      const next = data.characters.find((c) => c.userId === userId);
      if (next) next.isActive = true;
    }
    persistSave(data);
  },

  updateCharacter(
    id: string,
    patch: Partial<CharacterRow>,
    expectedUpdatedAt?: string,
    fameMutator?: (fame: Record<string, unknown> | null, row: CharacterRow) => Record<string, unknown> | null,
  ): CharacterRow {
    const data = load();
    assertWritable();
    const row = data.characters.find((c) => c.id === id);
    if (!row) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    if (expectedUpdatedAt && row.updatedAt !== expectedUpdatedAt) {
      throw Object.assign(new Error("Personagem atualizado em paralelo — tente de novo"), {
        status: 409,
        code: "STALE_CHARACTER",
      });
    }
    Object.assign(row, patch, { updatedAt: nextUpdatedAt() });
    if (typeof fameMutator === "function") {
      data.fame = fameMutator(data.fame, row);
    }
    persistSave(data);
    return row;
  },

  getFame(): Record<string, unknown> | null {
    return load().fame;
  },

  setFame(fame: Record<string, unknown> | null): void {
    const data = load();
    assertWritable();
    data.fame = fame;
    persistSave(data);
  },

  listAllCharacters(): CharacterRow[] {
    return load().characters.slice();
  },

  listOnline(sinceIso: string): CharacterRow[] {
    return load().characters.filter((c) => c.lastSeenAt && c.lastSeenAt >= sinceIso);
  },

  getCatalog(): CatalogState | null {
    return load().catalog;
  },

  setCatalog(catalog: CatalogState): void {
    const data = load();
    assertWritable();
    data.catalog = catalog;
    persistSave(data);
  },

  listActiveCharacters(): CharacterRow[] {
    return load()
      .characters.filter((c) => c.isActive)
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  },

  pushAdminAction(row: AdminActionRow): void {
    const data = load();
    assertWritable();
    data.adminActions = [row, ...(data.adminActions || [])].slice(0, 200);
    persistSave(data);
  },

  listAdminActions(limit = 50): Omit<AdminActionRow, "payload">[] {
    return (load().adminActions || []).slice(0, limit).map(({ id, at, adminEmail, action, summary }) => ({
      id,
      at,
      adminEmail,
      action,
      summary,
    }));
  },

  /** Internal backup API (no HTTP in Phase 1). */
  createBackupNow(): BackupMeta {
    const data = load();
    assertWritable();
    return createBackupFromValidSave(state.paths.backupDir, data, state.backupPolicy);
  },

  listBackups(): BackupMeta[] {
    return listBackups(state.paths.backupDir);
  },

  /**
   * Restore from a backup file path. Validates backup, preserves current if valid,
   * atomic replace, verify. Clears persistence block on success.
   */
  restoreFromBackupFile(backupPath: string): { restoredChars: number; previousBackup: BackupMeta | null } {
    if (state.block && state.block.code === "STORE_SCHEMA_INCOMPATIBLE") {
      // Still allow restore from a compatible backup file.
    }
    let currentValid: SaveFile | null = null;
    if (!state.block) {
      try {
        currentValid = load();
      } catch {
        currentValid = state.lastValid ? structuredClone(state.lastValid) : null;
      }
    } else {
      currentValid = state.lastValid ? structuredClone(state.lastValid) : null;
    }

    // Temporarily clear write block for the restore write itself.
    const prevBlock = state.block;
    state.block = null;
    try {
      const result = restoreBackupToSavePath({
        backupPath,
        savePath: state.paths.savePath,
        backupDir: state.paths.backupDir,
        currentValid,
        policy: state.backupPolicy,
        writeOptions: state.writeOptions,
      });
      state.lastValid = structuredClone(result.restored);
      state.block = null;
      state.writesSinceBackup = 0;
      return {
        restoredChars: result.restored.characters.length,
        previousBackup: result.previousBackup,
      };
    } catch (err) {
      state.block = prevBlock;
      throw err;
    }
  },

  /** True when the principal save path exists on disk. */
  saveFileExists(): boolean {
    return existsSync(state.paths.savePath);
  },
};
