# 01 — Visão geral: Quatro Eras da Ascensão

**Status:** especificação aprovada para documentação. **Não implementado.**  
**Índice:** [02](02_NAVEGACAO_CAPITULOS.md) · [03](03_REGIOES_E_CENARIOS.md) · [04](04_QUESTS_E_RITUAIS.md) · [05](05_PROGRESSAO_E_BALANCEAMENTO.md) · [06](06_EQUIPAMENTOS_E_ECONOMIA.md) · [07](07_ARQUITETURA_E_PERSISTENCIA.md) · [08](08_IMPACTOS_NO_PROJETO.md) · [09](09_TESTES_E_MIGRACAO.md) · [10](10_ROADMAP_IMPLEMENTACAO.md)

---

## Regra atual

- Um eixo de nível: Mortal cap **500**, Celestial cap **700** (`MORTAL_LEVEL_CAP` / `CELESTIAL_LEVEL_CAP`).
- Uma flag `ascension: null | 'CELESTIAL'`. Ritual zera nível/XP, preserva gear/attrs/journey.
- Soft reset sazonal zera progresso competitivo; preserva journey vitalícia e `ascensionLegacy`.
- ~17 regiões lineares; sem capítulos, Divino ou Semideus.
- Progressão 3.0 (`docs/balanceamento/17–23`) propôs Maestria/Domínio pós-700 e 32 regiões — **não implementada**.

## Proposta Quatro Eras

Campanha em **quatro capítulos desbloqueáveis**, cada um com **500 níveis independentes**, classificação própria, regiões, chefes, equipamentos e missões de transformação.

| Cap. | ID | Nome | Classificação | Tema | Níveis | Arte |
|------|-----|------|---------------|------|--------|------|
| I | `floresta_esquecida` | A Floresta Esquecida | Mortal | Floresta | 1–500 | [`cap-I.png`](../../idle/public/sinergia-idle/assets/chapters/cap-I.png) |
| II | `reino_mortos` | O Reino dos Mortos | Celestial | Cemitério | 1–500 | [`cap-II.png`](../../idle/public/sinergia-idle/assets/chapters/cap-II.png) |
| III | `inferno_primordial` | O Inferno Primordial | Divino | Fogo | 1–500 | [`cap-III.png`](../../idle/public/sinergia-idle/assets/chapters/cap-III.png) |
| IV | `abismo_vazio` | O Abismo do Vazio | Semideus | Buraco Negro | 1–500 | [`cap-IV.png`](../../idle/public/sinergia-idle/assets/chapters/cap-IV.png) |

**Total:** 2.000 passos de progressão conquistáveis ao longo dos capítulos.  
**Ordem de poder / ranking:** Semideus > Divino > Celestial > Mortal (nunca comparar só o número do nível entre classificações diferentes).

### Supersessão da Progressão 3.0

As Quatro Eras **substituem** Maestria/Domínio como eixo principal pós-Celestial. Reaproveitam como referência:

- Ritmo Cap.I ≈ Cenário B (Prog 2.0).
- Temporada ~120 dias de oportunidades.
- Offline 8 h com eficiência decrescente (proposta).
- Escala de poder mil → mi → bi → tri.

---

## Temporada vs legado (adendo aprovado)

| Camada | Escopo | Soft reset sazonal |
|--------|--------|--------------------|
| **Progresso sazonal (competitivo)** | Capítulos desbloqueados **nesta** temporada, níveis/XP por capítulo da temporada, quests/rituais da temporada, farm, inventário competitivo, ranking da temporada | **Resetado** conforme regras vigentes |
| **Histórico permanente** | Classificação máxima histórica, capítulos **já concluídos historicamente**, conquistas, estatísticas vitalícias, recordes, cosméticos permanentes | **Preservado** |

**Regra crítica:** o acesso aos capítulos na temporada atual respeita **somente** os desbloqueios conquistados **naquela temporada**, independentemente do legado histórico.  
Exemplo: Semideus histórico na temporada anterior começa a nova temporada na campanha competitiva do Cap.I (ou regra de soft reset acordada), mas mantém título/cosmético/Galeria de “já foi Semideus”.

---

## Progressão entre capítulos

1. Cada capítulo tem 500 níveis **independentes**.
2. Ritual de transformação → habilita o próximo capítulo no **nível 1**, sem apagar registros do capítulo anterior.
3. Retorno livre a qualquer capítulo desbloqueado **na temporada atual**, mantendo nível/progresso daquele bucket.
4. Troca de capítulo: interrompe e persiste a caça atual; preserva XP/recompensas/estado; servidor valida unlock.
5. XP de capítulos antigos **não** acelera níveis de capítulos superiores.
6. Recompensas únicas de missão/ritual: uma vez por temporada (ou permanente quando cosmético).

---

## Mecânicas por capítulo (não só números)

| Cap. | Dimensão estratégica (prep-only) |
|------|----------------------------------|
| I | Atributos, equipamentos, habilidades, refinamento |
| II | Maldições, efeitos espirituais, resistência, recuperação |
| III | Elementos, queimaduras, resistências, gear especializado |
| IV | Modificadores cósmicos, distorções, chefes complexos |

Combate permanece **automático**.

---

## Alterações necessárias (futuras)

- Modelo `chapters` versionado no blob do personagem (doc 07).
- Caps por capítulo = 500 para as quatro classificações; novos rituais Divino/Semideus.
- Ranking por classificação + nível do capítulo.
- 20 regiões temáticas (doc 03); quests (doc 04); UI Crônicas (doc 02 — só spec agora).

## Dependências

- Motor atual de farm/ascensão/journey/season/fame.
- Prog 2.0 Cenário B como base matemática Cap.I.
- Feature flag + migração (doc 09) antes de cutover.

## Impactos nos jogadores existentes

- Sem mudança até ativação da flag.
- Migração Celestial L>500: compensação documentada, **sem** corte silencioso (doc 09).
- Soft reset futuro passa a zerar desbloqueios **sazonais** de capítulo, não o legado histórico.

## Critérios de aceite (desta etapa documental)

- [x] Dez docs em `docs/capitulos/` com regra atual vs proposta.
- [x] Separação temporada/legado explícita.
- [x] Roadmap e decisões pendentes de aprovação (doc 10).
- [x] Nenhuma alteração de código/saves/catálogos/HUD/motor nesta etapa.

## Estratégia de migração e rollback

Ver [09_TESTES_E_MIGRACAO.md](09_TESTES_E_MIGRACAO.md). Resumo: dual-read legado ↔ `chapters`; flag off = comportamento atual; snapshot pré-migração.
