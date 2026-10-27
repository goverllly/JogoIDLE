# 03 — Regiões e cenários

**Status:** proposta de catálogo. **Não criar zonas no código nesta etapa.**

---

## Regra atual

17 zonas em `BASE_ZONES` / `regioes.csv` (idle): floresta → nexus, com `minLevel`, `requiresAscension`, `mortalOnly` (prova_divina).

Sem `chapterId`. Escala de poder ~centenas–dezenas de mil.

## Proposta: 5 regiões × 4 capítulos = 20

Cada região: identidade visual, objetos, monstros/variantes, chefe, ondas, rewards, materiais, dificuldade, requisitos, escalamento.

### Cap. I — Floresta (Mortal 1–500)

| # | Região | Faixa | Notas |
|---|--------|-------|-------|
| 1 | Bosque dos Sussurros | 1–100 | Adaptar `floresta` |
| 2 | Pântano das Sombras | 101–200 | Adaptar `pantano` (+ toques `jardim`) |
| 3 | Floresta Amaldiçoada | 201–300 | Nova / partial `jardim` dark |
| 4 | Ruínas dos Druidas | 301–400 | Nova |
| 5 | Coração da Floresta | 401–500 | Nova; chefe **Guardião Ancestral**; ritual path |

Identidade: vegetação, luz filtrada, raízes, névoa verde — variar densidade/iluminação por faixa.

### Cap. II — Cemitério (Celestial 1–500)

| # | Região | Faixa | Notas |
|---|--------|-------|-------|
| 1 | Cemitério Esquecido | 1–100 | Adaptar `cemiterio` |
| 2 | Criptas Profanadas | 101–200 | Adaptar `hidra` (cripta) |
| 3 | Catacumbas Eternas | 201–300 | Adaptar `catacumbas` |
| 4 | Necrópole dos Reis | 301–400 | Adaptar `reliquias` / `trono` parcial |
| 5 | Trono das Almas | 401–500 | Nova/adaptação; chefe **Rei dos Mortos** |

Mecânica Cap.II: maldições / resist espiritual (prep).

### Cap. III — Fogo (Divino 1–500)

| # | Região | Faixa | Notas |
|---|--------|-------|-------|
| 1 | Campos de Cinzas | 1–100 | Adaptar `vulcao` early |
| 2 | Rios de Magma | 101–200 | Nova |
| 3 | Fornalhas Malditas | 201–300 | Adaptar `abismo` heat |
| 4 | Fortaleza dos Condenados | 301–400 | Adaptar `fortaleza` + fogo |
| 5 | Trono da Chama Eterna | 401–500 | Nova; chefe **Soberano Ígneo** |

### Cap. IV — Buraco Negro (Semideus 1–500)

| # | Região | Faixa | Notas |
|---|--------|-------|-------|
| 1 | Ruínas Orbitais | 1–100 | Adaptar `nevoa` / etéreo |
| 2 | Abismo Esquecido | 101–200 | Adaptar `abismo` cósmico |
| 3 | Cemitério das Estrelas | 201–300 | Adaptar `eter` |
| 4 | Horizonte de Eventos | 301–400 | Adaptar `firmamento` |
| 5 | A Singularidade | 401–500 | Adaptar `nexus` + nova; chefe final |

---

## Mapeamento das 17 existentes

| Zona atual | minLv | Cap. destino | Região destino | Ação |
|------------|-------|--------------|----------------|------|
| floresta | 1 | I | Bosque dos Sussurros | adapt |
| cemiterio | 10 | II | Cemitério Esquecido | adapt |
| jardim | 25 | I | Floresta Amaldiçoada (assets) | adapt_merge |
| pantano | 35 | I | Pântano das Sombras | adapt |
| hidra | 50 | II | Criptas Profanadas | adapt |
| gelo | 70 | I | remap farm → Bosque (sem bioma gelo nas 20) | migrate_farm — **decisão aberta** doc 10 |
| abismo | 90 | III/IV | Rios de Magma / Abismo Esquecido | adapt (duas skins) |
| fortaleza | 120 | III | Fortaleza dos Condenados | adapt |
| vulcao | 180 | III | Campos de Cinzas | adapt |
| catacumbas | 250 | II | Catacumbas Eternas | adapt |
| nevoa | 320 | IV | Ruínas Orbitais | adapt |
| reliquias | 400 | II | Necrópole dos Reis | adapt |
| trono | 450 | II | Trono das Almas (parcial) | adapt_partial |
| prova_divina | 500 | I | Trial / Ritual Celestial | reclassify |
| eter | 500 | IV | Cemitério das Estrelas | adapt |
| firmamento | 560 | IV | Horizonte de Eventos | adapt |
| nexus | 620 | IV | A Singularidade | adapt |

### Catálogo das 20 (resumo)

| Cap. | region_id | Nome | Lv | Chefe |
|------|-----------|------|----|-------|
| I | bosque_sussurros | Bosque dos Sussurros | 1–100 | Guardião da Clareira |
| I | pantano_sombras | Pântano das Sombras | 101–200 | Senhora do Lodo |
| I | floresta_amaldicoada | Floresta Amaldiçoada | 201–300 | Árvore Voraz |
| I | ruinas_druidas | Ruínas dos Druidas | 301–400 | Arquidruida Caído |
| I | coracao_floresta | Coração da Floresta | 401–500 | Guardião Ancestral |
| II | cemiterio_esquecido | Cemitério Esquecido | 1–100 | Senhor das Tumbas |
| II | criptas_profanadas | Criptas Profanadas | 101–200 | Padre Profano |
| II | catacumbas_eternas | Catacumbas Eternas | 201–300 | Arquivista Morto |
| II | necropole_reis | Necrópole dos Reis | 301–400 | Curador Eterno |
| II | trono_almas | Trono das Almas | 401–500 | Rei dos Mortos |
| III | campos_cinzas | Campos de Cinzas | 1–100 | Arauto das Cinzas |
| III | rios_magma | Rios de Magma | 101–200 | Serpente de Magma |
| III | fornalhas_malditas | Fornalhas Malditas | 201–300 | Ferreiro Condenado |
| III | fortaleza_condenados | Fortaleza dos Condenados | 301–400 | Sentinela Ígnea |
| III | trono_chama | Trono da Chama Eterna | 401–500 | Soberano Ígneo |
| IV | ruinas_orbitais | Ruínas Orbitais | 1–100 | Eco Orbital |
| IV | abismo_esquecido | Abismo Esquecido | 101–200 | Sombra do Vazio |
| IV | cemiterio_estrelas | Cemitério das Estrelas | 201–300 | Arauto Estelar |
| IV | horizonte_eventos | Horizonte de Eventos | 301–400 | Guardião do Horizonte |
| IV | singularidade | A Singularidade | 401–500 | O Último Eco |

**Não descartar** sem linha em migração de `farmZoneId`, drops e Admin overrides.

---

## Escalamento (por região)

- `minLevel` **dentro do capítulo** (1–500 do bucket).
- `chapterId` + `classificationRequired`.
- Poder mob = f(capítulo band) × f(nível regional) — ver doc 05.
- Chefe: wave size + mecânica do capítulo.

## Direção artística

- Cap.I: verdes, musgo, luar verde — arte [`cap-I.png`](../../idle/public/sinergia-idle/assets/chapters/cap-I.png).
- Cap.II: cinza-osso, lilás pálido, lápides — [`cap-II.png`](../../idle/public/sinergia-idle/assets/chapters/cap-II.png).
- Cap.III: carvão, magma, ouro fundido — [`cap-III.png`](../../idle/public/sinergia-idle/assets/chapters/cap-III.png).
- Cap.IV: negro, lente gravitacional, estrelas mortas — [`cap-IV.png`](../../idle/public/sinergia-idle/assets/chapters/cap-IV.png).

Artes de card (doc 02) ≠ background de arena; pipelines separados. Pasta: `/sinergia-idle/assets/chapters/`.

---

## Alterações necessárias

- `chapterId` em zonas/catálogo Admin.
- 20 entradas (rename/adapt + novas).
- Client: zone list filtrada por capítulo atual.

## Dependências

Persistência capítulos; balance bands; assets.

## Impactos

Jogadores em `gelo`/zonas fundidas: remap automático no enable da flag.

## Critérios de aceite

- Tabela 17→20 completa; nenhuma zona órfã.
- 5 regiões/capítulo com faixa 100 níveis.
- Gates server-side por capítulo.

## Migração / rollback

Alias `legacyZoneId → newZoneId`; flag off restaura `BASE_ZONES` atuais.
