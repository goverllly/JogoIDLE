import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  chmodSync,
  existsSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { store, storeTestApi, StoreError, STORE_SCHEMA_VERSION } from "../store.ts";
import { atomicWriteJson, emptySave, validateSaveDocument } from "../store-io.ts";
import type { CharacterRow } from "../store-io.ts";

function tempWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "jogo-idle-store-"));
  return {
    root,
    savePath: join(root, "save.json"),
    backupDir: join(root, "backups"),
    evidenceDir: root,
  };
}

function sampleChar(overrides: Partial<CharacterRow> = {}): CharacterRow {
  const now = new Date().toISOString();
  return {
    id: "c1",
    userId: 1,
    name: "Hero",
    classId: "GUERREIRO",
    level: 1,
    experience: 0,
    gold: 100,
    isActive: true,
    state: {},
    lastSeenAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

let ws: ReturnType<typeof tempWorkspace>;

beforeEach(() => {
  ws = tempWorkspace();
  storeTestApi.resetForTests({
    savePath: ws.savePath,
    backupDir: ws.backupDir,
    evidenceDir: ws.evidenceDir,
  });
});

afterEach(() => {
  storeTestApi.resetForTests();
  try {
    rmSync(ws.root, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("store — first use and valid roundtrip", () => {
  it("primeira inicialização: ausente → empty sem criar arquivo até mutação", () => {
    assert.equal(store.saveFileExists(), false);
    assert.equal(store.listCharacters(1).length, 0);
    assert.equal(store.saveFileExists(), false);
    store.createCharacter(sampleChar());
    assert.equal(store.saveFileExists(), true);
    const raw = JSON.parse(readFileSync(ws.savePath, "utf8"));
    assert.equal(raw.schemaVersion, STORE_SCHEMA_VERSION);
    assert.equal(raw.characters.length, 1);
  });

  it("save válido roundtrip preserva personagem", () => {
    store.createCharacter(sampleChar({ gold: 42 }));
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    const row = store.findCharacter("c1", 1);
    assert.ok(row);
    assert.equal(row!.gold, 42);
  });
});

describe("store — corruption and schema", () => {
  it("JSON inválido: preserva arquivo, bloqueia write, não interpreta como first use", () => {
    writeFileSync(ws.savePath, "{not-json", "utf8");
    assert.throws(() => store.listCharacters(1), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.equal(err.code, "STORE_JSON_INVALID");
      return true;
    });
    assert.equal(readFileSync(ws.savePath, "utf8"), "{not-json");
    assert.equal(store.persistenceBlocked, true);
    assert.throws(() => store.createCharacter(sampleChar({ id: "c2", name: "Other" })), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.ok(err.code === "STORE_PERSISTENCE_BLOCKED" || err.code === "STORE_JSON_INVALID");
      return true;
    });
    assert.equal(readFileSync(ws.savePath, "utf8"), "{not-json");
  });

  it("JSON válido com estrutura inválida bloqueia sem wipe", () => {
    writeFileSync(ws.savePath, JSON.stringify({ characters: "nope" }), "utf8");
    assert.throws(() => store.listCharacters(1), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.equal(err.code, "STORE_STRUCTURE_INVALID");
      return true;
    });
    assert.equal(store.saveFileExists(), true);
    const still = JSON.parse(readFileSync(ws.savePath, "utf8"));
    assert.equal(still.characters, "nope");
  });

  it("reinicialização após corrupção continua bloqueada enquanto arquivo inválido existir", () => {
    writeFileSync(ws.savePath, "{broken", "utf8");
    assert.throws(() => store.listCharacters(1));
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    assert.throws(() => store.listCharacters(1), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.equal(err.code, "STORE_JSON_INVALID");
      return true;
    });
    assert.ok(existsSync(ws.savePath));
  });

  it("schemaVersion futuro: STORE_SCHEMA_INCOMPATIBLE (não tratado como corrupção recuperável genérica)", () => {
    const doc = emptySave();
    doc.schemaVersion = STORE_SCHEMA_VERSION + 10;
    writeFileSync(ws.savePath, JSON.stringify(doc), "utf8");
    assert.throws(() => store.listCharacters(1), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.equal(err.code, "STORE_SCHEMA_INCOMPATIBLE");
      return true;
    });
  });

  it("campos desconhecidos no top-level são preservados", () => {
    const doc = {
      ...emptySave(),
      experimentalFlag: { on: true },
      characters: [sampleChar()],
    };
    writeFileSync(ws.savePath, JSON.stringify(doc, null, 2), "utf8");
    store.updateCharacter("c1", { gold: 7 });
    const raw = JSON.parse(readFileSync(ws.savePath, "utf8"));
    assert.deepEqual(raw.experimentalFlag, { on: true });
  });
});

describe("store — atomic write failures", () => {
  it("falha antes do rename preserva último estado válido", () => {
    store.createCharacter(sampleChar({ gold: 10 }));
    const before = readFileSync(ws.savePath, "utf8");
    storeTestApi.setWriteOptions({ failBeforeRename: true });
    assert.throws(() => store.updateCharacter("c1", { gold: 99 }), (err: unknown) => {
      assert.ok(err instanceof StoreError);
      assert.equal(err.code, "STORE_IO_WRITE");
      return true;
    });
    assert.equal(readFileSync(ws.savePath, "utf8"), before);
    storeTestApi.setWriteOptions({});
    // May be blocked if markBlocked was called — IO_WRITE on persist doesn't markBlocked currently.
    // Clear and retry.
    storeTestApi.clearBlockForTests();
    const row = store.updateCharacter("c1", { gold: 11 });
    assert.equal(row.gold, 11);
  });

  it("falha durante temp write preserva principal", () => {
    store.createCharacter(sampleChar({ gold: 5 }));
    const before = readFileSync(ws.savePath, "utf8");
    storeTestApi.setWriteOptions({ failDuringTempWrite: true });
    assert.throws(() => store.updateCharacter("c1", { gold: 50 }));
    assert.equal(readFileSync(ws.savePath, "utf8"), before);
    storeTestApi.setWriteOptions({});
  });

  it("falhas de escrita não deixam .tmp órfãos no diretório do save", () => {
    store.createCharacter(sampleChar({ gold: 1 }));
    const listTmps = () =>
      readdirSync(ws.root).filter((n) => n.includes(".tmp") || n.startsWith(".save-"));

    storeTestApi.setWriteOptions({ failBeforeRename: true });
    assert.throws(() => store.updateCharacter("c1", { gold: 2 }));
    assert.deepEqual(listTmps(), []);

    storeTestApi.setWriteOptions({ failDuringTempWrite: true });
    assert.throws(() => store.updateCharacter("c1", { gold: 3 }));
    assert.deepEqual(listTmps(), []);
    storeTestApi.setWriteOptions({});
  });
});

describe("store — permission", () => {
  it("arquivo sem permissão de leitura reporta STORE_PERMISSION", function () {
    if (process.platform === "win32") {
      this.skip();
      return;
    }
    store.createCharacter(sampleChar());
    chmodSync(ws.savePath, 0);
    try {
      storeTestApi.resetForTests({
        savePath: ws.savePath,
        backupDir: ws.backupDir,
        evidenceDir: ws.evidenceDir,
      });
      assert.throws(() => store.listCharacters(1), (err: unknown) => {
        assert.ok(err instanceof StoreError);
        assert.equal(err.code, "STORE_PERMISSION");
        return true;
      });
    } finally {
      chmodSync(ws.savePath, 0o600);
    }
  });
});

describe("store — concurrency / STALE_CHARACTER", () => {
  it("updatedAt monotônico evita colisão no mesmo ms", () => {
    store.createCharacter(sampleChar());
    const a = store.updateCharacter("c1", { gold: 1 });
    const b = store.updateCharacter("c1", { gold: 2 }, a.updatedAt);
    assert.notEqual(a.updatedAt, b.updatedAt);
    assert.match(b.updatedAt, /#\d+$/);
  });

  it("duas atualizações com o mesmo expected: segunda STALE_CHARACTER", () => {
    store.createCharacter(sampleChar());
    const row = store.findCharacter("c1")!;
    const expected = row.updatedAt;
    store.updateCharacter("c1", { gold: 20 }, expected);
    assert.throws(() => store.updateCharacter("c1", { gold: 30 }, expected), (err: unknown) => {
      assert.equal((err as { code?: string }).code, "STALE_CHARACTER");
      assert.equal((err as { status?: number }).status, 409);
      return true;
    });
    assert.equal(store.findCharacter("c1")!.gold, 20);
  });

  it("chamadas assíncronas concorrentes: no máximo uma vence com o mesmo token", async () => {
    store.createCharacter(sampleChar({ gold: 0 }));
    const expected = store.findCharacter("c1")!.updatedAt;
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        Promise.resolve().then(() => store.updateCharacter("c1", { gold: 100 + i }, expected)),
      ),
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 7);
    for (const r of rejected) {
      assert.equal((r as PromiseRejectedResult).reason?.code, "STALE_CHARACTER");
    }
  });

  it("save legado com updatedAt ISO puro ainda funciona com STALE_CHARACTER", () => {
    const legacyIso = "2024-01-15T12:00:00.000Z";
    assert.equal(Number.isNaN(Date.parse(legacyIso)), false);
    const doc = {
      ...emptySave(),
      characters: [sampleChar({ id: "legacy", updatedAt: legacyIso, gold: 3 })],
    };
    writeFileSync(ws.savePath, JSON.stringify(doc, null, 2), "utf8");
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    const row = store.findCharacter("legacy")!;
    assert.equal(row.updatedAt, legacyIso);
    // Date.parse on ISO#seq would be NaN — document residual risk; equality token must work.
    const next = store.updateCharacter("legacy", { gold: 4 }, legacyIso);
    assert.match(next.updatedAt, /#\d+$/);
    assert.equal(Number.isNaN(Date.parse(next.updatedAt)), true);
    assert.throws(() => store.updateCharacter("legacy", { gold: 5 }, legacyIso), (err: unknown) => {
      assert.equal((err as { code?: string }).code, "STALE_CHARACTER");
      return true;
    });
  });
});

describe("store — backup and restore", () => {
  it("backup só de estado válido; restore valida e substitui atomicamente", () => {
    store.createCharacter(sampleChar({ name: "Alpha", gold: 1 }));
    const bak = store.createBackupNow();
    assert.ok(existsSync(bak.path));
    store.updateCharacter("c1", { gold: 999 });
    assert.equal(store.findCharacter("c1")!.gold, 999);
    const result = store.restoreFromBackupFile(bak.path);
    assert.equal(result.restoredChars, 1);
    assert.equal(store.findCharacter("c1")!.gold, 1);
  });

  it("restore a partir de corrupção: desbloqueia quando backup é válido", () => {
    store.createCharacter(sampleChar({ gold: 77 }));
    const bak = store.createBackupNow();
    writeFileSync(ws.savePath, "{corrupt", "utf8");
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    assert.throws(() => store.listCharacters(1));
    store.restoreFromBackupFile(bak.path);
    assert.equal(store.persistenceBlocked, false);
    assert.equal(store.findCharacter("c1")!.gold, 77);
  });

  it("deleteCharacter cria backup antes de remover", () => {
    store.createCharacter(sampleChar({ id: "del-me", name: "Doomed", gold: 12 }));
    assert.equal(store.listBackups().length, 0);
    store.deleteCharacter(1, "del-me");
    assert.ok(store.listBackups().length >= 1);
    assert.equal(store.findCharacter("del-me"), null);
  });

  it("falha no rename durante restore preserva o principal", () => {
    store.createCharacter(sampleChar({ gold: 40 }));
    const bak = store.createBackupNow();
    store.updateCharacter("c1", { gold: 80 });
    const before = readFileSync(ws.savePath, "utf8");
    storeTestApi.setWriteOptions({ failBeforeRename: true });
    assert.throws(() => store.restoreFromBackupFile(bak.path));
    assert.equal(readFileSync(ws.savePath, "utf8"), before);
    assert.equal(store.findCharacter("c1")!.gold, 80);
    storeTestApi.setWriteOptions({});
  });
});

describe("store — smoke integração tmp", () => {
  it("create → update → reinício → backup → corrupt → restore", () => {
    store.createCharacter(sampleChar({ name: "Smoke", gold: 10 }));
    store.updateCharacter("c1", { gold: 25 });
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    assert.equal(store.findCharacter("c1")!.gold, 25);
    const bak = store.createBackupNow();
    writeFileSync(ws.savePath, "{nope", "utf8");
    storeTestApi.resetForTests({
      savePath: ws.savePath,
      backupDir: ws.backupDir,
      evidenceDir: ws.evidenceDir,
    });
    assert.throws(() => store.listCharacters(1));
    store.restoreFromBackupFile(bak.path);
    assert.equal(store.findCharacter("c1")!.name, "Smoke");
    assert.equal(store.findCharacter("c1")!.gold, 25);
  });
});

describe("store — real save path isolation", () => {
  it("testes não tocam idle/data/save.json do projeto", () => {
    const projectSave = join(process.cwd(), "data", "save.json");
    // cwd during npm test is idle/
    let before: string | null = null;
    if (existsSync(projectSave)) before = readFileSync(projectSave, "utf8");
    store.createCharacter(sampleChar({ name: "TempOnly" }));
    if (before === null) {
      assert.equal(existsSync(projectSave), false);
    } else {
      assert.equal(readFileSync(projectSave, "utf8"), before);
    }
    assert.ok(ws.savePath !== projectSave);
  });
});

describe("validateSaveDocument unit", () => {
  it("rejeita root não-objeto", () => {
    assert.throws(() => validateSaveDocument([]), (e: unknown) => {
      assert.ok(e instanceof StoreError);
      assert.equal(e.code, "STORE_STRUCTURE_INVALID");
      return true;
    });
  });

  it("atomicWriteJson roundtrip helper", () => {
    const p = join(ws.root, "direct.json");
    atomicWriteJson(p, { ...emptySave(), characters: [sampleChar()] });
    const raw = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(raw.characters[0].name, "Hero");
  });
});
