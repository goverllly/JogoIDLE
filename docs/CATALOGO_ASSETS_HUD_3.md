# Catálogo de Assets — HUD 3.0 Jogo IDLE

**Data:** 2026-10-26  
**Base:** inventário em [`AUDITORIA_COMPONENTES_VISUAIS.md`](AUDITORIA_COMPONENTES_VISUAIS.md)  
**Direção:** [`GUIA_VISUAL_HUD_3.md`](GUIA_VISUAL_HUD_3.md) · **Prompts:** [`PROMPTS_ASSETS_HUD_3.md`](PROMPTS_ASSETS_HUD_3.md)

**Política:** zero texto rasterizado em botões reutilizáveis; fills e estados dinâmicos permanecem CSS; molduras com alfa real; nine-slice nos elementos de altura/largura fluida.

---

## Resumo quantitativo do catálogo

| Métrica | Valor |
|---------|-------|
| Assets exclusivos recomendados | **52** |
| Só reuso (sem arte nova) via CSS/SVG existente | meters fill, rarity glow, refine anim, toggles, ícones SVG atuais |
| Substituições de PNG RGB atuais | **5** (trio + zona + arcano → versões alfa / nine-slice) |
| Órfãos (não produzir / não integrar agora) | ranking (5 arquivos) |
| Etapa 1 | 14 exclusivos |
| Etapa 2 | 10 exclusivos |
| Etapa 3 | 9 exclusivos |
| Etapa 4 | 10 exclusivos |
| Etapa 5 | 9 exclusivos |

---

## Convenções

| Campo | Significado |
|-------|-------------|
| Dimensão CSS | Tamanho de display alvo (1×) |
| Exportação @2x | Resolução mínima do arquivo |
| Técnica | A fundo · B moldura alfa · C nine-slice · D ornamento · E CSS · F atlas |
| Prioridade | P1 Etapa1 … P5 Etapa5 |
| Status atual | `novo` / `substituir` / `manter` / `órfão` |

**Nomenclatura:** `frame-*` molduras · `ornament-*` peças · `bg-*` fundos opacos · `icon-*` só se SVG atual for insuficiente.

---

## Tabela mestra

| ID | Asset | Componente | Dimensão CSS | Exportação @2x | Proporção | Transparência | Técnica | Prioridade | Status |
|----|-------|------------|--------------|----------------|-----------|---------------|---------|------------|--------|
| A01 | `frame-modal-sm.png` | `#idle-confirm` | ~380×220–280 | 760×520 | ~19∶13 | Sim | C | P1 | novo |
| A02 | `frame-modal-md.png` | merchant, skills, divindade, engagement | 420–480 × até 640h | 960×960 base nine-slice | fluido | Sim | C | P1 | novo |
| A03 | `frame-modal-lg.png` | arena, offline-report, hunt-perf | 440–480 × até 740h | 960×1200 base | fluido | Sim | C | P1 | novo |
| A04 | `frame-panel-side.png` | `.card--rail`, `.card--bag`, drawers | 310×733–1062; drawer 320×h | nine-slice 640×640 + bordas | fluido | Sim | C | P1 | substituir `painel-arcano-gotico` |
| A05 | `bg-panel-side.jpg` | miolo rail/bag (opcional) | cover no miolo só | 620×1466 e 620×2124 | ~1∶2.4 / 1∶3.4 | Não | A | P1 | novo |
| A06 | `frame-zona.png` | `.zone-plaque` | até 600×200 | **2172×724** (manter master) | 2172∶724 | Sim | B | P1 | substituir `placa-zona` |
| A07 | `frame-heroi.png` | `.unit--hero` | ~233×310 @1080p | **2174×2894** ou manter 1087×1447 mínimo | 1087∶1447 | Sim | B | P1 | substituir `painel-heroi` |
| A08 | `frame-skills.png` | `.unit--skills` | ~388×310 | **2806×2242** ou 1403×1121 mín. | 1403∶1121 | Sim | B | P1 | substituir `painel-skills` |
| A09 | `frame-alvo.png` | `.unit--target` | ~340×310 | **2626×2396** ou 1313×1198 mín. | 1313∶1198 | Sim | B | P1 | substituir `painel-alvo` |
| A10 | `frame-arena.png` | `.stage__viewport` / `.arena-stone-frame` | fluido ~1262×498 @1080p | nine-slice 800×800 | fluido | Sim | C | P1 | novo |
| A11 | `ornament-divider-gold.png` | seções rail/bag/modais | ~280×12 | 560×24 | ~23∶1 | Sim | D | P1 | novo |
| A12 | `ornament-corner-gold.png` | cantos extras / fallback | 28×28 @1× | 56×56 | 1∶1 | Sim | D | P1 | novo |
| A13 | `frame-tooltip.png` | `.item-tip` | 230×auto | nine-slice 460×320 | ~230∶flex | Sim | C | P1 | novo |
| A14 | `frame-toast.png` | `#toast` | ~auto×~48 | 640×96 | ~20∶3 | Sim | B/C | P1 | novo |
| B01 | `frame-btn-primary.png` | `.btn--gold`, stage CTAs, confirm OK, buy, ritual | pad ~0.45–0.9rem; altura ~36–40 | nine-slice 320×80 | horizontal | Sim | C | P2 | novo |
| B02 | `frame-btn-secondary.png` | `.btn`, `.btn--arena`, ghost | idem | 320×80 | horizontal | Sim | C | P2 | novo |
| B03 | `frame-btn-danger.png` | confirm danger, arena leave, sell | idem | 320×80 | horizontal | Sim | C | P2 | novo |
| B04 | `frame-btn-rail.png` | `.rail-btn` | full width col; ~40h | 560×80 | horizontal | Sim | C | P2 | novo |
| B05 | `frame-btn-mini.png` | `.mini-btn*` | ~altura 36; 3-col grid | 240×72 | horizontal | Sim | C | P2 | novo |
| B06 | `frame-tab.png` | `.tab` rail/filter/pages | pad 0.4rem; radius 8 | 200×64 | horizontal | Sim | C | P2 | novo |
| B07 | `frame-tab-active.png` | `.tab.active` | idem | 200×64 | horizontal | Sim | C | P2 | novo |
| B08 | `frame-btn-toggle-off.png` | `.btn--toggle` | ~36h | 280×72 | horizontal | Sim | B | P2 | novo |
| B09 | `frame-btn-toggle-on.png` | `.btn--toggle.is-on` | idem | 280×72 | horizontal | Sim | B | P2 | novo |
| B10 | `frame-btn-tiny.png` | `.attr-plus*` (opcional) | min 2rem | 80×56 | ~1.4∶1 | Sim | B | P2 | novo |
| C01 | `frame-slot-equip-empty.png` | `.slot` vazio 68×68 circle | 68×68 | **136×136** | 1∶1 | Sim | B | P3 | novo |
| C02 | `frame-slot-equip-filled.png` | `.slot.filled` base | 68×68 | 136×136 | 1∶1 | Sim | B | P3 | novo |
| C03 | `frame-slot-inv-empty.png` | `.inv-cell:not(.item)` | ~52–68² | **136×136** | 1∶1 | Sim | B | P3 | novo |
| C04 | `frame-slot-inv-filled.png` | `.inv-cell.item` base | idem | 136×136 | 1∶1 | Sim | B | P3 | novo |
| C05 | `frame-slot-rarity-overlay.png` | filete genérico (colorido via CSS mask/`--rc`) | 68×68 | 136×136 | 1∶1 | Sim | B+E | P3 | novo |
| C06 | `ornament-refine-ring.png` | sob `.refine-ring` CSS | 68×68 | 136×136 | 1∶1 | Sim | D | P3 | novo |
| C07 | `frame-menu.png` | `.item-menu` | min-w 150 | nine-slice 300×200 | vertical | Sim | C | P3 | novo |
| C08 | `frame-portrait-ring.png` | `.hero-rail__portrait` 78×78 | 78×78 | **156×156** | 1∶1 | Sim | B | P3 | novo |
| C09 | `frame-skill-node.png` | `.skill-node` 56×56 | 56×56 | **112×112** | 1∶1 | Sim | B | P3 | novo |
| D01 | `frame-slot-skill.png` | `.combat-skill-slot` icon 48×48 | 48×48 | **96×96** | 1∶1 | Sim | B | P4 | novo |
| D02 | `frame-meter-track.png` | track HP/MP/XP/enemy | h 22; w fluido | 400×44 | ~9∶1 | Parcial | B+E | P4 | novo |
| D03 | `frame-meter-track-compact.png` | `.meter--wave` h 16 | h 16 | 400×32 | ~12∶1 | Parcial | B+E | P4 | novo |
| D04 | `ornament-meter-cap-l.png` | caps laterais meter | ~10×22 | 20×44 | — | Sim | D | P4 | novo |
| D05 | `ornament-meter-cap-r.png` | espelho de D04 | ~10×22 | 20×44 | — | Sim | D | P4 | novo |
| D06 | `frame-chip.png` | `.farm-buff-chip`, badges | auto | 320×56 | horizontal | Sim | B | P4 | novo |
| D07 | `frame-toast-reward.png` | drops / level (opcional) | toast | 640×96 | ~20∶3 | Sim | B | P4 | novo |
| D08 | `frame-toast-danger.png` | erros / derrota | toast | 640×96 | ~20∶3 | Sim | B | P4 | novo |
| D09 | `bg-unit-heroi.jpg` | miolo opcional herói | interior safe | 1087×1447 | 1087∶1447 | Não | A | P4 | novo |
| D10 | `bg-unit-alvo.jpg` | miolo opcional alvo | interior safe | 1313×1198 | 1313∶1198 | Não | A | P4 | novo |
| E01 | `frame-divindade-ornament.png` | overlay opcional em MD | cabe em 420 panel | 840×200 topo | faixa | Sim | D | P5 | novo |
| E02 | `frame-offline-header.png` | header offline report | 440×72 | 880×144 | ~6∶1 | Sim | D | P5 | novo |
| E03 | `frame-lobby-card.png` | `.char-row` / `.create-box` | ~460 max create | nine-slice 920×600 | fluido | Sim | C | P5 | novo |
| E04 | `frame-pets-card.png` | `.pets-card` | card estreito | 560×200 | ~2.8∶1 | Sim | B | P5 | novo |
| E05 | `frame-offer-card.png` | merchant/arena offers | list row | 880×160 | ~5.5∶1 | Sim | B | P5 | novo |
| E06 | `bg-zona.jpg` | miolo placa zona (opcional) | sob frame-zona | 2172×724 | 2172∶724 | Não | A | P5 | novo |
| E07 | `frame-drawer-edge.png` | aba drawer mobile | pill tab | 240×64 | ~3.75∶1 | Sim | B | P5 | novo |
| E08 | `icon-gold-stack.png` | alias/replace | 28×28 display | **manter 512×512** | 1∶1 | Sim | — | P5 | **manter** `gold-coins-stack.png` |
| E09 | `frame-log-header.png` | `.card--log` toggle | 310×44 colapsado | 620×88 | ~7∶1 | Sim | B | P5 | novo |

---

## Mapa de reutilização

| Asset | Telas / componentes consumidores |
|-------|----------------------------------|
| `frame-modal-sm` | confirm (sell, lock, ritual, arena leave, buy…) |
| `frame-modal-md` | mercador, skills, divindade, engagement (se reativado) |
| `frame-modal-lg` | arena, offline-report, hunt-perf |
| `frame-panel-side` | personagem, mochila, drawers L/R |
| `frame-tooltip` | item-tip; base para area/audio pop |
| `frame-menu` | item-menu; pode estilizar audio list |
| `frame-btn-primary` | start, buy, ritual, confirm OK, skill buy, engagement claim |
| `frame-btn-danger` | confirm danger, arena leave, sell mode accent |
| `frame-btn-secondary` | cancel, arena, stop, ghost |
| `frame-tab` + active | 3 rail + 4 filter + 2 pages |
| `frame-slot-*` | 9 equip + N inv cells |
| `frame-toast*` | todas as mensagens `toast()` |

**Não criar:** 1 moldura por modal; 5 raridades × 2 slots se overlay CSS bastar; textos de botão; telas ausentes (ranking UI, oficina, cidade, conquistas).

---

## Assets atuais — ação

| Arquivo atual | Ação HUD 3.0 |
|---------------|--------------|
| `painel-heroi.png` (RGB) | Substituir por `frame-heroi.png` RGBA, mesma proporção 1087∶1447 |
| `painel-skills.png` | → `frame-skills.png` RGBA |
| `painel-alvo.png` | → `frame-alvo.png` RGBA |
| `placa-zona.png` | → `frame-zona.png` RGBA |
| `painel-arcano-gotico.png` + cover | → `frame-panel-side` nine-slice (+ `bg-panel-side` opcional) |
| `gold-coins-stack.png` | Manter |
| `portrait-*.jpg` | Manter (conteúdo, não moldura) |
| `slot-*.svg` / `ui-*.svg` / `skill-*.svg` | Manter como ícones |
| Ranking `fundo-*`, podium, laurel, crown, hall | Arquivar / não integrar até existir UI |

---

## O que permanece CSS (não catalogar como arte)

- `.meter__fill` e larguras dinâmicas  
- `.meter__delta`, float-text, hurt/heal  
- Rarity glow (`item-glow`, `--rc`)  
- Refine border animation (`--refine-angle`)  
- `.toggle-switch` checked state  
- Tipografia Cinzel / Source Sans 3  
- Backdrops blur `rgba(3,11,20,0.72)`  
- Disabled opacity  

---

## Priorização por etapa

### Etapa 1 — Fundamentais (14 assets)

A01–A14. Desbloqueia chrome de play: combate, laterais, modais, tip, toast, divisórias.  
**Reuso:** 3 modais → 8 overlays; 1 side panel → 2 colunas + drawers.

### Etapa 2 — Interatividade (10)

B01–B10. Botões, abas, toggles.  
**Reuso:** primary cobre CTAs de todos os modais; tab cobre 9 tabs HTML.

### Etapa 3 — Inventário / equipamentos (9)

C01–C09. Slots, tip menu, portrait, skill nodes.  
**Reuso:** empty/filled + 1 rarity overlay em vez de 10 variantes.

### Etapa 4 — Combate / progressão (10)

D01–D10. Skills combate, meters ornament, chips, toast variants, bgs unit.  
**Não** rasterizar fills.

### Etapa 5 — Especiais (9)

E01–E09. Divindade ornament, offline header, lobby, pets, offers, zona bg, drawer, log.  
Só após kit base estável.

---

## Checklist de exportação

1. PNG ou WebP com alfa verdadeiro (não matte preto/branco).  
2. Simetria L/R verificada (flip test).  
3. Safe area respeitando paddings % dos units (ver guia).  
4. Nine-slice: cantos ≥ 24px @1× (48 @2×); bordas stretch sem ornamento complexo.  
5. Nome de arquivo = coluna Asset.  
6. Não incluir texto UI.  
7. Proporção do trio/zona = CSS atual (não inventar ratio sem sync de layout).

---

*Catálogo fechado em 52 IDs. Ajustes só com nova evidência de UI no código.*
