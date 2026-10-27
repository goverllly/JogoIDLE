import { getEngagementEvent } from "./game/items";

/** Standalone: sem plantão, FlowTime nem missões SinergIA. */
export const PLANTAO_XP_MULT = 1.25;
export const PLANTAO_GOLD_MULT = 1.1;
export const CHECKIN_GOLD = 500;
export const FLOWTIME_CLAIM_GOLD = 750;
export const FLOWTIME_DROP_MULT = 1.35;

export type IdleEngagementBonus = {
  plantaoToday: boolean;
  plantaoKind: null;
  plantaoLabel: string | null;
  xpMult: number;
  goldMult: number;
  dropMult: number;
  label: string | null;
  eventLabel: string | null;
  eventEndsAt: string | null;
  missions: {
    checkInClaimed: boolean;
    flowtimeAvailable: boolean;
    flowtimeClaimed: boolean;
    plantonistaTitle: boolean;
  };
};

function localDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Só evento admin do catálogo IDLE, se houver. Sem missões SinergIA. */
export async function getIdleEngagementBonus(
  _userId: number,
  _characterState?: { engagement?: Record<string, unknown> | null },
): Promise<IdleEngagementBonus> {
  const event = getEngagementEvent();
  let xpMult = 1;
  let goldMult = 1;
  let dropMult = 1;
  let label: string | null = null;

  if (event) {
    xpMult *= event.xpMult;
    goldMult *= event.goldMult;
    dropMult *= event.dropMult;
    label = event.label;
  }

  return {
    plantaoToday: false,
    plantaoKind: null,
    plantaoLabel: null,
    xpMult: Math.round(xpMult * 1000) / 1000,
    goldMult: Math.round(goldMult * 1000) / 1000,
    dropMult: Math.round(dropMult * 1000) / 1000,
    label,
    eventLabel: event?.label ?? null,
    eventEndsAt: event?.endsAt ?? null,
    missions: {
      checkInClaimed: true,
      flowtimeAvailable: false,
      flowtimeClaimed: true,
      plantonistaTitle: false,
    },
  };
}

export function ensureEngagementState(character: {
  engagement?: Record<string, unknown> | null;
}) {
  if (!character.engagement || typeof character.engagement !== "object") {
    character.engagement = { titles: [] };
  }
  if (!Array.isArray(character.engagement.titles)) {
    character.engagement.titles = [];
  }
  return character.engagement as {
    checkInDay?: string;
    flowtimeDay?: string;
    dropBoostDay?: string;
    titles: string[];
  };
}

export function todayKey() {
  return localDayKey();
}
