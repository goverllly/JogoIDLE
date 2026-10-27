# Equipamentos e Refinamento

## Catálogo

- Templates: **1157** (`listCatalog`)  
- Raridades: common → legendary (pesos 600/260/…/8; mults 1→2.8) — `raridades.csv`  
- Amostra: `equipamentos.csv`

## Drops efetivos

| Ambiente | dropChance trash | boss × |
|----------|-----------------:|-------:|
| Default código | 0.11 | ×2.5 (típico) |
| Standalone live | **0.016** | idem mult |

## Refinamento (comprovado)

| Item | Valor |
|------|------:|
| Máximo | **+10** |
| Bônus | **+5** por nível em cada `refineTarget` |
| Chance de sucesso | **100%** |
| Falha / quebra / regressão | **Não existem** |
| Custo | 1× Refinador (sem ouro na ação) |
| Preço mercador Refinador | 25.000 |

CSV: `refinamento.csv`, `refinamento_conjunto.csv`.

### Impacto de conjunto

8 peças em +10 (1 atr alvo cada) ≈ **+400** na estatística primária agregada ≈ **+880 ATK** se tudo em STR (×2.2) — suficiente para colapsar TTK on-level.

**Diagnóstico:** o refine **não destrói sozinho** o jogo, mas combinado com calibração de mobs para “jogador médio” sem gear forte, **sim — torna monstros irrelevantes cedo**. Gravidade: **Alta**.

## Quando o gear fica “forte demais”

Simulações TTK (`ttk_por_nivel.csv`): com gear `strong`, bosses on-level morrem sem faint em faixas altas; sem gear há faints. O ponto de virada é gradual (~nível 50–100 com loot/refine), acelerado se o dropChance for o default 0.11.
