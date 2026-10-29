/** Salões ilustrados e identidade visual das quatro classes. */

export const CLASS_HALLS = {
  GUERREIRO: {
    slug: "warrior",
    accent: "#d6a447",
    glow: "rgba(214, 164, 71, 0.5)",
    crest: "/jogo-idle/assets/classes/guerreiro.png",
    particle: "embers",
    backdrop: "center 68%",
    light: { hemi: 0xffe2b0, ground: 0x4a2a18, sun: 0xffc56a, fill: 0xff9a4a, rim: 0x9eb6c8, point: 0xffb45a },
  },
  BARBARO: {
    slug: "barbarian",
    accent: "#c65b3e",
    glow: "rgba(198, 91, 62, 0.5)",
    crest: "/jogo-idle/assets/classes/barbaro.png",
    particle: "sparks",
    backdrop: "center 68%",
    light: { hemi: 0xffc8a0, ground: 0x4a1814, sun: 0xff8a4a, fill: 0xe85a32, rim: 0x8aa0b4, point: 0xff6a32 },
  },
  MAGO: {
    slug: "mage",
    accent: "#9b6be8",
    glow: "rgba(155, 107, 232, 0.5)",
    crest: "/jogo-idle/assets/classes/mago.png",
    particle: "magic",
    backdrop: "center 68%",
    light: { hemi: 0xd8c8ff, ground: 0x241848, sun: 0xc9a0ff, fill: 0x7a5cff, rim: 0x8eb0d8, point: 0xb48cff },
  },
  ARQUEIRO: {
    slug: "archer",
    accent: "#5eaa75",
    glow: "rgba(94, 170, 117, 0.48)",
    crest: "/jogo-idle/assets/classes/arqueiro.png",
    particle: "leaves",
    backdrop: "center 68%",
    light: { hemi: 0xd8ecc0, ground: 0x1c3424, sun: 0xffe0a0, fill: 0x6aaa62, rim: 0xa8c8b0, point: 0xc6e090 },
  },
};

const ALIAS = {
  WARRIOR: "GUERREIRO",
  BARBARIAN: "BARBARO",
  MAGE: "MAGO",
  ARCHER: "ARQUEIRO",
};

export function normalizeClassId(raw) {
  const id = String(raw || "").trim().toUpperCase();
  if (CLASS_HALLS[id]) return id;
  return CLASS_HALLS[ALIAS[id]] ? ALIAS[id] : "GUERREIRO";
}

export function hallProfile(classId) {
  return CLASS_HALLS[normalizeClassId(classId)];
}

export function hallImageCandidates(classId) {
  const slug = hallProfile(classId).slug;
  return [
    `/jogo-idle/assets/halls/${slug}.webp`,
    `/jogo-idle/assets/halls/${slug}.png`,
  ];
}
