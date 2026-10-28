/**
 * Catálogo canônico das 20 regiões (5×4 capítulos) + aliases de IDs legados.
 * Fonte: docs/capitulos/03_REGIOES_E_CENARIOS.md + CHAPTER_CATALOG.
 */
import type { ChapterId } from "./chapters";

export type ChapterZoneDef = {
  id: string;
  chapterId: ChapterId;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  tier: number;
  bossName: string;
  sceneProfileId: string;
  monsters: { name: string; level: number }[];
  bossWaveSize?: number;
  /** Trial / ritual — não filtra só por capítulo na UI de caça normal. */
  trial?: boolean;
  mortalOnly?: boolean;
  requiresAscension?: string | null;
  sucoDrop?: boolean;
  bossHpMult?: number;
  bossAtkMult?: number;
  bossDropMult?: number;
  refineDropChance?: number;
};

/** IDs antigos de BASE_ZONES → id canônico da região. */
export const ZONE_ID_ALIASES: Record<string, string> = {
  floresta: "bosque_sussurros",
  pantano: "pantano_sombras",
  jardim: "floresta_amaldicoada",
  gelo: "bosque_sussurros",
  cemiterio: "cemiterio_esquecido",
  hidra: "criptas_profanadas",
  catacumbas: "catacumbas_eternas",
  reliquias: "necropole_reis",
  trono: "trono_almas",
  vulcao: "campos_cinzas",
  abismo: "abismo_esquecido",
  fortaleza: "fortaleza_condenados",
  nevoa: "ruinas_orbitais",
  eter: "cemiterio_estrelas",
  firmamento: "horizonte_eventos",
  nexus: "singularidade",
};

export function resolveZoneId(zoneId: string | null | undefined): string | null {
  if (zoneId == null || zoneId === "") return null;
  const id = String(zoneId);
  return ZONE_ID_ALIASES[id] || id;
}

export const CHAPTER_CAMPAIGN_ZONES: ChapterZoneDef[] = [
  // —— Cap. I — Floresta ——
  {
    id: "bosque_sussurros",
    chapterId: "I",
    name: "Bosque dos Sussurros",
    description: "Clareiras claras e folhas sussurrantes — o início da jornada na Floresta Esquecida.",
    minLevel: 1,
    maxLevel: 100,
    tier: 1,
    bossName: "Guardião da Clareira",
    sceneProfileId: "forest_clearing",
    monsters: [
      { name: "Esqueleto Errante", level: 1 },
      { name: "Saqueador Ósseo", level: 4 },
    ],
  },
  {
    id: "pantano_sombras",
    chapterId: "I",
    name: "Pântano das Sombras",
    description: "Água rasa, cipós e névoa verde — o lodo esconde mais do que afogados.",
    minLevel: 101,
    maxLevel: 200,
    tier: 2,
    bossName: "Senhora do Lodo",
    sceneProfileId: "forest_swamp",
    monsters: [
      { name: "Afogado do Pântano", level: 101 },
      { name: "Bruxo Lodoso", level: 110 },
    ],
  },
  {
    id: "floresta_amaldicoada",
    chapterId: "I",
    name: "Floresta Amaldiçoada",
    description: "Vegetação hostil e espinhos — a floresta se volta contra os vivos.",
    minLevel: 201,
    maxLevel: 300,
    tier: 3,
    bossName: "Árvore Voraz",
    sceneProfileId: "forest_cursed",
    monsters: [
      { name: "Espectro Musgoso", level: 201 },
      { name: "Guardião Espinhoso", level: 215 },
    ],
  },
  {
    id: "ruinas_druidas",
    chapterId: "I",
    name: "Ruínas dos Druidas",
    description: "Colunas antigas engolidas pela vegetação — ecos de um culto esquecido.",
    minLevel: 301,
    maxLevel: 400,
    tier: 4,
    bossName: "Arquidruida Caído",
    sceneProfileId: "forest_ruins",
    monsters: [
      { name: "Sentinela de Pedra", level: 301 },
      { name: "Druida Espectral", level: 320 },
    ],
  },
  {
    id: "coracao_floresta",
    chapterId: "I",
    name: "Coração da Floresta",
    description: "Árvores monumentais e altar ancestral — o fim do Capítulo I.",
    minLevel: 401,
    maxLevel: 500,
    tier: 5,
    bossName: "Guardião Ancestral",
    sceneProfileId: "forest_heart",
    bossWaveSize: 10,
    monsters: [
      { name: "Raiz Viva", level: 401 },
      { name: "Arauto Esmeralda", level: 420 },
    ],
  },
  // —— Cap. II — Cemitério ——
  {
    id: "cemiterio_esquecido",
    chapterId: "II",
    name: "Cemitério Esquecido",
    description: "Lápides cobertas de musgo e névoa rasteira entre as cruzes.",
    minLevel: 1,
    maxLevel: 100,
    tier: 1,
    bossName: "Senhor das Tumbas",
    sceneProfileId: "grave_mist",
    monsters: [
      { name: "Guerreiro Ósseo", level: 1 },
      { name: "Necromante Aprendiz", level: 8 },
    ],
  },
  {
    id: "criptas_profanadas",
    chapterId: "II",
    name: "Criptas Profanadas",
    description: "Criptas abertas e velas apagadas — o silêncio foi quebrado.",
    minLevel: 101,
    maxLevel: 200,
    tier: 2,
    bossName: "Padre Profano",
    sceneProfileId: "crypt_deep",
    monsters: [
      { name: "Campeão Flamejante", level: 101 },
      { name: "Arquimago Cinzento", level: 115 },
    ],
  },
  {
    id: "catacumbas_eternas",
    chapterId: "II",
    name: "Catacumbas Eternas",
    description: "Ossuários sem fim sob a cidade dos mortos.",
    minLevel: 201,
    maxLevel: 300,
    tier: 3,
    bossName: "Arquivista Morto",
    sceneProfileId: "tomb_ossuary",
    monsters: [
      { name: "Devorador de Almas", level: 201 },
      { name: "Sacerdote Cadavérico", level: 220 },
    ],
  },
  {
    id: "necropole_reis",
    chapterId: "II",
    name: "Necrópole dos Reis",
    description: "Mausoléus reais e portões de ferro enferrujado.",
    minLevel: 301,
    maxLevel: 400,
    tier: 4,
    bossName: "Curador Eterno",
    sceneProfileId: "grave_necropolis",
    monsters: [
      { name: "Golem de Runas", level: 301 },
      { name: "Lacaio Arcano", level: 320 },
    ],
  },
  {
    id: "trono_almas",
    chapterId: "II",
    name: "Trono das Almas",
    description: "Arena funerária do Rei dos Mortos — o fim do Capítulo II.",
    minLevel: 401,
    maxLevel: 500,
    tier: 5,
    bossName: "Rei dos Mortos",
    sceneProfileId: "grave_throne",
    bossWaveSize: 10,
    monsters: [
      { name: "Cavaleiro do Trono", level: 401 },
      { name: "Algoz Imperial", level: 430 },
    ],
  },
  // —— Cap. III — Chamas ——
  {
    id: "campos_cinzas",
    chapterId: "III",
    name: "Campos de Cinzas",
    description: "Planícies cinzentas sob chuva de brasas.",
    minLevel: 1,
    maxLevel: 100,
    tier: 1,
    bossName: "Arauto das Cinzas",
    sceneProfileId: "volcano_ash",
    monsters: [
      { name: "Elemental de Cinzas", level: 1 },
      { name: "Golem Magmático", level: 10 },
    ],
  },
  {
    id: "rios_magma",
    chapterId: "III",
    name: "Rios de Magma",
    description: "Canais de lava e pedras crepitantes.",
    minLevel: 101,
    maxLevel: 200,
    tier: 2,
    bossName: "Serpente de Magma",
    sceneProfileId: "volcano_magma",
    monsters: [
      { name: "Serpente de Brasas", level: 101 },
      { name: "Salamandra Rubra", level: 120 },
    ],
  },
  {
    id: "fornalhas_malditas",
    chapterId: "III",
    name: "Fornalhas Malditas",
    description: "Fornos infernais e bigornas amaldiçoadas.",
    minLevel: 201,
    maxLevel: 300,
    tier: 3,
    bossName: "Ferreiro Condenado",
    sceneProfileId: "volcano_forge",
    monsters: [
      { name: "Ferreiro Espectral", level: 201 },
      { name: "Golem de Escória", level: 220 },
    ],
  },
  {
    id: "fortaleza_condenados",
    chapterId: "III",
    name: "Fortaleza dos Condenados",
    description: "Muralhas negras sob fogo eterno.",
    minLevel: 301,
    maxLevel: 400,
    tier: 4,
    bossName: "Sentinela Ígnea",
    sceneProfileId: "volcano_fortress",
    monsters: [
      { name: "Sentinela da Muralha", level: 301 },
      { name: "Arqueiro Espectral", level: 320 },
    ],
  },
  {
    id: "trono_chama",
    chapterId: "III",
    name: "Trono da Chama Eterna",
    description: "O coração do Inferno Primordial — chefe final do Capítulo III.",
    minLevel: 401,
    maxLevel: 500,
    tier: 5,
    bossName: "Soberano Ígneo",
    sceneProfileId: "volcano_throne",
    bossWaveSize: 10,
    monsters: [
      { name: "Elemental Primordial", level: 401 },
      { name: "Arauto das Brasas", level: 430 },
    ],
  },
  // —— Cap. IV — Vazio ——
  {
    id: "ruinas_orbitais",
    chapterId: "IV",
    name: "Ruínas Orbitais",
    description: "Fragmentos de estações à deriva no vazio.",
    minLevel: 1,
    maxLevel: 100,
    tier: 1,
    bossName: "Eco Orbital",
    sceneProfileId: "void_ruins",
    monsters: [
      { name: "Sombra Errante", level: 1 },
      { name: "Caçador Nebuloso", level: 12 },
    ],
  },
  {
    id: "abismo_esquecido",
    chapterId: "IV",
    name: "Abismo Esquecido",
    description: "Profundezas púrpuras onde a luz se dobra.",
    minLevel: 101,
    maxLevel: 200,
    tier: 2,
    bossName: "Sombra do Vazio",
    sceneProfileId: "void_abyss",
    monsters: [
      { name: "Cavaleiro do Abismo", level: 101 },
      { name: "Lich Abissal", level: 120 },
    ],
  },
  {
    id: "cemiterio_estrelas",
    chapterId: "IV",
    name: "Cemitério das Estrelas",
    description: "Astros mortos e túmulos de luz fria.",
    minLevel: 201,
    maxLevel: 300,
    tier: 3,
    bossName: "Arauto Estelar",
    sceneProfileId: "void_stars",
    monsters: [
      { name: "Serafim Caído", level: 201 },
      { name: "Sentinela Astral", level: 230 },
    ],
  },
  {
    id: "horizonte_eventos",
    chapterId: "IV",
    name: "Horizonte de Eventos",
    description: "O limiar de onde nada retorna.",
    minLevel: 301,
    maxLevel: 400,
    tier: 4,
    bossName: "Guardião do Horizonte",
    sceneProfileId: "void_horizon",
    monsters: [
      { name: "Cometa Vivo", level: 301 },
      { name: "Guardião da Aurora", level: 340 },
    ],
  },
  {
    id: "singularidade",
    chapterId: "IV",
    name: "A Singularidade",
    description: "O núcleo do Abismo do Vazio — confronto final da temporada.",
    minLevel: 401,
    maxLevel: 500,
    tier: 5,
    bossName: "O Último Eco",
    sceneProfileId: "void_singularity",
    bossWaveSize: 12,
    monsters: [
      { name: "Fragmento do Infinito", level: 401 },
      { name: "Eco do Criador", level: 450 },
    ],
  },
];

/** Trials / rituais Suco Divino — fora das 20 regiões de campanha. */
export const CHAPTER_TRIAL_ZONES: ChapterZoneDef[] = [
  {
    id: "prova_divina",
    chapterId: "I",
    name: "Prova Divina",
    description:
      "MEGA BOSS mortal no limiar da ascensão. Só Mortais Lv.500+ — chance de Suco Divino.",
    minLevel: 500,
    maxLevel: 500,
    tier: 13,
    trial: true,
    mortalOnly: true,
    sucoDrop: true,
    bossWaveSize: 12,
    bossHpMult: 2.2,
    bossAtkMult: 1.35,
    bossDropMult: 1.2,
    refineDropChance: 0,
    bossName: "Guardião da Divindade",
    sceneProfileId: "trial_prova_divina",
    monsters: [
      { name: "Sentinela do Limiar", level: 500 },
      { name: "Arauto do Julgamento", level: 505 },
    ],
  },
  {
    id: "julgamento_almas",
    chapterId: "II",
    name: "Julgamento das Almas",
    description:
      "MEGA BOSS Celestial — Suco Divino para a Classificação Divina (Cap. III).",
    minLevel: 500,
    maxLevel: 500,
    tier: 14,
    trial: true,
    requiresAscension: "CELESTIAL",
    sucoDrop: true,
    bossWaveSize: 12,
    bossHpMult: 2.2,
    bossAtkMult: 1.35,
    bossDropMult: 1.2,
    refineDropChance: 0,
    bossName: "Rei dos Mortos",
    sceneProfileId: "trial_julgamento",
    monsters: [
      { name: "Juiz das Cinzas", level: 500 },
      { name: "Carrasco Espectral", level: 510 },
    ],
  },
  {
    id: "coracao_chama",
    chapterId: "III",
    name: "Coração da Chama",
    description:
      "MEGA BOSS Divino — Suco Divino para o Ritual do Semideus (Cap. IV).",
    minLevel: 500,
    maxLevel: 500,
    tier: 15,
    trial: true,
    requiresAscension: "DIVINO",
    sucoDrop: true,
    bossWaveSize: 12,
    bossHpMult: 2.3,
    bossAtkMult: 1.4,
    bossDropMult: 1.25,
    refineDropChance: 0,
    bossName: "Soberano Ígneo",
    sceneProfileId: "trial_coracao",
    monsters: [
      { name: "Elemental Primordial", level: 500 },
      { name: "Arauto das Brasas", level: 515 },
    ],
  },
];

export const ALL_CHAPTER_ZONES: ChapterZoneDef[] = [
  ...CHAPTER_CAMPAIGN_ZONES,
  ...CHAPTER_TRIAL_ZONES,
];
