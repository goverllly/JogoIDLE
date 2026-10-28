# 18 — Progressão exponencial e limites numéricos

**Status:** proposta. **Não altera o motor.**  
**Dados:** `data/v3_poder_escala.json`, `data/v3_offline_alternativas.json`.

---

## Regra atual

- Combate/economia usam apenas `Number` (IEEE-754). Sem BigInt no `idle/lib/jogo-idle/`.
- Dano: `max(1, floor(attack × mult) − mitigation)`; crítico ×1.8.
- HUD: `toLocaleString('pt-BR')` sem abreviação mi/bi/tri.
- Admin gold parse limita em `Number.MAX_SAFE_INTEGER` (~9.007e15).
- Escala atual de mobs: HP/ATK na ordem de centenas a dezenas de milhares nas 17 zonas (ver `regioes.csv`).

---

## Proposta 3.0 — escala por capítulo

Poder alto só é válido se inimigos e mecânicas acompanharem (TTK alvo estável; resistências; modifiers).

| Cap. | DPS jogador (faixa) | HP trash | HP chefe | TTK trash alvo |
|------|---------------------|----------|----------|----------------|
| I Mortal | 1 mil – 500 mil | 3e2 – 8e4 | até ~8e4 | 2–8 s |
| II Celestial | 500 mil – 500 mi | 1e5 – 2e8 | até ~1e9 | 3–12 s |
| III Ruptura | 500 mi – 500 bi | 1e8 – 2e11 | até ~1e12 | 4–15 s |
| IV Trono | 500 bi – 500 tri | 1e11 – 2e14 | até ~1e15 | 5–20 s |

Cenário D empurra o teto Cap.IV até ~9e14 (ainda &lt; `MAX_SAFE_INTEGER`).

### Princípio anti-esponja

Não escalar só HP. Combinar:

1. **Resistências** por família (fogo/gelo/sagrado/físico) — build prep.
2. **Modifiers de mapa** (intervalo↑, cura↑ inimigo, reflect parcial).
3. **Chefes multi-fase** com requisitos soft (domínio, maestria, set).
4. **Pressão de sobrevivência** (ATK inimigo sobe com estrela de domínio).
5. **Duração variável** (TTK alvo sobe em domínio alto, não em trash Cap.I).

Combate permanece **automático**; escolhas = attrs, gear, skills, poções, pets, região.

---

## Limites JavaScript / TypeScript

| Limite | Valor | Implicação |
|--------|-------|------------|
| `Number.MAX_SAFE_INTEGER` | 9 007 199 254 740 991 | Inteiros acima perdem precisão |
| Teto seguro proposto combate | ~1e15 | Folga antes do limite |
| Persistência JSON | number | APIs/rankings ordenam com comparação numérica até o teto |
| Críticos / mults | float | Preferir `Math.floor` em cada etapa; evitar acumular float sem arredondar |

### Arquitetura de escape (só se necessário)

**Não** introduzir libs agora. Se ultrapassar ~1e15:

1. **Camada de magnitude** (ex.: `power = { mantissa, exp3 }` onde exp3 = mil/mi/bi/tri) nos stats de combate; ou
2. **String decimal** só para ouro/ranking com comparação lexicográfica normalizada; ou
3. BigInt **apenas** em caminhos de persistência crítica (último recurso).

Prioridade: **manter `Number`** enquanto Cap.IV ≤ 1e15.

---

## Exibição pt-BR (proposta)

```
n < 1e3   → 1.234
n < 1e6   → 12,3 mil
n < 1e9   → 12,3 mi
n < 1e12  → 12,3 bi
n < 1e15  → 12,3 tri
n ≥ 1e15  → 12,3 qua
```

Tooltip/detalhe pode mostrar valor completo via `toLocaleString('pt-BR')`.

---

## Offline — comparação

**Atual:** `maxCatchUpMs = 2 h`, `maxTicks = 5000`.

| Alternativa | Cap | 8 h wall → recompensado | Nota |
|-------------|-----|-------------------------|------|
| atual_2h | 2 h flat | 2,0 h | Status quo |
| flat_8h | 8 h flat | 8,0 h | Favorece AFK demais |
| **proposta_C_8h_decay** | 8 h | **5,3 h** (100%/70%/40%) | **Recomendada** |
| flat_12h | 12 h | 8 h capped se cap 8… | Ver JSON |
| decay_12h | 12 h | ~6,6 h típico | Fallback |
| flat_24h | 24 h | 24 h | Quase remove diferencial online |
| decay_24h | 24 h | ~8–9 h | Recuperação longa |

Bandas C: 0–2 h @100%, 2–5 h @70%, 5–8 h @40%. Detalhe: `v3_offline_alternativas.json`.

**Ticks:** propor `maxTicks` ~12000 com cap 8 h (TTK baixo ainda pode esgotar ticks primeiro — documentar necessidade de syncs múltiplos ou tick scaling futuro).

---

## Compatibilidade rankings / APIs

- Ordenação por nível → XP → ouro permanece válida sob `Number` seguro.
- Fame/journey: totais sazonais vs lifetime já separados (`journey.ts`).
- Ao aproximar 1e15, rankings devem usar a mesma função de normalização do display.

---

## Links

- [17_VISAO_TEMPORADA_120_DIAS.md](17_VISAO_TEMPORADA_120_DIAS.md)
- [19_EXPANSAO_REGIOES_E_ENDGAME.md](19_EXPANSAO_REGIOES_E_ENDGAME.md)
- [23_PLANO_PROGRESSAO_3_0.md](23_PLANO_PROGRESSAO_3_0.md)
