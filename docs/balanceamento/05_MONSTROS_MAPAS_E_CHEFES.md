# Monstros, Mapas e Chefes

## Inventário

| Tipo | Quantidade |
|------|----------:|
| Regiões (BASE_ZONES) | **17** |
| Monstros trash | **34** (2/zona) |
| Chefes (1/zona) | **17** |
| Classes | **4** |

CSVs: `regioes.csv`, `monstros.csv`, `chefes.csv`, `regiao_dificuldade_deltas.json`.

## Calibração (`scaleMonster`)

Mobs miram TTK de ~10 hits (boss ~28) contra `expectedPlayerPower(level)` — attrs médios **sem** gear top. Qualquer poder acima dessa linha reduz o desafio.

## Curva de regiões

Progressão tipicamente `floresta` → … → `trono` / `eter` / `prova_divina` / zonas Celestial (`firmamento`, `nexus`, …).  
Prova Divina: `mortalOnly`, bossHpMult 2.2, refineDropChance 0.

## XP/hora simulada (Guerreiro gear gradual)

Ver `xp_por_hora_regiao.csv` — sobe ordens de magnitude do early para o late (dezenas de mil → milhões de XP/h), o que explica o fechamento rápido do gap até 500.

## Chefes

- Aparecem após `zoneBossWaveSize` (padrão 8; late 10–12).  
- Recompensas XP/ouro agregadas (~1.75× soma dos trash na construção).  
- Estratégia: majoritariamente **DPS + sobrevivência**; passivas/classes ajudam, mas não há “puzzle” de chefe além de stats.
