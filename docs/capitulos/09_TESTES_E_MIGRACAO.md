# 09 — Testes, migração e rollback

**Status:** especificação. **Não executar migração de saves nesta etapa.**

---

## Regra atual

- Testes de journey/ascension em `game/__tests__/`.
- Soft reset e ascensão documentados em character.ts.
- Celestial pode estar em L1–700; Mortal L1–500.
- Sem blob `chapters`.

## Proposta — migração

### Princípios

1. **Não alterar automaticamente** level/ascension/gold/inv na row até **ativação definitiva** (`chaptersV1=on` + job de cutover).
2. Antes do cutover: dual-read — se não há `chapters`, comportar-se como hoje.
3. Snapshot pré-migração para rollback.
4. Celestial **L>500**: **não reduzir sem compensação**.

### Mapeamento inicial (read-model, dry-run)

| Estado legado | `season.progress` | `legacy` | Observação |
|---------------|-------------------|----------|------------|
| Mortal L | Cap.I level=L, unlock I | maxClass=MORTAL | |
| Celestial L≤500 | Cap.I completed; Cap.II level=L, unlock II | maxClass=CELESTIAL | |
| Celestial L∈[501,700] | Cap.I completed; Cap.II level=**500**, status **completed** (campanha Cap.II); unlock II; elegível a **iniciar** quests Cap.III **somente se** demais requisitos (relíquia etc.) — **não** auto-unlock III | maxClass=CELESTIAL; `legacyCelestialOverflow = L-500` | Ver compensação |
| Sem Divino/Semideus | III/IV locked | | |

Espelho: até cutover, `character.level` permanece o valor original (ex. 650). Só após cutover o espelho passa a refletir o bucket (500 no Cap.II) **e** a compensação é aplicada.

### Compensação overflow Celestial (L>500) — proposta canônica

Para `overflow = legacyLevel - 500` (1…200):

| Compensação | Fórmula proposta | Justificativa |
|-------------|------------------|---------------|
| Bônus permanente ATK/HP | +0,15% ATK e +0,10% HP por nível overflow (cap +30% / +20%) | Preserva poder investido sem manter L700 no Cap.II |
| Pontos unspent | `floor(overflow / 10)` pontos (máx 20) | Paridade parcial com progressão de attrs |
| Título / cosmético | `legacy_celestial_apex` se overflow≥100 | Reconhecimento Galeria |
| Mats Cap.II | grant pity bundle funerário (não Suco) | Acelera ritual Divino sem skip |

**Não fazer:** apagar attrs; confiscar gear; auto-promover a Divino; silenciar overflow.

Documentar no job: before/after JSON por characterId.

### Atributos e equipamentos na migração

- Attrs: **intactos** + unspent da compensação.
- Gear: **intacto**; `gearChapter` default Cap.I ou inferido por `requiresAscension`/tier.
- Classificação ativa temporada: Celestial se já ascendido; buckets conforme tabela.
- Suco já consumido: não exigir Cap.I ritual de novo; Cap.I marcado completed.

### Soft reset pós-Quatro Eras

Testar: Semideus sazonal → nova temporada Cap.I competitivo; `legacy.maxClassificationEver=SEMIDEUS`; cosmético permanece; ranking season recomeça.

---

## Rollback

| Camada | Ação |
|-------|------|
| Feature flag `chaptersV1=off` | Motor ignora blob; UI Crônicas oculta |
| Restore snapshot | Recarregar `state` pré-cutover do backup |
| Catálogo | zones novas desativadas se flag off |
| Não deletar | `chapters` blob pode permanecer órfão (inofensivo) |

Critério: personagem volta a farm/ascend como antes do cutover.

---

## Matriz de testes automatizados (planejada)

| ID | Caso | Esperado |
|----|------|----------|
| T01 | Cap. bloqueado | enter rejeitado |
| T02 | Unlock válido pós-ritual | highestUnlocked++ ; Cap+1 @ L1 |
| T03 | Ritual incompleto | erro com faltantes |
| T04 | Ritual completo | consome item único; não reexecuta |
| T05 | Consumo único Suco | inventário −1; segunda tentativa falha |
| T06 | Retorno Cap.I com Cap.II L230 | I intacto; II permanece 230 |
| T07 | Persistência independente | dois buckets isolados |
| T08 | Troca durante caça | farm stop; XP creditado; sem duplo tick |
| T09 | Offline catch-up | recompensas no capítulo atual |
| T10 | Reward única | segunda coleta negada |
| T11 | Soft reset | season limpa; legacy intacto |
| T12 | Nova temporada | Caps locked sazonais; histórico ok |
| T13 | Ranking classificações | Semideus L1 &gt; Divino L500 &gt; Cel L500 &gt; Mortal L500 |
| T14 | Personagem antigo Mortal | dry-run map Cap.I |
| T15 | Celestial L650 | overflow compensado; level bucket 500; sem auto-Divino |
| T16 | Big numbers | ops estáveis até 1e15; helper magnitude se &gt; safe |
| T17 | XP/attrs integridade | attrs não zerados no ritual |
| T18 | Catálogo legado | zona sem chapterId tratada como Cap.I ou rejeitada com log |
| T19 | UI spoof unlock | API nega |
| T20 | Rollback flag | comportamento pré-Quatro Eras |

---

## Alterações necessárias (futuras)

- Job dry-run + cutover + snapshot.
- Suite de testes acima.
- Feature flag config.

## Dependências

Docs 07/05/06; backups de `save.json` / DB.

## Impactos nos jogadores

Comunicação obrigatória: Celestiais 501–700 recebem compensação explícita; não “perdem” poder sem aviso.

## Critérios de aceite

- Dry-run reportável; zero escrita até approve cutover.
- T15 passa com compensação.
- Rollback testado em staging.

## Estratégia resumida

1. Dual-write opcional (escreve `chapters` sem usar).  
2. Dry-run compensação.  
3. Approve → cutover + flag on.  
4. Monitor.  
5. Rollback = flag off (+ restore se corrupção).
