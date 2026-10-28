# 01 — Auditoria de assets 3D (heróis)

**Status:** auditado · Studio 2.0  
**Data:** 2026-10-27

## Modelos de herói em uso

| Classe | Arquivo | Path público |
|--------|---------|--------------|
| GUERREIRO | Knight.glb | `/jogo-idle/assets/models/Knight.glb` |
| BARBARO | Barbarian.glb | `/jogo-idle/assets/models/Barbarian.glb` |
| MAGO | Mage.glb | `/jogo-idle/assets/models/Mage.glb` |
| ARQUEIRO | Rogue_Hooded.glb | `/jogo-idle/assets/models/Rogue_Hooded.glb` |

Fonte: KayKit Adventurers Character Pack 1.0 (CC0) — `assets/models/LICENSE-KayKit-Adventurers.txt`.

Não há variantes alternativas no repositório (sem Rogue sem capuz, sem corpos extras).

## Hierarquia relevante (meshes)

| Classe | Cabeça | Corpo | Elmo/chapéu | Capa |
|--------|--------|-------|-------------|------|
| GUERREIRO | Knight_Head | Body, ArmL/R, LegL/R | Knight_Helmet | Knight_Cape |
| BARBARO | Barbarian_Head | idem | Barbarian_Hat | Barbarian_Cape |
| MAGO | Mage_Head | idem | Mage_Hat | Mage_Cape |
| ARQUEIRO | Rogue_Head_Hooded | idem | — | Rogue_Cape |

Cada herói usa **um material atlas** (`*_texture`). Morph targets: **0**.

## Inventário de personalização suportada

| Asset / parte | Tipo | Classe | Personalizável | Método | Limitação |
|---------------|------|--------|----------------|--------|-----------|
| *_Head | mesh | todas | sim | tint `skin` | não há olhos/cabelo separados |
| Body/Arms/Legs | mesh | todas | sim | tint `armor` | um tom para o corpo inteiro |
| Helmet/Hat | mesh | G/B/M | sim | visible + tint `metal` | Arqueiro sem elmo |
| Cape | mesh | todas | sim | visible + tint `capeColor` | um modelo por classe |
| Gear (armas) | mesh | todas | gameplay | `applyGear` | não é aparência de nascimento |
| Hair / Beard / Face | — | — | **não** | — | inexistentes no GLB |
| Morph / body type | — | — | **não** | — | 0 morphs |
| Custom armor GLBs | ícone 3D | item | ícone UI | Admin Studio | não acoplados ao herói em combate |

## Renderização

- Preview: `preview.js` (`createActor` clona materiais por instância)
- Combate: `scene3d.js` (mesmo `applyLook`)
- Cache GLB + `SkeletonUtils.clone`

## KayKit props / animations

Pastas `assets/kaykit/` e `character-animations/` **não** estão ligadas ao herói jogável.