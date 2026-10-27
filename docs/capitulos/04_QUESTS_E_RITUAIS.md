# 04 — Quests e rituais de transformação

**Status:** especificação. **Não implementar.**

---

## Regra atual

- Único ritual: `ascendToCelestial` — L500 Mortal + 10M ouro + `consumable_suco_celestial`.
- Suco: drop em `prova_divina` (`SUCO_CELESTIAL_DROP_CHANCE` 0.007) + pity implícito fraco.
- Sem quests narrativas estruturadas server-side com IDs de campanha.
- UI Divindade / `divindade.js`.

## Proposta

Rituais **obrigatórios** para desbloquear o próximo capítulo. Objetivos **verificáveis no servidor**. Itens obrigatórios com **progresso garantido / pity** (não só RNG).

### Naming UX

| Código legado | UX Quatro Eras |
|---------------|----------------|
| `consumable_suco_celestial` | **Suco Divino** (mesma entidade) |
| Ritual Celestial | 1ª transformação (Cap.I→II) |

### Cap. I → II (Mortal → Celestial)

| Requisito | Verificação |
|-----------|-------------|
| Mortal nível 500 no Cap.I | `chapterProgress.I.level >= 500` |
| Missão **A Seiva dos Deuses** concluída | quest id `q_seiva_deuses` |
| **Suco Divino** obtido | item em inventário |
| **Guardião Ancestral** derrotado | boss clear Coração da Floresta |
| Ritual Celestial realizado | consome Suco + gold; set classification Celestial; unlock Cap.II @ L1 |

### Cap. II → III (Celestial → Divino)

| Requisito | Verificação |
|-----------|-------------|
| Celestial nível 500 no Cap.II | bucket II |
| Missão **O Julgamento das Mil Almas** | `q_julgamento_mil_almas` |
| **Relíquia funerária** | item/mission flag |
| **Rei dos Mortos** derrotado | Trono das Almas |
| Ritual Divino | novo; unlock Cap.III @ L1 |

### Cap. III → IV (Divino → Semideus)

| Requisito | Verificação |
|-----------|-------------|
| Divino nível 500 no Cap.III | bucket III |
| Missão **O Coração da Chama Primordial** | `q_coracao_chama` |
| Artefato especial | item Cap.III |
| **Soberano Ígneo** derrotado | |
| Ritual do Semideus | unlock Cap.IV @ L1 |

### Conclusão Cap. IV

| Requisito | Verificação |
|-----------|-------------|
| Semideus nível 500 | bucket IV |
| Missão **O Último Deus** | `q_ultimo_deus` |
| Fragmentos da Criação reunidos | contador pity |
| Selos do Vazio | |
| Chefe final (Singularidade) | |
| Registro Galeria + cosmético + endgame opcional | |

---

## Schema de quest (proposta)

```
id, name, description, chapterId,
prerequisites[], objectives[] { type, target, count },
progress, rewards[], repeatable: false,
ritualId?, unlocksChapter?,
pity { counterKey, threshold, grantItemId }
```

Estados: `locked | active | ready_turnin | completed`.

### Pity / anti-azar

- Contador de kills elegíveis / boss waves → ao atingir limiar, concede fragmento/Suco se ainda não dropou.
- Limiar calibrado para casual Cap.I ~fim da janela 20–25 dias (doc 05).
- Ritual consome o item **uma vez**; não reentra inventário.

### Catálogo de quests / rituais (IDs)

| ID | Nome | Cap. | Unlock | Ritual | Item chave |
|----|------|------|--------|--------|------------|
| `q_seiva_deuses` | A Seiva dos Deuses | I | — | `ritual_celestial` | Suco Divino (`consumable_suco_celestial`) |
| `q_julgamento_mil_almas` | O Julgamento das Mil Almas | II | Cap.III | `ritual_divino` | Relíquia funerária |
| `q_coracao_chama` | O Coração da Chama Primordial | III | Cap.IV | `ritual_semideus` | Artefato da Chama |
| `q_ultimo_deus` | O Último Deus | IV | conclusão season | — | Fragmentos + Selos |

### Temporada

- Quests/rituais da campanha competitiva: **por temporada**.
- Cosmético de conclusão: **permanente**.
- Histórico “capítulo concluído”: permanente; **não** libera Cap.II na temporada nova sem refazer a campanha competitiva.

---

## Alterações necessárias

- Serviço de quests + persistência em `chapterProgress`.
- Estender ritual além de `ascendToCelestial` (Divino, Semideus).
- Pity no farm/boss.
- API: progresso, turn-in, ritual.

## Dependências

Capítulos (07); regiões chefes (03); itens missão (06); fame (Galeria).

## Impactos

Jogadores com Suco/Celestial legado: migração doc 09 (não re-consumir Suco se já Celestial).

## Critérios de aceite

- Sem unlock UI-only.
- Ritual incompleto rejeitado com lista de faltantes.
- Pity documentado e testável.
- Rewards únicos não recolecionáveis na mesma temporada.

## Migração / rollback

Feature flag; quests inativas se flag off; Celestiais legados mapeados sem forçar re-ritual Cap.I.
