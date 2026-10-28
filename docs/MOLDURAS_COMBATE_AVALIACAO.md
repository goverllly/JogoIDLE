# Molduras de combate — avaliação

Documento para revisar o código atual das molduras **herói**, **brasão central** e **inimigo**.

**Arquivos-fonte**
- HTML: `idle/public/jogo-idle/play.html`
- CSS: `idle/public/jogo-idle/theme-ref.css`

**Estrutura visual**

```
[ Moldura Herói ]  —  [ Brasão Cap. ]  —  [ Moldura Inimigo ]
```

- Herói e inimigo usam o **mesmo kit madeira** e a **mesma altura** (`--hud-h`).
- O brasão muda por capítulo via `--chapter-crest`.
- A paleta da moldura (`--wood-*`) também muda por `data-chapter` no `.play-stage`.

---

## 1. Mapa por capítulo

| Cap | `data-chapter` | Brasão (entre molduras) | Cor borda (`--wood-border`) |
|-----|----------------|-------------------------|-----------------------------|
| I | `I` (padrão) | `assets/hud/arena-crest-I.png` | `#3f5a2c` (verde) |
| II | `II` | `assets/hud/arena-crest-II.png` | `#8a929a` (cinza) |
| III | `III` | `assets/hud/arena-crest-III.png` | `#c45a28` (fogo) |
| IV | `IV` | `assets/hud/arena-crest-IV.png` | `#3a6ac8` (void) |

Botão **Arena** (fora das molduras): `assets/hud/ui-arena.png`  
(arte: *Emblema de Espadas Góticas Cruzadas*)

---

## 2. HTML completo (bloco de combate)

Trecho atual em `play.html`:

```html
<div class="duel duel--trio stage__combat">
  <div class="card unit unit--hero" data-hud-id="unit-hero">
    <div class="unit__head">
      <span id="unit-evo" class="badge badge--evo">Mortal</span>
      <strong id="unit-name">—</strong>
      <span class="lv-pill">Lv. <b id="unit-level">1</b></span>
    </div>
    <div class="unit__body">
      <div class="unit__section unit__section--vitals">
        <div id="hero-hp-meter" class="meter meter--hp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="hp-ghost" class="meter__ghost"></span>
            <span id="hp-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">HP</span>
          <span id="stat-hp" class="meter__value">0 / 0</span>
          <span id="hp-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div id="resource-meter" class="meter meter--mp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="mp-ghost" class="meter__ghost"></span>
            <span id="mp-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label" id="resource-label">MP</span>
          <span id="stat-mp" class="meter__value">0 / 0</span>
          <span id="mp-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div class="meter meter--xp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="unit-xp-fill" class="meter__fill">
              <i class="meter__tip" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">XP</span>
          <span id="unit-xp-value" class="meter__value">0 / 0</span>
        </div>
      </div>
      <div class="unit__section unit__section--status">
        <p id="farm-buff-chip" class="farm-buff-chip hidden" aria-live="polite"></p>
        <p id="progress-hint" class="progress-hint muted hidden"></p>
      </div>
      <div class="unit__section">
        <div class="unit__stats unit__stats--row unit__stats--tiles">
          <span class="stat-tile" title="Ataque"><i class="stat-tile__ico" aria-hidden="true">⚔</i><b id="stat-atk">0</b></span>
          <span class="stat-tile" title="Defesa"><i class="stat-tile__ico" aria-hidden="true">🛡</i><b id="stat-def">0</b></span>
          <span class="stat-tile" title="Chance de crítico"><i class="stat-tile__ico" aria-hidden="true">✦</i><b id="stat-crit">0%</b></span>
          <span class="stat-tile" title="Intervalo de ataque"><i class="stat-tile__ico" aria-hidden="true">⌁</i><b id="stat-speed">0s</b></span>
        </div>
      </div>
    </div>
  </div>

  <div class="duel-crest" aria-hidden="true" title="Batalha"></div>

  <div id="target-card" class="card unit unit--target" data-hud-id="unit-target">
    <div class="unit__head">
      <span id="target-kind" class="badge badge--mob">Alvo</span>
      <strong id="target-name">Sem alvo</strong>
      <span class="lv-pill">Lv. <b id="target-level">—</b></span>
    </div>
    <div class="unit__body">
      <div class="unit__section unit__section--vitals">
        <div id="target-hp-meter" class="meter meter--enemy meter--fx meter--chunky">
          <div class="meter__track">
            <span id="target-ghost" class="meter__ghost"></span>
            <span id="target-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">HP</span>
          <span id="target-hp" class="meter__value">—</span>
          <span id="target-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div class="unit__hp-meta">
          <span id="target-hp-pct">—</span>
          <span id="target-threat" class="muted">—</span>
        </div>
      </div>
      <div class="unit__section">
        <div class="unit__stats unit__stats--row unit__stats--tiles unit__stats--enemy">
          <span class="stat-tile" title="Dano do inimigo"><i class="stat-tile__ico" aria-hidden="true">⚔</i><b id="target-atk">—</b></span>
          <span class="stat-tile" title="Defesa do inimigo"><i class="stat-tile__ico" aria-hidden="true">🛡</i><b id="target-def">—</b></span>
          <span class="stat-tile stat-tile--meta" title="DPS estimado"><b id="target-dps">—</b></span>
          <span class="stat-tile stat-tile--meta" title="Tempo até matar"><b id="target-ttk">—</b></span>
        </div>
      </div>
      <div id="activity-banner" class="activity hidden">
        <div class="activity__top">
          <span id="activity-banner-name"></span>
        </div>
        <div class="activity__count"><b id="activity-kills">0</b> abates nesta sessão</div>
        <div class="activity__bar"><span id="activity-fill"></span></div>
        <p id="farm-status" class="activity__note">Parado</p>
        <p id="event-farm-line" class="activity__note activity__event hidden"></p>
        <p id="combat-feedback" class="activity__note activity__combat-fb hidden"></p>
      </div>
    </div>
  </div>
</div>
```

---

## 3. CSS — tokens de madeira (base)

```css
.play-stage {
  /* Madeira esculpida — linhas retas (0° / 90°) */
  --wood-grain:
    repeating-linear-gradient(
      90deg,
      rgba(255, 200, 140, 0.04) 0 1px,
      transparent 1px 12px,
      rgba(0, 0, 0, 0.07) 12px 13px,
      transparent 13px 24px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0 16px,
      rgba(0, 0, 0, 0.055) 16px 17px,
      transparent 17px 34px,
      rgba(255, 190, 120, 0.03) 34px 35px
    );
  --wood-fill: linear-gradient(165deg, #6a4528 0%, #4a2e18 32%, #322012 68%, #1e140a 100%);
  --wood-border: #9a6e3c;
  --wood-metal: rgba(210, 160, 80, 0.45);
  --wood-inset: #2c1a0e;
  --wood-ring: rgba(210, 160, 80, 0.35);
  --wood-shine: rgba(255, 220, 170, 0.2);
  --wood-pad: 1.85rem;
  --wood-corner-tl: url("data:image/svg+xml,..."); /* rivete TL */
  --wood-corner-tr: url("data:image/svg+xml,..."); /* rivete TR */
  --wood-corner-bl: url("data:image/svg+xml,..."); /* rivete BL */
  --wood-corner-br: url("data:image/svg+xml,..."); /* rivete BR */
}
```

> Os data-URI SVG completos dos 4 cantos estão em `theme-ref.css` (~L75–78 base; ~L93–96 Cap.I; ~L118–121 Cap.II; ~L143–146 Cap.III; ~L168–171 Cap.IV).

---

## 4. CSS — override por capítulo (resumo)

Cada capítulo redefine:

- `--chapter-bg` / `--chapter-bg-veil` (fundo do play)
- `--chapter-crest` (brasão entre molduras)
- `--wood-border`, `--wood-metal`, `--wood-inset`, `--wood-ring`, `--wood-shine`, `--wood-fill`
- `--wood-corner-tl|tr|bl|br` (rivetes na cor do capítulo)
- `--btn-*` (botões Área / Arena / Parar)

Exemplo Cap. I:

```css
.play-stage[data-chapter='I'],
.play-stage:not([data-chapter]) {
  --chapter-bg: url('/jogo-idle/assets/chapters/bg-cap-I.png');
  --chapter-crest: url('/jogo-idle/assets/hud/arena-crest-I.png');
  --chapter-bg-veil: linear-gradient(180deg, rgba(8, 18, 10, 0.45) 0%, rgba(4, 12, 8, 0.68) 100%);
  --wood-border: #3f5a2c;
  --wood-metal: rgba(90, 120, 60, 0.4);
  --wood-inset: #0a1408;
  --wood-ring: rgba(70, 100, 45, 0.42);
  --wood-shine: rgba(120, 150, 80, 0.14);
  --wood-fill: linear-gradient(165deg, #2a3e1e 0%, #1a2814 32%, #0e1810 68%, #060c06 100%);
  /* corners SVG verdes + btn-* */
}
```

---

## 5. CSS — layout + kit madeira (completo)

```css
/*
 * Madeira esculpida — Herói / Inimigo (+ rail/bag/log)
 */
.play-stage .duel--trio,
.play-stage .stage__combat {
  --hud-h: clamp(250px, 36vh, 340px);
  display: grid !important;
  grid-template-columns:
    minmax(0, 1fr)
    auto
    minmax(0, 1fr) !important;
  gap: 0.55rem !important;
  align-items: stretch !important;
  justify-content: center !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--ink) !important;
  box-shadow: none !important;
  max-height: none !important;
  overflow: visible !important;
}

/* Brasão central — muda com o capítulo (--chapter-crest) */
.play-stage .duel--trio .duel-crest,
.play-stage .stage__combat .duel-crest {
  display: block !important;
  align-self: center !important;
  width: clamp(4.5rem, 8vw, 6.25rem) !important;
  height: clamp(4.5rem, 8vw, 6.25rem) !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none;
  background-image: var(--chapter-crest, url('/jogo-idle/assets/hud/arena-crest-I.png'));
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}

.play-stage .duel--trio .unit,
.play-stage .stage__combat .unit,
.play-stage .stage__combat .card,
.play-stage .card.unit {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.28rem !important;
  height: var(--hud-h) !important;
  width: 100% !important;
  min-height: 0 !important;
  position: relative !important;
  color: var(--ink) !important;
  overflow: hidden !important;
  background-color: transparent !important;
  isolation: isolate;
}

.play-stage .duel--trio .unit.unit--target,
.play-stage .stage__combat .unit.unit--target {
  overflow: hidden !important;
}

/* —— Kit madeira —— */
.play-stage .stage__left > .card.card--rail,
.play-stage .stage__right > .card.card--bag,
.play-stage .stage__right > .card.card--log,
.play-stage .duel--trio .unit.unit--hero,
.play-stage .stage__combat .unit.unit--hero,
.play-stage .duel--trio .unit.unit--skills,
.play-stage .stage__combat .unit.unit--skills,
.play-stage .duel--trio .unit.unit--target,
.play-stage .stage__combat .unit.unit--target {
  position: relative !important;
  border-style: solid !important;
  border-width: 3px !important;
  border-radius: 6px !important;
  border-color: var(--wood-border) !important;
  background-color: transparent !important;
  background-image: var(--wood-grain), var(--wood-fill) !important;
  background-repeat: repeat, no-repeat !important;
  background-size: auto, 100% 100% !important;
  color: var(--ink) !important;
  box-shadow:
    inset 0 0 0 1px var(--wood-metal),
    inset 0 0 0 4px var(--wood-inset),
    inset 0 0 0 5px var(--wood-ring),
    inset 0 2px 0 var(--wood-shine),
    inset 0 0 14px rgba(0, 0, 0, 0.4),
    0 10px 24px rgba(0, 0, 0, 0.5) !important;
}

/* Rivetes nos 4 cantos */
.play-stage .stage__left > .card.card--rail::after,
.play-stage .stage__right > .card.card--bag::after,
.play-stage .stage__right > .card.card--log::after,
.play-stage .duel--trio .unit.unit--hero::after,
.play-stage .stage__combat .unit.unit--hero::after,
.play-stage .duel--trio .unit.unit--skills::after,
.play-stage .stage__combat .unit.unit--skills::after,
.play-stage .duel--trio .unit.unit--target::after,
.play-stage .stage__combat .unit.unit--target::after {
  content: '' !important;
  display: block !important;
  position: absolute !important;
  inset: 3px !important;
  pointer-events: none !important;
  z-index: 3 !important;
  border-radius: 2px !important;
  background-repeat: no-repeat !important;
  background-size: 22px 22px, 22px 22px, 22px 22px, 22px 22px !important;
  background-position: left top, right top, left bottom, right bottom !important;
  background-image:
    var(--wood-corner-tl),
    var(--wood-corner-tr),
    var(--wood-corner-bl),
    var(--wood-corner-br) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 220, 160, 0.12) !important;
}

/* Padding igual — mesmo tamanho visual */
.play-stage .duel--trio .unit.unit--hero,
.play-stage .stage__combat .unit.unit--hero,
.play-stage .duel--trio .unit.unit--skills,
.play-stage .stage__combat .unit.unit--skills,
.play-stage .duel--trio .unit.unit--target,
.play-stage .stage__combat .unit.unit--target {
  padding: 1.05rem 1.1rem 1.1rem !important;
}

/* Conteúdo acima dos rivetes */
.play-stage .duel--trio .unit.unit--hero > *,
.play-stage .duel--trio .unit.unit--target > *,
.play-stage .stage__combat .unit.unit--hero > *,
.play-stage .stage__combat .unit.unit--target > * {
  position: relative;
  z-index: 1;
}
```

---

## 6. Checklist de avaliação

- [ ] Herói e inimigo parecem **mesmo tamanho** (altura/padding)?
- [ ] Borda + anéis + rivetes legíveis em Cap. I–IV?
- [ ] Brasão central troca corretamente ao mudar `data-chapter`?
- [ ] Conteúdo (HP / dano / defesa) não colide com rivetes?
- [ ] Em mobile (coluna única) o brasão ainda faz sentido no meio?
- [ ] Quer moldura com arte PNG em vez do kit CSS madeira?

---

## 7. Notas

- O painel do inimigo **não** mostra mais Área / Marco / Onda / Sessão (removido).
- Skills e auto-poção/auto-skills ficam **embutidos na viewport 3D**, não entre as molduras.
- O mesmo kit madeira também reveste **Personagem (rail)**, **Mochila** e **Log**.

Quando terminar a avaliação, marque o checklist ou diga o que mudar (ex.: cantos mais grossos, brasão maior, moldura PNG por capítulo).

---

## 8. HUD 4.0 Lighting (aplicado)

Camada só CSS de iluminação / profundidade, sem mudar HTML, JS ou layout 3D.

**Arquivos**
- [`idle/public/jogo-idle/hud-lighting.css`](../idle/public/jogo-idle/hud-lighting.css) — módulo fonte
- [`idle/public/jogo-idle/theme-ref.css`](../idle/public/jogo-idle/theme-ref.css) — mesmo conteúdo anexado no final (vence a cascata)

**Efeitos**
- Tokens `--hud-light-*` por `data-chapter` (I verde, II prata, III brasa, IV violeta)
- Molduras herói/inimigo: sombras inset + glow temático suave; `::before` de reflexo (rivetes `::after` intactos)
- Painéis rail/bag/log: reflexo superior + glow mais discreto que o combate
- Brasão: `drop-shadow` temático + aura radial `::before`
- Slots equip / inv-cells: profundidade, hover com `transform` leve
- Barras HP/MP/XP: trilha mais profunda + sheen no fill (cores funcionais mantidas)
- Botões: hover com `--hud-light-edge`; vender preserva tom de perigo
- `.arena-skills` / `.arena-autos`: borda/sombra temática; canvas sem filter/blur
- `prefers-reduced-motion`: desliga transitions/transforms de hover

**Validação**
- Cascata: bloco no fim de `theme-ref.css` (após `styles` → `hud` → `theme-v2` → `theme-ref`)
- Não alterados: viewport 3D, HTML, JS, assets de brasão/fundo
- Conferir visualmente Cap. I–IV trocando `data-chapter` no `.play-stage`
- Desktop-first (1920×1080 / 1366×768); sem mudança de breakpoints mobile

**Futuro (não feito)**
- `<link>` dedicado a `hud-lighting.css` se quiser separar do monólito
- Classes JS para glow de boss/crit

---

## Apêndice A — HTML completo (sem omissões)

Fonte: `idle/public/jogo-idle/play.html`

```html
<div class="duel duel--trio stage__combat">
  <div class="card unit unit--hero" data-hud-id="unit-hero">
    <div class="unit__head">
      <span id="unit-evo" class="badge badge--evo">Mortal</span>
      <strong id="unit-name">—</strong>
      <span class="lv-pill">Lv. <b id="unit-level">1</b></span>
    </div>
    <div class="unit__body">
      <div class="unit__section unit__section--vitals">
        <div id="hero-hp-meter" class="meter meter--hp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="hp-ghost" class="meter__ghost"></span>
            <span id="hp-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">HP</span>
          <span id="stat-hp" class="meter__value">0 / 0</span>
          <span id="hp-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div id="resource-meter" class="meter meter--mp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="mp-ghost" class="meter__ghost"></span>
            <span id="mp-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label" id="resource-label">MP</span>
          <span id="stat-mp" class="meter__value">0 / 0</span>
          <span id="mp-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div class="meter meter--xp meter--fx meter--chunky">
          <div class="meter__track">
            <span id="unit-xp-fill" class="meter__fill">
              <i class="meter__tip" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">XP</span>
          <span id="unit-xp-value" class="meter__value">0 / 0</span>
        </div>
      </div>
      <div class="unit__section unit__section--status">
        <p id="farm-buff-chip" class="farm-buff-chip hidden" aria-live="polite"></p>
        <p id="progress-hint" class="progress-hint muted hidden"></p>
      </div>
      <div class="unit__section">
        <div class="unit__stats unit__stats--row unit__stats--tiles">
          <span class="stat-tile" title="Ataque"><i class="stat-tile__ico" aria-hidden="true">⚔</i><b id="stat-atk">0</b></span>
          <span class="stat-tile" title="Defesa"><i class="stat-tile__ico" aria-hidden="true">🛡</i><b id="stat-def">0</b></span>
          <span class="stat-tile" title="Chance de crítico"><i class="stat-tile__ico" aria-hidden="true">✦</i><b id="stat-crit">0%</b></span>
          <span class="stat-tile" title="Intervalo de ataque"><i class="stat-tile__ico" aria-hidden="true">⌁</i><b id="stat-speed">0s</b></span>
        </div>
      </div>
    </div>
  </div>

  <div class="duel-crest" aria-hidden="true" title="Batalha"></div>

  <div id="target-card" class="card unit unit--target" data-hud-id="unit-target">
    <div class="unit__head">
      <span id="target-kind" class="badge badge--mob">Alvo</span>
      <strong id="target-name">Sem alvo</strong>
      <span class="lv-pill">Lv. <b id="target-level">—</b></span>
    </div>
    <div class="unit__body">
      <div class="unit__section unit__section--vitals">
        <div id="target-hp-meter" class="meter meter--enemy meter--fx meter--chunky">
          <div class="meter__track">
            <span id="target-ghost" class="meter__ghost"></span>
            <span id="target-fill" class="meter__fill">
              <i class="meter__sheen" aria-hidden="true"></i>
              <i class="meter__tip" aria-hidden="true"></i>
              <i class="meter__sparks" aria-hidden="true"></i>
            </span>
          </div>
          <span class="meter__label">HP</span>
          <span id="target-hp" class="meter__value">—</span>
          <span id="target-delta" class="meter__delta" aria-hidden="true"></span>
        </div>
        <div class="unit__hp-meta">
          <span id="target-hp-pct">—</span>
          <span id="target-threat" class="muted">—</span>
        </div>
      </div>
      <div class="unit__section">
        <div class="unit__stats unit__stats--row unit__stats--tiles unit__stats--enemy">
          <span class="stat-tile" title="Dano do inimigo"><i class="stat-tile__ico" aria-hidden="true">⚔</i><b id="target-atk">—</b></span>
          <span class="stat-tile" title="Defesa do inimigo"><i class="stat-tile__ico" aria-hidden="true">🛡</i><b id="target-def">—</b></span>
          <span class="stat-tile stat-tile--meta" title="DPS estimado"><b id="target-dps">—</b></span>
          <span class="stat-tile stat-tile--meta" title="Tempo até matar"><b id="target-ttk">—</b></span>
        </div>
      </div>
      <div id="activity-banner" class="activity hidden">
        <div class="activity__top">
          <span id="activity-banner-name"></span>
        </div>
        <div class="activity__count"><b id="activity-kills">0</b> abates nesta sessão</div>
        <div class="activity__bar"><span id="activity-fill"></span></div>
        <p id="farm-status" class="activity__note">Parado</p>
        <p id="event-farm-line" class="activity__note activity__event hidden"></p>
        <p id="combat-feedback" class="activity__note activity__combat-fb hidden"></p>
      </div>
    </div>
  </div>
</div>
```

---

## Apêndice B — SVG dos 4 cantos (expandido)

Usados em `::after` das molduras via `--wood-corner-tl|tr|bl|br` (28×28).  
Geometria idêntica; só as cores mudam por capítulo.

### Base (latão — fallback `.play-stage`)

**TL**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path fill="#c9a05a" d="M2 2h18v3H5v15H2V2z"/>
  <path fill="#8a6230" d="M3 3h15v1.5H4.5V18H3V3z"/>
  <circle cx="7" cy="7" r="2.2" fill="#f0d090" stroke="#5a3a14" stroke-width="0.8"/>
</svg>
```

**TR**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path fill="#c9a05a" d="M8 2h18v18h-3V5H8V2z"/>
  <path fill="#8a6230" d="M10 3h15v15h-1.5V4.5H10V3z"/>
  <circle cx="21" cy="7" r="2.2" fill="#f0d090" stroke="#5a3a14" stroke-width="0.8"/>
</svg>
```

**BL**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path fill="#c9a05a" d="M2 8h3v15h15v3H2V8z"/>
  <path fill="#8a6230" d="M3 10h1.5v15H18v1.5H3V10z"/>
  <circle cx="7" cy="21" r="2.2" fill="#f0d090" stroke="#5a3a14" stroke-width="0.8"/>
</svg>
```

**BR**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path fill="#c9a05a" d="M23 8h3v18H8v-3h15V8z"/>
  <path fill="#8a6230" d="M23.5 10H25v15H10v1.5h15V10z"/>
  <circle cx="21" cy="21" r="2.2" fill="#f0d090" stroke="#5a3a14" stroke-width="0.8"/>
</svg>
```

### Cores por capítulo (trocar nos 3 fills + stroke do círculo)

| Cap | path claro | path escuro | círculo fill | círculo stroke |
|-----|------------|-------------|--------------|----------------|
| Base | `#c9a05a` | `#8a6230` | `#f0d090` | `#5a3a14` |
| I | `#6a8a48` | `#405828` | `#90b068` | `#283818` |
| II | `#a8b0b8` | `#687078` | `#d0d8e0` | `#404850` |
| III | `#e07038` | `#904020` | `#ffb060` | `#582010` |
| IV | `#5890e8` | `#3050a0` | `#90c0ff` | `#203870` |

### Cap. I — TL (exemplo com cores verdes)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <path fill="#6a8a48" d="M2 2h18v3H5v15H2V2z"/>
  <path fill="#405828" d="M3 3h15v1.5H4.5V18H3V3z"/>
  <circle cx="7" cy="7" r="2.2" fill="#90b068" stroke="#283818" stroke-width="0.8"/>
</svg>
```
