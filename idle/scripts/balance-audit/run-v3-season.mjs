#!/usr/bin/env node
/**
 * Progressão 3.0 — simulação analítica de temporada 120 dias.
 * Escreve SOMENTE em docs/balanceamento/data/v3_*.
 * Não altera motor, catálogo ou saves.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const DATA = path.join(ROOT, "docs/balanceamento/data");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

function writeJson(name, obj) {
  const p = path.join(DATA, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  console.log("wrote", path.relative(ROOT, p));
}

function writeCsv(name, headers, rows) {
  const p = path.join(DATA, name);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  fs.writeFileSync(p, lines.join("\n") + "\n");
  console.log("wrote", path.relative(ROOT, p));
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Eficiência offline com bandas. */
function offlineRewardedHours(elapsedH, bands, capH) {
  const capped = Math.min(elapsedH, capH);
  let remaining = capped;
  let rewarded = 0;
  const sorted = [...bands].sort((a, b) => a.hoursFrom - b.hoursFrom);
  for (const b of sorted) {
    if (remaining <= 0) break;
    const bandSpan = Math.max(0, Math.min(b.hoursTo, capH) - b.hoursFrom);
    if (bandSpan <= 0) continue;
    const used = Math.min(remaining, bandSpan);
    // só conta se elapsed cobriu o início da banda
    const start = b.hoursFrom;
    if (capped <= start) continue;
    const avail = Math.min(used, capped - start);
    rewarded += avail * b.efficiency;
    remaining -= avail;
  }
  return Math.round(rewarded * 1000) / 1000;
}

function fmtPower(n) {
  if (n >= 1e15) return `${(n / 1e15).toFixed(2)} qua`;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} tri`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} bi`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} mi`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} mil`;
  return String(Math.round(n));
}

// ── Cenários ──────────────────────────────────────────────────────────
const A = readJson("scenario_A_params.json");
const B = readJson("scenario_B_params.json");
const C = readJson("scenario_C_params.json");
const D = readJson("scenario_D_params.json");
const v2 = fs.readFileSync(path.join(DATA, "v2_cenarios.csv"), "utf8").trim().split("\n");
const v2Header = v2[0].split(",");
const v2Rows = Object.fromEntries(
  v2.slice(1).map((line) => {
    const cols = line.split(",");
    const o = {};
    v2Header.forEach((h, i) => (o[h] = cols[i]));
    return [o.scenario, o];
  }),
);

const cenarios = [
  {
    scenario: "A",
    label: A.label,
    kind: "atual",
    totalXpTo500: Number(v2Rows.A.totalXpTo500),
    guerreiro_opt_h_to_500: Number(v2Rows.A.guerreiro_opt_p50_h),
    guerreiro_casual_h_to_500: Number(v2Rows.A.guerreiro_casual_p50_h),
    celestial_guerreiro_h_to_700: 7,
    season_days: null,
    regions: 17,
    offline_cap_h: 2,
    offline_efficiency: "flat_100pct",
    post_700: "none",
    mastery_ranks: 0,
    dominion_stars: 0,
    notes: "Motor atual. Rush mortal.",
  },
  {
    scenario: "B",
    label: B.label,
    kind: "prog_2_0",
    totalXpTo500: Number(v2Rows.B.totalXpTo500),
    guerreiro_opt_h_to_500: Number(v2Rows.B.guerreiro_opt_p50_h),
    guerreiro_casual_h_to_500: Number(v2Rows.B.guerreiro_casual_p50_h),
    celestial_guerreiro_h_to_700: 19,
    season_days: null,
    regions: 17,
    offline_cap_h: 2,
    offline_efficiency: "flat_100pct",
    post_700: "none_proposed_cel_tier1_gap",
    mastery_ranks: 0,
    dominion_stars: 0,
    notes: "Prog 2.0. Cap.I da temporada C.",
  },
  {
    scenario: "C",
    label: C.label,
    kind: "prog_3_0_season",
    totalXpTo500: Number(v2Rows.B.totalXpTo500),
    guerreiro_opt_h_to_500: Number(v2Rows.B.guerreiro_opt_p50_h),
    guerreiro_casual_h_to_500: Number(v2Rows.B.guerreiro_casual_p50_h),
    celestial_guerreiro_h_to_700: 45,
    season_days: 120,
    regions: 32,
    offline_cap_h: 8,
    offline_efficiency: "bands_100_70_40",
    post_700: "maestria_mais_dominio",
    mastery_ranks: 40,
    dominion_stars: 5,
    notes: "B no Cap.I + Cap.II–IV. Celestial hours include content gates (not raw XP only).",
  },
  {
    scenario: "D",
    label: D.label,
    kind: "prog_3_0_competitive",
    totalXpTo500: Number(v2Rows.B.totalXpTo500),
    guerreiro_opt_h_to_500: Number(v2Rows.B.guerreiro_opt_p50_h),
    guerreiro_casual_h_to_500: Number(v2Rows.B.guerreiro_casual_p50_h),
    celestial_guerreiro_h_to_700: 55,
    season_days: 120,
    regions: 32,
    offline_cap_h: 8,
    offline_efficiency: "bands_100_70_40",
    post_700: "maestria_mais_dominio_dense",
    mastery_ranks: 60,
    dominion_stars: 7,
    notes: "C + endgame competitivo mais denso.",
  },
];

writeJson("v3_cenarios.json", {
  generatedAt: new Date().toISOString(),
  disclaimer: "Proposta Progressão 3.0 — simulação analítica. Não altera produção.",
  scenarios: cenarios,
  params: { A, B, C, D },
});

writeCsv(
  "v3_cenarios.csv",
  [
    "scenario",
    "label",
    "kind",
    "totalXpTo500",
    "guerreiro_opt_h_to_500",
    "guerreiro_casual_h_to_500",
    "celestial_guerreiro_h_to_700",
    "season_days",
    "regions",
    "offline_cap_h",
    "offline_efficiency",
    "post_700",
    "mastery_ranks",
    "dominion_stars",
    "notes",
  ],
  cenarios,
);

// ── Poder ─────────────────────────────────────────────────────────────
const powerScale = {
  disclaimer: "Faixas propostas de DPS/HP efetivos por capítulo. Regra atual ≈ milhares–centenas de mil (Cap.I early).",
  numberLimits: {
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    safeCombatCeiling: 1e15,
    note: "Manter Number até ~1e15. Escape (magnitude layer / string decimal) só se cruzar MAX_SAFE_INTEGER.",
  },
  displayPtBr: [
    { threshold: 1e3, suffix: "mil" },
    { threshold: 1e6, suffix: "mi" },
    { threshold: 1e9, suffix: "bi" },
    { threshold: 1e12, suffix: "tri" },
    { threshold: 1e15, suffix: "qua" },
  ],
  chapters: [
    {
      id: 1,
      name: "Era Mortal",
      playerDps: { min: 1e3, max: 5e5 },
      mobHp: { min: 3e2, max: 8e4 },
      bossHp: { min: 6e2, max: 8e4 },
      ttkTrashSec: { min: 2, max: 8 },
      mechanisms: ["resist_elemental_leve", "refine_gates", "boss_prep"],
    },
    {
      id: 2,
      name: "Despertar Celestial",
      playerDps: { min: 5e5, max: 5e8 },
      mobHp: { min: 1e5, max: 2e8 },
      bossHp: { min: 5e5, max: 1e9 },
      ttkTrashSec: { min: 3, max: 12 },
      mechanisms: ["resist_build", "zone_modifiers", "divine_gear"],
    },
    {
      id: 3,
      name: "Ruptura dos Reinos",
      playerDps: { min: 5e8, max: 5e11 },
      mobHp: { min: 1e8, max: 2e11 },
      bossHp: { min: 1e9, max: 1e12 },
      ttkTrashSec: { min: 4, max: 15 },
      mechanisms: ["mastery_nodes", "dimension_affixes", "survival_pressure"],
    },
    {
      id: 4,
      name: "Trono dos Deuses Antigos",
      playerDps: { min: 5e11, max: 5e14 },
      mobHp: { min: 1e11, max: 2e14 },
      bossHp: { min: 1e12, max: 1e15 },
      ttkTrashSec: { min: 5, max: 20 },
      mechanisms: ["dominion_stars", "legendary_boss_phases", "artifact_evo"],
    },
  ].map((c) => ({
    ...c,
    playerDpsLabel: `${fmtPower(c.playerDps.min)} – ${fmtPower(c.playerDps.max)}`,
    mobHpLabel: `${fmtPower(c.mobHp.min)} – ${fmtPower(c.mobHp.max)}`,
    bossHpLabel: `${fmtPower(c.bossHp.min)} – ${fmtPower(c.bossHp.max)}`,
  })),
  competitiveD: {
    chapter4_dps_max: 9e14,
    note: "Cenário D empurra teto Cap.IV sem cruzar MAX_SAFE_INTEGER (~9e15).",
  },
};
writeJson("v3_poder_escala.json", powerScale);

// ── Offline ───────────────────────────────────────────────────────────
const bandsC = C.offline.efficiencyBands;
const alts = [
  { id: "atual_2h", capH: 2, bands: [{ hoursFrom: 0, hoursTo: 2, efficiency: 1 }], ticks: 5000 },
  { id: "flat_8h", capH: 8, bands: [{ hoursFrom: 0, hoursTo: 8, efficiency: 1 }], ticks: 12000 },
  { id: "proposta_C_8h_decay", capH: 8, bands: bandsC, ticks: 12000 },
  { id: "flat_12h", capH: 12, bands: [{ hoursFrom: 0, hoursTo: 12, efficiency: 1 }], ticks: 18000 },
  {
    id: "decay_12h",
    capH: 12,
    bands: [
      { hoursFrom: 0, hoursTo: 2, efficiency: 1 },
      { hoursFrom: 2, hoursTo: 6, efficiency: 0.65 },
      { hoursFrom: 6, hoursTo: 12, efficiency: 0.35 },
    ],
    ticks: 18000,
  },
  { id: "flat_24h", capH: 24, bands: [{ hoursFrom: 0, hoursTo: 24, efficiency: 1 }], ticks: 36000 },
  {
    id: "decay_24h",
    capH: 24,
    bands: [
      { hoursFrom: 0, hoursTo: 2, efficiency: 1 },
      { hoursFrom: 2, hoursTo: 8, efficiency: 0.6 },
      { hoursFrom: 8, hoursTo: 16, efficiency: 0.35 },
      { hoursFrom: 16, hoursTo: 24, efficiency: 0.2 },
    ],
    ticks: 36000,
  },
];

const wallSamples = [2, 4, 8, 12, 16, 24];
const offlineAlts = {
  disclaimer: "Proposta. Motor atual: maxCatchUpMs=2h, maxTicks=5000.",
  currentMotor: { maxCatchUpHours: 2, maxTicks: 5000 },
  recommended: "proposta_C_8h_decay",
  alternatives: alts.map((a) => ({
    ...a,
    samples: wallSamples.map((w) => ({
      wallHours: w,
      rewardedHours: offlineRewardedHours(w, a.bands, a.capH),
      ratioVsWall: Math.round((offlineRewardedHours(w, a.bands, a.capH) / w) * 1000) / 1000,
    })),
  })),
  impactNotes: {
    "atual_2h": "Casual dorme 8h → só 2h recompensadas; favorece sync frequente.",
    "proposta_C_8h_decay": "Casual captura ~4.3h de 8h wall; competitivo ainda ganha por otimização online.",
    "flat_24h": "Quase remove diferencial online; risco de temporada 'dormindo'.",
    "decay_24h": "Permite recuperação sem igualar ativo; bom fallback se 8h for curto.",
  },
};
writeJson("v3_offline_alternativas.json", offlineAlts);

// ── Regiões (32) ──────────────────────────────────────────────────────
const regions = [
  // Mortais existentes (14) — prova_divina contada como mortal gate
  { id: "floresta", name: "Floresta Inicial", chapter: 1, layer: "mortal", status: "existente", minLevel: 1, unlock: "L1", powerRec: 1e3, mobHp: 305, mobAtk: 36, monsters: "lobo,slime", boss: "Guardião da Clareira", mechanic: "tutorial", rewards: "gear_t1", materials: "fibra", gear: "t1", hoursEst: 1.5, biome: "floresta" },
  { id: "cemiterio", name: "Cemitério", chapter: 1, layer: "mortal", status: "existente", minLevel: 10, unlock: "L10", powerRec: 5e3, mobHp: 615, mobAtk: 64, monsters: "esqueleto,zumbi", boss: "Senhor das Tumbas", mechanic: "undead_resist_leve", rewards: "gear_t1", materials: "osso", gear: "t1", hoursEst: 2, biome: "cemiterio" },
  { id: "jardim", name: "Jardim Sombrio", chapter: 1, layer: "mortal", status: "existente", minLevel: 25, unlock: "L25", powerRec: 1.2e4, mobHp: 1115, mobAtk: 111, monsters: "treant,espinho", boss: "Rosa Negra", mechanic: "dot_poison_prep", rewards: "gear_t2", materials: "petala", gear: "t2", hoursEst: 2.5, biome: "jardim" },
  { id: "pantano", name: "Pântano Venenoso", chapter: 1, layer: "mortal", status: "existente", minLevel: 35, unlock: "L35", powerRec: 2e4, mobHp: 1425, mobAtk: 141, monsters: "serpente,miasma", boss: "Hidra do Lodo", mechanic: "poison_resist", rewards: "gear_t2", materials: "veneno", gear: "t2", hoursEst: 2.5, biome: "pantano" },
  { id: "hidra", name: "Cripta Ardente", chapter: 1, layer: "mortal", status: "existente", minLevel: 50, unlock: "L50", powerRec: 4e4, mobHp: 1940, mobAtk: 189, monsters: "imp,salamandra", boss: "Hidra de Fogo", mechanic: "fire_resist", rewards: "gear_t2", materials: "cinza", gear: "t2", hoursEst: 3, biome: "fogo" },
  { id: "gelo", name: "Picos Gelados", chapter: 1, layer: "mortal", status: "existente", minLevel: 70, unlock: "L70", powerRec: 8e4, mobHp: 2560, mobAtk: 247, monsters: "yeti,gelo", boss: "Colosso de Gelo", mechanic: "slow_atk_interval", rewards: "gear_t3", materials: "cristal_gelo", gear: "t3", hoursEst: 3, biome: "gelo" },
  { id: "abismo", name: "Cidadela Abissal", chapter: 1, layer: "mortal", status: "existente", minLevel: 90, unlock: "L90", powerRec: 1.2e5, mobHp: 3215, mobAtk: 310, monsters: "demonio,sombra", boss: "Lorde Abissal", mechanic: "dark_resist", rewards: "gear_t3", materials: "essencia_sombra", gear: "t3", hoursEst: 3.5, biome: "abismo" },
  { id: "fortaleza", name: "Fortaleza Esquecida", chapter: 1, layer: "mortal", status: "existente", minLevel: 120, unlock: "L120", powerRec: 2e5, mobHp: 4180, mobAtk: 400, monsters: "golems,guardiões", boss: "Sentinela de Pedra", mechanic: "high_def", rewards: "gear_t3", materials: "pedra_rúnica", gear: "t3", hoursEst: 4, biome: "fortaleza" },
  { id: "vulcao", name: "Vulcão Rubro", chapter: 1, layer: "mortal", status: "existente", minLevel: 180, unlock: "L180", powerRec: 3e5, mobHp: 6135, mobAtk: 585, monsters: "magma,drake", boss: "Tirano Magmático", mechanic: "burn_aura", rewards: "gear_t4", materials: "obsidiana", gear: "t4", hoursEst: 4, biome: "vulcao" },
  { id: "catacumbas", name: "Catacumbas Profundas", chapter: 1, layer: "mortal", status: "existente", minLevel: 250, unlock: "L250", powerRec: 4e5, mobHp: 8400, mobAtk: 799, monsters: "lichling,wraith", boss: "Arquivista Morto", mechanic: "mana_drain_prep", rewards: "gear_t4", materials: "pó_ancestral", gear: "t4", hoursEst: 4.5, biome: "catacumbas" },
  { id: "nevoa", name: "Névoa Eterna", chapter: 1, layer: "mortal", status: "existente", minLevel: 320, unlock: "L320", powerRec: 4.5e5, mobHp: 10635, mobAtk: 1010, monsters: "espectros,neblina", boss: "Senhora da Névoa", mechanic: "accuracy_penalty", rewards: "gear_t4", materials: "fio_nevoa", gear: "t4", hoursEst: 4.5, biome: "nevoa" },
  { id: "reliquias", name: "Câmara das Relíquias", chapter: 1, layer: "mortal", status: "existente", minLevel: 400, unlock: "L400", powerRec: 4.8e5, mobHp: 13185, mobAtk: 1250, monsters: "guardião_reliquia", boss: "Curador Eterno", mechanic: "set_piece_drops", rewards: "gear_t4_set", materials: "fragmento_reliquia", gear: "t4", hoursEst: 5, biome: "reliquias" },
  { id: "trono", name: "Trono Mortal", chapter: 1, layer: "mortal", status: "existente", minLevel: 450, unlock: "L450", powerRec: 5e5, mobHp: 14865, mobAtk: 1409, monsters: "elite_corte", boss: "Rei Mortal", mechanic: "boss_wave_10", rewards: "pre_ritual", materials: "selo_mortal", gear: "t4", hoursEst: 5, biome: "trono" },
  { id: "prova_divina", name: "Prova Divina", chapter: 1, layer: "mortal_gate", status: "existente", minLevel: 500, unlock: "L500_mortalOnly", powerRec: 5e5, mobHp: 16300, mobAtk: 1545, monsters: "provas", boss: "Juiz Divino", mechanic: "suco_celestial_drop", rewards: "suco", materials: "nenhum_refine", gear: "—", hoursEst: 3, biome: "prova" },
  // Celestiais existentes (3) — minLevel proposto ajustado em proposta
  // Celestiais iniciais (6): 5 novas + eter reclassificado (atual minLevel 500 → proposta mid Cap.II)
  { id: "alvorada", name: "Alvorada Celeste", chapter: 2, layer: "celestial_early", status: "proposta", minLevel: 1, unlock: "CELESTIAL+L1", powerRec: 6e5, mobHp: 2e5, mobAtk: 8e3, monsters: "luzentes,corujas_astro", boss: "Arauto da Alvorada", mechanic: "requiresAscension_only", rewards: "gear_cel_t1", materials: "orvalho_astro", gear: "cel_t1", hoursEst: 6, biome: "eter" },
  { id: "jardins_lunares", name: "Jardins Lunares", chapter: 2, layer: "celestial_early", status: "proposta", minLevel: 40, unlock: "CELESTIAL+L40", powerRec: 2e6, mobHp: 8e5, mobAtk: 2e4, monsters: "flor_lua,lobos_prata", boss: "Guardiã Lunar", mechanic: "night_bonus_build", rewards: "gear_cel_t1", materials: "prata_lunar", gear: "cel_t1", hoursEst: 6, biome: "jardim" },
  { id: "arquipelago_nuvens", name: "Arquipélago das Nuvens", chapter: 2, layer: "celestial_early", status: "proposta", minLevel: 80, unlock: "CELESTIAL+L80", powerRec: 5e6, mobHp: 2e6, mobAtk: 4e4, monsters: "harpías,elementais_ar", boss: "Tempestade Encarnada", mechanic: "interval_penalty", rewards: "gear_cel_t2", materials: "vapor_condensado", gear: "cel_t2", hoursEst: 7, biome: "nuvem" },
  { id: "biblioteca_estrelas", name: "Biblioteca das Estrelas", chapter: 2, layer: "celestial_early", status: "proposta", minLevel: 120, unlock: "CELESTIAL+L120", powerRec: 1e7, mobHp: 5e6, mobAtk: 8e4, monsters: "golems_livro,runas", boss: "Bibliotecário Astral", mechanic: "int_favor", rewards: "gear_cel_t2", materials: "página_estelar", gear: "cel_t2", hoursEst: 7, biome: "reliquias" },
  { id: "cascata_aurora", name: "Cascata da Aurora", chapter: 2, layer: "celestial_early", status: "proposta", minLevel: 160, unlock: "CELESTIAL+L160", powerRec: 1.5e7, mobHp: 8e6, mobAtk: 1.2e5, monsters: "náiades,cristais", boss: "Senhora da Aurora", mechanic: "heal_pressure", rewards: "gear_cel_t2", materials: "gota_aurora", gear: "cel_t2", hoursEst: 8, biome: "agua" },
  { id: "eter", name: "Campos do Éter", chapter: 2, layer: "celestial_early", status: "existente_ajuste_proposta", minLevel: 200, unlock: "CELESTIAL+L200_prop", powerRec: 2e7, mobHp: 5e6, mobAtk: 2e5, monsters: "eteriais", boss: "Arauto do Éter", mechanic: "celestial_resist", rewards: "gear_divino", materials: "poeira_eter", gear: "divino_t1", hoursEst: 8, biome: "eter", note: "Atual minLevel=500; proposta Cap.II early/mid" },
  // Celestiais avançadas (5): firmamento + nexus + 3 novas
  { id: "firmamento", name: "Firmamento", chapter: 3, layer: "celestial_adv", status: "existente_ajuste_proposta", minLevel: 400, unlock: "CELESTIAL+L400_prop", powerRec: 5e9, mobHp: 2e9, mobAtk: 5e6, monsters: "serafins", boss: "Guardião do Firmamento", mechanic: "holy_pressure", rewards: "gear_divino_t2", materials: "pluma_celeste", gear: "divino_t2", hoursEst: 10, biome: "firmamento", note: "Atual minLevel=560" },
  { id: "torre_eclipsada", name: "Torre Eclipsada", chapter: 3, layer: "celestial_adv", status: "proposta", minLevel: 450, unlock: "CELESTIAL+L450", powerRec: 2e9, mobHp: 8e8, mobAtk: 2e6, monsters: "eclipsados", boss: "Senhor da Torre", mechanic: "dark_holy_hybrid", rewards: "gear_divino_t2", materials: "fragmento_eclipse", gear: "divino_t2", hoursEst: 10, biome: "torre" },
  { id: "mar_de_constelacoes", name: "Mar de Constelações", chapter: 3, layer: "celestial_adv", status: "proposta", minLevel: 500, unlock: "CELESTIAL+L500", powerRec: 2e10, mobHp: 1e10, mobAtk: 2e7, monsters: "leviatas_astro", boss: "Leviatã Estelar", mechanic: "survival_long_fight", rewards: "maestria_mat", materials: "escama_constelar", gear: "ancestral_t0", hoursEst: 11, biome: "oceano" },
  { id: "nexus", name: "Nexus Celestial", chapter: 3, layer: "celestial_adv", status: "existente_ajuste_proposta", minLevel: 550, unlock: "CELESTIAL+L550_prop", powerRec: 8e10, mobHp: 5e10, mobAtk: 8e7, monsters: "nexianos", boss: "Núcleo do Nexus", mechanic: "phase_shift_prep", rewards: "gear_ancestral_seed", materials: "nucleo_nexus", gear: "ancestral_t0", hoursEst: 12, biome: "nexus", note: "Atual minLevel=620" },
  { id: "cidadela_oraculo", name: "Cidadela do Oráculo", chapter: 3, layer: "celestial_adv", status: "proposta", minLevel: 600, unlock: "CELESTIAL+L600", powerRec: 2e11, mobHp: 8e10, mobAtk: 1e8, monsters: "oraculos,profetas", boss: "Oráculo Cego", mechanic: "build_check_crit", rewards: "maestria_mat", materials: "olho_oraculo", gear: "ancestral_t1", hoursEst: 12, biome: "cidadela" },
  // Dimensões (4)
  { id: "dim_crepusculo", name: "Dimensão do Crepúsculo", chapter: 3, layer: "dimensao", status: "proposta", minLevel: 300, unlock: "CELESTIAL+dominio2", powerRec: 1e9, mobHp: 5e8, mobAtk: 1e6, monsters: "sombras_duplas", boss: "Gêmeos do Crepúsculo", mechanic: "weekly_affix", rewards: "affix_mat", materials: "essencia_crepuscular", gear: "affix_mods", hoursEst: 9, biome: "nevoa" },
  { id: "dim_forja", name: "Dimensão da Forja Eterna", chapter: 3, layer: "dimensao", status: "proposta", minLevel: 350, unlock: "CELESTIAL+dominio2", powerRec: 3e9, mobHp: 1e9, mobAtk: 3e6, monsters: "forjados", boss: "Martelo Ancestral", mechanic: "refine_mat_focus", rewards: "refine_adv", materials: "barra_eterna", gear: "forge_tools", hoursEst: 9, biome: "vulcao" },
  { id: "dim_labirinto", name: "Dimensão do Labirinto Infinito", chapter: 4, layer: "dimensao", status: "proposta", minLevel: 650, unlock: "CELESTIAL+L650+dominio3", powerRec: 1e12, mobHp: 5e11, mobAtk: 5e8, monsters: "minotauros_astro", boss: "Arquiteto do Labirinto", mechanic: "modifier_stack", rewards: "dominio_mat", materials: "fio_de_ariadne", gear: "lab_set", hoursEst: 14, biome: "labirinto" },
  { id: "dim_vazio", name: "Dimensão do Vazio Rutilante", chapter: 4, layer: "dimensao", status: "proposta", minLevel: 680, unlock: "CELESTIAL+L680+dominio4", powerRec: 5e12, mobHp: 2e12, mobAtk: 2e9, monsters: "vazios", boss: "Eco do Vazio", mechanic: "hp_drain_prep", rewards: "artifact_seed", materials: "shard_vazio", gear: "artifact", hoursEst: 15, biome: "vazio" },
  // Endgame (3)
  { id: "trono_antigos", name: "Trono dos Deuses Antigos", chapter: 4, layer: "endgame", status: "proposta", minLevel: 700, unlock: "CELESTIAL+L700+maestria10", powerRec: 5e13, mobHp: 2e13, mobAtk: 1e10, monsters: "heraldos_antigos", boss: "Deus Antigo (fase 1)", mechanic: "multi_phase_prep", rewards: "season_clear_token", materials: "coroa_fragmento", gear: "ancestral_t3", hoursEst: 20, biome: "trono" },
  { id: "coracao_cosmos", name: "Coração do Cosmos", chapter: 4, layer: "endgame", status: "proposta", minLevel: 700, unlock: "clear_trono_antigos", powerRec: 1e14, mobHp: 5e13, mobAtk: 3e10, monsters: "fragmentos_cosmos", boss: "Coração Pulsante", mechanic: "mastery_gate", rewards: "cosmetic_seed", materials: "pulso_cosmico", gear: "ancestral_t4", hoursEst: 18, biome: "cosmos" },
  { id: "salao_eco_eterno", name: "Salão do Eco Eterno", chapter: 4, layer: "endgame", status: "proposta", minLevel: 700, unlock: "clear_coracao", powerRec: 5e14, mobHp: 2e14, mobAtk: 8e10, monsters: "ecos_lendarios", boss: "Eco do Trono Final", mechanic: "leaderboard_ttk", rewards: "fame_record", materials: "eco_eterno", gear: "prestige_display", hoursEst: 25, biome: "salao" },
];

writeCsv(
  "v3_regioes_proposta.csv",
  [
    "id",
    "name",
    "chapter",
    "layer",
    "status",
    "minLevel",
    "unlock",
    "powerRec",
    "mobHp",
    "mobAtk",
    "monsters",
    "boss",
    "mechanic",
    "rewards",
    "materials",
    "gear",
    "hoursEst",
    "biome",
    "note",
  ],
  regions,
);

console.log("regions count", regions.length);

// ── Economia por capítulo ─────────────────────────────────────────────
const economia = [
  { chapter: 1, name: "Era Mortal", gold_in_h_opt: 8e4, gold_in_total_opt: 2.1e6, gold_out_refine: 1.7e7, gold_out_ritual: 1e7, gold_out_other: 2e6, net_note: "Sink refine B-det + ritual; surplus controlado no late Cap.I", sink_primary: "refine_Bdet+ritual" },
  { chapter: 2, name: "Despertar Celestial", gold_in_h_opt: 4e5, gold_in_total_opt: 1.2e7, gold_out_refine: 2.5e7, gold_out_ritual: 0, gold_out_other: 8e6, net_note: "Gear divino + refine cel; sinks de maestria seed", sink_primary: "divine_gear+cel_refine" },
  { chapter: 3, name: "Ruptura dos Reinos", gold_in_h_opt: 8e6, gold_in_total_opt: 2.4e8, gold_out_refine: 1.5e8, gold_out_ritual: 0, gold_out_other: 1.2e8, net_note: "Maestria ranks + domínio + dims", sink_primary: "mastery_nodes+dominion" },
  { chapter: 4, name: "Trono dos Deuses", gold_in_h_opt: 2e8, gold_in_total_opt: 6e9, gold_out_refine: 3e9, gold_out_ritual: 0, gold_out_other: 4e9, net_note: "Artefatos + refine avançado + cosmético craft", sink_primary: "artifacts+adv_refine" },
];
writeCsv(
  "v3_economia_capitulos.csv",
  [
    "chapter",
    "name",
    "gold_in_h_opt",
    "gold_in_total_opt",
    "gold_out_refine",
    "gold_out_ritual",
    "gold_out_other",
    "net_note",
    "sink_primary",
  ],
  economia,
);

// ── Pós-Celestial / Maestria ──────────────────────────────────────────
const masteryRanks = [];
for (let r = 1; r <= 40; r++) {
  const chapter = r <= 10 ? 3 : r <= 25 ? 3 : 4;
  masteryRanks.push({
    rank: r,
    chapterHint: chapter,
    costMat: Math.round(10 * Math.pow(1.18, r - 1)),
    costGold: Math.round(5e5 * Math.pow(1.22, r - 1)),
    bonusAtkPct: +(0.8 + r * 0.35).toFixed(2),
    bonusHpPct: +(0.6 + r * 0.25).toFixed(2),
    unlock: r === 1 ? "celestial_L700_or_nexus_clear" : `maestria_${r - 1}`,
    scenarioC: true,
    scenarioD_extra: r > 40 ? false : r <= 40,
  });
}
// D extends to 60
const masteryD = [];
for (let r = 41; r <= 60; r++) {
  masteryD.push({
    rank: r,
    chapterHint: 4,
    costMat: Math.round(10 * Math.pow(1.18, r - 1)),
    costGold: Math.round(5e5 * Math.pow(1.22, r - 1)),
    bonusAtkPct: +(0.8 + r * 0.35).toFixed(2),
    bonusHpPct: +(0.6 + r * 0.25).toFixed(2),
    unlock: `maestria_${r - 1}`,
    scenarioC: false,
    scenarioD_extra: true,
  });
}

writeJson("v3_pos_celestial.json", {
  disclaimer: "Proposta. Cap de nível permanece 700. Sem soft-reset de poder no ritual.",
  recommendation: "maestria_mais_dominio",
  alternativesCompared: [
    { id: "maestria", fit: "alto", note: "Ranks com custos crescentes; identidade nova pós-700." },
    { id: "constelacoes", fit: "medio", note: "Árvore visual; sobrepõe Maestria — fundir UX se desejado." },
    { id: "despertar_divino", fit: "baixo_medio", note: "Parece segunda ascensão; risco de diluir ritual." },
    { id: "poder_ancestral", fit: "medio", note: "Bom como recurso/artefato, não como única barra." },
    { id: "prestigio_nivel", fit: "baixo", note: "Segunda barra XP — rejeitado pelo briefing." },
    { id: "dominio_regioes", fit: "alto", note: "Estrelas por zona; modifiers; ideal com idle prep." },
  ],
  mastery: {
    scenarioC_ranks: 40,
    scenarioD_ranks: 60,
    ranks: [...masteryRanks, ...masteryD],
  },
  dominion: {
    starsMax_C: 5,
    starsMax_D: 7,
    perStar: {
      mobHpMult: 1.35,
      mobAtkMult: 1.22,
      rewardMult: 1.18,
      masteryMatMult: 1.15,
    },
    note: "Subir estrela exige clear de chefe sob modifier; combate automático — prep via gear/attrs/pots.",
  },
  celestialGapCurrent: {
    eter_minLevel: 500,
    firmamento_minLevel: 560,
    nexus_minLevel: 620,
    afterRitualLevel: 1,
    accessibleCelestialAtL1: false,
  },
  celestialTier1Proposal: ["alvorada", "jardins_lunares", "arquipelago_nuvens", "biblioteca_estrelas", "cascata_aurora", "eter"],
});


// ── Perfis 120 dias ───────────────────────────────────────────────────
// Offline: 1 catch-up principal/dia (noite). Syncs extras não multiplicam wall cheio.
const profiles = {
  Casual: {
    activeMinPerDay: 25,
    primaryOfflineWallH: 14,
    extraSyncWallH: 0,
    offlineAlt: "proposta_C_8h_decay",
    optimize: false,
  },
  Dedicado: {
    activeMinPerDay: 70,
    primaryOfflineWallH: 10,
    extraSyncWallH: 2,
    offlineAlt: "proposta_C_8h_decay",
    optimize: true,
  },
  Competitivo: {
    activeMinPerDay: 150,
    primaryOfflineWallH: 6,
    extraSyncWallH: 2,
    offlineAlt: "proposta_C_8h_decay",
    optimize: true,
  },
};

function rewardedPerDay(p) {
  const alt = offlineAlts.alternatives.find((a) => a.id === p.offlineAlt);
  const primary = offlineRewardedHours(p.primaryOfflineWallH, alt.bands, alt.capH);
  const extra = p.extraSyncWallH
    ? offlineRewardedHours(p.extraSyncWallH, alt.bands, alt.capH) * 0.5
    : 0;
  const activeH = p.activeMinPerDay / 60;
  const offlineRew = primary + extra;
  return {
    calendarH: 24,
    connectedH: activeH,
    offlineWallH: p.primaryOfflineWallH + p.extraSyncWallH,
    offlineRewardedH: Math.round(offlineRew * 1000) / 1000,
    totalRewardedH: Math.round((activeH + offlineRew) * 1000) / 1000,
  };
}

/**
 * Orçamento de horas RECOMPENSADAS por etapa (Cenário C).
 * Cap.I = B (XP). Cap.II–IV = conteúdo (regiões, gear, maestria, domínio, chefes) — não só XP.
 * utilization: fração do catch-up teórico realmente coletado (esquecimento/sync irregular).
 */
const hourBudgets = {
  Casual: { hTo500: 54, hAscendBuffer: 10, hCelTo700: 140, hClear: 380, hOptional: 100, utilization: 0.72 },
  Dedicado: { hTo500: 35, hAscendBuffer: 6, hCelTo700: 120, hClear: 420, hOptional: 110, utilization: 0.88 },
  Competitivo: { hTo500: 26, hAscendBuffer: 4, hCelTo700: 100, hClear: 380, hOptional: 140, utilization: 0.95 },
};

const traj = {};
for (const [name, p] of Object.entries(profiles)) {
  const raw = rewardedPerDay(p);
  const util = hourBudgets[name].utilization;
  const day = {
    ...raw,
    utilization: util,
    totalRewardedH: Math.round(raw.totalRewardedH * util * 1000) / 1000,
    offlineRewardedH: Math.round(raw.offlineRewardedH * util * 1000) / 1000,
  };
  const b = hourBudgets[name];
  const seasonRewardedH = day.totalRewardedH * 120;

  const daysTo500 = Math.ceil(b.hTo500 / day.totalRewardedH);
  const daysToAscend = daysTo500 + Math.ceil(b.hAscendBuffer / day.totalRewardedH);
  const daysTo700 = daysToAscend + Math.ceil(b.hCelTo700 / day.totalRewardedH);
  const daysSeasonClear = daysTo700 + Math.ceil(b.hClear / day.totalRewardedH);
  const daysFullOptional = Math.min(120, daysSeasonClear + Math.ceil(b.hOptional / day.totalRewardedH));

  traj[name] = {
    profile: p,
    hourBudget: b,
    perDay: day,
    seasonTotals: {
      calendarDays: 120,
      connectedH: Math.round(day.connectedH * 120 * 10) / 10,
      rewardedH: Math.round(seasonRewardedH * 10) / 10,
    },
    milestones: {
      day_nivel_500: Math.min(120, daysTo500),
      day_ascensao: Math.min(120, daysToAscend),
      day_celestial_700: Math.min(120, daysTo700),
      day_conclusao_temporada: Math.min(120, daysSeasonClear),
      day_endgame_opcional_feito: daysFullOptional,
    },
    chapterProgressDay30:
      name === "Casual"
        ? "L400-500_prep_ritual"
        : name === "Dedicado"
          ? "ascendido_ou_L500"
          : "ascendido_cel_early_zones",
    chapterProgressDay60:
      name === "Casual"
        ? "cel_100-220"
        : name === "Dedicado"
          ? "cel_300-450"
          : "cel_500_maestria_inicio",
    chapterProgressDay90:
      name === "Casual"
        ? "cel_400-650"
        : name === "Dedicado"
          ? "cel_700_maestria_mid"
          : "maestria_alta_dominio4",
    chapterProgressDay120:
      name === "Casual"
        ? "conclusao_limite_ou_quase"
        : name === "Dedicado"
          ? "conclusao+opcionais"
          : "conclusao_cedo+leaderboards",
    conclusionBand: name === "Casual" ? "d100-120" : name === "Dedicado" ? "d75-95" : "d60-80",
  };
}

writeJson("v3_perfis_120d.json", {
  disclaimer: "Modelo analítico calendário vs conectado vs recompensado. Premissa offline = proposta_C_8h_decay.",
  scenario: "C",
  profiles: traj,
  distributionNote: {
    p10_competitive_clear: "d60-70",
    p50_dedicated_clear: "d80-90",
    p90_casual_clear: "d110-120",
    never_clears_if_no_catchup: "jogador sem offline adequado pode não concluir Cap.IV",
  },
});

const capitulosRows = [];
for (const [name, t] of Object.entries(traj)) {
  capitulosRows.push({
    profile: name,
    day30: t.chapterProgressDay30,
    day60: t.chapterProgressDay60,
    day90: t.chapterProgressDay90,
    day120: t.chapterProgressDay120,
    day_nivel_500: t.milestones.day_nivel_500,
    day_ascensao: t.milestones.day_ascensao,
    day_celestial_700: t.milestones.day_celestial_700,
    day_conclusao: t.milestones.day_conclusao_temporada,
    rewarded_h_season: t.seasonTotals.rewardedH,
    connected_h_season: t.seasonTotals.connectedH,
    conclusion_band: t.conclusionBand,
  });
}
writeCsv(
  "v3_capitulos.csv",
  [
    "profile",
    "day30",
    "day60",
    "day90",
    "day120",
    "day_nivel_500",
    "day_ascensao",
    "day_celestial_700",
    "day_conclusao",
    "rewarded_h_season",
    "connected_h_season",
    "conclusion_band",
  ],
  capitulosRows,
);

console.log("done v3 season simulation");
