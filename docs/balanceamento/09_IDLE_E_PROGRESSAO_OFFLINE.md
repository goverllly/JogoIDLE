# Idle e Progressão Offline

## Limites (comprovado — `combat.ts`)

| Limite | Valor |
|--------|------:|
| maxCatchUpMs | **2 horas** por request |
| maxTicks | **5000** (default) |
| Catch-up ID | após ≥60s elapsed |

## Interação 2h × 5000 ticks

- Se TTK é baixo (endgame), **5000 ticks** acabam em minutos de tempo de combate simulado — o jogador precisa de **vários requests** para consumir 2h de elapsed.  
- Se TTK é alto, as **2h** limitam primeiro.  
Simulação D em `idle_online_vs_offline.json`: chunk processou ~1.5h de fightMs com kills altos.

## Comparativo 24h (nível 50, zona on-level)

| Cenário | Horas recompensadas | XP |
|---------|--------------------:|---:|
| A_online_24h_continuous | 24 | 13.885.600 |
| B_offline_one_sync_after_24h_wall | 2 | 883.775 |
| C_offline_12_syncs_every_2h | 24 | 10.605.300 |
| D_offline_2h_chunk_tick_cap | — | — |

**Uma sync após 24h offline** só paga **2h**. Sync a cada 2h aproxima o online, ainda sujeito ao teto de ticks.

## Riscos de integridade (análise, sem exploit)

- `STALE_CHARACTER` / `updatedAt` mitiga writes concorrentes.  
- `offlineCatchUpId` + journey idempotência reduzem double-count de estatísticas.  
- Relógio do cliente não governa recompensas (servidor usa `Date.now()` e `lastTickAt`).
