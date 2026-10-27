"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminActionsHistory } from "./admin/admin-actions-history";
import { AdminAdminsPanel } from "./admin/admin-admins";
import { AdminEngagementPanel } from "./admin/admin-engagement";
import { AdminItemsPanel } from "./admin/admin-items";
import { AdminLiveOps } from "./admin/admin-liveops";
import { AdminLootPanel } from "./admin/admin-loot";
import { AdminHudBuilder } from "./admin/admin-hud-builder";
import { AdminMapEditor } from "./admin/admin-map";
import { AdminMonstersPanel } from "./admin/admin-monsters";
import { AdminOverviewPanel } from "./admin/admin-overview";
import { AdminSettingsPanel } from "./admin/admin-settings";
import { AdminShell } from "./admin/admin-shell";
import { StudioBadge, StudioBtn } from "./admin/studio/studio-ui";
import { AdminSimulatePanel } from "./admin/admin-simulate";
import { AdminZonesPanel } from "./admin/admin-zones";
import {
  ADMIN_TABS,
  ADMIN_TAB_TITLES,
  EMPTY_DRAFT,
  itemToDraft,
  type AdminActiveCharacter,
  type AdminCatalogItem,
  type AdminCatalogMeta,
  type AdminTabId,
  type AdminZone,
  type SeasonSummary,
  type TemplateDraft,
} from "./admin/admin-types";

export type {
  AdminActiveCharacter,
  AdminCatalogItem,
  AdminCatalogMeta,
  AdminZone,
} from "./admin/admin-types";

const STORAGE_ZONE = "sinergia-idle-admin-zoneId";
const STORAGE_TARGET = "sinergia-idle-admin-targetId";
const STORAGE_TAB = "sinergia-idle-admin-tab";

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

export type SinergiaIdleAdminProps = {
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

export function SinergiaIdleAdmin({
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
}: SinergiaIdleAdminProps) {
  const [adminTab, setAdminTab] = useState<AdminTabId>(() => {
    const saved = readStorage(STORAGE_TAB);
    const match = ADMIN_TABS.find((t) => t.id === saved && !t.disabled);
    return (match?.id || "overview") as AdminTabId;
  });
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [grantRarity, setGrantRarity] = useState("rare");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT);
  const [dropPct, setDropPct] = useState(() =>
    Math.round((catalogMeta?.dropChance ?? 0.11) * 1000) / 10,
  );
  const [bagPrice, setBagPrice] = useState(() =>
    String(catalogMeta?.bagUpgradePrice ?? 150000),
  );
  const [refinerPrice, setRefinerPrice] = useState(() =>
    String(catalogMeta?.refinerPrice ?? 25000),
  );
  const [attrResetPrice, setAttrResetPrice] = useState(() =>
    String(catalogMeta?.attrResetPrice ?? 1_000_000),
  );
  const [petDogPrice, setPetDogPrice] = useState(() =>
    String(catalogMeta?.petDogPrice ?? 40000),
  );
  const [petCatPrice, setPetCatPrice] = useState(() =>
    String(catalogMeta?.petCatPrice ?? 40000),
  );
  const [petParrotPrice, setPetParrotPrice] = useState(() =>
    String(catalogMeta?.petParrotPrice ?? 100000),
  );
  const [merchantOffersEnabled, setMerchantOffersEnabled] = useState(() => ({
    bag_upgrade: catalogMeta?.offersEnabled?.bag_upgrade !== false,
    refiner: catalogMeta?.offersEnabled?.refiner !== false,
    attr_reset: catalogMeta?.offersEnabled?.attr_reset !== false,
    pet_dog: catalogMeta?.offersEnabled?.pet_dog !== false,
    pet_cat: catalogMeta?.offersEnabled?.pet_cat !== false,
    pet_parrot: catalogMeta?.offersEnabled?.pet_parrot !== false,
  }));
  const [eventLabel, setEventLabel] = useState(
    () => catalogMeta?.engagementEvent?.label || "Semana especial",
  );
  const [eventXp, setEventXp] = useState(() =>
    String(catalogMeta?.engagementEvent?.xpMult ?? 1.15),
  );
  const [eventGold, setEventGold] = useState(() =>
    String(catalogMeta?.engagementEvent?.goldMult ?? 1.1),
  );
  const [eventDrop, setEventDrop] = useState(() =>
    String(catalogMeta?.engagementEvent?.dropMult ?? 1.25),
  );
  const [eventEndsAt, setEventEndsAt] = useState(() => {
    if (catalogMeta?.engagementEvent?.endsAt) {
      return catalogMeta.engagementEvent.endsAt.slice(0, 16);
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [targetId, setTargetId] = useState(() => {
    const saved = readStorage(STORAGE_TARGET);
    if (saved && activeCharacters.some((r) => r.id === saved)) return saved;
    return activeCharacters[0]?.id || "";
  });
  const [addGold, setAddGold] = useState("1000");
  const [setLevel, setSetLevel] = useState(String(activeCharacters[0]?.level || 1));
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState(() => {
    const saved = readStorage(STORAGE_ZONE);
    if (saved && zones.some((z) => z.id === saved)) return saved;
    return zones[0]?.id || "";
  });
  const [refineDropPct, setRefineDropPct] = useState(
    () => String(Math.round((balance?.refineDropChance ?? 0.012) * 1000) / 10),
  );
  const [bossHits, setBossHits] = useState(() => String(balance?.bossHitsToKill ?? 28));
  const [mobHits, setMobHits] = useState(() => String(balance?.mobHitsToKill ?? 10));
  const [monsterDrafts, setMonsterDrafts] = useState<
    Array<{
      name: string;
      level: string;
      hp: string;
      attack: string;
      defense: string;
      xp: string;
      gold: string;
      visualId: string;
    }>
  >([]);
  const [bossDraft, setBossDraft] = useState<{
    name: string;
    level: string;
    hp: string;
    attack: string;
    defense: string;
    xp: string;
    gold: string;
    visualId: string;
  } | null>(null);
  const [bossOverridden, setBossOverridden] = useState(false);
  const [bossWaveSize, setBossWaveSize] = useState("8");
  const [bossWaveSizeOverridden, setBossWaveSizeOverridden] = useState(false);
  const [grantPoints, setGrantPoints] = useState("10");
  const [currentSeason, setCurrentSeason] = useState<SeasonSummary | null>(null);
  const [seasonNotes, setSeasonNotes] = useState("");
  const [seasonConfirm, setSeasonConfirm] = useState("");
  const [seasonLoading, setSeasonLoading] = useState(false);

  const [draftBaseline, setDraftBaseline] = useState(() => JSON.stringify(EMPTY_DRAFT));
  const [monsterBaseline, setMonsterBaseline] = useState("");

  useEffect(() => {
    writeStorage(STORAGE_TAB, adminTab);
  }, [adminTab]);

  function isItemsDirty() {
    return JSON.stringify(draft) !== draftBaseline;
  }

  function isMonstersDirty() {
    return (
      JSON.stringify({ monsterDrafts, bossDraft, bossWaveSize }) !== monsterBaseline
    );
  }

  function requestTabChange(id: AdminTabId) {
    if (id === adminTab) return;
    if (adminTab === "items" && isItemsDirty()) {
      if (!window.confirm("Há alterações não salvas nos itens. Descartar e sair?")) return;
    }
    if (adminTab === "monsters" && isMonstersDirty()) {
      if (!window.confirm("Há alterações não salvas nos monstros. Descartar e sair?")) return;
    }
    setAdminTab(id);
  }

  useEffect(() => {
    if (targetId) writeStorage(STORAGE_TARGET, targetId);
  }, [targetId]);

  useEffect(() => {
    if (zoneId) writeStorage(STORAGE_ZONE, zoneId);
  }, [zoneId]);

  useEffect(() => {
    if (catalogMeta?.dropChance != null) {
      setDropPct(Math.round(catalogMeta.dropChance * 1000) / 10);
    }
    if (catalogMeta?.bagUpgradePrice != null) {
      setBagPrice(String(catalogMeta.bagUpgradePrice));
    }
    if (catalogMeta?.refinerPrice != null) {
      setRefinerPrice(String(catalogMeta.refinerPrice));
    }
    if (catalogMeta?.attrResetPrice != null) {
      setAttrResetPrice(String(catalogMeta.attrResetPrice));
    }
    if (catalogMeta?.petDogPrice != null) {
      setPetDogPrice(String(catalogMeta.petDogPrice));
    }
    if (catalogMeta?.petCatPrice != null) {
      setPetCatPrice(String(catalogMeta.petCatPrice));
    }
    if (catalogMeta?.petParrotPrice != null) {
      setPetParrotPrice(String(catalogMeta.petParrotPrice));
    }
    if (catalogMeta?.offersEnabled) {
      setMerchantOffersEnabled({
        bag_upgrade: catalogMeta.offersEnabled.bag_upgrade !== false,
        refiner: catalogMeta.offersEnabled.refiner !== false,
        attr_reset: catalogMeta.offersEnabled.attr_reset !== false,
        pet_dog: catalogMeta.offersEnabled.pet_dog !== false,
        pet_cat: catalogMeta.offersEnabled.pet_cat !== false,
        pet_parrot: catalogMeta.offersEnabled.pet_parrot !== false,
      });
    }
    const ev = catalogMeta?.engagementEvent;
    if (ev) {
      setEventLabel(ev.label || "Semana especial");
      setEventXp(String(ev.xpMult ?? 1.15));
      setEventGold(String(ev.goldMult ?? 1.1));
      setEventDrop(String(ev.dropMult ?? 1.25));
      if (ev.endsAt) setEventEndsAt(ev.endsAt.slice(0, 16));
    }
  }, [
    catalogMeta?.dropChance,
    catalogMeta?.bagUpgradePrice,
    catalogMeta?.refinerPrice,
    catalogMeta?.attrResetPrice,
    catalogMeta?.petDogPrice,
    catalogMeta?.petCatPrice,
    catalogMeta?.petParrotPrice,
    catalogMeta?.offersEnabled?.bag_upgrade,
    catalogMeta?.offersEnabled?.refiner,
    catalogMeta?.offersEnabled?.attr_reset,
    catalogMeta?.offersEnabled?.pet_dog,
    catalogMeta?.offersEnabled?.pet_cat,
    catalogMeta?.offersEnabled?.pet_parrot,
    catalogMeta?.engagementEvent?.label,
    catalogMeta?.engagementEvent?.endsAt,
    catalogMeta?.engagementEvent?.xpMult,
    catalogMeta?.engagementEvent?.goldMult,
    catalogMeta?.engagementEvent?.dropMult,
  ]);

  useEffect(() => {
    if (!balance) return;
    setRefineDropPct(String(Math.round((balance.refineDropChance ?? 0.012) * 1000) / 10));
    setBossHits(String(balance.bossHitsToKill ?? 28));
    setMobHits(String(balance.mobHitsToKill ?? 10));
  }, [balance?.refineDropChance, balance?.bossHitsToKill, balance?.mobHitsToKill]);

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
        const data = await idleFetch("/api/sinergia-idle/seasons");
        if (cancelled) return;
        const open =
          data.current || data.seasons?.find((s: SeasonSummary) => s.status === "OPEN") || null;
        setCurrentSeason(open);
        setSeasonNotes(open?.notes || "");
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

  useEffect(() => {
    const z = zones.find((row) => row.id === zoneId) || zones[0];
    if (!z) return;
    setZoneId(z.id);
    const nextDrafts = (z.monsters || []).map((m) => ({
      name: m.name,
      level: String(m.level),
      hp: String(m.hp),
      attack: String(m.attack),
      defense: String(m.defense ?? Math.floor(m.level * 0.85)),
      xp: String(m.xp ?? m.level * 14),
      gold: String(m.gold ?? Math.round(m.level * 4.5)),
      visualId: m.visualId || "skeleton_minion",
    }));
    setMonsterDrafts(nextDrafts);
    let nextBoss: typeof bossDraft = null;
    const b = z.boss;
    if (b) {
      nextBoss = {
        name: b.name,
        level: String(b.level),
        hp: String(b.hp),
        attack: String(b.attack ?? 1),
        defense: String(b.defense ?? Math.floor(b.level * 1.4)),
        xp: String(b.xp ?? b.level * 20),
        gold: String(b.gold ?? Math.round(b.level * 8)),
        visualId: b.visualId || "skeleton_warrior",
      };
      setBossDraft(nextBoss);
      setBossOverridden(Boolean(b.overridden));
    } else {
      setBossDraft(null);
      setBossOverridden(false);
    }
    const wave =
      z.bossWaveSize != null && Number.isFinite(Number(z.bossWaveSize))
        ? Math.max(1, Math.floor(Number(z.bossWaveSize)))
        : Math.max(2, (z.monsters?.length || 2) * 2);
    setBossWaveSize(String(wave));
    setBossWaveSizeOverridden(Boolean(z.bossWaveSizeOverridden));
    setMonsterBaseline(
      JSON.stringify({
        monsterDrafts: nextDrafts,
        bossDraft: nextBoss,
        bossWaveSize: String(wave),
      }),
    );
  }, [zones, zoneId]);

  const target =
    activeCharacters.find((row) => row.id === targetId) || activeCharacters[0] || null;

  useEffect(() => {
    if (!activeCharacters.length) {
      setTargetId("");
      return;
    }
    if (!activeCharacters.some((row) => row.id === targetId)) {
      setTargetId(activeCharacters[0].id);
      setSetLevel(String(activeCharacters[0].level));
    }
  }, [activeCharacters, targetId]);

  const rarityOptions = useMemo(
    () => Object.values(catalogMeta?.rarities || {}).map((r) => r.id),
    [catalogMeta],
  );
  const working = busy || localBusy;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tierNum = filterTier === "all" ? null : Number(filterTier);
    return catalog.filter((item) => {
      if (filterClass !== "all" && !(item.classes || []).includes(filterClass)) return false;
      if (filterSlot !== "all" && item.slot !== filterSlot) return false;
      if (tierNum != null && item.tier !== tierNum) return false;
      if (q) {
        const hay = `${item.id} ${item.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog, query, filterClass, filterSlot, filterTier]);

  const selected = catalog.find((item) => item.id === selectedId) || filtered[0] || null;

  async function run(action: () => Promise<void>) {
    setLocalBusy(true);
    setError(null);
    onMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na operação admin");
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
    if (data.catalogMeta?.dropChance != null) {
      setDropPct(Math.round(data.catalogMeta.dropChance * 1000) / 10);
    }
    if (data.catalogMeta?.bagUpgradePrice != null) {
      setBagPrice(String(data.catalogMeta.bagUpgradePrice));
    }
    if (data.catalogMeta?.refinerPrice != null) {
      setRefinerPrice(String(data.catalogMeta.refinerPrice));
    }
    if (data.catalogMeta?.attrResetPrice != null) {
      setAttrResetPrice(String(data.catalogMeta.attrResetPrice));
    }
    if (data.catalogMeta?.petDogPrice != null) {
      setPetDogPrice(String(data.catalogMeta.petDogPrice));
    }
    if (data.catalogMeta?.petCatPrice != null) {
      setPetCatPrice(String(data.catalogMeta.petCatPrice));
    }
    if (data.catalogMeta?.petParrotPrice != null) {
      setPetParrotPrice(String(data.catalogMeta.petParrotPrice));
    }
    if (data.catalogMeta?.offersEnabled) {
      setMerchantOffersEnabled({
        bag_upgrade: data.catalogMeta.offersEnabled.bag_upgrade !== false,
        refiner: data.catalogMeta.offersEnabled.refiner !== false,
        attr_reset: data.catalogMeta.offersEnabled.attr_reset !== false,
        pet_dog: data.catalogMeta.offersEnabled.pet_dog !== false,
        pet_cat: data.catalogMeta.offersEnabled.pet_cat !== false,
        pet_parrot: data.catalogMeta.offersEnabled.pet_parrot !== false,
      });
    }
    if (data.catalogMeta?.engagementEvent) {
      const ev = data.catalogMeta.engagementEvent;
      setEventLabel(ev.label || "");
      setEventXp(String(ev.xpMult ?? 1));
      setEventGold(String(ev.goldMult ?? 1));
      setEventDrop(String(ev.dropMult ?? 1));
      if (ev.endsAt) setEventEndsAt(ev.endsAt.slice(0, 16));
    }
  }

  async function onGrant(templateId?: string) {
    const id = templateId || selected?.id;
    if (!id) throw new Error("Selecione um item");
    if (!target?.id) throw new Error("Selecione um personagem ativo");
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/grant", {
        method: "POST",
        body: JSON.stringify({
          templateId: id,
          rarity: grantRarity,
          characterId: target.id,
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item concedido");
      await onRefresh();
    });
  }

  async function onSaveTemplate(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const stats: Record<string, number> = {};
      if (draft.str) stats.str = Number(draft.str);
      if (draft.dex) stats.dex = Number(draft.dex);
      if (draft.int) stats.int = Number(draft.int);
      if (draft.con) stats.con = Number(draft.con);
      if (draft.mp) stats.mp = Number(draft.mp);
      if (draft.attack) stats.attack = Number(draft.attack);
      if (draft.defense) stats.defense = Number(draft.defense);
      if (draft.hp) stats.hp = Number(draft.hp);
      if (draft.crit) stats.crit = Number(draft.crit);
      const creating = !draft.id;
      const data = await idleFetch("/api/sinergia-idle/admin/catalog", {
        method: "POST",
        body: JSON.stringify({
          id: draft.id,
          creating,
          name: draft.name,
          slot: draft.slot,
          classes: draft.classes,
          tier: draft.tier,
          level: draft.level,
          icon: draft.icon,
          visual: draft.visual || null,
          price: draft.price,
          dropChance: Math.max(0, Math.min(1, Number(draft.dropPct || 0) / 100)),
          stats,
          rarity: draft.rarity,
          grant: draft.grant,
          characterId: draft.grant ? target?.id : undefined,
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || (creating ? "Item criado" : "Item atualizado"));
      if (data.template?.id) {
        setSelectedId(data.template.id);
        const next = itemToDraft(data.template, draft.rarity);
        setDraft(next);
        setDraftBaseline(JSON.stringify(next));
      } else if (creating) {
        setDraft(EMPTY_DRAFT);
        setDraftBaseline(JSON.stringify(EMPTY_DRAFT));
      }
      await onRefresh();
    });
  }

  async function onDelete(item: AdminCatalogItem) {
    const label = item.custom ? "Apagar item custom?" : "Remover item original do catálogo?";
    if (!window.confirm(label)) return;
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/catalog/delete", {
        method: "POST",
        body: JSON.stringify({ templateId: item.id }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item removido");
      if (selectedId === item.id) {
        setSelectedId("");
        setDraft(EMPTY_DRAFT);
      }
      await onRefresh();
    });
  }

  async function onReset(item: AdminCatalogItem) {
    if (!window.confirm("Restaurar item ao original do jogo?")) return;
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/catalog/reset", {
        method: "POST",
        body: JSON.stringify({ templateId: item.id }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item restaurado");
      if (data.template) setDraft(itemToDraft(data.template, grantRarity));
      await onRefresh();
    });
  }

  async function onSaveDrop(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ dropChance: dropPct / 100 }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Drop atualizado");
      await onRefresh();
    });
  }

  async function onSaveMerchant(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({
          bagUpgradePrice: bagPrice,
          refinerPrice: refinerPrice,
          attrResetPrice: attrResetPrice,
          petDogPrice: petDogPrice,
          petCatPrice: petCatPrice,
          petParrotPrice: petParrotPrice,
          merchantOffersEnabled,
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Mercador atualizado");
    });
  }

  async function onSaveEngagementEvent(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const ends = new Date(eventEndsAt);
      if (!Number.isFinite(ends.getTime())) throw new Error("Data de término inválida");
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({
          engagementEvent: {
            label: eventLabel.trim(),
            xpMult: Number(eventXp),
            goldMult: Number(eventGold),
            dropMult: Number(eventDrop),
            endsAt: ends.toISOString(),
          },
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Evento de engajamento ativado");
      await onRefresh();
    });
  }

  async function onClearEngagementEvent() {
    if (!window.confirm("Encerrar evento de engajamento agora?")) return;
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ engagementEvent: { clear: true } }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Evento encerrado");
      await onRefresh();
    });
  }

  async function onCharacter(payload: Record<string, unknown>) {
    if (!target?.id) throw new Error("Selecione um personagem ativo");
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/character", {
        method: "POST",
        body: JSON.stringify({ ...payload, characterId: target.id }),
      });
      onMessage(data.message || "Personagem atualizado");
      await onRefresh();
    });
  }

  async function onDeleteCharacter() {
    if (!target?.id) throw new Error("Selecione um personagem ativo");
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/character/delete", {
        method: "POST",
        body: JSON.stringify({ characterId: target.id }),
      });
      onMessage(data.message || "Personagem excluído");
      setTargetId("");
      await onRefresh();
    });
  }

  async function onEndSeason(event: FormEvent) {
    event.preventDefault();
    if (!currentSeason) throw new Error("Nenhuma temporada aberta");
    const expected = currentSeason.slug;
    const typed = seasonConfirm.trim();
    if (typed !== expected && typed.toLowerCase() !== "resetar progresso de todos") {
      setError(`Digite o slug "${expected}" ou "resetar progresso de todos" para confirmar`);
      return;
    }
    if (
      !window.confirm(
        `Encerrar ${expected}? Isso grava o ranking final e reseta o progresso de TODOS os personagens (nome/classe/aparência permanecem).`,
      )
    ) {
      return;
    }
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/season/end", {
        method: "POST",
        body: JSON.stringify({
          confirm: true,
          notes: seasonNotes.trim() || undefined,
        }),
      });
      onMessage(data.message || "Temporada encerrada");
      setSeasonConfirm("");
      const refreshed = await idleFetch("/api/sinergia-idle/seasons");
      const open =
        refreshed.current ||
        refreshed.seasons?.find((s: SeasonSummary) => s.status === "OPEN") ||
        null;
      setCurrentSeason(open);
      setSeasonNotes(open?.notes || "");
      await onRefresh();
    });
  }

  function clearFilters() {
    setQuery("");
    setFilterClass("all");
    setFilterSlot("all");
    setFilterTier("all");
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
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || (payload.clear ? "Overrides removidos" : "Zona atualizada"));
      await onRefresh();
    });
  }

  async function onToggleMaintenance() {
    const nextEnabled = !maintenance.enabled;
    const confirmed = window.confirm(
      nextEnabled
        ? "Interromper o jogo para todos os jogadores? Eles verão a tela de manutenção e não poderão abrir personagens nem caçar até você liberar."
        : "Liberar o jogo para todos os jogadores?",
    );
    if (!confirmed) return;
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ maintenance: { enabled: nextEnabled } }),
      });
      const next = data.maintenance || {
        enabled: nextEnabled,
        message: maintenance.message,
        since: nextEnabled ? new Date().toISOString() : maintenance.since,
      };
      onMaintenanceChange({
        enabled: Boolean(next.enabled),
        message: typeof next.message === "string" ? next.message : maintenance.message,
        since: typeof next.since === "string" ? next.since : null,
      });
      onMessage(
        data.message ||
          (nextEnabled ? "Jogo em manutenção — jogadores bloqueados" : "Jogo liberado para os jogadores"),
      );
    });
  }

  async function onSaveBalance(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({
          balance: {
            refineDropChance: Number(refineDropPct) / 100,
            bossHitsToKill: Number(bossHits),
            mobHitsToKill: Number(mobHits),
          },
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Balanceamento atualizado");
      await onRefresh();
    });
  }

  async function onSaveMonsters(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const monsters = monsterDrafts.map((m) => ({
        name: m.name.trim() || "Monstro",
        level: Math.max(1, Math.floor(Number(m.level) || 1)),
        hpOverride: Math.max(1, Math.floor(Number(m.hp) || 1)),
        attackOverride: Math.max(1, Math.floor(Number(m.attack) || 1)),
        defenseOverride: Math.max(0, Math.floor(Number(m.defense) || 0)),
        xpOverride: Math.max(1, Math.floor(Number(m.xp) || 1)),
        goldOverride: Math.max(0, Math.floor(Number(m.gold) || 0)),
        visualId: m.visualId || "skeleton_minion",
      }));
      const zonePayload: Record<string, unknown> = {
        id: zoneId,
        monsters,
        bossWaveSize: Math.max(1, Math.min(200, Math.floor(Number(bossWaveSize) || 1))),
      };
      if (bossDraft) {
        zonePayload.boss = {
          name: bossDraft.name.trim() || "Boss",
          level: Math.max(1, Math.floor(Number(bossDraft.level) || 1)),
          hpOverride: Math.max(1, Math.floor(Number(bossDraft.hp) || 1)),
          attackOverride: Math.max(1, Math.floor(Number(bossDraft.attack) || 1)),
          defenseOverride: Math.max(0, Math.floor(Number(bossDraft.defense) || 0)),
          xpOverride: Math.max(1, Math.floor(Number(bossDraft.xp) || 1)),
          goldOverride: Math.max(0, Math.floor(Number(bossDraft.gold) || 0)),
          visualId: bossDraft.visualId || "skeleton_warrior",
        };
      }
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone: zonePayload }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Monstros e boss atualizados");
      await onRefresh();
    });
  }

  async function onResetBoss() {
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone: { id: zoneId, boss: null } }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Boss resetado para derivado");
      await onRefresh();
    });
  }

  async function onResetBossWaveSize() {
    await run(async () => {
      const data = await idleFetch("/api/sinergia-idle/admin/config", {
        method: "POST",
        body: JSON.stringify({ zone: { id: zoneId, bossWaveSize: null } }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Onda do boss voltou ao padrão");
      await onRefresh();
    });
  }

  const tabMeta = ADMIN_TAB_TITLES[adminTab] || {
    title: "Admin Studio 2.0",
    subtitle: "",
  };

  return (
    <AdminShell
      tabs={ADMIN_TABS}
      activeTab={adminTab}
      onTabChange={(id) => requestTabChange(id as AdminTabId)}
      title={tabMeta.title}
      subtitle={tabMeta.subtitle}
      target={target}
      targetId={targetId}
      activeCharacters={activeCharacters}
      onTargetChange={(id) => {
        setTargetId(id);
        const next = activeCharacters.find((row) => row.id === id);
        if (next) setSetLevel(String(next.level));
      }}
      topActions={
        <div className="flex items-center gap-2">
          {maintenance.enabled ? <StudioBadge tone="warn">Em manutenção</StudioBadge> : null}
          <StudioBtn
            variant={maintenance.enabled ? "gold" : "danger"}
            disabled={working}
            onClick={() => void onToggleMaintenance()}
          >
            {maintenance.enabled ? "Liberar jogo" : "Interromper jogo"}
          </StudioBtn>
        </div>
      }
      footerStatus={
        maintenance.enabled ? (
          <>
            <span>
              <span className="studio-2__dot" aria-hidden />
              Manutenção
            </span>
            <span>Jogadores bloqueados</span>
          </>
        ) : undefined
      }
      message={
        message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null
      }
      error={
        error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null
      }
    >
      {adminTab === "overview" ? (
        <AdminOverviewPanel
          zones={zones}
          itemCount={catalog.length}
          dropChance={catalogMeta?.dropChance ?? 0.11}
          activeCharacterCount={activeCharacters.length}
          currentSeason={currentSeason}
          targetLabel={target ? `${target.name} · Lv ${target.level}` : undefined}
          idleFetch={idleFetch}
        />
      ) : null}

      {adminTab === "engagement" ? <AdminEngagementPanel idleFetch={idleFetch} /> : null}

      {adminTab === "items" ? (
        <AdminItemsPanel
          catalog={catalog}
          catalogMeta={catalogMeta}
          filtered={filtered}
          selected={selected}
          target={target}
          query={query}
          filterClass={filterClass}
          filterSlot={filterSlot}
          filterTier={filterTier}
          grantRarity={grantRarity}
          rarityOptions={rarityOptions}
          draft={draft}
          working={working}
          onQueryChange={setQuery}
          onFilterClassChange={setFilterClass}
          onFilterSlotChange={setFilterSlot}
          onFilterTierChange={setFilterTier}
          onGrantRarityChange={setGrantRarity}
          onClearFilters={clearFilters}
          onSelectItem={(item) => {
            if (isItemsDirty() && !window.confirm("Descartar alterações do item atual?")) return;
            setSelectedId(item.id);
            const next = itemToDraft(item, grantRarity);
            setDraft(next);
            setDraftBaseline(JSON.stringify(next));
          }}
          onDraftChange={setDraft}
          onNewItem={() => {
            if (isItemsDirty() && !window.confirm("Descartar alterações do item atual?")) return;
            setDraft(EMPTY_DRAFT);
            setDraftBaseline(JSON.stringify(EMPTY_DRAFT));
            setSelectedId("");
          }}
          onDuplicateItem={() => {
            const next = {
              ...draft,
              id: undefined as string | undefined,
              name: `${draft.name || "Item"} (cópia)`.slice(0, 40),
              grant: false,
            };
            setDraft(next);
            setDraftBaseline(JSON.stringify(EMPTY_DRAFT));
            setSelectedId("");
            onMessage("Cópia pronta — salve para criar um item com id novo (original intacto).");
          }}
          onGrant={onGrant}
          onSaveTemplate={onSaveTemplate}
          onDelete={onDelete}
          onReset={onReset}
        />
      ) : null}

      {adminTab === "map" ? (
        <AdminMapEditor
          zones={zones}
          working={working}
          idleFetch={idleFetch}
          onMessage={onMessage}
          onRefresh={onRefresh}
          onZonesChange={onZonesChange}
          run={run}
        />
      ) : null}

      {adminTab === "hud" ? (
        <AdminHudBuilder
          working={working}
          idleFetch={idleFetch}
          onMessage={onMessage}
          run={run}
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
          monsterDrafts={monsterDrafts}
          bossDraft={bossDraft}
          bossOverridden={bossOverridden}
          bossWaveSize={bossWaveSize}
          bossWaveSizeOverridden={bossWaveSizeOverridden}
          monsterVisuals={catalogMeta?.monsterVisuals}
          working={working}
          onZoneChange={setZoneId}
          onMonsterDraftsChange={setMonsterDrafts}
          onBossDraftChange={(updater) => setBossDraft((prev) => (prev ? updater(prev) : prev))}
          onBossWaveSizeChange={setBossWaveSize}
          onSaveMonsters={onSaveMonsters}
          onResetBoss={onResetBoss}
          onResetBossWaveSize={onResetBossWaveSize}
        />
      ) : null}

      {adminTab === "loot" ? (
        <AdminLootPanel
          dropPct={dropPct}
          zones={zones}
          working={working}
          onDropPctChange={setDropPct}
          onSaveDrop={onSaveDrop}
          onGoSimulate={() => setAdminTab("simulate")}
        />
      ) : null}

      {adminTab === "simulate" ? (
        <AdminSimulatePanel
          zones={zones}
          working={working}
          idleFetch={idleFetch}
          onMessage={onMessage}
        />
      ) : null}

      {adminTab === "settings" ? (
        <AdminSettingsPanel
          mobHits={mobHits}
          bossHits={bossHits}
          refineDropPct={refineDropPct}
          working={working}
          onMobHitsChange={setMobHits}
          onBossHitsChange={setBossHits}
          onRefineDropPctChange={setRefineDropPct}
          onSaveBalance={onSaveBalance}
        />
      ) : null}

      {adminTab === "economy" || adminTab === "season" || adminTab === "characters" ? (
        <AdminLiveOps
          section={adminTab}
          dropPct={dropPct}
          activeCharacterCount={activeCharacters.length}
          currentSeason={currentSeason}
          working={working}
          mobHits={mobHits}
          bossHits={bossHits}
          refineDropPct={refineDropPct}
          bagPrice={bagPrice}
          refinerPrice={refinerPrice}
          attrResetPrice={attrResetPrice}
          petDogPrice={petDogPrice}
          petCatPrice={petCatPrice}
          petParrotPrice={petParrotPrice}
          merchantOffersEnabled={merchantOffersEnabled}
          eventLabel={eventLabel}
          eventXp={eventXp}
          eventGold={eventGold}
          eventDrop={eventDrop}
          eventEndsAt={eventEndsAt}
          catalogMeta={catalogMeta}
          idleFetch={idleFetch}
          onMobHitsChange={setMobHits}
          onBossHitsChange={setBossHits}
          onRefineDropPctChange={setRefineDropPct}
          onDropPctChange={setDropPct}
          onBagPriceChange={setBagPrice}
          onRefinerPriceChange={setRefinerPrice}
          onAttrResetPriceChange={setAttrResetPrice}
          onPetDogPriceChange={setPetDogPrice}
          onPetCatPriceChange={setPetCatPrice}
          onPetParrotPriceChange={setPetParrotPrice}
          onMerchantOfferEnabledChange={(sku, enabled) =>
            setMerchantOffersEnabled((prev) => ({ ...prev, [sku]: enabled }))
          }
          onEventLabelChange={setEventLabel}
          onEventXpChange={setEventXp}
          onEventGoldChange={setEventGold}
          onEventDropChange={setEventDrop}
          onEventEndsAtChange={setEventEndsAt}
          onSaveBalance={onSaveBalance}
          onSaveDrop={onSaveDrop}
          onSaveMerchant={onSaveMerchant}
          onSaveEngagementEvent={onSaveEngagementEvent}
          onClearEngagementEvent={() => void onClearEngagementEvent()}
          seasonLoading={seasonLoading}
          seasonNotes={seasonNotes}
          seasonConfirm={seasonConfirm}
          onSeasonNotesChange={setSeasonNotes}
          onSeasonConfirmChange={setSeasonConfirm}
          onEndSeason={onEndSeason}
          activeCharacters={activeCharacters}
          target={target}
          addGold={addGold}
          setLevel={setLevel}
          grantPoints={grantPoints}
          onTargetChange={(id) => {
            setTargetId(id);
            const next = activeCharacters.find((row) => row.id === id);
            if (next) setSetLevel(String(next.level));
          }}
          onAddGoldChange={setAddGold}
          onSetLevelChange={setSetLevel}
          onGrantPointsChange={setGrantPoints}
          onCharacter={onCharacter}
          onDeleteCharacter={onDeleteCharacter}
        />
      ) : null}

      {adminTab === "logs" ? <AdminActionsHistory idleFetch={idleFetch} /> : null}

      {adminTab === "admins" ? <AdminAdminsPanel emails={adminEmails} /> : null}
    </AdminShell>
  );
}
