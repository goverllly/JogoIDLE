# 09 — Roadmap atual (síntese do repositório)

**Não inventa roadmap novo.** Consolida documentos e TODOs/fases já presentes no código.

## 1. Assets — `idle/public/jogo-idle/assets/ASSETS-ROADMAP.md`

Política: CC0 / Free only.

| Pack | Status no doc |
|------|----------------|
| KayKit Forest / Dungeon / Halloween | Wired |
| Kenney Graveyard / Nature | Wired (`kenneyGraveyard`, `kenneyNature`) |
| Quaternius Space | Wired (`quaterniusSpace`) |
| Kenney Particle Pack | **Na fila** → `assets/particles/` |
| KayKit Goblins (Free) | Próximo — mid mobs |
| Quaternius Fantasy / Ultimate Monsters | Próximo — silhueta Guardião |

Lacunas citadas: magma/singularidade 3D dedicada (fallback tint + embers); `medieval-hexagon` fora da onda temática.

Enquanto VFX/SFX packs faltam: WebAudio (`audio.js`) + sparks Three.

## 2. Capítulos — `docs/capitulos/10_ROADMAP_IMPLEMENTACAO.md`

Plano pós-documentação com fases F1–F8 (modelagem → UI Crônicas → enter/gates → quests → 20 regiões → balance → temporada/fama → QA).

Aviso no próprio doc: **“Não iniciar código sem aprovação das decisões abertas.”**  
Regra: Quatro Eras **inexistente** no motor; Progressão 3.0 só em `docs/balanceamento/`.

Cruzamento com código atual (auditoria): APIs `/chapters` e `chapters.ts` **existem** — o roadmap de docs pode estar parcialmente ultrapassado ou descrevendo expansão além do motor mínimo. Tratar fases F5–F8 como **Planejado** até revalidação item a item.

## 3. Fases do Admin Studio (UI)

Síntese das strings “Fase N” no admin (não confundir com F1–F8 de capítulos):

| Fase UI | Temas |
|---------|--------|
| 1 | Zonas IDs fixos; admins allowlist |
| 2 | HUD builder componentes; loot/monstros tables |
| 3 | Criar zonas; snap mapa |
| 4 | Backup; publish mapa; versionamento |
| 5 | Publicar HUD |

## 4. Balanceamento — `docs/balanceamento/` + scripts

- Documentos históricos/propostas (ex. economia, simulações).
- Tooling vivo: `idle/scripts/balance-audit/` + `npm run audit:balance`.
- Fonte de verdade do motor: `game/balance.ts`, `items.ts` (overrides admin possíveis).

## 5. Remoções conscientes do standalone (`idle/README.md`)

Não são “dívidas acidentais”:

- Sem ModuleAccessGate / auth plataforma
- Sem missões de engajamento (claim 410)
- Sem Prisma da plataforma

## 6. TODOs no código de jogo

Busca por `TODO`/`FIXME` em `idle/lib` e `idle/src` de domínio: poucos; maioria de TODOs em vendor Three. Fases de produto estão nas **strings de UI admin** e nos **docs**, não em uma lista TODO central única.
