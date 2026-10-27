# Ascensão Celestial

## Requisitos (comprovado)

- Nível **500**
- Ouro **10.000.000**
- Item **Suco Celestial** (drop Prova Divina + pity)

## Antes → Depois (simulação espelho)

| Campo | Antes (Mortal 500) | Depois (Celestial 1) |
|-------|--------------------|----------------------|
| Nível | 500 | **1** |
| Atributos | preservados | preservados |
| Equipamentos | preservados | preservados |
| Skills | preservados | preservados |
| Unspent | — | **+20** |
| Farm | ativo possível | **limpo** |
| Gold | −10M | |

HP/ATK mudam pelo termo `level×levelHp/Mp` (nível 1 vs 500), mas **attrs+gear** mantêm o grosso do poder. Um Celestial 1 com full gear mortal é **muito mais forte** que um Mortal 1.

Detalhe JSON: `ascensao_antes_depois.json`.

## Vantagens reais do Celestial

| Benefício | Existe? |
|-----------|---------|
| Cap 700 | Sim |
| 10 pts/nível | Sim |
| ×1.15 XP &lt;100 | Sim |
| Zonas Celestial | Sim (`requiresAscension`) |
| Título/capa | Sim |
| Reset total de poder | **Não** (gear/attrs ficam) |
| Nova árvore exclusiva | Não além de zonas/cap |

## Vale a pena?

Sim como **prestígio + endgame de zonas + ritmo de pts**, mas o ritual **não é um soft-reset de poder**. Quem chega ao 500 já carrega o poder; o desafio pós-ascensão depende das zonas Celestial acompanharem esse poder (hoje calibradas pela mesma `expectedPlayerPower(level)` do nível **atual**, ou seja, Celestial 1 enfrenta mobs de nível de zona alto com stats de mob altos — verificar TTK nas zonas `firmamento`/`nexus`).

## Tempo até ritual

≈ tempo até 500 (**10–18h** simuladas) + farm de Suco na Prova Divina (RNG; pity). Não inventar horas de pity — depende de drops.
