# Atributos e Classes

## Pontos distribuíveis (comprovado)

| Contexto | Pontos |
|----------|--------|
| Por level-up Mortal | **5** |
| Por level-up Celestial | **10** |
| Bônus no ritual | **+20** unspent |
| Total só de levels até 500 mortal | (500-1)×5 = **2495** |
| `CLASSES.growth` | **NÃO aplicado** no level-up |

CSV: `atributos_por_nivel.csv`, `atributos_por_nivel_celestial.csv`.

## Fórmulas `computeStats` (comprovado — `character.ts` + `balance.ts`)

| Stat | Fórmula |
|------|---------|
| maxHp | round(90 + CON×14 + nível×6 + hpFlat) |
| maxMp | round(45 + INT×12 + nível×3 + mpFlat) |
| ATK físico | round(6 + STR×2.2 + attackFlat) |
| ATK mágico | round(6 + INT×2.4 + attackFlat) |
| attack usado | Mago → mágico; senão físico |
| defense | round(3 + CON×1.2 + STR×0.25 + defFlat) |
| intervalo | max(420, round(1450 − DEX×7)) ms |
| crit | min(0.45, DEX×0.0025 + critFlat/100) |

### +1 ponto — impacto absoluto (nível 50, attrs base da classe)

Ver `impacto_atributos.csv`. Resumo aproximado:

- **+1 STR:** +2.2 ATK físico; +0.25 DEF  
- **+1 INT:** +2.4 ATK mágico; +12 MP  
- **+1 DEX:** −7 ms intervalo; +0.25% crit  
- **+1 CON:** +14 HP; +1.2 DEF  

## Problema de classe: Arqueiro

`computeStats` **não** usa DEX no ataque. Arqueiro que investe em DEX ganha velocidade/crítico, mas o dano base continua dependente de STR. Simulação `E_arqueiro_strong` levou **36h** até 500 vs **10h** Guerreiro equivalente — evidência de atributo “primário” desalinhado com a fantasy da classe.

## Passivas de combate

- Guerreiro: 12% chance de zerar hit recebido  
- Mago: basic ×0.55; +4% MP no kill  
- Bárbaro: rage (skills), não MP  

## Builds (nível 100)

Ver `classes_e_builds.csv`. Builds full_str (ou full_int no Mago) dominam DPS básico; full_con maximiza sobrevivência com baixo DPS; full_dex acelera hits mas pouco ATK (exceto se STR já alto).
