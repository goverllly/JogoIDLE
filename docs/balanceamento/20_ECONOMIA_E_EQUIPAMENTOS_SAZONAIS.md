# 20 — Economia e equipamentos sazonais

**Status:** proposta. **Não altera preços/refine live.**  
**Dados:** `data/v3_economia_capitulos.csv`, `data/v2_refine_alt.json`, Prog 2.0 B-det.

---

## Regra atual

| Item | Valor |
|------|-------|
| Refine | +5/nível, 100%, 1 Refinador, max +10, sem ouro na ação |
| Refinador (merchant) | 25 000 |
| Bag upgrade | 150 000 |
| Attr reset | 1 000 000 |
| Ritual | 10 000 000 + Suco |
| Raridades | common→legendary (mult 1–2.8) |
| Templates | ~1157; tiers de item 1–4; gear celestial min tier 14 |

Dores (auditoria): ouro sobra no late mortal; refine barato/forte; sinks fracos.

## Herança Prog 2.0 (ainda proposta)

**Refine B-det:** +3/+4 escada, refinadores 1→3, ouro ×1.55^n, 100%, sem break → ~168 refinadores / ~17.2M ouro (8 slots +10).

---

## Proposta 3.0 — equipamentos em 120 dias

### Tiers e raridades

| Camada | Cap. | Papel |
|--------|------|-------|
| t1–t4 mortal | I | Base; permanece útil em niches/sets |
| Celestial t1–t3 | II | Substitui mortal genérico; mortal boas peças podem persistir |
| Divino | II–III | Stats altos + resistências |
| Ancestral t0–t4 | III–IV | Endgame; evolução a partir de seed |
| Affix / artefato | III–IV | Mods de dimensão; evolução (D: até 5 tiers) |

**Raridade superior proposta (não no motor):** `mythic` / `ancestral` (mult ~3.5–4.2) — drop raro em Cap.III–IV.

### Conjuntos

- Sets 2/4/6 peças com bônus de **prep** (resist, intervalo, XP de domínio).
- Sets regionais (Lua, Forja, Oráculo) — identidade sem invalidar tudo.

### Legado vs substituição

| Situação | Decisão |
|----------|---------|
| Peça mortal legendary bem refinada | Pode ficar até Divino médio (stats + niche) |
| Refine alto em base fraca | Sink via **transferência parcial** de refine (proposta) ou scrap→mats |
| Ancestral | Evolui; não dropa “lixo” o build anterior de imediato |

Evitar: invalidar 100% do inventário no ritual (já alinhado: gear preservado).

### Refine avançado (proposta pós-+10)

- Cap.III+: **Awaken +1…+5** em slots Ancestrais — custo mats de dimensão + ouro Cap.III–IV.
- Cenário D: `B-det-plus` (mesma filosofia, curva mais cara no late).

---

## Economia por capítulo (Cenário C)

Valores analíticos — `v3_economia_capitulos.csv`:

| Cap. | Gold/h opt (ordem) | Sink principal |
|------|--------------------|----------------|
| I | ~8e4 | Refine B-det + ritual 10M |
| II | ~4e5 | Gear divino + refine cel |
| III | ~8e6 | Maestria + domínio |
| IV | ~2e8 | Artefatos + refine avançado |

### Metas de design

1. Jogador **não** acumula trilhões ociosos sem sink (Cap.IV sinks sobem com income).
2. Sinks **não** são muro: sempre há caminho com offline + farm de mats.
3. Novos recursos: **Essência de Maestria**, **Selo de Domínio**, **Fragmento Ancestral** (não só ouro).

### Ouro gerado vs gasto (intenção)

```
Cap.I:  income_total ≈ refine_out + ritual + margem_pequena
Cap.II: income ≈ divine_gear + cel_refine
Cap.III–IV: income ≈ mastery_gold + dominion_rerolls + artifact_evo
```

---

## Materiais

| Material | Fonte | Uso |
|----------|-------|-----|
| Refinador / variantes | Boss + merchant | Refine |
| Orvalho/Prata/Poeira Éter | Cel. early | Craft cel |
| Núcleo Nexus / Escama | Cel. adv | Ancestral seed |
| Essência crepuscular / Barra eterna | Dimensões | Affix + awaken |
| Fragmento de coroa | Endgame | Conclusão / cosmético craft |

---

## Links

- [04_EQUIPAMENTOS_E_REFINAMENTO.md](04_EQUIPAMENTOS_E_REFINAMENTO.md) (atual)
- [06_ECONOMIA_E_RECOMPENSAS.md](06_ECONOMIA_E_RECOMPENSAS.md) (atual)
- [14_PROGRESSAO_2_0.md](14_PROGRESSAO_2_0.md) (B-det)
- [23_PLANO_PROGRESSAO_3_0.md](23_PLANO_PROGRESSAO_3_0.md)
