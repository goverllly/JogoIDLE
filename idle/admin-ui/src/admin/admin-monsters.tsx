
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  AdminMonsterVisualOption,
  AdminZone,
  MonsterDraftRow,
} from "./admin-types";
import { AdminPreviewFrame } from "./studio/admin-preview-frame";
import { useAdminPreviewBridge } from "./studio/use-admin-preview-bridge";
import {
  StudioBadge,
  StudioBtn,
  StudioCatalog,
  StudioEmpty,
  StudioField,
  StudioFormSection,
  StudioInspector,
  StudioTabs,
} from "./studio/studio-ui";

type AdminMonstersPanelProps = {
  zones: AdminZone[];
  zoneId: string;
  monsterDrafts: MonsterDraftRow[];
  bossDraft: MonsterDraftRow | null;
  bossOverridden: boolean;
  bossWaveSize: string;
  bossWaveSizeOverridden: boolean;
  monsterVisuals?: AdminMonsterVisualOption[];
  working: boolean;
  onZoneChange: (id: string) => void;
  onMonsterDraftsChange: (
    updater: (prev: MonsterDraftRow[]) => MonsterDraftRow[],
  ) => void;
  onBossDraftChange: (updater: (prev: MonsterDraftRow) => MonsterDraftRow) => void;
  onBossWaveSizeChange: (value: string) => void;
  onSaveMonsters: (event: FormEvent) => void;
  onResetBoss: () => void;
  onResetBossWaveSize: () => void;
};

const DEFAULT_VISUALS: AdminMonsterVisualOption[] = [
  { id: "skeleton_minion", label: "Skeleton Minion" },
  { id: "skeleton_rogue", label: "Skeleton Rogue" },
  { id: "skeleton_warrior", label: "Skeleton Warrior" },
  { id: "skeleton_mage", label: "Skeleton Mage" },
];

const MOB_TABS = [
  { id: "geral", label: "Geral" },
  { id: "atributos", label: "Atributos" },
  { id: "spawn", label: "Spawn" },
  { id: "habilidades", label: "Habilidades" },
  { id: "drops", label: "Drops" },
  { id: "balance", label: "Balanceamento" },
];

type CatalogEntry = {
  id: string;
  zoneId: string;
  zoneName: string;
  kind: "mob" | "boss";
  index: number;
  name: string;
  level: number;
  visualId?: string | null;
};

function slugKey(name: string, index: number, isBoss: boolean) {
  const slug = String(name || (isBoss ? "boss" : "mob"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return isBoss ? `boss:${slug || "boss"}` : `mob:${index}:${slug || "mob"}`;
}

export function AdminMonstersPanel({
  zones,
  zoneId,
  monsterDrafts,
  bossDraft,
  bossOverridden,
  bossWaveSize,
  bossWaveSizeOverridden,
  monsterVisuals,
  working,
  onZoneChange,
  onMonsterDraftsChange,
  onBossDraftChange,
  onBossWaveSizeChange,
  onSaveMonsters,
  onResetBoss,
  onResetBossWaveSize,
}: AdminMonstersPanelProps) {
  const autoWave = Math.max(2, (monsterDrafts.length || 2) * 2);
  const visuals = monsterVisuals?.length ? monsterVisuals : DEFAULT_VISUALS;
  const [query, setQuery] = useState("");
  const [filterZone, setFilterZone] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("geral");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { ready, showMonster } = useAdminPreviewBridge(iframeRef);

  const catalog = useMemo(() => {
    const rows: CatalogEntry[] = [];
    for (const z of zones) {
      (z.monsters || []).forEach((m, index) => {
        const key = slugKey(m.name, index, false);
        rows.push({
          id: `creature:${z.id}:${key}`,
          zoneId: z.id,
          zoneName: z.name,
          kind: "mob",
          index,
          name: m.name,
          level: m.level,
          visualId: m.visualId,
        });
      });
      if (z.boss) {
        const key = slugKey(z.boss.name, -1, true);
        rows.push({
          id: `creature:${z.id}:${key}`,
          zoneId: z.id,
          zoneName: z.name,
          kind: "boss",
          index: -1,
          name: z.boss.name,
          level: z.boss.level,
          visualId: z.boss.visualId,
        });
      }
    }
    return rows;
  }, [zones]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((c) => {
      if (filterZone !== "all" && c.zoneId !== filterZone) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.zoneName.toLowerCase().includes(q) ||
        c.id.includes(q)
      );
    });
  }, [catalog, query, filterZone]);

  const selectedEntry = catalog.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedEntry) return;
    if (selectedEntry.zoneId !== zoneId) {
      onZoneChange(selectedEntry.zoneId);
    }
  }, [selectedEntry?.id, selectedEntry?.zoneId, zoneId, onZoneChange]);

  const selectedKind = selectedEntry?.kind || "mob";
  const selectedIndex = selectedEntry?.index ?? 0;

  const activeRow: MonsterDraftRow | null =
    selectedKind === "boss"
      ? bossDraft
      : monsterDrafts[selectedIndex] || monsterDrafts[0] || null;

  useEffect(() => {
    if (!ready || !activeRow) return;
    showMonster({
      visualId: activeRow.visualId || "skeleton_minion",
      name: activeRow.name || "Monstro",
    });
  }, [ready, activeRow?.visualId, activeRow?.name, showMonster, activeRow]);

  function updateActive(key: keyof MonsterDraftRow, value: string) {
    if (selectedKind === "boss") {
      onBossDraftChange((prev) => ({ ...prev, [key]: value }));
      return;
    }
    onMonsterDraftsChange((prev) =>
      prev.map((row, i) => (i === selectedIndex ? { ...row, [key]: value } : row)),
    );
  }

  return (
    <form className="studio-2-split-3" onSubmit={onSaveMonsters}>
      <StudioCatalog
        head={
          <>
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm">Monstros</strong>
              <StudioBadge>{filtered.length}</StudioBadge>
            </div>
            <input
              className="studio-2-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome / zona"
            />
            <select
              className="studio-2-select"
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
            >
              <option value="all">Todas as zonas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </>
        }
      >
        {filtered.length === 0 ? (
          <StudioEmpty>Nenhum monstro</StudioEmpty>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn("studio-2-catalog__row", selectedId === c.id && "is-selected")}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {c.kind === "boss" ? "Boss · " : ""}
                  {c.name}
                </span>
                <span className="block truncate text-[0.62rem] text-[var(--studio-muted)]">
                  {c.zoneName} · Lv {c.level}
                </span>
              </span>
              {c.kind === "boss" ? <StudioBadge tone="warn">boss</StudioBadge> : null}
            </button>
          ))
        )}
      </StudioCatalog>

      <div className="studio-2-editor-pane">
        <div className="studio-2-editor-pane__head">
          <div>
            <h3 className="studio-2-section-title mb-0">
              {activeRow?.name || "Monstro"}
            </h3>
            <p className="text-[0.65rem] text-[var(--studio-muted)]">
              {selectedEntry?.id || "—"} · zona ativa {zoneId}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bossWaveSizeOverridden ? (
              <StudioBtn type="button" onClick={onResetBossWaveSize}>
                Reset onda
              </StudioBtn>
            ) : null}
            {bossOverridden ? (
              <StudioBtn type="button" onClick={onResetBoss}>
                Reset boss
              </StudioBtn>
            ) : null}
            <StudioBtn variant="gold" disabled={working} type="submit">
              {working ? "Salvando…" : "Salvar zona"}
            </StudioBtn>
          </div>
        </div>

        <StudioTabs tabs={MOB_TABS} active={tab} onChange={setTab} />

        {!activeRow ? (
          <StudioEmpty>Selecione um monstro no catálogo.</StudioEmpty>
        ) : (
          <>
            {tab === "geral" ? (
              <StudioFormSection title="Identidade">
                <StudioField label="Nome">
                  <input
                    className="studio-2-input"
                    value={activeRow.name}
                    onChange={(e) => updateActive("name", e.target.value)}
                  />
                </StudioField>
                <StudioField label="Modelo 3D">
                  <div className="grid grid-cols-2 gap-1">
                    {visuals.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={cn(
                          "studio-2-wb__prop",
                          activeRow.visualId === v.id && "is-armed",
                        )}
                        onClick={() => updateActive("visualId", v.id)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </StudioField>
              </StudioFormSection>
            ) : null}

            {tab === "atributos" ? (
              <StudioFormSection title="Combate">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["level", "Nível"],
                      ["hp", "HP"],
                      ["attack", "Ataque"],
                      ["defense", "Defesa"],
                      ["xp", "XP"],
                      ["gold", "Gold"],
                    ] as const
                  ).map(([key, label]) => (
                    <StudioField key={key} label={label}>
                      <input
                        className="studio-2-input"
                        value={activeRow[key]}
                        onChange={(e) => updateActive(key, e.target.value)}
                      />
                    </StudioField>
                  ))}
                </div>
              </StudioFormSection>
            ) : null}

            {tab === "spawn" ? (
              <StudioFormSection title="Spawn / onda">
                <StudioField label="Kills até o boss">
                  <input
                    className="studio-2-input w-28"
                    value={bossWaveSize}
                    onChange={(e) => onBossWaveSizeChange(e.target.value)}
                  />
                </StudioField>
                <p className="text-[0.68rem] text-[var(--studio-muted)]">
                  {bossWaveSizeOverridden ? "Override ativo" : `Padrão ≈ ${autoWave}`}. Lista de
                  mobs da zona = pool de spawn aleatório.
                </p>
              </StudioFormSection>
            ) : null}

            {tab === "habilidades" ? (
              <StudioFormSection title="Habilidades">
                <p className="text-[0.78rem] text-[var(--studio-muted)]">
                  O motor atual não possui skills configuráveis por monstro. Skills de combate
                  existem só no herói. Catálogo de habilidades de mob: Fase 2+.
                </p>
              </StudioFormSection>
            ) : null}

            {tab === "drops" ? (
              <StudioFormSection title="Drops">
                <p className="text-[0.78rem] text-[var(--studio-muted)]">
                  Recompensas usam pool global por <strong>tier da zona</strong> × chance de drop
                  da zona/boss. Loot tables por monstro: Fase 2. Use o módulo Loot & Drops ou o
                  Simulador.
                </p>
              </StudioFormSection>
            ) : null}

            {tab === "balance" ? (
              <StudioFormSection title="Balanceamento">
                <p className="text-[0.78rem] text-[var(--studio-muted)]">
                  Overrides de HP/ATK/etc. neste formulário. TTK global (hits mob/boss) fica em
                  Configurações / Economia. Simulador estima TTK sem gravar dados.
                </p>
              </StudioFormSection>
            ) : null}
          </>
        )}
      </div>

      <StudioInspector title="Preview 3D">
        <div className="min-h-[240px]">
          <AdminPreviewFrame iframeRef={iframeRef} ready={ready} title="Preview do monstro" className="h-[260px]" />
        </div>
        <dl className="space-y-1 text-[0.75rem]">
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">HP</dt><dd>{activeRow?.hp || "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">ATK</dt><dd>{activeRow?.attack || "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">DEF</dt><dd>{activeRow?.defense || "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">XP</dt><dd>{activeRow?.xp || "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Gold</dt><dd>{activeRow?.gold || "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--studio-muted)]">Visual</dt><dd className="truncate">{activeRow?.visualId || "—"}</dd></div>
        </dl>
      </StudioInspector>
    </form>
  );
}
