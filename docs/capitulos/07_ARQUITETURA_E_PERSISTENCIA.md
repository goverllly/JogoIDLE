# 07 — Arquitetura e persistência

**Status:** especificação de modelo. **Não migrar saves nesta etapa.**

---

## Regra atual

| Camada | Detalhe |
|--------|---------|
| Row | `CharacterRow`: level, experience, gold, `state` JSON |
| Blob | attrs, inventory, equipment, farm*, ascension, journey, career, ascensionLegacy, cosmetics… |
| Ascensão | `null` \| `'CELESTIAL'`; cap via `levelCapFor` |
| Season | `softResetCharacterForSeason` + `journeyOnSeasonRollover` |
| Farm gates | minLevel + requiresAscension + mortalOnly |

Arquivos: `character.ts`, `store.ts`, `local-service.ts`, `combat.ts`, `journey.ts`, `ranking.ts`.

## Proposta — blob `chapters` versionado

```ts
// Pseudotipo — proposta
chapters: {
  schemaVersion: 1,
  currentChapterId: 'I' | 'II' | 'III' | 'IV',
  // Desbloqueios DA TEMPORADA ATUAL (competitivo)
  season: {
    seasonKey: string,
    highestUnlockedChapter: 'I' | 'II' | 'III' | 'IV',
    classification: 'MORTAL' | 'CELESTIAL' | 'DIVINO' | 'SEMIDEUS',
    progress: Record<ChapterId, ChapterBucket>,
    completedQuestIds: string[],
    completedRitualIds: string[],
  },
  // Histórico PERMANENTE (não resetado no soft reset competitivo)
  legacy: {
    maxClassificationEver: Classification,
    chaptersCompletedEver: ChapterId[],
    lifetimeLevelsGained: number,
    permanentBonuses: PermanentBonus[],
    cosmeticsGranted: string[],
  },
}

ChapterBucket: {
  level: number,       // 1..500
  xp: number,
  status: 'locked' | 'available' | 'in_progress' | 'completed',
  unlockedZoneIds: string[],
  bossClears: Record<string, number>,
  // quests/rituais específicos do capítulo também podem viver aqui
}
```

### Espelhos legados (durante dual-run)

Enquanto `chaptersV1` ativo:

- `character.level` / `experience` = espelho do bucket `currentChapterId`.
- `character.ascension` = mapeamento: Mortal→null; Celestial+ → `'CELESTIAL'` **ou** novo enum estendido (`DIVINO`/`SEMIDEUS`) em fase posterior.
- Preferência: estender `ascension` / `classification` cedo para ranking correto.

### Soft reset sazonal (proposta)

**Resetar:** `chapters.season.*`, level/xp espelho, gold, inventory competitivo, farm, career sazonal, ascensão ativa da temporada.

**Preservar:** `chapters.legacy.*`, `journey.lifetime` (+ seasons arquivadas), recordes, conquistas, cosméticos, `ascensionLegacy` histórico.

**Acesso:** nova temporada começa Cap.I locked progress competitivo; `legacy.maxClassificationEver` **não** libera Cap.IV.

### Troca de capítulo (`enterChapter`)

1. Auth + load character.  
2. Se farm ativo → `processFarm` catch-up + stop + persist.  
3. Validar `chapterId <= season.highestUnlockedChapter`.  
4. Persistir bucket atual (level/xp já no season.progress).  
5. `currentChapterId = target`; espelhar level/xp; limpar farmZone inválida.  
6. Resposta pública com zonas do capítulo.

### XP isolation

`applyRewards` só incrementa `season.progress[current].xp/level`. Visita a Cap. antigo: XP daquele bucket apenas; gold/mats ok; sem transfer cross-chapter.

### API (proposta)

| Método | Path | Função |
|--------|------|--------|
| GET | `/me` (estendido) | inclui `chapters` public |
| GET | `/chapters` | 4 cards status |
| POST | `/chapters/enter` | troca |
| POST | `/chapters/ritual/:id` | rituais |
| POST | `/quests/:id/progress` | turn-in |

Validação **sempre** no servidor.

### Admin / catálogo

Estender `AdminZone` / items: `chapterId`, `classificationRequired`. Não duplicar catálogos.

---

## Alterações necessárias

- Migração read/write dual (doc 09).
- Estender ranking comparator.
- Farm start: checar capítulo da zona == current + unlock.
- publicCharacter: expor classificação e progresso resumido.

## Dependências

Journey/fame/season existentes; feature flag.

## Impactos

Até flag on: zero. Após: saves ganham blob; row level espelha capítulo atual.

## Critérios de aceite

- Schema versionado; dual-read.
- Troca não perde bucket II ao visitar I.
- Soft reset limpa season, mantém legacy.
- Unlock UI sem server falha em teste.

## Migração / rollback

Ver doc 09. Flag off: ignorar `chapters`, usar level/ascension atuais.
