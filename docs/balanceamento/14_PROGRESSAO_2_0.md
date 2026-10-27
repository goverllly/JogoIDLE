# 14 — Progressão 2.0 (proposta — não implementada)

Propostas validadas só em **parâmetros de simulação** (`scenario_B_params.json`). Motor de produção intacto até aprovação explícita.

---

## 1. XP e curva

### Metas (validadas no Cenário B)

| Perfil | Meta | Resultado Guerreiro p50 |
|--------|------|-------------------------|
| Otimizado | 25–40 h → 500 | **26 h** ✓ |
| Casual | 45–70 h → 500 | **54 h** ✓ |

Total XP 1→500: motor **96.7M** → B **103.4M** (~+7%, com suavização de faixas). O ganho de tempo vem sobretudo de **mob XP↓**, **hits↑ leves** e **poder esperado com fração de gear** (`gearPowerFraction=0.32`), não só da curva.

### Suavização

Modo `smooth_B` em `scenarios.mjs`: piecewise contínuo o bastante nos breakpoints (evita saltos abruptos das faixas atuais). Derivada não é C¹ matemática; é contínua o suficiente para a simulação.

### Chefe como marco (soft)

`bossClearXpBonus: 1.05` após clear na simulação. **Sem** hard-lock de região nesta etapa. Opção UX documentada: bônus de XP na próxima zona após clear do chefe (flag “região dominada”).

---

## 2. DES / Arqueiro

### Soft-caps atuais (motor — comprovados)

| Efeito | Fórmula | Soft-cap |
|--------|---------|----------|
| Intervalo | `max(420, 1450 − DEX×7)` | **DEX ≈ 148** |
| Crit | `min(0.45, DEX×0.0025)` | **DEX = 180** |

CSV: `v2_dex_softcaps.csv`. Pontos acima disso em DES puro são desperdício de intervalo/crit (não de ATK — ATK atual não usa DES).

### Tabela de desperdício (resumo)

Para as 4 classes, com base em attrs de classe + DES adicionado 0→250 no espelho L100:

- Em **DEX ≥ 148**: intervalo já no mínimo (420 ms).
- Em **DEX ≥ 180**: crit no teto (45%).
- **ATK atual** não sobe com DES (físico = STR; mágico = INT) → Arqueiro full-DES no Cenário A fica **~44 h** vs Guerreiro **~12 h** (gap ~3.7×).

### Hipóteses (só simulação)

| ID | Regra | Uso |
|----|-------|-----|
| **H1** | `attack = físico + floor(DEX × kDexAtk)` (Arqueiro) | Candidata simples |
| **H2** | `attack = round(6 + STR×kAtk×wStr + DEX×kDex×wDex + flat)` pesos por classe | **Recomendada** |
| **H3** | ATK-from-DEX com diminishing após soft-cap de velocidade | Alternativa anti-burst late |

### H2 calibrada (Cenário B)

```
kAtk = 2.2
kDexAtk = 1.55
ARQUEIRO: wStr=0.35, wDex=0.65
GUERREIRO: wStr=0.85, wDex=0.15
BARBARO: wStr=0.90, wDex=0.10
MAGO: ATK permanece INT×2.4 (+ DEX residual leve)
```

**Anti-dominância:** no agregado otimizado B, Arqueiro **25 h** vs Guerreiro **26 h** (≈ −4%, dentro de ±10%). Mid-game TTK puro ainda favorece Guerreiro se kDex for baixo; early DES-speed compensa no tempo total. Se H2 for aplicada no motor, revalidar com N≥200 após patch.

**Bug de simulação corrigido nesta validação:** `spendPoints` sobrescrevia DES do Arqueiro com 10% e jogava o resto em FOR — builds “primary DES” estavam invertidas. Não afeta o jogo; só o audit.

---

## 3. Refine 2.0

Preferência travada: **determinístico, materiais/custos crescentes, sem destruição**.

| Modelo | Regra | 8 slots → +10 (esperado) |
|--------|-------|---------------------------|
| **Atual** | +5/nível, 100%, 1 Refinador, ouro flat | 80 refinadores / 2.0M ouro |
| **B-det** (preferido) | +3/+4 escada; refinadores 1→3; ouro ×1.55^n; 100%; sem break | **168** refinadores / **~17.2M** ouro |
| **B-prob** | Mesmos bônus; 100% até +4, depois 85%→60%; falha = só material | ~102 refinadores / ~16.3M ouro |

CSV: `v2_refine_alt.csv`. B-det eleva sink de ouro/materiais sem RNG punitivo — alinhado à preferência do plano.

Gear na simulação B: refine sobe ~1 a cada 70 níveis (mais lento que atual ~45).

---

## 4. Mobs / poder esperado

Cenário B:

- `mobXpPerLevel: 15` (motor 20)
- `mobHitsToKill: 11` / `bossHitsToKill: 32`
- `expectedPowerIncludesGear: true` com **`gearPowerFraction: 0.32`**  
  (mistura baseline `expectedPlayerPower` + stats com gear — fração 1.0 trava progresso)

Early permanece rápido; mid/late exige gear (TTK e faints sobem vs A).

---

## 5. Celestial — gap confirmado + proposta

### Achado (código + sim)

`combat.ts` exige `level >= zone.minLevel` **e** `requiresAscension`. Zonas:

| Zona | minLevel | Ascensão |
|------|----------|----------|
| eter | **500** | CELESTIAL |
| firmamento | **560** | CELESTIAL |
| nexus | **620** | CELESTIAL |

Pós-ritual o personagem fica **nível 1** com gear/attrs. **Nenhuma** zona CELESTIAL é acessível em L1. Conteúdo imediato: zonas mortais não-`mortalOnly` de minLevel baixo (ex. floresta). `eter` **não** é conteúdo imediato — também exige L500 celestial.

JSON: `v2_celestial_access.json`.

### Proposta documental (não implementar conteúdo agora)

1. Zonas Celestial **tier baixo** com `minLevel: 1` + `requiresAscension: CELESTIAL` (ou scaling por poder ao ritual).
2. Materiais / refine / gear exclusivos nessas zonas.
3. Chefes Celestial com recompensa distinta.
4. Manter attrs/gear/conquistas; progressão 1→700 com identidade nova (não replay mortal).
5. Soft opcional: bônus XP na próxima zona após clear do chefe.

### Tempo Celestial simulado (gear/attrs de mortal 500, H2 no B)

| Cenário | Classe | →100 | →300 | →500 | →700 |
|---------|--------|------|------|------|------|
| A | Guerreiro | 2 h | 4 h | 5 h | 7 h |
| A | Arqueiro | 2 h | 7 h | 18 h | 32 h |
| B | Guerreiro | 3 h | 6 h | 13 h | 19 h |
| B | Arqueiro | 3 h | 5 h | 9 h | 15 h |

Fonte: `v2_celestial_progress.json`. Números otimistas (sem gates de conteúdo novo); com zonas tier-1 Celestial o pacing mudaria.

---

## 6. Recomendação default da validação

1. **Cenário B** como base de Progressão 2.0.  
2. **H2** para DES→ATK.  
3. **Refine B-det**.  
4. Celestial: corrigir gap de conteúdo pós-ritual **antes** de só relevelar 1→700 no mortal.  
5. **Não** aplicar no motor até aprovação explícita (ver doc 16).
