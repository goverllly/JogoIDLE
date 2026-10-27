# ECOS DO OCASO — Especificação Técnica (ET)

> **Versão:** 0.1 — Arquitetura proposta  
> **Data:** 25/10/2026  
> **Status:** Base de implementação; decisões marcadas como futuras não devem ser antecipadas  
> **Idioma:** Português brasileiro (pt-BR)  
> **Documento complementar:** `GDD_ECOS_DO_OCASO.md`

## 1. Objetivo técnico e abordagem

Construir um RPG Idle 2D para navegador com **motor de regras isolado da renderização**, testável e determinístico. A experiência inicial funciona localmente e, numa fase posterior, evolui para salvamento validado por servidor.

### 1.1 Decisões arquiteturais (ADRs iniciais)

| ID | Decisão | Motivo |
|---|---|---|
| ADR-001 | Phaser 4 para batalha 2D | Renderização e animações próprias para jogos web |
| ADR-002 | React + TypeScript + Vite para UI | Interfaces declarativas e desenvolvimento rápido |
| ADR-003 | Núcleo de jogo em TypeScript puro | Regras testáveis sem browser, Phaser ou React |
| ADR-004 | Monorepositório com npm workspaces | Compartilhar tipos, conteúdo e lógica com ferramentas familiares |
| ADR-005 | Passo lógico fixo de 100 ms | Resultados previsíveis independentes da taxa de quadros |
| ADR-006 | Aleatoriedade com PRNG e semente explícita | Repetibilidade e diagnósticos confiáveis |
| ADR-007 | Persistência local via adaptador IndexedDB | Prototipar sem exigir conta ou backend |
| ADR-008 | API Node.js + Fastify/PostgreSQL depois do MVP local | Evitar custos e complexidade antes de provar jogabilidade |
| ADR-009 | Textos via catálogo de localização pt-BR | Consistência, acessibilidade e correções globais |
| ADR-010 | Não usar iframe entre React e Phaser | Menos camadas, estado e comunicação mais simples |

A versão exata dos pacotes será fixada pelo `package-lock.json` quando o repositório for criado. Não atualizar automaticamente versões maiores sem validar compatibilidade e testes.

## 2. Stack de referência

**Cliente agora:** Node.js LTS suportado pelo conjunto instalado, npm, TypeScript, Vite, React, Phaser 4, Vitest, ESLint e Playwright para testes e2e. *O template oficial do Phaser já oferece uma integração React/TypeScript/Vite; verificar as versões reais após criação.*

**Servidor futuro:** Node.js, Fastify, PostgreSQL, Drizzle ORM (proposta), validação Zod, Pino e migrações versionadas. Autenticação e infraestrutura de deploy serão definidas quando houver necessidade de contas.

**Arte e dados:** atlas/spritesheets PNG/WebP, áudio em formatos web compatíveis, JSON/TS tipado para definições de jogo, IDs estáveis e controle de licenças de assets.

### 2.1 Inicialização sugerida

```bash
npm create @phaserjs/game@latest
# Escolher template React + TypeScript + Vite.
# Depois, adaptar gradualmente o projeto para npm workspaces.
```

Não sobrescrever o template com uma estrutura teórica de monorepositório antes de confirmar que a aplicação inicial executa. O primeiro commit deve ser o projeto gerado, funcional, seguido da extração dos módulos.

## 3. Organização do repositório

```text
ecos-do-ocaso/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/                 # entrada, rotas e composição da UI
│   │   │   ├── components/          # menus, HUD e inventário React
│   │   │   ├── game/                # integração e cenas Phaser
│   │   │   │   ├── scenes/
│   │   │   │   ├── renderers/
│   │   │   │   └── bridge/
│   │   │   ├── features/            # heróis, mapa, cidade, configurações
│   │   │   ├── i18n/                # mensagens em pt-BR
│   │   │   └── storage/             # adaptador local
│   │   └── public/assets/
│   └── api/                         # NÃO iniciar antes da fase online
│       └── src/
├── packages/
│   ├── motor/
│   │   └── src/
│   │       ├── combat/
│   │       ├── progression/
│   │       ├── loot/
│   │       ├── economy/
│   │       ├── offline/
│   │       ├── rng/
│   │       └── tests/
│   ├── conteudo/
│   │   └── src/                     # classes, itens, monstros e regiões
│   └── compartilhado/
│       └── src/                     # tipos, IDs, esquemas e contratos
├── docs/
│   ├── GDD_ECOS_DO_OCASO.md
│   └── ESPECIFICACAO_TECNICA.md
├── package.json
├── package-lock.json
└── README.md
```

**Regra de importação:** `web` e `api` podem importar `motor`, `conteudo` e `compartilhado`. `motor` só importa bibliotecas puras e `compartilhado`; não pode importar React, Phaser, DOM, banco ou API. `conteudo` não conhece telas nem banco.

A comunicação de eventos entre Phaser e React é tipada. O React lê projeções/snapshots da batalha e emite intenções permitidas; **Phaser nunca altera diretamente o estado canônico da conta**.

## 4. Modelo de domínio

### 4.1 Entidades conceituais

| Entidade | Responsabilidade | Identificador |
|---|---|---|
| Jogador | Configurações e progresso agregado | `playerId` |
| Herói | Classe, nível, XP e atributos permanentes | `heroId` |
| Equipe | Composição e posições de combate | `teamId` |
| Definição de habilidade | Efeito, alvo, recarga e requisitos | `skillId` |
| Definição de item | Modelo-base, espaço e regras de afixos | `itemDefinitionId` |
| Instância de item | Raridade, rolagens, dono, vínculo e melhoria | `itemInstanceId` |
| Região / estágio | Inimigos, desbloqueio e recompensas | `regionId` / `stageId` |
| Construção | Tipo, nível e custo do próximo aprimoramento | `buildingId` |
| Estado de batalha | Unidades, relógio lógico e estado do RNG | `battleId` |
| Recompensa | Ouro, XP, itens e origem de concessão | `rewardId` |
| Registro offline | Intervalo processado e resultado | `offlineClaimId` |

### 4.2 Contratos mínimos ilustrativos

```ts
export type HeroClass = 'GUERREIRO' | 'ARCANISTA' | 'ARQUEIRO';
export type ItemRarity = 'COMUM' | 'INCOMUM' | 'RARO' | 'EPICO' | 'LENDARIO';
export type EquipSlot = 'ARMA' | 'ELMO' | 'PEITO' | 'LUVAS' | 'BOTAS' | 'ANEL';

export interface Attributes {
  maxHp: number;
  attack: number;
  defense: number;
  speedPercent: number;
  critChancePercent: number;
}

export interface EquipmentInstance {
  id: string;
  definitionId: string;
  rarity: ItemRarity;
  level: number; // melhoria: 0..3 no MVP
  affixes: Array<{ id: string; value: number }>;
  equippedByHeroId: string | null;
}

export interface BattleInput {
  stageId: string;
  teamHeroIds: string[];
  seed: string;
  contentVersion: string;
}

export interface BattleResult {
  outcome: 'VICTORY' | 'DEFEAT';
  ticksElapsed: number;
  eventIds: string[];
  rewards: { gold: number; xpByHeroId: Record<string, number>;
             itemIds: string[] };
}
```

Contratos acima são **o ponto de partida**, não APIs já implementadas. Adicionar esquema validado de serialização, versão de save e IDs distintos para entidades runtime e entidades persistidas. Não guardar somente `itemIds` se o persistidor precisar das instâncias; recompensas devem ter um objeto/registro transacional completo.

### 4.3 Separação entre definição e instância

- **Definição:** dados estáticos e versionados, por exemplo `arco_vigia_01`.
- **Instância:** rolagem individual de item obtido, por exemplo UUID, afixos e melhoria.
- **Estado derivado:** atributos finais resultam de `base + nível + itens + efeitos temporários + construções`. Nunca salvar atributos temporários como se fossem permanentes.

## 5. Motor de combate determinístico

### 5.1 Loop lógico

- Passo lógico `TICK_MS = 100`.
- A renderização anima snapshots e eventos, não controla HP nem aplica dano.
- Acumular `delta` de quadro e executar ticks suficientes, com limite de recuperação por frame para preservar a UI.
- Na aba em segundo plano, a execução visual pode ser suspensa pelo navegador; no retorno, usar o mecanismo de recuperação offline.
- Ordenar eventos simultâneos por prioridade e ID estável. A ordem **não** depende de iteração incidental de objetos JavaScript.
- Usar PRNG com `seed` e estado serializável; **não usar `Math.random()` ou `Date.now()` dentro das regras do motor**.

```text
Comando: iniciar combate(stageId, teamSnapshot, seed)
  -> validar pré-condições
  -> criar BattleState inicial
  -> step(state, tick = 100 ms)
       aplicar efeitos contínuos e expiração
       avaliar cooldowns
       selecionar ações e alvos
       resolver dano / escudos / cura
       detectar morte / vitória / derrota
       emitir CombatEvent[]
  -> produzir snapshot e resultado
```

### 5.2 Fórmulas iniciais propostas

Estas fórmulas são **a fonte única de verdade** para o MVP e devem ser cobertas por testes de unidade:

```text
intervalo_ataque_ms = limitar(
  2000 / (1 + velocidadePercentual / 100), 500, 3000
)

mitigacao_defesa = 100 / (100 + max(0, defesaAlvo))

multiplicador_critico = 1.5 se crítico, senão 1.0
variacao = número do PRNG no intervalo [0.95, 1.05]

dano = max(1, floor(
  ataqueEfetivo * multiplicadorHabilidade
  * mitigacao_defesa * multiplicador_critico * variacao
))

xp_proximo_nivel(nivel) = floor(100 * nivel ^ 1.4)
```

- Ataque e defesa nunca podem ser negativos.
- Crítico é expresso em porcentagem e limitado a **0–60%** após todos os bônus no MVP.
- HP sempre limitado entre 0 e HP máximo efetivo.
- Escudos são aplicados antes do HP e seus efeitos devem ser registrados separadamente.
- Habilidades ofensivas usam o mesmo mitigador inicial, salvo quando seus dados especificarem explicitamente outra categoria de dano.
- Efeitos periódicos têm duração/ticks definidos; não usar `setTimeout` para regras de jogo.
- O arredondamento ocorre no instante de resolver dano/XP, nunca aleatoriamente em partes da UI.

### 5.3 IA automática mínima

1. Se há habilidade de defesa/cura pronta e a condição é satisfeita, usar prioridade de suporte.
2. Caso contrário, se a habilidade ofensiva de maior prioridade está pronta, usar.
3. Caso contrário, realizar ataque básico se o intervalo terminou.
4. Se nada está disponível, aguardar tick seguinte.

**Seleção de alvo ofensivo:** prioridade para inimigos de frente vivos; dentro da prioridade, menor porcentagem de HP; desempate por ID estável. **Alvo de escudo/cura:** aliado vivo com menor porcentagem de HP. Cada habilidade pode declarar uma regra específica que substitui o alvo padrão.

### 5.4 Estado e eventos

Eventos possíveis: `BATTLE_STARTED`, `ATTACK`, `DAMAGE`, `CRITICAL_HIT`, `HEAL`, `SHIELD`, `STATUS_APPLIED`, `UNIT_DEFEATED`, `WAVE_WON`, `PARTY_DEFEATED`, `REWARD_GRANTED`. Um evento inclui `battleId`, `tick`, `actorId`, `targetId?` e dados tipados.

O renderizador usa eventos como **instruções visuais**. Reconectar a cena ou desativar partículas não pode alterar o resultado da batalha.

### 5.5 Testes imprescindíveis

- Mesma semente + mesmo conteúdo + mesmo estado inicial = mesmo log de eventos e resultado.
- Defesa maior não aumenta dano recebido, mantidos os demais fatores.
- HP não fica negativo nem excede o máximo.
- Entidade morta não ataca nem recebe XP indevidamente.
- Cooldown não dispara duas vezes no mesmo tick.
- Aplicar/remover itens modifica atributos uma única vez, sem acumulação fantasma.
- Bônus de construção e crítico respeitam limites.
- Término de onda não concede recompensas duas vezes.

## 6. Conteúdo versionado e balanceamento

Todos os heróis, monstros, habilidades, equipamentos, estágios, saques e construções usam **dados tipados e validados**. Cada alteração publicável incrementa `contentVersion` e testa compatibilidade com saves anteriores.

### 6.1 Tabelas iniciais

- Classes: Guerreiro (160 HP, 14 ataque, 15 defesa, 0% velocidade, 5% crítico); Arcanista (95, 19, 5, 10%, 8%); Arqueiro (110, 17, 8, 15%, 10%).
- Slots: arma, elmo, peito, luvas, botas e anel.
- Raridades: comum, incomum, raro, épico, lendário.
- Item por vitória de inimigo comum: **20%** de chance; se cair, pesos **65/25/8/1,8/0,2** (somam 100%).
- Primeiro chefe: **item raro ou superior garantido apenas na primeira vitória**; repetições usam tabela própria.
- Inventário: 100 equipamentos; itens não empilham, recursos sim.
- Construções: Quartel +1% XP por nível; Forja permite melhoria até o nível da construção (máximo +3); Santuário +1% HP por nível; níveis de construção 1 a 3.
- Custos de melhorias de construções: 500 ouro do nível 1→2; 1.500 ouro do nível 2→3.
- Regiões: Bosque das Cinzas (1–5) e Criptas da Bruma (6–10), Guardião do Véu no estágio 10.

### 6.2 Regras de integridade

- Todos os pesos de raridade de uma tabela devem somar 100%, dentro da tolerância definida no validador.
- Todos os IDs referenciados por estágios, itens ou habilidades devem existir.
- Conteúdo não pode criar cooldowns negativos, loops de recompensas ou afixos incompatíveis.
- Recompensas de primeira vitória possuem flag persistente por estágio/chefe.
- O próprio conjunto de dados deve permitir simular milhares de lutas em CI para detectar alterações extremas de balanceamento.

## 7. Salvamento e recuperação offline

### 7.1 Persistência local (M0–MVP local)

Implementar interface `SaveRepository` com métodos de leitura, escrita atômica da perspectiva do aplicativo, backup e migração. Adaptador inicial: **IndexedDB**. Não acessar IndexedDB diretamente de componentes ou regras de combate.

Save contendo pelo menos:

```text
schemaVersion
contentVersion
playerId
heroes[] / unlockedStages[] / selectedStageId
team / inventory[] / equippedSlots
resources / buildings / firstClearFlags
battleCheckpoint (quando existir)
rngState / lastSimulatedAt / lastSaveAt
settings
```

**Momentos de salvamento:** ao concluir onda, trocar equipe/equipamento, aprimorar construção, mudar fase e em checkpoint temporizado; tentar salvar também quando a página passar ao estado oculto. Falhas de persistência devem bloquear concessões dependentes e exibir erro recuperável.

**Migração:** se `schemaVersion` mudar, migrar save em etapas, com cópia recuperável. Save corrompido deve oferecer recuperação e nunca ser silenciosamente apagado.

### 7.2 Progresso offline

Ao retornar, comparar o marco temporal válido com a hora atual, computar `elapsedMs` e restringir a **até 2 horas**. Aplicar simulação com o último estágio já desbloqueado selecionado para caça, sem desbloquear estágios novos offline.

```text
eligibleMs = min(max(0, now - lastSimulatedAt), 2h)
result = simulateOffline(checkpoint, eligibleMs, fixedStage, rngState)
applyRewardsOnce(result, offlineClaimId)
lastSimulatedAt = now
saveAtomically()
```

**Atenção:** esse fluxo é pseudocódigo. A implementação deve garantir transação/idempotência e reter o estado da simulação, inclusive quando o jogador fecha a página no meio do processamento. A simulação pode ser executada em **Web Worker** para não bloquear a renderização. Como são 72.000 ticks em duas horas com passo de 100 ms, medir custo real e processar em blocos; não substituir a lógica por multiplicação arbitrária de ouro/segundo.

**Regra anti-duplicação local:** `offlineClaimId` é único por intervalo/checkpoint; o mesmo claim aplicado duas vezes não pode somar recompensas novamente. O relógio local pode ser manipulado: isso é aceito apenas no protótipo offline e explicitamente **não serve para economia online**.

### 7.3 Versão online futura

O servidor se torna autoridade sobre `lastSimulatedAt`, inventário, ouro, progresso, recompensas e tempos; nenhuma API aceita do cliente quantidades arbitrárias de loot. Recuperar o tempo a partir do relógio confiável do servidor, em transação, com chave de idempotência e bloqueio/controle de versão.

## 8. Renderização e comunicação entre camadas

### 8.1 Phaser

- Uma `BattleScene` principal, responsável por sprites, fundo, partículas, feedback de dano e ciclo visual.
- Sprites com atlas, animações nomeadas, pontos de ancoragem definidos e limpeza de listeners ao desmontar.
- Reaproveitar objetos de dano flutuante e partículas para evitar criar/destruir centenas de nós por segundo.
- Limitar atualização visual em segundo plano; a lógica offline será recuperada posteriormente.

### 8.2 React

- UI de refúgio, mapa, heróis, inventário, construções, configurações e painéis de batalha.
- Componentes consomem estado derivado de snapshots, sem manipular diretamente a classe `Scene`.
- Ponte `GameBridge` com `subscribe`, `unsubscribe`, `dispatch(intent)` e `getSnapshot` tipados.
- Intenções válidas incluem `SELECT_STAGE`, `TOGGLE_AUTO_ADVANCE`, `PAUSE_VISUALS`, `EQUIP_ITEM` (validada fora do combate); mudanças mecânicas entram em vigor na próxima onda.
- Evitar criar múltiplas instâncias Phaser ao mudar menus. Uma única instância deve ser criada e descartada explicitamente no ciclo correto.

### 8.3 Localização

Manter chaves de idioma como `combat.victory`, `items.rarity.legendary`, `offline.duration` e `errors.save_failed`. Interface deve usar formatação `Intl.NumberFormat('pt-BR')` e `Intl.DateTimeFormat('pt-BR')` sem alterar números canônicos da simulação. Nunca concatenar textos traduzidos usando suposições sobre pluralização.

## 9. Back-end e API futuros (fora do primeiro protótipo)

**Objetivo:** compartilhar progresso entre dispositivos e garantir integridade das recompensas. Só iniciar esta camada após a demonstração da batalha, do inventário e da progressão local.

### 9.1 Recursos mínimos propostos

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/v1/me/state` | Carregar estado autorizado e versão |
| GET | `/v1/content/manifest` | Obter versão pública do conteúdo |
| POST | `/v1/me/expeditions/start` | Escolher estágio/equipe elegível |
| POST | `/v1/me/expeditions/claim` | Processar retorno e conceder ganhos de forma idempotente |
| POST | `/v1/me/equipment/equip` | Equipar item com validação de posse/slot |
| POST | `/v1/me/equipment/sell` | Vender item não equipado |
| POST | `/v1/me/buildings/:id/upgrade` | Gastar recursos e melhorar construção |

Cada operação mutável valida propriedade do recurso, pré-condições, `contentVersion`, limites, concorrência e identificador de idempotência quando houver concessão/gasto. A interface do jogador **não** envia `goldEarned`, `itemRarity` ou `experienceGranted` como autoridade.

### 9.2 Dados relacionais candidatos

`users`, `players`, `heroes`, `teams`, `equipment_instances`, `equipment_slots`, `unlocked_stages`, `first_clear_rewards`, `buildings`, `wallets`, `expedition_checkpoints`, `reward_transactions`, `save_revisions`.

Dados estáticos de classes/itens/regiões permanecem no catálogo versionado; o banco guarda IDs de referência, alterações individuais e eventos financeiros relevantes. Índices/constraints mínimos: identificadores únicos de instâncias e claims, chaves estrangeiras de dono, unicidade por `(heroId, slot)` e unicidade de primeira recompensa por `(playerId, stageId)`.

### 9.3 Segurança e observabilidade

- TLS obrigatório em produção; cookies de sessão `HttpOnly`, `Secure`, `SameSite` adequado e proteção CSRF conforme fluxo de autenticação escolhido.
- Rate limit, validação de entrada, logs estruturados sem segredos e erros padronizados.
- Transações para equipar/vender, conceder saques, subir construção e atualizar progresso.
- Auditoria básica de grants/gastos de recursos; monitorar erros, latência e tentativas inválidas.
- Nunca confiar na memória/localStorage/IndexedDB do cliente para confirmar recursos online.
- Guardar dados pessoais mínimos e definir política de privacidade antes da criação de contas públicas.

## 10. Desempenho, qualidade e compatibilidade

### 10.1 Metas iniciais

- 60 FPS alvo em desktop intermediário 1280×720; 30 FPS como mínimo desejável em dispositivos móveis suportados.
- A tela deve permanecer responsiva durante cálculo offline; usar Worker ou blocos assíncronos quando necessário.
- Evitar crescimento indefinido do array de eventos; manter log resumido, limitar número de partículas e usar pooling.
- Registrar métricas de FPS, tempo de cálculo por tick e tempo total de recuperação offline no ambiente de desenvolvimento.

### 10.2 Testes automatizados

| Tipo | Ferramenta sugerida | Casos prioritários |
|---|---|---|
| Unitários | Vitest | Dano, defesa, crítico, XP, cooldown, alvo e afixos |
| Propriedades / simulação | Vitest + geradores | Sementes repetidas, limites, economia e variações |
| Integração local | Vitest + IndexedDB de testes | Equipar, salvar, recarregar e impedir duplicações |
| E2E | Playwright | Tutorial, batalha, loot, inventário e construções |
| Validação de conteúdo | Scripts TypeScript | IDs, referências, probabilidades e progressão |
| Build / qualidade | `tsc`, ESLint, Vite | Ausência de erros, imports proibidos e bundle funcional |

### 10.3 Definição geral de pronto (DoD)

Uma tarefa só é considerada concluída quando:

1. Comportamento implementado com critério de aceite observável.
2. Cobertura de testes proporcional ao risco das regras alteradas.
3. `typecheck`, testes e build passam.
4. UI respeita o padrão visual e pt-BR; eventos e assinaturas são liberados corretamente.
5. Estado persiste, quando a funcionalidade exige persistência.
6. Erros são tratados e não geram premiações duplicadas.
7. Documentação e dados de conteúdo são atualizados na mesma mudança.
8. Resumo final apresenta arquivos alterados, comandos testados, limitações e eventual decisão pendente.

## 11. Plano técnico de implementação

### ETAPA 0 — Bootstrap e convenções

- Criar projeto a partir do template oficial React + TypeScript + Vite do Phaser 4.
- Verificar execução e build antes de mover arquivos.
- Configurar `tsconfig` estrito, formatação, testes, aliases e README.
- Extrair `packages/motor`, `conteudo`, `compartilhado`, ajustar npm workspaces e validar imports.

**Aceite:** o projeto renderiza uma cena e executa `dev`, `typecheck`, `test` e `build` pelo comando raiz configurado.

### ETAPA 1 — Combate mínimo (prioridade máxima)

- Criar atributos e runtime da batalha isolados do Phaser.
- Implementar relógio de 100 ms, ataque básico, defesa, alvo, vida, morte, resultado e eventos.
- Adicionar duas unidades aliadas e duas inimigas de teste em uma única cena.
- Cobrir seed determinística, dano, morte e ausência de duplicação.

**Aceite:** a arena executa uma luta completa sem cliques e sem erros no console; resultado reproduzível em teste.

### ETAPA 2 — Classes e habilidades

- Acrescentar três classes, equipe de até três heróis, progressão e habilidades.
- Integrar cooldown, escudo, efeito periódico, atordoamento e buffs básicos.
- Criar interface de heróis e comparador de atributos derivados.

**Aceite:** alterar classe, habilidade ou equipamento afeta simulações de forma comprovável.

### ETAPA 3 — Saque e inventário

- Criar definições de equipamento, raridades, instâncias, gerador de afixos e equipar/vender.
- Implementar inventário de 100 slots e caixa temporária de loot com política explícita antes de finalizar.
- Persistir as alterações no adaptador de save.

**Aceite:** uma vitória pode produzir equipamento que, equipado, altera os atributos, e tudo sobrevive ao recarregamento.

### ETAPA 4 — Regiões e offline

- Implementar dois mapas, dez estágios, chefe, desbloqueio e recompensas de primeira vitória.
- Acrescentar checkpoint e simulação offline de até duas horas, com resumo e idempotência.
- Testar saves interrompidos, relógio alterado e limitações do protótipo local.

**Aceite:** não desbloqueia fases offline, não duplica ganhos ao recarregar e respeita limite temporal.

### ETAPA 5 — Refúgio e polimento

- Implementar Quartel, Forja e Santuário com custos, bônus e níveis.
- Refinar HUD, assets originais, responsividade, sons, acessibilidade e desempenho.

**Aceite:** ciclo completo batalha → recompensa → equipamento/construção → próximo estágio funciona de ponta a ponta.

### ETAPA 6 — Contas e servidor (separada do MVP local)

- Desenhar autenticação, esquema PostgreSQL, migração de saves, API e autoridade de simulação.
- Implementar transações e claims idempotentes, migrações versionadas e observabilidade.

**Aceite:** o servidor não aceita alteração arbitrária de ouro/itens/XP, e o mesmo claim repetido nunca paga duas vezes.

## 12. Comandos esperados e convenções

Após configurar `package.json` da raiz, disponibilizar:

```bash
npm install
npm run dev       # iniciar aplicativo web
npm run test      # testes unitários e de integração
npm run typecheck # checagem TypeScript
npm run lint      # lint
npm run build     # build de produção
```

**Observação:** esses são os **scripts-alvo**, não comandos garantidos pelo template original. Criá-los gradualmente durante a Etapa 0. Adotar estilo consistente de nomes, evitar arquivos gigantes e não fazer `any` sem justificativa.

### 12.1 Convenções de Git

- `main`: estável e compilável.
- Alterações por fase/feature em branches curtas quando conveniente.
- Commits descritivos, por exemplo `feat(combat): implementar ataque automático determinístico`.
- Não incluir segredos, tokens, chaves privadas nem assets sem licença.
- Não executar push automático sem autorização explícita do responsável pelo repositório.

## 13. Guia de trabalho para IA/Cursor

Antes de gerar código, a IA deve:

1. Ler `docs/GDD_ECOS_DO_OCASO.md` e este documento.
2. Inspecionar a implementação atual e descrever o desvio em relação ao marco solicitado.
3. Propor alterações localizadas, mantendo APIs existentes quando possível.
4. Tratar o **motor como fonte de verdade**: nunca calcular XP, loot, crítico ou cooldown diretamente no componente React ou na cena Phaser.
5. Criar ou atualizar testes para cada regra nova.
6. Não introduzir backend, painel admin, animações 3D ou bibliotecas pesadas fora do escopo da etapa.
7. Finalizar com arquivos alterados, testes executados, resultados e limitações.

### Prompt de início recomendado

> Leia integralmente `docs/GDD_ECOS_DO_OCASO.md` e `docs/ESPECIFICACAO_TECNICA.md`. Quero executar **somente a Etapa 0 e, depois, a Etapa 1**. Audite o projeto atual, mostre um plano incremental de arquivos, implemente em pequenos passos, teste cada parte e não comece sistemas das etapas posteriores. Preserve textos de interface em pt-BR e use o motor de TypeScript puro como fonte de verdade. Ao encerrar, entregue uma demonstração jogável com dois heróis e dois inimigos atacando automaticamente, além dos testes de combate determinístico.

## 14. Riscos e decisões em aberto

- **Offline local:** não protege contra alteração do relógio ou edição de saves. Migrar para servidor autoritativo antes de elementos competitivos/compartilhados.
- **Capacidade e expiração do correio de saques:** decidir antes da Etapa 3; nenhum item deve desaparecer silenciosamente.
- **Segurança de contas:** escolher provedor/estratégia de autenticação somente na Etapa 6.
- **Fórmulas de cura e dano periódico:** detalhar com casos de teste ao implementar cada habilidade da Etapa 2.
- **Controle de desempenho:** o tick fixo não substitui otimização visual; perfil de CPU e GPU precisa de validação real.
- **Conteúdo adicional:** cada habilidade lendária necessita especificação de gatilho, limite, ordem de resolução e interação com escudos/críticos.
- **Plano de publicação:** decidir hospedagem, domínio, CDN e backups quando houver build publicável.

## 15. Referências técnicas verificadas

- Phaser — documentação oficial de instalação: https://docs.phaser.io/phaser/getting-started/installation
- Phaser — template oficial React + TypeScript: https://github.com/phaserjs/template-react-ts
- Phaser 4 — documentação/portal: https://phaser.io/phaser4
- Create Phaser Game — CLI oficial: https://github.com/phaserjs/create-game

**Regra:** verificar documentação e versões *instaladas* antes de aplicar exemplos de código. Este documento é uma especificação de produto, não declaração de que os pacotes já foram instalados.

---

**Próxima ação técnica:** gerar o template, confirmar execução, extrair o motor de combate e provar a primeira batalha automática. Nenhuma implementação de backend deve começar por padrão na Etapa 0.
