import { useMemo, useRef, useState } from "react";
import {
  EMPTY_DRAFT,
  itemToDraft,
  type AdminCatalogItem,
  type TemplateDraft,
} from "./admin-types";

export type ItemPhase = "saved" | "dirty" | "saving" | "error";
export type OriginFilter = "all" | "custom" | "override" | "base";
export type KindFilter = "all" | "gear" | "consumable";

export type ItemGate =
  | { kind: "select"; item: AdminCatalogItem }
  | { kind: "new" }
  | { kind: "duplicate" }
  | null;

type Run = (action: () => Promise<void>) => Promise<boolean>;

type UseItemDraftArgs = {
  catalog: AdminCatalogItem[];
  targetId: string;
  run: Run;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  applyCatalogPayload: (data: any) => void;
  onMessage: (message: string | null) => void;
  onRefresh: () => Promise<void>;
};

function isConsumable(item: AdminCatalogItem) {
  return Boolean(item.consumable) || item.slot === "consumable";
}

function fingerprint(draft: TemplateDraft) {
  return JSON.stringify(draft);
}

/** Campos que o formulário não edita, mas o upsert substitui o template inteiro. */
function preservedFields(source: AdminCatalogItem | undefined, slot: string) {
  if (!source) return {};
  const extra: Record<string, unknown> = {};
  if (typeof source.art === "string" && source.art.startsWith("/")) extra.art = source.art;
  if (source.twoHanded) extra.twoHanded = true;
  if (source.announce) extra.announce = true;
  if (source.stackable) extra.stackable = true;
  if (source.refineTargets?.length) extra.refineTargets = source.refineTargets;
  if (source.consumable && source.slot === slot) extra.consumable = true;
  if (source.skillElementBonus && typeof source.skillElementBonus === "object") {
    extra.skillElementBonus = source.skillElementBonus;
  }
  return extra;
}

export function useItemDraft({
  catalog,
  targetId,
  run,
  idleFetch,
  applyCatalogPayload,
  onMessage,
  onRefresh,
}: UseItemDraftArgs) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(() => fingerprint(EMPTY_DRAFT));
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>("all");
  const [filterKind, setFilterKind] = useState<KindFilter>("all");
  const [grantRarity, setGrantRarity] = useState("rare");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const failedSnap = useRef<string | null>(null);
  const [gate, setGate] = useState<ItemGate>(null);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const targetIdRef = useRef(targetId);
  targetIdRef.current = targetId;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const grantRarityRef = useRef(grantRarity);
  grantRarityRef.current = grantRarity;

  const dirty = fingerprint(draft) !== baseline;
  const phase: ItemPhase =
    saving ? "saving" : failed && failedSnap.current === fingerprint(draft) ? "error" : dirty ? "dirty" : "saved";

  const selected = selectedId
    ? catalog.find((item) => item.id === selectedId) || null
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tierNum = filterTier === "all" ? null : Number(filterTier);
    return catalog.filter((item) => {
      if (filterClass !== "all" && !(item.classes || []).includes(filterClass)) return false;
      if (filterSlot !== "all" && item.slot !== filterSlot) return false;
      if (tierNum != null && item.tier !== tierNum) return false;
      if (filterOrigin === "custom" && !item.custom) return false;
      if (filterOrigin === "override" && !item.overridden) return false;
      if (filterOrigin === "base" && (item.custom || item.overridden)) return false;
      if (filterKind === "consumable" && !isConsumable(item)) return false;
      if (filterKind === "gear" && isConsumable(item)) return false;
      if (q) {
        const hay = `${item.id} ${item.name} ${(item.classes || []).join(" ")} ${item.slot}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog, query, filterClass, filterSlot, filterTier, filterOrigin, filterKind]);

  function adopt(next: TemplateDraft, id: string) {
    setSelectedId(id);
    setDraft(next);
    setBaseline(fingerprint(next));
    setFailed(false);
  }

  function adoptItem(item: AdminCatalogItem) {
    adopt(itemToDraft(item, grantRarityRef.current), item.id);
  }

  function adoptNew() {
    adopt({ ...EMPTY_DRAFT }, "");
  }

  function spawnCopy() {
    const current = draftRef.current;
    const next: TemplateDraft = {
      ...current,
      id: undefined,
      name: `${current.name || "Item"} (cópia)`.slice(0, 40),
      grant: false,
    };
    setSelectedId("");
    setDraft(next);
    setBaseline(fingerprint(EMPTY_DRAFT));
    setFailed(false);
  }

  function requestSelect(item: AdminCatalogItem) {
    if (item.id === selectedId && !dirty) return;
    if (!dirty) {
      adoptItem(item);
      return;
    }
    setGate({ kind: "select", item });
  }

  function requestNew() {
    if (!selectedId && !dirty && !draft.id) return;
    if (!dirty) {
      adoptNew();
      return;
    }
    setGate({ kind: "new" });
  }

  function requestDuplicate() {
    if (!draftRef.current.name && !draftRef.current.id) return;
    if (!dirty && !draftRef.current.id) {
      spawnCopy();
      return;
    }
    if (!dirty) {
      spawnCopy();
      return;
    }
    setGate({ kind: "duplicate" });
  }

  function acceptGate() {
    const current = gate;
    setGate(null);
    if (!current) return;
    if (current.kind === "select") adoptItem(current.item);
    if (current.kind === "new") adoptNew();
    if (current.kind === "duplicate") spawnCopy();
  }

  function revert() {
    if (selectedId) {
      const item = catalogRef.current.find((row) => row.id === selectedId);
      if (item) {
        adoptItem(item);
        return;
      }
    }
    adoptNew();
  }

  function clearFilters() {
    setQuery("");
    setFilterClass("all");
    setFilterSlot("all");
    setFilterTier("all");
    setFilterOrigin("all");
    setFilterKind("all");
  }

  function statsOf(current: TemplateDraft) {
    const stats: Record<string, number> = {};
    const pairs: Array<[keyof TemplateDraft, string]> = [
      ["str", "str"],
      ["dex", "dex"],
      ["int", "int"],
      ["con", "con"],
      ["mp", "mp"],
      ["attack", "attack"],
      ["defense", "defense"],
      ["hp", "hp"],
      ["crit", "crit"],
    ];
    for (const [field, key] of pairs) {
      const raw = current[field];
      if (typeof raw === "string" && raw.trim() !== "") stats[key] = Number(raw);
    }
    return stats;
  }

  async function save() {
    const current = draftRef.current;
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const creating = !current.id;
      const source = current.id
        ? catalogRef.current.find((item) => item.id === current.id)
        : undefined;
      const data = await idleFetch("/api/jogo-idle/admin/catalog", {
        method: "POST",
        body: JSON.stringify({
          id: current.id,
          creating,
          name: current.name,
          slot: current.slot,
          classes: current.classes,
          tier: current.tier,
          level: current.level,
          icon: current.icon,
          visual: current.visual || null,
          price: current.price,
          dropChance: Math.max(0, Math.min(1, Number(current.dropPct || 0) / 100)),
          stats: statsOf(current),
          rarity: current.rarity,
          grant: current.grant,
          characterId: current.grant ? targetIdRef.current || undefined : undefined,
          ...preservedFields(source, current.slot),
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || (creating ? "Item criado" : "Item atualizado"));
      if (data.template?.id) {
        adopt(itemToDraft(data.template, current.rarity), data.template.id);
      } else if (creating) {
        adoptNew();
      } else {
        setBaseline(fingerprint(draftRef.current));
        setFailed(false);
      }
      await onRefresh();
    });
    setSaving(false);
    if (!ok) {
      failedSnap.current = fingerprint(draftRef.current);
      setFailed(true);
    }
    return ok;
  }

  async function remove(item: AdminCatalogItem) {
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/catalog/delete", {
        method: "POST",
        body: JSON.stringify({ templateId: item.id }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item removido");
      if (draftRef.current.id === item.id || selectedId === item.id) adoptNew();
      await onRefresh();
    });
    setSaving(false);
    if (!ok) {
      failedSnap.current = fingerprint(draftRef.current);
      setFailed(true);
    }
    return ok;
  }

  async function reset(item: AdminCatalogItem) {
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/catalog/reset", {
        method: "POST",
        body: JSON.stringify({ templateId: item.id }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item restaurado");
      if (data.template?.id) {
        adopt(itemToDraft(data.template, grantRarityRef.current), data.template.id);
      }
      await onRefresh();
    });
    setSaving(false);
    if (!ok) {
      failedSnap.current = fingerprint(draftRef.current);
      setFailed(true);
    }
    return ok;
  }

  async function grant(templateId: string) {
    const id = templateId;
    const characterId = targetIdRef.current;
    if (!id) return false;
    if (!characterId) return false;
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/grant", {
        method: "POST",
        body: JSON.stringify({
          templateId: id,
          rarity: grantRarityRef.current,
          characterId,
        }),
      });
      applyCatalogPayload(data);
      onMessage(data.message || "Item concedido");
      await onRefresh();
    });
    setSaving(false);
    if (!ok) {
      failedSnap.current = fingerprint(draftRef.current);
      setFailed(true);
    }
    return ok;
  }

  return {
    selectedId,
    selected,
    draft,
    setDraft,
    dirty,
    phase,
    query,
    setQuery,
    filterClass,
    setFilterClass,
    filterSlot,
    setFilterSlot,
    filterTier,
    setFilterTier,
    filterOrigin,
    setFilterOrigin,
    filterKind,
    setFilterKind,
    grantRarity,
    setGrantRarity,
    filtered,
    gate,
    setGate,
    requestSelect,
    requestNew,
    requestDuplicate,
    acceptGate,
    revert,
    clearFilters,
    save,
    remove,
    reset,
    grant,
  };
}
