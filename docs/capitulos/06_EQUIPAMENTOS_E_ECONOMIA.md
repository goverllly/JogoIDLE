# 06 — Equipamentos e economia

**Status:** proposta. **Não alterar catálogo/refine live.**

---

## Regra atual

- ~1157 templates; tiers 1–4; raridades common→legendary.
- Gear celestial: `CELESTIAL_GEAR_MIN_TIER` 14 + `requiresAscension`.
- Refine: +5×10, 100%, 1 Refinador, sem ouro na ação; merchant 25k.
- Ritual: 10M ouro; sinks mid fracos (auditoria).
- Ascensão **preserva** inventário e equipamento.

## Proposta Quatro Eras

### Preservação entre capítulos (adendo aprovado)

| Ativo | Ao ritual / troca de capítulo |
|-------|-------------------------------|
| Equipamentos | **Preservados** no inventário/slots |
| Atributos / unspent | **Preservados** (+ bônus de ritual se houver) |
| Habilidades | **Preservadas**; slots novos podem exigir classificação |
| Nível do capítulo anterior | **Preservado** no bucket |
| Poder efetivo no capítulo novo | Soft-cap + pressão de tier (abaixo) |

### Utilidade vs necessidade de tier novo

Objetivo: gear antigo **não inútil**, mas **insuficiente** para ignorar o capítulo novo.

1. **Chapter power weight**  
   - Gear do capítulo atual: contribuição 100%.  
   - Gear 1 capítulo atrás: ~55–70% dos stats ofensivos (defensivo um pouco mais alto).  
   - Gear 2+ atrás: ~25–40% ofensivo; ainda útil em niches (resist Cap.II em Cap.III misturado).

2. **Requisitos suaves**  
   - Zonas mid/late de cada capítulo: `recommendedGearChapter >= current-0`.  
   - Chefe final: soft gate (TTK explode sem tier atual), não hard lock de equipar.

3. **Transformação / herança**  
   - Sink: “despertar” peça antiga com mats do capítulo novo → sobe `gearChapter` mantendo refine parcial.  
   - Preserve sensação de crescimento sem skip.

4. **Anti-skip**  
   - Affixes do capítulo (maldição/elemento/cósmico) **ignoram** parte do ATK cru antigo.  
   - Assim milhares de ATK Mortal não zeram Cap.II espiritual.

### Tiers por classificação

| Camada | Cap. | Papel |
|--------|------|-------|
| Mortais (t1–t4 + sets floresta) | I | Base B-det |
| Celestiais / funerários | II | Resist espiritual, anti-maldição |
| Divinos / ígneos | III | Elementos, burn, resists fogo |
| Vazio / cósmicos | IV | Affix slots, distorção |

Raridades: manter + propor `mythic`/`void` no Cap.IV (mult alto, drop raro).

### Refine

- Cap.I: adotar B-det (Prog 2.0) quando balance for aprovado.
- Cap.II+: refinadores temáticos + ouro escalado; awaken opcional em gear Divino/Vazio.
- Refine antigo permanece no item; eficácia ofensiva sofre weight ao mudar de capítulo.

### Economia

| Cap. | Income relativo | Sinks principais |
|------|-----------------|------------------|
| I | baseline B | Refine B-det + ritual 10M + Suco path |
| II | ×~10–50 vs late I | Gear funerário, ritual Divino, mats relíquia |
| III | ×~1e3–1e4 | Forge elemental, ritual Semideus |
| IV | ×~1e6+ | Affix rerolls, fragmentos, cosmético craft |

Evitar trilhões ociosos: sinks sobem com a banda. Evitar muro: pity de mats de quest (doc 04).

### Materiais de missão (obrigatórios)

Suco Divino, Relíquia funerária, Artefato da Chama, Fragmentos/Selos — com pity. Não vender/destruir se quest ativa (flag `questBound`).

---

## Alterações necessárias

- Campo `gearChapter` / `classificationReq` nos templates.
- Soft-cap de stats cross-chapter no `computeStats`.
- Novos sinks e merchant prices por capítulo.
- Fluxo “despertar item”.

## Dependências

Docs 04/05; catálogo Admin com `chapterId`.

## Impactos

Inventário legado continua equipável; eficácia relativa cai em Cap. superiores. Comunicação clara na UI (tooltip “poder reduzido neste capítulo”).

## Critérios de aceite

- Gear Cap.I não zera Cap.II em simulação de TTK.
- Despertar preserva parte do refine.
- Sinks ≥ income late de cada cap na simulação documental.

## Migração / rollback

Templates novos só com flag; soft-cap desligável; itens sem `gearChapter` = Cap.I.
