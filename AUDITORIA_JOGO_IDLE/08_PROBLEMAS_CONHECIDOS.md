# 08 — Problemas conhecidos

**Fase 6.2 (código `384060d`):** cliente CSRF, ocultação do duelo, restore em instância isolada e `frame-ancestors 'self'` nas duas prévias estão em [`16_AUDITORIA_FUNCIONALIDADES_LANCAMENTO.md`](16_AUDITORIA_FUNCIONALIDADES_LANCAMENTO.md). A beta fechada continua sem convite: HTTPS, health, observabilidade e procedimento de convidado seguem abertos. O segredo de sessão não invalida cookies restaurados.

Só itens com evidência (código, UI disabled, stub HTTP, roadmap no repo). Sem inventar bugs de jogabilidade sem prova.

## A. Comprovados no código / UI

| Item | Evidência |
|------|-----------|
| Aba **Backup / Restore** disabled (“Fase 4” no Admin Studio — **fora** da Fase 4 de gameplay) | `ADMIN_TABS` em `admin-types.ts` |
| **Publicar mapa** versionado disabled (“Fase 4” no Admin Studio) | `admin-map.tsx` |
| Criação de **zonas novas** adiada (“Fase 3”) | `admin-zones.tsx` |
| Loot tables **por monstro** / skills de mob = Fase 2 | `admin-loot.tsx`, `admin-monsters.tsx`, `content/facade.ts` |
| Arena PvP **501**; botões `#arena-combat-btn` e `#arena-btn` ocultos. `#arena` é a caça PvE e permanece. O módulo não abre sozinho | `server.ts`, `play.html`, `theme-ref.css`, `app.js` |
| `IDLE_SESSION_SECRET` não assina o cookie. Copiar `auth-sessions.json` mantém a sessão antiga válida com outro segredo | `restore-drill.test.ts` |
| Engagement claim **410** | `server.ts`; `idle/README.md` |
| Ranking / seasons HTTP **vazios** | `GET /ranking`, `/seasons` stubs |
| Auth admin = e-mail/user fixos em **local**; protected usa sessão (Fase 2) | `IDLE_AUTH_MODE` + `13_FASE2_AUTH.md` |
| `service.ts` Prisma é **legado**, não path standalone | nota no plano + imports server → `local-service` / `store` |
| Season end grava ação “stub standalone” | `admin-service.ts` `recordAdminAction(..., "stub standalone")` |
| Journey tipa fonte `arena` como stub | `journey.ts` header |

## B. Riscos (design / escala — não necessariamente bug)

| Item | Por quê |
|------|---------|
| Host público sem `protected` + TLS | Modo `local` ainda aberto; ver Fase 2 / `13_FASE2_AUTH.md` |
| Poll 2s + Three + CSS 4k linhas | Carga de rede/CPU em dispositivos fracos |
| Save JSON único | Sem versionamento UI; risco de perda se disco falhar |
| Refine sem falha | Sink previsível; pode acelerar poder vs economia |
| Offline catch-up 2h/request (+5k ticks); chunks podem >2h | Confirmado Fase 4 — decisão de produto; ver `14_AUDITORIA_GAMEPLAY.md` |
| Arqueiro: ATK físico escala STR; dump em DEX na sim → DPS baixo | Premissa de simulação; possível gap UX — **sem retune** nesta fase |
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
