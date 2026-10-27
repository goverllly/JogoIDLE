export type AdminCatalogItem = {
  id: string;
  name: string;
  slot: string;
  classes: string[];
  tier: number;
  level: number;
  icon?: string;
  visual?: string | null;
  twoHanded?: boolean;
  consumable?: boolean;
  stats?: Record<string, number>;
  price?: number;
  /** 0–1; peso relativo no pool de gear, ou chance absoluta na Poção de Vida. */
  dropChance?: number | null;
  stackable?: boolean;
  custom?: boolean;
  overridden?: boolean;
  previews?: Record<string, Record<string, number>>;
};

export type AdminMonsterVisualOption = {
  id: string;
  label: string;
};

export type AdminCatalogMeta = {
  slots: string[];
  classes: string[];
  icons: string[];
  visuals: { id: string; label: string; slots: string[] }[];
  rarities: Record<string, { id: string; name: string }>;
  tiers: { tier: number; level: number }[];
  dropChance: number;
  bagUpgradePrice?: number;
  refinerPrice?: number;
  attrResetPrice?: number;
  petDogPrice?: number;
  petCatPrice?: number;
  petParrotPrice?: number;
  offersEnabled?: {
    bag_upgrade?: boolean;
    refiner?: boolean;
    attr_reset?: boolean;
    pet_dog?: boolean;
    pet_cat?: boolean;
    pet_parrot?: boolean;
  };
  monsterVisuals?: AdminMonsterVisualOption[];
  engagementEvent?: {
    label: string;
    xpMult: number;
    goldMult: number;
    dropMult: number;
    endsAt: string;
  } | null;
};

export type AdminActiveCharacter = {
  id: string;
  name: string;
  className: string;
  level: number;
  gold: number;
  userName?: string;
  userEmail?: string | null;
  lastSeenAt?: string | null;
};

export type TemplateDraft = {
  id?: string;
  name: string;
  slot: string;
  classes: string[];
  tier: number;
  level: number;
  icon: string;
  visual: string;
  price: number;
  /** Percentual 0–100 (ex.: 0.8 = 0,8%). */
  dropPct: string;
  str: string;
  dex: string;
  int: string;
  con: string;
  mp: string;
  attack: string;
  defense: string;
  hp: string;
  crit: string;
  rarity: string;
  grant: boolean;
};

export type AdminMonster = {
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense?: number;
  xp?: number;
  gold?: number;
  /** Modelo 3D estável (skeleton_warrior, …). */
  visualId?: string | null;
};

export type MapDecoration = {
  pack: string;
  key: string;
  x: number;
  z: number;
  scale?: number;
  rotY?: number;
};

export type AdminZone = {
  id: string;
  name: string;
  minLevel: number;
  tier: number;
  requiresAscension?: string | null;
  dropChance?: number | null;
  /** Kills de mobs comuns até o boss (resolvido). */
  bossWaveSize?: number;
  bossWaveSizeOverridden?: boolean;
  monsters?: AdminMonster[];
  boss?: {
    name: string;
    level: number;
    hp: number;
    attack?: number;
    defense?: number;
    xp?: number;
    gold?: number;
    visualId?: string | null;
    overridden?: boolean;
  };
  scene?: {
    bg?: number;
    ground?: number;
    hemiSky?: number;
    sunColor?: number;
    props?: string;
    decorations?: MapDecoration[];
  } | null;
};

export type SeasonSummary = {
  id: string;
  year: number;
  quarter: number;
  slug: string;
  label: string;
  notes: string | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
};

export type MonsterDraftRow = {
  name: string;
  level: string;
  hp: string;
  attack: string;
  defense: string;
  xp: string;
  gold: string;
  visualId: string;
};

export const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  slot: "weapon",
  classes: ["GUERREIRO", "MAGO", "ARQUEIRO"],
  tier: 1,
  level: 1,
  icon: "sword",
  visual: "",
  price: 12,
  dropPct: "100",
  str: "8",
  dex: "4",
  int: "",
  con: "",
  mp: "",
  attack: "",
  defense: "",
  hp: "",
  crit: "",
  rarity: "epic",
  grant: true,
};

/** Converte dropChance (0–1) do catálogo para % no formulário. */
export function dropChanceToPct(item: AdminCatalogItem): string {
  if (item.dropChance != null && Number.isFinite(Number(item.dropChance))) {
    return String(Math.round(Number(item.dropChance) * 10000) / 100);
  }
  if (item.consumable || item.slot === "consumable") return "0";
  return "100";
}

export type AdminTabId =
  | "overview"
  | "items"
  | "zones"
  | "map"
  | "hud"
  | "monsters"
  | "loot"
  | "economy"
  | "season"
  | "characters"
  | "simulate"
  | "settings"
  | "engagement"
  | "backup"
  | "logs"
  | "admins";

export type AdminTabDef = {
  id: AdminTabId;
  label: string;
  section: "manage" | "tools";
  disabled?: boolean;
  title?: string;
};

export const ADMIN_TABS: readonly AdminTabDef[] = [
  { id: "overview", label: "Visão Geral", section: "manage" },
  { id: "items", label: "Itens", section: "manage" },
  { id: "zones", label: "Zonas", section: "manage" },
  { id: "map", label: "Mapa", section: "manage" },
  { id: "hud", label: "Editor de HUD", section: "tools" },
  { id: "monsters", label: "Monstros", section: "manage" },
  { id: "loot", label: "Loot & Drops", section: "manage" },
  { id: "economy", label: "Economia", section: "manage" },
  { id: "season", label: "Temporada", section: "manage" },
  { id: "characters", label: "Personagens", section: "manage" },
  { id: "simulate", label: "Simulador", section: "manage" },
  { id: "settings", label: "Configurações", section: "manage" },
  { id: "engagement", label: "Engajamento", section: "manage" },
  {
    id: "backup",
    label: "Backup / Restore",
    section: "tools",
    disabled: true,
    title: "Disponível na Fase 4 (versionamento)",
  },
  { id: "logs", label: "Logs do Sistema", section: "tools" },
  { id: "admins", label: "Usuários Admin", section: "tools" },
];

export const ADMIN_TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Visão Geral",
    subtitle: "Central operacional do Sinergia IDLE — dados reais do runtime.",
  },
  items: {
    title: "Itens",
    subtitle: "Catálogo, atributos, drop e preview 3D.",
  },
  zones: {
    title: "Zonas",
    subtitle: "Overrides de nível, drop, boss e acesso (IDs fixos na Fase 1).",
  },
  map: {
    title: "Mapa / World Builder",
    subtitle: "Cena 3D, props e decorações da zona selecionada.",
  },
  hud: {
    title: "Editor de HUD",
    subtitle: "Personalize a interface do jogo visualmente — rascunho No-Code.",
  },
  monsters: {
    title: "Monstros",
    subtitle: "Mobs e bosses por zona — catálogo global na Fase 2.",
  },
  loot: {
    title: "Loot & Drops",
    subtitle: "Pool por tier e % de zona — loot tables por monstro na Fase 2.",
  },
  economy: {
    title: "Economia",
    subtitle: "Drop global, TTK, mercador e eventos.",
  },
  season: {
    title: "Temporada",
    subtitle: "Temporada OPEN e encerramento com soft-reset.",
  },
  characters: {
    title: "Personagens",
    subtitle: "Concessões e manutenção de personagens ativos.",
  },
  simulate: {
    title: "Simulador",
    subtitle: "TTK / XP / ouro estimados com o motor real (sem gravar).",
  },
  settings: {
    title: "Configurações",
    subtitle: "Balanceamento global e visão do runtime.",
  },
  engagement: {
    title: "Engajamento",
    subtitle: "Métricas de retenção e claims.",
  },
  logs: {
    title: "Logs do Sistema",
    subtitle: "Auditoria de ações administrativas.",
  },
  admins: {
    title: "Usuários Admin",
    subtitle: "Allowlist server-side (somente leitura).",
  },
  backup: {
    title: "Backup / Restore",
    subtitle: "Fase 4 — versionamento e rollback.",
  },
};

export const ADMIN_SELECT_CLASS = "idle-admin-select";

export function formatStats(stats?: Record<string, number>) {
  if (!stats || !Object.keys(stats).length) return "—";
  return Object.entries(stats)
    .map(([key, value]) => `${key.toUpperCase()} ${value}`)
    .join(" · ");
}

export function itemToDraft(item: AdminCatalogItem, rarity: string): TemplateDraft {
  return {
    id: item.id,
    name: item.name,
    slot: item.slot,
    classes: [...(item.classes || [])],
    tier: item.tier,
    level: item.level,
    icon: item.icon || "sword",
    visual: item.visual || "",
    price: item.price || 12,
    dropPct: dropChanceToPct(item),
    str: item.stats?.str != null ? String(item.stats.str) : "",
    dex: item.stats?.dex != null ? String(item.stats.dex) : "",
    int: item.stats?.int != null ? String(item.stats.int) : "",
    con: item.stats?.con != null ? String(item.stats.con) : "",
    mp: item.stats?.mp != null ? String(item.stats.mp) : "",
    attack: item.stats?.attack != null ? String(item.stats.attack) : "",
    defense: item.stats?.defense != null ? String(item.stats.defense) : "",
    hp: item.stats?.hp != null ? String(item.stats.hp) : "",
    crit: item.stats?.crit != null ? String(item.stats.crit) : "",
    rarity,
    grant: false,
  };
}

export function formatGrantTargetLabel(target: AdminActiveCharacter | null) {
  if (!target) return "—";
  const account = (target.userName || "conta").toString();
  return `${target.name} · ${target.className} · ${account}`;
}
