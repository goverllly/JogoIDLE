/**
 * Ring buffer de anúncios de drop raro (MVP in-memory).
 * Cada anúncio guarda os times ativos de quem dropou.
 * A leitura devolve só quem compartilha um desses times.
 * Em multi-réplica, evoluir para Prisma/Redis.
 */

export type IdleAnnouncement = {
  id: string;
  userName: string;
  itemName: string;
  rarity: string;
  refineLevel?: number;
  teamIds: number[];
  at: string;
};

export type PublicIdleAnnouncement = Omit<IdleAnnouncement, "teamIds">;

const MAX = 40;
const buffer: IdleAnnouncement[] = [];

export function normalizeAnnouncementTeamIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  const unique = new Set<number>();
  for (const id of ids) {
    const n = typeof id === "number" ? id : Number(id);
    if (Number.isInteger(n) && n > 0) unique.add(n);
  }
  return Array.from(unique);
}

export function pushIdleAnnouncement(
  entry: Omit<IdleAnnouncement, "id" | "at" | "teamIds"> & { at?: string; teamIds?: unknown },
): IdleAnnouncement | null {
  const teamIds = normalizeAnnouncementTeamIds(entry.teamIds);
  if (teamIds.length === 0) return null;
  const row: IdleAnnouncement = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userName: String(entry.userName || "Aventureiro").slice(0, 40),
    itemName: String(entry.itemName || "item").slice(0, 60),
    rarity: String(entry.rarity || "rare"),
    refineLevel: entry.refineLevel,
    teamIds,
    at: entry.at || new Date().toISOString(),
  };
  buffer.unshift(row);
  while (buffer.length > MAX) buffer.pop();
  return row;
}

function toPublicAnnouncement(row: IdleAnnouncement): PublicIdleAnnouncement {
  return {
    id: row.id,
    userName: row.userName,
    itemName: row.itemName,
    rarity: row.rarity,
    refineLevel: row.refineLevel,
    at: row.at,
  };
}

/**
 * Anúncios do buffer visíveis para os times do leitor.
 * Ordem cronológica: o último `at` é o mais novo, para o cursor do banner avançar.
 */
export function listIdleAnnouncements(
  sinceIso?: string | null,
  viewerTeamIds: unknown = [],
  limit = 10,
): PublicIdleAnnouncement[] {
  const viewer = new Set(normalizeAnnouncementTeamIds(viewerTeamIds));
  if (viewer.size === 0) return [];
  const since = sinceIso ? Date.parse(sinceIso) : 0;
  const sinceOk = Number.isFinite(since) ? since : 0;
  const cap = Math.max(1, Math.min(20, limit));
  return buffer
    .filter((row) => Date.parse(row.at) > sinceOk && row.teamIds.some((id) => viewer.has(id)))
    .slice(0, cap)
    .reverse()
    .map(toPublicAnnouncement);
}

export function resetIdleAnnouncementsForTests() {
  buffer.length = 0;
}

export function shouldAnnounceDrop(info: {
  rarity?: string;
  templateId?: string;
  announce?: boolean;
  consumable?: boolean;
}) {
  if (info.announce || info.templateId === "consumable_refiner") return true;
  return info.rarity === "epic" || info.rarity === "legendary";
}
