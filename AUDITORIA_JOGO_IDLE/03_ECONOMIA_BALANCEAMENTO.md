# 03 — Economia e balanceamento

Constantes padrão: `idle/lib/jogo-idle/game/balance.ts`, `items.ts`. Overrides possíveis via catálogo `__world.balance` / `setBalanceOverrides` (admin).

## 1. Fontes de ouro

| Fonte | Onde | Notas |
|-------|------|--------|
| Kills de farm | `processFarm` → `applyRewards` | `gold = floor((monster.gold + random 0..2) * goldMult)` |
| Auto-sell (bag cheia / pets) | `addItem`, `sellWrongClassItems` | `sellPrice` × raridade |
| Venda manual | `sellItem` / ops de item | |
| Duelo (vitória) | `duel` / service legado | Winner recebe 2× stake |
| Admin grant | `admin-service` | |
| Engagement | `engagement-bonus.ts` | **Desligado** no standalone (claim 410) |

Base monstro: `level * mobGoldPerLevel` (**5.5**); boss XP/gold mults tipicamente **2.2 / 2.0** em `scaleMonster`.

## 2. Sinks (remoção de ouro)

| Sink | Valor / regra | Evidência |
|------|----------------|-----------|
| Ritual de classificação | **10_000_000** (default `DIVINDADE_GOLD_COST`) | `balance.ts`, `performClassificationRitual` |
| Upgrade bag | **150_000** (merchant default) | `items.ts` merchant defaults |
| Refinador (compra) | **25_000** | idem |
| Reset atributos | **1_000_000** | idem |
| Pets | **40k–100k** | idem |
| Stake de duelo | ≥ **100**; perda na derrota | `duel.ts` |

## 3. Probabilidades de drop

| Evento | Probabilidade default |
|--------|----------------------|
| Gear em trash | `DROP_CHANCE = 0.11` (11%) |
| Gear em boss | `0.11 × bossDropMult(2.5) = 0.275` (27.5%) |
| Dado gear → common | 600/1000 = **60%** |
| uncommon | 26% |
| rare | 10% |
| epic | 3.2% |
| legendary | 0.8% |
| Refinador (boss) | 1.2% |
| Suco (zona elegível) | base 0.7% + pity `min(0.05, killsWithoutSuco * 0.002)`, cap composto até ~12% |
| Poção HP/MP | ~0.8%; boss ×5 → ~4% |

**Exemplo combinado (boss, sem engagement):**  
P(lendário naquele kill) ≈ `0.275 × 0.008 = 0.0022` (**0,22%**).

Bias de classe no `rollDrop`: ~**65%** chance de puxar pool da classe do personagem quando disponível.

## 4. Progressão de equipamentos

- Tiers: `TIER_LEVELS` em `items.ts` (até níveis altos; `CELESTIAL_GEAR_MIN_TIER = 14`)
- Raridade multiplica stats (`RARITIES.*.mult`)
- Refine: +5 no attr alvo por nível, até +10; **sem fail** → sink de ouro/refinador previsível, sem risco de perda de item

## 5. Escalabilidade de poder

Com `computeStats` + gear:

- HP cresce linear em CON e nível (`kHp`, `levelHp`)
- DPS ≈ ataque / `(attackIntervalMs/1000)` com crit até 45%
- Mobs escalam para TTK ~10 hits (mob) / ~28 (boss) via `expectedPlayerPower` — **Necessita validação** empírica por zona após overrides admin

## 6. Dificuldade e recompensas por nível

- XP curve power-law (ver tabela em `02_MECANICAS.md`)
- XP monstro ≈ `level * 20` (mob); boss ×~2.2
- Gold monstro ≈ `level * 5.5` (+0..2 aleatório)

Exemplo L=100, 1 kill mob on-level (sem mults):

- XP ≈ 2000; gold ≈ 550 + 0..2
- XP para 100→101 ≈ 52381 → ~26 kills só de XP (ordem de grandeza; buffs/celXp alteram)

## 7. Riscos econômicos (evidência vs hipótese)

| Tema | Classificação | Evidência |
|------|---------------|-----------|
| Ritual 10M como sink forte | Comprovado (constante) | `DIVINDADE_GOLD_COST` |
| Refine sem fail = sink linear | Comprovado | `refineItem` sem RNG de quebra |
| Drop 11%/27.5% + auto-sell | Comprovado | `DROP_CHANCE`, `bossDropMult` |
| Inflação se farm 24/7 + catch-up 2h | **Risco** | Cap 2h/request mitiga offline infinito por request; online contínuo sem soft-cap de gold |
| Admin grant / simulate | **Risco** standalone | Qualquer cliente no host age como admin local |
| Engagement gold | Desligado | 410 |
| Duelo stake farming | Código existe; HTTP 501 standalone | Não explorável via API atual |

## 8. Docs de balanceamento existentes

Pasta `docs/balanceamento/` (ex.: `06_ECONOMIA_E_RECOMPENSAS.md`, `10_SIMULACOES_DE_BALANCEAMENTO.md`) — **propostas/histórico**. Preferir constantes em `balance.ts` / `items.ts` como fonte de verdade do motor atual. Scripts: `idle/scripts/balance-audit/` + `npm run audit:balance` em `idle/package.json`.
