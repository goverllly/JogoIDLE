# 07 — Matriz de funcionalidades

**Atualização Fase 6.1 (2026-10-28):** a matriz vigente de prontidão (local vs protected, beta, bloqueadores) está em [`16_AUDITORIA_FUNCIONALIDADES_LANCAMENTO.md`](16_AUDITORIA_FUNCIONALIDADES_LANCAMENTO.md). A tabela abaixo é inventário histórico e pode estar desatualizada (ex.: HUD Publicar e auth protected já existem no código).

Legenda: ver [README.md](README.md). Runtime = standalone `idle/`.

| Funcionalidade | Status | Arquivos principais | Dependências | Problemas conhecidos |
|----------------|--------|---------------------|--------------|----------------------|
| Lobby / criar personagem | Implementado | `lobby.html`, `local-service` create/select | `save.json` | — |
| Play / farm PvE | Implementado | `app.js`, `combat.ts` `processFarm` | zonas, stats | — |
| HP/MP / potions | Implementado | `combat.ts`, item ops | inventário | — |
| Classes (4) | Implementado | `data.ts`, `character.ts` | — | — |
| Skills combate + unlock | Implementado | `combat-skills.ts`, rotas skills | nível | — |
| Equip / inventário / refine | Implementado | `items.ts`, item ops | ouro, refinador | refine sem fail |
| Drops / raridade / Suco | Implementado | `items.ts`, `combat` rewards | `DROP_CHANCE` | loot table/mob Fase 2 |
| XP / level / caps 500/700 | Implementado | `balance.ts`, `character` | — | — |
| Ritual classificação | Implementado | ritual / balance `DIVINDADE_GOLD_COST` | Lv500 + Suco + 10M | — |
| Capítulos enter/gates | Implementado | `chapters.ts`, `/chapters/*` | progresso | docs “4 Eras” ≠ motor atual |
| Offline catch-up | Implementado | `offline-catchup.ts` | farm state | cap 2h/request |
| Fame / journey | Implementado | `fame`, `journey.ts`, APIs | store `fame` | arena fonte stub |
| Ranking season HTTP | Parcial | `server.ts` stubs vazios | — | UI pode mostrar vazio |
| Fame rankings | Implementado | `/fame/rankings` | journey stats | — |
| Duelo (motor) | Parcial | `duel.ts` | stake | Arena API **501** |
| Arena PvP | Não encontrado (desligado) | stubs 501 | — | — |
| Engagement claim | Não encontrado (desligado) | 410 | — | Admin métricas ainda existem |
| HUD layout published | Parcial | `hud-layout.ts`, runtime | publish | UI Publicar disabled Fase 5 |
| HUD Builder draft | Implementado | `admin-hud-builder.tsx` | draft API | — |
| Intro play | Implementado | `play-intro.*` | tokens | — |
| Admin itens | Implementado | `admin-items.tsx` | catalog | — |
| Admin monstros | Parcial | `admin-monsters.tsx` | catalog | skills/drops Fase 2 |
| Admin zonas create | Planejado (UI) | `admin-zones.tsx` | — | só overrides |
| Admin mapa publish | Parcial | `admin-map.tsx` | zone props | publish Fase 4 |
| Admin temporada end | Parcial | `admin-season`, stub action | — | soft-reset pleno Necessita validação |
| Admin backup | Planejado | tab disabled | — | Fase 4 |
| Simulador balance | Implementado | `admin/simulate` | motor | não grava |
| Economy overrides | Implementado | `admin-economy`, balance overrides | catalog | — |
| Three.js cena + props | Implementado | `scene3d.js`, `kaykit-props.js` | assets | particles pack na fila |
| Persistência JSON | Implementado | `store.ts` → `data/save.json` | disco | sem Prisma |
| Deploy Docker/Vercel idle | Não encontrado | — | — | ver `01_ARQUITETURA.md` |
| Auth multi-user | Não encontrado | LOCAL_USER_* | — | single-player |
| Testes automatizados amplos | Parcial | 3 arquivos `__tests__` | node:test | só appearance/journey |
| Balance audit script | Implementado (tooling) | `scripts/balance-audit` | — | não altera runtime |
| Root Phaser Véu | Fora do runtime IDLE | root `package.json` | — | projeto irmão |
