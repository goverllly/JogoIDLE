# 13 — Validação do Simulador (Progressão 2.0)

**Escopo:** scripts isolados em `idle/scripts/balance-audit/`.  
**Restrição:** motor de produção (`balance.ts`, combate, itens, zonas, saves) **somente lido** — zero patch.

## Como rodar

```bash
cd idle && npx tsx scripts/balance-audit/run-validation.mjs
```

Saídas em `docs/balanceamento/data/v2_*` e `scenario_{A,B,Bplus}_params.json`.

## Fidelidade

Arquivo: `v2_fidelity.json` — **PASS** na última execução.

| Check | Esperado |
|-------|----------|
| `xpToNextLevel(1)` | 100 |
| `xpToNextLevel(100)` | `floor(120×100^1.32)` |
| Total XP → 500 (motor) | 96 696 680 |
| Caps | mortal 500 / celestial 700 |
| Soft-cap DES velocidade | ≈148 |
| Soft-cap DES crit | 180 |
| `scaleMonster` HP/XP | > 0 |
| Gates Celestial | `eter` 500, `firmamento` 560 (+ `nexus` 620) |

Constantes espelhadas no loop: crit ×1.8, block Guerreiro 12%, básico Mago ×0.55, wave via `zoneBossWaveSize`, catch-up offline 2h / 5000 ticks (documentado, não simulado tick-a-tick em massa).

### Aproximações (explícitas)

1. Skills de barra: **uma** skill rotativa com `damageMult` médio por classe (não os 9 efeitos especiais).
2. Loot: pesos de raridade + `dropChance`; templates de tier não são UIDs reais.
3. Gear: bônus flat esperado por nível/refine (não inventário).
4. Farm tree XP: multiplicador externo (otimizado = 1.0).
5. Poções/auto-heal: **não** modeladas (faint = retomada com HP cheio + downtime).
6. Produção Prisma/`catalog_state`: não acessível; defaults + nota `dropChance` live standalone **0.016** vs default **0.11**.
7. Casual: XP ×0.68, zona ~18 níveis atrás, faint/downtime maior — proxy de rota subótima.

## Monte Carlo

| Parâmetro | Valor |
|-----------|-------|
| Seeds otimizado | **N = 200** por classe × cenário |
| Seeds casual | N = 50 |
| Classes | Guerreiro, Bárbaro, Mago, Arqueiro |
| Marcos | 50 / 100 / 200 / 300 / 400 / 500 |
| RNG | Mulberry32 por seed |

### Métricas por marco (`v2_marcos.csv`)

Horas (p10/p50/p90), XP/h, ouro/h, TTK trash/boss, refine médio, peças, faints, kills.

### Módulos

| Arquivo | Função |
|---------|--------|
| `fidelity.mjs` | Asserts vs imports reais |
| `profiles.mjs` | Builds 55% primary / 25% CON / 15% secondary |
| `combat-loop.mjs` | Loop + skills + overlay DES→ATK (H1/H2/H3) |
| `loot-model.mjs` | Drop, gear esperado, refine current / B-det / B-prob |
| `scenarios.mjs` | Params A / B / B+ (JSON exportados) |
| `run-validation.mjs` | Orquestra N≥200 + CSVs |

## Offline

`v2_offline_limits.json`: com TTK baixo, **5000 ticks** esgotam antes de 2h de elapsed — syncs múltiplos necessários para catch-up pleno. Não altera o motor.

## Correspondência motor

Falhas de fidelidade → relatório em JSON, **sem** patch no jogo. Última run: `failed: []`.
