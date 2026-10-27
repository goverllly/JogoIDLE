# 19 — Expansão de regiões e endgame

**Status:** proposta (catálogo). **Não criar zonas no código nesta etapa.**  
**Dados:** `data/v3_regioes_proposta.csv` (32 linhas), `data/regioes.csv` (17 atuais).

---

## Regra atual

- **17** zonas em `BASE_ZONES` (`data.ts`).
- Mortal: floresta → prova_divina (L1–500).
- Celestial: eter (L500), firmamento (L560), nexus (L620) — **inacessíveis em Celestial L1** (gap documentado na Prog 2.0).

## Análise: 17 bastam para 120 dias?

**Não**, se a temporada precisar de identidade pós-500 e pós-700.  
**Sim** para só relevelar XP — mas isso contradiz o briefing (não alongar só com espera).

| Faixa total | Avaliação |
|-------------|-----------|
| 17 (atual) | Insuficiente para Cap.II–IV |
| 25 | Mínimo apertado |
| **32** | **Alvo recomendado** — biomas reutilizados + modifiers |
| 40 | Risco de clones; só se dims semanais exigirem |

Quebra 32: **14 mortais** · **6 cel. iniciais** · **5 cel. avançadas** · **4 dimensões** · **3 endgame**.

---

## Reuso inteligente de biomas

Em vez de 15 biomas novos: reaplicar famílias (floresta, gelo, abismo, relíquias…) com:

- Palette celestial / ancestral
- Affixes (resist, intervalo, reflect)
- Materiais e gear distintos
- Chefe com mecânica de **preparação** (não clique)

---

## Catálogo resumido

Fonte completa: `v3_regioes_proposta.csv` (powerRec, HP/ATK, horas, materiais, gear).

### Capítulo I — Mortais (14 existentes)

| id | minLevel | Chefe (resumo) | Mecânica |
|----|----------|----------------|----------|
| floresta…trono | 1–450 | ver CSV | progressão clássica |
| prova_divina | 500 mortalOnly | Juiz Divino | Suco Celestial |

Tempo estimado agregado Cap.I (caça+chefes+refine): alinhado a **26–54 h** efetivas (Cenário B).

### Capítulo II — Celestiais iniciais (6)

| id | status | unlock proposto | powerRec |
|----|--------|-----------------|----------|
| alvorada | nova | CELESTIAL L1 | 6e5 |
| jardins_lunares | nova | L40 | 2e6 |
| arquipelago_nuvens | nova | L80 | 5e6 |
| biblioteca_estrelas | nova | L120 | 1e7 |
| cascata_aurora | nova | L160 | 1.5e7 |
| eter | existente (ajuste) | L200 (hoje 500) | 2e7 |

Corrige o gap pós-ritual: conteúdo Celestial imediato em L1.

### Capítulo III — Celestiais avançadas (5)

| id | status | unlock proposto |
|----|--------|-----------------|
| firmamento | ajuste | L400 (hoje 560) |
| torre_eclipsada | nova | L450 |
| mar_de_constelacoes | nova | L500 |
| nexus | ajuste | L550 (hoje 620) |
| cidadela_oraculo | nova | L600 |

### Dimensões (4) — modifiers / materiais

| id | Cap. | Unlock |
|----|------|--------|
| dim_crepusculo | III | domínio ≥2 |
| dim_forja | III | domínio ≥2 (foco refine) |
| dim_labirinto | IV | L650 + domínio ≥3 |
| dim_vazio | IV | L680 + domínio ≥4 |

### Endgame (3)

| id | Unlock | Papel |
|----|--------|-------|
| trono_antigos | L700 + maestria ≥10 | Chefe final campanha |
| coracao_cosmos | clear trono | Cosmético / artefato |
| salao_eco_eterno | clear coração | Leaderboard TTK / fama |

---

## Dificuldade por etapa (prep-only)

| Mecânica | Onde | O que o jogador prepara |
|----------|------|-------------------------|
| Resistência elemental | Cap.I–II | Sets / attrs |
| Interval penalty | Nuvens, dims | DES / pets |
| Reflect parcial | Coliseu-like / dims | Defesa / potes |
| Survival long fight | Mar de Constelações | HP, cura, poções |
| Multi-phase boss | Trono Antigos | Domínio + maestria + gear |
| Affix semanal | Dimensões (Cenário D) | Build niche |

**Sem** mecânicas de clique durante a batalha.

---

## Tempo estimado (horas de conteúdo, não calendário)

| Camada | Σ hoursEst (CSV) | Nota |
|--------|------------------|------|
| Mortal + prova | ~48 h | Inclui farm/refine implícito Cap.I |
| Cel. early | ~42 h | Cap.II |
| Cel. adv | ~55 h | Cap.III |
| Dimensões | ~47 h | III–IV |
| Endgame | ~63 h | IV + opcionais |

Totais alimentam o orçamento de `v3_perfis_120d.json` (não são só XP).

---

## Links

- [21_CELESTIAL_E_POS_ASCENSAO.md](21_CELESTIAL_E_POS_ASCENSAO.md)
- [22_SIMULACAO_TEMPORADA_COMPLETA.md](22_SIMULACAO_TEMPORADA_COMPLETA.md)
