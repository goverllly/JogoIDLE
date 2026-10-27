# 21 — Celestial e pós-ascensão

**Status:** proposta. **Não altera ritual/caps.**  
**Dados:** `data/v3_pos_celestial.json`, `data/v2_celestial_access.json`, `data/v2_celestial_progress.json`.

---

## Regra atual

| Item | Valor |
|------|-------|
| Cap Mortal | 500 |
| Cap Celestial | 700 |
| Ritual | L500 + 10M ouro + Suco; nível →1; **attrs/gear preservados**; +20 unspent |
| Zonas CELESTIAL | eter 500, firmamento 560, nexus 620 |
| Acesso pós-ritual L1 | **Nenhuma** zona celestial |

Sim Prog 2.0 (só XP, gear mortal 500): Guerreiro B ~**19 h** →700. Otimista e **ignora o gap de conteúdo**.

---

## Proposta Cap.II — corrigir o gap

Zonas Celestial **tier-1** com `requiresAscension: CELESTIAL` e `minLevel` baixo (1–200):

`alvorada`, `jardins_lunares`, `arquipelago_nuvens`, `biblioteca_estrelas`, `cascata_aurora`, e **eter** rebalanceado para ~L200.

Ajustar firmamento/nexus para Mid/Late Cap.III (ver doc 19).  
Identidade: materiais/gear/chefes distintos — **não** replay mortal.

---

## Comparativo de camadas pós-700

| Alternativa | Fit motor | Prós | Contras | Veredito |
|-------------|-----------|------|---------|----------|
| Subir cap (ex. 1000) | Médio | Simples | Segunda barra XP; briefing rejeita arbitrário | **Não** |
| Prestígio / reset nível | Baixo | Loop sazonal | Dilui ritual; segunda XP | **Não** |
| Despertar Divino | Médio | Fantasia forte | Parece 2ª ascensão | Evitar como barra principal |
| Constelações | Médio-alto | UX árvore | Sobreposição com Maestria | Fundir na UI se quiser |
| Poder Ancestral (só recurso) | Médio | Bom para gear | Fraco sozinho | Apoio |
| **Maestria Celestial** | **Alto** | Ranks + sinks + identidade | Precisa mats | **Sim** |
| **Domínio de Regiões** | **Alto** | Idle prep; modifiers | Conteúdo por zona | **Sim** |

### Recomendação travada

**Maestria Celestial + Domínio de Regiões** (+ artefatos sazonais).  
**Não** aumentar `CELESTIAL_LEVEL_CAP`.

---

## Maestria Celestial (Cenário C)

- **40 ranks** (Cenário D: **60**).
- Custo: mats de Cap.III–IV + ouro crescente (~×1.18 mats, ×1.22 gold por rank — ver JSON).
- Bônus: ATK%/HP% por rank (prep power, não skill ativa).
- Unlock rank 1: Celestial 700 **ou** clear Nexus (proposta flexível anti-muro).

## Domínio de Regiões

| | C | D |
|--|---|---|
| Estrelas máx. | 5 | 7 |
| Por estrela | HP mob ×1.35, ATK ×1.22, reward ×1.18, mats maestria ×1.15 | idem + affix semanal |

Subir estrela: clear do chefe sob modifier. Combate automático — falha = melhorar prep.

---

## Transição sazonal (Celestial)

| Campo | Soft reset |
|-------|------------|
| Nível / ascensão ativa | Reset |
| Ranks de Maestria da temporada | Reset (competitivo) |
| Domínio estrelas | Reset |
| Cosmético / título de conclusão | **Permanece** |
| Journey lifetime | **Permanece** |
| `ascensionLegacy` | **Permanece** |

Nova temporada: competição renovada sem apagar história.

---

## Sensação desejada pós-ritual

1. Entrar em **Alvorada** imediatamente (não floresta como “conteúdo celestial”).
2. Gear divino muda o visual e as resistências.
3. Atingir 700 **abre** Maestria/Domínio — nova fantasia, não barra XP clone.
4. Cap.IV = Trono / Cosmos / Eco Eterno como teatro de poder absurdo **com** risco de prep.

---

## Links

- [08_ASCENSAO_CELESTIAL.md](08_ASCENSAO_CELESTIAL.md)
- [14_PROGRESSAO_2_0.md](14_PROGRESSAO_2_0.md) §5
- [19_EXPANSAO_REGIOES_E_ENDGAME.md](19_EXPANSAO_REGIOES_E_ENDGAME.md)
