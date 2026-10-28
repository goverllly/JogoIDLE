# 04 — HUD e UX (cliente play)

Fontes: `idle/public/jogo-idle/play.html`, `hud.css`, `theme-ref.css`, `play-intro.*`, `hud-layout-runtime.js`, `app.js`, `scene3d.js`.

## 1. Estrutura da tela de jogo

| Camada | Arquivo | Papel |
|--------|---------|--------|
| Markup | `play.html` | `.frame` + colunas `data-hud-id` (stage-left/center/right, viewport) |
| Estilo HUD | `hud.css` | Layout, painéis, breakpoints |
| Molduras / tema | `theme-ref.css` (~4370 linhas) | Tokens madeira, plaque SVG, canto wood-* |
| Intro | `play-intro.css` + `play-intro.js` | Overlay cinematográfico antes do HUD |
| Lógica UI | `app.js` (~2269 linhas) | Poll, farm, inventário, skills |
| 3D | `scene3d.js` (~2076 linhas) | Three.js arena + props |
| Layout remoto | `hud-layout-runtime.js` | Aplica só layout **publicado** |

CSS carregados em `play.html`: `hud.css`, `theme-ref.css`, `play-intro.css` (+ viewport meta).

## 2. Molduras e tema visual

- Classe raiz: `body.play-stage`; container principal `.frame`.
- Moldura de arena: `.arena-stone-frame` no viewport (`play.html`).
- Painéis modais usam `panel-frame` (skills, zonas).
- Tokens de canto madeira: `--wood-corner-tl/tr/bl/br` em `theme-ref.css` (SVG data-URI).
- Status: **Implementado** no CSS/HTML; qualidade visual **Necessita validação** em dispositivo real.

## 3. Responsividade

Evidência em `hud.css`:

- `@media (max-width: 720px)` — rearranjo principal
- `@media (max-width: 480px)` / `420px` — ajustes finos

Breakpoints do HUD Builder (admin) usam desktop/tablet/mobile no draft; runtime do play consome documento publicado com props por breakpoint (`hud-layout.ts` / bridge).

## 4. Intro cinematográfica

| Aspecto | Evidência |
|---------|-----------|
| Boot | `body.play-intro-pending`; script early em `play.html` adiciona `play-intro-boot` |
| Overlay | `#play-intro` com bg, título, skip, hint |
| Entrada HUD | `body.play-intro-hud-enter` + stagger em colunas `data-hud-id` |
| Tokens de timing | `--play-intro-fade-ms`, `--play-intro-title-ms`, `--play-intro-hud-ms`, etc. |
| Admin | Tokens `draft.tokens.intro` no HUD Builder (`admin-hud-builder.tsx`) |
| Reduced motion | `play-intro.js` consulta `prefers-reduced-motion: reduce`; CSS espelha em `@media` |

Status: **Implementado** no cliente; skip e reduced-motion presentes no código.

## 5. Layout publicado vs draft

- `GET /api/jogo-idle/hud-layout` → `getPublishedHudLayout()` (`server.ts`).
- `hud-layout-runtime.js` faz `fetch("/api/jogo-idle/hud-layout")` e aplica layout.
- Draft só via admin (`PUT .../hud-layout/draft`); botão **Publicar** na UI está **disabled** (`title="Publicação: Fase 5"`), embora `POST .../hud-layout/publish` exista no servidor.

Consequência auditável: edições no Builder **não** chegam ao play até alguém chamar publish (API) ou haver published prévio em `save.json`.

## 6. Polling e feedback ao jogador

- `POLL_MS = 2000` em `app.js` — refresh de estado/`me` a cada 2s.
- Announcements: `pollAnnouncements` no mesmo intervalo.
- CD de skills: ticker DOM a 100ms (`combatCdTicker`).

## 7. Acessibilidade / motion

`prefers-reduced-motion: reduce` encontrado em:

- `play-intro.css`
- `theme-ref.css` (múltiplos blocos)
- `hud.css`
- `cronicas.css`, `arena.css`

Status: **Parcialmente implementado** — cobertura CSS existe; auditoria a11y completa (foco, ARIA além dos dialogs) **Necessita validação**.

## 8. Áudio e VFX

- `audio.js` — WebAudio synth (sem pack de SFX baixado; ver ASSETS-ROADMAP).
- Partículas Three em `scene3d.js` (embers/rise por zona).
