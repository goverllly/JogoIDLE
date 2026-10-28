# 08 — Problemas conhecidos

Só itens com evidência (código, UI disabled, stub HTTP, roadmap no repo). Sem inventar bugs de jogabilidade sem prova.

## A. Comprovados no código / UI

| Item | Evidência |
|------|-----------|
| Botão **Publicar HUD** desabilitado (“Fase 5”) enquanto API publish existe | `admin-hud-builder.tsx` ~618; `POST .../hud-layout/publish` em `server.ts` |
| Aba **Backup / Restore** disabled (“Fase 4”) | `ADMIN_TABS` em `admin-types.ts` |
| **Publicar mapa** versionado disabled (“Fase 4”) | `admin-map.tsx` |
| Criação de **zonas novas** adiada (“Fase 3”) | `admin-zones.tsx` |
| Loot tables **por monstro** / skills de mob = Fase 2 | `admin-loot.tsx`, `admin-monsters.tsx`, `content/facade.ts` |
| Arena PvP **501** no standalone | `server.ts` loop `arena/*` |
| Engagement claim **410** | `server.ts`; `idle/README.md` |
| Ranking / seasons HTTP **vazios** | `GET /ranking`, `/seasons` stubs |
| Auth admin = e-mail/user fixos, sem cookie | `LOCAL_USER_ID/EMAIL` |
| `service.ts` Prisma é **legado**, não path standalone | nota no plano + imports server → `local-service` / `store` |
| Season end grava ação “stub standalone” | `admin-service.ts` `recordAdminAction(..., "stub standalone")` |
| Journey tipa fonte `arena` como stub | `journey.ts` header |

## B. Riscos (design / escala — não necessariamente bug)

| Item | Por quê |
|------|---------|
| Host público sem auth | Qualquer um chama admin APIs |
| Poll 2s + Three + CSS 4k linhas | Carga de rede/CPU em dispositivos fracos |
| Save JSON único | Sem versionamento UI; risco de perda se disco falhar |
| Refine sem falha | Sink previsível; pode acelerar poder vs economia |
| Offline catch-up 2h/request | Mitiga offline infinito; farm online contínuo sem soft-cap de gold |
| Divergência docs `docs/balanceamento` / `docs/capitulos` vs motor | Planos “4 Eras”, progressão 3.0 podem não refletir código atual |

## C. Necessita validação (teste manual / métrica)

| Item | Como verificar |
|------|----------------|
| Draft HUD nunca chega ao play sem publish API | Salvar draft → abrir play → comparar layout |
| Season end soft-reset completo | Rodar end season + inspecionar `save.json` |
| FPS com packs Kenney/Quaternius densos | Play em Cap II/IV + DevTools |
| Responsividade real ≤720px | Device / emulação |
| Race conditions no `store` sob cliques rápidos | Spam farm/item ops |
| Duelo jogável via alguma UI sem arena API | Buscar UI que chame motor duel vs só lobby |

## D. Fora do escopo / não é defeito do standalone

- Missões de engajamento / plantão TicTac — **removidos de propósito** (`idle/README.md`).
- Root Phaser “Véu de Cinzas” — projeto irmão, não runtime IDLE.
