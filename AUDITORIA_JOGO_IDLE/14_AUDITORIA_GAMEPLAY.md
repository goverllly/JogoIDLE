# 14 — Auditoria de gameplay, economia e balanceamento (Fase 4)

**Data:** 2026-10-28  
**Escopo:** integridade técnica + relatório quantitativo **sem retune**.  
**Dados:** `AUDITORIA_JOGO_IDLE/fase4_economy/` (gerados por `idle/scripts/balance-audit/phase4-economy-sim.mjs`).  
**Não toca:** `idle/data/save.json`, `docs/balanceamento/`, fórmulas/preços/probs do motor.

## Premissas da simulação

- Gear starter only; skills desligadas; engagement off.
- Atributos: **65% no atr. primário da classe / 35% CON** (primário = STR para Guerreiro/Bárbaro, INT Mago, **DEX Arqueiro**).
- Farm 1h: Lv.10, Bosque dos Sussurros, RNG seeded, chunks de 10 min.
- Capas de poder Cap.I: start Lv.1 / mid Lv.250 / end Lv.500 nas zonas canônicas.

## Integridade técnica (corrigido nesta fase)

| Área | Achado | Correção |
|------|--------|----------|
| RNG PvE | `Math.random` espalhado; testes não determinísticos | `options.rng` em `processFarm` → pick/crit/block/gold/drops/skills/`createItem`/`rollDrop` |
| HP/dano | `NaN` em `monsterHp`/`currentHp` podia propagar | Sanitização em `applyOutgoingDamage` e hit recebido |
| Ascensão | Sem testes de consume-once / STALE | Cobertura 4.2 — disco intacto em STALE; replay não re-concede |
| Offline | Teto 2h/request + 5k ticks sem matriz | Matriz 4.4; **produto:** chunks podem somar >2h |
| Inventário | Sem invariantes sell/stack/Suco held | Cobertura 4.3 |

## Relatório quantitativo por classe (Cap. I)

### DPS / HP / TTK (banda mid — Lv.250, Floresta Amaldiçoada)

| Classe | maxHp | ATK | DPS | TTK mob (hits) | TTK boss (hits) |
|--------|------:|----:|----:|---------------:|----------------:|
| GUERREIRO | 7820 | 1821 | 1327 | 4.0 | 13.5 |
| BARBARO | ~igual | ~igual | 1323 | ~4 | ~13 |
| MAGO | — | — | 1419 | — | — |
| ARQUEIRO | — | **26** | **84** | muito alto | muito alto |

**Achado de premissa (não retune):** ataque físico usa **STR**; a simulação investe DEX no Arqueiro → DPS artificialmente baixo. Em jogo real o jogador pode (e deve) gastar pontos em STR. Marcar para decisão conjunta de UX/balance (tooltip / primary attr), **fora** desta fase.

### Farm 1h Bosque (Lv.10 → …)

| Classe | kills | XP | ouro combat | nível final |
|--------|------:|---:|------------:|------------:|
| GUERREIRO | 632 | 39570 | 11695 | 19 |
| BARBARO | 651 | 41880 | 12364 | 19 |
| MAGO | 358 | 22925 | 6771 | 16 |
| ARQUEIRO | 161 | 10175 | 3013 | 13 |

Ouro final Guerreiro > goldGained: auto-sell de drops (mochila). Conservação OK nos testes 4.3.

### Pré / pós ritual Celestial

- Consome **10_000_000** gold + 1 Suco; level → 1; Cap. → II; `unspentPoints` +20; attrs preservados.
- HP cai (~levelHp×499); ATK/DPS de attrs permanece (mesmo investimento).
- Replay sem requisitos falha (testes 4.2).

### Offline (produto)

| Parâmetro | Valor |
|-----------|-------|
| `maxCatchUpMs` | **2h por request** |
| `maxTicks` | **5000** (default) |
| Wall 6h/24h | 1ª call paga ≤2h (ou ≤5k ticks); resto via `catchUpPending` |
| Manutenção | `maintenanceSkippedMs` zera progresso no intervalo travado |
| Faint | encerra catch-up da sessão |

## Economia — sinks/fontes (sem mudança)

Ver também `03_ECONOMIA_BALANCEAMENTO.md`. Nesta fase **não** alteramos:

- `DROP_CHANCE` 0.11, boss×2.5, refine 1.2%, Suco 0.7%+pity
- `DIVINDADE_GOLD_COST` 10M, bag 150k, refinador 25k, reset 1M
- Refine sem fail até +10

## Riscos remanescentes / decisões abertas

1. **Arqueiro primary attr** vs STR no `computeStats` — documentação/UX vs retune.
2. **Faint mid catch-up** zera `farmZoneId` — jogador frágil “perde” restante offline até restart (produto atual).
3. **Multi-instância** no mesmo save: ainda não suportado (Fase 1).
4. **Balanceamento numérico** (TTK mid Cap.I ~4 hits vs alvo 8–12 em `DEFAULT_BALANCE.mobHitsToKill`) — gap de premissa (attrs altos / sem gear inimigo); **não** retuned aqui.
5. Admin mapa publish / Backup tab ainda “Fase 4” no Admin Studio — **fora** do escopo de integridade gameplay desta entrega.

## Critério de conclusão Fase 4

- Integridade: RNG injetável, testes 4.1–4.4, HTTP 4.6, docs 11/12/14.
- Balanceamento: **somente relatório** — aguarda decisão conjunta antes de qualquer retune.
