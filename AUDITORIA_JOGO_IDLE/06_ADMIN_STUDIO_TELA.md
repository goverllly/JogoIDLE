# Admin Studio — auditoria da tela

Data: 28/10/2026.  
Olhado em `http://localhost:8787/jogo-idle/admin/` (build servido) e no fonte `idle/admin-ui/src/`.  
O doc `05_ADMIN_STUDIO.md` lista abas e APIs. Este aqui é a tela: layout, visual, o que já é studio e o que ainda é formulário.

Personagem aberto na sessão: **tete · Bárbaro · Lv 500**. Runtime real: 23 zonas, 46 monstros, 1157 itens, drop global 1,6%.

---

## 1. O que a tela é hoje

Não é uma página única de “editar coisas”. É um app React (`admin-ui`) com **16 destinos** dentro de um shell chamado Studio 2.0. Três destinos já têm cara de editor (Itens, Monstros, Mapa, e o HUD). O resto é cartão de formulário, KPI ou texto de “fase futura”, encaixado no mesmo chrome.

A sensação de “só editar” vem de três coisas juntas:

1. O shell não ocupa a janela como aplicativo. Ele é um cartão arredondado embaixo de um segundo header.
2. A navegação é uma lista plana de 16 itens, sem modo de trabalho.
3. Economia, Temporada e Personagens dividem a mesma grade e ficam os três montados ao mesmo tempo.

---

## 2. Anatomia da página

Duas camadas de chrome, uma em cima da outra.

```
┌─ App.tsx (header da página) ─────────────────────────────┐
│  Jogo IDLE · standalone          Admin Studio    ← Lobby │
├─ .studio-2  (grid 220px + resto, radius 12, borda) ──────┤
│ ┌─ sidebar ────┐ ┌─ .studio-2__top ────────────────────┐ │
│ │ Gerenciamento│ │ h1 da aba          Alvo ativo [sel] │ │
│ │ 13 itens     │ │ subtítulo          [Interromper]    │ │
│ │ Ferramentas  │ ├─ flash (message / error) ───────────┤ │
│ │ 4 itens      │ ├─ .studio-2__workspace (scroll) ─────┤ │
│ │              │ │   painel da aba                      │ │
│ │ Studio 2.0   │ │                                      │ │
│ │ Alvo: tete   │ │                                      │ │
│ └──────────────┘ └──────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

Arquivos:

| Peça | Arquivo |
|------|---------|
| Header externo | `idle/admin-ui/src/App.tsx` |
| Shell | `idle/admin-ui/src/admin/admin-shell.tsx` |
| Tokens e layouts | `idle/admin-ui/src/admin/studio/studio-2.css` |
| Primitivos | `idle/admin-ui/src/admin/studio/studio-ui.tsx` |
| Estado de todas as abas | `idle/admin-ui/src/JogoIdleAdmin.tsx` (~1170 linhas) |
| Lista de abas e títulos | `idle/admin-ui/src/admin/admin-types.ts` |

### Header externo

Barra fixa no topo da página, fora do studio:

- Eyebrow `Jogo IDLE · standalone` (detalhe de implementação, não de produto).
- Título **Admin Studio** em dourado `--primary` `#c9a227`.
- Link `← Lobby`.

O studio repete o nome da seção logo abaixo. Em Visão Geral o título aparece três vezes: header da página, `h1` do shell e `h2` do painel.

### Shell Studio 2.0

- Grid `220px + 1fr`. Fundo navy `#061323` / `#0a1c30`, ouro `#f4b52b`. São **dois dourados e dois navys**: o header usa os tokens do `index.css` (`#c9a227`, `#0b1220`); o studio usa os de `studio-2.css`.
- `min-height: min(78vh, 920px)`, `border-radius: 12px`, borda. Não é full-bleed. Em 1440×900 o documento passa de 900px de altura por causa do header de fora. A página rola e o workspace também rola.
- Topo do shell: título, subtítulo, select **Alvo ativo**, botão **Interromper jogo** / **Liberar jogo**.
- Rodapé da sidebar: bolinha verde “Studio 2.0” e “Alvo: {nome}”. O alvo aparece de novo no select e, na Visão Geral, num terceiro card.

### Sidebar

Dois grupos, definidos em `ADMIN_TABS`:

**Gerenciamento:** Visão Geral, Itens, Zonas, Mapa, Monstros, Loot & Drops, Economia, Temporada, Personagens, Simulador, Configurações, Engajamento.

**Ferramentas:** Editor de HUD, Backup / Restore (desabilitado), Logs do Sistema, Usuários Admin.

Ícones são glifos Unicode num `<span>`, fonte `Segoe UI`. Não há set de ícones.

| id | glifo | o que aparece na tela |
|----|-------|------------------------|
| items | ⚔ | parece um × |
| hud | *(ausente em `TAB_ICONS`)* | cai no fallback `·` |
| map | 🗺 | emoji colorido no meio de glifos monocromáticos |
| demais | ◈ ▣ ☠ ◆ ◎ ◷ ♟ ∑ ⚙ ⚑ ⬡ ☰ ♛ | misturados, tamanho 0.75rem |

Abaixo de **1100px** o grid vira uma coluna e a sidebar vira `flex-direction: row; flex-wrap`. Os 16 itens ocupam o topo inteiro e o conteúdo cai para baixo. Foi o que a janela estreita mostrou antes de forçar 1440px. O studio não tem modo compacto de verdade: ou sidebar de 220px, ou uma faixa que come a tela.

Item ativo: pílula dourada, texto navy. Hover azul translúcido.

---

## 3. Seis layouts, não um

O CSS nomeia os padrões. Cada aba escolhe um. Por isso a tela muda de “editor” para “formulário” sem aviso.

### A. KPI + dois cartões — Visão Geral

`admin-overview.tsx`. Grade `studio-2-kpi-grid` (auto-fill, mín. 140px).

Cards reais, com fonte no backend:

| Card | Valor visto | Hint |
|------|-------------|------|
| Zonas | 23 | “IDs fixos (Fase 1)” |
| Monstros | 46 | “Projetados das zonas” |
| Itens | 1157 | “Templates do catálogo” |
| Drop global | 1.6% | chance base de gear |
| Temporada | — | sem OPEN (o 6º card existe no código; na captura larga os 4 primeiros enchem a linha) |
| Personagens ativos | 1 | |
| Alvo ativo | tete · Lv 500 | card extra à direita do título |

Abaixo, duas colunas:

- **Atividade recente** — últimas ações (`/admin/actions?limit=12`). Visto: `grant` (item na mochila de tete) e `character` (“tete: nível 700”). Lista simples, badge + data + e-mail `local@idle.local`.
- **Pipeline de conteúdo** — três colunas tracejadas (Rascunho / Em revisão / Publicado), as três com o texto “Disponível na Fase 4”. `aria-disabled="true"`. É um kanban vazio desenhado como se fosse funcional.

### B. Catálogo | editor | inspetor — Itens e Monstros

Classe `studio-2-split-3`: `minmax(200px,260px) | 1fr | minmax(220px,280px)`, `min-height` ~62vh.

**Itens** (`admin-items.tsx`), 1157/1157:

- Esquerda: busca, filtros Classe / Slot / Tier, botão Limpar, lista virtual (`ROW_H = 52`, `LIST_H = 520` fixo). Cada linha: badge `T{n}`, nome, `slot · drop%`, e “custom” / “override” quando cabe.
- Centro: cabeçalho Novo / Duplicar / Reset / Excluir / Conceder. Abas internas Geral, Atributos, Drop, Visual 3D, Avançado. Seções com título dourado uppercase (`IDENTIDADE`). Classes são botões-pílula (Guerreiro, Bárbaro, Mago, Arqueiro).
- Direita: `StudioInspector` “Preview 3D” via iframe `/jogo-idle/admin-studio/preview.html`.

Na captura em 1440px a terceira coluna **não entra na viewport**. O formulário é cortado em “Avançado”, “ARQUEIRO” e no select de ícone. O preview, que é o diferencial de studio, fica fora da dobra horizontal. O workspace rola, mas o split não negocia largura com a sidebar de 220px + header externo.

Bug de seleção visto na tela: a primeira linha (**Botas de Couro**) fica com borda dourada, e o editor diz **Novo item** com nome vazio. O código faz `selected = catalog.find(id) || filtered[0]`, então a lista destaca o primeiro item, mas o draft só é preenchido no clique (`selectedId` começa `""`, draft é `EMPTY_DRAFT`).

Linhas homônimas (duas “Botas de Couro”, dois “Capuz de Couro”) não mostram classe. Com 1157 templates, a linha não distingue variantes.

**Monstros** usa o mesmo split:

- Lista com busca e filtro de zona. Boss leva badge.
- Abas: Geral (nome + grade de modelos 3D), Atributos (nível, HP, ATK, DEF, XP, gold), Spawn (kills até o boss), e três abas que só explicam lacuna: Habilidades, Drops, Balanceamento.
- Inspetor: preview 3D do monstro + ficha HP/ATK/DEF/XP/Gold/Visual.
- Salvar grava a **zona inteira**, não a criatura. Reset de boss e reset de onda aparecem quando há override.

### C. Lista | formulário — Zonas

`studio-2-split-2` (220–280px + resto). Lista de zonas (capítulo, faixa de nível, tier, ritual, ascensão). À direita, formulário: nível mín., tier, drop da zona, ascensão (só CELESTIAL), multiplicadores de boss, refine %. Ações: Limpar overrides, Salvar zona. Texto no cabeçalho da lista: “Criação de zonas novas: Fase 3. Aqui só overrides.”

Não há mapa, lista de mobs nem preview nesta aba. Zona, mapa e monstros são três editores do mesmo objeto.

### D. World builder — Mapa

O layout mais próximo de um studio. Classe `studio-2-wb`.

1. **Toolbar:** select da zona (`[I] Bosque dos Sussurros`, 23 opções), ferramentas, câmera, Preset / Salvar / Publicar.
2. **Palco:** iframe `/jogo-idle/map-editor.html` + inspetor (céu, chão, ambiente, sol, bioma, partículas, fog, objeto selecionado, Assar bioma, Resetar visual).
3. **Dock** com teto de 180px, três painéis: Biblioteca de props (packs `nature`, `dungeon`, `forest`…), Camadas (info), Log.

Ferramentas **desabilitadas na toolbar**, ocupando lugar: Mover, Rotacionar, Escalar, Grade, Snap. Publicar também, com title “Publicação versionada: Fase 4”. O dock de camadas diz “Toggle de camadas no motor: ainda não suportado”. O log repete “Publicar: Fase 4”.

Rotação existe (campo Rot Y e teclas Q/E). Escala existe no pincel. A toolbar anuncia botões mortos em vez de esconder o que o motor não faz.

Abaixo de 1280px o palco e o dock empilham (`grid-template-columns: 1fr`).

### E. HUD builder — Editor de HUD

`studio-2-hud`. É o outro layout de editor, classificado em Ferramentas enquanto o Simulador está em Gerenciamento.

Toolbar: nome do draft, badge Rascunho / Não salvo, revisão publicada, resolução, Organizado / Livre, Snap + grade 4/8/16, Editar / Pré-visualizar, Desfazer / Refazer, Restaurar, Salvar Rascunho, **Publicar** (ativo quando o rascunho está limpo — o doc 05 está desatualizado aqui; Publicar do **mapa** é que segue desabilitado).

Corpo em três colunas: árvore de componentes (busca), canvas com iframe na resolução escolhida, inspetor do nó (e histórico de revisões). Abaixo de 1280px as três colunas viram uma.

### F. Live Ops em três colunas — Economia, Temporada, Personagens

`admin-liveops.tsx`. As três abas do menu renderizam **a mesma grade**. A coluna “ativa” ganha borda dourada e badge “ativo”; as outras ficam com `opacity: 0.72` e continuam no DOM, interativas.

Em cima, quatro KPIs. O quarto é a aba atual escrita de novo:

| Drop global | Temporada | Personagens ativos | Seção |
|-------------|-----------|--------------------|-------|
| 1.6% | — / Sem OPEN | 1 | Economia |

Na captura, a coluna Economia tem scroll interno e a de Temporada é cortada na borda direita (“soft-res…”, “aberta enco…”). Personagens nem aparece sem rolar. Dentro da coluna Economia os cartões são do **shadcn** (`Card`, `Button`, `Input`), não `StudioCard`: título maior, borda mais clara, botão dourado de outro componente. Dois sistemas visuais no mesmo retângulo.

Conteúdo da coluna Economia (`admin-economy.tsx`):

- TTK / Refinador: hits mob 10, hits boss 28, refinador 1,2%.
- Mundo: slider de drop 1,6% (o mesmo número da aba Loot e do KPI).
- Mercador: mochila 150000, refinador 25000, reset 1000000, cachorro/gato 40000, papagaio 100000, cada um com “À venda”.
- Evento de engajamento: rótulo, XP×, ouro×, drop×, data. “Nenhum evento ativo.”
- **Histórico de ações admin** embutido no fim da coluna — as mesmas linhas da aba Logs.

Temporada (`admin-season.tsx`): card shadcn. Sem temporada OPEN mostra uma frase. Com temporada: slug, status, notas, campo de confirmação, botão destrutivo de encerrar.

Personagens (`admin-characters.tsx`): outro select do mesmo alvo (já está no topo do shell), ouro +/−, nível 1–700, pontos livres, cosmético (lista fixa de 6), Limpar mochila, Excluir. Card shadcn dentro da coluna que já se chama Personagens.

Abaixo de 1280px as colunas inativas somem (`display: none`). No desktop elas competem com a coluna de trabalho.

### G. Cartão único — o resto

| Aba | Arquivo | O que a tela é |
|-----|---------|----------------|
| Loot & Drops | `admin-loot.tsx` | Texto do modelo (pool por tier), form do drop global, atalho “Abrir simulador”, tabela zona/tier/drop. Coluna “Boss drop ×” renderiza sempre `—`. |
| Simulador | `admin-simulate.tsx` | Form zona × monstro × perfil (nível, ATK, DEF, HP) e cartão de resultado (TTK, hits, XP/h, ouro/h, drop). Não grava. Layout de duas colunas, visual studio. |
| Configurações | `admin-settings.tsx` | Os **mesmos** três campos de TTK/refinador da Economia, mais um parágrafo sobre `jogo_idle_catalog_state` e “Fase 4”. |
| Engajamento | `admin-engagement.tsx` | Dashboard de verdade (metas, D1/D7/D30, 14 dias, claims), mas 100% shadcn. Visual de outro app dentro do navy do studio. |
| Logs | `admin-actions-history.tsx` | Tabela shadcn, últimas 50. Mesmo componente enfiado na Economia. |
| Usuários Admin | `admin-admins.tsx` | Um card, lista de e-mails, badge “admin”. Sem CRUD. |
| Backup | — | Botão desabilitado. Título “Fase 4”. Não há painel. |

---

## 4. Como o estado está escrito

`JogoIdleAdmin` segura o estado de quase todas as abas: draft de item, filtros, monstros, boss, onda, preços do mercador, evento, temporada, alvo, zona, balance, manutenção. Os painéis são em grande parte controlados. Trocar de aba não perde o draft de economia, porque o estado mora no pai — mas também não há indicador de “não salvo” fora de Itens e Monstros.

Persistência local (`sessionStorage`): aba, `zoneId`, `targetId`.

Guarda de saída: só Itens e Monstros (`window.confirm`). Mapa, zonas, economia e HUD não passam por essa guarda no shell. O HUD tem undo/redo e badge “Não salvo” próprios.

Confirmações destrutivas: `window.confirm` nativo (apagar item, reset, manutenção, encerrar evento, limpar mochila) e `AlertDialog` só em conceder item e excluir personagem.

Salvar é por formulário, efeito imediato no runtime (overrides). Não há rascunho global, diff, nem “publicar mundo”. O pipeline da Visão Geral descreve um fluxo que a tela não tem. Exceção parcial: o HUD já tem draft / publicar / histórico.

Um `idleFetch` vem de `App.tsx` (CSRF, 401 → login). Quase toda mutação vai para `POST /api/jogo-idle/admin/config` com um corpo diferente (`zone`, `balance`, `dropChance`, `engagementEvent`, `maintenance`, preços). Catálogo, personagem, temporada, simulação e HUD têm rotas próprias.

---

## 5. O que a visualização faz hoje

| Superfície | Preview | Observação |
|------------|---------|------------|
| Itens | iframe `admin-studio/preview.html` | Existe e é a coluna que some em 1440px com a sidebar aberta. |
| Monstros | o mesmo iframe, `showMonster` | Ficha numérica ao lado. |
| Mapa | iframe `map-editor.html` | Viewport real. Ferramentas de transform desligadas na UI. |
| HUD | iframe do jogo + bridge | Resolução, snap, edit/preview. Intro não roda nesse preview (o próprio inspetor avisa). |
| Zonas, loot, economia, simulador | nenhum | Número e tabela. O simulador devolve texto, sem curva nem comparação. |
| Visão Geral | nenhum gráfico | Seis números e uma lista. |

Não há visão do mundo (capítulos → zonas → mobs) em lugar nenhum. Zona é lista. Mapa é uma zona por vez. Monstro é lista global filtrável.

---

## 6. Problemas da tela, em ordem de peso

### Shell

1. Dois headers e dois títulos para a mesma seção. O de fora diz “standalone”.
2. O studio é um cartão dentro da página, não o app. Altura mínima 78vh, radius, borda. Página e workspace rolam.
3. “Alvo ativo” é global: sidebar, topo e, em Visão Geral, um card. Em Zonas/Mapa/Loot o alvo não é o objeto de trabalho. Em Personagens o select se repete.
4. Manutenção (interromper o jogo inteiro) mora no topo de todas as abas, no mesmo nível que o select de personagem.
5. Nav plana de 16 itens. HUD é ferramenta; Simulador é gerenciamento. Economia / Temporada / Personagens são atalhos para colunas da mesma tela.
6. Ícones Unicode inconsistentes; HUD sem ícone.
7. Breakpoint 1100px desmonta a sidebar em vez de colapsá-la.
8. Dois dourados (`#c9a227` e `#f4b52b`) e dois navys.

### Densidade e tipo

9. Labels de seção a 0.62rem (~10px), uppercase, tracking largo. Nav a 0.78rem. O único tipo grande é o número do KPI (1.35rem). A tela é densa e pouco hierárquica: tudo tem quase o mesmo peso, menos o ouro do título.

### Conteúdo que ocupa espaço sem ser ferramenta

10. Pipeline da Visão Geral é um placeholder de três colunas.
11. Toolbar do mapa mostra cinco ferramentas mortas e um Publicar morto.
12. Abas Habilidades / Drops / Balanceamento do monstro são parágrafos de “Fase 2”.
13. Card “Seção: Economia” repete o título da aba.
14. Hints “Fase 1 / 2 / 3 / 4” estão no produto, não num doc.

### Duplicação

15. Drop global: Visão Geral (leitura), Loot (form), Economia (slider), e o estado é o mesmo `dropPct`.
16. TTK e refinador: Economia e Configurações, mesmos campos, mesmo `onSaveBalance`.
17. Logs: aba própria e o componente inteiro no rodapé da coluna Economia.
18. Alvo: topo do shell e de novo em Personagens.
19. Zona: select do mapa, lista de Zonas, filtro de Monstros, tabela de Loot, select do Simulador. Cinco representações, nenhum vínculo de “estou editando o Bosque”.

### Live Ops

20. Três ferramentas lado a lado, duas esmaecidas e cortadas. A coluna ativa ainda rola por dentro. No desktop isso é o oposto de um studio: o trabalho útil fica estreito para mostrar o que não está em uso.
21. Economia, Temporada, Personagens, Engajamento e Logs usam Card/Button/Input do shadcn. Itens, Monstros, Mapa, HUD, Loot, Simulador e Settings usam `studio-2-*`. A troca de aba troca o design system.

### Itens

22. Seleção visual do primeiro item sem carregar o draft (“Novo item” com a linha dourada em Botas de Couro).
23. Preview 3D fora da área útil no desktop com sidebar.
24. Lista de 1157 linhas sem classe, sem raridade visual, sem agrupamento. Filtros ajudam; a linha não.

### Mapa / mundo

25. Mapa, Zonas e Monstros editam a mesma zona em telas que não compartilham seleção de forma óbvia para quem está no mapa (o `zoneId` do pai é compartilhado por Zonas e Monstros; o Mapa tem o próprio `zoneId` interno).
26. Dock de 180px com “camadas” que não são camadas.

### O que já segura um studio (não jogar fora)

- Primitivos em `studio-ui.tsx`: Card, Tabs, Catalog, Inspector, Toolbar, ToolBtn, Badge, Field, FormSection.
- Split catálogo / editor / preview em Itens e Monstros, com lista virtual e preview 3D.
- World builder com iframe, inspetor de cena e biblioteca de props.
- HUD com árvore, canvas, inspetor, undo, snap, draft e publicar.
- Visão Geral já lê ações e snapshot reais (não é mock de número).
- Tokens nomeados em `studio-2.css` (navy, gold, line, muted, green, red, blue).

---

## 7. Direção para a próxima leva de trabalho

Objetivo: um studio em que se **monta o jogo**, e as telas de número/formulário viram modos desse studio. Não é redesenhar as 16 abas uma a uma.

### Shell único

- Uma moldura, altura da janela, sem header “standalone” e sem título repetido.
- Um dourado, um navy, um tipo de botão, um tipo de card. shadcn fica por baixo dos primitivos do studio, ou sai das abas que o jogador-admin vê.
- Sidebar agrupada por trabalho, ícones de um set só, colapso real (ícone) abaixo de ~1100px — a faixa que quebra hoje.
- Barra de contexto muda com o modo: **zona** no mundo, **personagem** em jogadores, **draft/publicado** no HUD. Manutenção sai do topo cotidiano e vai para um controle de mundo com estado visível (já existe o badge “Em manutenção”; o botão não precisa liderar toda aba).
- Barra de status fina no lugar do rodapé “Studio 2.0”: ambiente, sujeira do draft, manutenção.

### Modos, no lugar da lista plana

| Modo | Reúne | Vira |
|------|--------|------|
| Início | Visão Geral | Números reais + atividade. O kanban “Fase 4” sai até existir draft/publish de conteúdo. |
| Mundo | Zonas + Mapa + Monstros | Uma zona selecionada. Mapa no palco. Inspeção da zona (nível, drop, acesso) e da criatura no mesmo inspetor, não em três abas. |
| Catálogo | Itens + Loot | O split que já existe, com preview sempre visível. Loot por tier/zona como painel do item ou da zona, não como página de texto. |
| Laboratório | Simulador + os campos de TTK que hoje estão em Configurações e Economia | Um perfil, um alvo, resultado. Os três campos de balance deixam de existir em dois lugares. |
| Live | Economia (mercador, evento, drop global) | Uma coluna, largura de leitura. Sem Temporada e Personagens ao lado. |
| Jogadores | Personagens | Lista de verdade, não um form único. O select do topo deixa de ser a navegação. |
| Temporada | a aba atual | Tela própria, só quando há o que operar. |
| Interface | HUD | Já é editor. Sobe para o mesmo nível visual do Mapa. |
| Sistema | Logs, Admins, Backup | Fora do caminho de autoria. Logs uma vez só. |

### Regras de tela para essa leva

- Placeholder não ocupa toolbar nem coluna. Se a ação não existe, ela não aparece como botão morto.
- Um dado, um controle. Drop global, TTK e alvo têm um dono cada.
- Seleção e formulário contam a mesma coisa (corrigir o “Novo item” com a primeira linha marcada).
- Preview 3D e viewport do mapa são a coluna principal, não a que é cortada.
- Largura: palco flexível; inspetor com largura máxima; catálogo que colapsa. O split-3 atual soma ~760px de cromo antes do miolo.

### Fora desta leva (está no código como fase, não é layout)

Criar zona nova, loot table por monstro, skills de mob, publicar mapa versionado, backup/restore, CRUD de admins, pipeline draft→revisão→publicado para o mundo. A tela pode reservar o lugar; não deve desenhar o controle desligado.

---

## 8. Ordem sugerida quando formos mexer

1. Shell: um header, altura cheia, nav agrupada, colapso, um alvo contextual. Sem mudar regra de negócio.
2. Unificar o visual das abas shadcn (Economia, Temporada, Personagens, Engajamento, Logs) nos primitivos `studio-2`.
3. Live Ops: uma coluna. Tirar o histórico de dentro da Economia. Tirar o KPI “Seção”.
4. Itens: seleção = draft; preview visível; linha do catálogo com classe.
5. Mundo: Mapa como palco, Zonas e Monstros como inspetor da mesma `zoneId` (hoje o mapa guarda a sua).
6. Apagar controles mortos (pipeline, toolbar do mapa, abas vazias de monstro) ou trocá-los por uma linha de status, não por um painel.

O passo 1 muda a percepção da tela inteira. Os outros aproveitam layout que já está escrito.
