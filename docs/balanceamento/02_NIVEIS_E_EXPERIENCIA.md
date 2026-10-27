# Níveis e Experiência

## Fórmula (`balance.ts` — comprovado)

```
xpToNextLevel(L):
  L < 50  → floor(100 * L^1.4)
  L < 150 → floor(120 * L^1.32)
  L < 350 → floor(160 * L^1.28)
  else    → floor(220 * L^1.22)
```

Caps: Mortal **500**, Celestial **700** (mesma curva de XP).

## Marcos

| Nível | XP → próximo | XP acumulada até o nível |
|------:|-------------:|-------------------------:|
| 1 | 100 | 0 |
| 5 | 951 | 1.524 |
| 10 | 2.511 | 9.231 |
| 20 | 6.628 | 51.951 |
| 30 | 11.694 | 140.357 |
| 50 | 20.980 | 486.170 |
| 75 | 35.831 | 1.184.904 |
| 100 | 52.381 | 2.276.123 |
| 150 | 97.615 | 5.783.685 |
| 200 | 141.071 | 11.714.562 |
| 250 | 187.708 | 19.898.596 |
| 300 | 237.047 | 30.482.314 |
| 400 | 328.803 | 58.765.807 |
| 500 | 431.684 | 96.696.680 |
| 600 | 539.221 | 145.152.254 |
| 700 | 650.792 | 204.565.604 |

**Total XP até 500:** 96.696.680  
**Total XP até 700:** 204.565.604

CSV completo: `data/xp_por_nivel.csv`.

## Fontes de XP (comprovado)

| Fonte | Existe? | Detalhe |
|-------|---------|---------|
| Kill farm (`applyRewards`) | Sim | Única fonte no motor de caça |
| Mult skill fazenda | Sim | 1.15 / 1.2 / 1.25 |
| Celestial Lv&lt;100 | Sim | ×1.15 |
| Engagement options | Sim (produção) | `xpMult` server-side |
| Missões standalone | Não | claim 410 |
| Diferença online/offline XP/kill | Não | mesma fórmula; offline limita **tempo/ticks** |

XP do monstro (`scaleMonster`): `max(8, round(level * mobXpPerLevel * xpMult * (boss?2.2:1)))` com `mobXpPerLevel=20`.

## Hipótese nível 500 em 24h

### Simulação de ciclo completo (calculado)

Caça com ataques, intervalo, críticos, bloqueio Guerreiro, mortes, troca automática de região (maior `minLevel` acessível), atributos por nível e curvas de gear:

| Perfil | Gear | XP mult | Horas até 500 | Kills | Faints | Ouro |
|--------|------|---------|--------------:|------:|-------:|-----:|
| A_no_gear | GUERREIRO | none | ×1 | **18h** | 18741 | 298 | 29.029.875 |
| B_gradual_gear | GUERREIRO | gradual | ×1 | **16h** | 18668 | 85 | 28.570.186 |
| C_gradual_xp115 | GUERREIRO | gradual | ×1.15 | **15h** | 16065 | 195 | 25.373.017 |
| D_strong_gear | GUERREIRO | strong | ×1.15 | **11h** | 16741 | 0 | 26.290.337 |
| E_strong_xp125 | GUERREIRO | strong | ×1.25 | **10h** | 15730 | 0 | 21.336.312 |
| E_arqueiro_strong | ARQUEIRO | strong | ×1.25 | **36h** | 17045 | 1940 | 22.248.798 |

**Conclusão:** para Guerreiro, **10–18h de processamento efetivo** bastam. A hipótese “1 dia” é **confirmada** e até subestimada para builds físicas otimizadas.

### Limite analítico (zona fixa — estimado)

Se o jogador ficasse só em `floresta` (20 XP/kill), seriam milhões de kills — irrealista. Em `trono` (~9000 XP/kill) o piso analítico otimista ≈ 30h com TTK artificial de 10s. A simulação real fica **mais rápida** porque TTK cai muito abaixo de 10s em endgame.

### 24h corridas vs efetivas vs sync

Ver `09_IDLE_E_PROGRESSAO_OFFLINE.md` e `data/idle_online_vs_offline.json`.
