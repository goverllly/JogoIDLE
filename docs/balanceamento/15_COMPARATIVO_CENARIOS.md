# 15 — Comparativo A / B / B+

Dados: `v2_cenarios.csv`, `v2_classes.csv`, `v2_marcos.csv`.  
N = 200 (otimizado), N = 50 (casual). Fidelidade: PASS.

## Visão geral (horas → 500, p50)

| Cenário | Guerreiro opt | Guerreiro casual | Arqueiro | Mago | Bárbaro | Na meta 25–40 opt? |
|---------|---------------|------------------|----------|------|---------|---------------------|
| **A** Atual | **12** | 19 | 44 | 18 | 12 | too_fast |
| **B** Progressão 2.0 | **26** | **54** | 25 | 40 | 25 | **yes** |
| **B+** +exigente | **49** | 99 | 41 | 65 | 49 | too_slow (proposital) |

Metas: otimizado **25–40 h**, casual **45–70 h** (Guerreiro como referência de calibração).

## XP total 1→500

| Cenário | Total XP |
|---------|----------|
| A | 96 696 680 |
| B | 103 435 183 |
| B+ | 127 993 893 |

## Gap entre classes (opt p50, horas)

| | A | B | B+ |
|--|---|---|-----|
| Guerreiro | 12 | 26 | 49 |
| Bárbaro | 12 | 25 | 49 |
| Mago | 18 | 40 | 65 |
| Arqueiro | **44** (sem H2) | **25** (com H2) | 41 |

No motor atual (A), Arqueiro full-DES é o outlier negativo. Em B, H2 alinha Arqueiro ao Guerreiro (±10%). Mago permanece ~1.5× Guerreiro (sobrevivência / TTK) — aceitável como tradeoff de burst; revisar se faints (p50 ~1634 em B) forem ruins em playtest.

## Marcos — Guerreiro Cenário B (p50)

| Nível | Horas | XP/h | TTK trash (ms) | Refine médio |
|-------|-------|------|----------------|--------------|
| 50 | 7 | ~286k | 7520 | 0 |
| 100 | 10 | ~728k | 5637 | 1 |
| 200 | 15 | ~4.0M | 2380 | 2 |
| 300 | 18 | ~7.0M | 2240 | 3 |
| 400 | 22 | ~9.8M | 1960 | 5 |
| 500 | 26 | ~11.9M | 2240 | 6 |

Early rápido; mid/late com gear e refine mais lentos (B-det).

## Faints (p50 até 500)

| Classe | A | B | B+ |
|--------|---|---|-----|
| Guerreiro | 23 | 193 | 1322 |
| Bárbaro | 0 | 225 | 1610 |
| Mago | 619 | 1634 | 2247 |
| Arqueiro | 1267 | 1058 | 2070 |

B/B+ aumentam pressão — alinhado a “mid exige gear; late chefes duros”.

## Refine (economia esperada, 8 slots +1…+10)

| Modelo | Refinadores | Ouro |
|--------|-------------|------|
| Atual | 80 | 2.0M |
| B-det | 168 | ~17.2M |
| B-prob | ~102 | ~16.3M |

B e B+ usam **B-det** na simulação de gear.

## Drop

Simulação usa `dropChance: 0.11` (default código). Standalone live observado: **0.016** — freia loot, não o rush de XP. Coluna/nota em `scenario_A_params.json` (`liveDropChance`).

## Pós-ascensão / ritual

- Tempo até ritual ≈ tempo até 500 (acima) + grind de ouro do ritual (não re-simulado aqui; ver auditoria 1.0 / sinks).
- Celestial L1: **bloqueado** de eter/firmamento/nexus; ver `14` e `v2_celestial_access.json`.
- Push 1→700 sob B (com gear mortal 500): Guerreiro ~19 h, Arqueiro ~15 h (otimista, sem conteúdo novo).

## Interpretação

| ID | Papel |
|----|-------|
| **A** | Baseline: fácil demais no eixo nível; Arqueiro quebrado sem ATK-from-DES. |
| **B** | **Recomendado** — metas de tempo batem; H2 + B-det + gear parcial nos mobs. |
| **B+** | Stress test (~1.9× horas Guerreiro vs B). Coeficientes ~15–25% mais duros → horas sobem mais que linear. Usar se B ainda parecer curto em playtest humano. |

Params: `scenario_A_params.json`, `scenario_B_params.json`, `scenario_Bplus_params.json`.
