import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = join(ROOT, "data", "save.json");

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

type SaveFile = {
  characters: CharacterRow[];
  catalog: CatalogState | null;
  adminActions: AdminActionRow[];
  /** Agregados Galeria da Fama — scope local no standalone. */
  fame: Record<string, unknown> | null;
};

function emptySave(): SaveFile {
  return { characters: [], catalog: null, adminActions: [], fame: null };
}

function load(): SaveFile {
  if (!existsSync(DATA_PATH)) return emptySave();
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as SaveFile;
    return {
      characters: Array.isArray(raw.characters) ? raw.characters : [],
      catalog: raw.catalog && typeof raw.catalog === "object" ? raw.catalog : null,
      adminActions: Array.isArray(raw.adminActions) ? raw.adminActions : [],
      fame: raw.fame && typeof raw.fame === "object" ? raw.fame : null,
    };
  } catch {
    return emptySave();
  }
}

function save(data: SaveFile) {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export const store = {
  path: DATA_PATH,

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
    if (data.characters.some((c) => c.userId === row.userId && c.name === row.name)) {
      throw Object.assign(new Error("Você já tem um personagem com esse nome"), { status: 400 });
    }
    for (const c of data.characters) {
      if (c.userId === row.userId) c.isActive = false;
    }
    data.characters.push(row);
    save(data);
    return row;
  },

  selectCharacter(userId: number, characterId: string): CharacterRow {
    const data = load();
    const row = data.characters.find((c) => c.id === characterId && c.userId === userId);
    if (!row) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    for (const c of data.characters) {
      if (c.userId === userId) c.isActive = c.id === characterId;
    }
    save(data);
    return row;
  },

  deleteCharacter(userId: number, characterId: string): void {
    const data = load();
    const idx = data.characters.findIndex((c) => c.id === characterId && c.userId === userId);
    if (idx < 0) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    const wasActive = data.characters[idx]!.isActive;
    data.characters.splice(idx, 1);
    if (wasActive) {
      const next = data.characters.find((c) => c.userId === userId);
      if (next) next.isActive = true;
    }
    save(data);
  },

  updateCharacter(
    id: string,
    patch: Partial<CharacterRow>,
    expectedUpdatedAt?: string,
    fameMutator?: (fame: Record<string, unknown> | null, row: CharacterRow) => Record<string, unknown> | null,
  ): CharacterRow {
    const data = load();
    const row = data.characters.find((c) => c.id === id);
    if (!row) throw Object.assign(new Error("Personagem não encontrado"), { status: 404 });
    if (expectedUpdatedAt && row.updatedAt !== expectedUpdatedAt) {
      throw Object.assign(new Error("Personagem atualizado em paralelo — tente de novo"), {
        status: 409,
        code: "STALE_CHARACTER",
      });
    }
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    if (typeof fameMutator === "function") {
      data.fame = fameMutator(data.fame, row);
    }
    save(data);
    return row;
  },

  getFame(): Record<string, unknown> | null {
    return load().fame;
  },

  setFame(fame: Record<string, unknown> | null): void {
    const data = load();
    data.fame = fame;
    save(data);
  },

  /** Lista todos os personagens (blobs) para reconcile de fame — uso sob demanda. */
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
    data.catalog = catalog;
    save(data);
  },

  listActiveCharacters(): CharacterRow[] {
    return load()
      .characters.filter((c) => c.isActive)
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  },

  pushAdminAction(row: AdminActionRow): void {
    const data = load();
    data.adminActions = [row, ...(data.adminActions || [])].slice(0, 200);
    save(data);
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
};
