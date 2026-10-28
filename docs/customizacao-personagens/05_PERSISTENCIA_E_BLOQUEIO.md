# 05 — Persistência e bloqueio

## Create

- Aparência enviada uma vez no `POST /characters`.  
- Server: `normalizeAppearance` (whitelist de IDs) + `appearanceLocked=true`.  
- Confirmação no Studio é UX; o bloqueio real é no backend.

## Pós-create

| Ação | Resultado |
|------|-----------|
| PATCH/POST appearance | 403 |
| Payload adulterado no create | valores inválidos clampados |
| Soft reset temporada | preserva appearance + lock |
| Ascensão | preserva appearance |
| Capítulos | sem tocar appearance |
| Cosméticos equip | só `cosmetics` IDs |

## Personagens antigos

- Sem `schemaVersion`: `ensureAppearance` normaliza com defaults.  
- Não abrem o Studio retroativamente.  
- Sem migração destrutiva.

## Escala e stance

- Escala: só `model.scale` no cliente.  
- Stance: preferência de idle/apresentação; motor de combate continua controlando ataques.