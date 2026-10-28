import { createArena } from './arena.js';
import { createInventoryUI } from './inventory.js';
import { createMerchantUI } from './merchant.js';
/** Missões de engajamento desligadas no standalone. */
function createEngagementUI() {
  return { render() {}, open() {}, close() {} };
}
import { createArenaUI } from './arena-ui.js';
import { createDivindadeUI } from './divindade.js';
import { openCelestialLegacy } from './celestial-legacy.js';
import { createOfflineReportUI } from './offline-report.js';
import { createHuntPerfUI } from './hunt-perf-ui.js';
import {
  unlockAudio,
  sfx,
  playZoneMusic,
  stopMusic,
  getAudioSettings,
  setAudioSettings,
} from './audio.js';
import { runPlayIntro } from './play-intro.js';

const POLL_MS = 2000;
const MILESTONE = 100;
const LOG_COLLAPSE_KEY = 'jogo_idle_log_collapsed';
const RAIL_COLLAPSE_KEY = 'jogo_idle_rail_collapsed';
const BAG_COLLAPSE_KEY = 'jogo_idle_bag_collapsed';
const HUD_ICON = '/jogo-idle/assets/hud';
const SKILL_ART = '/jogo-idle/assets/skills';
const CLASS_PORTRAIT = {
  GUERREIRO: `${HUD_ICON}/portrait-guerreiro.jpg`,
  BARBARO: `${HUD_ICON}/portrait-barbaro.jpg`,
  MAGO: `${HUD_ICON}/portrait-mago.jpg`,
  ARQUEIRO: `${HUD_ICON}/portrait-arqueiro.jpg`,
};
const COMBAT_SKILL_ICON = {
  gue_escudado: `${SKILL_ART}/guerreiro/01_radiant_smite.png`,
  gue_investida: `${SKILL_ART}/guerreiro/06_divine_bulwark.png`,
  gue_provocacao: `${SKILL_ART}/guerreiro/11_spear_of_retribution.png`,
  gue_martelo_ira: `${SKILL_ART}/guerreiro/02_hammer_of_wrath.png`,
  gue_pilar_alvorada: `${SKILL_ART}/guerreiro/03_pillar_of_dawn.png`,
  gue_nova_sagrada: `${SKILL_ART}/guerreiro/04_holy_nova.png`,
  gue_flare_solar: `${SKILL_ART}/guerreiro/08_solar_flare.png`,
  gue_laminas_justica: `${SKILL_ART}/guerreiro/12_blades_of_justice.png`,
  gue_guilhotina: `${SKILL_ART}/guerreiro/20_execution_guillotine.png`,
  bar_cortar: `${SKILL_ART}/barbaro/01_furious_cleave.png`,
  bar_berro: `${SKILL_ART}/barbaro/08_undying_rage_roar.png`,
  bar_massacre: `${SKILL_ART}/barbaro/20_final_deathblow.png`,
  bar_decapitacao: `${SKILL_ART}/barbaro/02_bloody_decapitation.png`,
  bar_sangue_fervente: `${SKILL_ART}/barbaro/05_blood_boil_surge.png`,
  bar_frenesi: `${SKILL_ART}/barbaro/06_frenzy_battering.png`,
  bar_esmagador: `${SKILL_ART}/barbaro/12_skull_crusher.png`,
  bar_salto_selvagem: `${SKILL_ART}/barbaro/13_savage_leap.png`,
  bar_rasgar_armadura: `${SKILL_ART}/barbaro/17_armor_rend.png`,
  mag_bola_fogo: `${SKILL_ART}/mago/01_arcane_missiles.png`,
  mag_raio: `${SKILL_ART}/mago/14_arcane_barrage.png`,
  mag_gelo: `${SKILL_ART}/mago/05_gravity_collapse.png`,
  mag_piscar: `${SKILL_ART}/mago/04_phase_blink.png`,
  mag_escudo_runico: `${SKILL_ART}/mago/06_arcane_rune_shield.png`,
  mag_estase: `${SKILL_ART}/mago/09_temporal_stasis.png`,
  mag_singularidade: `${SKILL_ART}/mago/10_mana_singularity.png`,
  mag_poco_gravitacional: `${SKILL_ART}/mago/16_gravity_well.png`,
  mag_wormhole: `${SKILL_ART}/mago/20_wormhole_nexus.png`,
  arq_rapido: `${SKILL_ART}/arqueiro/17_feather_storm_barrage.png`,
  arq_perfurante: `${SKILL_ART}/arqueiro/03_strangling_vine_lash.png`,
  arq_chuva: `${SKILL_ART}/arqueiro/08_forked_sky_lightning.png`,
  arq_presa_pantera: `${SKILL_ART}/arqueiro/02_panther_fang_crunch.png`,
  arq_armadilha_espinho: `${SKILL_ART}/arqueiro/04_briar_patch_snare.png`,
  arq_espirito_lobo: `${SKILL_ART}/arqueiro/10_howling_wolf_spirit.png`,
  arq_raio_solar: `${SKILL_ART}/arqueiro/13_solar_zenith_ray.png`,
  arq_arco_lunar: `${SKILL_ART}/arqueiro/14_lunar_crescent_arc.png`,
  arq_pedra_desenraizada: `${SKILL_ART}/arqueiro/19_uprooted_boulder_hurl.png`,
};
const FARM_SKILL_ICON = {
  gue_doutrina: `${SKILL_ART}/guerreiro/10_aura_of_fortitude.png`,
  gue_saque: `${SKILL_ART}/guerreiro/17_litany_of_courage.png`,
  gue_golpe: `${SKILL_ART}/guerreiro/19_hand_of_salvation.png`,
  bar_furia: `${SKILL_ART}/barbaro/04_brutal_stomp.png`,
  bar_pilhagem: `${SKILL_ART}/barbaro/10_rage_ignited_tackle.png`,
  bar_massacre: `${SKILL_ART}/barbaro/18_reckless_swing.png`,
  mag_estudo: `${SKILL_ART}/mago/02_chrono_hourglass.png`,
  mag_transmutacao: `${SKILL_ART}/mago/19_mana_surge_tome.png`,
  mag_descarga: `${SKILL_ART}/mago/13_chronomancer_pocketwatch.png`,
  arq_rastro: `${SKILL_ART}/arqueiro/06_verdant_rain_shower.png`,
  arq_presa: `${SKILL_ART}/arqueiro/01_grizzly_paw_swipe.png`,
  arq_tiro: `${SKILL_ART}/arqueiro/16_sprouting_vitality_bud.png`,
};

function hudGlyph(src) {
  return `<img class="skill-glyph" src="${src}" alt="" />`;
}

function combatSkillGlyph(s) {
  const src = COMBAT_SKILL_ICON[s.id];
  return src ? hudGlyph(src) : s.icon || '✦';
}

const $ = (id) => document.getElementById(id);

const els = {
  gamePanel: $('game-panel'),
  combatLog: $('combat-log'),
  logToggle: $('log-toggle'),
  logToggleLabel: $('log-toggle-label'),
  railToggle: $('rail-toggle'),
  railToggleLabel: $('rail-toggle-label'),
  bagToggle: $('bag-toggle'),
  bagToggleLabel: $('bag-toggle-label'),
  navCharName: $('nav-char-name'),
  evoBadge: $('evo-badge'),
  unitEvo: $('unit-evo'),
  onlineCount: $('online-count'),
  logoutBtn: $('logout-btn'),
  lobbyBtn: $('lobby-btn'),
  heroName: $('hero-name'),
  heroClass: $('hero-class'),
  heroPortrait: $('hero-portrait'),
  statLevel: $('stat-level'),
  attrStr: $('attr-str'),
  attrInt: $('attr-int'),
  attrDex: $('attr-dex'),
  attrCon: $('attr-con'),
  unspentPoints: $('unspent-points'),
  unspentValue: $('unspent-value'),
  ascendBtn: $('ascend-btn'),
  statXp: $('stat-xp'),
  xpFill: $('xp-fill'),
  zoneTabLabel: $('zone-tab-label'),
  zoneMetaName: $('zone-meta-name'),
  zoneMetaCount: $('zone-meta-count'),
  zonePlayers: $('zone-players'),
  activityName: $('activity-name'),
  activityDesc: $('activity-desc'),
  sessKills: $('sess-kills'),
  sessXp: $('sess-xp'),
  sessGold: $('sess-gold'),
  stopBtn: $('stop-btn'),
  areaBtn: $('area-btn'),
  startBtn: $('start-btn'),
  autoRestartBtn: $('auto-restart-btn'),
  zonesModal: $('idle-zones'),
  zonesList: $('zones-list'),
  activityBanner: $('activity-banner'),
  activityBannerName: $('activity-banner-name'),
  activityKills: $('activity-kills'),
  activityFill: $('activity-fill'),
  farmStatus: $('farm-status'),
  eventFarmLine: $('event-farm-line'),
  combatFeedback: $('combat-feedback'),
  sessionFeed: $('session-feed'),
  unitName: $('unit-name'),
  unitLevel: $('unit-level'),
  hpFill: $('hp-fill'),
  statHp: $('stat-hp'),
  mpFill: $('mp-fill'),
  statMp: $('stat-mp'),
  statAtk: $('stat-atk'),
  statDef: $('stat-def'),
  statCrit: $('stat-crit'),
  statSpeed: $('stat-speed'),
  duelSpeed: $('duel-speed'),
  targetCard: $('target-card'),
  targetName: $('target-name'),
  targetKind: $('target-kind'),
  targetLevel: $('target-level'),
  targetAtk: $('target-atk'),
  targetDef: $('target-def'),
  targetFill: $('target-fill'),
  targetGhost: $('target-ghost'),
  targetHp: $('target-hp'),
  targetHpMeter: $('target-hp-meter'),
  targetDelta: $('target-delta'),
  targetHpPct: $('target-hp-pct'),
  targetThreat: $('target-threat'),
  targetDps: $('target-dps'),
  targetTtk: $('target-ttk'),
  targetZone: $('target-zone'),
  targetWave: $('target-wave'),
  targetWaveFill: $('target-wave-fill'),
  targetWaveValue: $('target-wave-value'),
  targetSessKills: $('target-sess-kills'),
  targetSessXp: $('target-sess-xp'),
  targetSessGold: $('target-sess-gold'),
  heroHpMeter: $('hero-hp-meter'),
  hpGhost: $('hp-ghost'),
  hpDelta: $('hp-delta'),
  mpGhost: $('mp-ghost'),
  mpDelta: $('mp-delta'),
  unitXpFill: $('unit-xp-fill'),
  unitXpValue: $('unit-xp-value'),
  unitHero: document.querySelector('.unit--hero'),
  invCount: $('inv-count'),
  invGrid: $('inv-grid'),
  statGold: $('stat-gold'),
  topGold: $('top-gold'),
  hudKills: $('hud-kills'),
  hudXp: $('hud-xp'),
  hudGold: $('hud-gold'),
  hudDps: $('hud-dps'),
  hudTtk: $('hud-ttk'),
  muteBtn: $('mute-btn'),
  sfxVol: $('sfx-vol'),
  musicVol: $('music-vol'),
  toast: $('toast'),
  merchantBtn: $('merchant-btn'),
  engagementBtn: $('engagement-btn'),
  engagementBadge: $('engagement-badge'),
  eventChip: $('event-chip'),
  petsList: $('pets-list'),
  petsEmpty: $('pets-empty'),
  arenaBtn: $('arena-btn'),
  arenaCombatBtn: $('arena-combat-btn'),
  divindadeBtn: $('divindade-btn'),
  divindadeBadge: $('divindade-badge'),
  resourceLabel: $('resource-label'),
  resourceMeter: $('resource-meter'),
  farmBuffChip: $('farm-buff-chip'),
  progressHint: $('progress-hint'),
  combatSkillSlots: $('combat-skill-slots'),
  combatAutoCast: $('combat-auto-cast'),
  autoHpPotion: $('auto-hp-potion'),
  autoHpPotionPct: $('auto-hp-potion-pct'),
  skillsModal: $('idle-skills'),
  skillTree: $('skill-tree'),
  skillDetail: $('skill-detail'),
  skillPointsValue: $('skill-points-value'),
  skillPointsModal: $('skill-points-modal'),
  skillsActive: $('skills-active'),
  skillsOpenBtn: $('skills-open-btn'),
  huntPerfOpenBtn: $('hunt-perf-open-btn'),
  combatFire: $('arena-combat-fire'),
};

const PET_ICONS = { dog: '🐶', cat: '🐱', parrot: '🦜' };

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
const pct = (v, max) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
const meterFxState = { heroHp: null, targetHp: null, heroMp: null };
const meterFxTimers = new WeakMap();

function pulseClass(el, className, ms = 420) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  const prev = meterFxTimers.get(el) || {};
  if (prev[className]) clearTimeout(prev[className]);
  prev[className] = setTimeout(() => el.classList.remove(className), ms);
  meterFxTimers.set(el, prev);
}

function showMeterDelta(deltaEl, amount) {
  if (!deltaEl || !amount) return;
  const heal = amount > 0;
  deltaEl.textContent = `${heal ? '+' : ''}${fmt(Math.round(amount))}`;
  deltaEl.classList.remove('is-damage', 'is-heal');
  void deltaEl.offsetWidth;
  deltaEl.classList.add(heal ? 'is-heal' : 'is-damage');
}

function applyMeterFx({
  key,
  fill,
  ghost,
  meterEl,
  unitEl,
  value,
  max,
  deltaEl,
  quiet = false,
}) {
  const next = Math.max(0, Number(value) || 0);
  const maxV = Math.max(1, Number(max) || 1);
  const nextPct = Math.max(0, Math.min(100, (next / maxV) * 100));
  const prev = meterFxState[key];
  const width = `${nextPct}%`;

  if (fill) {
    fill.style.width = width;
    fill.classList.toggle('is-empty', nextPct < 0.8);
  }

  if (!quiet && prev && Number.isFinite(prev.value)) {
    const delta = next - prev.value;
    if (delta < -0.5) {
      if (ghost) {
        ghost.style.transition = 'none';
        ghost.style.width = `${prev.pct}%`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            ghost.style.transition = '';
            ghost.style.width = width;
          });
        });
      }
      pulseClass(meterEl, 'is-hit', 380);
      pulseClass(unitEl, 'unit--hurt', 420);
      showMeterDelta(deltaEl, delta);
    } else if (delta > 0.5) {
      if (ghost) {
        ghost.style.transition = '';
        ghost.style.width = width;
      }
      pulseClass(meterEl, 'is-heal', 480);
      pulseClass(unitEl, 'unit--healed', 500);
      showMeterDelta(deltaEl, delta);
    } else if (ghost) {
      ghost.style.width = width;
    }
  } else if (ghost) {
    ghost.style.transition = 'none';
    ghost.style.width = width;
    requestAnimationFrame(() => {
      ghost.style.transition = '';
    });
  }

  meterFxState[key] = { value: next, pct: nextPct };
  return width;
}

function setHeroHp(hp, maxHp) {
  applyMeterFx({
    key: 'heroHp',
    fill: els.hpFill,
    ghost: els.hpGhost,
    meterEl: els.heroHpMeter,
    unitEl: els.unitHero,
    value: hp,
    max: maxHp,
    deltaEl: els.hpDelta,
  });
  els.statHp.textContent = `${fmt(hp)} / ${fmt(maxHp)}`;
}

function setHeroResource(cur, max) {
  applyMeterFx({
    key: 'heroMp',
    fill: els.mpFill,
    ghost: els.mpGhost,
    meterEl: els.resourceMeter,
    unitEl: els.unitHero,
    value: cur,
    max,
    deltaEl: els.mpDelta,
  });
  els.statMp.textContent = `${fmt(cur)} / ${fmt(max)}`;
}

function setTargetHp(hp, maxHp) {
  applyMeterFx({
    key: 'targetHp',
    fill: els.targetFill,
    ghost: els.targetGhost,
    meterEl: els.targetHpMeter,
    unitEl: els.targetCard,
    value: hp,
    max: maxHp,
    deltaEl: els.targetDelta,
  });
  els.targetHp.textContent = `${fmt(hp)} / ${fmt(maxHp)}`;
  if (els.targetHpPct) {
    const p = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100))) : 0;
    els.targetHpPct.textContent = maxHp > 0 ? `${p}% restante` : '—';
  }
  refreshTargetCombatMeta();
}

function refreshTargetCombatMeta() {
  const t = character?.target;
  const stats = character?.stats;
  if (!els.targetDps) return;
  if (!t || !stats) {
    els.targetDps.textContent = '—';
    if (els.targetTtk) els.targetTtk.textContent = '—';
    if (els.targetThreat) els.targetThreat.textContent = '—';
    return;
  }
  const dps = approxDps(stats, t);
  els.targetDps.textContent = dps > 0 ? dps.toFixed(1) : '—';
  if (els.targetTtk) {
    els.targetTtk.textContent =
      dps > 0 ? formatTtk(Math.max(0, Number(t.hp) || 0) / dps) : '—';
  }
  if (els.targetThreat) {
    const atk = Number(stats.attack) || 0;
    const def = Number(t.defense) || 0;
    if (atk >= def * 2) els.targetThreat.textContent = 'Pressão alta';
    else if (atk >= def) els.targetThreat.textContent = 'Pressão firme';
    else els.targetThreat.textContent = 'Alvo resistente';
  }
}

function setTarget(t) {
  if (!t) {
    els.targetName.textContent = 'Sem alvo';
    els.targetLevel.textContent = '—';
    els.targetAtk.textContent = '—';
    els.targetDef.textContent = '—';
    if (els.targetGhost) els.targetGhost.style.width = '0%';
    if (els.targetFill) els.targetFill.style.width = '0%';
    els.targetHp.textContent = '—';
    meterFxState.targetHp = null;
    if (els.targetKind) els.targetKind.textContent = 'Alvo';
    if (els.targetHpPct) els.targetHpPct.textContent = '—';
    els.targetCard?.classList.remove('unit--boss', 'unit--hurt', 'unit--healed');
    refreshTargetCombatMeta();
    return;
  }
  const targetKey = `${t.name}|${t.level}|${t.isBoss ? 1 : 0}|${t.maxHp}`;
  const swapped = meterFxState.targetKey !== targetKey;
  meterFxState.targetKey = targetKey;
  if (swapped) meterFxState.targetHp = null;
  els.targetName.textContent = t.isBoss ? `♛ ${t.name}` : t.name;
  els.targetLevel.textContent = t.level;
  if (els.targetKind) els.targetKind.textContent = t.isBoss ? 'Boss' : 'Inimigo';
  if (t.attack != null) els.targetAtk.textContent = fmt(t.attack);
  if (t.defense != null) els.targetDef.textContent = fmt(t.defense);
  els.targetCard?.classList.toggle('unit--boss', Boolean(t.isBoss));
  setTargetHp(t.hp, t.maxHp);
}

const scene = createArena($('arena'), {
  goldTarget: els.statGold,
  onTarget: setTarget,
  onTargetHp: setTargetHp,
  onHeroHp: setHeroHp,
});

let meta = { classes: [], zones: [], merchant: null };
let character = null;
let engagement = null;
let arenaState = { inArena: false, minStake: 100 };
let duelState = null;
let pollTimer = null;
let audioUnlocked = false;
let lastEngagementSnap = '';
/** Evita re-tocar o mesmo duelo no poll. */
let lastPlayedDuelId = null;
let lastPendingChallengeId = null;
/** Última revision de catálogo aplicada nos temas 3D (admin mapa). */
let catalogRevision = null;
const shown = { gold: null, xp: null, topGold: null };

function applyZoneThemesFromZones(zones) {
  const themes = {};
  for (const z of zones || []) {
    if (z.scene) themes[z.id] = z.scene;
  }
  scene.setZoneThemes(themes);
  if (character?.farmZoneId) scene.setZone(character.farmZoneId);
}

async function syncCatalogThemes(revision) {
  if (!revision || revision === catalogRevision) return;
  try {
    const m = await api('/api/meta');
    catalogRevision = m.catalogRevision || revision;
    if (m.zones) meta = { ...meta, zones: m.zones, merchant: m.merchant || meta.merchant };
    if (m.merchant) meta.merchant = m.merchant;
    applyZoneThemesFromZones(meta.zones);
  } catch {
    /* mantém temas atuais */
  }
}

const offlineReport = createOfflineReportUI({
  getCharacterId: () => character?.id || null,
});

const merchant = createMerchantUI({
  button: els.merchantBtn,
  getState: () => ({ merchant: meta.merchant, character }),
  onBuy: async (sku) => {
    try {
      const data = await api('/api/merchant/buy', {
        method: 'POST',
        body: JSON.stringify({ sku }),
      });
      if (data.merchant) meta.merchant = data.merchant;
      renderCharacter(data.character);
      sfx('sell');
      toast(data.message || 'Compra realizada', 3500);
      pushLog([data.message || 'Compra no mercador']);
    } catch (err) {
      toast(err.message, 3000);
      throw err;
    }
  },
});

const engagementUi = createEngagementUI({
  button: els.engagementBtn,
  badge: els.engagementBadge,
  eventChip: els.eventChip,
  getState: () => ({ engagement, character }),
  onToast: (msg) => toast(msg, 3500),
  onClaim: async (kind) => {
    const data = await api('/api/engagement/claim', {
      method: 'POST',
      body: JSON.stringify({ kind }),
    });
    if (data.engagement) engagement = data.engagement;
    if (data.character) renderCharacter(data.character);
    sfx('sell');
    toast(data.message || 'Missão resgatada', 4000);
    pushLog([data.message || 'Missão']);
    lastEngagementSnap = '';
    engagementUi.render({ force: true });
  },
});

const arenaUi = createArenaUI({
  button: els.arenaBtn,
  getState: () => ({ arena: arenaState, character, duel: duelState }),
  onToast: (msg) => toast(msg, 3500),
  onEnter: async () => {
    const data = await api('/api/arena/enter', { method: 'POST', body: '{}' });
    applyArenaPayload(data);
    toast(data.message || 'Entrou na Arena', 3500);
    pushLog([data.message || 'Entrou na Arena']);
    return data;
  },
  onLeave: async () => {
    const data = await api('/api/arena/leave', { method: 'POST', body: '{}' });
    clearDuelUi();
    applyArenaPayload({ ...data, duel: null });
    toast(data.message || 'Saiu da Arena', 3000);
    return data;
  },
  onRefreshPlayers: async () => {
    const data = await api('/api/arena/players');
    applyArenaPayload(data);
    return data.players || [];
  },
  onChallenge: async (opponentCharacterId, stake) => {
    const data = await api('/api/arena/challenge', {
      method: 'POST',
      body: JSON.stringify({ opponentCharacterId, stake }),
    });
    applyArenaPayload(data);
    pushLog([data.message || 'Desafio enviado']);
    return data;
  },
  onRespond: async (duelId, accept) => {
    const data = await api('/api/arena/respond', {
      method: 'POST',
      body: JSON.stringify({ duelId, accept }),
    });
    applyArenaPayload(data);
    if (accept && data.duel) playDuelReplay(data.duel);
    pushLog([data.message || (accept ? 'Duelo' : 'Recusado')]);
    return data;
  },
  onForfeit: async () => {
    const data = await api('/api/arena/forfeit', { method: 'POST', body: '{}' });
    applyArenaPayload(data);
    return data;
  },
});

els.arenaCombatBtn?.addEventListener('click', () => arenaUi.open());

const divindadeUi = createDivindadeUI({
  button: els.divindadeBtn,
  getState: () => ({ character }),
  onToast: (msg, ms) => toast(msg, ms),
  onAscend: async () => {
    const data = await api('/api/me/ascend', { method: 'POST', body: '{}' });
    renderCharacter(data.character);
    toast(data.message || 'Ritual concluído — você é Celestial!', 5500);
    sfx('level');
    const legacy = data.ascensionLegacy || data.character?.ascensionLegacy;
    if (legacy) openCelestialLegacy(legacy, { celebrate: true });
    return data;
  },
});

function applyArenaPayload(data) {
  if (data?.character) renderCharacter(data.character);
  if (data?.arena) arenaState = { ...arenaState, ...data.arena };
  if (data?.character?.arenaMode != null) {
    arenaState = { ...arenaState, inArena: Boolean(data.character.arenaMode) };
  }
  if (data?.duel !== undefined) duelState = data.duel;
  syncArenaChrome();
  syncArenaDuelFire();
  arenaUi.syncFromMe({ arena: arenaState, character, duel: duelState });
}

function syncArenaChrome() {
  const inArena = Boolean(arenaState?.inArena || character?.arenaMode);
  els.arenaCombatBtn?.classList.toggle('is-on', inArena);
  els.arenaBtn?.classList.toggle('is-on', inArena);
  syncStartFarmBtn();
}

function duelTargetFrom(duel) {
  if (!duel?.foe) return null;
  const spawn = (duel.events || []).find((e) => e.type === 'spawn');
  return {
    name: duel.foe.name,
    level: duel.foe.level || spawn?.level || 1,
    hp: spawn?.monsterHp ?? spawn?.monsterMaxHp ?? 1,
    maxHp: spawn?.monsterMaxHp ?? spawn?.monsterHp ?? 1,
    attack: spawn?.attack,
    defense: spawn?.defense,
    isBoss: false,
  };
}

function playDuelReplay(duel) {
  if (!duel?.id || duel.id === lastPlayedDuelId) return;
  if (!duel.events?.length) return;
  lastPlayedDuelId = duel.id;
  const target = duelTargetFrom(duel);
  if (target) setTarget(target);
  arenaDuelPresenting = true;
  syncArenaDuelFire();
  // Replay PvP mais longo que o farm (não corta no backlog de 3s).
  scene.play(duel.events, target, {
    duel: true,
    spanMs: 14_000,
    maxBacklogMs: 30_000,
    onComplete: endArenaDuelPresentation,
  });
  if (duel.status === 'FINISHED') {
    if (duel.draw) {
      pushSessionFeed('Duelo empatado — apostas devolvidas', 'info');
      toast('Empate na Arena', 4000);
    } else if (duel.winnerCharacterId === character?.id) {
      pushSessionFeed(`Vitória na Arena (+${fmt(duel.result?.pot || duel.stake * 2)} gold)`, 'boss');
      toast('Vitória no duelo!', 4000);
      sfx('sell');
    } else {
      pushSessionFeed(`Derrota na Arena (−${fmt(duel.stake)} gold)`, 'info');
      toast('Derrota no duelo', 3500);
    }
  }
}

function clearDuelUi() {
  duelState = null;
  arenaDuelPresenting = false;
  setTarget(null);
  scene.clearCombat?.();
  scene.clearQueue?.();
  syncArenaDuelFire();
}

/**
 * Chamas na viewport: duelo Arena real, nunca farm.
 * O servidor resolve aceitação PENDING→FINISHED na mesma request; ACTIVE é raro.
 * O combate visível é o replay (playDuelReplay) — `arenaDuelPresenting` só acompanha essa apresentação.
 */
let arenaFireFadeTimer = null;
let arenaDuelPresenting = false;
const ARENA_FIRE_FADE_MS = 560;

function isArenaDuelFireWanted() {
  return duelState?.status === 'ACTIVE' || arenaDuelPresenting;
}

function syncArenaDuelFire() {
  const el = els.combatFire;
  if (!el) return;

  const wanted = isArenaDuelFireWanted();
  const tabHidden = document.visibilityState === 'hidden';

  if (arenaFireFadeTimer) {
    clearTimeout(arenaFireFadeTimer);
    arenaFireFadeTimer = null;
  }

  if (wanted) {
    el.classList.add('is-lit');
    el.classList.toggle('is-paused', tabHidden);
    el.classList.toggle('is-on', !tabHidden);
    return;
  }

  el.classList.remove('is-paused');
  if (el.classList.contains('is-on')) {
    el.classList.remove('is-on');
    arenaFireFadeTimer = setTimeout(() => {
      if (!isArenaDuelFireWanted()) el.classList.remove('is-lit');
      arenaFireFadeTimer = null;
    }, ARENA_FIRE_FADE_MS);
    return;
  }

  el.classList.remove('is-lit');
}

function endArenaDuelPresentation() {
  if (!arenaDuelPresenting) return;
  arenaDuelPresenting = false;
  syncArenaDuelFire();
}

function engagementSnap(next) {
  if (!next) return '';
  const m = next.missions || {};
  return JSON.stringify({
    xp: next.xpMult,
    gold: next.goldMult,
    drop: next.dropMult,
    label: next.label,
    eventLabel: next.eventLabel,
    eventEndsAt: next.eventEndsAt,
    plantao: next.plantaoToday,
    checkIn: m.checkInClaimed,
    ftAvail: m.flowtimeAvailable,
    ftClaim: m.flowtimeClaimed,
  });
}

function applyEngagement(next) {
  if (!next) return;
  engagement = next;
  const snap = engagementSnap(next);
  if (snap !== lastEngagementSnap) lastEngagementSnap = snap;
  engagementUi.render();
}

function apiPath(path) {
  if (path.startsWith('/api/jogo-idle')) return path;
  if (path.startsWith('/api/')) return `/api/jogo-idle${path.slice(4)}`;
  return path;
}

let maintenanceNotified = false;

function notifyMaintenance(message) {
  if (maintenanceNotified) return;
  maintenanceNotified = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (els.farmStatus) {
    els.farmStatus.textContent = 'Jogo em manutenção';
    els.farmStatus.classList.add('offline');
  }
  try {
    window.parent?.postMessage(
      { type: 'jogo-idle:maintenance', message: message || '' },
      window.location.origin,
    );
  } catch {
    /* o lobby também consulta /meta */
  }
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(apiPath(path), { credentials: 'include', ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      window.location.assign('/jogo-idle/lobby.html');
    }
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    const maintenance =
      data.code === 'MAINTENANCE' ||
      (res.status === 503 && /manuten/i.test(String(data.error || '')));
    if (maintenance) {
      err.code = 'MAINTENANCE';
      notifyMaintenance(data.error);
    }
    throw err;
  }
  return data;
}

const huntPerfUi = createHuntPerfUI({
  api,
  getCharacter: () => character,
  onToast: (msg) => toast(msg, 3500),
  onCharacter: (c) => {
    if (c) renderCharacter(c);
  },
});

function pushLog(lines = []) {
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    els.combatLog.prepend(li);
  }
  while (els.combatLog.children.length > 40) {
    els.combatLog.lastChild.remove();
  }
}

const SESSION_FEED_MAX = 12;
function pushSessionFeed(text, kind = 'info') {
  if (!els.sessionFeed || !text) return;
  const li = document.createElement('li');
  li.className = `session-feed__item session-feed__item--${kind}`;
  li.textContent = text;
  els.sessionFeed.prepend(li);
  while (els.sessionFeed.children.length > SESSION_FEED_MAX) {
    els.sessionFeed.lastChild.remove();
  }
}

function approxDps(stats, target) {
  const atk = Number(stats?.attack) || 0;
  const def = Number(target?.defense) || 0;
  const interval = Math.max(200, Number(stats?.attackIntervalMs) || 2000);
  const effective = Math.max(1, atk - Math.floor(def * 0.35));
  return effective / (interval / 1000);
}

function formatTtk(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function updateCombatFeedback(c) {
  const stats = c?.stats;
  const target = c?.target;
  const dps = approxDps(stats, target);
  if (els.hudDps) els.hudDps.textContent = dps > 0 ? dps.toFixed(1) : '—';
  if (els.hudTtk) {
    if (target && dps > 0) {
      const hp = Math.max(0, Number(target.hp) || 0);
      els.hudTtk.textContent = formatTtk(hp / dps);
    } else {
      els.hudTtk.textContent = '—';
    }
  }
  if (els.combatFeedback) {
    if (target && dps > 0) {
      els.combatFeedback.classList.remove('hidden');
      els.combatFeedback.textContent = `~${dps.toFixed(1)} DPS estimado · TTK ~${formatTtk((Number(target.hp) || 0) / dps)}${target.isBoss ? ' · Boss' : ''}`;
    } else {
      els.combatFeedback.classList.add('hidden');
      els.combatFeedback.textContent = '';
    }
  }
}

function updateEventFarmLine() {
  if (!els.eventFarmLine) return;
  const e = engagement;
  const active =
    e &&
    (e.eventLabel || e.xpMult > 1 || e.goldMult > 1 || e.dropMult > 1);
  if (!active || !e?.eventLabel) {
    if (!(e?.xpMult > 1 || e?.goldMult > 1 || e?.dropMult > 1)) {
      els.eventFarmLine.classList.add('hidden');
      els.eventFarmLine.textContent = '';
      return;
    }
  }
  const label = e.eventLabel || e.label || 'Bônus';
  const xp = Number(e.xpMult) || 1;
  const gold = Number(e.goldMult) || 1;
  const drop = Number(e.dropMult) || 1;
  if (xp <= 1 && gold <= 1 && drop <= 1 && !e.eventLabel) {
    els.eventFarmLine.classList.add('hidden');
    els.eventFarmLine.textContent = '';
    return;
  }
  els.eventFarmLine.classList.remove('hidden');
  els.eventFarmLine.textContent = `Evento ${label}: XP ×${xp} · Ouro ×${gold} · Drop ×${drop}`;
}

let toastTimer = null;
function toast(text, ms = 4000) {
  els.toast.textContent = text;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), ms);
}

function tweenNumber(key, el, to, format = fmt) {
  const from = shown[key];
  shown[key] = to;
  if (from == null || from === to || !el.isConnected) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const dur = 1200;
  const step = (now) => {
    if (shown[key] !== to) return;
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function zoneById(id) {
  return meta.zones.find((z) => z.id === id);
}

function applyChapterFrame(chapterId) {
  const id = String(chapterId || 'I').toUpperCase();
  const valid = id === 'II' || id === 'III' || id === 'IV' ? id : 'I';
  document.body.dataset.chapter = valid;
}

function renderCharacter(c) {
  const zoneChanged = character?.farmZoneId !== c.farmZoneId;
  character = c;
  const { stats, attributes: a } = c;
  applyChapterFrame(c.currentChapterId);

  els.navCharName.textContent = c.name;
  const evoLabel = (() => {
    const cls = String(c.classification || c.ascension || 'MORTAL').toUpperCase();
    if (cls === 'SEMIDEUS') return 'Semideus';
    if (cls === 'DIVINO') return 'Divino';
    if (cls === 'CELESTIAL') return 'Celestial';
    return 'Mortal';
  })();
  if (els.evoBadge) {
    els.evoBadge.classList.remove('hidden');
    els.evoBadge.textContent = evoLabel;
  }
  if (els.unitEvo) els.unitEvo.textContent = evoLabel;
  els.heroName.textContent = c.name;
  els.heroClass.textContent = c.className;
  if (els.heroPortrait) {
    const portrait = CLASS_PORTRAIT[c.classId] || CLASS_PORTRAIT.GUERREIRO;
    if (els.heroPortrait.getAttribute('src') !== portrait) els.heroPortrait.src = portrait;
  }
  els.statLevel.textContent = c.level;
  const eff = c.effectiveAttributes || a;
  function paintAttr(el, base, effective) {
    if (!el) return;
    if (effective != null && effective !== base) {
      el.innerHTML = `<span class="attr-base">${fmt(base)}</span><span class="attr-arrow">→</span><span class="attr-eff">${fmt(effective)}</span>`;
    } else {
      el.textContent = fmt(base);
    }
  }
  function paintAttrBar(id, base, effective, level) {
    const fill = document.getElementById(id);
    if (!fill) return;
    const value = Math.max(Number(effective) || 0, Number(base) || 0);
    const ceiling = Math.max(80, (Number(level) || 1) * 12 + 40);
    const pct = Math.max(4, Math.min(100, Math.round((value / ceiling) * 100)));
    fill.style.width = `${pct}%`;
  }
  paintAttr(els.attrStr, a.str, eff.str);
  paintAttr(els.attrInt, a.int, eff.int);
  paintAttr(els.attrDex, a.dex, eff.dex);
  paintAttr(els.attrCon, a.con, eff.con);
  paintAttrBar('attr-bar-str', a.str, eff.str, c.level);
  paintAttrBar('attr-bar-int', a.int, eff.int, c.level);
  paintAttrBar('attr-bar-dex', a.dex, eff.dex, c.level);
  paintAttrBar('attr-bar-con', a.con, eff.con, c.level);
  const unspent = c.unspentPoints || 0;
  if (els.unspentPoints) {
    els.unspentPoints.classList.toggle('hidden', unspent <= 0);
    if (els.unspentValue) els.unspentValue.textContent = fmt(unspent);
  }
  document.querySelectorAll('.attr-plus').forEach((btn) => {
    const mode = btn.dataset.mode || 'fixed';
    let amount = Math.max(1, Math.floor(Number(btn.dataset.amount) || 1));
    if (mode === 'max') amount = Math.max(1, unspent);
    if (mode === 'custom') {
      const input = btn
        .closest('.attr-row__actions')
        ?.querySelector(`.attr-custom-amount[data-attr="${btn.dataset.attr}"]`);
      const typed = Math.floor(Number(input?.value) || 0);
      amount = typed > 0 ? typed : 1;
    }
    const canSpend = unspent >= amount && unspent > 0;
    btn.classList.toggle('hidden', unspent <= 0);
    btn.disabled = !canSpend;
    btn.classList.toggle('is-disabled', !canSpend);
  });
  document.querySelectorAll('.attr-custom-amount').forEach((input) => {
    input.classList.toggle('hidden', unspent <= 0);
    input.disabled = unspent <= 0;
    input.max = String(Math.max(1, unspent));
    const cur = Math.floor(Number(input.value) || 0);
    if (cur > unspent) input.value = unspent > 0 ? String(unspent) : '';
    if (!input.value && unspent > 0) {
      input.placeholder = String(Math.min(unspent, 100));
    }
  });
  if (els.ascendBtn) {
    const maxed = Boolean(c.divindade?.maxed);
    els.ascendBtn.classList.toggle('hidden', maxed);
    const nextLabel = c.divindade?.nextRitual?.label;
    els.ascendBtn.textContent = nextLabel
      ? `Falar com a Divindade (${nextLabel})`
      : 'Falar com a Divindade';
  }
  renderSkills(c);
  if (els.statXp) {
    tweenNumber('xp', els.statXp, c.experience, (n) => `${fmt(n)} / ${fmt(c.experienceToNext)}`);
  }
  if (els.xpFill) els.xpFill.style.width = pct(c.experience, c.experienceToNext);
  if (els.unitXpFill) els.unitXpFill.style.width = pct(c.experience, c.experienceToNext);
  if (els.unitXpValue) {
    els.unitXpValue.textContent = `${fmt(c.experience)} / ${fmt(c.experienceToNext)}`;
  }

  els.unitName.textContent = c.name;
  els.unitLevel.textContent = c.level;
  setHeroHp(c.currentHp, stats.maxHp);
  const res = c.combatSkills?.resource;
  const isRage = res?.type === 'rage' || c.classId === 'BARBARO';
  const resCur = isRage ? Number(c.currentRage ?? res?.current ?? 0) : Number(c.currentMp ?? 0);
  const resMax = isRage ? Number(c.maxRage ?? res?.max ?? 100) : Number(stats.maxMp || 1);
  if (els.resourceLabel) els.resourceLabel.textContent = isRage ? 'Fúria' : 'MP';
  if (els.resourceMeter) els.resourceMeter.classList.toggle('meter--rage', isRage);
  setHeroResource(resCur, resMax);
  renderFarmBuffChip(c);
  renderProgressHint(c);
  renderDivindadeNav(c);
  renderCombatSkillBar(c);
  els.statAtk.textContent = fmt(stats.attack);
  els.statDef.textContent = fmt(stats.defense);
  els.statCrit.textContent = `${Math.round(stats.critChance * 100)}%`;
  const secs = (stats.attackIntervalMs / 1000).toFixed(2);
  els.statSpeed.textContent = `${secs}s`;
  els.duelSpeed.textContent = `${secs}s / golpe`;

  tweenNumber('gold', els.statGold, c.gold);
  if (els.topGold) tweenNumber('topGold', els.topGold, c.gold);
  if (els.hudKills) els.hudKills.textContent = fmt(c.session.kills);
  if (els.hudXp) els.hudXp.textContent = fmt(c.session.xp);
  if (els.hudGold) els.hudGold.textContent = fmt(c.session.gold);

  const zone = zoneById(c.farmZoneId);
  const farming = Boolean(zone);
  els.activityName.textContent = farming ? zone.name : 'Escolha uma área';
  if (els.activityDesc) els.activityDesc.textContent = farming ? zone.description || '' : '';
  if (els.sessKills) els.sessKills.textContent = fmt(c.session.kills);
  if (els.sessXp) els.sessXp.textContent = fmt(c.session.xp);
  if (els.sessGold) els.sessGold.textContent = fmt(c.session.gold);
  els.activityBanner.classList.toggle('hidden', !farming);
  els.activityBannerName.textContent = farming ? zone.name : '';
  els.activityKills.textContent = fmt(c.session.kills);
  const wave = Number(c.session?.farmWaveKills) || 0;
  const bossSize = Number(c.session?.bossWaveSize) || 0;
  const toBoss = bossSize > 0 ? Math.max(0, bossSize - wave) : 0;
  if (bossSize > 0 && farming) {
    els.activityFill.style.width = pct(wave, bossSize);
    els.farmStatus.textContent =
      toBoss === 0 || c.target?.isBoss
        ? 'Boss na área!'
        : `Boss em ${toBoss} abate${toBoss === 1 ? '' : 's'}`;
  } else {
    els.activityFill.style.width = pct(c.session.kills % MILESTONE, MILESTONE);
    els.farmStatus.textContent = farming
      ? `${MILESTONE - (c.session.kills % MILESTONE)} abates até o próximo marco`
      : 'Parado';
  }
  if (els.targetZone) els.targetZone.textContent = farming ? zone.name : '—';
  if (els.targetWave) {
    els.targetWave.textContent =
      farming && bossSize > 0
        ? c.target?.isBoss || toBoss === 0
          ? 'Boss ativo'
          : `${toBoss} até o boss`
        : farming
          ? 'Caça livre'
          : '—';
  }
  if (els.targetWaveFill) {
    els.targetWaveFill.style.width =
      farming && bossSize > 0 ? pct(wave, bossSize) : farming ? pct(c.session.kills % MILESTONE, MILESTONE) : '0%';
  }
  if (els.targetWaveValue) {
    els.targetWaveValue.textContent =
      farming && bossSize > 0
        ? `${fmt(wave)} / ${fmt(bossSize)}`
        : farming
          ? `${fmt(c.session.kills % MILESTONE)} / ${fmt(MILESTONE)}`
          : '0 / 0';
  }
  if (els.targetSessKills) els.targetSessKills.textContent = fmt(c.session.kills);
  if (els.targetSessXp) els.targetSessXp.textContent = fmt(c.session.xp);
  if (els.targetSessGold) els.targetSessGold.textContent = fmt(c.session.gold);
  refreshTargetCombatMeta();
  updateCombatFeedback(c);
  updateEventFarmLine();
  els.stopBtn.classList.toggle('hidden', !farming);

  renderZoneSelect();

  inventory.update(c);
  renderPetsPanel(c);
  scene.setHero(
    c.classId,
    c.currentHp,
    stats.maxHp,
    c.equipment,
    c.appearance,
    c.pets?.companionId || c.pets?.activeId || null,
  );
  if (zoneChanged) {
    scene.setZone(c.farmZoneId);
    if (audioUnlocked) c.farmZoneId ? playZoneMusic(c.farmZoneId) : stopMusic();
  }
  try {
    huntPerfUi.sync(c);
  } catch {
    /* painel opcional */
  }
}

function renderPetsPanel(c) {
  if (!els.petsList) return;
  const catalog = c?.pets?.catalog || [];
  const unlocked = catalog.filter((p) => p.unlocked);
  els.petsList.innerHTML = '';
  if (!unlocked.length) {
    if (els.petsEmpty) els.petsEmpty.classList.remove('hidden');
    return;
  }
  if (els.petsEmpty) els.petsEmpty.classList.add('hidden');
  for (const pet of unlocked) {
    const card = document.createElement('article');
    card.className = `pets-card${pet.active ? ' pets-card--active' : ''}`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <span class="pets-card__ico" aria-hidden="true">${PET_ICONS[pet.id] || '🐾'}</span>
      <div class="pets-card__body">
        <strong></strong>
        <small></small>
      </div>
      <button type="button" class="pets-card__act${pet.active ? ' pets-card__act--on' : ''}"></button>
    `;
    card.querySelector('strong').textContent = pet.name;
    card.querySelector('small').textContent = pet.description || '';
    const btn = card.querySelector('button');
    btn.textContent = pet.active ? 'Ativo' : 'Usar';
    btn.disabled = Boolean(pet.active);
    btn.addEventListener('click', async () => {
      if (pet.active) return;
      try {
        const data = await api('/api/me/pets', {
          method: 'PUT',
          body: JSON.stringify({ petId: pet.id }),
        });
        if (data.character) renderCharacter(data.character);
        else renderPetsPanel(data);
        if (data.message) toast(data.message);
        merchant.render();
      } catch (err) {
        pushLog([err.message]);
      }
    });
    els.petsList.appendChild(card);
  }
}

function renderWorld(world) {
  if (!world) return;
  if (els.onlineCount) els.onlineCount.textContent = fmt(world.online);
  // Lista "quem está na área" saiu da rail; mantém updates só se o markup legado existir.
  if (!els.zonePlayers) return;
  const zone = zoneById(character?.farmZoneId);
  const players = world.zonePlayers || [];
  if (els.zoneTabLabel) {
    els.zoneTabLabel.textContent = zone ? `${zone.name} · ${players.length + 1}` : 'Na área';
  }
  if (els.zoneMetaName) els.zoneMetaName.textContent = zone ? zone.name : 'Nenhuma área';
  if (els.zoneMetaCount) {
    els.zoneMetaCount.textContent = `${players.length + (zone ? 1 : 0)} na área`;
  }

  els.zonePlayers.innerHTML = '';
  if (!zone) {
    els.zonePlayers.innerHTML = '<li class="empty-row">Inicie uma caçada para ver quem está na área.</li>';
    return;
  }
  const className = (id) => meta.classes.find((c) => c.id === id)?.name || id;
  for (const p of [{ name: character.name, classId: character.classId, level: character.level, self: true }, ...players]) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="p-ico">♞</span>
      <div><strong></strong><small></small></div>
      <span class="p-lv">Lv. ${p.level}</span>`;
    li.querySelector('strong').textContent = p.self ? `${p.name} (você)` : p.name;
    li.querySelector('small').textContent = `${className(p.classId)} · caçando`;
    els.zonePlayers.appendChild(li);
  }
}

function zonesForSelect() {
  const chapterId = character?.currentChapterId || 'I';
  const list = meta.zones || [];
  return list.filter((z) => {
    if (z.trial) {
      if (z.mortalOnly) return !character?.ascension;
      if (z.requiresAscension) {
        const need = String(z.requiresAscension).toUpperCase();
        const have = String(character?.ascension || character?.classification || '').toUpperCase();
        if (need === 'CELESTIAL') return have === 'CELESTIAL' || have === 'DIVINO' || have === 'SEMIDEUS';
        if (need === 'DIVINO') return have === 'DIVINO' || have === 'SEMIDEUS';
        if (need === 'SEMIDEUS') return have === 'SEMIDEUS';
        return have === need;
      }
      return true;
    }
    if (z.chapterId) return z.chapterId === chapterId;
    return true;
  });
}

function zoneLockedReason(zone) {
  if (!character || !zone) return null;
  const chapterId = character.currentChapterId || 'I';
  if (zone.chapterId && !zone.trial && zone.chapterId !== chapterId) {
    return `Cap. ${zone.chapterId}`;
  }
  if (zone.requiresAscension) {
    const need = String(zone.requiresAscension).toUpperCase();
    const have = String(character.ascension || character.classification || '').toUpperCase();
    const ok =
      need === 'CELESTIAL'
        ? have === 'CELESTIAL' || have === 'DIVINO' || have === 'SEMIDEUS'
        : need === 'DIVINO'
          ? have === 'DIVINO' || have === 'SEMIDEUS'
          : have === need;
    if (!ok) return need;
  }
  if (zone.mortalOnly && character.ascension) {
    return 'só Mortal';
  }
  if (character.level < zone.minLevel) {
    return `Lv.${zone.minLevel}`;
  }
  return null;
}

let selectedZoneId = null;
let zoneSelectKey = null;

function resolveSelectedZoneId(preferred) {
  const zones = zonesForSelect();
  const current = preferred || selectedZoneId || character?.farmZoneId || zones[0]?.id;
  const selectable = zones.find((z) => z.id === current && !zoneLockedReason(z));
  const fallback = zones.find((z) => !zoneLockedReason(z)) || zones[0];
  return selectable ? current : fallback?.id || null;
}

function openZonesModal() {
  if (!els.zonesModal) return;
  zoneSelectKey = null;
  renderZoneSelect();
  els.zonesModal.classList.remove('hidden');
}

function closeZonesModal() {
  els.zonesModal?.classList.add('hidden');
}

function renderZoneSelect() {
  if (!els.zonesList) return;
  const key = `${character?.level}|${character?.farmZoneId}|${character?.ascension || ''}|${character?.currentChapterId || ''}|${selectedZoneId || ''}`;
  if (key === zoneSelectKey && els.zonesList.childElementCount) {
    syncStartFarmBtn();
    syncAutoRestartBtn(Boolean(character?.autoRestartFarm));
    syncArenaChrome();
    return;
  }
  zoneSelectKey = key;
  selectedZoneId = resolveSelectedZoneId(selectedZoneId);
  els.zonesList.innerHTML = '';
  for (const zone of zonesForSelect()) {
    const reason = zoneLockedReason(zone);
    const locked = Boolean(reason);
    const selected = zone.id === selectedZoneId;
    const farming = character?.farmZoneId === zone.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `idle-zones__item${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${farming ? ' is-farming' : ''}`;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.disabled = locked;
    btn.dataset.zoneId = zone.id;

    const main = document.createElement('span');
    main.className = 'idle-zones__item-main';
    const title = document.createElement('strong');
    title.textContent = zone.name;
    const sub = document.createElement('small');
    const band =
      zone.maxLevel != null && zone.maxLevel !== zone.minLevel
        ? `Lv. ${zone.minLevel}–${zone.maxLevel}`
        : `Lv. ${zone.minLevel}+`;
    sub.textContent = zone.trial ? `${band} · Ritual` : band;
    main.append(title, sub);

    const metaEl = document.createElement('span');
    metaEl.className = 'idle-zones__item-meta';
    if (farming) {
      const tag = document.createElement('span');
      tag.className = 'idle-zones__tag';
      tag.textContent = 'Caçando';
      metaEl.appendChild(tag);
    }
    const status = document.createElement('span');
    status.className = locked ? 'idle-zones__lock' : 'idle-zones__pick';
    status.textContent = locked ? reason : 'Escolher';
    metaEl.appendChild(status);

    btn.append(main, metaEl);
    if (!locked) {
      btn.addEventListener('click', () => {
        selectedZoneId = zone.id;
        zoneSelectKey = null;
        renderZoneSelect();
      });
    }
    els.zonesList.appendChild(btn);
  }
  syncStartFarmBtn();
  syncAutoRestartBtn(Boolean(character?.autoRestartFarm));
  syncArenaChrome();
}

function syncStartFarmBtn() {
  if (!els.startBtn) return;
  const duelBusy = duelState?.status === 'PENDING' || duelState?.status === 'ACTIVE';
  const inArena = Boolean(arenaState?.inArena || character?.arenaMode);
  const selected = selectedZoneId || resolveSelectedZoneId();
  const farming = Boolean(character?.farmZoneId);
  const sameZone = farming && character.farmZoneId === selected;
  if (!farming) {
    els.startBtn.textContent = 'Iniciar caça';
    els.startBtn.disabled = duelBusy || !selected;
    els.startBtn.title = duelBusy
      ? 'Duelo em andamento — caça bloqueada'
      : inArena
        ? 'Iniciar caça sai da Arena'
        : '';
    return;
  }
  if (sameZone) {
    els.startBtn.textContent = 'Nesta área';
    els.startBtn.disabled = true;
    els.startBtn.title = 'Escolha outra área na lista para trocar';
    return;
  }
  els.startBtn.textContent = 'Trocar área';
  els.startBtn.disabled = duelBusy;
  els.startBtn.title = duelBusy
    ? 'Duelo em andamento — caça bloqueada'
    : inArena
      ? 'Trocar área sai da Arena'
      : '';
}

function syncAutoRestartBtn(enabled) {
  if (!els.autoRestartBtn) return;
  els.autoRestartBtn.classList.toggle('is-on', enabled);
  els.autoRestartBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  els.autoRestartBtn.textContent = enabled ? 'Restart auto: on' : 'Restart auto: off';
}

const slotEls = {};
document.querySelectorAll('.equip-doll .slot[data-slot], .equip-grid .slot[data-slot]').forEach((el) => {
  slotEls[el.dataset.slot] = el;
});

const inventory = createInventoryUI({
  grid: els.invGrid,
  count: els.invCount,
  pageTabs: [...document.querySelectorAll('#inv-pages .tab')],
  filterTabs: [...document.querySelectorAll('#inv-filters [data-inv-filter]')],
  slots: slotEls,
  buttons: { sort: $('inv-sort'), junk: $('inv-junk'), sell: $('inv-sell') },
  onAction: itemAction,
  smartInvBody: $('smart-inv-body'),
  onPrefsSave: async (patch) => {
    try {
      const data = await api('/api/me/inventory-automation', {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      if (data.character) renderCharacter(data.character);
      toast(data.message || 'Preferências salvas', 2500);
      sfx('click');
    } catch (err) {
      toast(err.message, 3000);
    }
  },
});

$('inv-expand-btn')?.addEventListener('click', () => {
  $('merchant-btn')?.click();
});

async function itemAction(op, body) {
  try {
    if (op === 'divindade') {
      divindadeUi.open();
      sfx('click');
      return;
    }
    const data = await api(`/api/items/${op}`, { method: 'POST', body: JSON.stringify(body) });
    renderCharacter(data.character);
    if (op === 'equip') sfx('equip');
    else if (op === 'sell' || op === 'sell-junk') sfx('sell');
    else sfx('click');
    if (data.message) pushLog([data.message]);
  } catch (err) {
    toast(err.message, 2500);
  }
}

async function startFarm(zoneId) {
  try {
    const data = await api('/api/farm/start', {
      method: 'POST',
      body: JSON.stringify({ zoneId }),
    });
    if (data.arena) arenaState = { ...arenaState, ...data.arena };
    else arenaState = { ...arenaState, inArena: false };
    duelState = null;
    arenaDuelPresenting = false;
    renderCharacter(data.character);
    syncArenaChrome();
    syncArenaDuelFire();
    arenaUi.syncFromMe({ arena: arenaState, character: data.character, duel: null });
    scene.setMonster(data.character.target, true);
    const leftNote = data.leftArena ? ' (saiu da Arena)' : '';
    pushLog([`Iniciou caçada em ${data.zone.name}${leftNote}`]);
    if (data.leftArena) toast('Saiu da Arena e iniciou a caça', 3000);
  } catch (err) {
    pushLog([err.message]);
    toast(err.message, 3000);
  }
}

async function stopFarm() {
  try {
    const data = await api('/api/farm/stop', { method: 'POST', body: '{}' });
    renderCharacter(data.character);
    renderWorld({ online: Number(els.onlineCount.textContent) || 1, zonePlayers: [] });
    pushLog(['Combate parado']);
  } catch (err) {
    pushLog([err.message]);
  }
}

async function refresh() {
  const refreshSeq = offlineReport.beginRefresh();
  try {
    const data = await api('/api/me');
    const prevLevel = character?.level;
    const prevCharacterId = character?.id;
    if (data.world?.catalogRevision) {
      await syncCatalogThemes(data.world.catalogRevision);
    }
    if (data.arena) arenaState = { ...arenaState, ...data.arena };
    duelState = data.duel ?? null;
    if (prevCharacterId && data.character?.id && prevCharacterId !== data.character.id) {
      offlineReport.reset();
    }
    renderCharacter(data.character);
    renderWorld(data.world);
    if (data.engagement) applyEngagement(data.engagement);
    updateEventFarmLine();
    syncArenaDuelFire();
    arenaUi.syncFromMe({ arena: arenaState, character: data.character, duel: duelState });

    if (
      duelState?.status === 'PENDING' &&
      duelState.role === 'opponent' &&
      duelState.id !== lastPendingChallengeId
    ) {
      lastPendingChallengeId = duelState.id;
      toast(`${duelState.foe?.name || 'Alguém'} desafiou você na Arena!`, 5000);
      pushSessionFeed(`Desafio de ${duelState.foe?.name || 'oponente'}`, 'boss');
    }

    if (duelState?.status === 'FINISHED' && duelState.events?.length) {
      playDuelReplay(duelState);
    }

    const farm = data.farm;
    offlineReport.ingest(farm, data.character, refreshSeq);
    if (farm?.log?.length) pushLog(farm.log);
    if (prevLevel != null && data.character.level > prevLevel) {
      pushLog([`Subiu para o nível ${data.character.level}!`]);
      pushSessionFeed(`Nível ${data.character.level}`, 'level');
    }
    for (const ev of farm?.events || []) {
      if (ev.type === 'kill' && ev.isBoss) {
        pushSessionFeed(`Boss: ${ev.monster || 'derrotado'}`, 'boss');
      } else if (ev.type === 'drop' && ['rare', 'epic', 'legendary'].includes(ev.rarity)) {
        pushSessionFeed(`Drop ${ev.rarity}: ${ev.name}`, 'drop');
      } else if (ev.type === 'pet_equip') {
        pushSessionFeed(`Pet equipou ${ev.name}`, 'drop');
      } else if (ev.type === 'pet_sell' && ev.count > 0) {
        pushSessionFeed(`Pet vendeu ${ev.count} item(ns)`, 'drop');
      } else if (ev.type === 'potion' && ev.auto) {
        pushSessionFeed(`Auto poção +${ev.healed} HP`, 'drop');
      }
    }
    const bigDrop = (farm?.events || []).filter((e) => e.type === 'drop' && ['rare', 'epic', 'legendary'].includes(e.rarity)).pop();
    const offlineCatchUp = Boolean(farm?.catchUpId);
    if (bigDrop && !offlineCatchUp && !(farm?.rewardedMs > 60_000 || farm?.windowMs > 60_000)) {
      toast(`✦ Drop ${bigDrop.name}!`, 3500);
    }
    // Não misturar farm replay com duelo acabado de tocar
    if (!(duelState?.status === 'FINISHED' && duelState.id === lastPlayedDuelId && duelState.events?.length)) {
      scene.play(farm?.events, data.character.target);
    }
    if (arenaState?.inArena || data.character?.arenaMode) {
      if (els.activityName) els.activityName.textContent = 'Arena';
      if (els.activityDesc) els.activityDesc.textContent = 'Desafie jogadores online com aposta de gold';
      els.farmStatus.textContent = duelState?.status === 'PENDING'
        ? 'Aguardando resposta do duelo…'
        : 'Na Arena — caça pausada';
    }
    els.farmStatus.classList.remove('offline');
  } catch (err) {
    if (err.status === 401 || err.code === 'MAINTENANCE') {
      return;
    }
    els.farmStatus.textContent = 'Reconectando ao servidor…';
    els.farmStatus.classList.add('offline');
  }
}

function showGame() {
  els.gamePanel?.classList.remove('hidden');
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void refresh();
    void pollAnnouncements();
  }, POLL_MS);
}

function syncAudioControls() {
  const s = getAudioSettings();
  els.muteBtn.textContent = s.muted ? '🔇' : '🔊';
  els.sfxVol.value = s.sfx;
  els.musicVol.value = s.music;
}

function applyPanelCollapsed(cardSelector, toggle, label, storageKey, collapsed) {
  const card = document.querySelector(cardSelector);
  if (!card) return;
  card.dataset.collapsed = collapsed ? 'true' : 'false';
  if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  if (label) label.textContent = collapsed ? 'Mostrar' : 'Ocultar';
  try {
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function applyLogCollapsed(collapsed) {
  applyPanelCollapsed('.card--log', els.logToggle, els.logToggleLabel, LOG_COLLAPSE_KEY, collapsed);
}

function applyRailCollapsed(collapsed) {
  applyPanelCollapsed('.card--rail', els.railToggle, els.railToggleLabel, RAIL_COLLAPSE_KEY, collapsed);
}

function applyBagCollapsed(collapsed) {
  applyPanelCollapsed('.card--bag', els.bagToggle, els.bagToggleLabel, BAG_COLLAPSE_KEY, collapsed);
}

document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-tab]').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.tab));
    if (tab.dataset.tab === 'skills') openSkillsModal();
  });
});

els.areaBtn?.addEventListener('click', () => openZonesModal());
els.zonesModal?.querySelectorAll('[data-zones-close]').forEach((el) => {
  el.addEventListener('click', () => closeZonesModal());
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && els.zonesModal && !els.zonesModal.classList.contains('hidden')) {
    closeZonesModal();
  }
});

els.startBtn?.addEventListener('click', async () => {
  const zoneId = selectedZoneId || resolveSelectedZoneId();
  if (!zoneId) return;
  await startFarm(zoneId);
  if (character?.farmZoneId === zoneId) closeZonesModal();
});
els.stopBtn.addEventListener('click', () => stopFarm());
els.autoRestartBtn?.addEventListener('click', async () => {
  const next = !Boolean(character?.autoRestartFarm);
  try {
    const data = await api('/api/farm/auto-restart', {
      method: 'POST',
      body: JSON.stringify({ enabled: next }),
    });
    renderCharacter(data.character);
    syncAutoRestartBtn(Boolean(data.autoRestartFarm ?? data.character?.autoRestartFarm));
    pushLog([data.message || (next ? 'Restart automático ligado' : 'Restart automático desligado')]);
  } catch (err) {
    toast(err.message, 2500);
  }
});

async function investAttributePoints(key, amount) {
  const n = Math.max(1, Math.floor(Number(amount) || 0));
  if (!key || !(character?.unspentPoints >= n)) return;
  try {
    const body = { str: 0, int: 0, dex: 0, con: 0 };
    body[key] = n;
    const data = await api('/api/me/attributes', { method: 'POST', body: JSON.stringify(body) });
    renderCharacter(data.character);
    toast(`+${fmt(n)} ${key.toUpperCase()}`, 2500);
    sfx('level');
  } catch (err) {
    toast(err.message, 3000);
  }
}

document.querySelectorAll('.attr-plus').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.dataset.attr;
    const mode = btn.dataset.mode || 'fixed';
    const unspent = Math.max(0, Math.floor(Number(character?.unspentPoints) || 0));
    let amount = Math.max(1, Math.floor(Number(btn.dataset.amount) || 1));
    if (mode === 'max') {
      amount = unspent;
    } else if (mode === 'custom') {
      const input = btn
        .closest('.attr-row__actions')
        ?.querySelector(`.attr-custom-amount[data-attr="${key}"]`);
      amount = Math.floor(Number(input?.value) || 0);
      if (amount <= 0) {
        toast('Informe quantos pontos deseja investir', 2500);
        input?.focus();
        return;
      }
      if (amount > unspent) amount = unspent;
    }
    await investAttributePoints(key, amount);
  });
});

document.querySelectorAll('.attr-custom-amount').forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const key = input.dataset.attr;
    const applyBtn = input
      .closest('.attr-row__actions')
      ?.querySelector(`.attr-plus--apply[data-attr="${key}"]`);
    applyBtn?.click();
  });
});

let selectedSkillId = null;

function renderFarmBuffChip(c) {
  if (!els.farmBuffChip) return;
  const active = c?.skills?.active;
  if (active?.endsAt && Date.parse(active.endsAt) > Date.now()) {
    const name =
      c.skills.catalog?.find((s) => s.id === active.skillId)?.name || active.skillId;
    const left = formatSkillRemain(active.endsAt);
    els.farmBuffChip.textContent = left ? `Buff: ${name} · ${left}` : `Buff: ${name}`;
    els.farmBuffChip.classList.remove('hidden');
  } else {
    els.farmBuffChip.textContent = '';
    els.farmBuffChip.classList.add('hidden');
  }
}

function renderProgressHint(c) {
  if (!els.progressHint) return;
  const next = c?.divindade?.nextRitual;
  if (c?.divindade?.maxed) {
    els.progressHint.classList.add('hidden');
    return;
  }
  if (next && (c?.level || 0) >= 450) {
    els.progressHint.textContent = `Próximo: ${next.zoneHint} (MEGA BOSS) → Suco Divino → ${next.label} (10M gold) → Cap. ${next.unlocksChapter}.`;
    els.progressHint.classList.remove('hidden');
    return;
  }
  if (c?.ascension && c.level < 100) {
    els.progressHint.textContent =
      `${next?.from || 'Ascendido'}: +15% XP até o Lv.100. Progrida até o Lv.500 para o próximo ritual.`;
    els.progressHint.classList.remove('hidden');
    return;
  }
  if ((c?.level || 0) >= 450 && !c?.ascension) {
    els.progressHint.textContent =
      'Próximo: Prova Divina (MEGA BOSS) → Suco Divino → Ritual Celestial (10M gold).';
    els.progressHint.classList.remove('hidden');
  } else {
    els.progressHint.classList.add('hidden');
  }
}

function renderDivindadeNav(c) {
  const eligible = Boolean(c?.divindade?.eligible);
  const maxed = Boolean(c?.divindade?.maxed);
  els.divindadeBtn?.classList.toggle('is-muted', !eligible && !maxed);
  if (els.divindadeBadge) {
    els.divindadeBadge.classList.toggle('hidden', !eligible);
  }
}

function syncAutoHpPotionUi(c) {
  const cfg = c?.autoHpPotion || {};
  if (els.autoHpPotion) els.autoHpPotion.checked = Boolean(cfg.enabled);
  if (els.autoHpPotionPct && document.activeElement !== els.autoHpPotionPct) {
    els.autoHpPotionPct.value = String(cfg.thresholdPct ?? 40);
  }
}

let combatCdTicker = null;

function stopCombatCdTicker() {
  if (combatCdTicker) {
    clearInterval(combatCdTicker);
    combatCdTicker = null;
  }
}

function tickCombatSkillCdDom() {
  const nodes = els.combatSkillSlots?.querySelectorAll('.combat-skill-slot__cd[data-cd-ends]');
  if (!nodes?.length) {
    stopCombatCdTicker();
    return;
  }
  const now = Date.now();
  let anyLive = false;
  let needsRefresh = false;
  nodes.forEach((el) => {
    const ends = Number(el.dataset.cdEnds) || 0;
    const total = Math.max(1, Number(el.dataset.cdTotal) || 1);
    const remain = Math.max(0, ends - now);
    const p = Math.min(1, remain / total);
    el.style.setProperty('--cd-p', p.toFixed(4));
    const text = el.querySelector('.combat-skill-slot__cd-text');
    if (text) text.textContent = String(Math.max(0, Math.ceil(remain / 1000)));
    el.setAttribute('aria-label', `Cooldownoldown ${Math.ceil(remain / 1000)}s`);
    if (remain > 0) anyLive = true;
    else needsRefresh = true;
  });
  if (!anyLive) {
    stopCombatCdTicker();
    if (needsRefresh && character) renderCombatSkillBar(character);
  }
}

function startCombatCdTicker() {
  if (combatCdTicker) return;
  combatCdTicker = setInterval(tickCombatSkillCdDom, 100);
}

function renderCombatSkillBar(c) {
  if (!els.combatSkillSlots) return;
  const cs = c?.combatSkills;
  const catalog = cs?.catalog || [];
  if (els.combatAutoCast) {
    els.combatAutoCast.checked = Boolean(cs?.autoCast);
  }
  syncAutoHpPotionUi(c);
  if (!catalog.length) {
    stopCombatCdTicker();
    els.combatSkillSlots.innerHTML = Array.from({ length: 9 }, () =>
      `<button type="button" class="combat-skill-slot combat-skill-slot--locked" disabled aria-label="Skill bloqueada">
        <span class="combat-skill-slot__icon" aria-hidden="true">·</span>
        <span class="combat-skill-slot__cost">—</span>
      </button>`
    ).join('');
    return;
  }
  const now = Date.now();
  let hasCd = false;
  els.combatSkillSlots.innerHTML = catalog
    .map((s) => {
      const remainMs = Math.max(0, Number(s.cooldownRemainingMs) || 0);
      const totalMs = Math.max(1, Number(s.cooldownMs) || 1);
      const cdSec = Math.ceil(remainMs / 1000);
      const locked = !s.unlocked;
      const onCd = remainMs > 0;
      const cdP = Math.min(1, Math.max(0, remainMs / totalMs));
      const cdEnds = onCd ? now + remainMs : 0;
      if (onCd) hasCd = true;
      const costLabel = s.resource === 'rage' ? `${s.cost} F` : `${s.cost} MP`;
      return `<button type="button" class="combat-skill-slot${locked ? ' combat-skill-slot--locked' : ''}${onCd ? ' is-cooldown' : ''}" data-combat-skill="${s.id}" title="${s.name}: ${s.description}" ${locked || onCd ? 'disabled' : ''}>
        <span class="combat-skill-slot__icon" aria-hidden="true">${combatSkillGlyph(s)}</span>
        ${
          onCd
            ? `<span class="combat-skill-slot__cd" style="--cd-p:${cdP.toFixed(4)}" data-cd-ends="${cdEnds}" data-cd-total="${totalMs}" aria-label="Cooldownoldown ${cdSec}s">
          <span class="combat-skill-slot__cd-sweep" aria-hidden="true"></span>
          <span class="combat-skill-slot__cd-text">${cdSec}</span>
        </span>`
            : ''
        }
        <span class="combat-skill-slot__cost">${locked ? `Lv${s.unlockLevel}` : costLabel}</span>
      </button>`;
    })
    .join('');
  if (hasCd) startCombatCdTicker();
  else stopCombatCdTicker();
}

function formatSkillRemain(iso) {
  if (!iso) return '';
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s ? ` ${s}s` : ''}`;
}

function skillEffectLabel(effect) {
  if (effect === 'xp') return 'XP';
  if (effect === 'gold') return 'Ouro';
  return 'Dano';
}

function skillEffectIcon(effect, skillId) {
  const art = skillId && FARM_SKILL_ICON[skillId];
  if (art) return hudGlyph(art);
  if (effect === 'xp') return hudGlyph(`${HUD_ICON}/ui-xp.svg`);
  if (effect === 'gold') return hudGlyph(`${HUD_ICON}/ui-sell.svg`);
  return hudGlyph(`${HUD_ICON}/slot-weapon.svg`);
}

function isSkillsModalOpen() {
  return Boolean(els.skillsModal && !els.skillsModal.classList.contains('hidden'));
}

function openSkillsModal() {
  if (!els.skillsModal) return;
  if (character) {
    ensureSelectedSkill(character);
    renderSkills(character);
  }
  els.skillsModal.classList.remove('hidden');
}

function closeSkillsModal() {
  els.skillsModal?.classList.add('hidden');
}

function ensureSelectedSkill(c) {
  const catalog = c?.skills?.catalog || [];
  if (!catalog.length) {
    selectedSkillId = null;
    return;
  }
  if (selectedSkillId && catalog.some((s) => s.id === selectedSkillId)) return;
  const active = c?.skills?.active;
  const activeLive =
    active?.endsAt && Date.parse(active.endsAt) > Date.now();
  if (activeLive && active?.skillId) {
    selectedSkillId = active.skillId;
    return;
  }
  const unspent = c?.skills?.unspent || 0;
  const buyable = catalog.find(
    (s) => !s.unlocked && !s.lockedByOrder && unspent >= s.cost,
  );
  selectedSkillId = buyable?.id || catalog[0].id;
}

function skillNodeState(s, activeId, activeLive) {
  const cdLeft = formatSkillRemain(s.cooldownUntil);
  if (activeLive && activeId === s.id) return { cls: 'skill-node--active', cdLeft: '' };
  if (s.unlocked && cdLeft) return { cls: 'skill-node--cooldown', cdLeft };
  if (s.unlocked) return { cls: 'skill-node--unlocked', cdLeft: '' };
  if (s.lockedByOrder) return { cls: 'skill-node--locked', cdLeft: '' };
  return { cls: 'skill-node--available', cdLeft: '' };
}

function renderSkillDetail(c) {
  if (!els.skillDetail) return;
  const skills = c?.skills;
  const catalog = skills?.catalog || [];
  const selected = catalog.find((s) => s.id === selectedSkillId);
  if (!selected) {
    els.skillDetail.innerHTML =
      '<p class="skill-detail__empty muted">Selecione uma skill na árvore.</p>';
    return;
  }
  const unspent = skills?.unspent || 0;
  const activeId = skills?.active?.skillId;
  const activeLive =
    skills?.active?.endsAt && Date.parse(skills.active.endsAt) > Date.now();
  const cdLeft = formatSkillRemain(selected.cooldownUntil);
  const onCd = Boolean(cdLeft);
  const canBuy =
    !selected.unlocked && !selected.lockedByOrder && unspent >= selected.cost;
  const canActivate = selected.unlocked && !onCd && !activeLive;
  const effectLabel = skillEffectLabel(selected.effect);
  let action = '';
  if (!selected.unlocked) {
    action = `<button type="button" class="btn btn--small btn--gold skill-buy" data-skill-id="${selected.id}" ${canBuy ? '' : 'disabled'}>Comprar (${selected.cost})</button>`;
  } else {
    const label =
      onCd
        ? `CD ${cdLeft}`
        : activeLive && activeId === selected.id
          ? 'Ativo'
          : 'Ativar';
    action = `<button type="button" class="btn btn--small btn--gold skill-activate" data-skill-id="${selected.id}" ${canActivate ? '' : 'disabled'}>${label}</button>`;
  }
  const buffLeft =
    activeLive && activeId === selected.id
      ? formatSkillRemain(skills.active.endsAt)
      : '';
  let meta = '';
  if (selected.unlocked) {
    if (buffLeft) meta = `Buff ativo · ${buffLeft} restantes`;
    else if (onCd) meta = `Em cooldown · ${cdLeft}`;
    else if (activeLive && activeId !== selected.id) meta = 'Outro buff está ativo — aguarde terminar';
    else meta = 'Desbloqueada · pronta para ativar';
  } else if (selected.lockedByOrder) {
    meta = 'Compre a skill anterior primeiro';
  } else if (unspent < selected.cost) {
    meta = `Custo: ${selected.cost} ponto(s) · você tem ${unspent}`;
  } else {
    meta = `Custo: ${selected.cost} ponto(s) de skill`;
  }
  els.skillDetail.innerHTML = `
    <div class="skill-detail__head">
      <strong>${selected.order}. ${selected.name}</strong>
      <span class="skill-detail__tag">${effectLabel} ×${selected.mult}</span>
    </div>
    <p class="skill-detail__desc">${selected.description}</p>
    <p class="skill-detail__meta">${meta}</p>
    <div class="skill-detail__actions">${action}</div>
  `;
}

function renderSkills(c) {
  const skills = c?.skills;
  const unspent = skills?.unspent ?? 0;
  if (els.skillPointsValue) {
    els.skillPointsValue.textContent = fmt(unspent);
  }
  if (els.skillPointsModal) {
    els.skillPointsModal.textContent = fmt(unspent);
  }
  if (els.skillsActive) {
    const active = skills?.active;
    if (active?.endsAt && Date.parse(active.endsAt) > Date.now()) {
      const name =
        skills.catalog?.find((s) => s.id === active.skillId)?.name || active.skillId;
      const left = formatSkillRemain(active.endsAt);
      els.skillsActive.textContent = left
        ? `Buff ativo: ${name} (${left})`
        : `Buff ativo: ${name}`;
      els.skillsActive.classList.remove('hidden');
    } else {
      els.skillsActive.textContent = '';
      els.skillsActive.classList.add('hidden');
    }
  }

  if (!els.skillTree) return;
  ensureSelectedSkill(c);
  const catalog = [...(skills?.catalog || [])].sort((a, b) => a.order - b.order);
  const activeId = skills?.active?.skillId;
  const activeLive =
    skills?.active?.endsAt && Date.parse(skills.active.endsAt) > Date.now();

  const parts = [];
  catalog.forEach((s, i) => {
    if (i > 0) {
      const prev = catalog[i - 1];
      parts.push(
        `<div class="skill-tree__edge${prev.unlocked ? ' skill-tree__edge--lit' : ''}" aria-hidden="true"></div>`,
      );
    }
    const { cls, cdLeft } = skillNodeState(s, activeId, activeLive);
    const selected = selectedSkillId === s.id ? ' skill-node--selected' : '';
    const icoClass = `skill-node__ico skill-node__ico--${s.effect}`;
    const cdAttr = cdLeft ? ` data-cd="${cdLeft}"` : '';
    parts.push(`
      <div class="skill-tree__row" role="listitem">
        <button type="button" class="skill-node ${cls}${selected}" data-skill-id="${s.id}" title="${s.name}"${cdAttr} aria-pressed="${selectedSkillId === s.id}">
          <span class="${icoClass}" aria-hidden="true">${skillEffectIcon(s.effect, s.id)}</span>
          <span class="skill-node__order">${s.order}</span>
        </button>
      </div>
    `);
  });
  els.skillTree.innerHTML = parts.join('') || '<p class="skill-detail__empty muted">Nenhuma skill nesta classe.</p>';
  renderSkillDetail(c);
}

async function postSkillAction(skillId, buy) {
  const path = buy ? '/api/me/skills/unlock' : '/api/me/skills/activate';
  const data = await api(path, {
    method: 'POST',
    body: JSON.stringify({ skillId }),
  });
  selectedSkillId = skillId;
  renderCharacter(data.character);
  toast(data.message || (buy ? 'Skill comprada' : 'Skill ativada'), 2800);
  sfx('level');
}

els.skillsOpenBtn?.addEventListener('click', () => openSkillsModal());
els.huntPerfOpenBtn?.addEventListener('click', () => {
  try {
    huntPerfUi.open();
  } catch (err) {
    console.warn('[idle] painel desempenho', err);
  }
});

els.skillsModal?.addEventListener('click', async (e) => {
  if (e.target.closest('[data-skills-close]')) {
    closeSkillsModal();
    return;
  }
  const node = e.target.closest('.skill-node');
  if (node?.dataset.skillId) {
    selectedSkillId = node.dataset.skillId;
    if (character) renderSkills(character);
    return;
  }
  const buy = e.target.closest('.skill-buy');
  const act = e.target.closest('.skill-activate');
  const btn = buy || act;
  if (!btn || btn.disabled) return;
  const skillId = btn.dataset.skillId;
  if (!skillId) return;
  try {
    btn.disabled = true;
    await postSkillAction(skillId, Boolean(buy));
  } catch (err) {
    toast(err.message, 3200);
    if (character) renderSkills(character);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isSkillsModalOpen()) closeSkillsModal();
});

els.ascendBtn?.addEventListener('click', () => {
  divindadeUi.open();
});

els.combatSkillSlots?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-combat-skill]');
  if (!btn || btn.disabled) return;
  const skillId = btn.dataset.combatSkill;
  if (!skillId) return;
  try {
    btn.disabled = true;
    const data = await api('/api/me/combat-skills/cast', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    });
    renderCharacter(data.character);
    toast(data.message || 'Skill pronta', 2200);
    sfx('click');
  } catch (err) {
    toast(err.message, 2800);
    if (character) renderCombatSkillBar(character);
  }
});

els.combatAutoCast?.addEventListener('change', async () => {
  const enabled = Boolean(els.combatAutoCast.checked);
  try {
    const data = await api('/api/me/combat-skills/auto-cast', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
    renderCharacter(data.character);
    toast(data.message || (enabled ? 'Auto-usar ligado' : 'Auto-usar desligado'), 2500);
  } catch (err) {
    els.combatAutoCast.checked = !enabled;
    toast(err.message, 2800);
  }
});

async function saveAutoHpPotion(partial) {
  const data = await api('/api/me/auto-hp-potion', {
    method: 'POST',
    body: JSON.stringify(partial),
  });
  renderCharacter(data.character);
  return data;
}

els.autoHpPotion?.addEventListener('change', async () => {
  const enabled = Boolean(els.autoHpPotion.checked);
  try {
    const data = await saveAutoHpPotion({ enabled });
    toast(data.message || (enabled ? 'Auto poção ligada' : 'Auto poção desligada'), 2500);
  } catch (err) {
    els.autoHpPotion.checked = !enabled;
    toast(err.message, 2800);
  }
});

els.autoHpPotionPct?.addEventListener('change', async () => {
  const thresholdPct = Number(els.autoHpPotionPct.value);
  try {
    const data = await saveAutoHpPotion({ thresholdPct });
    toast(data.message || `Auto poção: ≤ ${data.autoHpPotion?.thresholdPct ?? thresholdPct}% HP`, 2500);
  } catch (err) {
    syncAutoHpPotionUi(character);
    toast(err.message, 2800);
  }
});

let announceSince = new Date().toISOString();
async function pollAnnouncements() {
  try {
    const data = await api(`/api/announcements?since=${encodeURIComponent(announceSince)}`);
    const list = data.announcements || [];
    for (const row of list.reverse()) {
      toast(`✦ ${row.userName} dropou ${row.itemName} (${row.rarity})!`, 5000);
      announceSince = row.at;
    }
  } catch {
    /* ignore */
  }
}

document.addEventListener('visibilitychange', () => {
  syncArenaDuelFire();
});

function goToLobby() {
  window.parent?.postMessage({ type: 'jogo-idle:leave' }, window.location.origin);
  window.location.assign('/jogo-idle/lobby.html');
}

els.logoutBtn?.addEventListener('click', goToLobby);
els.lobbyBtn?.addEventListener('click', goToLobby);

$('cronicas-btn')?.addEventListener('click', () => {
  window.location.assign('/jogo-idle/cronicas.html');
});

$('galeria-btn')?.addEventListener('click', () => {
  window.location.assign('/jogo-idle/galeria.html');
});

els.logToggle?.addEventListener('click', () => {
  const card = document.querySelector('.card--log');
  applyLogCollapsed(card?.dataset.collapsed !== 'true');
});

els.railToggle?.addEventListener('click', () => {
  const card = document.querySelector('.card--rail');
  applyRailCollapsed(card?.dataset.collapsed !== 'true');
});

els.bagToggle?.addEventListener('click', () => {
  const card = document.querySelector('.card--bag');
  applyBagCollapsed(card?.dataset.collapsed !== 'true');
});

els.muteBtn.addEventListener('click', () => {
  setAudioSettings({ muted: !getAudioSettings().muted });
  syncAudioControls();
});
els.sfxVol.addEventListener('input', () => setAudioSettings({ sfx: Number(els.sfxVol.value) }));
els.sfxVol.addEventListener('change', () => sfx('hit'));
els.musicVol.addEventListener('input', () => setAudioSettings({ music: Number(els.musicVol.value) }));

document.addEventListener('pointerdown', () => {
  unlockAudio();
  if (!audioUnlocked) {
    audioUnlocked = true;
    if (character?.farmZoneId) playZoneMusic(character.farmZoneId);
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && btn !== els.muteBtn && !btn.disabled) sfx('click');
});

async function boot() {
  syncAudioControls();
  try {
    const storedLog = localStorage.getItem(LOG_COLLAPSE_KEY);
    applyLogCollapsed(storedLog == null ? true : storedLog === '1');
    const storedRail = localStorage.getItem(RAIL_COLLAPSE_KEY);
    applyRailCollapsed(storedRail === '1');
    const storedBag = localStorage.getItem(BAG_COLLAPSE_KEY);
    applyBagCollapsed(storedBag === '1');
  } catch {
    applyLogCollapsed(true);
    applyRailCollapsed(false);
    applyBagCollapsed(false);
  }

  const loadCore = (async () => {
    meta = await api('/api/meta');
    catalogRevision = meta.catalogRevision || null;
    if (meta.merchant) merchant.render();
    applyZoneThemesFromZones(meta.zones);
    showGame();
    await scene.ready;
    await refresh();
  })();

  // Primeiro /api/me via refresh alimenta playIntro; para a intro precisamos
  // do payload cedo — fazemos um me leve em paralelo se ainda não houver character.
  const introReady = loadCore.then(() => true);

  let introPayload = character?.playIntro || null;
  if (!introPayload) {
    try {
      const early = await api('/api/me');
      if (early?.character) {
        character = early.character;
        introPayload = early.character.playIntro || null;
        if (early.character.currentChapterId) {
          applyChapterFrame(early.character.currentChapterId);
        }
      }
      if (early?.meta?.zones) {
        meta = { ...(meta || {}), ...early.meta, zones: early.meta.zones || meta?.zones };
      }
    } catch {
      /* intro usa fallback */
    }
  }

  const payload = introPayload || {
    chapterId: document.body.dataset.chapter || 'I',
    chapterNumber: document.body.dataset.chapter || 'I',
    chapterName: 'Jogo IDLE',
    bgUrl: '/jogo-idle/assets/chapters/bg-cap-I.png',
    introLine: '',
    regionName: null,
  };

  try {
    await runPlayIntro({ payload, ready: introReady });
  } catch (err) {
    console.warn('[jogo-idle] play intro', err);
    document.body.classList.remove('play-intro-pending', 'play-intro-hud-enter');
    document.body.classList.add('play-intro-done');
    await introReady.catch(() => {});
  }
}

boot();
