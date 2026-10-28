# 14 — Auditoria de gameplay, economia e balanceamento (Fase 4)

**Data:** 2026-10-28  
**Escopo:** integridade técnica + relatório quantitativo **sem retune**.  
**Dados:** `AUDITORIA_JOGO_IDLE/fase4_economy/`  
**Scripts:** `phase4-economy-sim.mjs`, `phase4-balance-study.mjs`  
**Não toca:** fórmulas/preços/probs do motor; não muta `idle/data/save.json` de jogo; não escreve `docs/balanceamento/`.

---

## Validação pós-entrega (reexecução Agent Mode)

| Check | Resultado **desta** execução |
|-------|------------------------------|
| HEAD | `55492ba` (`55492baca5ad523f7e9fbda68bd21bfac6753c2e`) |
| Branch | `main` ahead **17** de `origin/main` (docs Fase 4 **não** na main pública) |
| Commits Fase 4 | `911a8f5` RNG · `f4ce4c5` progressão · `f62abc2` inventário · `91885ea` offline · `8ae5614` economia · `55492ba` HTTP/docs |
| `npm test` | **130 pass / 0 fail** (reexecutado com permissões `all`; EPERM do sandbox anterior não se aplica) |
| `admin:build` | **OK** (vite build ~485ms) |

### Problemas técnicos confirmados corrigidos

| Item | Evidência no código / teste |
|------|------------------------------|
| RNG injetável | `resolveRng` / `options.rng` em `combat.ts`; defaults `Math.random` só como fallback |
| NaN HP/dano | `Number.isFinite` em `applyOutgoingDamage` e hit recebido |
| Idempotência sell/refine/ascend | `inventory.test`, `progression.test`, `gameplay-http.test` |
| STALE | `progression.test` + `store.test` `STALE_CHARACTER` |
| Offline matriz | `farm-offline.test` + estudo `balance_study_offline.json` |

**Veredito integridade Fase 4:** confirmado por suite e greps nesta execução.  
**Veredito balanceamento:** aberto — ver estudo complementar abaixo (sem mudança de motor).

### Correção à linha antiga sobre offline

A frase anterior (“chunks podem somar >2h” recuperando wall clock longo) estava **errada** para o retorno após ausência longa. Ver seção Offline revalidada.

---

## Premissas da simulação original (Fase 4.5) — limitações

- Gear starter; skills off; engagement off.
- Atributos: 65% “primário de classe” / 35% CON — para Arqueiro usou **DEX**, enquanto ATK físico no motor usa **STR**.
- Isso **não** prova que a classe está quebrada no jogo se o jogador investir em STR; prova dissonância UI (`primaryAttrForClass=dex`) vs fórmula.

---

## Offline — regra real (revalidada)

### Mecânica medida

1. `elapsed = min(wallClock − maintenance, 2h)`.
2. Ticks só dentro dessa janela; `maxTicks=5000` pode cortá-la → `catchUpPending=true`.
3. `lastTickAt = now − remaining` (salta o buraco não elegível).
4. Wall além de 2h **não** fica armazenado para calls futuras.

### Distinção obrigatória (2ª call)

| Situação | 2ª call (mesmo `now`) | Resultado medido |
|----------|----------------------|------------------|
| Janela 2h **completa** (`pending=false`) | sem trabalho | `ticks=0`, `rewardedMs=0` |
| Janela 2h **cortada por 5k ticks** (`pending=true`) | ainda há `remaining` | **ticks > 0** até fechar os ≤2h |

### Matriz (`balance_study_offline.json`, tank Guerreiro, seed 2026)

| Caso | call1 rewardedMs | call1 pending | call2 same now | Soma ≤2h? |
|------|-----------------:|:-------------:|----------------|:---------:|
| 2h wall | 6 970 000 | sim (5k) | +228 616 ticks=164 | **7 198 616 ≈ 2h** |
| 6h wall | 6 970 000 | sim | +228 616 | **≈ 2h** (4h perdidas) |
| 24h wall | 6 970 000 | sim | +228 616 | **≈ 2h** (22h perdidas) |
| Após 6h catch-up + 10 min reais | — | — | +599 420 (só os 10 min) | buraco antigo não volta |
| Faint frágil @2h | 12 546 | não | — | catch-up encerrado |

**Conclusão produto:** o modelo atual já limita a recuperação acumulada de uma ausência longa a **≈2 horas** (possivelmente em 2+ requests se `maxTicks` cortar). Não é necessário “corrigir” um exploit de 6h/24h via múltiplas calls no mesmo retorno. Decisão aberta: manter como está vs comunicar melhor na UI.

---

## Estudo Arqueiro A / B / C

Dados: `balance_study_archer.json`.  
Fórmulas B/C são **espelho analítico** (script); A usa `computeStats` do motor. Mesmos attrs/gear/seeds entre alternativas.

### Alternativas (somente estudo)

| Alt | Definição |
|-----|-----------|
| **A** | Motor atual: ATK = STR; DEX = velocidade + crit |
| **B** | Mirror: ATK += DEX × kAtk × 0.35 (Arqueiro) |
| **C** | Mirror: ATK = base + (0.55×STR + 0.45×DEX)×kAtk |

### Lv.250 starter — analítico (básico)

| Build | Fórmula | ATK | DPS básico | TTK mob hits | TTK mob s |
|-------|---------|----:|----------:|-------------:|----------:|
| DEX 65% | A | 26 | 84 | 4912 | 2063 |
| DEX 65% | B | 659 | 2134 | 10.5 | 4.4 |
| DEX 65% | C | 832 | 2694 | 7.7 | 3.2 |
| STR 65% | A | 1806 | 1403 | 4.0 | 5.3 |
| STR 65% | B | 1815 | 1410 | 4.0 | 5.3 |
| STR 65% | C | 1010 | 785 | 7.9 | 10.5 |

### Impacto em personagens STR-existing (gear mid +5)

| Nível | ATK A | ATK C | ΔATK C vs A | ΔDPS |
|------:|------:|------:|------------:|-----:|
| 250 | 1960 | 1164 | **−40.6%** | 3206 → 1904 |
| 500 | 3788 | 2188 | **−42.2%** | 9675 → 5589 |

Pós-ascensão (ritual real, attrs preservados `attrsEqual=true`, +20 unspent não redistribuídos): C ainda **−1600 ATK / −5181 DPS** vs A no mesmo personagem STR-heavy.

**B** nos STR-heavy: +9 ATK (~negligível). Em DEX-heavy: resgate grande (26→659).

### Farm 1h **medido** (`processFarm`, 3 seeds) — só fórmula A

| Build | avg kills | avg XP | avg gold | nível final típico |
|-------|----------:|-------:|---------:|-------------------:|
| STR heavy | 541.7 | 34602 | 10224 | 18 |
| DEX heavy | 162.3 | 10113 | 2996 | 13 |

(Analítico ≠ medido: XP/h nas células A/B/C do JSON estão marcadas `analytical_from_ttk`; farm acima é `processFarm_measured`.)

### Skills

Modelo `estimated_skill_model` (CD + custo MP + regen 2%/tick + prioridade) — **não** confundir com `processFarm`. Detalhes no JSON.

---

## TTK — modelo vs builds

Dados: `balance_study_ttk.json`. Mob Cap.I mid: HP 6680, DEF 192.

| Referência | ATK | TTK hits | TTK s |
|------------|----:|---------:|------:|
| `expectedPlayerPower(250)` | **1063** | ~calibra `mobHitsToKill=10` | — |
| Guerreiro STR65 naked | 1821 | **4.04** | 5.63 |
| Guerreiro + gear r5 | 2010 | 3.36 | 3.77 |
| Arqueiro DEX65 naked | 26 | inviável | — |
| Arqueiro STR65 naked | 1806 | **4.00** | 5.33 |

**Origem do gap 1063 vs 1821:** calibrador usa attrs médios `10+L×1.2` (+ termo `L×1.5`); simulação investe ~65% dos pontos em STR. Não é bug de `scaleMonster`.  
**Meta 8–12 hits** aplica-se ao poder **esperado/médio de calibração**, não a builds otimizadas com gear.

---

## Recomendação técnica (sem alterar o motor nesta etapa)

| Opção | Prós | Contras | Migração |
|-------|------|---------|----------|
| **A + UX** | Zero risco a saves; Arqueiro STR já compete com Guerreiro | UI/`primaryAttr=dex` engana; DEX-dump sofre | Só copy/orientação (+ alinhar primaryAttr numa fase UX) |
| **B** | Salva fantasy DEX com impacto mínimo em STR (~+0.5%) | Ainda é retune; precisa testes de regressão | Baixo — quase não fere existentes |
| **C** | Híbrido “bonito” | **−40% ATK** em STR-heavy existentes | Alto — reset de pontos / compensação |

**Recomendação:** priorizar **decisão de produto sobre identidade** (abaixo). Se a intenção de design for “DEX = velocidade/crit e STR = dano”, adotar **A + UX** (e corrigir `primaryAttrForClass`/tooltips numa entrega UX). Se a intenção for “DEX também alimenta o arco” **sem** punir quem já stackou STR, **B** é quantitativamente mais seguro que **C**. **Não** adotar C sem plano de migração.

---

## Decisões que exigem aprovação

1. **Identidade do Arqueiro:** DEX só speed/crit, ou DEX também gera ATK (B), ou híbrido (C)?
2. **Meta TTK 8–12:** vale para personagem esperado/médio, build otimizada, ou com gear on-level?
3. **Offline:** confirmar comunicação ao jogador de que ausências longas recuperam **≈2h** (já é o comportamento medido)?

Após essas decisões: pequena etapa de balanceamento **ou** seguir direto à **Fase 5 — Performance**.

---

## Riscos remanescentes

- Faint no catch-up encerra a sessão (produto atual).
- Multi-instância no mesmo `save.json` não suportada.
- Dissonância `primaryAttrForClass(ARQUEIRO)=dex` vs ATK=STR permanece até decisão UX/fórmula.
- Admin Backup/Map publish ainda disabled (fora deste escopo).

---

## Critério de conclusão

| Camada | Status |
|--------|--------|
| Integridade Fase 4 | **Confirmada** (130 pass, build OK, greps) |
| Estudo balanceamento | **Entregue** (números; sem retune) |
| Retune / Fase 5 | **Aguarda** decisões 1–3 acima |
