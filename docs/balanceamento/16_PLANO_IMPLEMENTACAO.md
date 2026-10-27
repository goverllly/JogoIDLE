# 16 — Plano de Implementação (após aprovação)

**Gate:** nenhuma alteração no motor até aprovação explícita do Cenário B (ou B+).  
Este documento é o roteiro; os patches ainda **não** foram feitos.

## Princípios

1. Etapas pequenas, cada uma com teste e rollback.
2. Params calibrados em `scenario_B_params.json` como fonte da verdade numérica.
3. Re-rodar `npx tsx scripts/balance-audit/run-validation.mjs` após cada eixo.
4. Chars existentes: preferir migração suave (sem wipe); documentar deltas.

---

## Etapa 0 — Freeze & baseline

- [ ] Tag/commit do estado atual.
- [ ] Guardar CSVs `v2_*` como baseline pré-patch.
- [ ] Confirmar `dropChance` em produção (Prisma/catalog) vs 0.11 / 0.016.

**Rollback:** N/A (só leitura).

---

## Etapa 1 — Curva XP + mob XP (sem gear scaling ainda)

**Patch:** `balance.ts` / helpers de XP — alinhar a `smooth_B` e `mobXpPerLevel: 15`.

**Testes:**

- Assert `xpToNextLevel` nos breakpoints 50/150/350.
- Total XP → 500 ≈ 103.4M (±2%).
- Smoke: personagem sobe 1→10 em zona inicial.

**Rollback:** restaurar constantes XP/mobXp anteriores.

**Migração:** chars mid/late precisam de mais XP por nível → progresso **mais lento daqui pra frente**; nível atual permanece. Opcional: banner in-game “rebalanceamento de XP”.

---

## Etapa 2 — Poder esperado com fração de gear

**Patch:** `scaleMonster` / `expectedPlayerPower` — misturar baseline + poder com gear (`gearPowerFraction ≈ 0.32`).

**Testes:**

- Mob L100 HP/ATK sobe vs baseline A, mas não escala 1:1 com full mythic.
- Simulador A vs B regressão: Guerreiro opt ainda na faixa 25–40 h.

**Rollback:** `gearPowerFraction = 0` (comportamento atual).

**Migração:** farm on-level fica um pouco mais duro; players full-gear mantêm vantagem relativa.

---

## Etapa 3 — Hits / ATK% de mob e boss

**Patch:** `mobHitsToKill: 11`, `bossHitsToKill: 32`, atk% levemente ajustados (ver JSON B).

**Testes:** TTK boss on-level; faint rate em hidra/late não explode para Guerreiro.

**Rollback:** valores `DEFAULT_BALANCE` atuais.

---

## Etapa 4 — Refine B-det

**Patch:** tabela de custo/sucesso — 100% sucesso; +3 até +4, +4 depois; ouro/refinadores crescentes; **sem break**.

**Testes:**

- Custo acumulado 8 slots ≈ ordem de grandeza do CSV B-det.
- UI: mensagens sem “chance de destruir”.
- Economia: sink de ouro mensurável.

**Rollback:** refine atual (+5, 25k, 1 refinador).

**Migração:** peças já +N mantêm bônus; novos refines usam tabela nova. Se bônus por nível mudar (+5 → +3/+4), **não** nerfar retroativamente slots existentes (grandfather) ou oferecer recálculo opt-in — decidir na aprovação.

---

## Etapa 5 — DES→ATK H2

**Patch:** `computeStats` / ataque físico — pesos por classe; `kDexAtk ≈ 1.55` Arqueiro.

**Testes:**

- DPS Arqueiro vs Guerreiro mesmo gear: gap ≤ ±10% no simulador.
- Soft-caps intervalo/crit inalterados.
- Mago inalterado em INT.

**Rollback:** remover termo DEX do ATK.

**Migração:** Arqueiros existentes ficam **mais fortes** imediatamente (buff). Sem wipe.

---

## Etapa 6 — Soft marco de chefe (UX)

**Patch:** flag “região dominada” + bônus XP leve na próxima zona (ex. ×1.05). **Sem** hard-lock.

**Testes:** clear boss grava flag; bônus aplica só na zona seguinte; save compatível.

**Rollback:** remover flag/bônus.

---

## Etapa 7 — Celestial gap (conteúdo)

**Patch (design):** zonas Celestial tier-1 com `minLevel: 1` + `requiresAscension: CELESTIAL`; materiais exclusivos; chefes distintos.

**Testes:** Celestial L1 entra na zona nova; **não** entra em firmamento/nexus até minLevel; mortal não entra.

**Rollback:** desativar zonas novas / feature flag.

**Migração:** chars já Celestial L1+ passam a ter conteúdo imediato; quem farmou mortal pós-ritual não perde gear.

---

## Etapa 8 — Validação final + B+ opcional

- [ ] N≥200 no simulador com params “pós-patch” espelhando o motor.
- [ ] Playtest humano 2–3 sessões (Guerreiro + Arqueiro).
- [ ] Se ainda easy: aplicar coeficientes **B+** (etapa espelho 1–3).
- [ ] Atualizar docs 13–15 com números pós-patch.

---

## Ordem sugerida

```
0 → 1 (XP) → 2 (gear power) → 3 (hits) → 4 (refine) → 5 (H2) → 6 (boss soft) → 7 (Celestial) → 8
```

Cada etapa: PR separado, métricas antes/depois, rollback documentado no PR.

## O que NÃO fazer nesta leva

- Wipe de personagens.
- Break de item no refine.
- Hard-lock de região por chefe.
- Alterar saves fora do schema necessário às flags soft.

## Contato com simulador

Após cada merge:  
`cd idle && npx tsx scripts/balance-audit/run-validation.mjs`  
Comparar `v2_cenarios.csv` com a linha B alvo (Guerreiro ~26 h opt / ~54 h casual).
