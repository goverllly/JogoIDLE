# 03 — Arquitetura

## Camadas visuais

1. **Birth appearance** (`character.appearance`) — imutável após create.  
2. **Equipment gameplay** — atributos + meshes de arma/offhand.  
3. **Cosmetics unlocks** (`character.cosmetics`) — inventário de IDs; **não** reescreve birth look.

```
resolveVisualLook(character) → normalizeAppearance(character.appearance)
  // cosméticos NÃO entram no tint permanente
applyGear(equipment) → meshes de arma (independente)
```

## Dados

```ts
appearance: {
  schemaVersion: 1,
  helmet: boolean,
  cape: boolean,
  skin: SkinId,
  armor: ArmorId,
  metal: MetalId,
  capeColor: CapeId,
  scale: number, // 0.9–1.12 visual only
  stance: StanceId, // pose de apresentação / idle
}
appearanceLocked: true
```

## Fluxo create

`POST /api/jogo-idle/characters` → `normalizeAppearance` → `appearanceLocked=true` → persist state blob.

## Bloqueio

- `updateAppearance` → HTTP 403 (Prisma service + Express local).  
- `setAppearance` não deve ser chamado por rotas de jogador.  
- `setEquippedCosmetics` só grava `cosmetics.*`, nunca `appearance.*`.

## Three.js

- Clone de materiais por instância (`material.clone()` + `baseColor`).  
- Cache de GLB + `SkeletonUtils.clone`.  
- Escala só em `model.scale` (sem hitbox/atributos).