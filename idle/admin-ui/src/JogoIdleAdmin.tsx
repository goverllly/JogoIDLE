"use client";

import { useEffect, useRef, useState } from "react";
import { AdminActionsHistory } from "./admin/admin-actions-history";
import { AdminAdminsPanel } from "./admin/admin-admins";
import { AdminCharactersPanel } from "./admin/admin-characters";
import { AdminEconomyPanel } from "./admin/admin-economy";
import { AdminEngagementPanel } from "./admin/admin-engagement";
import { AdminItemsPanel } from "./admin/admin-items";
import { AdminLootPanel } from "./admin/admin-loot";
import { AdminHudBuilder, type AdminHudHandle } from "./admin/admin-hud-builder";
import { AdminMapEditor, type AdminMapHandle, type MapSavePhase } from "./admin/admin-map";
import { AdminMonstersPanel } from "./admin/admin-monsters";
import { AdminOverviewPanel } from "./admin/admin-overview";
import { AdminSeasonPanel } from "./admin/admin-season";
import { AdminSettingsPanel } from "./admin/admin-settings";
import { AdminShell } from "./admin/admin-shell";
import { StudioBtn, StudioModal } from "./admin/studio/studio-ui";
import { AdminSimulatePanel } from "./admin/admin-simulate";
import { AdminZonesPanel } from "./admin/admin-zones";
import {
  ADMIN_TABS,
  ADMIN_TAB_TITLES,
  type AdminActiveCharacter,
  type AdminCatalogItem,
  type AdminCatalogMeta,
  type AdminTabId,
  type AdminZone,
  type SeasonSummary,
} from "./admin/admin-types";
import { useItemDraft } from "./admin/use-item-draft";
import { useLiveOpsDraft } from "./admin/use-liveops-draft";
import { useMonsterDraft } from "./admin/use-monster-draft";

export type {
  AdminActiveCharacter,
  AdminCatalogItem,
  AdminCatalogMeta,
  AdminZone,
} from "./admin/admin-types";

const STORAGE_ZONE = "jogo-idle-admin-zoneId";
const STORAGE_TARGET = "jogo-idle-admin-targetId";
const STORAGE_TAB = "jogo-idle-admin-tab";

function readStorage(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export type JogoIdleAdminProps = {
  catalog: AdminCatalogItem[];
  catalogMeta: AdminCatalogMeta | null;
  activeCharacters: AdminActiveCharacter[];
  zones?: AdminZone[];
  balance?: Record<string, number> | null;
  adminEmails?: string[];
  busy: boolean;
  message: string | null;
  onMessage: (message: string | null) => void;
  onCatalogChange: (catalog: AdminCatalogItem[], meta?: AdminCatalogMeta | null) => void;
  onZonesChange?: (zones: AdminZone[]) => void;
  onBalanceChange?: (balance: Record<string, number> | null) => void;
  onRefresh: () => Promise<void>;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  maintenance: { enabled: boolean; message: string; since: string | null };
  onMaintenanceChange: (next: { enabled: boolean; message: string; since: string | null }) => void;
};

export function JogoIdleAdmin({
  catalog,
  catalogMeta,
  activeCharacters,
  zones = [],
  balance = null,
  adminEmails = [],
  busy,
  message,
  onMessage,
  onCatalogChange,
  onZonesChange,
  onBalanceChange,
  onRefresh,
  idleFetch,
  maintenance,
  onMaintenanceChange,
}: JogoIdleAdminProps) {
  const [adminTab, setAdminTab] = useState<AdminTabId>(() => {
    const saved = readStorage(STORAGE_TAB);
    const match = ADMIN_TABS.find((t) => t.id === saved && !t.disabled);
    return (match?.id || "overview") as AdminTabId;
  });
  const [targetId, setTargetId] = useState(() => {
    const saved = readStorage(STORAGE_TARGET);
    if (saved && activeCharacters.some((r) => r.id === saved)) return saved;
    return activeCharacters[0]?.id || "";
  });
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState(() => {
    const saved = readStorage(STORAGE_ZONE);
    if (saved && zones.some((z) => z.id === saved)) return saved;
    return zones[0]?.id || "";
  });
  const mapRef = useRef<AdminMapHandle>(null);
  const hudRef = useRef<AdminHudHandle>(null);
  const [mapDirty, setMapDirty] = useState(false);
  const [hudDirty, setHudDirty] = useState(false);
  const [mapPhase, setMapPhase] = useState<MapSavePhase>("saved");
  const [leave, setLeave] = useState<
    | { kind: "tab"; tab: AdminTabId; source: "map" | "items" | "monsters" | "economy" | "hud" }
    | { kind: "lobby"; source: "map" | "items" | "monsters" | "economy" | "hud" }
    | null
  >(null);
  const [currentSeason, setCurrentSeason] = useState<SeasonSummary | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  const items = useItemDraft({
    catalog,
    targetId,
    run,
    idleFetch,
    applyCatalogPayload,
    onMessage,
    onRefresh,
  });
  const monsters = useMonsterDraft({
    zones: zones || [],
    zoneId,
    onZoneChange: setZoneId,
    run,
    idleFetch,
    applyCatalogPayload,
    onMessage,
    onRefresh,
  });
  const ops = useLiveOpsDraft({
    catalogMeta,
    balance,
    run,
    idleFetch,
    applyCatalogPayload,
    onMessage,
    onRefresh,
  });

  useEffect(() => {
    writeStorage(STORAGE_TAB, adminTab);
    onMessage(null);
  }, [adminTab, onMessage]);

  function requestTabChange(id: AdminTabId) {
    if (id === adminTab) return;
    if (adminTab === "map" && mapDirty) {
      setLeave({ kind: "tab", tab: id, source: "map" });
      return;
    }
    if (adminTab === "items" && items.dirty) {
      setLeave({ kind: "tab", tab: id, source: "items" });
      return;
    }
    if (adminTab === "monsters" && monsters.dirty) {
      setLeave({ kind: "tab", tab: id, source: "monsters" });
      return;
    }
    if (adminTab === "economy" && ops.dirty) {
      setLeave({ kind: "tab", tab: id, source: "economy" });
      return;
    }
    if (adminTab === "hud" && hudDirty) {
      setLeave({ kind: "tab", tab: id, source: "hud" });
      return;
    }
    setAdminTab(id);
  }

  function finishLeave() {
    const action = leave;
    setLeave(null);
    if (action?.source === "map") mapRef.current?.allowLeave();
    if (action?.source === "items") items.revert();
    if (action?.source === "monsters") monsters.revert();
    if (action?.source === "economy") ops.revert();
    if (action?.source === "hud") {
      void hudRef.current?.discard().then(() => {
        if (action.kind === "tab") setAdminTab(action.tab);
        if (action.kind === "lobby") window.location.assign("/jogo-idle/lobby.html");
      });
      return;
    }
    if (!action) return;
    if (action.kind === "tab") setAdminTab(action.tab);
    if (action.kind === "lobby") window.location.assign("/jogo-idle/lobby.html");
  }

  useEffect(() => {
    const dirty =
      (adminTab === "items" && items.dirty) ||
      (adminTab === "monsters" && monsters.dirty) ||
      (adminTab === "economy" && ops.dirty) ||
      (adminTab === "hud" && hudDirty);
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [adminTab, items.dirty, monsters.dirty, ops.dirty, hudDirty]);

  useEffect(() => {
    if (targetId) writeStorage(STORAGE_TARGET, targetId);
  }, [targetId]);

  useEffect(() => {
    if (zoneId) writeStorage(STORAGE_ZONE, zoneId);
  }, [zoneId]);

  useEffect(() => {
    if (
      adminTab !== "season" &&
      adminTab !== "overview" &&
      adminTab !== "economy" &&
      adminTab !== "characters"
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (adminTab === "season") setSeasonLoading(true);
      try {
        const data = await idleFetch("/api/jogo-idle/seasons");
        if (cancelled) return;
        const open =
          data.current || data.seasons?.find((s: SeasonSummary) => s.status === "OPEN") || null;
        setCurrentSeason(open);
      } catch (err) {
        if (!cancelled && adminTab === "season") {
          setError(err instanceof Error ? err.message : "Falha ao carregar temporada");
        }
      } finally {
        if (!cancelled) setSeasonLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminTab, idleFetch]);

  const target =
    activeCharacters.find((row) => row.id === targetId) || activeCharacters[0] || null;

  useEffect(() => {
    if (!activeCharacters.length) {
      setTargetId("");
      return;
    }
    if (!activeCharacters.some((row) => row.id === targetId)) {
      setTargetId(activeCharacters[0].id);
    }
  }, [activeCharacters, targetId]);

  const working = busy || localBusy;

  async function run(action: () => Promise<void>) {
    setLocalBusy(true);
    setError(null);
    onMessage(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na operação admin");
      return false;
    } finally {
      setLocalBusy(false);
    }
  }

  function applyCatalogPayload(data: any) {
    if (data.catalogMeta) {
      onCatalogChange(Array.isArray(data.catalog) ? data.catalog : catalog, data.catalogMeta);
    } else if (Array.isArray(data.catalog)) {
      onCatalogChange(data.catalog, catalogMeta);
    }
    if (Array.isArray(data.zones)) onZonesChange?.(data.zones);
    if (data.balance) onBalanceChange?.(data.balance);
  }

  async function onCharacter(payload: Record<string, unknown>) {
    const characterId = String(payload.characterId || "");
    if (!characterId) {
      setError("Selecione um personagem ativo");
      return false;
    }
    return run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/character", {
        method: "POST",
        body: JSON.stringify({ ...payload, characterId }),
      });
      onMessage(data.message || "Personagem atualizado");
      await onRefresh();
    });
  }

  async function onDeleteCharacter(characterId: string) {
    if (!characterId) {
      setError("Selecione um personagem ativo");
      return false;
    }
    return run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/character/delete", {
        method: "POST",
        body: JSON.stringify({ characterId }),
      });
      onMessage(data.message || "Personagem excluído");
      if (targetId === characterId) setTargetId("");
      await onRefresh();
    });
  }

  async function setMaintenance(enabled: boolean) {
    return run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ maintenance: { enabled } }),
      });
      const next = data.maintenance || {
        enabled,
        message: maintenance.message,
        since: enabled ? new Date().toISOString() : maintenance.since,
      };
      onMaintenanceChange({
        enabled: Boolean(next.enabled),
        message: typeof next.message === "string" ? next.message : maintenance.message,
        since: typeof next.since === "string" ? next.since : null,
      });
      onMessage(data.message || (enabled ? "Jogo em manutenção — jogadores bloqueados" : "Jogo liberado para os jogadores"));
    });
  }

  async function onSaveZoneFull(payload: {
    id: string;
    minLevel: number;
    tier: number;
    dropChance: number | null;
    requiresAscension: string | null;
    bossHpMult: number | null;
    bossAtkMult: number | null;
    bossDropMult: number | null;
    refineDropChance: number | null;
    clear?: boolean;
  }) {
    await run(async () => {
      const zone: Record<string, unknown> = payload.clear
        ? { id: payload.id, clear: true }
        : {
            id: payload.id,
            minLevel: payload.minLevel,
            tier: payload.tier,
            dropChance: payload.dropChance,
            requiresAscension: payload.requiresAscension,
            ...(payload.bossHpMult != null ? { bossHpMult: payload.bossHpMult } : {}),
            ...(payload.bossAtkMult != null ? { bossAtkMult: payload.bossAtkMult } : {}),
            ...(payload.bossDropMult != null ? { bossDropMult: payload.bossDropMult } : {}),
            ...(payload.refineDropChance != null
              ? { refineDropChance: payload.refineDropChance }
              : {}),
          };
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || (payload.clear ? "Overrides removidos" : "Zona atualizada"));
      await onRefresh();
    });
  }

  const tabMeta = ADMIN_TAB_TITLES[adminTab] || {
    title: "Admin Studio",
    subtitle: "",
  };
  const editorDirty =
    (adminTab === "items" && items.dirty) ||
    (adminTab === "monsters" && monsters.dirty) ||
    (adminTab === "economy" && ops.dirty) ||
    (adminTab === "hud" && hudDirty);
  const editorError =
    (adminTab === "items" && items.phase === "error") ||
    (adminTab === "monsters" && monsters.phase === "error") ||
    (adminTab === "economy" && ops.phase === "error") ||
    (adminTab === "hud" && Boolean(error));
  const saveState =
    localBusy || mapPhase === "saving"
      ? "saving"
      : (mapPhase === "error" && adminTab === "map") || editorError
        ? "error"
        : editorDirty || (adminTab === "map" && mapDirty)
          ? "dirty"
          : null;
  const adminLabel =
    adminEmails.length === 1 ? adminEmails[0] : adminEmails.length > 1 ? "Administrador" : "";

  return (
    <>
    <AdminShell
      tabs={ADMIN_TABS}
      activeTab={adminTab}
      onTabChange={(id) => requestTabChange(id as AdminTabId)}
      title={tabMeta.title}
      subtitle={tabMeta.subtitle}
      target={target}
      targetId={targetId}
      activeCharacters={activeCharacters}
      onTargetChange={setTargetId}
      adminLabel={adminLabel}
      maintenanceEnabled={maintenance.enabled}
      saveState={saveState}
      onOpenMaintenance={() => requestTabChange("settings")}
      onLobbyClick={
        (adminTab === "map" && mapDirty) ||
        (adminTab === "items" && items.dirty) ||
        (adminTab === "monsters" && monsters.dirty) ||
        (adminTab === "economy" && ops.dirty) ||
        (adminTab === "hud" && hudDirty)
          ? () =>
              setLeave({
                kind: "lobby",
                source:
                  adminTab === "items"
                    ? "items"
                    : adminTab === "monsters"
                      ? "monsters"
                      : adminTab === "economy"
                        ? "economy"
                        : adminTab === "hud"
                          ? "hud"
                          : "map",
              })
          : undefined
      }
      message={message}
      onDismissMessage={message ? () => onMessage(null) : undefined}
      error={error}
      onDismissError={error ? () => setError(null) : undefined}
    >
      {adminTab === "overview" ? (
        <AdminOverviewPanel
          zones={zones}
          itemCount={catalog.length}
          dropChance={catalogMeta?.dropChance ?? ops.dropPct / 100}
          activeCharacterCount={activeCharacters.length}
          currentSeason={currentSeason}
          maintenanceEnabled={maintenance.enabled}
          idleFetch={idleFetch}
          onOpenTab={requestTabChange}
        />
      ) : null}

      {adminTab === "engagement" ? <AdminEngagementPanel idleFetch={idleFetch} /> : null}

      {adminTab === "items" ? (
        <AdminItemsPanel
          catalog={catalog}
          catalogMeta={catalogMeta}
          target={target}
          draftApi={items}
          working={working}
          error={error}
          onOpenTab={requestTabChange}
        />
      ) : null}

      {adminTab === "map" ? (
        <AdminMapEditor
          ref={mapRef}
          zones={zones}
          zoneId={zoneId}
          onZoneChange={setZoneId}
          working={working}
          idleFetch={idleFetch}
          onMessage={onMessage}
          onRefresh={onRefresh}
          onZonesChange={onZonesChange}
          onDirtyChange={setMapDirty}
          onSavePhase={setMapPhase}
        />
      ) : null}

      {adminTab === "hud" ? (
        <AdminHudBuilder
          ref={hudRef}
          working={working}
          idleFetch={idleFetch}
          onMessage={onMessage}
          run={run}
          onStatus={(status) => setHudDirty(status.dirty)}
        />
      ) : null}

      {adminTab === "zones" ? (
        <AdminZonesPanel
          zones={zones}
          zoneId={zoneId}
          working={working}
          onZoneSelect={setZoneId}
          onSaveZoneFull={onSaveZoneFull}
        />
      ) : null}

      {adminTab === "monsters" ? (
        <AdminMonstersPanel
          zones={zones}
          zoneId={zoneId}
          monsterApi={monsters}
          monsterVisuals={catalogMeta?.monsterVisuals}
          working={working}
          error={error}
        />
      ) : null}

      {adminTab === "loot" ? (
        <AdminLootPanel
          dropPct={ops.dropPct}
          refineDropPct={ops.refineDropPct}
          zones={zones}
          onOpenLiveOps={() => requestTabChange("economy")}
          onGoSimulate={() => requestTabChange("simulate")}
        />
      ) : null}

      {adminTab === "simulate" ? (
        <AdminSimulatePanel
          zones={zones}
          working={working}
          dropPct={ops.dropPct}
          mobHits={ops.mobHits}
          bossHits={ops.bossHits}
          refineDropPct={ops.refineDropPct}
          idleFetch={idleFetch}
          onMessage={onMessage}
          onOpenLiveOps={() => requestTabChange("economy")}
        />
      ) : null}

      {adminTab === "settings" ? (
        <AdminSettingsPanel
          working={working}
          maintenanceEnabled={maintenance.enabled}
          maintenanceMessage={maintenance.message}
          onSetMaintenance={setMaintenance}
          onOpenLiveOps={() => requestTabChange("economy")}
        />
      ) : null}

      {adminTab === "economy" ? <AdminEconomyPanel ops={ops} working={working} /> : null}

      {adminTab === "season" ? (
        <AdminSeasonPanel seasonLoading={seasonLoading} currentSeason={currentSeason} />
      ) : null}

      {adminTab === "characters" ? (
        <AdminCharactersPanel
          activeCharacters={activeCharacters}
          target={target}
          working={working}
          error={error}
          onTargetChange={setTargetId}
          onCharacter={onCharacter}
          onDeleteCharacter={onDeleteCharacter}
        />
      ) : null}

      {adminTab === "logs" ? <AdminActionsHistory idleFetch={idleFetch} /> : null}

      {adminTab === "admins" ? <AdminAdminsPanel emails={adminEmails} /> : null}
    </AdminShell>
    <StudioModal
      open={leave != null}
      title="Alterações não salvas"
      description={
        leave?.source === "items"
          ? "O catálogo de itens tem um rascunho. Sair agora descarta o que ainda não foi gravado."
          : leave?.source === "monsters"
            ? "Os monstros desta zona têm um rascunho. Sair agora descarta o que ainda não foi gravado."
            : leave?.source === "economy"
              ? "Live Ops tem alterações de drop, mercador ou evento. Sair agora descarta o que ainda não foi gravado."
              : leave?.source === "hud"
                ? "A HUD tem alterações locais. Sair agora descarta o que ainda não foi salvo no rascunho. O layout publicado permanece."
                : "O editor de mapas tem um rascunho. Sair agora descarta o que ainda não foi gravado."
      }
      busy={localBusy || mapPhase === "saving"}
      onClose={() => !(localBusy || mapPhase === "saving") && setLeave(null)}
      footer={
        <>
          <StudioBtn type="button" disabled={localBusy || mapPhase === "saving"} onClick={() => setLeave(null)}>
            Cancelar
          </StudioBtn>
          <StudioBtn type="button" disabled={localBusy || mapPhase === "saving"} onClick={finishLeave}>
            Descartar e sair
          </StudioBtn>
          <StudioBtn
            variant="gold"
            type="button"
            loading={localBusy || mapPhase === "saving"}
            onClick={() => {
              if (leave?.source === "items") {
                void items.save().then((ok) => {
                  if (ok) finishLeave();
                });
                return;
              }
              if (leave?.source === "monsters") {
                void monsters.save().then((ok) => {
                  if (ok) finishLeave();
                });
                return;
              }
              if (leave?.source === "economy") {
                void ops.savePending().then((ok) => {
                  if (!ok || !leave) return;
                  const action = leave;
                  setLeave(null);
                  if (action.kind === "tab") setAdminTab(action.tab);
                  if (action.kind === "lobby") window.location.assign("/jogo-idle/lobby.html");
                });
                return;
              }
              if (leave?.source === "hud") {
                void hudRef.current?.save().then((ok) => {
                  if (!ok || !leave) return;
                  const action = leave;
                  setLeave(null);
                  if (action.kind === "tab") setAdminTab(action.tab);
                  if (action.kind === "lobby") window.location.assign("/jogo-idle/lobby.html");
                });
                return;
              }
              void mapRef.current?.save().then((ok) => {
                if (ok) finishLeave();
              });
            }}
          >
            Salvar e sair
          </StudioBtn>
        </>
      }
    />
    </>
  );
}
