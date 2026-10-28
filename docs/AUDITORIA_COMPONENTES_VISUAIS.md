# Auditoria de Componentes Visuais — Jogo IDLE (HUD 3.0)

**Data:** 2026-10-26  
**Tipo:** Análise e documentação apenas — nenhum código, CSS ou asset foi modificado.  
**Objetivo:** Inventariar componentes visuais reais do jogo para produzir um kit Dark Fantasy Medieval ilustrado.

**Documentos irmãos:** [`CATALOGO_ASSETS_HUD_3.md`](CATALOGO_ASSETS_HUD_3.md) · [`GUIA_VISUAL_HUD_3.md`](GUIA_VISUAL_HUD_3.md) · [`PROMPTS_ASSETS_HUD_3.md`](PROMPTS_ASSETS_HUD_3.md)  
**Complemento HUD combate (medidas browser):** [`AUDITORIA_VISUAL_HUD.md`](AUDITORIA_VISUAL_HUD.md)

---

## Resumo quantitativo

| Categoria | Quantidade | Notas |
|-----------|------------|--------|
| Telas / áreas ativas no play+lobby | **12** | Lobby, Personagem, Equip, Skills (teaser+modal), Perf, Mochila, Combate/caça, Mercador, Divindade, Arena, Offline report, Hunt-perf |
| Modais / overlays documentáveis | **14** | Inclui tip, menu, drawers, pops |
| Famílias de botão CSS | **18** | Ver §4 |
| Painéis / cards com chrome próprio | **11** | Rail, bag, log, zone, 3× unit, attr, pets, gold, arena viewport |
| PNGs HUD em uso ativo | **6** (+ 4 portraits JPG) | Ver §1.3 |
| Assets órfãos em `assets/hud/` | **5** | Ranking — sem referência no play |
| Telas pedidas **não encontradas** | **10+** | Ver §1.2 |
| Assets novos recomendados (após dedupe) | **~52** | Ver catálogo |

**Legenda de medidas**

| Marca | Significado |
|-------|-------------|
| **[CSS]** | Valor literal no stylesheet |
| **[CALC]** | Derivado de fórmula CSS (ex.: `--hud-h × ratio`) |
| **[BROWSER]** | `getBoundingClientRect` em viewports documentados em `AUDITORIA_VISUAL_HUD.md` |
| **[EST]** | Estimativa quando só o layout fluido define o tamanho |

---

## 1. Escopo e fontes

### 1.1 Fontes de verdade

| Fonte | Papel |
|-------|--------|
| [`idle/public/jogo-idle/play.html`](../idle/public/jogo-idle/play.html) | Shell canônico (`body.play-stage`) |
| Cascade CSS | `styles.css` → `hud.css` → `theme-v2.css` → [`theme-ref.css`](../idle/public/jogo-idle/theme-ref.css) |
| JS de UI | `app.js`, `inventory.js`, `merchant.js`, `arena-ui.js`, `divindade.js`, `confirm-dialog.js`, `offline-report.js`, `hunt-perf-ui.js`, `engagement.js`, `fx.js` |
| Assets | [`idle/public/jogo-idle/assets/hud/`](../idle/public/jogo-idle/assets/hud/) |

**Excluído desta auditoria:** Admin Studio (`admin/`, `admin-ui/`), `map-editor`, `preview`, protótipos React fora do play.

**Legado (mencionado, não auditado como UI ativa):** [`index.html`](../idle/public/jogo-idle/index.html) — shell “WYD Idle” antigo.

### 1.2 Telas / funcionalidades

#### Existentes (UI jogável)

| Feature | Onde | Classes / IDs principais |
|---------|------|--------------------------|
| Lobby / seleção de personagem | `lobby.html` | `#list`, `#create`, `.char-row`, `.create-box` |
| Personagem (rail) | `play.html` `.stage__left` | `.card--rail`, `.hero-rail`, `#hero-portrait` |
| Equipamentos | Tab `data-panel="equip"` | `.equip-doll--grid`, `.slot`, `.attr-panel` |
| Skills (árvore) | Teaser + `#idle-skills` | `#skill-tree`, `.skill-node`, `#skill-detail` |
| Desempenho de caça | Tab `perf` + modal | `#hunt-perf-open-btn`, `#idle-hunt-perf` |
| Mochila | `.card--bag` | `#inv-grid`, `#inv-filters`, `#inv-pages`, `#idle-smart-inv` |
| Companheiros (pets) | Dentro da bag | `#pets-panel`, `.pets-card` |
| Combate / caça | Centro | `.zone-plaque`, `#arena`, `.duel--trio`, `.unit--*` |
| Mercador | Modal JS | `#idle-merchant` |
| Divindade | Modal JS | `#idle-divindade`, `#ascend-btn` |
| Arena PvP | Modal + dock | `#idle-arena`, `#arena-combat-btn` |
| Relatório offline | Modal JS | `#idle-offline-report` |
| Log / sessão | `.card--log` | `#session-feed`, `#combat-log` |
| Áudio | Popover | `.audio-pop` |
| Área | Popover | `.area-pop` |
| Confirmações | Modal JS | `#idle-confirm` |

#### Não encontradas (não inventar assets de tela)

| Feature solicitada | Evidência |
|--------------------|-----------|
| Oficina / craft / refinamento como tela | Refine é ação de menu em `inventory.js` + item mercador; sem UI de oficina |
| Biblioteca / pesquisas | Sem HTML/JS no play |
| Cidade / construções (gestão) | Props 3D em `kaykit-props.js` apenas |
| Ranking (UI) | Assets no disco sem referência no play/JS |
| Talentos separados de skills | Só árvore de skills |
| Missões (UI ativa) | `#engagement-btn` `hidden`; `createEngagementUI` stub no standalone — código em `engagement.js` existe mas não montado |
| Perfil completo / settings | `#logout-btn` só volta ao lobby; áudio é o único “settings” |
| Conquistas | Sem modal/padrão |
| Cards / comparator de equipamento dedicado | Comparação só em `.item-tip` |
| Sets / durabilidade | Sem UI nem CSS |

### 1.3 PNGs / assets HUD atuais

| Arquivo | Dimensão (arquivo) | Mode | Referenciado? | Uso |
|---------|--------------------|------|---------------|-----|
| `painel-heroi.png` | 1087×1447 | **RGB** (sem alfa) | Sim | `.unit--hero` |
| `painel-skills.png` | 1403×1121 | RGB | Sim | `.unit--skills` |
| `painel-alvo.png` | 1313×1198 | RGB | Sim | `.unit--target` |
| `painel-arcano-gotico.png` | 724×2172 | RGB + `cover` | Sim | `.card--rail`, `.card--bag` |
| `placa-zona.png` | 2172×724 | RGB | Sim | `.zone-plaque` |
| `gold-coins-stack.png` | 512×512 | **RGBA** | Sim | `.gold-line__stack` |
| `portrait-{classe}.jpg` | 1024×1024 | RGB | Sim | Retrato |
| `fundo-ranking.jpg` | 2752×1536 | RGB | **Não** | Órfão |
| `ranking-podium.png` | 2605×1402 | RGBA | **Não** | Órfão |
| `ranking-laurel.svg` / `crown` / `hall-bg` | — | SVG | **Não** | Órfãos |
| `slot-*.svg`, `ui-*.svg`, `skill-*.svg` | vetorial | SVG | Sim | Ícones / glyphs |

**Achado crítico:** os cinco painéis principais de moldura estão em **RGB opaco**. Para HUD 3.0, recomendar reexport com **canal alfa real** (moldura) + miolo limpo — não duplicar o mesmo PNG opaco.

---

## 2. Inventário de modais e overlays

### 2.1 Famílias reutilizáveis

| Família | Largura típica **[CSS]** | Consumidores | Asset alvo |
|---------|--------------------------|--------------|------------|
| **Modal SM** | `min(380px, calc(100vw - 2rem))` | `#idle-confirm` | `frame-modal-sm` |
| **Modal MD** | `min(420–480px, …)` | merchant, divindade, skills, engagement | `frame-modal-md` |
| **Modal LG** | `min(440–480px)`, `max-height: min(86–88vh, 640–740px)` | arena, offline-report, hunt-perf | `frame-modal-lg` |
| **Drawer** | `min(320px, 88vw)` @ ≤980px | `#drawer-left`, `#drawer-right` | nine-slice painel lateral |
| **Tooltip** | `width: 230px` | `.item-tip` | `frame-tooltip` |
| **Action sheet** | `min-width: 150px` | `.item-menu` | reusa tooltip ou `frame-menu` |
| **Toast** | padding `0.9rem 1.3rem` em `arena.css` | `#toast` | `frame-toast` |
| **Popover** | `min-width: 160–220px` | `.area-pop`, `.audio-pop` | reusa tooltip/menu |

Padrão estrutural compartilhado: `#idle-{name}` → `__backdrop` + `__panel` + `.hidden` + `[data-act="close"]`.

### 2.2 Fichas individuais

#### M1 — Confirmação (`confirmDialog`)

| Campo | Valor |
|-------|--------|
| 1. Nome / finalidade | Confirmações in-game (vender, limpar, ritual, arena, etc.) sem `window.confirm` |
| 2. Arquivo | `confirm-dialog.js`; CSS `hud.css` + `theme-ref.css`; callers: `inventory.js`, `merchant.js`, `arena-ui.js`, `divindade.js` |
| 3. Seletor | `#idle-confirm`, `.idle-confirm__panel`, `__backdrop`, `__btn--ok/--danger/--ghost` |
| 4. Abertura | `confirmDialog({...})` → `document.body.appendChild` |
| 5. Dimensões | Panel `width: min(380px, calc(100vw - 2rem))` **[CSS]**; root `inset: 0`; z-index `80` |
| 6. Min / max | Só `min()` na largura; sem max-height |
| 7. Mobile | Sem MQ própria; largura viewport-aware |
| 8. Estrutura | Eyebrow (título) + mensagem + actions (2 botões) |
| 9. Header/body/footer | Sem `<header>`; actions = footer implícito |
| 10. Rolagem | Não |
| 11. Imagens atuais | Nenhuma — gradient navy + borda ouro |
| 12. Moldura ilustrada? | Sim — família SM |
| 13. Fundo transparente? | Sim (moldura PNG alfa); miolo CSS `#061323` |
| 14. Proporção rec. | ~380∶220 @1× conteúdo; export moldura nine-slice ~760×440 @2× |
| Família | Modal SM |
| Extra | Classes `r-rare/epic/legendary` no panel alteram glow — raridade via CSS, não imagem por raridade |

#### M2 — Mercador

| Campo | Valor |
|-------|--------|
| Finalidade | Loja (mochila, refinador, pets) |
| Arquivo | `merchant.js`, `app.js` (`#merchant-btn`) |
| Seletores | `#idle-merchant`, `.idle-merchant__panel`, `__list`, `__offer`, `__buy` |
| Abertura | `open()` remove `.hidden`; Escape / backdrop / close |
| Dimensões | Base `min(420px,…)` **[CSS hud]**; play `min(480px, calc(100vw - 1.5rem))`, `max-height: min(82vh, 640px)` **[CSS theme-ref]** |
| Scroll | Lista `max-height: min(52vh, 420px); overflow: auto` |
| Estrutura | Head (eyebrow, h2, ✕) + hint + lista + buys |
| Imagens | Nenhuma |
| Moldura | Modal MD; cards de oferta = CSS ou `frame-offer-card` leve |
| Família | Modal MD |

#### M3 — Arena

| Campo | Valor |
|-------|--------|
| Finalidade | Entrar/sair arena, listar jogadores, desafios |
| Arquivo | `arena-ui.js`; `#arena-combat-btn` |
| Seletores | `#idle-arena`, `.idle-arena__panel`, `__toolbar`, `__pending`, `__list`, `__btn--gold/--danger` |
| Abertura | `open()`; stake usa `window.prompt` + `confirmDialog` |
| Dimensões | `width: min(440px, calc(100vw - 2rem))`, `max-height: min(86vh, 640px)`, `overflow: auto` **[CSS]**; z `76` |
| Estrutura | Head + hint + toolbar + pending + list |
| Moldura | Modal LG |
| Família | Modal LG |

#### M4 — Engagement / missões

| Campo | Valor |
|-------|--------|
| Finalidade | Missões de engajamento (código completo) |
| Arquivo | `engagement.js` — **não montado** no `app.js` standalone; botão `#engagement-btn` hidden |
| Seletores | `#idle-engagement`, `.idle-engagement__panel`, `__offer`, `__buy` |
| Dimensões | `width: min(440px, calc(100vw - 2rem))` **[CSS]**; z `75` |
| Status | **Componente legado/latente** — documentado; prioridade de arte baixa até reativar |
| Família | Modal MD (mesma moldura merchant/skills) |

#### M5 — Divindade

| Campo | Valor |
|-------|--------|
| Finalidade | Ritual de ascensão celestial |
| Arquivo | `divindade.js`; `#divindade-btn`, `#ascend-btn` |
| Seletores | `#idle-divindade`, `.idle-divindade__panel.panel-frame`, `__req`, `__ritual` |
| Dimensões | `width: min(420px, calc(100vw - 2rem))` **[CSS]**; z `78` |
| Estrutura | Head + hint + requirements + botão ritual full-width |
| Imagens | `panel-frame` SVG corners (desativados no play para cards; panel ainda usa classes) |
| Moldura | Modal MD; **candidato a moldura especial** (ornamentos celestiais) sem mudar proporção |
| Família | Modal MD (especial opcional Etapa 5) |

#### M6 — Skills

| Campo | Valor |
|-------|--------|
| Finalidade | Árvore de skills |
| Arquivo | Shell em `play.html`; lógica `app.js` (`openSkillsModal`) |
| Seletores | `#idle-skills`, `.idle-skills__panel.panel-frame`, `#skill-tree`, `#skill-detail` |
| Dimensões | `width: min(420px,…)`, `max-height: min(92dvh, 640px)`, `overflow: auto` **[CSS]**; z `77` |
| Scroll | Sim no panel |
| Família | Modal MD |

#### M7 — Relatório offline

| Campo | Valor |
|-------|--------|
| Finalidade | Resumo pós catch-up offline |
| Arquivo | `offline-report.js` |
| Seletores | `#idle-offline-report`, `.idle-offline-report__panel.panel-frame`, `#offline-report-body`, `__cta` |
| Dimensões | `width: min(440px, calc(100vw - 1.5rem))`, `max-height: min(88vh, 720px)` **[CSS]**; z `80` |
| Scroll | Body `overflow: auto` |
| Estrutura | Head + body (meta/progressão/combate/loot) + CTA footer |
| Família | Modal LG |

#### M8 — Desempenho de caça

| Campo | Valor |
|-------|--------|
| Finalidade | Métricas de farm + janelas de referência |
| Arquivo | `hunt-perf-ui.js`; `#hunt-perf-open-btn` |
| Seletores | `#idle-hunt-perf`, `.idle-hunt-perf__panel`, `#hunt-perf-body`, `__grid`, `__foot` |
| Dimensões | `width: min(480px, calc(100vw - 1.5rem))`, `max-height: min(88vh, 740px)` **[CSS]** |
| Mobile | `@media (max-width: 420px)` grid 1 coluna |
| Família | Modal LG |

#### M9 — Toast

| Campo | Valor |
|-------|--------|
| Finalidade | Mensagens transitórias |
| Arquivo | `#toast` em `play.html`; `toast()` em `app.js` |
| Seletores | `#toast`, `.toast`, `.toast.hidden` |
| Dimensões layout | Definidas em `arena.css` (`fixed; bottom: 2rem; left: 50%`); **`play.html` não linka `arena.css` diretamente** — `styles.css` faz `@import` de `arena.css`. Cores em `theme-ref.css` |
| Estrutura | Texto único |
| Moldura | `frame-toast` (chip horizontal) |
| Família | Toast |

#### M10 — Item tip

| Campo | Valor |
|-------|--------|
| Finalidade | Tooltip de stats / compare |
| Arquivo | `inventory.js` (`showTip`) |
| Seletores | `.item-tip` |
| Dimensões | `width: 230px`, `padding: 0.6rem 0.7rem` **[CSS styles]**; z `120` **[hud]** |
| Scroll | Não; `pointer-events: none` |
| Família | Tooltip |

#### M11 — Item menu

| Campo | Valor |
|-------|--------|
| Finalidade | Equipar / vender / lock / refine / usar |
| Arquivo | `inventory.js` (`openMenu`) |
| Seletores | `.item-menu` |
| Dimensões | `min-width: 150px`, `padding: 0.25rem` **[CSS]** |
| Família | Action sheet (reusa moldura tip ou variante estreita) |

#### M12 — Drawers mobile

| Campo | Valor |
|-------|--------|
| Finalidade | Personagem / mochila em viewport estreita |
| Arquivo | `play.html` checkboxes; CSS `theme-ref.css` `@media (max-width: 980px)`, `theme-v2.css` |
| Seletores | `#drawer-left`, `#drawer-right`, `.drawer-tab` |
| Dimensões | `width: min(320px, 88vw)` **[CSS]**; full height inset |
| Conteúdo | Mesmos `.stage__left` / `.stage__right` |
| Moldura | Nine-slice dos painéis laterais (não modal centrado) |

#### M13 — Area pop / Audio pop

| Campo | Valor |
|-------|--------|
| Finalidade | Seleção de área; volumes |
| Arquivo | `play.html` `<details>` |
| Seletores | `.area-pop__panel` (`min-width: 220px`), `.audio-pop__panel` (`min-width: 160px`) |
| Família | Popover — reusa `frame-tooltip` / card pequeno |

#### M14 — Smart inventory

| Campo | Valor |
|-------|--------|
| Finalidade | Painel expansível de inventário inteligente |
| Arquivo | `<details class="idle-smart-inv">` na bag |
| Tipo | Não é overlay fullscreen — painel inline |
| Moldura | CSS / ornamento divider; sem modal dedicado |

### 2.3 Stack de z-index **[CSS]**

| Camada | z-index |
|--------|---------|
| item-tip / item-menu | 120 |
| confirm / offline / hunt-perf | 80 |
| divindade | 78 |
| skills | 77 |
| arena | 76 |
| merchant / engagement | 75 |
| toast (`arena.css`) | 60 |
| drawers mobile | 40 |

---

## 3. Inventário de botões

| # | Variante | Classes | Dimensões / padding **[CSS]** | Radius | Estados | Ícones | Onde | Reuso de imagem |
|---|----------|---------|-------------------------------|--------|---------|--------|------|-----------------|
| 1 | Primário base | `.btn` | pad `0.55rem 0.9rem`; font `0.85rem` | `0.3rem` → dock `10px` | hover gold; disabled opacity 0.45 | opcional | Skills open, hunt-perf, start/stop (legado) | `frame-btn-secondary` |
| 2 | Pequeno | `.btn--small` | font `0.75rem`; pad `0.4rem 0.75rem` | herda | — | — | Skill tree Comprar/Ativar | mesma + scale |
| 3 | Ouro / CTA | `.btn--gold`, `#start-btn` | gradient `#ffd56a→#f4b52b→#d99a27`; text `#061323` | `0.4–0.55rem` | hover brightness | — | Start, skill buy, CTAs modais | `frame-btn-primary` |
| 4 | Toggle | `.btn--toggle` + `.is-on` | navy + line; on = gold tint | ~0.3–0.5rem | `is-on`, `aria-pressed` | — | `#auto-restart-btn` | `frame-btn-toggle` (2 estados CSS) |
| 5 | Arena dock | `.btn--arena` / `#arena-combat-btn` | gradient `#143049→#0a1a2e` | — | `.is-on` | `ui-arena.svg` | Dock | `frame-btn-secondary` |
| 6 | Stage / dock | `.stage-btn`, `.area-pop > summary` | font `0.72rem`; pad `0.45rem 1rem`; radius `10px` | 10px | hover | `ui-stop`, `ui-area` | Parar, Área | `frame-btn-primary` compact |
| 7 | Tab rail | `.tabs--rail .tab` | font `0.62rem`; pad `0.4rem 0.2rem`; radius `8px` | 8px | `.active`, `.locked` | — | Equip/Skills/Perf | `frame-tab` |
| 8 | Tab filtro / páginas | `.tabs--inv-filter .tab`, `.tabs--pages .tab` | grid 4 / 2 cols | 8px | `.active`, `.locked` | — | Mochila | `frame-tab` |
| 9 | Slot equip | `button.slot` | **68×68** **[CSS]**; `border-radius: 50%` | 50% | empty/filled/blocked + `r-*` | `slot-*.svg` | Doll | `frame-slot-equip-*` |
| 10 | Attr plus | `.attr-plus`, `--bulk/--apply/--max` | `min-width: 2rem`; pad `0.2rem 0.35rem`; radius `6px` | 6px | disabled 0.35 | texto | Attr panel | CSS ou `frame-btn-tiny` |
| 11 | Skill combate | `.combat-skill-slot` | overlay **48×48** circle no play **[CSS]** | 50% | disabled, locked, CD overlay | skill SVGs | `unit--skills` | `frame-slot-skill` |
| 12 | Skill node | `.skill-node` | **56×56** **[CSS]**; radius `0.28rem` | 0.28rem | locked/available/unlocked/active/cooldown/selected | — | Modal skills | `frame-skill-node` |
| 13 | Mini bag | `.mini-btn`, `--organize/--clean/--sell` | font `0.62rem`; radius `8px`; img 14×14 | 8px | disabled, `.active` (sell) | ui-organize/clean/sell | Bag actions | `frame-btn-mini` |
| 14 | Rail nav | `.rail-btn`, `--ghost` | pad `0.45rem 0.65rem`; font `0.78rem`; img 18×18 | 8px | hover, `.is-on` | ui-merchant/missions/divinity/profile | Bag footer | `frame-btn-rail` |
| 15 | Icon | `.icon-btn` | pad `0.2rem 0.45rem` | — | — | — | Expand, mute, bag-close | CSS |
| 16 | Confirm | `.idle-confirm__btn*` | pad `0.5rem 0.65rem`; radius `0.5rem` play | 0.5rem | ok / danger / ghost | — | Confirm | primary / danger / ghost |
| 17 | Arena modal | `.idle-arena__btn*` | pad `0.4rem 0.65rem`; radius `0.3rem` | 0.3rem | gold / danger | — | Arena | primary / danger |
| 18 | Switch | `.toggle-switch` | track **36×20**; knob **14×14**; slide 16px | pill | `:checked` gold | — | Auto-skills, auto-potion | **CSS puro (E)** |

**Regra:** nenhum botão reutilizável deve ter texto rasterizado na imagem. Ícones permanecem SVG; estados hover/active/disabled via CSS (filtros, overlays, troca de `background-image` em 1–2 frames).

**Ocorrências aproximadas em `play.html`:** ~7 `.btn*`, 9 tabs, 9 slots equip, ~16 attr-plus, 3 mini-btn, 5 rail-btn, 3 combat-skill placeholders (+ JS).

---

## 4. Painéis, cards e containers

| Componente | Seletores | Chrome atual | Técnica recomendada | Justificativa |
|------------|-----------|--------------|---------------------|---------------|
| Rail Personagem | `.card--rail` | `painel-arcano-gotico.png` + **`cover`** | **C** nine-slice + **A** fundo miolo opcional | Altura fluida (733–1062px **[BROWSER]**); `cover` corta ornamentos |
| Mochila | `.card--bag` | mesmo PNG + `cover` | **C** + **A** (irmão do rail) | Idem; altura ainda maior |
| Log | `.card--log` | gradient navy (pergaminho legado anulado no play) | **E** CSS ou **D** divider | Pouco destaque; colapsável |
| Zona | `.zone-plaque` | `placa-zona.png` `100% 100%` | **B** moldura alfa proporção 2172∶724 | Já aspect-locked |
| Unit herói | `.unit--hero` | `painel-heroi.png` | **B** alfa + safe % atuais | Ratio fixo na grade |
| Unit skills | `.unit--skills` | `painel-skills.png` | **B** | Ratio fixo |
| Unit alvo | `.unit--target` | `painel-alvo.png` | **B** | Ratio fixo; variante boss = CSS glow |
| Attr panel | `.attr-panel` | border + bg semi | **E** | Subpainel interno |
| Pets | `.pets-panel` / `.pets-card` | border cards | **E** ou **D** | Densidade baixa |
| Gold line | `.gold-line` | border + PNG stack | **E** + ícone RGBA existente | Manter `gold-coins-stack` |
| Arena viewport | `.stage__viewport` / `.arena-stone-frame` | CSS / stone off | **C** nine-slice anel | Canvas 3D no miolo |
| Modal panels | `.idle-*__panel` | CSS navy | **B/C** famílias SM/MD/LG | Redimensionáveis |
| Offer cards | `__offer`, `__challenge` | CSS cards | **E** | Muitos; CSS + borda ouro |
| Panel-frame corners | `::before` SVG 14×14 | SVG data-URI | **D** ou remover se moldura PNG | Play já desativa em cards |
| Tabs / selection | `.tab.active`, `.skill-node--selected` | CSS | **E** + `frame-tab` | Estado dinâmico |
| Dividers | borders de section | CSS | **D** `ornament-divider-gold` | Opcional Etapa 1 |

---

## 5. Inventário e equipamentos

### 5.1 Slots e estados

| Estado | Implementação | CSS |
|--------|---------------|-----|
| Inv vazio | `.inv-cell` sem `.item` | `.inv-cell:not(.item)` |
| Inv ocupado | `button.inv-cell.item.r-{rarity}` | raridade `--rc` |
| Equip vazio | `.slot` + glyph SVG | `--slot-glyph` em `theme-v2` |
| Equip preenchido | `.slot.filled.r-*` | glow |
| Offhand bloqueado | `.slot.blocked` | `::before` |
| Item locked | `.is-locked`, `.item-lock` | `hud.css` |
| Unusable | `.unusable` | opacity + risca |
| Página locked | `.tab.locked` | opacity 0.45 |
| Bag full | `#inv-count.full` | cor danger |
| Sell mode | `#inv-sell.active`, `.inv-grid.sell-mode` | outline dashed |
| Selected persistente | **Não existe** | seleção = menu aberto |
| Refine | `.has-refine`, `.refine-ring`, `data-refine` | CSS animado — **não rasterizar animação** |

### 5.2 Dimensões

| Elemento | Medida | Fonte |
|----------|--------|-------|
| Equip slot | 68×68 px, circular | **[CSS]** `theme-ref` |
| Inv cell | `aspect-ratio: 1`; ~68×68 no rail **[BROWSER]** | grid 5 cols `styles` (play pode sobrescrever cols) |
| Item tip | 230×auto | **[CSS]** |
| Item menu | min 150px | **[CSS]** |
| Portrait | 78×78, border gold 3px | **[CSS]** / **[BROWSER]** |

### 5.3 Raridades **[CSS]** `styles.css`

| Classe | Token | HEX |
|--------|-------|-----|
| `r-common` | `--r-common` | `#b5ad9c` |
| `r-uncommon` | `--r-uncommon` | `#63c763` |
| `r-rare` | `--r-rare` | `#4f9fff` |
| `r-epic` | `--r-epic` | `#b46cff` |
| `r-legendary` | `--r-legendary` | `#ff9a2e` |

Epic/legendary: animação `item-glow` — manter CSS; moldura de slot pode ter variante de filete por raridade.

### 5.4 Família de assets sugerida (slots)

| Asset | Uso | Export @2× | Alpha |
|-------|-----|------------|-------|
| `frame-slot-equip-empty` | círculo vazio 68 | 136×136 | Sim |
| `frame-slot-equip-rarity-{c…l}` | filete por raridade **ou** 1 base + CSS `--rc` | 136×136 | Sim |
| `frame-slot-inv-empty` | célula quadrada | 136×136 | Sim |
| `frame-slot-inv-rarity-*` | opcional; preferir 1 frame + border-color CSS | 136×136 | Sim |
| `ornament-refine-ring` | estático sob animação CSS | 136×136 | Sim |
| `frame-tooltip` | tip + menu | nine-slice | Sim |

**Preferência:** 1 moldura de slot + colorização CSS por `--rc` (evita 5×2 imagens quase iguais). Variantes ilustradas só se o contraste CSS for insuficiente.

---

## 6. Barras, indicadores e combate

| Elemento | Seletores | Dinâmico? | Arte? |
|----------|-----------|-----------|-------|
| HP herói | `#hero-hp-meter`, `.meter--hp` | Sim (width fill) | Só track/ornament opcional |
| MP / Rage | `#resource-meter`, `.meter--mp` / `--rage` | Sim | Idem |
| XP | `#unit-xp-fill`, `.meter--xp` | Sim | Idem |
| HP inimigo | `#target-hp-meter`, `.meter--enemy` | Sim | Idem |
| Wave | `#target-wave-fill`, `.meter--wave` | Sim | Idem |
| Track altura | chunky **22px** play; wave **16px** | **[CSS]** | — |
| Deltas | `.meter__delta.is-damage/.is-heal` | Sim | **E** |
| Boss | `.unit--boss` no `#target-card` | Classe JS | Glow CSS; sem PNG extra |
| Skill CD | `.combat-skill-slot__cd` | Texto + overlay | Moldura slot; overlay CSS |
| Buff farm | `#farm-buff-chip` | Texto | Chip CSS / toast family |
| Float dano/crit | `.float-text`, `.crit` (`fx.js`, `arena.css`) | Sim | **E** |
| Gold | `#stat-gold` + PNG stack | Número dinâmico | Manter ícone RGBA |
| Auto-caça | toggles + `#farm-status` | Estado | Sem badge dedicado |
| Arena chips | `.arena-hud__chip` | **display:none** em theme-v2 | Não produzir até reativar |
| Bars 3D | `.fighter .bar` 90×6 | Arena 3D | Fora do kit HUD 2D |

**Regra:** fills, percentuais, CD e deltas **nunca** viram imagem estática.

---

## 7. Notificações e feedback

| Tipo | Mecanismo | Classes | Família de moldura |
|------|-----------|---------|-------------------|
| Toast genérico | `toast()` | `#toast` | `frame-toast` (info) |
| Erro API | `toast(err.message)` | idem | mesma + borda danger CSS |
| Drop / reward | toast + feed | `session-feed__item--drop` | toast success leve |
| Level-up | log + feed `--level` | sem popup | opcional Etapa 4 `frame-toast-level` |
| Arena W/L/tie | toast | texto | toast + CSS cor |
| Offline report | modal LG | `idle-offline-report__*` | modal LG |
| Hunt perf | modal LG | `idle-hunt-perf__*` | modal LG |
| Float combat | `fx.js` | `.float-text` | CSS |
| Confirm | modal SM | `idle-confirm` | modal SM |
| Achievements | **não existe** | — | não produzir |

Níveis de notificação recomendados (sem exagero): **info**, **reward**, **danger** — mesma moldura base, filete/glow via CSS.

---

## 8. Lobby

| Elemento | Arquivo | Notas |
|----------|---------|-------|
| Lista de chars | `lobby.html` | `.char-row` — cards CSS; pode reusar `frame-panel-card` MD |
| Create box | `.create-box` | Form; moldura MD |
| Delete | `confirm()` nativo | Fora do design system in-game |

Prioridade: Etapa 5 (após kit play).

---

## 9. Componentes legados / órfãos

| Item | Status |
|------|--------|
| `index.html` shell | Legado — não auditado como HUD 3.0 |
| Assets ranking | No disco, zero refs no play |
| `#engagement-btn` + `engagement.js` | Código existe; UI não montada no standalone |
| `.arena-hud` chips | HTML; oculto em theme-v2 |
| Toast position | Depende de `arena.css` via import — validar visual no browser |
| `panel-frame::before` SVG | Desativado em cards do play; modais ainda usam classe |

---

## 10. Mapa de recomendação A–F (síntese)

| Técnica | Onde |
|---------|------|
| **A** Fundo ilustrado | Miolo de rail/bag/zona (opcional, opaco) |
| **B** Moldura PNG transparente | Trio combate, zona, modais tip/toast |
| **C** Nine-slice | Rail, bag, arena frame, modais MD/LG |
| **D** Ornamento isolado | Dividers, cantos, laurel futuro ranking |
| **E** CSS puro | Meters fill, toggles, offer cards, deltas, rarity glow, refine anim |
| **F** Sprite/atlas | Opcional para ícones UI se unificar SVGs — **não prioritário** |

---

## 11. Cascata efetiva HUD play

1. `styles.css` (+ `@import arena.css`) — tokens, layout base, inventário, tip/menu  
2. `hud.css` — meters FX, modais, skill tree, panel-frame  
3. `theme-v2.css` — layout play, drawers, slot glyphs  
4. **`theme-ref.css`** — navy/gold definitivo; PNGs de combate; overrides de botões/modais  

Qualquer arte nova deve ser referenciada preferencialmente pela camada `theme-ref` (ou sucessor HUD 3), sem reintroduzir madeira de theme-v2 nos modais.

---

## 12. Respostas-guia (kit medieval)

1. **Quais imagens criar?** → ver [`CATALOGO_ASSETS_HUD_3.md`](CATALOGO_ASSETS_HUD_3.md) (~52 IDs).  
2. **Quais componentes usam cada uma?** → coluna “Componente” do catálogo + §2–7 deste doc.  
3. **Dimensão exata?** → CSS verificado + export @2× no catálogo.  
4. **Transparência?** → molduras/ornamentos/slots/botões = sim; fundos de miolo = opaco OK.  
5. **Reuso?** → 3 molduras de modal cobrem 8 overlays; 1 frame de botão primary cobre CTAs.  
6. **Ordem?** → Etapas 1–5 no catálogo.  
7. **O que fica CSS?** → fills, estados, raridade glow, refine, toggles, tipografia, deltas.  
8. **Simetria / encaixe?** → [`GUIA_VISUAL_HUD_3.md`](GUIA_VISUAL_HUD_3.md) + prompts.

---

*Fim da auditoria. Próximo passo de produção: catálogo e prompts — sem implementação no código.*
