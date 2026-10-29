import { useEffect, useRef, useState } from "react";
import type { AdminZone, MonsterDraftRow } from "./admin-types";

export type MonsterPhase = "saved" | "dirty" | "saving" | "error";

export type MonsterSnap = {
  drafts: MonsterDraftRow[];
  boss: MonsterDraftRow | null;
  wave: string;
};

type Run = (action: () => Promise<void>) => Promise<boolean>;

type UseMonsterDraftArgs = {
  zones: AdminZone[];
  zoneId: string;
  onZoneChange: (id: string) => void;
  run: Run;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  applyCatalogPayload: (data: any) => void;
  onMessage: (message: string | null) => void;
  onRefresh: () => Promise<void>;
};

function rowFrom(raw: {
  name: string;
  level: number;
  hp: number;
  attack?: number;
  defense?: number;
  xp?: number;
  gold?: number;
  visualId?: string | null;
}, fallbackVisual: string): MonsterDraftRow {
  return {
    name: raw.name,
    level: String(raw.level),
    hp: String(raw.hp),
    attack: String(raw.attack ?? 1),
    defense: String(raw.defense ?? Math.floor(raw.level * (fallbackVisual === "skeleton_warrior" ? 1.4 : 0.85))),
    xp: String(raw.xp ?? raw.level * (fallbackVisual === "skeleton_warrior" ? 20 : 14)),
    gold: String(raw.gold ?? Math.round(raw.level * (fallbackVisual === "skeleton_warrior" ? 8 : 4.5))),
    visualId: raw.visualId || fallbackVisual,
  };
}

export function readMonsterSnap(zone: AdminZone): MonsterSnap {
  const drafts = (zone.monsters || []).map((mob) => rowFrom(mob, "skeleton_minion"));
  const boss = zone.boss ? rowFrom(zone.boss, "skeleton_warrior") : null;
  const wave =
    zone.bossWaveSize != null && Number.isFinite(Number(zone.bossWaveSize))
      ? Math.max(1, Math.floor(Number(zone.bossWaveSize)))
      : Math.max(2, (zone.monsters?.length || 2) * 2);
  return { drafts, boss, wave: String(wave) };
}

function cloneSnap(snap: MonsterSnap): MonsterSnap {
  return {
    drafts: snap.drafts.map((row) => ({ ...row })),
    boss: snap.boss ? { ...snap.boss } : null,
    wave: snap.wave,
  };
}

function sameSnap(a: MonsterSnap, b: MonsterSnap) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mobPayload(row: MonsterDraftRow, visualFallback: string) {
  return {
    name: row.name.trim() || "Monstro",
    level: Math.max(1, Math.floor(Number(row.level) || 1)),
    hpOverride: Math.max(1, Math.floor(Number(row.hp) || 1)),
    attackOverride: Math.max(1, Math.floor(Number(row.attack) || 1)),
    defenseOverride: Math.max(0, Math.floor(Number(row.defense) || 0)),
    xpOverride: Math.max(1, Math.floor(Number(row.xp) || 1)),
    goldOverride: Math.max(0, Math.floor(Number(row.gold) || 0)),
    visualId: row.visualId || visualFallback,
  };
}

export function useMonsterDraft({
  zones,
  zoneId,
  onZoneChange,
  run,
  idleFetch,
  applyCatalogPayload,
  onMessage,
  onRefresh,
}: UseMonsterDraftArgs) {
  const [drafts, setDrafts] = useState<MonsterDraftRow[]>([]);
  const [boss, setBoss] = useState<MonsterDraftRow | null>(null);
  const [wave, setWave] = useState("8");
  const [bossOverridden, setBossOverridden] = useState(false);
  const [waveOverridden, setWaveOverridden] = useState(false);
  const [baseline, setBaseline] = useState<MonsterSnap | null>(null);
  const [selectedKey, setSelectedKey] = useState("mob:0");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const failedSnap = useRef<string | null>(null);
  const [zoneGate, setZoneGate] = useState<string | null>(null);
  const acceptRef = useRef(true);
  const zoneRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const snapRef = useRef<MonsterSnap>({ drafts, boss, wave });
  snapRef.current = { drafts, boss, wave };

  const current = { drafts, boss, wave };
  const dirty = baseline != null && !sameSnap(current, baseline);
  dirtyRef.current = dirty;
  const phase: MonsterPhase =
    saving
      ? "saving"
      : failed && failedSnap.current === JSON.stringify(current)
        ? "error"
        : dirty
          ? "dirty"
          : "saved";

  function applySnap(snap: MonsterSnap, zone: AdminZone, resetSelection: boolean) {
    const next = cloneSnap(snap);
    setDrafts(next.drafts);
    setBoss(next.boss);
    setWave(next.wave);
    setBaseline(cloneSnap(next));
    setBossOverridden(Boolean(zone.boss?.overridden));
    setWaveOverridden(Boolean(zone.bossWaveSizeOverridden));
    setFailed(false);
    setSelectedKey((key) => {
      if (resetSelection || (key === "boss" && !next.boss) || (key.startsWith("mob:") && !next.drafts[Number(key.slice(4))])) {
        return next.drafts.length ? "mob:0" : "boss";
      }
      return key;
    });
  }

  useEffect(() => {
    const zone = zones.find((row) => row.id === zoneId) || zones[0];
    if (!zone) return;
    if (zone.id !== zoneId) {
      onZoneChange(zone.id);
      return;
    }
    const zoneChanged = zoneRef.current !== zone.id;
    if (!zoneChanged && !acceptRef.current && dirtyRef.current) return;
    zoneRef.current = zone.id;
    acceptRef.current = false;
    applySnap(readMonsterSnap(zone), zone, zoneChanged || zoneRef.current == null);
  }, [zones, zoneId, onZoneChange]);

  function revert() {
    if (!baseline) return;
    setDrafts(baseline.drafts.map((row) => ({ ...row })));
    setBoss(baseline.boss ? { ...baseline.boss } : null);
    setWave(baseline.wave);
    setFailed(false);
  }

  function requestZone(id: string) {
    if (!id || id === zoneId) return;
    if (dirty) {
      setZoneGate(id);
      return;
    }
    onZoneChange(id);
  }

  function confirmZoneDiscard() {
    if (!zoneGate) return;
    const id = zoneGate;
    setZoneGate(null);
    acceptRef.current = true;
    onZoneChange(id);
  }

  async function postZone(zone: Record<string, unknown>, message: string) {
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || message);
      acceptRef.current = true;
      await onRefresh();
    });
    setSaving(false);
    if (!ok) {
      failedSnap.current = JSON.stringify(snapRef.current);
      setFailed(true);
    }
    return ok;
  }

  async function save() {
    const snap = snapRef.current;
    const zone: Record<string, unknown> = {
      id: zoneId,
      monsters: snap.drafts.map((row) => mobPayload(row, "skeleton_minion")),
      bossWaveSize: Math.max(1, Math.min(200, Math.floor(Number(snap.wave) || 1))),
    };
    if (snap.boss) {
      const bossBody = mobPayload(snap.boss, "skeleton_warrior");
      zone.boss = {
        name: snap.boss.name.trim() || "Boss",
        level: bossBody.level,
        hpOverride: bossBody.hpOverride,
        attackOverride: bossBody.attackOverride,
        defenseOverride: bossBody.defenseOverride,
        xpOverride: bossBody.xpOverride,
        goldOverride: bossBody.goldOverride,
        visualId: bossBody.visualId,
      };
    }
    return postZone(zone, "Monstros e boss atualizados");
  }

  async function saveAndSwitchZone() {
    const id = zoneGate;
    const ok = await save();
    if (!ok || !id) return false;
    setZoneGate(null);
    onZoneChange(id);
    return true;
  }

  async function resetBoss() {
    return postZone({ id: zoneId, boss: null }, "Boss resetado para derivado");
  }

  async function resetWave() {
    return postZone({ id: zoneId, bossWaveSize: null }, "Onda do boss voltou ao padrão");
  }

  return {
    drafts,
    setDrafts,
    boss,
    setBoss,
    wave,
    setWave,
    bossOverridden,
    waveOverridden,
    selectedKey,
    setSelectedKey,
    dirty,
    phase,
    ready: baseline != null,
    zoneGate,
    setZoneGate,
    requestZone,
    confirmZoneDiscard,
    save,
    saveAndSwitchZone,
    resetBoss,
    resetWave,
    revert,
  };
}
