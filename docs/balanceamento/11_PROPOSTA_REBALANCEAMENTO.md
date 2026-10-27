# Proposta de Rebalanceamento (NÃO IMPLEMENTAR)

Três cenários. Objetivos de tempo são **propostas para decisão**, não requisitos.

## Situação atual (referência)

- Guerreiro → 500: **~10–18h** caça efetiva  
- Ouro ao 500: **~21–29M**  
- Refine: 100% até +10  

## Cenário A — Conservador

**Ideia:** frear XP late e sucatear um pouco o refine, sem redesenhar classes.

| Alvo | Atual | Proposta A |
|------|-------|------------|
| mobXpPerLevel | 20 | 14–16 |
| Expoente XP L≥350 | 1.22 | 1.28–1.30 |
| Refine sucesso | 100% | 100% até +5; 70–85% depois |
| REFINE_STAT_BONUS | 5 | 4 |

**Efeito estimado:** 500 em **~2–4 dias** de 2–3h/dia (ordem de grandeza). Risco baixo de frustração early.

## Cenário B — Equilibrado (recomendado)

Coordenado:

1. **XP:** reduzir `mobXpPerLevel` e endurecer curva L>200.  
2. **Mobs:** calibrar `expectedPlayerPower` incluindo **gear esperado por faixa** (não attrs nus).  
3. **Refine:** chance de falha sem quebra a partir de +6; teto de bônus menor ou soft-cap.  
4. **Economia:** sinks recorrentes (reparo/upkeep/consumíveis) ou custo ritual dinâmico.  
5. **Classes:** Arqueiro — parcela de DEX→ATK ou ATK híbrido.  
6. **Celestial:** zonas pós-ritual com floor de poder baseado em **poder ao ritualizar**, não só level 1.

**Efeito estimado:** 500 em **~1–2 semanas** casual (1–2h/dia); otimizado **~4–7 dias**. Celestial volta a ser marco.

## Cenário C — Desafiador

- XP bem mais baixa late; bosses com mecânicas/enrage  
- Refine com regressão possível em +8–10  
- Soft gate de região por poder (não só level)  
- Ritual consome parte do gear ou exige set específico  

**Efeito estimado:** 500 em **3–6 semanas** casual. Risco alto de churn se comunicação for má.

## O que NÃO fazer isoladamente

- Só multiplicar HP dos mobs (inflação sem decisão).  
- Só multiplicar XP necessária sem mexer em TTK/gear (sensação de “grind vazio”).
