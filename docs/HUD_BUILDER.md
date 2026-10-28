# HUD Builder — Fase 1 + 2

Editor visual No-Code da HUD do Jogo IDLE no Admin Studio.

## Arquitetura

| Peça | Caminho |
|------|---------|
| Registry | `idle/lib/jogo-idle/hud-registry.ts` |
| Schema / validação | `idle/lib/jogo-idle/hud-layout.ts` |
| Persistência | `catalog.overrides.__hud` (`draft`, `published`, `history`) |
| Runtime (jogador) | `idle/public/jogo-idle/hud-layout-runtime.js` |
| Bridge (editor) | `idle/public/jogo-idle/hud-builder-bridge.js` (`?hudBuilder=1`) |
| Admin UI | `idle/admin-ui/src/admin/admin-hud-builder.tsx` |

O canvas é a HUD real (`play.html`) em iframe. **Não** há React dentro de `play.html`.

Interação mouse (drag/resize/snap) vive **no bridge** do iframe. O Admin recebe gestos consolidados e mantém undo/rascunho.

## Schema (`HudLayoutDocument`)

```json
{
  "schemaVersion": 1,
  "layoutId": "combat-default",
  "name": "HUD Principal",
  "revision": 0,
  "status": "draft",
  "breakpoints": { "desktop": 1024, "tablet": 768, "mobile": 0 },
  "components": {
    "card-bag": {
      "base": {
        "width": "380px",
        "order": "0",
        "position": "absolute",
        "left": "120px",
        "top": "40px"
      },
      "overrides": { "mobile": { "width": "100%" } }
    }
  }
}
```

### Props allowlisted

Dimensões / box: `width`, `height`, `min/max*`, `margin*`, `padding*`, `gap`  
Aparência (Fase 1+): `fontSize`, `fontWeight`, `color`, `opacity`, `borderRadius`, `gridTemplateColumns`, `aspectRatio`, `visible`  
**Fase 2:** `order`, `position` (`relative`|`absolute`), `left`, `top`, `right`, `bottom`, `zIndex` (0–100), `flexGrow`, `alignSelf`

Validação server-side (unidades, ranges; sem CSS livre / `eval`).

Props de layout dimensionais são aplicadas com `!important` no runtime para vencer `theme-ref.css`. Colunas `stage-left|right` também atualizam `--side-panel-w`; altura de units atualiza `--hud-h`.

## Componentes (`data-hud-id`)

`stage-left`, `card-rail`, `stage-center`, `zone-plaque`, `stage-viewport`, `combat-actions`, `unit-hero`, `unit-skills`, `unit-target`, `stage-right`, `card-bag`, `inv-grid`, `card-log`.

Cada entrada no registry declara `dragModes` (`reorder`|`free`|`resize`) e `minSize`. Colunas = só resize (sem free-drag).

## Modos de posicionamento (Fase 2)

| Modo | Comportamento |
|------|----------------|
| **Organizado** (default) | Drag reordena irmãos via `order` (flex/grid). Resize pelas 8 alças. |
| **Livre** | Drag pinna `position:absolute` + `left`/`top` relativo ao `.stage`. Botão **Voltar ao fluxo** remove absolute. |

Não há reparent entre colunas nesta fase. Não converte a HUD inteira para absolute ao ativar Livre.

## Gestos

- Seleção → contorno + 8 alças
- Resize → live no iframe; `transform-end` no mouseup (1 entrada undo)
- Drag organizado → `orders` no drop
- Drag livre → `left`/`top` (+ width/height pin)
- Snap → grade 4/8/16 + bordas/centros de outros `[data-hud-id]`
- ESC → cancela gesto e restaura snapshot
- Setas → nudge 1px (Shift 8px); undo consolidado no keyup
- ⌘/Ctrl+Z / Shift+Z → undo/redo · ⌘/Ctrl+S → salvar rascunho

## APIs

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/jogo-idle/hud-layout` | Público (layout **publicado**) |
| GET | `/api/jogo-idle/admin/hud-layout` | Admin |
| PUT | `/api/jogo-idle/admin/hud-layout/draft` | Admin |
| POST | `/api/jogo-idle/admin/hud-layout/publish` | Admin (UI até Fase 5) |
| POST | `/api/jogo-idle/admin/hud-layout/restore` | Admin |
| GET | `/api/jogo-idle/admin/hud-layout/history` | Admin |

## Protocolo `postMessage` (`v: 1`, origin travado)

| Direção | `type` |
|---------|--------|
| iframe → admin | `hud-builder-ready`, `hud-builder-selection` |
| iframe → admin | `hud-builder-transform` (preview), `hud-builder-transform-end`, `hud-builder-transform-cancel` |
| admin → iframe | `hud-builder-select`, `hud-builder-patch`, `hud-builder-set-layout` |
| admin → iframe | `hud-builder-mode`, `hud-builder-viewport` |
| admin → iframe | `hud-builder-layout-mode`, `hud-builder-snap` |

## Critérios

**Fase 1:** abrir editor → ver HUD → selecionar → patch width → salvar rascunho.

**Fase 2:**

1. Selecionar Mochila → 8 alças  
2. Resize pela borda → undo reverte  
3. Organizado: trocar ordem Herói ↔ Skills ↔ Inimigo  
4. Livre: arrastar Cabeçalho; X/Y no inspector  
5. Snap atrai bordas  
6. ESC cancela gesto  
7. Salvar persiste `order` / `left`/`top`/`width`/`height`

Publicação para jogadores: Fase 5.
