# IDLE — assets free recomendados (Onda 4)

Política: **CC0 / Free only** (sem EXTRA/SOURCE KayKit pagos). Já no repo: Adventurers, Skeletons, Dungeon, Nature, City, Space, Halloween, Fantasy Weapons, RPG Tools.

Biblioteca completa (glTF/GLB) vinda de `JogoIDLE`: `assets/kaykit/` (`character-animations`, `dungeon`, `fantasy-weapons`, `forest`, `halloween`, `medieval-hexagon`, `mixed-bag`, `skeletons`).

**v2.0:** `kaykit-props.js` prioriza `kaykit/dungeon` e `kaykit/halloween` (`.gltf`) com fallback em `props/`. Personagens/mobs seguem em `models/` (Adventurers + Skeletons). `character-animations/Rig_*` + mannequins estão no repo para retarget de clips extras (não ligados ao mixer do herói nesta onda). UI 2.0: `theme-v2.css` + `idle-theme-v2.css`.

## Prioridade de download (manual)

1. **Kenney Particle Pack** (CC0) → `assets/particles/` — billboards skill/hit  
2. **Kenney Game Icons** ou **Fantasy UI** (CC0) → `assets/ui/` — ícones da barra  
3. **Kenney Impact Sounds / RPG Audio** (CC0) → `assets/sfx/` + entradas em `sfx/manifest.json`  
4. **KayKit Goblins** (Free) → personagens/mobs mid  
5. **Quaternius Fantasy / Ultimate Monsters** (CC0) → silhueta Guardião da Divindade  

Enquanto os packs não forem baixados, VFX/SFX de skills usam **WebAudio synth** (`audio.js`) + sparks Three.js (`scene3d.js`).
