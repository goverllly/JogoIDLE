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

export const ZONE_PROP_PACKS = ["dungeon", "nature", "city", "space", "halloween"] as const;

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

/** Presets visuais por zoneId (fog/partículas/densidade distintos). */
export const ZONE_SCENE_PRESETS: Record<string, ZoneScene> = {
  idle: { bg: 0x0d0b09, ground: 0x1f1a14, hemiSky: 0x6a5a48, props: "ruins", particles: "float", particleColor: 0xc9a050, propDensity: 0.8, fogNear: 11, fogFar: 32 },
  floresta: { bg: 0x16241f, ground: 0x2c4226, hemiSky: 0x9fc8a8, sunColor: 0xfff0c8, props: "forest", particles: "float", particleColor: 0xe8ff8a, propDensity: 1.4, fogNear: 10, fogFar: 34 },
  cemiterio: { bg: 0x10131e, ground: 0x2a2a30, hemiSky: 0x8aa0d0, sunColor: 0xb8c8ff, props: "graveyard", particles: "rise", particleColor: 0x9fc4ff, propDensity: 0.9, fogNear: 5, fogFar: 18 },
  jardim: { bg: 0x1c1026, ground: 0x223620, hemiSky: 0xd0a0e0, sunColor: 0xffd0f0, props: "garden", particles: "float", particleColor: 0xff9fd0, propDensity: 1.2, fogNear: 9, fogFar: 28 },
  pantano: { bg: 0x141a10, ground: 0x2a2c18, hemiSky: 0x9aae7a, props: "swamp", particles: "rise", particleColor: 0xb8ff6a, propDensity: 1.1, fogNear: 5, fogFar: 20 },
  hidra: { bg: 0x1c0a06, ground: 0x2a1810, hemiSky: 0xff9a6a, props: "crypt", particles: "embers", particleColor: 0xffab4a, propDensity: 0.85, fogNear: 7, fogFar: 24 },
  gelo: { bg: 0x9fb4c8, ground: 0xdfe8f0, hemiSky: 0xdff0ff, sunColor: 0xf0f6ff, props: "ice", particles: "snow", particleColor: 0xffffff, propDensity: 0.7, fogNear: 9, fogFar: 30 },
  abismo: { bg: 0x0a0612, ground: 0x1a1224, hemiSky: 0x8a6ad0, sunColor: 0xc0a0ff, props: "abyss", particles: "rise", particleColor: 0xb06aff, propDensity: 0.75, fogNear: 6, fogFar: 22 },
  fortaleza: { bg: 0x1a1610, ground: 0x3a3228, hemiSky: 0xd0b890, sunColor: 0xffe0b0, props: "fortress", particles: "float", particleColor: 0xe8c888, propDensity: 1.15, fogNear: 12, fogFar: 36 },
  vulcao: { bg: 0x1a0804, ground: 0x2a140c, hemiSky: 0xff8050, sunColor: 0xff9040, props: "volcano", particles: "embers", particleColor: 0xff6020, propDensity: 0.95, fogNear: 6, fogFar: 22 },
  catacumbas: { bg: 0x0c0e12, ground: 0x1c1e24, hemiSky: 0x8890a0, props: "tomb", particles: "float", particleColor: 0xc0c8d8, propDensity: 0.8, fogNear: 4, fogFar: 16 },
  nevoa: { bg: 0x1a1e28, ground: 0x2a3040, hemiSky: 0xb0c0d8, props: "mist", particles: "snow", particleColor: 0xe0ecff, propDensity: 0.65, fogNear: 3, fogFar: 14 },
  reliquias: { bg: 0x1a1408, ground: 0x2a2410, hemiSky: 0xe8d080, sunColor: 0xffe8a0, props: "relic", particles: "embers", particleColor: 0xfff0b0, propDensity: 1.0, fogNear: 8, fogFar: 26 },
  trono: { bg: 0x18120a, ground: 0x2e2418, hemiSky: 0xe0c070, sunColor: 0xffd070, props: "throne", particles: "float", particleColor: 0xffe090, propDensity: 0.9, fogNear: 10, fogFar: 30 },
  prova_divina: {
    bg: 0x120818,
    ground: 0x1a1228,
    hemiSky: 0xc0a0e8,
    sunColor: 0xe8d0ff,
    props: "throne",
    particles: "embers",
    particleColor: 0xd8b0ff,
    propDensity: 0.75,
    fogNear: 7,
    fogFar: 26,
  },
  eter: { bg: 0x061018, ground: 0x0e1c28, hemiSky: 0x80c0e8, sunColor: 0xa0d8ff, props: "ether", particles: "rise", particleColor: 0xc0e8ff, propDensity: 0.85, fogNear: 8, fogFar: 28 },
  firmamento: { bg: 0x081428, ground: 0x102038, hemiSky: 0xa0c0ff, sunColor: 0xffe8c0, props: "firmament", particles: "float", particleColor: 0xfff0d0, propDensity: 0.7, fogNear: 10, fogFar: 32 },
  nexus: { bg: 0x0a0618, ground: 0x140c28, hemiSky: 0xc080ff, sunColor: 0xe0a0ff, props: "nexus", particles: "rise", particleColor: 0xf0c0ff, propDensity: 1.05, fogNear: 7, fogFar: 24 },
};

export function getZoneScenePreset(zoneId: string): ZoneScene {
  return { ...(ZONE_SCENE_PRESETS[zoneId] || ZONE_SCENE_PRESETS.idle) };
}
