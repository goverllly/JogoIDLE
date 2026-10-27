# 22 — Simulação de temporada completa (120 dias)

**Status:** modelo analítico Cenário C. **Não é Monte Carlo do combate.**  
**Dados:** `data/v3_perfis_120d.json`, `data/v3_capitulos.csv`, `data/v3_offline_alternativas.json`.  
**Runner:** `idle/scripts/balance-audit/run-v3-season.mjs`.

---

## Premissas

| Premissa | Valor |
|----------|-------|
| Offline | `proposta_C_8h_decay` (8 h, 100/70/40%) |
| Cap.I XP | Cenário B (26 / 35 / 54 h →500) |
| Cap.II–IV | Orçamento de **horas de conteúdo** (regiões, gear, maestria, domínio, chefes) |
| Utilization | Casual 72% · Dedicado 88% · Competitivo 95% do catch-up teórico |
| Offline/dia | 1 catch-up principal (não N×8 h) |

### Distinção de tempos

| Tipo | Significado |
|------|-------------|
| Calendário | 120 dias fixos |
| Conectado | `activeMinPerDay` |
| Recompensado | ativo + offline efetivo × utilization |

---

## Perfis

| Perfil | Ativo/dia | Offline wall | Rewarded/dia (após util.) |
|--------|-----------|--------------|---------------------------|
| Casual | 25 min | ~14 h noite | **~4,1 h** |
| Dedicado | 70 min | ~10 h + extra | **~6,6 h** |
| Competitivo | 150 min | ~6 h + extra | **~7,6 h** |

### Orçamento de horas recompensadas até marcos

| Etapa | Casual | Dedicado | Competitivo |
|-------|--------|----------|-------------|
| →500 | 54 | 35 | 26 |
| Buffer Suco | 10 | 6 | 4 |
| →700 (c/ gates) | 140 | 120 | 100 |
| → conclusão | 380 | 420 | 380 |
| Opcionais | 100 | 110 | 140 |

---

## Resultados (marcos de calendário)

Fonte: `v3_capitulos.csv` / `v3_perfis_120d.json`.

| Perfil | L500 | Ascensão | Cel 700 | Conclusão | Opcionais | Banda |
|--------|------|----------|---------|-----------|-----------|-------|
| Casual | d14 | d17 | d52 | **d120** | d120 | d100–120 |
| Dedicado | d6 | d7 | d26 | **d90** | d107 | d75–95 |
| Competitivo | d4 | d5 | d19 | **d69** | d88 | d60–80 |

### Totais na temporada

| Perfil | Conectado (h) | Recompensado (h) |
|--------|---------------|------------------|
| Casual | ~50 | ~494 |
| Dedicado | ~140 | ~789 |
| Competitivo | ~300 | ~912 |

### Progressão nos checkpoints de capítulo

| Perfil | d30 | d60 | d90 | d120 |
|--------|-----|-----|-----|------|
| Casual | L400–500 prep ritual | cel 100–220 | cel 400–650 | conclusão no limite |
| Dedicado | ascendido ou L500 | cel 300–450 | 700 + maestria mid | conclusão + opcionais |
| Competitivo | cel early | 500 + maestria | maestria alta / domínio 4 | leaderboards |

---

## Distribuição estimada de conclusão

| Percentil / perfil | Dia de conclusão |
|--------------------|------------------|
| p10 competitivo | ~d60–70 |
| p50 dedicado | ~d80–90 |
| p90 casual | ~d110–120 |
| Sem aproveitar offline | Risco de não fechar Cap.IV |

Competitivo conclui cedo e gasta Cap.IV em **leaderboards / domínio 7 (D) / artefatos**.

---

## Sensibilidade offline

Hipótese: Casual, 14 h wall, utilization 0.72.

| Política | Rewarded offline/noite (antes util.) | Efeito na conclusão casual |
|----------|--------------------------------------|----------------------------|
| 2 h flat | 2,0 h | Empurra conclusão além de 120 sem mais ativo |
| 8 h decay (C) | 5,3 h | **Alvo** — fecha ~d120 |
| 8 h flat | 8,0 h | Conclusão ~2–3 semanas antes; menos pressão online |
| 24 h flat | 24 h | Temporada “dormindo”; diferencial competitivo cai |

Detalhes de amostras 2–24 h: `v3_offline_alternativas.json`.

---

## Mortes / refine / regiões (qualitativo no modelo C)

| Eixo | Casual | Competitivo |
|------|--------|-------------|
| Mortes | Mais faints mid (gearPower 0.32) | Otimiza zona/TTK |
| Refine | B-det ao longo Cap.I–II | Rush B-det + awaken Cap.III |
| Regiões | Segue minLevel | Domínio paralelo |
| Ascensão | ~d17 | ~d5 |

Simulação de combate detalhada Cap.I permanece a de Prog 2.0 (`v2_*`). Cap.II–IV são **orçamentos de conteúdo** até haver implementações.

---

## Limitações do modelo

1. Não re-simula TTK/faints por região nova.
2. Suco Celestial = buffer de horas, não RNG completo.
3. Utilization é proxy de comportamento humano.
4. Drop live 0.016 vs sim 0.11 continua divergência operacional (auditoria anterior).

---

## Links

- [17_VISAO_TEMPORADA_120_DIAS.md](17_VISAO_TEMPORADA_120_DIAS.md)
- [15_COMPARATIVO_CENARIOS.md](15_COMPARATIVO_CENARIOS.md) (A/B/B+)
- [23_PLANO_PROGRESSAO_3_0.md](23_PLANO_PROGRESSAO_3_0.md)
