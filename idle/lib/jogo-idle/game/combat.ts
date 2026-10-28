// @ts-nocheck
import {
  ZONES,
  buildZoneBoss,
  monsterDefense,
  zoneBossWaveSize,
  findZone,
  resolveZoneId,
} from './data';
import { applyRewards, ensureCombatReady, computeStats, tryAutoHpPotion } from './character';
import { careerAddKills, careerAddPlayMs } from './career';
import { applyJourneyEvent, ensureJourney } from './journey';
import {
  getDropChance,
  getHpPotionDropChance,
  getManaPotionDropChance,
  rollDrop,
  publicItem,
  createItem,
  REFINER_TEMPLATE_ID,
  SUCO_CELESTIAL_TEMPLATE_ID,
  getTemplate,
} from './items';
import { ingestLootWithPets, sellWrongClassItems } from './inventory';
import { petHas, ensurePets } from './pets';
import { getBalance, PROVA_DIVINA_ZONE_ID } from './balance';
import { ensureChapters, meetsAscensionRequirement } from './chapters';
import { maintenanceSkippedMs } from './maintenance';
import { getSkillFarmMults } from './skills';
import {
  ensureCombatSkills,
  pickCombatSkillForTick,
  executeCombatSkill,
  regenMpTick,
  gainRage,
  decayRageOnStop,
  RAGE_ON_HIT,
  RAGE_ON_HURT,
  MAGE_BASIC_ATTACK_MULT,
} from './combat-skills';
import { ensureHuntPerf, resetHuntPerf } from '../hunt-perf';

const MAX_EVENTS = 40;

/** RNG injetável (testes determinísticos). Default = Math.random. */
function resolveRng(options) {
  return typeof options?.rng === 'function' ? options.rng : Math.random;
}

function pickNormalMonster(zone, rng = Math.random) {
  const list = zone.monsters;
  const monster = { ...list[Math.floor(rng() * list.length)] };
  monster.defense = monsterDefense(monster);
  monster.isBoss = false;
  return monster;
}

function pickBoss(zone) {
  return { ...buildZoneBoss(zone) };
}

function shouldSpawnBoss(character, zone) {
  const wave = Math.max(0, Math.floor(Number(character.farmWaveKills) || 0));
  return wave >= zoneBossWaveSize(zone);
}

function pickMonster(zone, character, rng = Math.random) {
  if (shouldSpawnBoss(character, zone)) {
    return pickBoss(zone);
  }
  return pickNormalMonster(zone, rng);
}

function spawnEvent(target) {
  const m = target.monster;
  return {
    type: 'spawn',
    monster: m.name,
    level: m.level,
    monsterHp: target.monsterHp,
    monsterMaxHp: m.hp,
    attack: m.attack,
    defense: monsterDefense(m),
    isBoss: Boolean(m.isBoss),
  };
}

function currentTarget(character, zone, rng = Math.random) {
  const c = character.combat;
  if (c && c.zoneId === zone.id && c.monsterHp > 0) return c;
  const monster = pickMonster(zone, character, rng);
  if (monster.isBoss) {
    // Consome a onda ao trazer o chefe; se o farm cair no meio, não reaparece na hora.
    character.farmWaveKills = 0;
  }
  character.combat = {
    zoneId: zone.id,
    monster,
    monsterHp: monster.hp,
    fightElapsedMs: 0,
  };
  character.combat._journeyEncounterStarted = false;
  return character.combat;
}

/** Resultado vazio / sem catch-up relevante. Campos extras alimentam o Relatório de Caça Offline. */
function emptyResult(log = []) {
  return {
    ticks: 0,
    kills: 0,
    xpGained: 0,
    goldGained: 0,
    log,
    events: [],
    drops: 0,
    dropsKept: 0,
    dropsAutoSold: 0,
    windowMs: 0,
    elapsedSinceLastMs: 0,
    rewardedMs: 0,
    zoneId: null,
    zoneName: null,
    levelBefore: null,
    levelAfter: null,
    bossKills: 0,
    faints: 0,
    eventsTruncated: false,
    catchUpId: null,
    catchUpPending: false,
  };
}

function finalizeFarmResult(base, extras = {}) {
  return { ...emptyResult(), ...base, ...extras };
}

/**
 * Processa o idle offline/online no servidor.
 * O cliente só pede "start/stop farm"; ouro/XP saem daqui.
 * `events` é só para o cliente reproduzir animações — não tem efeito no estado.
 *
 * Após `zoneBossWaveSize` kills de mobs comuns na sessão (override admin ou 2× mobs), o próximo alvo é o
 * boss da macro (HP = soma dos mobs; ATK/DEF reforçados).
 *
 * `options.xpMult` / `goldMult` / `dropMult` vêm só do servidor (engajamento).
 * `options.rng` — função [0,1) injetável (default Math.random); não mockar global.
 */
export function processFarm(character, now = Date.now(), options = {}) {
  if (!character.farmZoneId) return emptyResult();

  const rng = resolveRng(options);
  const skillMults = getSkillFarmMults(character, now);
  const xpMult =
    (Number(options.xpMult) > 0 ? Number(options.xpMult) : 1) * (skillMults.xpMult || 1);
  const goldMult =
    (Number(options.goldMult) > 0 ? Number(options.goldMult) : 1) * (skillMults.goldMult || 1);
  const dropMult = Number(options.dropMult) > 0 ? Number(options.dropMult) : 1;
  const damageMult = skillMults.damageMult > 0 ? skillMults.damageMult : 1;

  const resolvedFarmId = resolveZoneId(character.farmZoneId);
  if (resolvedFarmId && resolvedFarmId !== character.farmZoneId) {
    character.farmZoneId = resolvedFarmId;
  }
  const zone = findZone(character.farmZoneId) || ZONES.find((z) => z.id === character.farmZoneId);
  if (!zone) {
    character.farmZoneId = null;
    return emptyResult();
  }

  const chapters = ensureChapters(character);
  if (zone.chapterId && !zone.trial && zone.chapterId !== chapters.currentChapterId) {
    character.farmZoneId = null;
    character.farmStartedAt = null;
    character.lastTickAt = null;
    character.combat = null;
    return emptyResult([`${zone.name} pertence a outro capítulo`]);
  }

  if (character.level < zone.minLevel) {
    character.farmZoneId = null;
    character.farmStartedAt = null;
    character.lastTickAt = null;
    character.combat = null;
    return emptyResult([`Nível insuficiente para ${zone.name}`]);
  }

  if (!Number.isFinite(character.farmWaveKills)) character.farmWaveKills = 0;

  const stats = ensureCombatReady(character);
  let last = character.lastTickAt
    ? Date.parse(character.lastTickAt)
    : character.farmStartedAt
      ? Date.parse(character.farmStartedAt)
      : now;

  if (Number.isNaN(last)) last = now;

  const levelBefore = character.level;
  const elapsedSinceLastMs = Math.max(0, now - last);
  // Manutenção não gera caça: o intervalo travado sai do elapsed antes do teto de 2h.
  const maintenanceSkipMs = maintenanceSkippedMs(last, now);
  // Limite anti-abuso: no máximo 2h de progresso por request
  const maxCatchUpMs = 2 * 60 * 60 * 1000;
  const elapsed = Math.min(Math.max(0, elapsedSinceLastMs - maintenanceSkipMs), maxCatchUpMs);
  const RELEVANT_CATCHUP_MS = 60_000;

  // ID estável da recuperação: fixo no 1º chunk (baseado no lastTickAt de abertura).
  if (elapsed >= RELEVANT_CATCHUP_MS) {
    if (!character.offlineCatchUpId) {
      character.offlineCatchUpId = `${character.id}:${last}`;
    }
  }
  const catchUpId = character.offlineCatchUpId || null;
  // Recuperação offline (Etapa 1) não alimenta o painel de desempenho online.
  const trackHunt = !catchUpId;
  const perf = trackHunt ? ensureHuntPerf(character, zone) : null;
  if (perf && !perf.zoneId) {
    perf.zoneId = zone.id;
    perf.zoneName = zone.name;
  }

  ensureJourney(character);
  applyJourneyEvent(character, { source: 'farm', type: 'zone_visit', zoneId: zone.id });
  if (catchUpId) {
    applyJourneyEvent(character, {
      source: 'farm',
      type: 'offline_catchup_begin',
      catchUpId,
    });
  }

  let remaining = elapsed;
  let ticks = 0;
  let kills = 0;
  let bossKills = 0;
  let faints = 0;
  let xpGained = 0;
  let goldGained = 0;
  let dropsKept = 0;
  let dropsAutoSold = 0;
  let eventsTruncated = false;
  const log = [];
  const events = [];
  const drops = [];
  const pushEvent = (e) => {
    events.push({ t: elapsed - remaining, ...e });
    if (events.length > MAX_EVENTS) {
      events.shift();
      eventsTruncated = true;
    }
  };
  const noteDropIngest = (result, item) => {
    if (result?.added || result?.equippedDirect) dropsKept += 1;
    else if (result && !result.held && Number(result.gold) > 0) {
      dropsAutoSold += 1;
      if (perf) perf.goldDropSold += Number(result.gold) || 0;
    }
    if (item && !result?.held) {
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'item_found',
        rarity: item.rarity || 'common',
      });
      if (!result?.added && !result?.equippedDirect && Number(result?.gold) > 0) {
        applyJourneyEvent(character, {
          source: 'farm',
          type: 'gold_sell',
          amount: result.gold,
        });
        applyJourneyEvent(character, { source: 'farm', type: 'item_sold', count: 1 });
      }
    }
  };
  const notePetSellGold = (gold, count = 1) => {
    if (perf && Number(gold) > 0) perf.goldPetSell += Number(gold) || 0;
    if (Number(gold) > 0) {
      applyJourneyEvent(character, { source: 'farm', type: 'gold_sell', amount: gold });
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'item_sold',
        count: Math.max(1, Math.floor(Number(count) || 1)),
      });
    }
  };
  const applyOutgoingDamage = (rawDmg) => {
    const hpBefore = Number.isFinite(target.monsterHp) ? target.monsterHp : 0;
    const safeRaw = Number.isFinite(rawDmg) ? Math.max(0, rawDmg) : 0;
    const applied = Math.min(safeRaw, Math.max(0, hpBefore));
    target.monsterHp = Math.max(0, hpBefore - safeRaw);
    if (!Number.isFinite(target.monsterHp)) target.monsterHp = 0;
    if (perf && applied > 0) perf.damageDealt += applied;
    return applied;
  };

  // Gato/papagaio: limpa fora da classe conforme prefs (sellWrongClassItems no-op sem pet/prefs).
  {
    const cleaned = sellWrongClassItems(character);
    if (cleaned.count > 0) {
      notePetSellGold(cleaned.gold, cleaned.count);
      pushEvent({
        type: 'pet_sell',
        count: cleaned.count,
        gold: cleaned.gold,
        petId: ensurePets(character).activeId,
      });
      log.push(`🐾 Pet vendeu ${cleaned.count} item(ns) (+${cleaned.gold} gold)`);
    }
  }

  let target = currentTarget(character, zone, rng);
  if (target && !Number.isFinite(target.fightElapsedMs)) target.fightElapsedMs = 0;
  if (target && !Number.isFinite(target.monsterHp)) target.monsterHp = 0;
  const critChance = stats.critChance;
  ensureCombatSkills(character);

  // 5000 evita request infinito; catch-up longo continua no próximo /me (catchUpPending).
  const maxTicks =
    Number(options.maxTicks) > 0 ? Math.floor(Number(options.maxTicks)) : 5000;
  while (remaining >= stats.attackIntervalMs && ticks < maxTicks) {
    const tickMs = stats.attackIntervalMs;
    remaining -= tickMs;
    ticks += 1;
    careerAddPlayMs(character, tickMs);
    applyJourneyEvent(character, { source: 'farm', type: 'play_ms', ms: tickMs });

    if (target && !target._journeyEncounterStarted) {
      target._journeyEncounterStarted = true;
      // Retomada de encontro já em andamento: não conta battlesStarted de novo.
      if ((Number(target.fightElapsedMs) || 0) === 0) {
        applyJourneyEvent(character, {
          source: 'farm',
          type: 'encounter_start',
          enemyName: target.monster?.name,
          zoneId: zone.id,
          isBoss: Boolean(target.monster?.isBoss),
          online: trackHunt,
          catchUpId,
        });
      }
    }

    if (perf) {
      perf.huntMs += tickMs;
      if (character.combat && character.combat.monsterHp > 0) {
        character.combat.fightElapsedMs = (Number(character.combat.fightElapsedMs) || 0) + tickMs;
        perf.combatMs += tickMs;
      }
    } else if (character.combat) {
      // Offline: zera cronômetro local para não misturar TTK online após o catch-up.
      character.combat.fightElapsedMs = 0;
    }

    regenMpTick(character, stats);
    Object.assign(stats, computeStats(character));

    const skillDef = pickCombatSkillForTick(character, now - remaining);
    let usedSkill = false;

    if (skillDef) {
      const cast = executeCombatSkill(character, skillDef, target, stats, now - remaining, {
        rng,
      });
      if (cast.ok) {
        usedSkill = true;
        pushEvent({
          type: 'skill_cast',
          skillId: skillDef.id,
          name: skillDef.name,
          vfx: cast.vfx,
          sfx: cast.sfx,
          resource: cast.spent.resource,
          resourceLeft: cast.spent.left,
        });
        for (const hit of cast.hits) {
          const applied = applyOutgoingDamage(hit.dmg);
          applyJourneyEvent(character, {
            source: 'farm',
            type: 'hit_dealt',
            damage: applied,
            crit: Boolean(hit.crit),
            skill: true,
            online: trackHunt,
            catchUpId,
          });
          pushEvent({
            type: 'skill_hit',
            skillId: skillDef.id,
            name: skillDef.name,
            dmg: applied,
            crit: hit.crit,
            monsterHp: target.monsterHp,
            monsterMaxHp: target.monster.hp,
            isBoss: Boolean(target.monster.isBoss),
            vfx: cast.vfx,
            sfx: cast.sfx,
          });
        }
        gainRage(character, RAGE_ON_HIT);
      }
    }

    if (!usedSkill) {
      const crit = rng() < critChance;
      const mitigation = monsterDefense(target.monster);
      let atk = Math.max(1, Math.floor(stats.attack * damageMult));
      if (character.classId === 'MAGO') {
        atk = Math.max(1, Math.floor(atk * MAGE_BASIC_ATTACK_MULT));
      }
      const base = Math.max(1, atk - mitigation);
      const dmg = crit ? Math.floor(base * 1.8) : base;
      const applied = applyOutgoingDamage(Number.isFinite(dmg) ? dmg : 0);
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'hit_dealt',
        damage: applied,
        crit,
        skill: false,
        online: trackHunt,
        catchUpId,
      });
      pushEvent({
        type: 'attack',
        dmg: applied,
        crit,
        monsterHp: target.monsterHp,
        monsterMaxHp: target.monster.hp,
        isBoss: Boolean(target.monster.isBoss),
      });
      gainRage(character, RAGE_ON_HIT);
    }

    if (target.monsterHp <= 0) {
      kills += 1;
      const wasBoss = Boolean(target.monster.isBoss);
      const fightMs = Number(target.fightElapsedMs) || 0;
      let celXp = 1;
      if (character.ascension && character.level < 100) {
        celXp = 1.15;
      }
      const rewardXp = Math.max(1, Math.floor(target.monster.xp * xpMult * celXp));
      const rewardGold = Math.max(
        0,
        Math.floor((target.monster.gold + Math.floor(rng() * 3)) * goldMult),
      );
      const levelBefore = character.level;
      applyRewards(character, { xp: rewardXp, gold: rewardGold });
      xpGained += rewardXp;
      goldGained += rewardGold;
      character.farmKills = (character.farmKills || 0) + 1;
      character.farmXp = (character.farmXp || 0) + rewardXp;
      character.farmGold = (character.farmGold || 0) + rewardGold;
      careerAddKills(character, { boss: wasBoss });
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'kill',
        isBoss: wasBoss,
        enemyName: target.monster.name,
        zoneId: zone.id,
        online: trackHunt,
        catchUpId,
        durationMs: trackHunt ? fightMs : 0,
      });

      if (perf) {
        perf.kills += 1;
        perf.xp += rewardXp;
        perf.goldCombat += rewardGold;
        if (wasBoss) {
          perf.bossKills += 1;
          if (fightMs > 0) {
            perf.fightMsBoss += fightMs;
            perf.killsBossTimed += 1;
          }
        } else if (fightMs > 0) {
          perf.fightMsCommon += fightMs;
          perf.killsCommonTimed += 1;
        }
      }

      if (wasBoss) {
        bossKills += 1;
        character.farmWaveKills = 0;
        character.farmBossKills = (character.farmBossKills || 0) + 1;
      } else {
        character.farmWaveKills = (character.farmWaveKills || 0) + 1;
      }

      pushEvent({
        type: 'kill',
        monster: target.monster.name,
        xp: rewardXp,
        gold: rewardGold,
        isBoss: wasBoss,
      });

      const bal = getBalance();
      const zoneDrop = zone.dropChance != null ? Number(zone.dropChance) : getDropChance();
      const bossMult = zone.bossDropMult != null ? Number(zone.bossDropMult) : bal.bossDropMult;
      const baseDrop = wasBoss ? zoneDrop * bossMult : zoneDrop;
      const dropChance = Math.min(1, baseDrop * dropMult);
      if (rng() < dropChance) {
        const celestialZone = Boolean(zone.requiresAscension);
        const item = rollDrop(zone.tier || 1, character.classId, { celestialZone, rng });
        if (item) {
          const result = ingestLootWithPets(character, item);
          const info = publicItem(item);
          pushEvent({
            type: 'drop',
            name: info.displayName || info.name,
            rarity: info.rarity,
            templateId: info.templateId,
            announce: Boolean(getTemplate(info.templateId)?.announce),
            autoSoldFor: result.added ? 0 : result.gold,
            petEquipped: Boolean(result.equippedDirect),
          });
          noteDropIngest(result, item);
          drops.push(info);
          if (log.length < 8) {
            log.push(
              result.equippedDirect
                ? `Drop: ${info.displayName || info.name} (pet equipou)`
                : result.added
                  ? `Drop: ${info.displayName || info.name} (${info.rarityName})`
                  : `Mochila cheia — ${info.name} vendido por ${result.gold} gold`,
            );
          }
          for (const petEv of result.events || []) {
            if (petEv.type === 'pet_sell') notePetSellGold(petEv.gold, petEv.count);
            pushEvent(petEv);
            if (log.length < 8) {
              if (petEv.type === 'pet_sell') {
                log.push(`🐾 Pet vendeu ${petEv.count} item(ns) (+${petEv.gold} gold)`);
              } else if (petEv.type === 'pet_equip') {
                log.push(`🐾 Pet equipou ${petEv.name}`);
              }
            }
          }
        }
      }
      if (wasBoss) {
        const refineChance =
          zone.refineDropChance != null ? Number(zone.refineDropChance) : bal.refineDropChance;
        if (refineChance > 0 && rng() < Math.min(1, Math.max(0, refineChance))) {
          const item = createItem(REFINER_TEMPLATE_ID, 'epic', 1, rng);
          const result = ingestLootWithPets(character, item);
          const info = publicItem(item);
          pushEvent({
            type: 'drop',
            name: info.name,
            rarity: info.rarity,
            templateId: REFINER_TEMPLATE_ID,
            announce: true,
            autoSoldFor: result.added ? 0 : result.gold,
          });
          noteDropIngest(result, item);
          drops.push(info);
          if (log.length < 8) {
            log.push(
              result.added
                ? `✦ Drop raro: Refinador!`
                : `Mochila cheia — Refinador vendido por ${result.gold} gold`,
            );
          }
          for (const petEv of result.events || []) {
            if (petEv.type === 'pet_sell') notePetSellGold(petEv.gold, petEv.count);
            pushEvent(petEv);
            if (log.length < 8 && petEv.type === 'pet_sell') {
              log.push(`🐾 Pet vendeu ${petEv.count} item(ns) (+${petEv.gold} gold)`);
            }
          }
        }
        if (zone.sucoDrop || zone.id === PROVA_DIVINA_ZONE_ID) {
          const baseChance =
            bal.sucoCelestialDropChance != null
              ? Number(bal.sucoCelestialDropChance)
              : 0.007;
          const pity = Math.max(0, Math.floor(Number(character.provaDivinaBossKillsWithoutSuco) || 0));
          const pityBonus = Math.min(0.05, pity * 0.002);
          const sucoChance = Math.min(0.12, baseChance + pityBonus);
          character.provaDivinaBossKillsWithoutSuco = pity + 1;
          if (rng() < Math.min(1, Math.max(0, sucoChance))) {
            const item = createItem(SUCO_CELESTIAL_TEMPLATE_ID, 'legendary', 1, rng);
            const result = ingestLootWithPets(character, item);
            const info = publicItem(item);
            if (result.added) {
              character.provaDivinaBossKillsWithoutSuco = 0;
            }
            pushEvent({
              type: result.held ? 'drop_held' : 'drop',
              name: info.name,
              rarity: info.rarity,
              templateId: SUCO_CELESTIAL_TEMPLATE_ID,
              announce: true,
              autoSoldFor: result.added ? 0 : result.gold || 0,
              held: Boolean(result.held),
            });
            noteDropIngest(result, item);
            if (result.added) drops.push(info);
            if (log.length < 8) {
              if (result.added) {
                log.push(`✦ Drop lendário: Suco Divino!`);
              } else if (result.held) {
                log.push(
                  `✦ Suco Divino dropou, mas a mochila está cheia — liberte um espaço e mate o boss de novo (item protegido, não foi vendido).`,
                );
              } else {
                log.push(`Mochila cheia — Suco Divino não pôde ser guardado`);
              }
            }
            if (pityBonus > 0 && result.added && log.length < 8) {
              log.push(`Pity de Suco Divino reiniciado.`);
            }
          } else if (pity > 0 && pity % 5 === 0 && log.length < 8) {
            log.push(
              `Pity Suco Divino (${zone.name}): +${Math.round(pityBonus * 1000) / 10}% chance (após ${pity} bosses).`,
            );
          }
        }
      }
      // Passiva Mago: recupera 4% MP no abate
      if (character.classId === 'MAGO') {
        const maxMp = computeStats(character).maxMp;
        character.currentMp = Math.min(
          maxMp,
          (character.currentMp || 0) + Math.max(1, Math.floor(maxMp * 0.04)),
        );
      }
      // Chance de poção de vida (editável no catálogo; boss ×5)
      if (rng() < getHpPotionDropChance({ wasBoss })) {
        const potion = createItem('consumable_hp_potion', 'uncommon', 1, rng);
        const pr = ingestLootWithPets(character, potion);
        noteDropIngest(pr, potion);
        if (pr.added && log.length < 8) {
          log.push(pr.stacked ? 'Poção de Vida (+1 no stack)' : 'Poção de Vida dropada');
        }
      }
      if (rng() < getManaPotionDropChance({ wasBoss })) {
        const potion = createItem('consumable_mana_potion', 'uncommon', 1, rng);
        const pr = ingestLootWithPets(character, potion);
        noteDropIngest(pr, potion);
        if (pr.added && log.length < 8) {
          log.push(pr.stacked ? 'Poção de Mana (+1 no stack)' : 'Poção de Mana dropada');
        }
      }
      if (character.level > levelBefore) {
        pushEvent({ type: 'levelup', level: character.level });
      }
      if (log.length < 8) {
        log.push(
          wasBoss
            ? `Chefe derrotado: ${target.monster.name} (+${rewardXp} XP, +${rewardGold} ouro)`
            : `Derrotou ${target.monster.name} (+${rewardXp} XP, +${rewardGold} ouro)`,
        );
      }
      character.combat = null;
      target = currentTarget(character, zone, rng);
      pushEvent(spawnEvent(target));
      Object.assign(stats, computeStats(character));
      continue;
    }

    let incoming = Math.max(0, target.monster.attack - stats.defense);
    if (!Number.isFinite(incoming)) incoming = 0;
    const mit = Number(character.combatMitigateNext) || 0;
    if (mit > 0) {
      incoming = Math.max(0, Math.floor(incoming * (1 - Math.min(0.9, mit))));
      character.combatMitigateNext = 0;
    }
    // Passiva Guerreiro: 12% chance de bloquear o hit
    if (character.classId === 'GUERREIRO' && rng() < 0.12) {
      incoming = 0;
    }
    const hpBeforeHurt = Number.isFinite(character.currentHp) ? character.currentHp : 0;
    character.currentHp = hpBeforeHurt - incoming;
    if (!Number.isFinite(character.currentHp)) character.currentHp = 0;
    gainRage(character, RAGE_ON_HURT);
    if (incoming > 0) {
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'hit_taken',
        damage: incoming,
        online: trackHunt,
        catchUpId,
      });
    }
    pushEvent({ type: 'hurt', dmg: incoming, hp: Math.max(0, character.currentHp), maxHp: stats.maxHp });

    const potionResult = tryAutoHpPotion(character, stats);
    if (potionResult) {
      pushEvent({
        type: 'potion',
        healed: potionResult.healed,
        hp: potionResult.currentHp,
        maxHp: potionResult.maxHp,
        remaining: potionResult.remaining,
        auto: true,
      });
      if (log.length < 8) {
        log.push(`Auto poção: +${potionResult.healed} HP`);
      }
    }

    if (character.currentHp <= 0) {
      const faintZoneId = character.farmZoneId;
      const autoRestart = Boolean(character.autoRestartFarm);
      faints += 1;
      if (perf) perf.faints += 1;
      // Confronto incompleto: descarta fightElapsedMs (não entra no TTK).
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'faint',
        enemyName: target.monster.name,
        isBoss: Boolean(target.monster.isBoss),
        online: trackHunt,
        catchUpId,
      });
      pushEvent({ type: 'faint', monster: target.monster.name, isBoss: Boolean(target.monster.isBoss) });
      character.farmZoneId = null;
      character.farmStartedAt = null;
      character.combat = null;
      character.lastTickAt = null;
      character.currentHp = Math.floor(computeStats(character).maxHp * 0.5);
      if (autoRestart && faintZoneId) {
        try {
          const resumed = startFarm(character, faintZoneId, { preserveHuntPerf: true });
          log.push(
            `Você desmaiou enfrentando ${target.monster.name}. Restart automático em ${resumed.name}.`,
          );
          pushEvent({ type: 'auto-restart', zoneId: resumed.id, zoneName: resumed.name });
        } catch (err) {
          log.push(
            `Você desmaiou enfrentando ${target.monster.name}. Farm pausado${
              err instanceof Error && err.message ? ` (${err.message})` : ''
            }.`,
          );
        }
      } else {
        log.push(`Você desmaiou enfrentando ${target.monster.name}. Farm pausado.`);
      }
      // Desmaio encerra esta recuperação offline (restart = nova sessão de farm).
      {
        const rewardedMs = Math.max(0, elapsed - remaining);
        if (catchUpId && rewardedMs > 0) {
          applyJourneyEvent(character, { source: 'farm', type: 'offline_ms', ms: rewardedMs });
        }
        if (catchUpId) {
          applyJourneyEvent(character, {
            source: 'farm',
            type: 'offline_catchup_commit',
            catchUpId,
          });
        }
        character.offlineCatchUpId = null;
        if (!trackHunt && rewardedMs > 0) {
          ensureHuntPerf(character, zone).offlineExcludedMs += rewardedMs;
        }
        return finalizeFarmResult({
          ticks,
          kills,
          xpGained,
          goldGained,
          log,
          events,
          drops: drops.length,
          dropsKept,
          dropsAutoSold,
          windowMs: rewardedMs,
          elapsedSinceLastMs,
          rewardedMs,
          zoneId: zone.id,
          zoneName: zone.name,
          levelBefore,
          levelAfter: character.level,
          bossKills,
          faints,
          eventsTruncated,
          catchUpId,
          catchUpPending: false,
        });
      }
    }
  }

  character.lastTickAt = new Date(now - remaining).toISOString();
  const catchUpPending = Boolean(character.farmZoneId && remaining >= stats.attackIntervalMs);
  {
    const rewardedMs = Math.max(0, elapsed - remaining);
    if (catchUpId && rewardedMs > 0) {
      applyJourneyEvent(character, { source: 'farm', type: 'offline_ms', ms: rewardedMs });
    }
    if (catchUpId && !catchUpPending) {
      applyJourneyEvent(character, {
        source: 'farm',
        type: 'offline_catchup_commit',
        catchUpId,
      });
    }
    if (!catchUpPending) character.offlineCatchUpId = null;
    if (!trackHunt && rewardedMs > 0) {
      ensureHuntPerf(character, zone).offlineExcludedMs += rewardedMs;
    }
    return finalizeFarmResult({
      ticks,
      kills,
      xpGained,
      goldGained,
      log,
      events,
      drops: drops.length,
      dropsKept,
      dropsAutoSold,
      windowMs: rewardedMs,
      elapsedSinceLastMs,
      rewardedMs,
      zoneId: zone.id,
      zoneName: zone.name,
      levelBefore,
      levelAfter: character.level,
      bossKills,
      faints,
      eventsTruncated,
      catchUpId,
      catchUpPending,
    });
  }
}

export function startFarm(character, zoneId, options = {}) {
  const zone = findZone(zoneId);
  if (!zone) throw new Error('Zona inválida');
  const chapters = ensureChapters(character);
  if (zone.chapterId && !zone.trial && zone.chapterId !== chapters.currentChapterId) {
    throw new Error(`${zone.name} só está disponível no Capítulo ${zone.chapterId}`);
  }
  if (zone.requiresAscension && !meetsAscensionRequirement(character, zone.requiresAscension)) {
    throw new Error(`${zone.name} exige classificação ${zone.requiresAscension}`);
  }
  if (zone.mortalOnly && character.ascension) {
    throw new Error(`${zone.name} é exclusiva de Mortais no limiar da ascensão`);
  }
  if (character.level < zone.minLevel) {
    throw new Error(`Precisa ser nível ${zone.minLevel} para ${zone.name}`);
  }
  ensureCombatReady(character);
  const now = new Date().toISOString();
  character.farmZoneId = zone.id;
  character.farmStartedAt = now;
  character.lastTickAt = now;
  character.combat = null;
  character.farmKills = 0;
  character.farmXp = 0;
  character.farmGold = 0;
  character.farmWaveKills = 0;
  character.farmBossKills = 0;
  if (options.preserveHuntPerf) {
    const perf = ensureHuntPerf(character, zone);
    // Mantém a janela de desempenho; só atualiza rótulo de zona se ainda vazio.
    if (!perf.zoneId) {
      perf.zoneId = zone.id;
      perf.zoneName = zone.name;
    }
  } else {
    resetHuntPerf(character, zone);
  }
  currentTarget(character, zone, resolveRng(options));
  return zone;
}

export function stopFarm(character, options = {}) {
  processFarm(character, Date.now(), options);
  decayRageOnStop(character);
  character.farmZoneId = null;
  character.farmStartedAt = null;
  character.lastTickAt = null;
  character.combat = null;
}
