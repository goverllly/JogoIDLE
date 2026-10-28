# IDLE — assets free recomendados (Onda 4+)

Política: **CC0 / Free only** (sem EXTRA/SOURCE KayKit pagos). Já no repo: Adventurers, Skeletons, Dungeon, Nature, City, Space, Halloween, Fantasy Weapons, RPG Tools, **Forest Nature Pack**.

Biblioteca completa (glTF/GLB) vinda de `JogoIDLE`: `assets/kaykit/` (`character-animations`, `dungeon`, `fantasy-weapons`, `forest`, `halloween`, `medieval-hexagon`, `mixed-bag`, `skeletons`).

**v2.1 (capítulos temáticos):** `kaykit-props.js` prioriza `kaykit/dungeon`, `kaykit/halloween` e agora **`kaykit/forest`** (árvores/arbustos/rochas Color1) no kind `forest`/`garden`/`swamp`, com fallback em `props/nature`. Personagens/mobs seguem em `models/`.

## Status dos packs de cenário

| Pack | Licença | Destino | Status |
|------|---------|---------|--------|
| KayKit Forest Nature (FREE) | CC0 | `kaykit/forest/` | **Wired** em `kaykit-props` (subset curado) |
| KayKit Dungeon / Halloween | CC0 | `kaykit/dungeon`, `kaykit/halloween` | Em uso |
| Kenney Graveyard Kit (~90) | CC0 | `kenney/graveyard/` | **Wired** (`kenneyGraveyard`) — Cap II graveyard/tomb/mist |
| Kenney Nature Kit (~330) | CC0 | `kenney/nature/` | **Wired** subset (`kenneyNature`, escala ~0.18) — forest/swamp/volcano |
| Quaternius Ultimate Space Kit | CC0 | `quaternius/space/` | **Wired** (`quaterniusSpace`) — volcano Tree Lava + Cap IV |
| Kenney Space Kit | CC0 | `kenney/space/` | Opcional se `props/space` bastar |
| Kenney Particle Pack | CC0 | `particles/` | Ainda na fila (embers/rise billboards) |

Packs Kenney/Quaternius no disco e registrados em `kaykit-props.js` (lazy por kind).

## Próximos passos

1. **Kenney Particle Pack** → `assets/particles/`
2. **KayKit Goblins** (Free) → personagens/mobs mid  
3. **Quaternius Fantasy / Ultimate Monsters** (CC0) → silhueta Guardião da Divindade  

Enquanto os packs de VFX/SFX não forem baixados, skills usam **WebAudio synth** (`audio.js`) + sparks Three.js (`scene3d.js`).

## Lacunas conhecidas (sem inventar paths)

- Magma líquido / singularidade 3D dedicada: fallback = tint + partículas `embers`/`rise`.
- `medieval-hexagon`: no repo, **fora** desta onda temática.
