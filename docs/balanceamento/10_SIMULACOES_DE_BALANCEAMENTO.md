# Simulações de Balanceamento

## Premissas

- Script: `idle/scripts/balance-audit/run-all.mjs`  
- Seed base: **42** (Mulberry32); variantes por perfil  
- Motor espelhado: intervalo, crit ×1.8, DEF monstro, block 12%, mago ×0.55  
- Skills de barra **não** 100% modeladas em todos os perfis (farm mult aplicado como xpMult externo)  
- Gear “gradual/strong” é **aproximação de aquisição**, não loot table Monte-Carlo completo  
- Produção: não simulada (sem DB)

## Resultados-chave

### Progressão até 500

Ver tabela em `02` / `simulacao_progressao.json`.

### Hipótese 24h

**Confirmada** para Guerreiro (10–18h efetivas). Arqueiro dump DEX: mais lento (36h no perfil strong).

### Offline

Sync única 24h wall → 2h reward. Ver `09`.

### Arquivos

Todos em `docs/balanceamento/data/` com coluna `source` ∈ {code, calculated, simulated, estimated}.
