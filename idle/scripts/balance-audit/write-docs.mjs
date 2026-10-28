/**
 * Gera docs/balanceamento/*.md a partir dos CSVs/JSON (somente escrita de docs).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, DOCS, writeMd } from "./lib.mjs";

function load(name) {
  return JSON.parse(readFileSync(join(OUT, name), "utf8"));
}

const meta = load("00_meta.json");
const xp = load("xp_milestones.json");
const prog = load("simulacao_progressao.json");
const offline = load("idle_online_vs_offline.json");
const asc = load("ascensao_antes_depois.json");
const eq = load("equipamentos_meta.json");
const eco = load("economia_meta.json");
const skills = load("habilidades_meta.json");
const bal = load("balance_constants.json");
const analytic = load("hipotese_500_analitico.json");

const progTable = prog
  .map(
    (p) =>
      `| ${p.label} | ${p.classId} | ${p.gearCurve} | ×${p.xpMult} | **${p.hours}h** | ${p.kills} | ${p.faints} | ${p.gold.toLocaleString("pt-BR")} |`,
  )
  .join("\n");

writeMd(
  "01_AUDITORIA_GERAL.md",
  `# Auditoria Geral — Progressão e Balanceamento 1.0

> Gerado em ${meta.generatedAt}. **Somente leitura.** Sem alterações de produção.

## Situação atual (resumo executivo)

O Jogo IDLE, com as regras atuais do código, permite alcançar o **nível 500 (cap mortal) em aproximadamente 10–18 horas de caça efetiva** em perfis Guerreiro simulados — **abaixo de 24 horas**, confirmando a hipótese do design.

Fatores principais:

1. **XP por kill escala com o nível da zona** (\`mobXpPerLevel = 20\` → mob nível 450 ≈ 9000 XP).
2. **Mobs calibrados para um “jogador médio”** (\`expectedPlayerPower\`), então gear/refine/build acima da média **derretem o TTK**.
3. **Curva de XP suave** (expoentes 1.4→1.22) — total até 500 ≈ **96,7 milhões de XP**.
4. **Refine +10 com 100% de sucesso** e +5 por estatística alvo.
5. **Buffs de fazenda** até +25% XP; Celestial +15% XP abaixo do 100.

## Configurações efetivas vs defaults

| Item | Default código | Standalone (\`save.json\`) | Produção |
|------|----------------|---------------------------|----------|
| \`dropChance\` | **0.11** | **0.016** (divergente) | N/A (DB não acessível neste repo) |
| \`__world.balance\` | DEFAULT_BALANCE | **vazio** (= defaults) | N/A |
| Overrides de zona | BASE_ZONES | nenhum | N/A |

**Impacto da divergência de drop:** no standalone, drops de equipamento são ~7× mais raros que o default do código. A progressão de **nível/XP** (simulada) ainda é rápida; a progressão de **poder via loot** fica mais lenta localmente. Produção pode diferir — validar \`jogo_idle_catalog_state\`.

## Personagens observados no save local (evidência histórica)

${meta.liveCatalog.characterSnapshots
  .map(
    (c) =>
      `- **${c.name}** (${c.classId}): Nv.${c.level}, ascension=${c.ascension}, gold=${c.gold}, criado ${c.createdAt}`,
  )
  .join("\n")}

Observação: há Celestiais locais em níveis baixos pós-ritual com ouro alto — compatível com progressão acelerada pré-ritual.

## Problemas por gravidade

| Gravidade | Problema | Evidência |
|-----------|----------|-----------|
| **Crítica** | Cap mortal (~500) em &lt;1 dia de caça efetiva | \`simulacao_progressao.json\`: 10–18h |
| **Crítica** | TTK colapsa com gear/refine acima do “jogador médio” usado na calibração de mobs | \`data.ts\` \`expectedPlayerPower\` + \`ttk_por_nivel.csv\` |
| **Alta** | Refine 100% sucesso, +5/nível, até +10 | \`inventory.ts\` refineItem; \`refinamento.csv\` |
| **Alta** | Ouro ao 500 (~21–29M) &gt; custo do ritual (10M) com folga | simulações |
| **Alta** | Ataque do Arqueiro usa STR, não DEX — DEX só crit/velocidade | \`computeStats\` + sim Arqueiro 36h |
| **Média** | \`CLASSES.growth\` declarado mas **não aplicado** no level-up | \`character.ts\` / \`data.ts\` |
| **Média** | Offline: 2h/request; 5000 ticks pode cortar antes das 2h | \`combat.ts\` |
| **Média** | Drop standalone 0.016 vs 0.11 default | \`save.json\` |
| **Baixa** | Missões/engajamento desligados no standalone | README |

## Sistemas mais desbalanceados (ordem)

1. Ritmo XP × escala de zona  
2. Calibração de monstros vs poder real do player  
3. Refinamento  
4. Economia (sinks insuficientes até o ritual)  
5. Identidade de atributos por classe (Arqueiro)

## Recomendações prioritárias (não implementadas)

Ver \`11_PROPOSTA_REBALANCEAMENTO.md\` e \`12_RESUMO_PARA_DECISAO.md\`. Preferência analítica: **Cenário B (Equilibrado)**.

## Fontes

- \`idle/lib/jogo-idle/game/balance.ts\`, \`data.ts\`, \`character.ts\`, \`combat.ts\`, \`inventory.ts\`, \`items.ts\`
- Dados: \`docs/balanceamento/data/*\`
- Script: \`idle/scripts/balance-audit/run-all.mjs\`
`,
);

writeMd(
  "02_NIVEIS_E_EXPERIENCIA.md",
  `# Níveis e Experiência

## Fórmula (\`balance.ts\` — comprovado)

\`\`\`
xpToNextLevel(L):
  L < 50  → floor(100 * L^1.4)
  L < 150 → floor(120 * L^1.32)
  L < 350 → floor(160 * L^1.28)
  else    → floor(220 * L^1.22)
\`\`\`

Caps: Mortal **500**, Celestial **700** (mesma curva de XP).

## Marcos

| Nível | XP → próximo | XP acumulada até o nível |
|------:|-------------:|-------------------------:|
${xp.rows.map((r) => `| ${r.level} | ${r.xpToNext.toLocaleString("pt-BR")} | ${r.totalXpToReach.toLocaleString("pt-BR")} |`).join("\n")}

**Total XP até 500:** ${xp.totalXpTo500.toLocaleString("pt-BR")}  
**Total XP até 700:** ${xp.totalXpTo700.toLocaleString("pt-BR")}

CSV completo: \`data/xp_por_nivel.csv\`.

## Fontes de XP (comprovado)

| Fonte | Existe? | Detalhe |
|-------|---------|---------|
| Kill farm (\`applyRewards\`) | Sim | Única fonte no motor de caça |
| Mult skill fazenda | Sim | 1.15 / 1.2 / 1.25 |
| Celestial Lv&lt;100 | Sim | ×1.15 |
| Engagement options | Sim (produção) | \`xpMult\` server-side |
| Missões standalone | Não | claim 410 |
| Diferença online/offline XP/kill | Não | mesma fórmula; offline limita **tempo/ticks** |

XP do monstro (\`scaleMonster\`): \`max(8, round(level * mobXpPerLevel * xpMult * (boss?2.2:1)))\` com \`mobXpPerLevel=20\`.

## Hipótese nível 500 em 24h

### Simulação de ciclo completo (calculado)

Caça com ataques, intervalo, críticos, bloqueio Guerreiro, mortes, troca automática de região (maior \`minLevel\` acessível), atributos por nível e curvas de gear:

| Perfil | Gear | XP mult | Horas até 500 | Kills | Faints | Ouro |
|--------|------|---------|--------------:|------:|-------:|-----:|
${progTable}

**Conclusão:** para Guerreiro, **10–18h de processamento efetivo** bastam. A hipótese “1 dia” é **confirmada** e até subestimada para builds físicas otimizadas.

### Limite analítico (zona fixa — estimado)

Se o jogador ficasse só em \`floresta\` (20 XP/kill), seriam milhões de kills — irrealista. Em \`trono\` (~9000 XP/kill) o piso analítico otimista ≈ 30h com TTK artificial de 10s. A simulação real fica **mais rápida** porque TTK cai muito abaixo de 10s em endgame.

### 24h corridas vs efetivas vs sync

Ver \`09_IDLE_E_PROGRESSAO_OFFLINE.md\` e \`data/idle_online_vs_offline.json\`.
`,
);

writeMd(
  "03_ATRIBUTOS_E_CLASSES.md",
  `# Atributos e Classes

## Pontos distribuíveis (comprovado)

| Contexto | Pontos |
|----------|--------|
| Por level-up Mortal | **5** |
| Por level-up Celestial | **10** |
| Bônus no ritual | **+20** unspent |
| Total só de levels até 500 mortal | (500-1)×5 = **2495** |
| \`CLASSES.growth\` | **NÃO aplicado** no level-up |

CSV: \`atributos_por_nivel.csv\`, \`atributos_por_nivel_celestial.csv\`.

## Fórmulas \`computeStats\` (comprovado — \`character.ts\` + \`balance.ts\`)

| Stat | Fórmula |
|------|---------|
| maxHp | round(90 + CON×14 + nível×6 + hpFlat) |
| maxMp | round(45 + INT×12 + nível×3 + mpFlat) |
| ATK físico | round(6 + STR×2.2 + attackFlat) |
| ATK mágico | round(6 + INT×2.4 + attackFlat) |
| attack usado | Mago → mágico; senão físico |
| defense | round(3 + CON×1.2 + STR×0.25 + defFlat) |
| intervalo | max(420, round(1450 − DEX×7)) ms |
| crit | min(0.45, DEX×0.0025 + critFlat/100) |

### +1 ponto — impacto absoluto (nível 50, attrs base da classe)

Ver \`impacto_atributos.csv\`. Resumo aproximado:

- **+1 STR:** +2.2 ATK físico; +0.25 DEF  
- **+1 INT:** +2.4 ATK mágico; +12 MP  
- **+1 DEX:** −7 ms intervalo; +0.25% crit  
- **+1 CON:** +14 HP; +1.2 DEF  

## Problema de classe: Arqueiro

\`computeStats\` **não** usa DEX no ataque. Arqueiro que investe em DEX ganha velocidade/crítico, mas o dano base continua dependente de STR. Simulação \`E_arqueiro_strong\` levou **36h** até 500 vs **10h** Guerreiro equivalente — evidência de atributo “primário” desalinhado com a fantasy da classe.

## Passivas de combate

- Guerreiro: 12% chance de zerar hit recebido  
- Mago: basic ×0.55; +4% MP no kill  
- Bárbaro: rage (skills), não MP  

## Builds (nível 100)

Ver \`classes_e_builds.csv\`. Builds full_str (ou full_int no Mago) dominam DPS básico; full_con maximiza sobrevivência com baixo DPS; full_dex acelera hits mas pouco ATK (exceto se STR já alto).
`,
);

writeMd(
  "04_EQUIPAMENTOS_E_REFINAMENTO.md",
  `# Equipamentos e Refinamento

## Catálogo

- Templates: **${eq.templateCount}** (\`listCatalog\`)  
- Raridades: common → legendary (pesos 600/260/…/8; mults 1→2.8) — \`raridades.csv\`  
- Amostra: \`equipamentos.csv\`

## Drops efetivos

| Ambiente | dropChance trash | boss × |
|----------|-----------------:|-------:|
| Default código | 0.11 | ×2.5 (típico) |
| Standalone live | **0.016** | idem mult |

## Refinamento (comprovado)

| Item | Valor |
|------|------:|
| Máximo | **+10** |
| Bônus | **+5** por nível em cada \`refineTarget\` |
| Chance de sucesso | **100%** |
| Falha / quebra / regressão | **Não existem** |
| Custo | 1× Refinador (sem ouro na ação) |
| Preço mercador Refinador | ${eq.merchantDefaults.refiner.toLocaleString("pt-BR")} |

CSV: \`refinamento.csv\`, \`refinamento_conjunto.csv\`.

### Impacto de conjunto

8 peças em +10 (1 atr alvo cada) ≈ **+400** na estatística primária agregada ≈ **+880 ATK** se tudo em STR (×2.2) — suficiente para colapsar TTK on-level.

**Diagnóstico:** o refine **não destrói sozinho** o jogo, mas combinado com calibração de mobs para “jogador médio” sem gear forte, **sim — torna monstros irrelevantes cedo**. Gravidade: **Alta**.

## Quando o gear fica “forte demais”

Simulações TTK (\`ttk_por_nivel.csv\`): com gear \`strong\`, bosses on-level morrem sem faint em faixas altas; sem gear há faints. O ponto de virada é gradual (~nível 50–100 com loot/refine), acelerado se o dropChance for o default 0.11.
`,
);

writeMd(
  "05_MONSTROS_MAPAS_E_CHEFES.md",
  `# Monstros, Mapas e Chefes

## Inventário

| Tipo | Quantidade |
|------|----------:|
| Regiões (BASE_ZONES) | **17** |
| Monstros trash | **34** (2/zona) |
| Chefes (1/zona) | **17** |
| Classes | **4** |

CSVs: \`regioes.csv\`, \`monstros.csv\`, \`chefes.csv\`, \`regiao_dificuldade_deltas.json\`.

## Calibração (\`scaleMonster\`)

Mobs miram TTK de ~10 hits (boss ~28) contra \`expectedPlayerPower(level)\` — attrs médios **sem** gear top. Qualquer poder acima dessa linha reduz o desafio.

## Curva de regiões

Progressão tipicamente \`floresta\` → … → \`trono\` / \`eter\` / \`prova_divina\` / zonas Celestial (\`firmamento\`, \`nexus\`, …).  
Prova Divina: \`mortalOnly\`, bossHpMult 2.2, refineDropChance 0.

## XP/hora simulada (Guerreiro gear gradual)

Ver \`xp_por_hora_regiao.csv\` — sobe ordens de magnitude do early para o late (dezenas de mil → milhões de XP/h), o que explica o fechamento rápido do gap até 500.

## Chefes

- Aparecem após \`zoneBossWaveSize\` (padrão 8; late 10–12).  
- Recompensas XP/ouro agregadas (~1.75× soma dos trash na construção).  
- Estratégia: majoritariamente **DPS + sobrevivência**; passivas/classes ajudam, mas não há “puzzle” de chefe além de stats.
`,
);

writeMd(
  "06_ECONOMIA_E_RECOMPENSAS.md",
  `# Economia e Recompensas

## Fontes e sinks (comprovado)

Fontes: ${eco.goldSources.join(", ")}  
Sinks: ${eco.goldSinks.join(", ")}

## Números

- \`mobGoldPerLevel\` = ${eco.mobGoldPerLevel}  
- Ritual Divindade = **${eco.ritualCost.toLocaleString("pt-BR")}**  
- Simulações até 500: **~21–29 milhões** de ouro acumulado (sem gastar em mercador)

## Diagnóstico

O jogador **acumula ouro além do necessário** para o ritual com folga se farmar até 500. Sinks intermediários (mochila 150k, refinador 25k, pets 40–100k, reset 1M) são pequenos frente à receita late-game. Gravidade: **Alta** para endgame mortal; **Média** early.
`,
);

writeMd(
  "07_HABILIDADES_E_PETS.md",
  `# Habilidades e Pets

## Farm tree

- 3 skills × 4 classes = **12**  
- Mults XP/ouro/dano: **${skills.farmMults.join(" / ")}**  
- Ativa uma por vez  

## Combat bar

- **${skills.combatSkillsPerClass}**/classe (**${skills.combatSkillsTotal}** total)  
- Dano: \`(attack × damageMult + maxMp×mpScale) × … − DEF monstro\`  
- Mago basic × **${skills.mageBasicMult}**  
- Guerreiro block **${skills.warriorBlockChance}**

## Pets

Sem % de combate/XP. Efeitos: auto-equip, auto-sell fora de classe, ou ambos (papagaio). Aceleram **qualidade de inventário/ouro**, não o DPS direto.

## Diagnóstico

Farm XP +25% é acelerador relevante mas **secundário** frente à escala XP×nível da zona. Skills de combate importam mais em TTK de boss; builds básicas já limpam trash rápido no late.
`,
);

writeMd(
  "08_ASCENSAO_CELESTIAL.md",
  `# Ascensão Celestial

## Requisitos (comprovado)

- Nível **${asc.requirements.level}**
- Ouro **${asc.requirements.gold.toLocaleString("pt-BR")}**
- Item **${asc.requirements.item}** (drop Prova Divina + pity)

## Antes → Depois (simulação espelho)

| Campo | Antes (Mortal 500) | Depois (Celestial 1) |
|-------|--------------------|----------------------|
| Nível | 500 | **1** |
| Atributos | preservados | preservados |
| Equipamentos | preservados | preservados |
| Skills | preservados | preservados |
| Unspent | — | **+20** |
| Farm | ativo possível | **limpo** |
| Gold | −10M | |

HP/ATK mudam pelo termo \`level×levelHp/Mp\` (nível 1 vs 500), mas **attrs+gear** mantêm o grosso do poder. Um Celestial 1 com full gear mortal é **muito mais forte** que um Mortal 1.

Detalhe JSON: \`ascensao_antes_depois.json\`.

## Vantagens reais do Celestial

| Benefício | Existe? |
|-----------|---------|
| Cap 700 | Sim |
| 10 pts/nível | Sim |
| ×1.15 XP &lt;100 | Sim |
| Zonas Celestial | Sim (\`requiresAscension\`) |
| Título/capa | Sim |
| Reset total de poder | **Não** (gear/attrs ficam) |
| Nova árvore exclusiva | Não além de zonas/cap |

## Vale a pena?

Sim como **prestígio + endgame de zonas + ritmo de pts**, mas o ritual **não é um soft-reset de poder**. Quem chega ao 500 já carrega o poder; o desafio pós-ascensão depende das zonas Celestial acompanharem esse poder (hoje calibradas pela mesma \`expectedPlayerPower(level)\` do nível **atual**, ou seja, Celestial 1 enfrenta mobs de nível de zona alto com stats de mob altos — verificar TTK nas zonas \`firmamento\`/\`nexus\`).

## Tempo até ritual

≈ tempo até 500 (**10–18h** simuladas) + farm de Suco na Prova Divina (RNG; pity). Não inventar horas de pity — depende de drops.
`,
);

writeMd(
  "09_IDLE_E_PROGRESSAO_OFFLINE.md",
  `# Idle e Progressão Offline

## Limites (comprovado — \`combat.ts\`)

| Limite | Valor |
|--------|------:|
| maxCatchUpMs | **2 horas** por request |
| maxTicks | **5000** (default) |
| Catch-up ID | após ≥60s elapsed |

## Interação 2h × 5000 ticks

- Se TTK é baixo (endgame), **5000 ticks** acabam em minutos de tempo de combate simulado — o jogador precisa de **vários requests** para consumir 2h de elapsed.  
- Se TTK é alto, as **2h** limitam primeiro.  
Simulação D em \`idle_online_vs_offline.json\`: chunk processou ~1.5h de fightMs com kills altos.

## Comparativo 24h (nível 50, zona on-level)

| Cenário | Horas recompensadas | XP |
|---------|--------------------:|---:|
${offline.map((o) => `| ${o.scenario} | ${o.rewardedHours ?? "—"} | ${(o.xp ?? "—").toLocaleString?.("pt-BR") ?? o.xp} |`).join("\n")}

**Uma sync após 24h offline** só paga **2h**. Sync a cada 2h aproxima o online, ainda sujeito ao teto de ticks.

## Riscos de integridade (análise, sem exploit)

- \`STALE_CHARACTER\` / \`updatedAt\` mitiga writes concorrentes.  
- \`offlineCatchUpId\` + journey idempotência reduzem double-count de estatísticas.  
- Relógio do cliente não governa recompensas (servidor usa \`Date.now()\` e \`lastTickAt\`).
`,
);

writeMd(
  "10_SIMULACOES_DE_BALANCEAMENTO.md",
  `# Simulações de Balanceamento

## Premissas

- Script: \`idle/scripts/balance-audit/run-all.mjs\`  
- Seed base: **42** (Mulberry32); variantes por perfil  
- Motor espelhado: intervalo, crit ×1.8, DEF monstro, block 12%, mago ×0.55  
- Skills de barra **não** 100% modeladas em todos os perfis (farm mult aplicado como xpMult externo)  
- Gear “gradual/strong” é **aproximação de aquisição**, não loot table Monte-Carlo completo  
- Produção: não simulada (sem DB)

## Resultados-chave

### Progressão até 500

Ver tabela em \`02\` / \`simulacao_progressao.json\`.

### Hipótese 24h

**Confirmada** para Guerreiro (10–18h efetivas). Arqueiro dump DEX: mais lento (36h no perfil strong).

### Offline

Sync única 24h wall → 2h reward. Ver \`09\`.

### Arquivos

Todos em \`docs/balanceamento/data/\` com coluna \`source\` ∈ {code, calculated, simulated, estimated}.
`,
);

writeMd(
  "11_PROPOSTA_REBALANCEAMENTO.md",
  `# Proposta de Rebalanceamento (NÃO IMPLEMENTAR)

Três cenários. Objetivos de tempo são **propostas para decisão**, não requisitos.

## Situação atual (referência)

- Guerreiro → 500: **~10–18h** caça efetiva  
- Ouro ao 500: **~21–29M**  
- Refine: 100% até +10  

## Cenário A — Conservador

**Ideia:** frear XP late e sucatear um pouco o refine, sem redesenhar classes.

| Alvo | Atual | Proposta A |
|------|-------|------------|
| mobXpPerLevel | 20 | 14–16 |
| Expoente XP L≥350 | 1.22 | 1.28–1.30 |
| Refine sucesso | 100% | 100% até +5; 70–85% depois |
| REFINE_STAT_BONUS | 5 | 4 |

**Efeito estimado:** 500 em **~2–4 dias** de 2–3h/dia (ordem de grandeza). Risco baixo de frustração early.

## Cenário B — Equilibrado (recomendado)

Coordenado:

1. **XP:** reduzir \`mobXpPerLevel\` e endurecer curva L>200.  
2. **Mobs:** calibrar \`expectedPlayerPower\` incluindo **gear esperado por faixa** (não attrs nus).  
3. **Refine:** chance de falha sem quebra a partir de +6; teto de bônus menor ou soft-cap.  
4. **Economia:** sinks recorrentes (reparo/upkeep/consumíveis) ou custo ritual dinâmico.  
5. **Classes:** Arqueiro — parcela de DEX→ATK ou ATK híbrido.  
6. **Celestial:** zonas pós-ritual com floor de poder baseado em **poder ao ritualizar**, não só level 1.

**Efeito estimado:** 500 em **~1–2 semanas** casual (1–2h/dia); otimizado **~4–7 dias**. Celestial volta a ser marco.

## Cenário C — Desafiador

- XP bem mais baixa late; bosses com mecânicas/enrage  
- Refine com regressão possível em +8–10  
- Soft gate de região por poder (não só level)  
- Ritual consome parte do gear ou exige set específico  

**Efeito estimado:** 500 em **3–6 semanas** casual. Risco alto de churn se comunicação for má.

## O que NÃO fazer isoladamente

- Só multiplicar HP dos mobs (inflação sem decisão).  
- Só multiplicar XP necessária sem mexer em TTK/gear (sensação de “grind vazio”).
`,
);

writeMd(
  "12_RESUMO_PARA_DECISAO.md",
  `# Resumo para Decisão

## O jogo está fácil demais?

**Sim**, no eixo nível/cap mortal. Simulações: **nível 500 em 10–18h** de caça efetiva (Guerreiro).

## Top 5 causas

1. XP de monstro ∝ nível da zona com coeficiente alto (20).  
2. Mobs balanceados para player **sem** gear top.  
3. Refine barato, seguro e forte (+5 × 10 × muitas peças).  
4. Curva de XP não explode o suficiente no late.  
5. Sinks de ouro fracos até o ritual.

## Divergência operacional

Standalone usa **dropChance 0.016** (default 0.11). Isso **não** impede rush de nível; só freia loot. Validar produção antes de cravar números de drop.

## Decisões pedidas a você

1. Qual tempo-alvo até 500 (dias de jogo real)?  
2. Refine deve poder falhar?  
3. Arqueiro deve escalar ATK com DEX?  
4. Celestial deve soft-resetar poder ou só nível?  
5. Cenário A, B ou C?

## Recomendação da auditoria

**Cenário B — Equilibrado**, com prioridade: (1) XP late, (2) calibração de mobs com gear, (3) risco no refine alto, (4) ATK do Arqueiro, (5) sinks/ritual.

## Produção

Não acessível aqui. Próximo passo de validação: ler \`jogo_idle_catalog_state\` em modo somente leitura no app pai.

---

**Nenhuma alteração de balanceamento foi aplicada.** Aguardando decisão explícita.
`,
);

console.log("Markdown reports written to", DOCS);
