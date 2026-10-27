# Sinergia IDLE — Auditoria Visual da HUD

**Data:** 2026-10-26  
**Escopo:** HUD live de combate (`play.html` + cascade CSS). Sem alterações de código neste documento.  
**Objetivo:** dimensionar e orientar a criação de uma biblioteca de assets Dark Fantasy Medieval (molduras + fundos ilustrados) sem `background-size: cover` que corte a arte.

---

## Fontes verificadas

| Fonte | Detalhe |
|-------|---------|
| Markup | [`idle/public/sinergia-idle/play.html`](../idle/public/sinergia-idle/play.html) (`body.play-stage`) |
| CSS efetivo | `styles.css` → `hud.css` → `theme-v2.css` → [`theme-ref.css`](../idle/public/sinergia-idle/theme-ref.css) (última vence) |
| Lógica / DOM dinâmico | `app.js`, `inventory.js`, modais JS |
| Arena | Three.js (`arena.js` / `scene3d.js`) — **não há Phaser** nesta HUD |
| Fora do escopo | `admin-ui`, `src/interface/*`, `index.html` legado (`.topbar`), lobby/preview |
| Medições browser | `getBoundingClientRect` em `http://127.0.0.1:8787/sinergia-idle/play.html` com `Emulation.setDeviceMetricsOverride` |
| Rem | `16px` (confirmado em runtime) |
| PNG atuais | `sips` em `idle/public/sinergia-idle/assets/hud/` |

**Legenda de precisão**

- **Verificado:** medido no browser ou lido literalmente do CSS/arquivo.
- **Derivado:** calculado a partir de fórmulas CSS + rem=16.
- **Estimativa:** não medido diretamente (marcado explicitamente).

---

## Mapeamento oficial de molduras (kit fornecido)

Nomenclatura acordada para a nova biblioteca (transparência no centro = moldura over content):

| Ordem / forma (referência do kit) | Utilização na HUD | Nome recomendado |
|-----------------------------------|-------------------|------------------|
| 1ª — Horizontal | Barra da Zona (`.zone-plaque`) | `frame-zona.png` |
| 2ª — Quadrada | Painel do Alvo / Boss (`.unit--target`) | `frame-boss.png` |
| 3ª — Quadrada | Painel de Habilidades (`.unit--skills`) | `frame-skills.png` |
| 4ª — Vertical | Painel lateral do Personagem (`.card--rail`) | `frame-personagem.png` |
| 5ª — Quadrada | Painel do Herói (`.unit--hero`) | `frame-heroi.png` |

### Alerta de proporção (importante)

O CSS **atual** do trio de combate e da placa já amarra a arte a ratios fixos dos PNG em produção:

| Componente | Ratio CSS atual | PNG atual | `background-size` |
|------------|-----------------|-----------|-------------------|
| `.unit--hero` | **1087∶1447 ≈ 0,751** (retrato) | `painel-heroi.png` 1087×1447 | `100% 100%` |
| `.unit--skills` | **1403∶1121 ≈ 1,252** (paisagem) | `painel-skills.png` 1403×1121 | `100% 100%` |
| `.unit--target` | **1313∶1198 ≈ 1,096** (quase quadrado) | `painel-alvo.png` 1313×1198 | `100% 100%` |
| `.zone-plaque` | **2172∶724 = 3∶1** | `placa-zona.png` 2172×724 | `100% 100%` |
| `.card--rail` / `.card--bag` | fluido (~310 × altura variável) | `painel-arcano-gotico.png` 724×2172 | **`cover`** (corta) |

**Consequência para o kit:**

- `frame-zona` **deve** nascer em **3∶1** (ideal 2172×724 ou múltiplo).
- `frame-boss` encaixa bem no ratio atual do alvo (~1,10).
- `frame-skills` deve seguir ~**1,25** (1403×1121), não um quadrado 1∶1 — senão haverá distorção com o CSS atual.
- `frame-heroi` no CSS atual é **vertical (0,75)**, não quadrado. Se o asset “5ª quadrada” for literalmente 1∶1, será necessário **ou** redesenhar o layout do herói **ou** regenerar a moldura no ratio 1087∶1447.
- `frame-personagem` (vertical) é o candidato certo para a lateral; a lateral hoje usa `cover` e precisa de **nine-slice** ou arte com altura variável — ver seção E.

Este relatório usa os **nomes** acima como padrão oficial e recomenda **exportar no ratio exigido pelo seletor CSS atual**, para evitar novo ciclo de crop/distorção.

---

## A. Inventário de componentes

### A.1 Layout geral (verificado)

```
body.play-stage
└── .frame
    ├── .drawer-tabs          (mobile)
    └── #game-panel.layout.layout--play.stage
        ├── aside.stage__left
        │   └── section.card.card--rail
        ├── section.stage__center
        │   ├── .zone-plaque
        │   ├── .stage__viewport > .arena-stone-frame > #arena
        │   └── .stage__dock
        │       ├── .stage__float.combat-actions
        │       └── .duel.duel--trio.stage__combat
        │           ├── .unit.unit--hero
        │           ├── .unit.unit--skills
        │           └── #target-card.unit.unit--target
        └── aside.stage__right
            ├── section.card.card--bag
            └── section.card.card--log
```

Grid desktop (`theme-ref.css`): `auto | 1fr | auto`, gap `--panel-gap` (0,65rem = **10,4px**), padding `--top-gap` (0,55rem = **8,8px**).  
Laterais: `clamp(260px, 22vw, 310px)` → **310px** em 1440 e 1920.  
Mobile `max-width: 980px`: coluna única; laterais viram drawers `min(320px, 88vw)`.

### A.2 Tabela principal (dimensões medidas no browser)

Valores **W×H em px** = `getBoundingClientRect` arredondado. Ratio = W/H.

| Componente | Classes / ID | Arquivo(s) | 1920×1080 | 1440×900 | 390×844 | Padding interno (1920) | bg-size atual |
|------------|--------------|------------|-----------|----------|---------|------------------------|---------------|
| Coluna Personagem | `.stage__left` | `play.html`, `theme-ref.css` | **310×1062,41** | **310×882,41** | **320×826,41** (drawer) | 0 | — |
| Card Personagem | `.card.card--rail` | idem + fundo PNG | **310×733,09** | **310×733,09** | **320×733,09** | `12 / 11,2 / 10,4` px | **cover** |
| Coluna direita | `.stage__right` | `theme-ref.css` | **310×1062,41** | **310×882,41** | **320×826,41** | 0 | — |
| Mochila | `.card.card--bag` | `play.html`, `theme-ref.css` | **310×1011,55** | **310×831,55** | **320×775,55** | `10,4 / 9,6 / 8,8` | **cover** |
| Acontecimentos | `.card.card--log` | idem | **310×43,67** (recolhido) | idem | **320×43,67** | `10,4` | CSS navy |
| Centro | `.stage__center` | `theme-ref.css` | **1261,63×1062,41** | **781,63×882,41** | **375,63×829,63** | 0 | — |
| Placa zona | `.zone-plaque` | `theme-ref.css` L696+ | **600×200** (3∶1) | **594×198** | **362,84×120,94** | `8,8 / ~151` (≈12% laterais) | **100% 100%** |
| Viewport arena | `.stage__viewport` | `theme-ref.css` | **1261,63×498,47** | **781,63×324,47** | **362,84×120** (mín.) | 0 | — |
| Arena 3D | `#arena` | `arena.js` / `scene3d.js` | **1241,63×478,47** | **761,63×304,47** | **342,84×100** | 0 | canvas |
| Dock | `.stage__dock` | `theme-ref.css` | **1261,63×352,75** | **781,63×348,75** | **362,84×962,63** (trio empilhado) | 0 | — |
| Ações flutuantes | `.stage__float` | `play.html` | **1261,63×33,17** | **781,63×33,17** | — | 0 | — |
| Trio combate | `.duel.duel--trio` | `theme-ref.css` L1088+ | **1261,63×310** | **781,63×306** | **362,84×919,88** | 0 | — |
| Herói | `.unit.unit--hero` | `theme-ref.css` L1127+ | **232,86×310** | **229,86×306** | **240×319,48** | ≈`23,3 / 25,6 / 30,3` (10%/11%/13% da **largura**) | **100% 100%** |
| Skills | `.unit.unit--skills` | L1135+ | **387,97×310** | **382,97×306** | **360×287,64** | ≈`34,9 / 46,5 / 42,7` | **100% 100%** |
| Alvo/Boss | `#target-card.unit--target` | L1143+ | **339,75×310** | **335,36×306** | **320×291,97** | ≈`30,6 / 37,4 / 47,6` | **100% 100%** |
| Retrato | `.hero-rail__portrait` | `theme-ref.css` | **78×78** | **78×78** | **78×78** | 0; borda 3px gold | img |
| Slot equip | `.equip-doll .slot` | `theme-ref.css` | **68×68** (CSS) | idem | idem | — | radial |
| Skill combate | `.combat-skill-slot` | `theme-ref.css` | **64×58** (ícone 48×48) | idem | idem | 0 | — |
| Track meter | `.meter--chunky .meter__track` | `theme-ref.css` | **~182×22** | — | — | 0 | — |
| Gold line | `.gold-line` | `theme-ref.css` | **288,81×44,38** | — | — | `7,2 / 11,2` | — |
| Attr panel | `.attr-panel` | `theme-ref.css` | **285,63×313,98** | — | — | `8 / 7,2 / 5,6` | — |

`--hud-h` desktop: `clamp(220px, 34vh, 310px)` → **310** em 1080p, **306** em 900p (verificado).  
Mobile: unidades com `aspect-ratio` dos PNG + `width: min(100%, 240|360|320)`.

### A.3 Elementos filhos e overflow

| Painel | Filhos principais | Overflow / ultrapassa borda? |
|--------|-------------------|------------------------------|
| `.card--rail` | toggle, `.hero-rail`, tabs, equip doll, attr-panel, teaser skills/perf | `overflow: auto` — conteúdo pode scrollar **dentro**; não vaza do card |
| `.card--bag` | toggle, filtros, `#inv-grid`, ações, gold, pets, rail-btns | `overflow: hidden` no card; grid interno |
| `.card--log` | toggle + feeds | Recolhido = só header (~44px) |
| `.zone-plaque` | nome/desc + online/sessão | `overflow: hidden` — texto longo pode clipar nas laterais ornamentadas |
| `#arena` | canvas Three.js, fighters fallback, `.arena-hud` (oculto), FX | `overflow: hidden`; plates 3D podem flutuar no viewport |
| `.unit--hero` | head (evo/nome/lv), HP/MP/XP, status, stat-tiles | `overflow: hidden` — conteúdo deve caber no padding % |
| `.unit--skills` | 3 slots + auto-cast + auto-poção | `overflow: hidden` |
| `.unit--target` | head, HP, tiles, activity banner, `.target-hunt` | `overflow: hidden`; hunt no rodapé |
| Modais | painéis `.idle-*__panel` | `max-height` + scroll interno |

### A.4 Modais e chrome menor (candidatos a moldura)

| Componente | Classes | Largura CSS | Observação |
|------------|---------|-------------|------------|
| Skills tree | `#idle-skills .idle-skills__panel` | `min(420px, 100vw-2rem)`, max-h `min(92dvh,640px)` | HTML estático |
| Confirm | `.idle-confirm__panel` | `min(380px, …)` | JS |
| Merchant | `.idle-merchant__panel` | `min(480px, …)` | JS |
| Arena UI | `.idle-arena__panel` | `min(440px, …)` | JS |
| Divindade | `.idle-divindade__panel` | `min(420px, …)` | JS |
| Offline report | `.idle-offline-report__panel` | `min(440px, …)` | JS |
| Hunt perf | `.idle-hunt-perf__panel` | `min(480px, …)` | JS |
| Toast | `#toast.toast` | fluido | navy/gold |
| Item tip/menu | `.item-tip`, `.item-menu` | fixed | não cortar com overflow do body |

**Ocultos / não usados na play HUD**

- `.arena-hud` — no DOM, `display:none` (theme-v2).
- `fundo-ranking.jpg`, `ranking-podium.png`, SVGs ranking — arquivos existem, **sem referência** no CSS/JS de play.

---

## B. Especificação gráfica (@2x / masters)

### Princípio anti-crop

1. Arte do painel no **mesmo aspect ratio** do box CSS.  
2. CSS: `background-size: 100% 100%` (já usado no trio e na zona) **ou** moldura PNG transparente + `border-image` / nine-slice.  
3. **Evitar `cover`** em molduras ornamentadas (problema atual das laterais).

### B.1 Kit principal (nomes oficiais)

| Nome do asset | Seletor | Proporção exigida (CSS atual) | Master recomendado (px) | Transparência | Margem / safe content | Moldura vs fundo |
|---------------|---------|-------------------------------|-------------------------|---------------|------------------------|------------------|
| `frame-zona.png` | `.zone-plaque` | **3∶1** (2172∶724) | **2172×724** (já @>2× do display máx. 600×200) | Sim (centro oco) | Faixa central ~50% da largura; evitar ornamentos nos 12% L/R e 8% T/B | Só moldura; fundo opcional `bg-zona.jpg` atrás |
| `frame-boss.png` | `.unit--target` | **1313∶1198 ≈ 1,096** | **1313×1198** (display máx. ~340×310; @2x~680×620) | Sim | Inset ≈ 11% L/R, 10% topo, 15% base (pad CSS) | Moldura + `bg-boss.jpg` ilustrado no miolo |
| `frame-skills.png` | `.unit--skills` | **1403∶1121 ≈ 1,252** | **1403×1121** | Sim | Inset ≈ 12% L/R, 11% topo, 14% base | Moldura + `bg-skills.jpg` |
| `frame-heroi.png` | `.unit--hero` | **1087∶1447 ≈ 0,751** | **1087×1447** (se “quadrada” no kit ≠ **regenerar neste ratio**) | Sim | Inset ≈ 11% L/R; topo/base ~7–10% da altura útil (pad % da largura) | Moldura + `bg-heroi.jpg` |
| `frame-personagem.png` | `.card--rail` | Largura fixa **310** CSS; altura **variável** (conteúdo ~733+; coluna até ~1062) | Preferir **nine-slice** master **620×1466** (@2x de 310×733) **ou** moldura fatiável 620×N | Sim | Conteúdo: padding atual ~12×11px; ornamentos só na borda ≤24px @1x | **Separar** `frame-personagem.png` (slice) + `bg-personagem.jpg` (cover ou tile suave **só no miolo**) |

**@2x mínimo do display (caso se gere “sob medida” em vez do master PNG atual):**

| Asset | @2x display 1920 | Observação |
|-------|------------------|------------|
| Herói | 466×620 | Inferior ao master 1087×1447 — **manter master maior** |
| Skills | 776×620 | Manter 1403×1121 |
| Boss | 680×620 | Manter 1313×1198 |
| Zona | 1200×400 | Manter 2172×724 |
| Personagem | 620 × ≥1466 | Nine-slice; altura cresce |

### B.2 Assets adicionais recomendados

| Nome | Uso | Master | Alpha | Notas |
|------|-----|--------|-------|-------|
| `frame-mochila.png` | `.card--bag` | Mesmo sistema nine-slice que personagem (620×N) | Sim | Hoje compartilha PNG com rail |
| `frame-log.png` | `.card--log` | Nine-slice 620×120 (@2x header) + expandido | Sim | Estado recolhido vs aberto |
| `frame-arena.png` | `.arena-stone-frame` / `.stage__viewport` | Nine-slice **2524×1000** (@2x de ~1262×498) | Sim | Viewport fluido — **obrigatório** nine-slice |
| `frame-modal.png` | família `.idle-*__panel` | Nine-slice 960×1280 (@2x de ~480×640) | Sim | Uma família visual |
| `frame-slot-equip.png` | `.slot` 68×68 | **136×136** | Sim | Círculo/ornato |
| `frame-slot-inv.png` | `.inv-cell` | **136×136** (quadrado) | Sim | |
| `frame-skill-disc.png` | círculo 48×48 | **96×96** | Sim | |
| `frame-meter.png` | track 22px alt. | nine-slice horizontal 400×44 | Sim | Opcional |
| `btn-nav-*.png` | `.rail-btn`, `.stage-btn` | 360×80 @2x | Sim | Skin de botão |
| `ornament-cap-h.png` / `ornament-cap-v.png` | centros de moldura | conforme kit | Sim | Para montagem simétrica |
| `bg-arena-mist.jpg` | atrás do canvas (opcional) | 2560×1440 | Não | Não distorcer o 3D |

### B.3 Espessura de moldura (recomendação de design)

Com base no padding percentual do trio e na arte gótica do kit (cantos pesados + filete dourado fino):

| Região da moldura | % da menor dimensão do painel | Função |
|-------------------|-------------------------------|--------|
| Filete dourado interno | 1,5–2,5% | Linha contínua simétrica |
| Corpo pedra/obsidiana nos cantos | 8–14% | Cantos “garra”; **não invadir safe zone** |
| Ornamento central T/B | 4–6% da largura no eixo | Pico/cruz dourada |
| Glow âmbar | contido nos recessos | Não reduzir contraste do texto `#e8f0f8` |

---

## C. Mapa de composição (safe zones)

### C.1 `.zone-plaque` → `frame-zona.png`

**Conteúdo:** `#activity-name`, `#activity-desc`, event chip, online, kills/XP da sessão.  
**Safe zone:** retângulo central ~ **50% W × 70% H**; laterais (asas góticas) e filetes T/B livres de texto.  
**Risco:** padding horizontal ~12% — ornamentos laterais já competem com meta; manter miolo limpo e escuro/azul profundo.

### C.2 `.unit--hero` → `frame-heroi.png`

**Conteúdo (topo→base):** badge evo + nome + nível → meters HP/MP/XP → chips de status → tiles ATK/DEF/CRIT/SPD.  
**Safe zone:** miolo após inset (~182×256 px em 1920).  
**Livre:** cantos e faixa inferior da moldura (pad bottom maior).  
**Não ultrapassar:** overflow hidden — nada de glow externo além da sombra CSS do card.

### C.3 `.unit--skills` → `frame-skills.png`

**Conteúdo:** 3× `.combat-skill-slot` (ícone 48, CD, custo) + toggles auto-cast / auto-poção + input %.  
**Safe zone:** centro largo (paisagem); reservar faixa inferior para toggles.  
**Livre:** cantos e ornamentos laterais.

### C.4 `.unit--target` → `frame-boss.png`

**Conteúdo:** kind/nome/nível → HP inimigo → tiles → (activity) → `.target-hunt` (área, marco, onda, sessão).  
**Safe zone:** superior/miolo para vitals; **rodapé** (~15% H) para hunt — arte do miolo pode ser mais dramática (ruína/chefe) desde que escurecida atrás do texto.

### C.5 `.card--rail` → `frame-personagem.png`

**Conteúdo:** toggle “Personagem”, retrato 78 + nome/classe/LV, tabs Equipar/Skills/Desempenho, doll 3×3, atributos.  
**Safe zone:** quase toda a área interna; moldura só na periferia (≤ ~24px @1x).  
**Altura variável:** não pintar um “quadro fechado” que dependa de altura fixa sem nine-slice.

### C.6 `.card--bag` (futuro `frame-mochila.png`)

**Conteúdo:** título capacidade, filtros, grid 4 colunas, smart inv, ações, gold-line, pets, botões Mercador/Divindade/Perfil.  
**Safe zone:** miolo; gold e botões no rodapé precisam contraste alto.

### C.7 Arena / viewport

**Conteúdo:** cena 3D full-bleed; idle message; FX; (chips ocultos).  
**Moldura:** apenas borda do `.arena-stone-frame`; centro 100% transparente para o canvas.  
**Não** ilustrar cenário estático que lute com o Three.js — preferir moldura + vinheta sutil.

### C.8 Modais

**Conteúdo:** título, corpo scrollável, CTAs.  
**Safe:** padding ≥ 1rem; ornamentos só na moldura externa.

---

## D. Direção artística e identidade

### D.1 Estilo

- Dark Fantasy Medieval **premium** (RPG), não dashboard.
- Molduras góticas simétricas: cantos espelhados L/R e T/B; ornamento central superior e inferior.
- Materiais: pedra/obsidiana, ferro envelhecido, **ouro queimado**, glow âmbar/laranja contido (tochas/magma nos recessos).
- Miolo: azul profundo / preto / névoa; ruínas, castelo, floresta — **ilustração real**, com centro limpo para UI.
- Iluminação cinematográfica discreta; contraste a favor da legibilidade (`#e8f0f8` sobre azul escuro).

### D.2 Paleta oficial (tokens `.play-stage` em `theme-ref.css` — verificados)

| Papel | HEX | Token |
|-------|-----|-------|
| Fundo principal | `#061323` | `--bg` |
| Azul secundário / fundo 2 | `#0a1a2e` | `--bg-2` |
| Card | `#0c1c30` / `#102438` | `--card` / `--card-2` |
| Linha / metal frio | `#1e3a55` / `#2a4f6e` | `--line` / `--bone-edge` |
| Dourado principal | `#f4b52b` | `--gold` / `--accent` |
| Dourado claro | `#ffd56a` | `--gold-bright` |
| Dourado envelhecido | `#d99a27` | `--gold-soft` |
| Texto | `#e8f0f8` | `--ink` |
| Texto secundário | `#8aa4bc` | `--muted` |
| HP | `#e53935` → `#ff7043` | `--hp` / `--hp-2` |
| MP | `#26c6da` → `#4dd0e1` | `--mp` / `--mp-2` |
| XP | `#ab47bc` → `#ce93d8` | `--xp` / `--xp-2` |
| OK / perigo | `#26a69a` / `#ef5350` | `--ok` / `--danger` |
| Metal | `#7a93a8` | `--metal` |
| Glow moldura (kit) | âmbar ~`#ff8a3d`–`#f4b52b` | alinhar ao ouro oficial |

**Fontes:** display `Cinzel`; corpo `Source Sans 3`.

### D.3 Simetria (regras para a IA de imagem)

1. Espelhar borda esquerda ↔ direita; cantos superiores entre si; inferiores entre si.  
2. Ornamento central no eixo vertical do painel (topo e base).  
3. Espessura do filete dourado uniforme em todo o kit.  
4. Cenário interno pode ter assimetria leve (ruína à esquerda, tocha à direita), mantendo **peso visual** equilibrado.  
5. Centro do miolo: baixa frequência espacial (névoa/gradiente) para UI.

---

## E. Recomendações de implementação (futuro — não executar agora)

1. **Trio + zona:** manter `background-size: 100% 100%` + `aspect-ratio` / colunas `calc(var(--hud-h) * W/H)` — padrão correto já no código.  
2. **Laterais:** abandonar `cover` na moldura; usar:
   - `border-image` / 9-slice CSS, **ou**
   - camadas: `bg-personagem` (só miolo, `cover` aceitável se a ilustração for atmosférica) + `frame-personagem` (nine-slice, sem crop de ornamento).  
3. **Não distorcer:** se o asset não bater o ratio do seletor, **regenerar o asset** — não forçar `100% 100%` em ratio errado.  
4. **Mobile:** mesmos masters; o CSS já muda só a escala (aspect-ratio preservado no trio). Não precisa arte “mobile” separada para o trio/zona. Laterais em drawer 320px: mesma moldura nine-slice.  
5. **Arena:** nine-slice obrigatório (viewport fluido).  
6. **Phaser:** não usado; nomes `frame-*` / `bg-*` servem CSS e eventuais overlays DOM.  
7. **Substituição dos PNG atuais:** `painel-heroi.png` → `frame-heroi.png` (+ bg); etc., sem mudar IDs JS.

---

## F. Prompts para geração de imagens

Tom comum (prefixar todos):

> Dark fantasy medieval premium RPG UI frame, gothic ornate border, symmetrical left-right and top-bottom, aged gold filigree, obsidian stone corners with subtle amber ember glow in recesses, deep navy and black interior mood, cinematic soft lighting, clean center for UI readability, no modern HUD chrome, no text, no logos, no watermarks, high detail, centered composition.

### F.1 `frame-zona.png` — 2172×724, PNG alpha

> … wide horizontal banner frame 3:1 aspect ratio 2172x724, thin top and bottom gold rails with central crest ornament, heavy gothic claw/wing caps on left and right ends only, fully transparent center rectangle for UI text, symmetrical end caps mirrored, elegant not cluttered.

### F.2 `frame-boss.png` — 1313×1198, PNG alpha

> … near-square panel frame aspect 1313x1198, ornate gothic corners, gold central ornaments mid-top and mid-bottom, transparent rectangular content well inset ~11% sides and ~15% bottom for enemy HP and hunt stats, menacing but premium, subtle ruin silhouette only in dark vignette of inner edge, not invading center.

### F.3 `frame-skills.png` — 1403×1121, PNG alpha

> … landscape panel frame aspect 1403x1121 (~5:4), same gothic gold/obsidian kit language, transparent center for three skill icons and toggle rows, slightly wider side margins (~12%), balanced ornaments, no clutter in lower third.

### F.4 `frame-heroi.png` — 1087×1447, PNG alpha

> … **vertical** portrait panel frame aspect 1087x1447 (ratio ~0.75), same kit, transparent tall content well for name, HP/MP/XP bars and stat tiles, mirrored side ornaments, top crest and bottom crest aligned to center axis. (If a square draft exists, regenerate to this vertical ratio — do not stretch.)

### F.5 `frame-personagem.png` — nine-slice 620×1466 (+ slices), PNG alpha

> … vertical side-panel frame suitable for 9-slice UI, width-focused ornaments on left/right edges, corner pieces separable, transparent center, designed so top/bottom/center edges can tile when panel height changes, Sinergia navy-gold gothic kit, no fixed-scene illustration glued to a single height.

### F.6 Fundos ilustrados (JPEG/PNG opacos) — um por painel

> Illustrated dark fantasy scene for RPG panel background only (no frame): deep blue-black mist, distant ruined castle / forest / torchlight, cinematic depth, soft vignette, **low-contrast center**, color palette #061323 #0a1a2e with gold accents #f4b52b sparingly,  --aspect-- matching the panel, no UI, no text, no ornate border.

Aspectos: herói 1087×1447; skills 1403×1121; boss 1313×1198; zona 2172×724 (faixa); personagem/mochila 620×1466 (crop seguro no centro).

### F.7 `frame-arena.png` — nine-slice

> … rectangular viewport frame for 16:9–ish game view, thin elegant gothic gold-obsidian border, large transparent center, 9-slice friendly corners, no heavy side sculptures that break when stretched.

---

## G. Prioridade de produção

| Prioridade | Asset | Motivo |
|------------|-------|--------|
| P0 | `frame-heroi`, `frame-skills`, `frame-boss` | Trio sempre visível; ratios já no CSS |
| P0 | `frame-zona` | Identidade do topo; 3∶1 crítico |
| P1 | `frame-personagem` (nine-slice) + `bg-personagem` | Corrige `cover` atual |
| P1 | `frame-mochila` (reuso do slice do personagem) | Mesma dor do cover |
| P2 | `bg-heroi`, `bg-skills`, `bg-boss`, `bg-zona` | Ilustração no miolo |
| P2 | `frame-arena` nine-slice | Eleva o “jogo” vs dashboard |
| P3 | `frame-modal` família | Consistência de overlays |
| P3 | slots equip/inv, skill discs, botões | Polimento |
| P4 | log, meters, ranking (se reativar) | Baixo impacto imediato |

**Checklist de QA da arte (antes de plugar no CSS)**

1. Ratio = tabela B (±0 px no master).  
2. Centro verdadeiramente transparente (alpha 0).  
3. Espelho L/R e T/B dos cantos.  
4. Safe zone livre de spikes/glow forte.  
5. Teste mental: scale para 240×319 (mobile herói) — ornamentos ainda legíveis, não “lama”.

---

## Organização de diretórios e nomenclatura

```
idle/public/sinergia-idle/assets/hud/
  frames/
    frame-zona.png
    frame-heroi.png
    frame-skills.png
    frame-boss.png
    frame-personagem.png
    frame-mochila.png
    frame-arena.png
    frame-modal.png
    frame-slot-equip.png
    frame-slot-inv.png
    frame-skill-disc.png
  backgrounds/
    bg-zona.jpg
    bg-heroi.jpg
    bg-skills.jpg
    bg-boss.jpg
    bg-personagem.jpg
    bg-mochila.jpg
    bg-arena-mist.jpg
  ornaments/
    ornament-cap-h.png
    ornament-cap-v.png
    ornament-corner-tl.png  (e TR/BL/BR espelhados ou gerados)
  buttons/
    btn-nav-default.png
    btn-nav-gold.png
  icons/          (existentes: ui-*.svg, skill-*.svg, slot-*.svg)
  effects/        (glows, sheen de meter — opcional)
```

**Padrão de nome:** `frame-|bg-|ornament-|btn-|icon-|fx-` + kebab-case + papel.  
CSS: `url('/sinergia-idle/assets/hud/frames/frame-heroi.png')`.

---

## Anexo — medições brutas (browser)

### 1920×1080 (verificado)

| Seletor | W | H | Ratio |
|---------|---|---|-------|
| `.stage__left` | 310 | 1062,41 | 0,292 |
| `.card--rail` | 310 | 733,09 | 0,423 |
| `.card--bag` | 310 | 1011,55 | 0,306 |
| `.zone-plaque` | 600 | 200 | 3,000 |
| `.stage__viewport` | 1261,63 | 498,47 | 2,531 |
| `#arena` | 1241,63 | 478,47 | 2,595 |
| `.unit--hero` | 232,86 | 310 | 0,751 |
| `.unit--skills` | 387,97 | 310 | 1,252 |
| `#target-card` | 339,75 | 310 | 1,096 |

### 1440×900 (verificado)

| Seletor | W | H |
|---------|---|---|
| `.zone-plaque` | 594 | 198 |
| `.stage__viewport` | 781,63 | 324,47 |
| `.unit--hero` | 229,86 | 306 |
| `.unit--skills` | 382,97 | 306 |
| `#target-card` | 335,36 | 306 |

### 390×844 mobile (verificado; drawers abertos)

| Seletor | W | H |
|---------|---|---|
| `.stage__left` / right | 320 | 826,41 |
| `.zone-plaque` | 362,84 | 120,94 |
| `.stage__viewport` | 362,84 | 120 (mínimo CSS) |
| `.unit--hero` | 240 | 319,48 |
| `.unit--skills` | 360 | 287,64 |
| `#target-card` | 320 | 291,97 |

---

## Resumo executivo

A HUD live já preserva proporção no **trio de combate** e na **placa de zona** (`100% 100%` + ratios dos PNG). O problema de crop está concentrado nas **laterais** (`cover` em `painel-arcano-gotico.png`).  

Os nomes oficiais do novo kit são `frame-zona`, `frame-boss`, `frame-skills`, `frame-personagem`, `frame-heroi`. Para integrar sem distorção, cada arquivo deve nascer no **ratio do seletor CSS atual** (herói vertical 1087∶1447; skills 1403∶1121; boss 1313∶1198; zona 3∶1; personagem nine-slice em largura 310 CSS).  

Paleta âncora: navy `#061323`, ouro `#f4b52b`, texto `#e8f0f8`, HP/MP/XP `#e53935` / `#26c6da` / `#ab47bc`.  

**Próximo passo sugerido (fora deste doc):** gerar/ajustar os cinco `frame-*.png` nos masters da tabela B e só então plugar no CSS — sem redesenhar a HUD neste momento.
