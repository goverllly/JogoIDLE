# Auditoria Geral — Progressão e Balanceamento 1.0

> Gerado em 2026-10-27T03:16:57.769Z. **Somente leitura.** Sem alterações de produção.

## Situação atual (resumo executivo)

O Jogo IDLE, com as regras atuais do código, permite alcançar o **nível 500 (cap mortal) em aproximadamente 10–18 horas de caça efetiva** em perfis Guerreiro simulados — **abaixo de 24 horas**, confirmando a hipótese do design.

Fatores principais:

1. **XP por kill escala com o nível da zona** (`mobXpPerLevel = 20` → mob nível 450 ≈ 9000 XP).
2. **Mobs calibrados para um “jogador médio”** (`expectedPlayerPower`), então gear/refine/build acima da média **derretem o TTK**.
3. **Curva de XP suave** (expoentes 1.4→1.22) — total até 500 ≈ **96,7 milhões de XP**.
4. **Refine +10 com 100% de sucesso** e +5 por estatística alvo.
5. **Buffs de fazenda** até +25% XP; Celestial +15% XP abaixo do 100.

## Configurações efetivas vs defaults

| Item | Default código | Standalone (`save.json`) | Produção |
|------|----------------|---------------------------|----------|
| `dropChance` | **0.11** | **0.016** (divergente) | N/A (DB não acessível neste repo) |
| `__world.balance` | DEFAULT_BALANCE | **vazio** (= defaults) | N/A |
| Overrides de zona | BASE_ZONES | nenhum | N/A |

**Impacto da divergência de drop:** no standalone, drops de equipamento são ~7× mais raros que o default do código. A progressão de **nível/XP** (simulada) ainda é rápida; a progressão de **poder via loot** fica mais lenta localmente. Produção pode diferir — validar `jogo_idle_catalog_state`.

## Personagens observados no save local (evidência histórica)

- **TesteIdle** (GUERREIRO): Nv.38, ascension=CELESTIAL, gold=61341224, criado 2026-10-26T03:23:54.036Z
- **Pedro** (BARBARO): Nv.89, ascension=CELESTIAL, gold=501916, criado 2026-10-27T02:26:10.524Z

Observação: há Celestiais locais em níveis baixos pós-ritual com ouro alto — compatível com progressão acelerada pré-ritual.

## Problemas por gravidade

| Gravidade | Problema | Evidência |
|-----------|----------|-----------|
| **Crítica** | Cap mortal (~500) em &lt;1 dia de caça efetiva | `simulacao_progressao.json`: 10–18h |
| **Crítica** | TTK colapsa com gear/refine acima do “jogador médio” usado na calibração de mobs | `data.ts` `expectedPlayerPower` + `ttk_por_nivel.csv` |
| **Alta** | Refine 100% sucesso, +5/nível, até +10 | `inventory.ts` refineItem; `refinamento.csv` |
| **Alta** | Ouro ao 500 (~21–29M) &gt; custo do ritual (10M) com folga | simulações |
| **Alta** | Ataque do Arqueiro usa STR, não DEX — DEX só crit/velocidade | `computeStats` + sim Arqueiro 36h |
| **Média** | `CLASSES.growth` declarado mas **não aplicado** no level-up | `character.ts` / `data.ts` |
| **Média** | Offline: 2h/request; 5000 ticks pode cortar antes das 2h | `combat.ts` |
| **Média** | Drop standalone 0.016 vs 0.11 default | `save.json` |
| **Baixa** | Missões/engajamento desligados no standalone | README |

## Sistemas mais desbalanceados (ordem)

1. Ritmo XP × escala de zona  
2. Calibração de monstros vs poder real do player  
3. Refinamento  
4. Economia (sinks insuficientes até o ritual)  
5. Identidade de atributos por classe (Arqueiro)

## Recomendações prioritárias (não implementadas)

Ver `11_PROPOSTA_REBALANCEAMENTO.md` e `12_RESUMO_PARA_DECISAO.md`. Preferência analítica: **Cenário B (Equilibrado)**.

## Fontes

- `idle/lib/jogo-idle/game/balance.ts`, `data.ts`, `character.ts`, `combat.ts`, `inventory.ts`, `items.ts`
- Dados: `docs/balanceamento/data/*`
- Script: `idle/scripts/balance-audit/run-all.mjs`
