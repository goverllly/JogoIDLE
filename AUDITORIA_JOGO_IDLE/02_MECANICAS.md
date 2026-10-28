# 02 — Mecânicas do jogo

Evidências em `idle/lib/jogo-idle/game/` salvo indicação contrária. Runtime standalone chama o domínio via `idle/src/local-service.ts`.

## 1. Combate (farm idle)

**Arquivo:** `combat.ts` — função principal `processFarm`.

- Loop por ticks com intervalo `stats.attackIntervalMs`.
- Por tick (típico): 1 ação do jogador + 1 hit do monstro.
- **Miss/accuracy:** **Não encontrado** — hits sempre aplicam dano (exceto block do Guerreiro).

### Dano básico PvE (player → monstro)

Evidência em `processFarm` / helpers associados:

1. `crit = Math.random() < stats.critChance`
2. Mitigação monstro: `monsterDefense(target.monster)` (`data.ts`)
3. Mago: ataque básico × `MAGE_BASIC_ATTACK_MULT` (**0.55**) quando aplicável
4. `base = max(1, floor(atk * damageMult) - mitigation)`
5. `dmg = crit ? floor(base * 1.8) : base`

### Dano recebido

- `incoming = max(0, monster.attack - stats.defense)`
- Mitigação de skill `combatMitigateNext` (cap 90%)
- Guerreiro: **12%** chance de block → `incoming = 0`

### Skills de combate

**Arquivo:** `combat-skills.ts`

- Definições: `CLASS_COMBAT_SKILLS`
- Seleção no tick: `pickCombatSkillForTick` / execução `executeCombatSkill`
- Unlock: `COMBAT_SKILL_UNLOCK_LEVELS = [10, 50, 120, 180, 250, 320, 400, 450, 500]` (barra de 9 slots)
- Fórmula de skill: `atk` com `damageMult` + parte MP + mults de boss/elemento; depois mesma lógica crit **1.8×**
- Bárbaro: Rage (`MAX_RAGE=100`, ganho ao acertar/sofrer — constantes no arquivo)
- Outras classes: regen MP **~2% maxMp / tick** (`MP_REGEN_PER_TICK_PCT`)

### Escala de monstros / boss

**Arquivo:** `data.ts` — `scaleMonster`, `buildZoneBoss`, `expectedPlayerPower`; alvos em `DEFAULT_BALANCE` (`balance.ts`):

| Constante | Valor |
|-----------|-------|
| `mobHitsToKill` | 10 |
| `bossHitsToKill` | 28 |
| `mobAtkHpPct` | 0.11 |
| `bossAtkHpPct` | 0.13 |
| `mobXpPerLevel` | 20 |
| `mobGoldPerLevel` | 5.5 |

Boss de zona: após onda (`defaultBossWaveMin: 8` ou `3 × monsterCount`); trials com `bossWaveSize: 12` em `chapter-zones.ts`.

## 2. HP, MP e atributos

**Arquivo:** `character.ts` — `computeStats`; coeficientes em `balance.ts` `DEFAULT_BALANCE`.

| Fórmula (resumo) | Constantes |
|------------------|------------|
| `maxHp = baseHp + con*kHp + level*levelHp + hpFlat` | baseHp 90, kHp 14, levelHp 6 |
| `maxMp = baseMp + int*kMp + level*levelMp + mpFlat` | baseMp 45, kMp 12, levelMp 3 |
| Atk físico | baseAttack 6 + str*kAtk(2.2) + flat |
| Atk mágico (MAGO) | + int*kMagicAtk(2.4) |
| Defesa | baseDefense 3 + con*kDefCon(1.2) + str*kDefStr(0.25) |
| Intervalo | `max(minIntervalMs, baseIntervalMs - dex*kSpeed)` → 420–1450 ms, kSpeed 7 |
| Crit | `min(maxCrit, dex*critPerDex + critFlat/100)` → maxCrit **0.45**, critPerDex **0.0025** |

Poções: heal **35%** do max HP/MP (`drinkHpPotion` / `drinkManaPotion` em `character.ts`).

## 3. Classes

**Arquivo:** `data.ts` — `CLASSES`

| id | Nome | Base str/int/dex/con | Growth |
|----|------|----------------------|--------|
| GUERREIRO | Guerreiro | 12/3/6/10 | +3/+0/+1/+2 |
| BARBARO | Bárbaro | 14/2/5/11 | +3/+0/+1/+2 |
| MAGO | Mago | 3/12/5/6 | +0/+3/+1/+1 |
| ARQUEIRO | Arqueiro | 7/4/12/6 | +1/+0/+3/+1 |

Pontos por level-up: `pointsForLevelUp` → **5** mortal / **10** com `ascension` (`balance.ts`).

## 4. Equipamentos, raridade, refine

**Arquivo:** `items.ts`, `inventory.ts`

- Slots: `SLOTS` (weapon, offhand, armaduras, ring, necklace, consumable, …)
- Raridades `RARITIES`:

| id | mult | weight | sell |
|----|------|--------|------|
| common | 1 | 600 | 1 |
| uncommon | 1.25 | 260 | 1.5 |
| rare | 1.6 | 100 | 3 |
| epic | 2.1 | 32 | 7 |
| legendary | 2.8 | 8 | 20 |

- Refine: `refineItem` — `MAX_REFINE=10`, `REFINE_STAT_BONUS=5` por nível; consome refinador; **sem falha** (`balance.ts` + `inventory.ts`).
- Bag: `BAG_BASE_SLOTS=20`, +20 com 1 upgrade.

## 5. Inventário e drops

Pipeline: `rollDrop` → `ingestLootWithPets` → `addItem` (`items.ts` / `inventory.ts` / `combat.ts`).

- Chance base gear: `DROP_CHANCE = 0.11` (override catálogo possível)
- Boss: × `bossDropMult` default **2.5** → **27.5%**
- Bias de classe ~**65%** pool própria (`rollDrop`)
- Refinador no boss: `REFINE_DROP_CHANCE = 0.012`
- Suco: `SUCO_CELESTIAL_DROP_CHANCE = 0.007` + pity (detalhe em `03_ECONOMIA`)
- Poções: chance default baixa; boss ×5 (funções `getHpPotionDropChance` / mana)

## 6. XP e níveis

**Arquivo:** `balance.ts`

- Caps: `MORTAL_LEVEL_CAP=500`, `CELESTIAL_LEVEL_CAP=700` (`levelCapFor`)
- `xpToNextLevel(L)`:
  - L&lt;50: `floor(100 * L^1.4)`
  - L&lt;150: `floor(120 * L^1.32)`
  - L&lt;350: `floor(160 * L^1.28)`
  - senão: `floor(220 * L^1.22)`
- Recompensas: `applyRewards` sobe nível enquanto XP sobrar e abaixo do cap.

Exemplos calculados da fórmula:

| Nível L | XP para L→L+1 |
|---------|----------------|
| 1 | 100 |
| 10 | 2511 |
| 50 | 20980 |
| 100 | 52381 |
| 200 | 141071 |
| 350 | 279373 |
| 500 | 431684 |

Kill: `xp = floor(monster.xp * xpMult * celXp)` com `celXp=1.15` se ascended e level &lt; 100 (em `processFarm`).

## 7. Ascensão / classificação

**Arquivos:** `chapters.ts`, `character.ts`, `balance.ts`

- Ladder: `CLASSIFICATION_LADDER = ["MORTAL","CELESTIAL","DIVINO","SEMIDEUS"]`
- Ritual: Lv **500** + item Suco + **`DIVINDADE_GOLD_COST = 10_000_000`** gold
- `performClassificationRitual` / `onClassificationRitualComplete`: consome recursos, avança classificação/capítulo, level→1, xp→0, bônus pontos `CELESTIAL_ASCEND_BONUS=20`

## 8. Temporadas

- Identidade: `season.ts` — trimestres `YYYY-T1..T4` (`currentSeasonIdentity`)
- Capítulos: `ensureChapters` troca progresso competitivo se `seasonKey` muda; preserva `legacy`
- Journey/fame: `journey.ts`, `fame.ts`
- Soft reset: `softResetCharacterForSeason`
- **Standalone HTTP:** `GET /seasons` retorna `[]` (`server.ts`) — UI temporada admin parcial

## 9. Quatro capítulos

**Arquivos:** `chapters.ts`, `chapter-zones.ts`

- IDs: `I`–`IV`; zonas de campanha: **20** em `CHAPTER_CAMPAIGN_ZONES` (5/capítulo)
- Farm de zona de campanha exige `currentChapterId` coerente; trials (`prova_divina`, `julgamento_almas`, `coracao_chama`) bypass
- Desbloqueio ligado à classificação (ritual), não a quest externa

## 10. Chefes

- Boss de macro por zona (`bossName`, onda)
- Trials MEGA BOSS: Guardião da Divindade, Julgamento das Almas, Coração da Chama (`chapter-zones.ts` — `trial`, `sucoDrop`, mults)
- Finais de capítulo nomeados em `CHAPTER_CATALOG` (ex. Cap I Guardião Ancestral)

## 11. Farm offline

**Arquivo:** `combat.ts` `processFarm` + `offline-catchup.ts`

| Parâmetro | Valor |
|-----------|-------|
| Cap catch-up por request | **2 horas** (`maxCatchUpMs`) |
| Max ticks / request | **5000** |
| Catch-up id se elapsed ≥ | **60_000** ms |
| Relatório UI mínimo | `OFFLINE_REPORT_MIN_REWARDED_MS = 60_000` |

Pode setar `catchUpPending` para continuar no próximo `/me`.

## 12. Ranking e multiplayer

| Feature | Status | Evidência |
|---------|--------|-----------|
| `ranking.ts` sort Celestial&gt;Mortal | Código existe | `isStrongerCharacter` |
| `GET /ranking` standalone | Stub `[]` | `server.ts` |
| Fame rankings | Implementado | `fame/*` routes |
| Arena / duelo HTTP | **501** em standalone | `server.ts` `arena/*` |
| Lógica duelo | Implementada no domínio | `duel.ts` (`DUEL_MIN_STAKE=100`, duração 90s, max ticks 4000); fórmula PvP distinta (armor ratio + chip 1% maxHp) |
| service.ts arena | Legado integrado | Não montado no Express standalone |

## 13. Recursos sociais

- Galeria da Fama / journey privacy: rotas fame + journey
- Chat/guild/party: **Não encontrado** no standalone
- Engagement check-in: **410** (`engagement/claim`)
