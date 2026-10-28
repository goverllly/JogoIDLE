# ECOS DO OCASO — Documento de Design do Jogo (GDD)

> **Versão:** 0.1 — Fundação de produto  
> **Data:** 25/10/2026  
> **Status:** Proposta inicial para desenvolvimento e validação  
> **Idioma:** Português brasileiro (pt-BR)  
> **Nome:** *Ecos do Ocaso* (provisório; nome comercial não decidido)  
> **Documento complementar:** `ESPECIFICACAO_TECNICA.md`

## 1. Resumo executivo

**Ecos do Ocaso** é um RPG Idle 2D de fantasia sombria, inicialmente para navegador, em que o jogador comanda uma pequena companhia de heróis, define sua estratégia, equipa itens e recupera uma fortaleza enquanto os combates acontecem automaticamente em tempo real.

**Promessa central:** *o jogador toma decisões interessantes, e o jogo executa as batalhas*. O resultado do combate deve ser fácil de compreender, agradável de assistir e recompensador de otimizar.

### 1.1 Objetivo do MVP

Publicar um protótipo jogável, com identidade própria, em que seja possível:

1. Formar uma equipe de até **três heróis**, inicialmente um por classe.
2. Assistir a combates automáticos em uma arena 2D lateral.
3. Vencer estágios, receber ouro e equipamentos e melhorar atributos.
4. Visitar **duas regiões** com dez estágios no total.
5. Gerenciar inventário, seis espaços de equipamento por herói e três construções.
6. Salvar o progresso localmente e processar até **duas horas** de progresso offline.

**Não é objetivo do MVP:** PvP, multiplayer, comércio entre jogadores, gacha, monetização, temporadas, mundo aberto, customização 3D ou múltiplas expedições simultâneas.

## 2. Público e plataformas

- **Público principal:** pessoas que gostam de RPG, saques, equipamentos e progressão automatizada.
- **Sessão ideal:** 3–10 minutos para revisar saques e tomar decisões, com possibilidade de acompanhar batalhas por mais tempo.
- **Plataforma inicial:** navegador de desktop. Interface adaptável para celular, sem compromisso com aplicativo nativo na versão inicial.
- **Modelo de negócio:** indefinido; nenhuma mecânica de monetização deve influenciar o balanceamento do MVP.
- **Idioma do produto e das mensagens:** pt-BR, inclusive acessibilidade, tutoriais e mensagens de erro.

## 3. Pilares de design

1. **Combate verdadeiramente automático.** Ataques, seleção de alvos e habilidades ocorrem sem cliques repetitivos.
2. **Itens com significado.** Raridade e afixos modificam escolhas; itens lendários devem abrir estratégias, não somente números maiores.
3. **Decisões claras.** Montar a equipe, equipar, aprimorar e selecionar uma região devem produzir consequências visíveis.
4. **Progressão honesta.** Recompensas, taxas, limites offline e custos são explicados de forma transparente.
5. **Fidelidade visual.** Cenários, animações, efeitos e HUD devem parecer partes do mesmo mundo.
6. **Crescimento sustentável.** Conteúdo e sistemas precisam ser adicionáveis sem refazer o motor a cada novidade.

### 3.1 Princípios negativos

- Não copiar nomes, ilustrações, interface exata, personagens ou arquivos de jogos de referência.
- Não transformar o jogador em operador de um sistema complicado de menus.
- Não recompensar cliques manuais incessantes.
- Não lançar uma coleção de recursos parcialmente implementados.

## 4. Universo, tema e narrativa

O mundo de **Nárion** foi partido após o apagamento das chamas que protegiam os antigos santuários. Ecos de memórias despertam nas ruínas e criaturas cobertas de cinzas avançam contra os últimos refúgios. O jogador assume o comando da **Fortaleza do Limiar**, reúne combatentes e investiga a origem do Ocaso.

A narrativa deve ser entregue em fragmentos curtos antes de chefes, descobertas de regiões, descrições de equipamentos e melhorias da cidade. A história complementa o jogo; não interrompe o combate com longas sequências obrigatórias.

**Ato inicial:** a equipe retoma o Bosque das Cinzas, encontra vestígios de uma vigília perdida e segue para as Criptas da Bruma, onde enfrenta o **Guardião do Véu**.

> Todos os nomes deste capítulo são provisórios e próprios do projeto. Alterações futuras devem preservar os identificadores técnicos de conteúdo ou utilizar migrações.

## 5. Direção artística e experiência

### 5.1 Estilo

- **Formato:** 2D lateral (side view), com cenários pintados, elementos em camadas e animações por sprites.
- **Tom:** fantasia sombria e melancólica, com contraste suficiente para leitura de personagens e golpes.
- **Paleta inicial:** azul-petróleo escuro `#10242B`, carvão `#15191F`, pergaminho `#E6D9BC`, dourado envelhecido `#B9985A`, vermelho de perigo `#B94C49`, violeta arcano `#8555AA`.
- **Tipografia:** fonte de leitura simples no corpo; fonte de fantasia apenas em títulos curtos.
- **Feedback:** dano normal discreto; crítico destacado; cura e escudo com cores e símbolos próprios; opção de reduzir efeitos visuais.

### 5.2 HUD de referência funcional

**Desktop:** cidade/refúgio e menu de navegação em uma coluna; batalhas em painéis maiores; lista de equipe e estados em faixa lateral; atalhos para inventário e missões. **Celular:** uma batalha em foco e navegação por abas.

O layout final será validado com protótipo em resolução 1280×720 antes da produção de arte definitiva. O jogador deve conseguir reconhecer HP, aliados, inimigos, progresso, saque e ação atual sem depender da cor.

### 5.3 Telas do MVP

| Tela | Função primária |
|---|---|
| Visão do refúgio | Mostrar construções, moeda, alertas e batalhas disponíveis |
| Combate | Acompanhar a equipe, estágio, inimigos e resultados |
| Heróis | Comparar atributos, habilidades e equipamentos |
| Inventário | Filtrar, comparar, equipar e vender itens |
| Mapa | Escolher região/estágio desbloqueado |
| Construções | Aprimorar Quartel, Forja e Santuário |
| Relatório offline | Resumir tempo, vitórias, ouro, experiência e itens obtidos |
| Configurações | Som, efeitos, desempenho e opções de acessibilidade |

## 6. Ciclo principal de jogo

### 6.1 Ciclo curto — 15 a 60 segundos

1. Uma equipe entra em combate automaticamente.
2. Inimigos executam sua IA e habilidades com prioridades fixas.
3. Ao derrotar a onda, os heróis recebem experiência e ouro; há chance de item.
4. O jogador percebe mudanças por animações, números de dano e resumo de recompensas.
5. A equipe continua em caça ou avança, conforme a configuração selecionada.

### 6.2 Ciclo médio — 3 a 10 minutos

1. Revisar itens recebidos.
2. Equipar combinações melhores e analisar bônus.
3. Gastar ouro na Forja ou em construções.
4. Selecionar estágio mais difícil ou repetir uma região para coletar recursos.

### 6.3 Ciclo longo — dias

1. Desbloquear novas regiões e derrotar chefes.
2. Evoluir classes, construções e conjuntos de equipamento.
3. Descobrir jogo-idles que permitam vencer desafios superiores.
4. Retornar após períodos ausentes para receber recompensas limitadas.

**Regra:** o ciclo de combate/recompensa deve ser divertido e compreensível antes de adicionar cidade ou narrativa complexa.

## 7. Combate automático

### 7.1 Regras básicas

- Combate em tempo real simulado por um motor determinístico com passo lógico fixo; detalhes na especificação técnica.
- Equipe de **até três heróis**, posicionados em frente e retaguarda. No primeiro protótipo técnico, bastam dois heróis.
- Uma onda tem de um a cinco inimigos, dentro dos limites de desempenho definidos.
- Ações possíveis: ataque básico, habilidade automática, efeito contínuo, escudo, cura, morte.
- **Sem controle manual de golpes:** o jogador pode pausar, escolher cenário e alterar a equipe fora da batalha.
- Alvos são selecionados pela IA; primeira prioridade padrão: linha de frente inimiga, depois menor porcentagem de vida, com desempate determinístico.
- Habilidades são usadas automaticamente quando disponíveis, respeitando requisitos e tempo de recarga.
- Um combate termina quando todos os inimigos ou todos os heróis estiverem derrotados.

### 7.2 Vitória, derrota e continuidade

- **Vitória:** concede recompensas e desbloqueia o próximo estágio quando aplicável.
- **Avanço automático ativo:** tenta o próximo estágio liberado na mesma região ou segue a progressão definida; sem avanço, repete o estágio atual.
- **Derrota:** não remove equipamentos; a equipe repousa por 10 segundos e tenta novamente o mesmo estágio, salvo se o jogador mudar o destino.
- **Limite de conteúdo:** ao completar o último estágio disponível, a equipe repete a fase desbloqueada escolhida para caça.
- Trocas de equipamento/posição durante combate entram em vigor no início da próxima onda; evita alterações de estado no meio da simulação.

### 7.3 Papéis de combate

| Classe | Papel | Vantagens | Vulnerabilidades |
|---|---|---|---|
| Guerreiro | Linha de frente / proteção | Vida, defesa e controle | Menor dano em alvo único |
| Arcanista | Dano mágico / efeitos | Explosão e dano ao longo do tempo | Vida e defesa reduzidas |
| Arqueiro | Dano constante / prioridade | Velocidade, crítico e precisão | Menor proteção direta |

### 7.4 Valores iniciais *propostos*, sujeitos a testes

| Classe | Vida | Ataque | Defesa | Velocidade (%) | Crítico (%) |
|---|---:|---:|---:|---:|---:|
| Guerreiro | 160 | 14 | 15 | 0 | 5 |
| Arcanista | 95 | 19 | 5 | 10 | 8 |
| Arqueiro | 110 | 17 | 8 | 15 | 10 |

A mecânica exata de cálculo de ataque, dano e recuperação está documentada em `ESPECIFICACAO_TECNICA.md`, fonte de verdade para fórmulas.

### 7.5 Habilidades propostas

**Guerreiro**

- **Impacto de Escudo:** ataque de 130% do dano básico; atordoa por 1 segundo. Recarga de 6 s.
- **Postura de Pedra:** aumenta a própria defesa em 35% por 5 s. Recarga de 14 s.
- **Guarda do Limiar:** cria um escudo de 20% da própria vida máxima no aliado com menos vida percentual. Recarga de 18 s.

**Arcanista**

- **Chama Crepuscular:** causa 150% do dano básico ao alvo. Recarga de 6 s.
- **Marca da Cinza:** aplica dano por segundo por 5 s. Recarga de 10 s.
- **Pulso Arcano:** fortalece o ataque da equipe por 5 s. Recarga de 18 s.

**Arqueiro**

- **Flecha Serrilhada:** causa dano e aplica sangramento por 5 s. Recarga de 7 s.
- **Rajada Veloz:** executa dois golpes de 90% do dano básico. Recarga de 10 s.
- **Marca do Caçador:** aumenta em 15% o dano recebido por um alvo durante 5 s. Recarga de 16 s.

O desbloqueio das três habilidades de cada classe é progressivo. No primeiro protótipo, somente o ataque básico será necessário.

## 8. Progressão do personagem

- Níveis de **1 a 50** no MVP; classes evoluem individualmente.
- Experiência vem da vitória em ondas e de recompensas de primeira conclusão.
- Ganhos por nível alteram atributos base, calculados pelo motor, sem sobrescrever bônus de equipamento.
- Equipamento e construção podem acrescentar modificadores separados e identificáveis.
- **Sem renascimento, ascensão ou prestígio** no MVP. Esse sistema pode entrar depois da curva principal estar validada.
- O jogador deve visualizar os valores base, bônus por nível, bônus por equipamento e total final.

**Equação de experiência para o nível seguinte:** definida na especificação técnica. A tabela real de XP deve ser gerada automaticamente, jamais duplicada manualmente em telas distintas.

## 9. Regiões, inimigos e estágios

### 9.1 Conteúdo inicial

| Região | Estágios | Tema | Característica |
|---|---|---|---|
| Bosque das Cinzas | 1–5 | Árvores mortas, cinzas e sentinelas caídas | Introdução, inimigos de ataque físico |
| Criptas da Bruma | 6–10 | Túmulos, magia residual e névoa | Inimigos mágicos, pressão e primeiro chefe |

**Conjunto inicial:** cinco arquétipos de inimigos comuns (Corvo Sombrio, Errante, Lobo Cinzento, Espectro da Bruma e Sentinela Arruinada) e **um chefe**, Guardião do Véu, no estágio 10. O estágio 5 apresenta uma variante de elite de um inimigo comum, não um segundo chefe exclusivo.

### 9.2 Regras de progressão por estágio

- Estágio `n+1` é desbloqueado ao completar `n` pela primeira vez.
- Um estágio pode ser repetido sem limite de sessões ativas.
- Uma região desbloqueia quando o jogador conclui o estágio anterior à sua primeira fase.
- Saques são determinados por tabelas versionadas, nunca por texto da interface.
- Recompensas de **primeira conclusão** são identificadas separadamente das recompensas repetíveis.
- **No modo offline, a equipe caça o último estágio explicitamente selecionado e já desbloqueado; não desbloqueia novos estágios enquanto o jogador está ausente.**

## 10. Equipamentos, raridades e saques

### 10.1 Espaços e catálogo

Cada herói possui seis espaços: **arma, elmo, peito, luvas, botas e anel**. No MVP, haverá aproximadamente **30 modelos-base**, distribuídos entre esses espaços. Raridade, atributos e modificadores produzem variações sem exigir um sprite inteiramente novo para cada instância.

### 10.2 Raridades

| Raridade | Cor de referência | Design |
|---|---|---|
| Comum | Cinza | Atributos fundamentais |
| Incomum | Verde | Um bônus adicional |
| Raro | Azul | Combinações melhores de atributos |
| Épico | Violeta | Afixos de alto impacto |
| Lendário | Dourado | Um efeito especial que muda uma decisão de montagem |

**Distribuição inicial condicional à ocorrência de um item**, para inimigos comuns: comum 65%, incomum 25%, raro 8%, épico 1,8% e lendário 0,2%. A chance-base de um item cair por vitória contra um inimigo comum é **20%**. Essas probabilidades são hipóteses de balanceamento, não promessas comerciais.

O chefe do estágio 10 concede **um item raro ou superior garantido apenas na primeira vitória**. Nas repetições, segue uma tabela própria de recompensas a definir nos dados de conteúdo. Evitar prêmio garantido repetível que destrua a economia.

### 10.3 Princípios de itemização

- Cada item é uma instância com identificador próprio, definição-base, raridade, afixos e nível de aprimoramento.
- Afixos são gerados de uma lista permitida por espaço e raridade; afixos incompatíveis não podem coexistir.
- Itens lendários podem ter **um efeito único**, mas não devem violar limites de balanceamento.
- Equipamento pertence a um único personagem por vez.
- Não é possível vender ou destruir um item equipado sem removê-lo primeiro.
- O inventário comporta **100 itens de equipamento** inicialmente; ouro e materiais são recursos, não ocupam espaços.
- Ao lotar o inventário, as novas recompensas devem ir para uma **caixa de saques temporária** (capacidade e política de expiração a definir antes da Fase 3); não perder itens silenciosamente.

### 10.4 Exemplos de efeitos futuros

- **Lâmina do Retorno:** após uma defesa bem-sucedida, o guerreiro causa dano reativo.
- **Arco da Vigília:** ataques críticos concedem velocidade temporária.
- **Selo da Bruma:** parte do dano periódico produz escudo para um aliado.

Estes nomes e efeitos são conceitos. Itens lendários com gatilhos complexos podem ser adiados se o motor de eventos ainda não estiver maduro.

### 10.5 Comparação e economia

A interface compara o item atual e o item selecionado, mostrando bônus positivos e negativos. Deve permitir equipar, desequipar e vender, sempre com confirmação para itens de raridade alta.

## 11. Refúgio e construções

A **Fortaleza do Limiar** é o centro de progressão fora do combate. No MVP, apenas três construções serão funcionais:

| Construção | Efeito por nível | Níveis do MVP |
|---|---|---|
| Quartel | +1% de experiência obtida por nível | 1–3 |
| Forja | Permite aprimorar equipamentos até +1/+2/+3 conforme nível | 1–3 |
| Santuário | +1% de vida máxima dos heróis por nível | 1–3 |

Custos de exemplo: melhoria para nível 2 custa 500 de ouro e para nível 3, 1.500 de ouro, sujeitos a balanceamento. Cada construção começa no nível 1. A Forja consome ouro adicional por aprimoramento, com custo específico por nível de item e sem chance de falha no MVP.

A cidade deve ser relevante, mas nunca obrigatória a cada onda. Construções novas precisam trazer decisões novas em vez de botões de incremento redundantes.

## 12. Progressão offline e automação

- **Teto inicial:** duas horas de progresso offline acumulado por retorno.
- **Regra temporal:** conta o tempo transcorrido desde a última simulação confirmada; somente intervalo elegível é recompensado.
- **Destino:** mesmo estágio desbloqueado e configurado para caça quando o jogador ficou ausente.
- **Eventos offline:** usam a mesma lógica de combate, morte, vitória, saques e XP das sessões ativas, com otimizações que não mudem o resultado.
- **Nenhum estágio novo é liberado offline.**
- **Relatório:** duração considerada, ondas vencidas, ouro, XP, equipamentos, derrotas e eventuais limites aplicados.
- **Limitações do protótipo local:** relógio e saves podem ser manipulados pelo usuário; a integridade de economia online só será garantida com validação de servidor em uma etapa posterior.

Não prometer processamento contínuo com a página fechada: trata-se de simulação de recuperação no retorno, não de execução permanente no navegador.

## 13. Navegação, tutorial e acessibilidade

- Primeira entrada: introdução curta, equipe inicial e primeira luta automática.
- Tutorial ensina **um conceito por vez**: batalha → recompensa → equipamento → mapa → cidade.
- Se possível, o jogador deve chegar à primeira vitória com menos de três interações.
- Controles acessíveis por teclado; foco visível nos menus; descrições textuais dos efeitos.
- Modo de efeitos reduzidos e opção de ocultar números de dano secundários.
- Raridades identificadas por cor **e** nome/ícone; nunca somente pela cor.
- Notificações importantes devem ficar no histórico, não só em avisos passageiros.

## 14. Escopo e prioridades

### P0 — Obrigatório para considerar o MVP jogável

- Uma luta automática confiável, com IA, dano, derrota e vitória.
- Três classes, progressão por nível, experiência e atributos.
- Duas regiões, dez estágios, cinco inimigos comuns e um chefe.
- Seis espaços de equipamento, inventário, saques e cinco raridades.
- Três construções com efeitos persistentes.
- Salvamento local confiável e relatório offline limitado.
- HUD e menus em pt-BR, com tratamento de erros e configuração básica.

### P1 — Melhorias após validar o núcleo

- Equipamentos lendários com interações complexas, novas animações e narração ambiental.
- Mais inimigos, conjuntos, achievements e missões de longo prazo.
- Ferramentas de conteúdo e painel administrativo.

### P2 — Fora do primeiro lançamento

- Múltiplas expedições simultâneas, ranking online, temporadas, PvP, mercado de jogadores, monetização e aplicativos nativos.

## 15. Indicadores de qualidade e critérios de sucesso

**Produto:** um usuário de teste consegue chegar à primeira vitória, equipar um item e progredir sem ajuda externa. O motivo de uma derrota deve ser compreensível.

**Balanceamento:** primeiras batalhas rápidas o bastante para mostrar progresso; recompensas significativas sem excesso de inflação; pelo menos duas escolhas reais de equipamento ao longo do onboarding.

**Desempenho:** meta inicial de 60 FPS em desktop intermediário a 1280×720, e experiência utilizável em dispositivos móveis modernos. Resultados medidos em hardware real; otimizar antes de aumentar a densidade de partículas.

**Confiabilidade:** o progresso não pode desaparecer ao recarregar; saques não podem ser duplicados por interrupções ou repetição de ações; uma simulação com a mesma semente e entradas deve produzir resultados idênticos.

## 16. Marcos de validação

| Marco | Demonstração exigida | Critério de aceite |
|---|---|---|
| M0 — Fundação | Projeto inicia, testes executam e documentação está acessível | `npm run dev`, build e testes passam |
| M1 — Arena | Dois heróis lutam contra dois inimigos | Vitória/derrota sem intervenção e sem erros de console |
| M2 — Estratégia | Três classes, habilidades e atributos | Equipamento/atributo altera resultado em teste reproduzível |
| M3 — Saques | Inventário e comparação | Item gerado é persistido, equipado e corretamente aplicado |
| M4 — Exploração | Mapa, chefes e offline | Regras de desbloqueio e limite de duas horas são respeitadas |
| M5 — Refúgio | Três construções | Melhorias afetam os cálculos e sobrevivem ao recarregamento |
| M6 — MVP | Fluxo completo com arte e UI consistentes | Testes, acessibilidade básica e revisão de performance aprovados |

## 17. Riscos de produto e mitigação

| Risco | Consequência | Mitigação |
|---|---|---|
| Escopo crescer cedo demais | MVP nunca termina | Marcar novos pedidos como P1/P2 até concluir M1 |
| Combate visual poluído | Jogador não entende ações | Limitar números flutuantes e destacar eventos prioritários |
| Economia desequilibrada | Equipamentos perdem valor | Simulador automático de milhares de encontros com métricas |
| Arte inconsistente | Produto parece protótipo permanente | Guia de estilo e biblioteca organizada de assets |
| Conteúdo duplicado no código | Regras divergentes | Manifesto versionado e motor com fonte única de fórmulas |
| Offline fácil de manipular | Fraude ao incluir contas online | Migrar autoridade ao servidor antes de economia compartilhada |

## 18. Decisões pendentes

Estas decisões **não bloqueiam o desenvolvimento inicial** e devem ser revisadas após M1:

1. Nome comercial definitivo e identidade de marca.
2. A presença ou não de narrativa extensa e diálogos.
3. Quantidade de personagens recrutáveis além do trio inicial.
4. Modelo de monetização, se houver — sem vendas até validação de balanceamento.
5. Política final para a caixa de saques cheia.
6. Tabela específica de repetição do chefe.
7. Estratégia de publicação: somente web ou também desktop futuramente.

## 19. Regras de evolução do GDD

- Toda mudança mecânica precisa de descrição de experiência desejada e critério de aceite.
- Fórmulas e contratos técnicos pertencem à especificação técnica; o GDD define a intenção e limites de design.
- Alterar a economia requer teste de simulação e atualização de tabelas de conteúdo.
- Alterar uma regra que afete saves exige análise de migração.
- Cada marco concluído deve registrar data, evidência e principais decisões.

---

**Próxima ação:** concluir M0 e M1; não iniciar sistemas de ranking ou administração antes que a primeira batalha automática seja reproduzível e visualmente compreensível.
