/** Temas visuais de zona (mapa) — persistidos em zone overrides. */

export const ZONE_PROP_KINDS = [
  "bare",
  "ruins",
  "forest",
  "graveyard",
  "garden",
  "swamp",
  "crypt",
  "ice",
  "abyss",
  "fortress",
  "volcano",
  "tomb",
  "mist",
  "relic",
  "throne",
  "ether",
  "firmament",
  "nexus",
] as const;

export const ZONE_PROP_PACKS = ["dungeon", "nature", "forest", "city", "space", "halloween"] as const;

export type ZonePropKind = (typeof ZONE_PROP_KINDS)[number];
export type ZonePropPack = (typeof ZONE_PROP_PACKS)[number];

export type ZoneDecoration = {
  pack: ZonePropPack;
  key: string;
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotY?: number;
  tint?: number | null;
};

export const ZONE_PARTICLE_MODES = ["float", "embers", "snow", "rise"] as const;
export type ZoneParticleMode = (typeof ZONE_PARTICLE_MODES)[number];

export type ZoneScene = {
  bg?: number;
  ground?: number;
  hemiSky?: number;
  hemiGround?: number;
  hemiIntensity?: number;
  sunColor?: number;
  sunIntensity?: number;
  props?: ZonePropKind;
  fogNear?: number;
  fogFar?: number;
  /** Modo de partículas; null desliga override (usa preset da zona). */
  particles?: ZoneParticleMode | null;
  particleColor?: number;
  /** Fator de densidade de props (0.5–2, default 1). */
  propDensity?: number;
  /** Variante de layout (ex. clearing/dense/swamp) para kinds com sub-layouts. */
  variant?: string;
  decorations?: ZoneDecoration[];
};

/** Bioma assado no editor pode gerar dezenas de props editáveis (floresta densa ~120+). */
const MAX_DECORATIONS = 160;

function parseHex(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(0xffffff, Math.floor(value)));
  }
  if (typeof value !== "string") return undefined;
  const raw = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return undefined;
  return Number.parseInt(raw, 16);
}

function parseFloatClamped(value: unknown, min: number, max: number): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

/** Normaliza payload de cena vindo do admin. */
export function sanitizeZoneScene(raw: unknown): ZoneScene | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const scene: ZoneScene = {};

  const bg = parseHex(input.bg);
  const ground = parseHex(input.ground);
  const hemiSky = parseHex(input.hemiSky);
  const hemiGround = parseHex(input.hemiGround);
  const sunColor = parseHex(input.sunColor);
  if (bg != null) scene.bg = bg;
  if (ground != null) scene.ground = ground;
  if (hemiSky != null) scene.hemiSky = hemiSky;
  if (hemiGround != null) scene.hemiGround = hemiGround;
  if (sunColor != null) scene.sunColor = sunColor;

  const hemiIntensity = parseFloatClamped(input.hemiIntensity, 0.1, 2);
  const sunIntensity = parseFloatClamped(input.sunIntensity, 0.1, 3);
  const fogNear = parseFloatClamped(input.fogNear, 1, 40);
  const fogFar = parseFloatClamped(input.fogFar, 5, 80);
  if (hemiIntensity != null) scene.hemiIntensity = hemiIntensity;
  if (sunIntensity != null) scene.sunIntensity = sunIntensity;
  if (fogNear != null) scene.fogNear = fogNear;
  if (fogFar != null) scene.fogFar = fogFar;

  if (typeof input.props === "string" && (ZONE_PROP_KINDS as readonly string[]).includes(input.props)) {
    scene.props = input.props as ZonePropKind;
  }

  if (input.particles === null) {
    scene.particles = null;
  } else if (
    typeof input.particles === "string" &&
    (ZONE_PARTICLE_MODES as readonly string[]).includes(input.particles)
  ) {
    scene.particles = input.particles as ZoneParticleMode;
  }

  const particleColor = parseHex(input.particleColor);
  if (particleColor != null) scene.particleColor = particleColor;

  const propDensity = parseFloatClamped(input.propDensity, 0.5, 2);
  if (propDensity != null) scene.propDensity = propDensity;

  if (typeof input.variant === "string") {
    const v = input.variant.trim().slice(0, 32);
    if (v) scene.variant = v;
  }

  if (Array.isArray(input.decorations)) {
    const decorations: ZoneDecoration[] = [];
    for (const row of input.decorations.slice(0, MAX_DECORATIONS)) {
      if (!row || typeof row !== "object") continue;
      const d = row as Record<string, unknown>;
      const pack = String(d.pack || "");
      const key = String(d.key || "").trim().slice(0, 48);
      if (!(ZONE_PROP_PACKS as readonly string[]).includes(pack) || !key) continue;
  const x = parseFloatClamped(d.x, -24, 24);
  const z = parseFloatClamped(d.z, -24, 24);
      if (x == null || z == null) continue;
      const item: ZoneDecoration = {
        pack: pack as ZonePropPack,
        key,
        x,
        z,
      };
      const y = parseFloatClamped(d.y, -2, 8);
      const scale = parseFloatClamped(d.scale, 0.15, 4);
      const rotY = parseFloatClamped(d.rotY, -Math.PI * 4, Math.PI * 4);
      const tint = d.tint === null || d.tint === "" ? null : parseHex(d.tint);
      if (y != null) item.y = y;
      if (scale != null) item.scale = scale;
      if (rotY != null) item.rotY = rotY;
      if (tint !== undefined) item.tint = tint;
      decorations.push(item);
    }
    if (decorations.length) scene.decorations = decorations;
  }

  return Object.keys(scene).length ? scene : {};
}

export function hexToCss(hex?: number | null): string {
  if (hex == null || !Number.isFinite(hex)) return "#808080";
  return `#${Math.floor(hex).toString(16).padStart(6, "0")}`;
}

/** Presets visuais por zoneId / sceneProfileId (fog/partículas/densidade/variante). */
export const ZONE_SCENE_PRESETS: Record<string, ZoneScene> = {
  idle: { bg: 0x0d0b09, ground: 0x1f1a14, hemiSky: 0x6a5a48, props: "ruins", particles: "float", particleColor: 0xc9a050, propDensity: 0.8, fogNear: 11, fogFar: 32 },
  // Cap I — Floresta
  bosque_sussurros: { bg: 0x1a3a28, ground: 0x3a5a32, hemiSky: 0xb8e0c0, sunColor: 0xfff4d0, props: "forest", variant: "clearing", particles: "float", particleColor: 0xe8ff8a, propDensity: 1.05, fogNear: 12, fogFar: 36 },
  pantano_sombras: { bg: 0x121a10, ground: 0x243018, hemiSky: 0x8aaa6a, props: "swamp", variant: "swamp", particles: "rise", particleColor: 0xb8ff6a, propDensity: 1.15, fogNear: 5, fogFar: 18 },
  floresta_amaldicoada: { bg: 0x142018, ground: 0x2a3820, hemiSky: 0x70a070, sunColor: 0xc8e0a0, props: "forest", variant: "cursed", particles: "float", particleColor: 0xa0ff70, propDensity: 1.45, fogNear: 7, fogFar: 24 },
  ruinas_druidas: { bg: 0x182820, ground: 0x304028, hemiSky: 0xa0c8a8, sunColor: 0xe8f0c8, props: "forest", variant: "ruins", particles: "float", particleColor: 0xd0e890, propDensity: 1.2, fogNear: 9, fogFar: 28 },
  coracao_floresta: { bg: 0x0e2818, ground: 0x1e4028, hemiSky: 0x80ffb0, sunColor: 0xe0ffc0, props: "forest", variant: "heart", particles: "embers", particleColor: 0xa0ff80, propDensity: 0.95, fogNear: 8, fogFar: 26 },
  // Cap II — Cemitério
  cemiterio_esquecido: { bg: 0x10131e, ground: 0x2a2a30, hemiSky: 0x8aa0d0, sunColor: 0xb8c8ff, props: "graveyard", particles: "rise", particleColor: 0x9fc4ff, propDensity: 0.95, fogNear: 5, fogFar: 18 },
  criptas_profanadas: { bg: 0x140c10, ground: 0x241820, hemiSky: 0xa08090, props: "crypt", particles: "embers", particleColor: 0xffab4a, propDensity: 0.85, fogNear: 6, fogFar: 20 },
  catacumbas_eternas: { bg: 0x0c0e12, ground: 0x1c1e24, hemiSky: 0x8890a0, props: "tomb", particles: "float", particleColor: 0xc0c8d8, propDensity: 0.9, fogNear: 4, fogFar: 15 },
  necropole_reis: { bg: 0x121018, ground: 0x2a2430, hemiSky: 0xc0b0e0, sunColor: 0xe8d0ff, props: "relic", particles: "rise", particleColor: 0xd0c0ff, propDensity: 1.05, fogNear: 7, fogFar: 24 },
  trono_almas: { bg: 0x0c1018, ground: 0x1a2028, hemiSky: 0x90a8c8, sunColor: 0xc0d0e8, props: "throne", particles: "rise", particleColor: 0xa8c8ff, propDensity: 0.8, fogNear: 6, fogFar: 22 },
  // Cap III — Chamas
  campos_cinzas: { bg: 0x1a1008, ground: 0x2a1c10, hemiSky: 0xd09060, sunColor: 0xffa060, props: "volcano", particles: "embers", particleColor: 0xff8040, propDensity: 0.85, fogNear: 8, fogFar: 26 },
  rios_magma: { bg: 0x1a0804, ground: 0x2a140c, hemiSky: 0xff8050, sunColor: 0xff9040, props: "volcano", particles: "embers", particleColor: 0xff6020, propDensity: 1.05, fogNear: 5, fogFar: 20 },
  fornalhas_malditas: { bg: 0x160604, ground: 0x28100c, hemiSky: 0xff6040, sunColor: 0xff7030, props: "crypt", particles: "embers", particleColor: 0xff5020, propDensity: 0.9, fogNear: 6, fogFar: 22 },
  fortaleza_condenados: { bg: 0x1a1008, ground: 0x3a2818, hemiSky: 0xffb080, sunColor: 0xffc090, props: "fortress", particles: "embers", particleColor: 0xff9060, propDensity: 1.2, fogNear: 10, fogFar: 32 },
  trono_chama: { bg: 0x120402, ground: 0x220c08, hemiSky: 0xff7030, sunColor: 0xff9020, props: "volcano", particles: "embers", particleColor: 0xff4000, propDensity: 0.85, fogNear: 5, fogFar: 18 },
  // Cap IV — Vazio
  ruinas_orbitais: { bg: 0x0a1218, ground: 0x142028, hemiSky: 0x80a0c0, sunColor: 0xb0d0e8, props: "mist", particles: "snow", particleColor: 0xe0ecff, propDensity: 0.7, fogNear: 6, fogFar: 22 },
  abismo_esquecido: { bg: 0x0a0612, ground: 0x1a1224, hemiSky: 0x8a6ad0, sunColor: 0xc0a0ff, props: "abyss", particles: "rise", particleColor: 0xb06aff, propDensity: 0.8, fogNear: 5, fogFar: 20 },
  cemiterio_estrelas: { bg: 0x061018, ground: 0x0e1c28, hemiSky: 0x80c0e8, sunColor: 0xa0d8ff, props: "ether", particles: "rise", particleColor: 0xc0e8ff, propDensity: 0.9, fogNear: 8, fogFar: 28 },
  horizonte_eventos: { bg: 0x081428, ground: 0x102038, hemiSky: 0xa0c0ff, sunColor: 0xffe8c0, props: "firmament", particles: "float", particleColor: 0xfff0d0, propDensity: 0.75, fogNear: 9, fogFar: 30 },
  singularidade: { bg: 0x060418, ground: 0x100c28, hemiSky: 0xc080ff, sunColor: 0xe0a0ff, props: "nexus", particles: "rise", particleColor: 0xf0c0ff, propDensity: 1.1, fogNear: 6, fogFar: 22 },
  // Trials
  prova_divina: { bg: 0x120818, ground: 0x1a1228, hemiSky: 0xc0a0e8, sunColor: 0xe8d0ff, props: "throne", particles: "embers", particleColor: 0xd8b0ff, propDensity: 0.75, fogNear: 7, fogFar: 26 },
  julgamento_almas: { bg: 0x0c1018, ground: 0x1a2028, hemiSky: 0x90a8c8, sunColor: 0xc0d0e8, props: "graveyard", particles: "rise", particleColor: 0xa8c8ff, propDensity: 0.85, fogNear: 5, fogFar: 20 },
  coracao_chama: { bg: 0x1a0804, ground: 0x2a140c, hemiSky: 0xff8050, sunColor: 0xff9040, props: "volcano", particles: "embers", particleColor: 0xff6020, propDensity: 0.95, fogNear: 6, fogFar: 22 },
  // Aliases legados → mesmos presets das regiões canônicas
  floresta: {},
  pantano: {},
  jardim: {},
  cemiterio: {},
  hidra: {},
  gelo: {},
  catacumbas: {},
  reliquias: {},
  trono: {},
  vulcao: {},
  abismo: {},
  fortaleza: {},
  nevoa: {},
  eter: {},
  firmamento: {},
  nexus: {},
};

// Preenche aliases legados a partir dos canônicos (evita duplicar literais).
ZONE_SCENE_PRESETS.floresta = { ...ZONE_SCENE_PRESETS.bosque_sussurros };
ZONE_SCENE_PRESETS.pantano = { ...ZONE_SCENE_PRESETS.pantano_sombras };
ZONE_SCENE_PRESETS.jardim = { ...ZONE_SCENE_PRESETS.floresta_amaldicoada };
ZONE_SCENE_PRESETS.gelo = { ...ZONE_SCENE_PRESETS.bosque_sussurros };
ZONE_SCENE_PRESETS.cemiterio = { ...ZONE_SCENE_PRESETS.cemiterio_esquecido };
ZONE_SCENE_PRESETS.hidra = { ...ZONE_SCENE_PRESETS.criptas_profanadas };
ZONE_SCENE_PRESETS.catacumbas = { ...ZONE_SCENE_PRESETS.catacumbas_eternas };
ZONE_SCENE_PRESETS.reliquias = { ...ZONE_SCENE_PRESETS.necropole_reis };
ZONE_SCENE_PRESETS.trono = { ...ZONE_SCENE_PRESETS.trono_almas };
ZONE_SCENE_PRESETS.vulcao = { ...ZONE_SCENE_PRESETS.campos_cinzas };
ZONE_SCENE_PRESETS.abismo = { ...ZONE_SCENE_PRESETS.abismo_esquecido };
ZONE_SCENE_PRESETS.fortaleza = { ...ZONE_SCENE_PRESETS.fortaleza_condenados };
ZONE_SCENE_PRESETS.nevoa = { ...ZONE_SCENE_PRESETS.ruinas_orbitais };
ZONE_SCENE_PRESETS.eter = { ...ZONE_SCENE_PRESETS.cemiterio_estrelas };
ZONE_SCENE_PRESETS.firmamento = { ...ZONE_SCENE_PRESETS.horizonte_eventos };
ZONE_SCENE_PRESETS.nexus = { ...ZONE_SCENE_PRESETS.singularidade };

/** Profiles nomeados (sceneProfileId) — espelham as regiões. */
for (const [id, scene] of Object.entries({
  forest_clearing: ZONE_SCENE_PRESETS.bosque_sussurros,
  forest_swamp: ZONE_SCENE_PRESETS.pantano_sombras,
  forest_cursed: ZONE_SCENE_PRESETS.floresta_amaldicoada,
  forest_ruins: ZONE_SCENE_PRESETS.ruinas_druidas,
  forest_heart: ZONE_SCENE_PRESETS.coracao_floresta,
  grave_mist: ZONE_SCENE_PRESETS.cemiterio_esquecido,
  crypt_deep: ZONE_SCENE_PRESETS.criptas_profanadas,
  tomb_ossuary: ZONE_SCENE_PRESETS.catacumbas_eternas,
  grave_necropolis: ZONE_SCENE_PRESETS.necropole_reis,
  grave_throne: ZONE_SCENE_PRESETS.trono_almas,
  volcano_ash: ZONE_SCENE_PRESETS.campos_cinzas,
  volcano_magma: ZONE_SCENE_PRESETS.rios_magma,
  volcano_forge: ZONE_SCENE_PRESETS.fornalhas_malditas,
  volcano_fortress: ZONE_SCENE_PRESETS.fortaleza_condenados,
  volcano_throne: ZONE_SCENE_PRESETS.trono_chama,
  void_ruins: ZONE_SCENE_PRESETS.ruinas_orbitais,
  void_abyss: ZONE_SCENE_PRESETS.abismo_esquecido,
  void_stars: ZONE_SCENE_PRESETS.cemiterio_estrelas,
  void_horizon: ZONE_SCENE_PRESETS.horizonte_eventos,
  void_singularity: ZONE_SCENE_PRESETS.singularidade,
  trial_prova_divina: ZONE_SCENE_PRESETS.prova_divina,
  trial_julgamento: ZONE_SCENE_PRESETS.julgamento_almas,
  trial_coracao: ZONE_SCENE_PRESETS.coracao_chama,
})) {
  ZONE_SCENE_PRESETS[id] = { ...scene };
}

export function getZoneScenePreset(zoneId: string): ZoneScene {
  return { ...(ZONE_SCENE_PRESETS[zoneId] || ZONE_SCENE_PRESETS.idle) };
}
