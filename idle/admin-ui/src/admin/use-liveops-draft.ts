import { FormEvent, useEffect, useRef, useState } from "react";
import type { AdminCatalogMeta } from "./admin-types";

export type MerchantOffers = {
  bag_upgrade: boolean;
  refiner: boolean;
  attr_reset: boolean;
  pet_dog: boolean;
  pet_cat: boolean;
  pet_parrot: boolean;
};

type Run = (action: () => Promise<void>) => Promise<boolean>;

type Args = {
  catalogMeta: AdminCatalogMeta | null;
  balance: Record<string, number> | null;
  run: Run;
  idleFetch: (path: string, init?: RequestInit) => Promise<any>;
  applyCatalogPayload: (data: any) => void;
  onMessage: (message: string | null) => void;
  onRefresh: () => Promise<void>;
};

type Snap = {
  dropPct: number;
  mobHits: string;
  bossHits: string;
  refineDropPct: string;
  bagPrice: string;
  refinerPrice: string;
  attrResetPrice: string;
  petDogPrice: string;
  petCatPrice: string;
  petParrotPrice: string;
  offers: MerchantOffers;
  eventLabel: string;
  eventXp: string;
  eventGold: string;
  eventDrop: string;
  eventEndsAt: string;
};

function offersFrom(meta: AdminCatalogMeta | null): MerchantOffers {
  return {
    bag_upgrade: meta?.offersEnabled?.bag_upgrade !== false,
    refiner: meta?.offersEnabled?.refiner !== false,
    attr_reset: meta?.offersEnabled?.attr_reset !== false,
    pet_dog: meta?.offersEnabled?.pet_dog !== false,
    pet_cat: meta?.offersEnabled?.pet_cat !== false,
    pet_parrot: meta?.offersEnabled?.pet_parrot !== false,
  };
}

function snapFrom(meta: AdminCatalogMeta | null, balance: Record<string, number> | null): Snap {
  const event = meta?.engagementEvent;
  let ends = "";
  if (event?.endsAt) ends = event.endsAt.slice(0, 16);
  return {
    dropPct: Math.round((meta?.dropChance ?? 0.11) * 1000) / 10,
    mobHits: String(balance?.mobHitsToKill ?? 10),
    bossHits: String(balance?.bossHitsToKill ?? 28),
    refineDropPct: String(Math.round((balance?.refineDropChance ?? 0.012) * 1000) / 10),
    bagPrice: String(meta?.bagUpgradePrice ?? 150000),
    refinerPrice: String(meta?.refinerPrice ?? 25000),
    attrResetPrice: String(meta?.attrResetPrice ?? 1_000_000),
    petDogPrice: String(meta?.petDogPrice ?? 40000),
    petCatPrice: String(meta?.petCatPrice ?? 40000),
    petParrotPrice: String(meta?.petParrotPrice ?? 100000),
    offers: offersFrom(meta),
    eventLabel: event?.label || "Semana especial",
    eventXp: String(event?.xpMult ?? 1.15),
    eventGold: String(event?.goldMult ?? 1.1),
    eventDrop: String(event?.dropMult ?? 1.25),
    eventEndsAt: ends,
  };
}

export function useLiveOpsDraft({
  catalogMeta,
  balance,
  run,
  idleFetch,
  applyCatalogPayload,
  onMessage,
  onRefresh,
}: Args) {
  const initial = snapFrom(catalogMeta, balance);
  const [snap, setSnap] = useState<Snap>(initial);
  const [baseline, setBaseline] = useState<Snap>(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const posting = useRef(false);
  const dirtyRef = useRef(false);
  const savedSection = useRef<"balance" | "merchant" | "event" | null>(null);
  const sectionDirty = useRef({ balance: false, merchant: false, event: false });
  const snapRef = useRef(snap);
  snapRef.current = snap;

  const balanceDirty =
    snap.dropPct !== baseline.dropPct ||
    snap.mobHits !== baseline.mobHits ||
    snap.bossHits !== baseline.bossHits ||
    snap.refineDropPct !== baseline.refineDropPct;
  const merchantDirty =
    snap.bagPrice !== baseline.bagPrice ||
    snap.refinerPrice !== baseline.refinerPrice ||
    snap.attrResetPrice !== baseline.attrResetPrice ||
    snap.petDogPrice !== baseline.petDogPrice ||
    snap.petCatPrice !== baseline.petCatPrice ||
    snap.petParrotPrice !== baseline.petParrotPrice ||
    JSON.stringify(snap.offers) !== JSON.stringify(baseline.offers);
  const eventDirty =
    snap.eventLabel !== baseline.eventLabel ||
    snap.eventXp !== baseline.eventXp ||
    snap.eventGold !== baseline.eventGold ||
    snap.eventDrop !== baseline.eventDrop ||
    snap.eventEndsAt !== baseline.eventEndsAt;
  const dirty = balanceDirty || merchantDirty || eventDirty;
  dirtyRef.current = dirty;
  sectionDirty.current = { balance: balanceDirty, merchant: merchantDirty, event: eventDirty };

  useEffect(() => {
    const next = snapFrom(catalogMeta, balance);
    const saved = savedSection.current;
    savedSection.current = null;
    const keep = sectionDirty.current;
    setBaseline(next);
    setSnap((current) => {
      if (!dirtyRef.current) return next;
      return {
        ...next,
        ...(keep.balance && saved !== "balance"
          ? {
              dropPct: current.dropPct,
              mobHits: current.mobHits,
              bossHits: current.bossHits,
              refineDropPct: current.refineDropPct,
            }
          : {}),
        ...(keep.merchant && saved !== "merchant"
          ? {
              bagPrice: current.bagPrice,
              refinerPrice: current.refinerPrice,
              attrResetPrice: current.attrResetPrice,
              petDogPrice: current.petDogPrice,
              petCatPrice: current.petCatPrice,
              petParrotPrice: current.petParrotPrice,
              offers: current.offers,
            }
          : {}),
        ...(keep.event && saved !== "event"
          ? {
              eventLabel: current.eventLabel,
              eventXp: current.eventXp,
              eventGold: current.eventGold,
              eventDrop: current.eventDrop,
              eventEndsAt: current.eventEndsAt,
            }
          : {}),
      };
    });
  }, [
    catalogMeta,
    balance,
    catalogMeta?.dropChance,
    catalogMeta?.bagUpgradePrice,
    catalogMeta?.refinerPrice,
    catalogMeta?.attrResetPrice,
    catalogMeta?.petDogPrice,
    catalogMeta?.petCatPrice,
    catalogMeta?.petParrotPrice,
    catalogMeta?.offersEnabled,
    catalogMeta?.engagementEvent,
    balance?.mobHitsToKill,
    balance?.bossHitsToKill,
    balance?.refineDropChance,
  ]);

  function patch(partial: Partial<Snap>) {
    setSnap((prev) => ({ ...prev, ...partial }));
  }

  function setOffer(sku: keyof MerchantOffers, enabled: boolean) {
    setSnap((prev) => ({ ...prev, offers: { ...prev.offers, [sku]: enabled } }));
  }

  async function post(
    body: Record<string, unknown>,
    message: string,
    section: "balance" | "merchant" | "event",
  ) {
    if (posting.current) return false;
    posting.current = true;
    setSaving(true);
    setFailed(false);
    const ok = await run(async () => {
      const data = await idleFetch("/api/jogo-idle/admin/config", {
        method: "POST",
        body: JSON.stringify(body),
      });
      savedSection.current = section;
      applyCatalogPayload(data);
      onMessage(data.message || message);
      await onRefresh();
    });
    posting.current = false;
    setSaving(false);
    if (!ok) {
      savedSection.current = null;
      setFailed(true);
    }
    return ok;
  }

  function saveBalance(event?: FormEvent) {
    event?.preventDefault();
    const current = snapRef.current;
    return post(
      {
        dropChance: current.dropPct / 100,
        balance: {
          refineDropChance: Number(current.refineDropPct) / 100,
          bossHitsToKill: Number(current.bossHits),
          mobHitsToKill: Number(current.mobHits),
        },
      },
      "Drop e balanceamento atualizados",
      "balance",
    );
  }

  function saveMerchant(event?: FormEvent) {
    event?.preventDefault();
    const current = snapRef.current;
    return post(
      {
        bagUpgradePrice: current.bagPrice,
        refinerPrice: current.refinerPrice,
        attrResetPrice: current.attrResetPrice,
        petDogPrice: current.petDogPrice,
        petCatPrice: current.petCatPrice,
        petParrotPrice: current.petParrotPrice,
        merchantOffersEnabled: current.offers,
      },
      "Mercador atualizado",
      "merchant",
    );
  }

  function saveEvent(event?: FormEvent) {
    event?.preventDefault();
    const current = snapRef.current;
    const ends = new Date(current.eventEndsAt);
    if (!Number.isFinite(ends.getTime())) {
      setFailed(true);
      onMessage("Data de término inválida");
      return Promise.resolve(false);
    }
    return post(
      {
        engagementEvent: {
          label: current.eventLabel.trim(),
          xpMult: Number(current.eventXp),
          goldMult: Number(current.eventGold),
          dropMult: Number(current.eventDrop),
          endsAt: ends.toISOString(),
        },
      },
      "Evento de engajamento ativado",
      "event",
    );
  }

  function clearEvent() {
    return post({ engagementEvent: { clear: true } }, "Evento encerrado", "event");
  }

  function revert() {
    setSnap(baseline);
    setFailed(false);
  }

  async function savePending() {
    let ok = true;
    if (balanceDirty) ok = await saveBalance();
    if (ok && merchantDirty) ok = await saveMerchant();
    if (ok && eventDirty) ok = await saveEvent();
    return ok;
  }

  const phase = saving ? "saving" : failed ? "error" : dirty ? "dirty" : "saved";

  return {
    ...snap,
    setDropPct: (dropPct: number) => patch({ dropPct }),
    setMobHits: (mobHits: string) => patch({ mobHits }),
    setBossHits: (bossHits: string) => patch({ bossHits }),
    setRefineDropPct: (refineDropPct: string) => patch({ refineDropPct }),
    setBagPrice: (bagPrice: string) => patch({ bagPrice }),
    setRefinerPrice: (refinerPrice: string) => patch({ refinerPrice }),
    setAttrResetPrice: (attrResetPrice: string) => patch({ attrResetPrice }),
    setPetDogPrice: (petDogPrice: string) => patch({ petDogPrice }),
    setPetCatPrice: (petCatPrice: string) => patch({ petCatPrice }),
    setPetParrotPrice: (petParrotPrice: string) => patch({ petParrotPrice }),
    setOffer,
    setEventLabel: (eventLabel: string) => patch({ eventLabel }),
    setEventXp: (eventXp: string) => patch({ eventXp }),
    setEventGold: (eventGold: string) => patch({ eventGold }),
    setEventDrop: (eventDrop: string) => patch({ eventDrop }),
    setEventEndsAt: (eventEndsAt: string) => patch({ eventEndsAt }),
    dirty,
    balanceDirty,
    merchantDirty,
    eventDirty,
    phase,
    saving,
    saveBalance,
    saveMerchant,
    saveEvent,
    clearEvent,
    revert,
    savePending,
    eventActive: Boolean(catalogMeta?.engagementEvent),
    eventActiveLabel: catalogMeta?.engagementEvent?.label || "",
    eventActiveUntil: catalogMeta?.engagementEvent?.endsAt || "",
  };
}
