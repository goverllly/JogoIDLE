# Prompts de Geração — Assets HUD 3.0

**Data:** 2026-10-26  
**Uso:** um prompt por família (não misturar proporções distintas na mesma geração).  
**Referência:** [`CATALOGO_ASSETS_HUD_3.md`](CATALOGO_ASSETS_HUD_3.md) · [`GUIA_VISUAL_HUD_3.md`](GUIA_VISUAL_HUD_3.md)

**Instruções gerais para todas as gerações**

- Estilo: Dark Fantasy Medieval ilustrado, premium RPG UI, não pixel-art, não anime, não flat Material Design.  
- Paleta: deep navy `#061323`, gold `#F4B52B` / `#FFD56A` / `#D99A27`, black stone, aged metal, subtle ember glow.  
- Output: PNG with **true alpha channel**; empty center for content; no white/black fake transparency.  
- No readable text, letters, numbers, logos, watermarks, or fake UI controls.  
- Perfect left-right symmetry on frames; geometric corner alignment.  
- Soft anti-aliased edges on alpha.  
- Cinematic lighting, restrained bloom.

---

## Família 1 — Modal SM (`frame-modal-sm` · A01)

**Assets:** A01  
**Proporção:** ~19∶13 landscape panel · export ~760×520  
**Técnica:** nine-slice friendly (plain stretch edges, ornate corners)

```
Game UI frame only, small confirmation dialog border for a dark fantasy medieval RPG.
Landscape rectangle approximately 19:13 (reference 760x520 px).
Ornate gothic golden filigree corners on black stone and aged iron, deep navy void in the center.
Center 70% completely empty transparent (alpha) for HTML text and two buttons.
Symmetric left-right, matching corner ornaments, consistent gold trim thickness.
True transparent background outside and inside the frame. No glass fake fill.
No text, no buttons drawn, no icons, no characters, no UI mock content.
Nine-slice compatible: complex detail only in corners; straight edges simple enough to stretch.
Style: illustrated concept art UI, cinematic rim light, embers only in corner accents.
```

---

## Família 2 — Modal MD (`frame-modal-md` · A02)

**Assets:** A02  
**Proporção:** square-ish master for nine-slice · export ~960×960  
**Consumidores:** merchant, skills, divindade, engagement

```
Reusable medium game UI modal frame, dark fantasy medieval, nine-slice ready.
Master canvas ~960x960 px. Thick black-stone gothic border with gold and aged-bronze ornaments.
Large hollow transparent center (alpha) for scrollable shop or skill tree content.
Corners highly detailed and symmetric; mid-edge segments plain stone+thin gold line for stretching.
Deep navy atmosphere hints only on the inner rim, not filling the center.
No text, no sample list items, no close button drawn, no characters.
Palette: #061323 void, #F4B52B gold, worn metal, subtle lantern glow in corners only.
True alpha outside and inside. Illustrated, not flat vector, not pixel art.
```

---

## Família 3 — Modal LG (`frame-modal-lg` · A03)

**Assets:** A03  
**Proporção:** taller panel · export ~960×1200  
**Consumidores:** arena, offline-report, hunt-perf

```
Large tall game UI modal frame for dark fantasy medieval RPG, nine-slice ready.
Canvas ~960x1200 px, vertical emphasis. Gothic stone arch suggestion at top center, gold filigree.
Vast transparent alpha center for long scrollable lists and stats.
Symmetric L/R; ornate top and bottom caps; stretchable side rails with minimal mid detail.
No parchment texture filling the center; center must stay empty alpha.
No text, charts, tables, or portraits inside.
Colors: deep navy #061323, gold #F4B52B / #D99A27, black stone, aged iron.
True PNG alpha. Cinematic but restrained. UI frame asset only.
```

---

## Família 4 — Painel lateral (`frame-panel-side` · A04 + opcional A05)

**Assets:** A04 (frame), A05 (bg opcional — gerar SEPARADO)  
**Proporção:** nine-slice square master 640×640; bg opaco vertical ~1∶2.4 e 1∶3.4

### Prompt A04 — moldura

```
Vertical side-panel UI frame for dark fantasy medieval RPG character/inventory column.
Nine-slice master ~640x640. Black gothic stone border with gold ornaments, designed to stretch vertically.
Corners ornate and symmetric; vertical edges mostly plain with thin gold trim.
Entire inner rectangle transparent alpha for UI content. No cover-crop illustration inside the frame.
No text, tabs, or inventory icons drawn.
Palette navy #061323, gold #F4B52B, aged metal. True alpha. Illustrated UI chrome only.
```

### Prompt A05 — fundo miolo (geração separada)

```
Opaque illustrated background texture for a dark fantasy UI side panel interior.
Vertical composition, soft ruined hall / arcane stone wall, deep navy #061323 dominant, subtle gold dust.
Low contrast, no strong focal object in the center, no text, no characters, no bright hotspots.
Suitable to sit behind readable white/blue UI text. JPG style opaque, not a frame.
Aspect roughly 1:2.4 (e.g. 620x1466). Dark cinematic lighting.
```

---

## Família 5 — Zona (`frame-zona` · A06)

**Assets:** A06  
**Proporção:** **2172∶724** exatamente · export 2172×724 (ou 2×)

```
Wide horizontal UI plaque frame for zone/area title in dark fantasy medieval RPG.
Exact aspect ratio 2172:724 (about 3:1). Canvas 2172x724 px.
Gothic golden end-caps left and right, black stone bar, centered top and bottom ornaments on axis.
Center band ~76% width empty transparent alpha for title text.
No readable letters. True alpha. Symmetric L/R.
Colors #061323, #F4B52B, #FFD56A accents, aged iron. Illustrated, cinematic, not stretched ornaments.
```

---

## Família 6 — Trio combate (A07–A09) — **três gerações separadas**

### A07 `frame-heroi` — proporção **1087∶1447**

```
Vertical combat HUD panel frame for player hero vitals in dark fantasy medieval RPG.
Exact aspect ratio 1087:1447. Export at least 1087x1447 (prefer 2x).
Ornate gothic gold and black-stone border; empty transparent center for HP/MP/XP bars and name.
Safe empty inset approx top 10%, sides 11%, bottom 13%.
No portrait, no bars drawn, no text, no numbers. True alpha.
Symmetric frame. Palette #061323, #F4B52B, aged metal, subtle ember corners.
```

### A08 `frame-skills` — proporção **1403∶1121**

```
Landscape combat HUD panel frame for skill buttons, dark fantasy medieval RPG.
Exact aspect ratio 1403:1121. Export at least 1403x1121 (prefer 2x).
Gothic gold-black stone frame; large transparent center for three circular skill slots.
Safe empty inset approx top 9%, sides 12%, bottom 11%.
No skill icons, no buttons, no text. True alpha. Symmetric. Navy #061323 and gold #F4B52B.
```

### A09 `frame-alvo` — proporção **1313∶1198**

```
Near-square combat HUD panel frame for enemy target, dark fantasy medieval RPG.
Exact aspect ratio 1313:1198. Export at least 1313x1198 (prefer 2x).
Slightly more aggressive gothic spikes/ornaments than the hero frame, still elegant.
Transparent center for enemy name and HP. Safe inset top 9%, sides 11%, bottom 14%.
No monster art, no text, no health bar painted in. True alpha. Gold #F4B52B on black stone, navy void.
```

---

## Família 7 — Arena viewport (`frame-arena` · A10)

**Assets:** A10  
**Proporção:** nine-slice ~800×800

```
Wide arena viewport stone frame for a 3D battle window, dark fantasy medieval.
Nine-slice UI border only: ruined gothic arch suggestions, black stone, gold inlay, aged iron.
Large rectangular transparent center for 3D canvas. No scene illustration inside.
Corners detailed; edges stretchable. True alpha. No text. Palette #061323 and #F4B52B.
```

---

## Família 8 — Ornamentos (A11–A12)

### A11 divider

```
Horizontal gold gothic ornament divider on transparent background, dark fantasy UI.
Thin wide strip ~560x24 px, symmetric flourishes left-right, center jewel or crest small.
No text. True alpha. Colors gold #F4B52B / #D99A27, subtle metal. Isolated ornament only.
```

### A12 corner (gerar um canto; espelhar no engine)

```
Single ornate gothic UI corner piece, gold filigree on black stone, transparent background.
56x56 px style detail suitable for 28px display. L-shaped corner ornament only.
No full frame. True alpha. Matching style of dark fantasy medieval gold UI.
```

---

## Família 9 — Tooltip e toast (A13–A14, D07–D08)

### A13 tooltip

```
Small vertical UI tooltip frame, dark fantasy medieval, nine-slice ready.
Reference width 230 CSS px (export ~460 wide). Transparent hollow center for item stats text.
Thin gold border, black stone, subtle top glow. No sample stats text. True alpha.
```

### A14 / D07 / D08 toasts — gerar 3 variantes em sessões separadas (info / reward / danger)

**Info (A14):**

```
Horizontal toast/notification chip frame, dark fantasy medieval UI.
~640x96 px, rounded rectangular outer silhouette, hollow transparent center for one line of text.
Navy-gold stone frame, restrained. No text. True alpha. Symmetric.
```

**Reward (D07):** same prompt + “warmer gold embertone, slight laurel hint, still hollow center, no text.”

**Danger (D08):** same prompt + “cooler iron with crimson-ember accent on trim only, hollow center, no text.”

---

## Família 10 — Botões (B01–B10)

Gerar **uma proporção horizontal por tipo**. Sem texto.

### Primary (B01)

```
Horizontal reusable RPG button frame, dark fantasy medieval, nine-slice.
~320x80 px. Gold metal plate (#F4B52B to #D99A27) on black stone edges, empty transparent center for CSS label.
No letters. Hover-ready clean face. True alpha. Symmetric left-right caps.
```

### Secondary (B02)

```
Same as primary button frame but cooler navy steel plate (#0e2238 / #1e3a55) with thin gold trim.
Empty transparent center, no text, nine-slice, ~320x80, true alpha, dark fantasy medieval.
```

### Danger (B03)

```
Same button proportions ~320x80, dark iron with crimson-ember edge accents, hollow transparent center.
No text. Nine-slice. Dark fantasy medieval UI. True alpha.
```

### Rail / mini / tab / toggle / tiny (B04–B10)

Use the same structure, adjusting canvas:

| ID | Canvas | Nota no prompt |
|----|--------|----------------|
| B04 rail | 560×80 | full-width nav row frame |
| B05 mini | 240×72 | compact action button |
| B06 tab | 200×64 | inactive tab plate |
| B07 tab-active | 200×64 | brighter gold fill plate, still no text |
| B08 toggle-off | 280×72 | recessed dark plate |
| B09 toggle-on | 280×72 | lit gold plate |
| B10 tiny | 80×56 | small square-ish attr button |

Sempre: hollow center, true alpha, no text, matching gothic gold-stone language.

---

## Família 11 — Slots inventário / equip (C01–C06, D01, C09)

**Gerar círculos e quadrados em sessões separadas.**

### Equip circle empty (C01) — 136×136

```
Circular equipment slot frame for dark fantasy RPG UI, 136x136 px.
Black stone ring with gold gothic trim, empty transparent center for item icon.
No item drawn. True alpha outside circle. Symmetric. Palette #061323 and #F4B52B.
```

### Equip filled base (C02)

```
Same circular slot as above but slightly brighter inner rim suggesting occupied slot.
Still empty transparent center, no item art. 136x136, true alpha.
```

### Inv square empty / filled (C03–C04)

```
Square inventory cell frame 136x136, dark fantasy medieval, gold-black stone.
Transparent center for item icon. Empty (darker inset) OR filled (brighter rim) — generate separately.
No item, no rarity rainbow, no text. True alpha.
```

### Rarity overlay (C05)

```
Circular or square thin filigree overlay ring only, grayscale or neutral gold, designed to be colorized in CSS.
Transparent everywhere except the ornate rim. 136x136. No fill in center. True alpha.
```

### Refine ring (C06)

```
Thin ornate circular refine ring ornament, gold, transparent center and outside, 136x136.
Meant to sit under CSS animation. No numbers. True alpha. Dark fantasy.
```

### Skill combat (D01) — 96×96 circle

```
Small circular skill slot frame 96x96 for combat hotbar, dark fantasy gold-stone ring.
Transparent center. No skill icon. True alpha.
```

### Skill node (C09) — 112×112 rounded square

```
Rounded-square skill tree node frame 112x112, dark fantasy medieval UI.
Hollow transparent center. Gold-black stone. No icons/text. True alpha.
```

---

## Família 12 — Menu / portrait (C07–C08)

### C07 menu

```
Narrow vertical context-menu frame, dark fantasy, nine-slice, ~300x200 master.
Hollow transparent center for a column of text buttons. Thin gold border, black stone.
No menu labels. True alpha.
```

### C08 portrait ring

```
Circular portrait frame ring 156x156, ornate gothic gold on black stone.
Transparent center for character photo. True alpha outside and inside ring.
No face drawn. Dark fantasy medieval.
```

---

## Família 13 — Meters (D02–D05)

### Track (D02) — 400×44

```
Horizontal HP bar outer track frame only, dark fantasy metal and stone, ~400x44.
Hollow transparent center strip for CSS-colored fill. End caps ornate but nine-slice mid stretchable.
No fill color painted as full bar. No numbers. True alpha. Gold trim #F4B52B.
```

### Compact (D03) — 400×32 — same prompt with “thinner 16px-class track”.

### Caps L/R (D04–D05) — gerar um e espelhar

```
Single ornate meter end-cap ornament, gold-black, transparent BG, ~20x44.
Left-facing gothic finial. No bar body. True alpha.
```

---

## Família 14 — Chip (D06)

```
Small horizontal status chip frame ~320x56, dark fantasy gold-stone, hollow transparent center for short buff text.
No text. True alpha. Symmetric.
```

---

## Família 15 — Fundos unit opcionais (D09–D10) — opacos, separados

### D09

```
Opaque vertical illustrated panel background 1087:1447 for behind hero HUD content.
Dark ruined chapel interior, navy #061323, low contrast, no characters, no UI, no text.
Soft vignette, center darker for readability.
```

### D10

```
Opaque near-square illustrated panel background 1313:1198 for enemy HUD.
Darker menacing stone chamber, navy, low contrast center, no creature, no text, no UI.
```

---

## Família 16 — Etapa 5 especiais (E01–E09)

Gerar **individualmente**; não batch com outras famílias.

| ID | Prompt-núcleo |
|----|----------------|
| E01 | Celestial gold ornament banner strip for divinity modal header, transparent, no text, ~840x200 |
| E02 | Offline hunt report header ornament bar, map/scroll motif without letters, ~880x144, alpha |
| E03 | Lobby character card frame nine-slice, dark fantasy, hollow center, ~920x600 |
| E04 | Pet companion card frame horizontal, hollow, ~560x200, alpha |
| E05 | Merchant offer row frame, hollow, ~880x160, alpha |
| E06 | Opaque zone plaque background 2172x724, soft ruins skyline, low contrast, no frame, no text |
| E07 | Mobile drawer tab pill frame, ~240x64, hollow, alpha |
| E08 | *(manter gold-coins-stack existente — não regenerar a menos que necessário)* |
| E09 | Collapsed log header bar frame ~620x88, hollow, alpha |

Para cada um, anexar o bloco de instruções gerais do topo deste arquivo.

---

## Anti-prompts (colar em Negative / Avoid)

```
text, letters, numbers, watermark, logo, UI mockup content, fake buttons with labels,
white background, black matte pretending transparency, stretched asymmetric ornaments,
anime, chibi, pixel art, cyberpunk neon purple, modern flat SaaS dashboard,
photograph of real wood picture frame, cluttered center, busy noise behind text area,
3D plastic bevel Windows 95, duplicate mismatched corners
```

---

## Ordem sugerida de geração

1. A06, A07, A08, A09 (proporções críticas do combate)  
2. A01–A04, A10, A13–A14  
3. B01–B03 (depois variantes B)  
4. C01–C04, D01, C09  
5. Meters e Etapa 5  

Nunca gerar herói + zona na mesma imagem. Nunca misturar círculo de slot com modal retangular na mesma geração.
