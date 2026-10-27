# 05 — Progressão e balanceamento

**Status:** proposta matemática. **Não alterar XP/attrs/mobs live.**

---

## Regra atual

- XP piecewise (`xpToNextLevel`): faixas L&lt;50 / &lt;150 / &lt;350 / else.
- Caps: Mortal 500, Celestial 700; mesmo curve.
- Mobs: `mobXpPerLevel` 20, TTK ~10/28 hits; gear **não** entra no poder esperado.
- Ranking: Celestial &gt; Mortal, depois level.
- Offline: 2 h / 5000 ticks.
- Prog 2.0 Cenário B (sim): Guer. opt **26 h** / casual **54 h** →500; não implementado.

## Proposta Quatro Eras

### Capítulos e níveis

- 4 × 500 níveis **independentes**.
- Ritual → próximo capítulo no **nível 1**; bucket anterior intacto.
- Classificação: Mortal → Celestial → Divino → Semideus.
- Ranking: `classificationRank` depois `chapterLevel` (e desempates XP/ouro).

### Cap.I — referência Cenário B

Herdar params B: `mobXpPerLevel` 15, hits 11/32, `gearPowerFraction` 0.32, refine B-det, H2 DES→ATK, smooth_B.

Meta tempo **efetivo** Cap.I alinhada a B; calendário casual ~**20–25 dias** com offline proposto.

### Bandas de poder (ilustrativas, não pad-only)

| Cap. | DPS alvo | HP trash (ordem) | HP chefe |
|------|----------|------------------|----------|
| I | mil – ~5e5 | 1e2 – 1e5 | até ~1e5 |
| II | ~1e6 – 1e9 | 1e5 – 1e9 | até ~1e10 |
| III | ~1e9 – 1e12 | 1e8 – 1e12 | até ~1e13 |
| IV | ~1e12 – 1e15+ | 1e11 – 1e15 | até além do safe int |

Dentro do capítulo: curva suave 1→500 (mesmo espírito piecewise; coeffs por `chapterId`).

### Fórmulas (proposta — a calibrar em sim)

```
mobHp   = baseHp(chapter) * (1 + level^α_c) * resistMult * affixMult
mobAtk  = baseAtk(chapter) * (1 + level^β_c) * pressureMult
playerAtk = f(attrs, gearTier, refine, chapterSynergy)
damage  = max(1, floor(playerAtk * skillMult * critMult) - mitigation(def, resists))
xpMob   = max(minXp_c, round(level * mobXpPerLevel_c * zoneMult * bossMult))
```

- `chapterSynergy`: gear do capítulo atual com peso cheio; gear antigo com **soft-cap** (doc 06).
- Crítico: manter teto %; scaling de **dano** do crit sobe com banda do capítulo, não só chance.
- Skills: multiplicadores por capítulo + caps para não one-shot Cap.I gear em Cap.IV.

### Mecânicas ≠ números

| Cap. | Mecânica | Efeito no balance |
|------|----------|-------------------|
| I | Refine / attrs | Poder base |
| II | Maldição / resist espiritual | Sem resist adequada → TTK↑ e faints↑ |
| III | Elementos / burn | Build elemental vs resist do mapa |
| IV | Affixes cósmicos / fases | Prep de domínio/affix; chefes multi-fase |

### Temporada ~120 dias (casual regular)

| Cap. | Dias-alvo casual | Dedicado (ordem) | Competitivo (ordem) |
|------|------------------|------------------|---------------------|
| I Floresta | 20–25 | 10–15 | 5–10 |
| II Cemitério | 25–30 | 15–20 | 10–15 |
| III Fogo | 30–35 | 20–25 | 12–18 |
| IV Vazio | 30–40 | 22–30 | 15–22 |

Sem time-gate de capítulo por data. Offline proposto: **8 h + decay** (100/70/40) vs atual 2 h — ver Prog 3.0 `v3_offline_alternativas.json` como anexo de referência.

Não limitar o balance “só até 500 do Cap.I”: Cap.II–IV carregam a maior parte do calendário.

### Limites numéricos JS

| Limite | Valor | Ação |
|--------|-------|------|
| `Number.MAX_SAFE_INTEGER` | ~9.007e15 | Teto seguro de inteiros |
| Cap.I–III proposto | ≤1e15 | Manter `Number` + `Math.floor` |
| Cap.IV / além | pode cruzar | Ver arquitetura abaixo |

**Solução escalável (proposta, sem lib obrigatória):**

1. **Fase A:** `Number` + display abreviado pt-BR (`mil`/`mi`/`bi`/`tri`/`qua`).
2. **Fase B (quando necessário):** valor de combate como `{ m: mantissa, e: exp3 }` (exp em passos de 10³) ou string decimal normalizada só em ouro/ranking; comparação e ops em helpers únicos.
3. **BigInt** apenas se persistência exigir inteiros exatos além do safe — último recurso.

Não aplicar multiplicadores 1e20 “no escuro”: cada banda valida TTK alvo e precisão em testes (doc 09).

---

## Alterações necessárias

- `levelCapFor` por capítulo (=500).
- Bands + resists no `scaleMonster` / stats.
- Ranking multi-classificação.
- Offline params (proposta separada).
- Simulador estendido Cap.II–IV.

## Dependências

Cenário B; docs 03/04/06; feature flag.

## Impactos

Celestial L700 legado: ver doc 09 (overflow compensado).  
Soft reset: zera buckets sazonais; não apaga classificação histórica.

## Critérios de aceite

- Cap.I sim ≈ metas B.
- Calendário casual ~120 d documentado.
- Ranking Semideus L1 &gt; Divino L500.
- Plano numérico com escape documentado.

## Migração / rollback

Params de balance atrás de flag; rollback restaura caps 500/700 e curva motor.
