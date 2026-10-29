# Plano de refatoração — Admin Studio 3.0

Data: 28/10/2026.  
Este documento é o planejamento. Não altera regras de combate, progressão, autenticação nem persistência. As Fases 1 a 8 foram implementadas. O que continua só no papel está no resumo final, depois do apêndice da Fase 8.

Fontes lidas no repositório (não só os docs anteriores): `idle/admin-ui/src/`, `idle/src/admin-service.ts`, `idle/src/server.ts`, `idle/lib/jogo-idle/game/zone-scene.ts`, `idle/public/jogo-idle/map-editor.js`, `kaykit-props.js`, `scene3d.js`, `admin-studio/asset-registry.js`, e os CSS de login, lobby, moldura do salão e HUD. A leitura de tela do Studio 2.0 está em [06_ADMIN_STUDIO_TELA.md](06_ADMIN_STUDIO_TELA.md). O [05_ADMIN_STUDIO.md](05_ADMIN_STUDIO.md) está desatualizado no HUD: publicar layout **grava**; publicar mapa **não existe**.

Decisões desta revisão, em relação ao pré-plano:

- A biblioteca do editor não para nas 266 chaves já registradas. Um índice gerado cobre todo modelo de cenário compatível, e modelo novo entra por script, não por edição manual de `kaykit-props.js`.
- O bioma `bare` deixa de ser a única forma de ver decoração no jogo. O alvo é procedural mais objetos manuais, com o editor mostrando o mesmo que o play.
- O teto de 160 não é apagado no escuro. Vira orçamento de render, com geometria compartilhada e instância para repetidos.
- Fases reordenadas: design system, biblioteca, world builder, ferramentas, bioma/camadas, catálogo, administração, HUD.
- Salvamento do mapa passa a ter rascunho local (pendente, salvar, descartar, undo). Isso não é publicação versionada.

---

## A. Diagnóstico atual

### Arquitetura

O admin é um app React em `idle/admin-ui`, build servido em `/jogo-idle/admin/`. `App.tsx` busca `/api/jogo-idle/meta`, guarda catálogo, zonas, balance, manutenção e e-mails admin, e desenha um header extra (“Jogo IDLE · standalone”). `JogoIdleAdmin.tsx` (~1170 linhas) segura o estado de itens, monstros, economia, temporada, alvo e zona, e monta uma aba por vez dentro de `admin-shell.tsx`.

O shell Studio 2.0 (`studio-2.css`) é um cartão com `min-height: min(78vh, 920px)`, raio e borda, grid `220px + 1fr`. A página e o workspace rolam. Abaixo de 1100px a sidebar vira faixa. Dois dourados convivem: `#c9a227` no header shadcn e `#f4b52b` no studio.

Painéis de Economia, Temporada, Personagens, Engajamento e Logs usam Card/Button do shadcn. Itens, Monstros, Mapa, HUD, Loot e Simulador usam primitivos `studio-2`. Economia, Temporada e Personagens são a mesma grade de três colunas; as inativas ficam esmaecidas e cortadas.

### Persistência e auth

`POST /api/jogo-idle/admin/config` aplica o override na hora e grava o singleton de catálogo (`adminUpdateConfig` → `writeCatalogState`). Zona, cena, monstros, drop, mercador, evento, balance e manutenção passam por essa rota. Catálogo, grant, personagem, simulação, logs e HUD têm rotas próprias em `idle/src/server.ts`.

Não há draft de mundo. O HUD é a exceção: `PUT /admin/hud-layout/draft`, `POST .../publish`, `restore`, `history`. O play só lê o publicado (`GET /hud-layout`).

`adminEndSeason` exige `confirm: true`, grava a ação e responde que temporada/reset não está habilitado neste standalone. Claim de engajamento do jogador responde 410.

Autorização: `assertIdleAdmin` no serviço, CSRF no `idleFetch` de `App.tsx`. Modo local usa e-mail fixo; modo protected exige principal ADMIN. Nenhuma fase abaixo troca esse gate.

### O que cada recurso é, no código

| Recurso | Classe | Evidência |
|---|---|---|
| CRUD de item, grant, reset, delete | Funcional | `admin/catalog`, `grant`, `catalog/delete`, `catalog/reset` |
| Overrides de zona (nível, tier, drop, ascensão, mult. de boss) | Funcional | `adminUpdateConfig` + `sanitize` |
| Monstros, boss, onda, visualId | Funcional | payload `zone.monsters` / `boss` / `bossWaveSize` |
| Preview 3D de item e monstro | Parcial | iframe `admin-studio/preview.html`; no desktop largo a coluna sai da área útil |
| Lista de 1157 itens | Parcial | virtualização real; `selected` cai no primeiro item enquanto o draft ainda é “Novo item” |
| Mapa: cena, bake, colocar, selecionar, arrastar no chão, Q/E, Delete | Funcional | `map-editor.js` |
| Botões Mover, Rotacionar, Escalar, Grade, Snap, Publicar | Desabilitado | `disabled` em `admin-map.tsx`; não há gizmo nem snap no motor |
| Paleta do mapa | Parcial | 44 chaves hardcoded; `listKayKitPalette()` (266) não é chamado |
| Decorações no play | Parcial | só entram se `props === "bare"` (`scene3d.js`) |
| Kenney / Quaternius no save | Inexistente na persistência | `ZONE_PROP_PACKS` tem 6 packs; o sanitize descarta o resto |
| Camadas do dock | Apenas visual | texto “ainda não suportado” |
| Pipeline da Visão Geral | Apenas visual | três colunas “Fase 4”, `aria-disabled` |
| Habilidades / drops / balance de monstro | Apenas visual | parágrafos de fase futura |
| Drop global, TTK, refinador | Duplicado | Loot, Economia e Configurações escrevem o mesmo estado |
| Alvo de personagem | Duplicado | topo do shell, card da Visão Geral e select de Personagens |
| Logs | Duplicado | aba Sistema e `AdminActionsHistory` no fim da Economia |
| Zona selecionada | Duplicado | `jogo-idle-admin-zoneId` vs `jogo-idle-admin-mapZoneId` |
| Simulador | Funcional | `POST /admin/simulate`, não grava |
| Engajamento | Funcional | `GET /admin/engagement-metrics` |
| HUD draft, publicar, undo, snap, breakpoints | Funcional | rotas e `admin-hud-builder.tsx` |
| Fim de temporada | Legado / stub | `adminEndSeason` |
| Backup, criar zona, loot por monstro, skill de mob, spawn XYZ, publicar mapa | Inexistente | sem API ou sem campo no save |
| `asset-registry.js` | Funcional e manual | 4 visuais de monstro e GLBs de item em `custom/`; não é a biblioteca de cenário |

### O que reaproveitar

- Primitivos de `studio-ui.tsx` (catálogo, inspetor, toolbar, badge) como contrato, não como CSS final.
- Iframe do mapa e o protocolo `postMessage` até a fase de gizmos.
- `listKayKitPalette`, `spawnKayKitDecoration`, `preloadDecorationPacks`, `extractKayKitPlacements`.
- `sanitizeZoneScene` como portão do save (estendido, não contornado no cliente).
- Draft/publish do HUD como referência de produto, sem copiar o modelo para o mundo inteiro nesta leva.
- Moldura, tipo e cor de `login.css`, `lobby.css` e `styles/hall-frame.css`.
- `recordAdminAction` para auditoria de save.

### Limitações que o plano trata de propósito

1. Decoração manual some no jogo fora de `bare`.
2. Teto 160, no cliente e no sanitize.
3. Packs fora de `ZONE_PROP_PACKS` não persistem.
4. `clone(true)` da cena GLTF duplica geometria a cada prop (`kaykit-props.js`).
5. Arena pequena: X/Z aceitos só entre −24 e 24. Não é mundo aberto.
6. Estado concentrado num componente.

---

## B. Inventário de assets

Contagem em `idle/public/jogo-idle/assets` (28/10/2026):

| Tipo | Quantidade | Papel |
|---|---|---|
| `.gltf` | 844 | Entrada de modelo; quase sempre com `.bin` irmão |
| `.bin` | 844 | Geometria companheira. Não é objeto posicionável |
| `.glb` | 611 | Modelo autocontido |
| `.png` | 150 | Textura ou UI. Dependência, não card da biblioteca |
| Candidatos em `kaykit`, `props`, `kenney`, `quaternius` (gltf/glb, fora de rig/arma/item) | ~1373 | Conjunto a classificar, não a despejar no editor |
| Chaves em `PACKS` (`kaykit-props.js`) | 266 | O que o motor sabe instanciar hoje |
| Chaves na paleta React (`PALETTE` em `admin-map.tsx`) | 44 | O que o admin mostra |
| GLB em `assets/custom/` | 23 | Equipamento. Biblioteca de item, não de mapa |
| Rigs em `kaykit/character-animations` | dezenas de GLB | Animação. Fora do mapa |

Packs registrados hoje:

| Pack | Chaves | Pasta |
|---|---|---|
| dungeon | 45 | `kaykit/dungeon/` (fallback `props/dungeon/`) |
| nature | 14 | `props/nature/` |
| forest | 36 | `kaykit/forest/` |
| city | 14 | `props/city/` |
| space | 22 | `props/space/` |
| halloween | 28 | `kaykit/halloween/` (fallback `props/halloween/`) |
| kenneyGraveyard | 50 | `kenney/graveyard/` |
| kenneyNature | 36 | `kenney/nature/` |
| quaterniusSpace | 21 | `quaternius/space/` |

O admin mostra só um recorte dos seis primeiros packs e esconde Kenney e Quaternius. Mesmo que a UI passasse a chamar `listKayKitPalette()`, o save ainda apagaria Kenney e Quaternius: `ZONE_PROP_PACKS` em `zone-scene.ts` só aceita `dungeon`, `nature`, `forest`, `city`, `space`, `halloween`.

Há muito mais gltf/glb no disco do que as 266 chaves. Parte é duplicata (`props/` como fallback do `kaykit/`), parte é peça de kit que o `PACKS` nunca nomeou, parte não é cenário. Por isso o índice classifica; não promove os 1373 arquivos.

### Classes do índice

| Classe | Destino |
|---|---|
| `sidecar` | `.bin` referenciado por gltf. Não aparece |
| `texture` | png/jpg/webp usados pelo material. Não aparece |
| `rig` | `character-animations`, manequim, esqueleto de animação |
| `monster` | GLB apontados por `asset-registry.js` / pasta de personagens de combate |
| `equipment` | `assets/custom/` e entradas `kind: "item"` |
| `placeable` | malha estática de cenário, com textura resolvível |
| `duplicate` | mesmo papel que um `placeable` já escolhido (em geral `props/` quando `kaykit/` existe) |
| `incompatible` | skinned sem uso de prop, zero meshes, textura ausente, caminho fora de `/jogo-idle/assets/` |

Cada incompatível guarda o motivo. A UI mostra a linha desabilitada com esse texto, não um card que falha em silêncio.

### Como um modelo novo entra

1. O arquivo vai para uma pasta já servida (`kaykit/`, `props/`, `kenney/`, `quaternius/` ou uma pasta nova listada no script).
2. `npm run props:index` (nome de trabalho) varre essas pastas, classifica, deduplica e grava `idle/public/jogo-idle/admin-studio/prop-manifest.json` mais as miniaturas cujo hash mudou.
3. O loader do jogo importa o manifesto. `PACKS` escrito à mão deixa de ser a lista que alguém edita prop a prop; vira semente histórica que o script absorve.
4. O sanitize do servidor aceita `pack` que exista no manifesto embutido no build do server (o mesmo JSON), com teto de tamanho e rejeição de `..` e URL absoluta.

O browser não lista diretório. Só pede URLs que o manifesto já autorizou.

Miniatura: script sequencial, um modelo por vez, WebP em `assets/thumbs/props/{pack}/{key}.webp`, cache por hash do arquivo. O admin mostra a imagem. O preview 3D com órbita existe só para o asset selecionado (um iframe ou um viewer), nunca uma cena Three por card.

Categorias saem do caminho e do nome (`tree`, `bush`, `rock`, `wall`, `floor`, `door`, `torch`, `grave`, `chest`, `building`, `light`, …), com um mapa editável `prop-categories.json` para corrigir exceção sem reclassificar o disco inteiro. Busca por nome, pack e categoria.

---

## C. Navegação

Um dado, um editor. As outras telas leem ou apontam para ele.

| Área | Módulos | Dono do dado |
|---|---|---|
| Início | Visão Geral | só leitura das APIs já existentes |
| Mundo | zona, mapa, objetos, monstros, regras da zona | um `zoneId` |
| Catálogo | itens, leitura de loot | template de item |
| Jogadores | personagens e ações já existentes | `characterId` |
| Live Ops | drop global, TTK, refinador, mercador, evento, temporada | config de mundo |
| Laboratório | simulador | nenhum save |
| Interface | HUD Builder | draft/publicado de HUD |
| Sistema | manutenção, logs, allowlist | config / auditoria |

Capítulo não ganha CRUD. `chapterId` na zona é contexto de navegação (filtrar a lista), porque a progressão e o desbloqueio continuam no conteúdo do jogo.

Spawn com coordenada não entra. O jogo sorteia a lista de mobs e usa `bossWaveSize`. Marcador no mapa fica como oportunidade, não como fase.

Mercador fica em Live Ops, não no catálogo. Loot do catálogo explica o pool por tier e leva ao dono do drop global.

Backup, criar zona, loot table por criatura, skill de mob e publicar mapa versionado ficam fora das oito fases, com a API descrita na seção I para não virar botão morto.

---

## D. Design system Admin 3.0

Referências reais, não um tema genérico:

- Login (`login.css`): navy `#071524` / `#061323`, ouro `#f4b52b` e `#ffd56a`, tinta `#e8f0f8`, muted `#8aa4bc`, Cinzel no título, Source Sans 3 no corpo, painel à direita sobre arte escurecida.
- Salão (`lobby.css` + `styles/hall-frame.css`): moldura com borda dupla e cantos de 14px, botão ouro em degradê, ghost com fio dourado, danger vinho. O modal de excluir personagem do lobby já usa esse kit.
- Studio de criação (`criar.css` + `hall-frame.css`): três etapas, painéis lado a lado, prévia 3D como coluna, rodapé de ação fixo.
- HUD de jogo (`hud.css`, `.panel-frame`): moldura de combate. Serve de parentesco (ouro, osso, perigo), não de densidade. O admin não copia a HUD de luta.

Regra: ornamento na moldura, no título e no modal. Miolo do editor é grade, 14–16px de tipo de corpo, label de 12px (não 10px), números tabulares. Um ouro só: `#f4b52b`.

Kit `studio-3` (substitui o visual `studio-2` e o shadcn visível):

- Botões `gold`, `ghost`, `danger`, `quiet`, com estado disabled e foco visível.
- Input, select, textarea, switch, slider, no mesmo navy e fio.
- Tabela com cabeçalho sticky.
- Abas internas (as do item e do monstro).
- Tooltip e toast (o mapa já manda `map-editor-toast`; o shell passa a desenhar).
- Modal `sm` (confirmação), `md` (formulário curto), `lg` (comparação ou preset). Cabeçalho, texto, corpo, rodapé. Foco preso. Escape cancela. Enter confirma só quando o alvo não é destrutivo; exclusão exige o botão danger.
- Badge `ok`, `warn`, `danger`, `draft`.
- Empty state com uma ação.
- Dirty: ponto no título da zona e bloqueio ao trocar de zona ou fechar.

shadcn pode continuar como primitivo invisível. A tela não pode mostrar o card claro do shadcn ao lado da moldura do salão.

Ícones: um set geométrico (SVG), monocromático, tamanho fixo. Os glifos Unicode atuais saem (⚔ vira ×, HUD não tem ícone).

---

## E. Layout por módulo

Shell comum. A página não rola. O workspace rola. Inspector e biblioteca têm largura própria e colapsam, não empurram o miolo para fora.

```
┌ Topo ─────────────────────────────────────────────────────────────┐
│ Jogo IDLE · Admin Studio    Mundo / Bosque     ● salvo   admin  ← │
├ Nav ────────┬ Workspace ──────────────────────────┬ Inspector ────┤
│ Início      │                                     │               │
│ Mundo       │           ferramenta                │  contexto     │
│ Catálogo    │                                     │               │
│ Jogadores   │                                     │               │
│ Live Ops    │                                     │               │
│ Laboratório │                                     │               │
│ Interface   │                                     │               │
│ Sistema     │                                     │               │
├ Status (só se houver log, bake ou erro) ──────────────────────────┤
└───────────────────────────────────────────────────────────────────┘
```

Topo: logo, nome do studio, trilha da área, estado (salvo / não salvo / gravando / erro), e-mail admin, voltar ao lobby. Manutenção não é o botão principal de toda tela; vive em Sistema, com um selo no topo quando estiver ligada.

Nav: grupos recolhíveis, item ativo em pílula ouro (como o salão), modo ícone abaixo de ~1200px. Em viewport estreita a nav vira gaveta, não faixa de 16 links.

Inspector direito: ausente no dashboard e em Live Ops de leitura longa; presente em mapa, item, monstro, jogador e HUD.

Rodapé: uma linha. Aparece com erro de save, contagem de decorações contra o orçamento, ou última ação admin. Não é um segundo log permanente.

Breakpoints de aceite: 1920×1080, 1440×900, 1280×800. Em 1280 a biblioteca do mapa colapsa para ícones + busca, o viewport continua visível sem scroll horizontal.

### Visão Geral

```
┌ Atalhos: Mundo · Itens · Jogadores · Live Ops ┐
├ 23 zonas │ 46 monstros │ 1157 itens │ 1 personagem │ temporada │ manutenção ┤
├ Atividade recente (actions?limit=12)          │ Engajamento do dia (se a API responder) ┤
└ Sem coluna “pipeline”. Sem gráfico sem série. ┘
```

Ações: abrir a zona mais recentemente alterada, abrir o catálogo, ver logs. Empty de atividade: “Nenhuma ação administrativa registrada.” Salvamento: não edita. Responsivo: KPIs em duas colunas; listas empilham.

### World Builder

```
┌ Bosque dos Sussurros · Cap. I · floresta · overlay │ Descartar │ Salvar ┐
├ Biblioteca 280px ┬ Viewport (flex, mín. 60%) ┬ Inspetor 300px ┤
│ busca            │ Navegar Selecionar Colocar│ Objeto         │
│ Árvores (12)     │ [cena = a do play]        │ pack/key       │
│ thumb            │                           │ X Z  rotY  esc │
│ …                │                           │ Duplicar Apagar│
├ Dock recolhível: Camadas · 40/orçamento · log do viewport ─────┤
└────────────────────────────────────────────────────────────────┘
```

Toolbar só com ferramenta que o motor da fase corrente executa. Grade e snap entram na fase 4, não como botão disabled na fase 3. Publicar não aparece.

Modal `sm`: apagar objeto (se a seleção tiver mais de um), descartar alterações da zona, sair com dirty. Modal `md`: preset de ambiente (fase 5).

Empty: zona sem cena salva mostra o preset do `ZONE_SCENE_PRESETS` e diz “ainda sem override”. Feedback: “Não salvo” no topo; toast de erro com a mensagem do servidor; Salvar desabilita enquanto `working`.

### Biblioteca de assets (dentro do World Builder e como superfície de revisão)

```
┌ busca          │ categoria ▼ │ só posicionáveis │ problemas (3) ┐
├ grade de thumbs (lazy, virtualizada)                          ┤
└ selecionado: nome, pack, categoria, preview 3D, Inserir no mapa ┘
```

Incompatíveis ficam no filtro “problemas”, com o motivo, sem botão Inserir. Duplicata não ganha card; o manifesto aponta o canônico.

### Catálogo de itens

```
┌ busca · classe · slot · tier · raridade  (1157) ┐
├ lista virtual ┬ abas Geral Atributos Drop Visual ┬ preview 3D ┤
│ T1 Botas      │ nome, slot, classes, tier        │ sempre     │
│ Guerreiro     │                                  │ visível    │
└ Novo · Duplicar · Salvar · Conceder · Excluir (modal) ─────────┘
```

A linha selecionada e o draft são o mesmo objeto. Clique em Novo limpa a seleção. A linha mostra classe, não só slot e drop. Dirty ao trocar de item pede descarte. Preview não pode ficar fora da largura: em 1440 o inspetor fica embaixo do editor se não couber ao lado, nunca cortado.

### Editor de monstros

```
┌ zona atual (a do Mundo) · busca ┐
├ lista mob/boss ┬ abas Identidade · Atributos · Onda ┬ preview 3D ┤
└ Salvar zona (um save) · Reset boss e Reset onda só se houver override ┘
```

Sem abas que só explicam fase futura. Recompensa e skill ausentes não ocupam aba; uma linha no inspetor diz onde o drop da zona é editado (Live Ops / regras da zona).

### Jogadores

```
┌ busca ┬ lista (nome, classe, nível, ascensão, ouro) ┬ ficha ┐
│       │                                             │ ouro  │
│       │                                             │ nível │
│       │                                             │ pontos│
│       │                                             │ cosmético │
└ modal sm para limpar mochila e excluir, com nome e conta no texto ┘
```

O select global “Alvo ativo” sai do topo. Grant de item usa o personagem aberto nesta área. Empty: “Nenhum personagem ativo.”

### Live Ops

Uma coluna, largura de leitura, seções recolhíveis: Drop e combate (o único editor de drop global, TTK e refinador), Mercador, Evento, Temporada. Engajamento é a página de métricas já existente, no kit `studio-3`, sem formulário misturado. Cada seção salva a sua. Não há três colunas esmaecidas.

### Simulador

```
┌ zona (contexto) · monstro · nível · ATK · DEF · HP │ Rodar ┐
├ resultado: TTK, hits, dano, XP/h, ouro/h, drop estimado    ┤
└ texto fixo: “Nada foi gravado.” Link “editar TTK” → Live Ops ┘
```

Sem gráfico até existir série real devolvida pela API. Comparar dois perfis é oportunidade, não entrega da fase 7, salvo se o mesmo endpoint puder ser chamado duas vezes e a UI só justapor números.

### HUD Builder

O miolo atual permanece: árvore, canvas, inspetor, undo, snap, breakpoints, rascunho, publicar. Muda a casca (topo, toolbar `studio-3`, painéis recolhíveis). Não se reescreve o documento de layout nem as rotas.

### Sistema

Manutenção (o interruptor do jogo, com modal `sm` e o texto que já existe), logs (uma tabela), allowlist somente leitura. Backup não tem item de menu enquanto não houver API.

---

## F. Arquitetura técnica

### Shell e estado

- `AdminShell` full viewport, um header.
- `AdminZoneContext`: o único `zoneId`, persistido numa chave de session. O mapa abandona `jogo-idle-admin-mapZoneId`.
- Hooks por módulo (`useCatalogDraft`, `useZoneSceneDraft`, `useLiveOpsConfig`, o estado de HUD que já é local). `JogoIdleAdmin` deixa de ser o dono dos drafts.
- `idleFetch` continua o cliente único, com CSRF.

### Biblioteca

```
pastas de assets
    → script props:index
        → prop-manifest.json (id, pack, key, url, category, hash, status, reason)
        → thumbs/*.webp
    → kaykit-props lê o manifesto
    → sanitize no server aceita pack presente no mesmo manifesto
    → admin lista o manifesto; não varre disco
```

`spawnKayKitDecoration(pack, key)` continua a API de colocar. O que muda é a origem da tabela pack/arquivo. Caminho com `..` ou protocolo é rejeitado no script e de novo no loader.

### Bioma + decoração (o jogo e o editor iguais)

Hoje `applyZone` em `scene3d.js` monta o bioma procedural e só então, se `props === "bare"`, acrescenta `cfg.decorations`. O comentário no arquivo explica o motivo: overrides antigos de bake deixaram barris em zona que voltou a ser gelo, e o jogo passou a ignorar essas listas.

Arquitetura alvo, sem mudar progressão:

- Campo novo opcional `scene.decorationMode`: `"off"` (default dos saves velhos) ou `"overlay"`.
- `"off"` mantém o comportamento atual. Lista esquecida em floresta/gelo continua invisível.
- `"overlay"` desenha o procedural do `props` atual e, por cima, as decorações manuais. Floresta continua floresta; a árvore colocada à mão aparece.
- O editor, ao criar ou editar a lista, grava `decorationMode: "overlay"`. Não liga isso sozinho em zona que só tem lixo legado.
- `bare` + decorações (mapa assado de hoje) segue válido: `bare` é o chão, as peças extraídas são a lista. Bake continua existindo para quem quiser converter o procedural em peças editáveis (`extractKayKitPlacements`).
- Uma função só, usada pelo play e pelo iframe: compor procedural + grupo de decorações conforme o mode. O viewport deixa de ser uma cena “parecida” e passa a ser o mesmo caminho.

Iluminação e atmosfera já são campos de `ZoneScene` (`bg`, `ground`, `hemiSky`, `sunColor`, intensidades, fog, partículas, densidade). A fase 5 expõe esses campos no inspetor da zona, não inventa um sistema de luzes nomeadas. Luz por objeto não existe no formato; não entra como ferramenta.

Não há heightmap, tile paint nem elevação. “Terreno” nesta leva é: escolher `props` / `variant` / densidade, e opcionalmente assar. O plano não desenha botão de esculpir chão.

### Orçamento no lugar do 160 cego

O 160 está em dois lugares, com o mesmo número:

- `MAX_DECOS` em `map-editor.js`.
- `MAX_DECORATIONS` em `zone-scene.ts`, comentário: floresta densa assada gera ~120 props, e o teto deixa uma margem. O sanitize corta com `slice(0, 160)`. X/Z ainda morrem fora de −24..24.

Não é limite do Three.js. É proteção de payload e de um `clone(true)` por prop (`gltf.scene.clone(true)` copia geometria).

Substituição, sem soltar a proteção:

- Geometria de prop estático reutilizada (clone raso do mesh, material compartilhado salvo quando há tint). Tint continua material próprio.
- Repetidos do mesmo `pack+key` sem tint podem ir para `InstancedMesh` no play. O editor pode manter objetos individuais enquanto a contagem estiver dentro do orçamento interativo, e instanciar acima disso.
- Orçamento em dois números, configuráveis no código (não na UI no primeiro corte): `maxDecorations` (peças lógicas, sobe de 160 para algo como 400 só depois do share de geometria medido) e `maxUniqueGeometries` carregadas por zona.
- Frustum culling já é o default do Three para mesh na cena; não é feature nova. Setor/streaming não se justifica: a zona é uma arena de ~48 unidades. LOD só se uma zona medida passar do frame budget; não se cria LOD de centenas de KayKit de antemão.
- Preload só dos packs citados pelo procedural da zona e pelas decorações, como `preloadKayKitProps` já faz. A biblioteca do admin não pré-carrega o manifesto inteiro.
- O teto antigo permanece como fallback se a medição da fase 5 não mostrar ganho. Não se remove o `slice` antes do instancing existir.

### Salvamento do mapa (local ≠ publicação)

Estado no cliente: `savedScene` e `draftScene`. Editar muda só o draft. Topo mostra “Não salvo”. Salvar manda um `POST /admin/config` com `{ zone: { id, scene } }` — o mesmo contrato de hoje. Descartar copia `savedScene` de volta e reenvia a cena ao iframe. Trocar de zona, de área do admin ou fechar a aba com dirty abre modal; `beforeunload` cobre o refresh.

Undo/redo é pilha local de operações (colocar, mover, rotacionar, escalar, duplicar, apagar, mudar luz). Não vai ao servidor a cada passo. Não é revisão publicada.

Erro de save: toast com a mensagem do servidor, draft intacto. Se o refresh do meta voltar outra cena, o cliente não pisa no dirty; mostra o conflito em uma linha (“o servidor tem outra versão”) e oferece recarregar ou sobrescrever. Não há trava otimista hoje; essa linha é o mínimo sem API nova.

`recordAdminAction` já registra a gravação da zona. O log do Sistema continua sendo esse registro, não a pilha de undo.

Publicação versionada de mapa **não** entra nas oito fases. Se for feita depois, o modelo a copiar é o do HUD (draft, revision, publish, history), com rotas novas e campo no catálogo. Até lá o override salvo é o que o jogo lê, como hoje.

Auth e CSRF permanecem na frente de todo POST.

---

## G. Matriz

Esforço: P pequeno, M médio, G grande. Prioridade dentro do Studio 3.0.

| Funcionalidade | Hoje | Alvo | Esforço | Depende de | Prioridade | Risco | Fase |
|---|---|---|---|---|---|---|---|
| Shell full viewport e nav em grupos | Cartão + lista plana | App único | M | design system | Alta | Baixo | 1 |
| Kit visual único | studio-2 + shadcn | studio-3 | M | tokens do jogo | Alta | Baixo | 1 |
| Modais no lugar de `window.confirm` | Nativo no admin | Modal sm | P | kit | Alta | Baixo | 1 e 7 |
| Índice de props | 266 manuais, 44 na UI | Manifesto gerado | G | pastas estáveis | Alta | Médio (classificar errado) | 2 |
| Miniaturas | Não | WebP por hash | M | índice | Alta | Médio (tempo de script) | 2 |
| Sanitize aceita packs do manifesto | 6 packs | allowlist gerada | P | índice | Alta | Alto se soltar path | 2 |
| Geometria compartilhada | `clone(true)` | cache | M | loader | Alta | Médio | 2–5 |
| Layout world builder | Toolbar + iframe + dock | biblioteca, viewport, inspetor | M | shell, manifesto | Alta | Baixo | 3 |
| Zona única | Dois sessionStorage | contexto | P | shell | Alta | Baixo | 3 |
| Dirty / salvar / descartar mapa | Save imediato | draft local | M | layout | Alta | Médio | 3 |
| Ferramentas já reais (selecionar, arrastar XZ, Q/E, colocar, apagar, bake) | Existem, UI mente | Botões verdadeiros | P | iframe atual | Alta | Baixo | 3 |
| Gizmo, snap, escala visual, duplicar | Não | No iframe | G | fase 3 | Alta | Alto no viewport | 4 |
| Undo do mapa | Não | Pilha local | M | fase 3 | Alta | Médio | 4 |
| Multi-seleção | Não | Se o raycast aguentar | M | gizmo | Média | Médio | 4 |
| Overlay procedural + manual | Só `bare` | `decorationMode` | G | compose compartilhado | Alta | Alto (lixo legado) | 5 |
| Camadas (mostrar, travar) | Placeholder | campo `layer` opcional | M | formato compatível | Média | Baixo | 5 |
| Inspetor de luz/fog/partículas | Campos espalhados | Um bloco da zona | P | ZoneScene já tem os campos | Média | Baixo | 5 |
| Subir teto com instancing | 160 | orçamento | G | share de geometria | Alta | Alto se subir sem medir | 5 |
| Catálogo: seleção = draft, preview visível | Bug + coluna cortada | Editor de 3 colunas | M | shell | Alta | Baixo | 6 |
| Monstros sem abas vazias | 3 abas mortas | 3 abas reais | P | zona única | Média | Baixo | 6 |
| Live Ops sem duplicar drop/TTK | 3 telas escrevem | 1 editor | M | shell | Alta | Médio (regressão de save) | 7 |
| Dashboard só com API real | KPIs + kanban falso | KPIs + ações + métricas | P | rotas atuais | Média | Baixo | 7 |
| Jogadores em lista + modal | Form único | Lista e ficha | M | kit | Média | Baixo | 7 |
| HUD na casca nova | Editor próprio | Mesmo shell, mesmo motor | M | fase 1 | Média | Médio se mexer no draft | 8 |
| Publicar mapa versionado | Não | Fora | G | API nova | Baixa | Alto | depois |
| Spawn XYZ, heightmap, backup, criar zona | Não | Fora | G | motor ou API | Baixa | Alto | depois |

---

## H. Fases

Cada fase deixa o admin utilizável. Rollback é reverter o commit da fase; saves antigos continuam válidos porque campo novo é opcional e `decorationMode` ausente significa “comportamento de hoje”.

### Fase 1 — Design system e shell

Status: implementada em 28/10/2026. O apêndice no fim deste arquivo registra o que entrou no código e o que ficou para as fases seguintes. O texto abaixo permanece como especificação original.

Objetivo: o admin parecer o salão, em tela cheia, com uma navegação só.

Arquivos: `idle/admin-ui/src/admin/studio/` (CSS e primitivos novos), `admin-shell.tsx`, `App.tsx` (header externo sai), `index.css` (tokens alinhados ao login). Painéis existentes só trocam classe, sem mudar payload.

Entrega: moldura, botões, inputs, modal sm, toast, nav em grupos, colapso, sem scroll duplo em 1440 e 1920.

Conclusão: uma família visual nas 16 áreas atuais; manutenção continua funcionando; nenhum POST mudou de contrato.

Cuidado: não “consertar” lógica de item ou mapa nesta fase.

### Fase 2 — Biblioteca 3D

Status: implementada em 28/10/2026. Contagens, arquivos e o guia de modelo novo estão no apêndice. O texto abaixo permanece como especificação original.

Objetivo: todo placeable compatível no catálogo, modelo novo sem editar lista à mão.

Arquivos: script novo em `idle/scripts/` (indexação e thumbs), `prop-manifest.json`, `kaykit-props.js` (ler manifesto, cache de geometria), `zone-scene.ts` (`ZONE_PROP_PACKS` passa a derivar do manifesto ou aceitar pack do manifesto), teste do sanitize para path ilegal e pack desconhecido.

Entrega: manifesto classificado; UI ainda pode ser a paleta antiga apontando para o manifesto inteiro (a casca bonita da biblioteca é a fase 3); Kenney e Quaternius sobrevivem ao save; incompatível tem motivo; duplicata não vira segundo card.

Conclusão: adicionar um gltf numa pasta varrida e rodar o script faz a chave existir no manifesto e no loader, sem linha nova em `kaykit-props.js`. Um `.bin` não vira card. Um GLB de elmo não vira árvore.

Dependência: a fase 3 consome esse manifesto. Não inverter.

### Fase 3 — World Builder (layout e ferramentas que já existem)

**Status: implementada em 28/10/2026.** A especificação abaixo permanece. O que entrou no código, e o que ficou de fora, está no apêndice da Fase 3. Undo, gizmos e snap não fazem parte desta fase.

Objetivo: editor de cenário legível, zona única, save explícito, viewport fiel ao play **de hoje**.

Arquivos: `admin-map.tsx` (reescrever layout), `map-editor.js` (comandos já existentes, mais dirty/undo ainda não), `JogoIdleAdmin.tsx` (tirar o zone id paralelo), contexto novo.

Entrega: biblioteca | viewport | inspetor; buscar nas chaves do manifesto; selecionar, arrastar no chão, rotacionar, colocar, apagar, assar; Salvar e Descartar; modal ao sair dirty. Botões mortos não aparecem. Enquanto a fase 5 não chega, o inspetor diz com clareza: decorações manuais só entram no jogo em bioma `bare` ou depois do overlay. O viewport usa a mesma regra do play, para não mentir.

Conclusão: colocar uma árvore, ver “Não salvo”, descartar e voltar ao servidor; salvar e ver a cena no play quando a regra atual permite.

### Fase 4 — Ferramentas avançadas

**Status: implementada em 28/10/2026.** A especificação abaixo permanece. Gizmos, snap, duplicar e undo/redo estão no apêndice da Fase 4. Multi-seleção ficou de fora, sem botão desabilitado.

Objetivo: edição visual, não só número e Q/E.

Arquivos: sobretudo `map-editor.js`. A UI só ganha os botões quando o comando existe.

Entrega: gizmo de mover (XZ; Y só se o campo `y` já aceito pelo sanitize for exposto), rotacionar, escala uniforme, snap no plano, duplicar, undo/redo da pilha local, atalhos que não brigam com Q/E/1/2/3/Delete/Escape já usados. Multi-seleção se o raycast de decoração aguentar sem selecionar o bioma procedural inteiro; se não aguentar, fica de fora desta fase em vez de um botão morto.

Conclusão: mover e rotacionar sem abrir o inspetor; Ctrl+Z desfaz no draft; Salvar ainda é um POST só.

Risco: regressão do viewport de jogo se o gizmo vazar para `scene3d.js`. O gizmo fica no iframe do editor.

### Fase 5 — Biomas, overlay e camadas

**Status: implementada em 29/10/2026.** A especificação abaixo permanece. O apêndice da Fase 5 registra o overlay, as camadas, o inspetor de ambiente, o instanciamento e o teto que ficou em 160.

Objetivo: floresta (e os outros kinds) mais objetos manuais, no editor e no play, com orçamento em vez de 160 cego.

Arquivos: `scene3d.js` (`applyZone`), `map-editor.js` (compor igual), `zone-scene.ts` (`decorationMode`, `layer` opcional, teto novo só com o share de geometria), `kaykit-props.js` (instância ou clone raso).

Entrega:

- `decorationMode: "overlay"` desenha procedural + lista.
- Saves sem o campo não mudam de aparência.
- Bake para `bare` continua disponível.
- Camadas: `layer` opcional (`terreno` não, porque não há malha de terreno editável; usar `vegetacao`, `estrutura`, `decoracao`, `efeito`). Mostrar, ocultar e travar são estado do editor. O play desenha todas as camadas salvas; ocultar não é um delete.
- Inspetor da zona: props, variant, densidade, céu, chão, hemisfério, sol, fog, partículas. Preset reaplica `getZoneScenePreset` sem apagar a lista de decorações, a menos que o modal avise.
- Orçamento: medir uma zona assada e uma zona overlay antes de subir o teto. Documentar o número escolhido no sanitize. InstancedMesh para repetidos sem tint.

Conclusão: Bosque dos Sussurros permanece `forest`, ganha uma árvore manual, o play mostra os dois, e uma zona antiga com lista órfã não ganha barris de surpresa. Progressão, `minLevel`, ascensão e capítulo não são editados nesta fase (seguem na ficha da zona, fase 7 ou na tela de regras já existente, sem mudar a regra).

Não entra: esculpir chão, pintar tile, luz pontual por objeto, streaming por setor.

### Fase 6 — Catálogo e monstros

**Status: implementada em 29/10/2026.** A especificação abaixo permanece. O apêndice da Fase 6 registra a seleção, os dois editores e o que o save de monstros deixa de fora.

Arquivos: `admin-items.tsx`, `admin-monsters.tsx`, `JogoIdleAdmin.tsx` (draft de item mora no módulo).

Entrega: seleção sincronizada; preview sempre na área útil; classe na linha; abas vazias de monstro removidas; monstro usa o `zoneId` do Mundo.

Conclusão: abrir “Botas de Couro” preenche o form daquele id; Novo limpa a lista; salvar não grava outro id.

### Fase 7 — Administração

**Status: implementada em 29/10/2026.** A especificação abaixo permanece. O apêndice da Fase 7 registra o dashboard, o editor único de Live Ops, os modais de jogador e a correção isolada de `skillElementBonus`.

Arquivos: `admin-liveops.tsx`, `admin-economy.tsx`, `admin-settings.tsx`, `admin-loot.tsx`, `admin-overview.tsx`, `admin-characters.tsx`, `admin-engagement.tsx`, `admin-season.tsx`, `admin-simulate.tsx`, `admin-actions-history.tsx`.

Entrega: um editor para drop e TTK; loot e simulador só leem e apontam; dashboard sem pipeline falso, com atalhos e métricas reais; jogadores em lista e modais de ação perigosa; engajamento no kit novo; temporada continua mostrando o estado real (incluindo o stub, dito com essa palavra, sem botão que finja resetar o mundo se a API não resetar).

Conclusão: mudar o drop em Live Ops muda o valor que Loot e a Visão Geral mostram; não há segundo input.

### Fase 8 — HUD e acabamento

**Status: implementada em 29/10/2026.** A especificação abaixo permanece. O apêndice da Fase 8 registra o workspace, os modais e a correção de `trusted.reason`.

Arquivos: `admin-hud-builder.tsx` e CSS do shell. Sem mudar o schema do documento de HUD.

Entrega: HUD dentro do shell, painéis recolhíveis, mesmos atalhos de undo. Passada final de foco, empty states e de não haver `window.confirm` nas ações destrutivas do admin.

Conclusão: publicar HUD continua exigindo draft limpo, como hoje.

### Ordem e dependências

1 → 2 → 3 → 4, e 5 depois de 3 (pode paralelizar com 4 só se o compose do iframe não estiver sendo reescrito ao mesmo tempo; na prática 5 vem depois de 4). 6 e 7 dependem de 1 e podem começar depois de 3 se outra pessoa pegar, mas o default é sequencial para não misturar duas cascas. 8 por último para não reestilizar o HUD duas vezes.

Primeira fase a implementar: **Fase 1**. A primeira que muda o ato de construir mapa é a **Fase 3**, e ela precisa do manifesto da Fase 2.

---

## I. Riscos e o que fica de fora

| Risco | Por que dói | Mitigação |
|---|---|---|
| Promover 1373 arquivos a prop | Trava preload, mistura elmo e árvore | Classes do índice; loader só pede URL do manifesto |
| Path traversal no manifesto | Admin passaria a pedir arquivo arbitrário | Script e sanitize rejeitam `..` e URL absoluta |
| Ligar overlay em lista legada | Barris voltam em zona de gelo | Default `off`; overlay só quando o editor grava o campo |
| Subir o teto antes de compartilhar geometria | `clone(true)` × 400 mata o frame | Medir; teto 160 permanece até o número novo ser justificado |
| Gizmo dentro do módulo do play | Regressão do farm | Gizmo só em `map-editor.js` |
| Miniatura = uma cena Three por card | O catálogo não abre | WebP estático; um preview do selecionado |
| Save imediato e dirty juntos | Dois escritores da mesma cena | Um POST no Salvar; conflito visível se o meta divergir |
| Publicação versionada “no meio” da UI | Migração do singleton | Fora das oito fases |
| Stub de temporada tratado como reset real | Apaga progresso na expectativa e não no servidor | A UI repete a mensagem real da API |

Fora, com o que faltaria no servidor ou no motor:

- Publicar mapa com revisão: rotas no estilo HUD e campo de histórico no catálogo.
- Backup/restore: não há aba funcional nem endpoint de restore no admin.
- Criar zona: ids e presets são conteúdo; a UI só faz override.
- Loot por monstro e skill de mob: o combate não lê essa tabela.
- Spawn com posição: não há campo; o encontro é a lista da zona.
- Heightmap e pintura de piso: o chão é um plano mais props procedurais.
- Fim de temporada de verdade: `adminEndSeason` é stub.
- CRUD de admins: a tela lê a allowlist.

Nada disso ganha botão.

---

## J. Oportunidades (não entram no escopo obrigatório)

| Ideia | Benefício | Complexidade | Nota |
|---|---|---|---|
| Command palette | Achar zona, item e ação | Média | Depois do shell, alto valor no dia a dia |
| Favoritos e recentes de props | Menos busca | Baixa | Cabe na biblioteca, fase 3 ou 4 |
| Presets de ambiente nomeados pelo admin | Repetir névoa/luz | Média | Além do `getZoneScenePreset` fixo; precisa guardar no catálogo |
| Mini-mapa da arena | Orientar XZ | Média | A zona é pequena; útil, não urgente |
| Comparar dois resultados do simulador | Balancear sem planilha | Baixa | Dois POSTs, sem API nova |
| Duplicar zona | Começar variação | Alta | Copia override e pode confundir progressão; não fazer sem regra de id |
| Diff visual de cena | Revisar bake | Alta | Exige histórico que esta leva não grava |
| Layout de painéis salvo por usuário | Conforto | Média | localStorage basta; cosmético |

Sugestão extra encontrada na auditoria: o `asset-registry.js` de monstros e itens custom continua manual. O mesmo tipo de índice da fase 2 pode, numa fase posterior, alimentar visuais de monstro e de equipamento. Não misturar isso com o manifesto de cenário na fase 2, para o card de árvore não listar elmo.

---

## Resumo das decisões

1. O documento de trabalho é este arquivo. As Fases 1 a 8 foram implementadas. Publicação versionada de mapa, reset real de temporada e cadastro de administradores continuam fora do código.
2. Biblioteca completa significa manifesto gerado e classificado, não os 266 atuais e não os 1373 arquivos crus.
3. Floresta, cemitério e os outros kinds passam a aceitar objetos manuais por `decorationMode: "overlay"`, sem ligar isso em save legado e sem mudar desbloqueio.
4. 160 vira orçamento depois de geometria compartilhada e instância; até medir, o corte permanece.
5. Ordem: shell, biblioteca, world builder, gizmos, bioma/camadas, catálogo, administração, HUD.
6. Mapa ganha dirty/salvar/descartar/undo local. Publicação versionada fica especificada e não implementada.
7. Auth ADMIN e CSRF não se movem.

---

## Apêndice — Fase 1 implementada (28/10/2026)

A Fase 1 está no código. As seções A–J e as fases 2 a 8 não foram reescritas e continuam válidas.

### O que entrou

- Shell em tela cheia (`.studio-3`): sidebar fixa, cabeçalho único, workspace com rolagem própria. O header externo de `App.tsx` saiu.
- Navegação em oito grupos: Início, Mundo, Catálogo, Jogadores, Live Ops, Laboratório, Interface, Sistema. Todas as abas anteriores continuam acessíveis, inclusive Backup desabilitado.
- Sidebar recolhível (preferência em `localStorage`) e, abaixo de 860px, gaveta. Grupos recolhem. No modo compacto o `title` do botão serve de tooltip.
- Cabeçalho com identidade Jogo IDLE, nome Admin Studio, breadcrumb (grupo + título), estado Não salvo / Salvando para rascunho de itens e monstros, identificação do administrador, retorno ao Lobby e selo “Em manutenção” que abre Configurações.
- Manutenção saiu do cabeçalho de todas as telas. O interruptor ficou em Sistema → Configurações e continua passando pelo `window.confirm` existente.
- Kit visual: botão dourado, secundário e destrutivo, estado loading no `StudioBtn`, campos, select, checkbox, switch, slider nativo, tabelas, cards, badges, toast de mensagem/erro, estado vazio e spinner. `StudioModal` (sm, md, lg) com moldura, foco, Escape quando permitido e rodapé.
- Tokens alinhados ao salão (navy `#071524`, ouro `#f4b52b`, Cinzel, Source Sans 3). Painéis shadcn de Economia, Temporada, Personagens, Engajamento e Logs recebem o mesmo acabamento por CSS, sem troca de handler.
- Live Ops mostra só a coluna da seção aberta, para a área útil não ficar em três colunas cortadas. As outras seções seguem no menu.
- Mapa e HUD ocupam a altura do workspace. Os motores (`map-editor.js`, Three.js, HUD publish) não foram alterados.

### O que esta fase não fez

- Nenhuma API, CSRF, catálogo, mapa, zona, monstro, economia, simulador, HUD ou combate mudou de contrato.
- Os `window.confirm` existentes não foram trocados pelo `StudioModal`. A troca dos diálogos destrutivos continua para a fase administrativa.
- O rascunho da HUD não sobe ao selo do cabeçalho; o selo cobre itens e monstros, que já expõem dirty no pai.
- Com mais de um e-mail na allowlist, o cabeçalho mostra “Administrador”. O `/meta` não devolve o e-mail da sessão atual, e esta fase não criou campo novo.
- Abaixo de 1100px o seletor de alvo sai do cabeçalho. A concessão de item continua na área de personagens.
- Seleção de item, paleta do mapa, teto de 160, `decorationMode`, gizmos, zona única e deduplicação de Live Ops permanecem nas fases 2 a 8.

---

## Apêndice — Fase 2 implementada (28/10/2026)

A Fase 2 está no código e o manifesto foi gerado. As fases 3 a 8 não foram executadas. O teto de 160 decorações não mudou. Saves antigos não foram reescritos.

Contagens desta indexação (`npm run props:index`, pastas `kaykit/`, `kenney/`, `quaternius/`, `props/`, `custom/` e `models/`):

| Medida | Quantidade |
|---|---|
| Arquivos analisados | 2352 |
| Posicionáveis | 1188 |
| Duplicatas | 74 |
| Incompatíveis | 0 |
| Miniaturas geradas | 0 |
| Packs com props | 13 |
| Chaves históricas preservadas | 266, nenhuma ausente no disco |

Os 1455 `.gltf`/`.glb` do `assets/` estão todos nessas pastas. O resto do total são `.bin` (844), texturas (34), equipamento (153), personagem (11), criatura (11), rig (18) e 19 arquivos que não são modelo (licença, texto, áudio). Astronautas, mechs e inimigos do kit Quaternius têm esqueleto e ficaram como personagem ou criatura, não como prop.

Packs: `dungeon` 211, `nature` 14, `forest` 105, `city` 14, `space` 22, `halloween` 63, `kenneyGraveyard` 91, `kenneyNature` 329, `quaterniusSpace` 77, `medievalDecor` 68, `medievalBuilding` 93, `medievalTile` 60, `mixedBag` 41.

### Como o indexador funciona

`idle/scripts/props-index.mjs` lê os pares `pack/key` já escritos em `kaykit-props.js` e os reaplica no arquivo correspondente. Arquivo novo ganha uma key estável a partir do nome, não da ordem nem do hash. O hash sha256 só serve de cache. Duplicata é o mesmo nome em `props/` quando `kaykit/` já é o canônico, ou o `.glb` irmão de um `.gltf`. O manifesto não contém URL vinda do navegador.

Categorias saem do nome do arquivo. Correção pontual vai em `idle/public/jogo-idle/admin-studio/prop-categories.json`, chave `"pack/key"`. Categorias sem modelo não aparecem.

### Miniaturas

Não há WebGL headless nem codificador WebP nas dependências (sem `three` no Node, sem `sharp`, sem `canvas`). O script não inventa imagem. Se `assets/thumbs/props/{pack}/{key}.webp` existir e `admin-studio/thumbs-cache.json` tiver o mesmo hash do modelo, o manifesto aponta a miniatura. Nesta execução, `thumbs: 0`. A paleta mostra a inicial da categoria no lugar da imagem.

### Compatibilidade

`spawnKayKitDecoration(pack, key)` continua a API. `PACKS` histórico segue sendo a semente do bioma procedural. O manifesto só entra no preload do prop que vai ser colocado, não no boot. O servidor aceita `pack`/`key` que sejam `placeable` nesse JSON e recusa `..`, URL e key desconhecida. Kenney e Quaternius passam. O formato salvo continua `pack`, `key`, `x`, `z`, `scale`, `rotY`.

### Como adicionar um modelo de cenário

1. Copie o `.gltf` (com `.bin` e textura ao lado) ou o `.glb` para uma pasta já varrida: `kaykit/`, `props/`, `kenney/` ou `quaternius/`. Não use `custom/` nem `models/` — isso é equipamento ou personagem.
2. Na raiz do repositório, ou dentro de `idle/`, rode `npm run props:index`.
3. Confira que a key nova apareceu em `idle/public/jogo-idle/admin-studio/prop-manifest.json` com `"class": "placeable"`. Se a categoria automática estiver errada, edite `prop-categories.json` e rode o script outra vez.
4. Abra o mapa no Admin. A paleta lê o manifesto. Escolher o prop arma o pincel e mostra uma prévia no canto da arena pelo `postMessage` que o editor já usa. A prévia não entra no save.
5. Não edite `kaykit-props.js` para cada arquivo novo. Só mexa nele se o bioma procedural precisar de uma key antiga com outro arquivo — e rode o indexador em seguida, para o save continuar reconhecendo o par.

### Arquivos

Criados: `idle/scripts/props-index.mjs`, `idle/public/jogo-idle/prop-catalog.js`, `idle/public/jogo-idle/admin-studio/prop-manifest.json`, `prop-categories.json`, `thumbs-cache.json`, `idle/admin-ui/src/admin/prop-library.ts`.

Alterados: `idle/package.json`, `package.json`, `kaykit-props.js`, `map-editor.js`, `zone-scene.ts`, `admin-map.tsx`, `studio-3.css`.

### O que ficou para a Fase 3

Nota da Fase 2. O apêndice da Fase 3 descreve o que foi feito depois.

A casca da biblioteca (painel largo, grade de miniaturas, órbita dedicada) ainda era o dock do mapa, alimentado pelo manifesto, com busca, pack e categoria. Não havia gizmos, undo, zona única nem `decorationMode`. O limite seguia 160. Bioma que não é `bare` continuava sem desenhar a lista manual no jogo.

---

## Apêndice — Fase 3 implementada (28/10/2026)

A Fase 3 está no código. As fases 4 a 8 não foram executadas. O teto de 160, o manifesto e a regra de play não mudaram: o jogo só desenha decoração manual quando o bioma é `bare`.

### Organização

O editor deixa de ser um formulário com iframe pequeno. `admin-map.tsx` ocupa o workspace em grade:

- Barra superior: capítulo (filtro), zona, estado Salvo / Não salvo / Salvando / Erro ao salvar, Descartar e Salvar.
- Biblioteca à esquerda, cerca de 240–280 px: busca, categoria, pack, contagem, grade virtualizada e uma prévia 3D só do asset selecionado.
- Viewport no centro, com a moldura, a barra de ferramentas e o aviso de bioma.
- Inspetor à direita: identidade do objeto, X, Z, rotação Y e escala uniforme. Cores, bioma e névoa ficam recolhidos em “Cena da zona”.
- Dock inferior recolhível: lista de objetos e log do editor.

Abaixo de 1100 px a biblioteca e o inspetor viram gavetas. O viewport permanece na grade. Não há scroll horizontal da aplicação.

### Zona única

O mapa usa o `zoneId` do `JogoIdleAdmin`, o mesmo de Zonas e Monstros. A chave `jogo-idle-admin-mapZoneId` saiu. O filtro de capítulo só reduz a lista; não cria um segundo id. O simulador do Laboratório continua com a zona local dele.

Trocar de zona, de módulo ou voltar ao Lobby com rascunho abre o `StudioModal`, com Cancelar, Descartar e Salvar. Fechar ou atualizar a página usa `beforeunload`.

### Rascunho e salvamento

Editar só muda o estado React e o iframe. Não há POST por alteração. Salvar envia um único `POST /api/jogo-idle/admin/config` com `{ zone: { id, scene } }`. A lista de decorações vai no payload mesmo quando o bioma não é `bare`, para o rascunho poder ser gravado. O servidor continua a sanitizar a cena inteira. O estado só volta a Salvo depois da resposta. Erro mantém o rascunho.

Descartar recarrega a última cena que está na lista de zonas e manda um sync completo ao iframe.

Se a cena do servidor divergir enquanto houver rascunho, o editor não sobrescreve. O modal pede para manter o rascunho ou usar a versão do servidor. A resposta do próprio Salvamento não entra como conflito, a menos que o administrador tenha editado de novo durante o POST.

O aviso no viewport diz que, fora de `bare`, os objetos são gravados e visíveis no editor, mas o jogo não os desenha. A mensagem de sucesso não promete o contrário. Assar bioma continua a extrair o procedural e a mudar o bioma para `bare`, só no rascunho, até Salvar.

### Assets e seleção

A grade lê o manifesto da Fase 2 por `prop-library.ts`. Não há miniatura gerada: o card usa um fallback com a categoria. Imagem quebrada é removida. Um iframe, `admin-studio/prop-preview.html`, carrega só o modelo escolhido pelo `kaykit-props.js`, centraliza pelo bounding box e deixa orbitar. “Inserir no mapa” arma o pincel que o editor já tinha.

A seleção é nos dois sentidos, no mesmo `postMessage`:

- O viewport avisa `map-editor-selection` e `map-editor-decorations`.
- A lista manda `select-index`.
- O inspetor manda `patch-selected` com x, z, rotY e escala. Não existe campo Y.

A barra só tem o que o motor faz: navegar, selecionar, inserir, excluir, assar, câmera do jogador e enquadrar. Atalhos continuam 1, 2, 3, Q, E e Delete. Não há botão de gizmo, snap, multi-seleção nem publicar.

### Arquivos

Criados: `idle/public/jogo-idle/admin-studio/prop-preview.html`, `prop-preview.js`.

Alterados: `idle/admin-ui/src/admin/admin-map.tsx`, `JogoIdleAdmin.tsx`, `admin-shell.tsx`, `studio/studio-icons.tsx`, `studio/studio-3.css`, `idle/public/jogo-idle/map-editor.js`.

`map-editor.js` ganhou `select-index` e `patch-selected`. `clearGroup` deixou de dar `dispose` na geometria: o clone do prop compartilha a geometria em cache, e descartá-la quebrava o modelo na seleção seguinte. O material clonado continua sendo descartado.

### Limitações que seguem para as próximas fases

- Fase 4 foi implementada em seguida. O apêndice dela registra gizmos, snap, duplicar, undo/redo e a identidade de sessão. Multi-seleção não entrou.
- Fase 5: `decorationMode: "overlay"`, camadas e qualquer mudança do teto de 160. Até lá, bioma procedural não desenha a lista manual no jogo.
- Publicação versionada de mapa não existe.
- A prévia 3D é uma segunda cena WebGL, não uma miniatura. Os 1.188 cards não instanciam Three.js.
- “Usar preset” altera o rascunho. Não apaga o override com `scene: null` na hora.
- O simulador não entrou na zona compartilhada.

---

## Apêndice — Fase 4 implementada (28/10/2026)

A Fase 4 está no código. As fases 5 a 8 não foram executadas. O motor continua o Three.js r170 do editor. Não há segundo renderer e o gizmo não entra em `scene3d.js`. O formato gravado segue `pack`, `key`, `x`, `z`, `scale`, `rotY` (e `y` / `tint` se já existirem). O teto continua 160.

### Ferramentas

A barra do World Builder ficou em grupos: navegar e selecionar; mover, rotacionar e escalar; inserir, duplicar e excluir; grade, snap e os três passos; desfazer e refazer; enquadrar seleção, enquadrar cenário, câmera do jogador e assar. Ícones SVG do Studio 3.0, botão ativo, tooltip com atalho, disabled quando não há seleção ou histórico. Abaixo de 1280 px os rótulos somem e o tooltip permanece. Abaixo de 720 px a lista esconde o pack e mantém as ações da linha.

O gizmo está em `admin-studio/map-gizmo.js`, importado só por `map-editor.js`. O addon `TransformControls` não está no Three vendorizado; o gizmo é próprio.

- Mover: seta X, seta Z e um plano XZ. O arraste usa o chão. A câmera não orbita enquanto o gesto existe (`OrbitControls.enabled` e `stopPropagation` no pointerdown em captura).
- Rotacionar: anel no eixo Y. O ângulo gravado continua radianos em `rotY`. O inspetor mostra graus.
- Escalar: alça única. A escala é um número só, entre 0,15 e 4. Não há escala por eixo.
- Seleção: `BoxHelper` dourado (`#f4d6a0`), sem trocar o material do asset. O destaque não entra no save.

Um arraste, um giro ou um escalar gera uma entrada de histórico no `pointerup`. Escape devolve a transformação do início do gesto e não grava entrada. `pointercancel` confirma o gesto, para um pointer perdido não apagar o movimento.

A ferramenta Selecionar ainda arrasta no chão, como na Fase 3, sem desenhar as setas. Inserir não transforma outro objeto. Navegar só move a câmera. Clique no vazio, em mover/girar/escalar/selecionar, limpa a seleção e ainda permite orbitar.

### Atalhos

| Tecla | Ação |
| --- | --- |
| 1 | Navegar |
| 2 | Selecionar |
| 3 | Inserir |
| 4 | Mover |
| 5 | Rotacionar |
| 6 | Escalar |
| Q / E | Gira −/+ o passo. Com snap, o passo é o da rotação; sem snap, 15°. |
| Delete / Backspace | Exclui o objeto selecionado |
| Escape | Cancela o gesto em curso, ou limpa a seleção |
| G | Liga ou desliga a grade |
| F | Enquadra a seleção |
| Shift+F | Enquadra o cenário |
| Ctrl/Cmd+D | Duplica |
| Ctrl/Cmd+Z | Desfaz |
| Ctrl/Cmd+Shift+Z ou Ctrl/Cmd+Y | Refaz |

Atalhos não disparam com foco em input, select, textarea ou campo editável. Com o canvas focado, o iframe trata o teclado e pede undo/redo ao React. Com o foco no restante do admin, o React trata. Um intervalo de 40 ms impede o mesmo atalho de valer duas vezes.

### Grade e snap

A grade é um `GridHelper` no plano XZ, y = 0,03, tamanho 28 (o disco do chão). Não recebe raycast, não vai no POST e não aparece no jogo. O snap é opcional.

- Posição: 0,25, 0,5, 1 ou 2.
- Rotação: 5°, 15°, 30°, 45° ou 90°.
- Escala: 0,05, 0,1 ou 0,25.

Depois do snap, o editor ainda corta X/Z em −24..24, `rotY` em ±4π e a escala em 0,15..4. Preferências em `localStorage` na chave `jogo-idle-map-editor-prefs`. Não entram na cena da zona.

### Duplicar

A cópia é outro objeto: mesmo pack, key, rotação, escala, `y` e `tint` se existirem, deslocada 0,75 em X (e alinhada se o snap estiver ligado). Ganha `editorId` novo. A seleção passa para a cópia. No limite de 160 a operação para, o log avisa, nada é inserido e o histórico não ganha entrada. Geometria continua no cache da Fase 2; o clone não divide o estado de transformação.

### Histórico

Uma pilha só, no React, até 100 snapshots. Cada snapshot é serializável: decorações com `editorId`, tema da zona e id selecionado. Não guarda geometria Three.js.

Entram na pilha: inserir, mover, rotacionar, escalar, duplicar, excluir, patch do inspetor, preset, assar bioma e confirmação dos campos da cena. Arrastar não grava quadro a quadro: o iframe manda `commit: false` durante o gesto e `commit: true` uma vez no fim. Uma edição nova depois de desfazer apaga o redo.

Desfazer e refazer aplicam o snapshot no React e mandam `apply-editor-state` ao iframe. O iframe não devolve essa troca como commit, então não nasce uma segunda pilha.

Salvar continua um POST explícito e não esvazia o histórico. “Salvo” só quando a impressão do rascunho coincide com a última cena confirmada. Desfazer depois de salvar deixa o rascunho diferente e o estado volta a “Não salvo”. Descartar, trocar de zona ou adotar a cena do servidor recarrega o último gravado, gera ids novos e zera a pilha. O modal de saída da Fase 3 permanece.

### Identidade dos objetos

Cada decoração ganha um `editorId` só nesta sessão (`ed` + contador em base 36). O React preserva o id que já veio; o iframe faz o mesmo. O POST usa `copyDeco`, que não envia o id. O sanitize do servidor continuaria descartando um campo estranho. Saves antigos, sem id, recebem um id ao abrir.

Seleção, exclusão, duplicação, undo e a lista usam esse id, não o índice. O índice ainda existe no iframe como posição do array e é reconciliado com o id. Mensagem com época ou zona diferente da atual é ignorada. Sync completo com época mais antiga que a do iframe também é ignorado. Ao trocar a cena, um gesto em andamento é abandonado sem gravar a lista velha por cima da nova.

### Protocolo

O iframe desenha e manipula. O React guarda o rascunho e o histórico. Origem das mensagens continua `window.location.origin`.

Comandos novos, no tipo `jogo-idle:map-editor-command`, com `epoch`: `select-id`, `delete-id`, `duplicate-selected`, `duplicate-id`, `patch-selected`, `apply-editor-state`, `set-grid`, `set-snap`, `focus-selection`, `focus-scene`, `nudge-rot`. Os já existentes (`set-tool`, `arm-brush`, `delete-selected`, `bake-biome`, `clear-selection`, `select-index`, `snap-play-camera`, `set-play-camera`) continuam.

O iframe responde com `map-editor-decorations` (`commit`, `selectedId`, `epoch`, `zoneId`), `map-editor-selection`, `map-editor-shortcut`, `map-editor-prefs` e os tipos da Fase 3.

### Arquivos

Criado: `idle/public/jogo-idle/admin-studio/map-gizmo.js`.

Alterados: `idle/public/jogo-idle/map-editor.js`, `idle/admin-ui/src/admin/admin-map.tsx`, `idle/admin-ui/src/admin/studio/studio-icons.tsx`, `idle/admin-ui/src/admin/studio/studio-3.css`.

Não mudaram combate, progressão, autenticação, CSRF, `scene3d.js`, o teto de 160 nem o manifesto.

### Limitações

- Não há multi-seleção. O raycast devolve um objeto. Um pivô comum brigaria com escala e rotação por objeto, com o inspetor de um item e com um snapshot por gesto. Não foi criado botão desabilitado.
- Não há escala por eixo, elevação Y persistida, overlay, camadas, escultura, pintura nem publicação versionada.
- A grade cobre o chão do editor (diâmetro 28), não o intervalo numérico ±24 do inspetor.
- O histórico é local. Não é versão publicada. Acima de 100 operações a mais antiga sai.
- Fora do bioma `bare`, o jogo continua sem desenhar a lista manual. O aviso do viewport permanece.

### Pendências da Fase 5

Continuam para a Fase 5, como já especificado neste arquivo: `decorationMode: "overlay"`, camadas de verdade, e o orçamento que substituir o corte seco de 160. A hierarquia desta fase segue uma lista simples. Escultura, pintura, Y persistido e publicação versionada também não entram na Fase 5 pelo plano atual; seguem nas fases e limitações já escritas acima.

---

## Apêndice — Fase 5 implementada (29/10/2026)

A Fase 5 está no código. As fases 6 a 8 não foram executadas. O teto de decorações permanece 160. Saves antigos não foram migrados.

### decorationMode

Campo opcional da cena: `"off"` ou `"overlay"`. A regra mora em `idle/public/jogo-idle/zone-compose.js`, importada pelo editor e por `scene3d.js`.

- Sem o campo: o jogo continua desenhando a lista manual só no bioma `bare`. Listas antigas em floresta, gelo e o resto seguem ocultas.
- `off`: a mesma regra, gravada de propósito. A lista não é apagada.
- `overlay`: o bioma procedural continua e a lista manual é desenhada por cima. Em `bare` não nasce uma segunda floresta; o bare segue sendo o chão mais os objetos.

O editor usa a mesma regra no viewport. Com o overlay desligado fora de `bare`, os objetos ficam na lista, marcados como ocultos no jogo, e somem do cenário. Ligar o overlay quando já existem objetos pede confirmação no `StudioModal` e diz quantos voltariam a aparecer. Inserir um objeto numa zona procedural com o overlay desligado pergunta se ele deve ser ativado. Iluminação e abertura da zona não ligam o campo sozinhas.

### Camadas

Quatro camadas: `vegetacao`, `estrutura`, `decoracao`, `efeito`. O campo `layer` na decoração é opcional. Sem ele, o editor infere pela categoria do manifesto (árvores e rochas em vegetação, paredes e pontes em estruturas, tochas em efeitos, o resto em decoração). O servidor só grava um desses quatro valores.

O dock agrupa por camada, com a contagem real. Camada vazia não aparece. Ocultar e bloquear ficam no `localStorage` (`jogo-idle-map-editor-layers`). Ocultar tira a camada só do editor. Bloquear impede seleção pelo viewport, gizmo, rotação, duplicação e exclusão. A lista ainda seleciona o objeto. O jogo desenha todas as camadas salvas.

### Ambiente

O inspetor da zona ficou em Bioma, Iluminação, Atmosfera e Preset. Os controles usam os campos que o `ZoneScene` já tinha: bioma, variante, densidade, céu, chão, hemisfério, sol, intensidades, névoa perto e longe, modo e cor de partículas. Não há densidade de névoa nem intensidade de partícula separadas, porque o motor não grava isso.

O preset é o da zona (`getZoneScenePreset`). Restaurar reaplica céu, chão, bioma, névoa e partículas no rascunho, sem apagar os objetos e sem POST. Assar continua disponível, com um modal que explica que o bioma procedural vira objetos e o kind passa a `bare`. Overlay e assar são ações diferentes. As duas entram no histórico da Fase 4, uma entrada por confirmação. Arrastar um slider também é uma entrada.

### Jogo

`applyZone` chama `manualsVisibleInPlay`. Se a lista entra, `appendManualDecorations` desenha os objetos. Dois ou mais do mesmo pack, key e tint, sem esqueleto, sem malha com vários materiais e sem morph, viram `InstancedMesh` — uma malha por parte do GLTF, com a matriz de cada cópia. O resto continua clone. O editor não instancia: cada objeto segue selecionável.

`cloneProp` marca a geometria como compartilhada com o cache. `disposeGroup` deixa de dar `dispose` nessa geometria, para trocar de zona não quebrar o GLTF. O material clonado (e o material com tint) continua sendo descartado. Material sem tint, no instanciamento, permanece o do cache.

### Teto

160. A geometria já era compartilhada pelo `clone` do Three, e o jogo agora instancia repetidos compatíveis. Não houve medição de frame nesta fase, então o número não subiu. O indicador mostra a quantidade real e quantos modelos únicos existem. Inserir ou duplicar acima de 160 é recusado no editor. Se o POST vier com mais de 160, o servidor responde erro e não grava a cena, em vez de cortar a lista em silêncio.

### Arquivos

Criado: `idle/public/jogo-idle/zone-compose.js`.

Alterados: `idle/lib/jogo-idle/game/zone-scene.ts`, `idle/src/admin-service.ts`, `idle/public/jogo-idle/scene3d.js`, `idle/public/jogo-idle/kaykit-props.js`, `idle/public/jogo-idle/map-editor.js`, `idle/admin-ui/src/admin/admin-map.tsx`, `idle/admin-ui/src/admin/studio/studio-icons.tsx`, `idle/admin-ui/src/admin/studio/studio-3.css`.

### Limitações

- O editor não simula o movimento das partículas. Grava o modo e a cor; a névoa e as luzes atualizam o viewport.
- Props instanciados no jogo não entram no fade individual da câmera. Posição, rotação, escala e material acompanham o editor.
- Ocultar ou bloquear camada não muda o jogo.
- Não há escultura, heightmap, Y persistido, luz por objeto nem publicação versionada.
- O teto segue 160.

### Pendências da Fase 6

A Fase 6 continua no texto acima: catálogo de itens e monstros, seleção sincronizada, preview na área útil, classe na linha, abas vazias de monstro fora, e o monstro usando o `zoneId` do Mundo. Não foi executada.

---

## Apêndice — Fase 6 implementada (29/10/2026)

A Fase 6 está no código. As fases 7 e 8 não foram executadas. Combate, progressão, mapa, overlay, gizmos e o teto de 160 não mudaram.

### Seleção e rascunho

O draft de item mora em `use-item-draft.ts`, chamado por `JogoIdleAdmin`. A lista só marca a linha cujo `id` está no formulário. Novo item limpa a seleção. Não há mais o fallback que pintava o primeiro da lista enquanto o form dizia Novo item.

Trocar de item, criar outro ou duplicar com rascunho aberto pede confirmação no `StudioModal`. Sair da aba ou ir ao lobby com itens ou monstros sujos usa o mesmo modal, com descartar ou salvar. Erro de API mantém o rascunho. Um refresh do catálogo não reescreve o form por cima da edição.

Duplicar tira o id, limpa a seleção e deixa a cópia como rascunho. Salvar cria outro id. O original permanece.

### Itens

O editor é catálogo, formulário e preview. Filtros combinam nome, classe, slot, tier, equipamento ou consumível, e origem (base, override, custom). Não há filtro de raridade: o template não guarda raridade. Ela só existe na hora de conceder e no preview.

A linha mostra imagem `art` quando o template tem, senão a sigla do ícone, mais classe, tier, slot e o id. Homônimos como Botas de Couro se separam por isso, sem renomear nada no banco.

Abas: Geral, Atributos, Drop e Visual. Não há aba Avançado. Drop do template continua editável. A chance global aponta para Live Ops. O visual lista só os modelos de equipamento daquele slot.

Conceder, restaurar e excluir passam por modal. Excluir continua só para item custom. Restaurar continua só para override. Conceder mostra o item e o personagem que estão na tela agora.

O upsert substitui o template. O save reenvia arte, duas mãos, anúncio, empilhável, alvos de refino e o flag de consumível quando o slot não mudou, para esses campos não sumirem. `skillElementBonus` segue de fora: o normalizador do servidor não copia esse campo.

### Monstros

`use-monster-draft.ts` usa o mesmo `zoneId` do Mundo. O catálogo é só da zona atual. Boss fica destacado. Busca é dentro da zona. Trocar de zona com rascunho pede descarte ou salvamento.

Abas: Geral, Atributos e Onda. Habilidades, Drops e Balanceamento saíram. A onda mostra os abates até o boss e os resets de onda e de boss, cada um com modal.

O POST continua `admin/config` com `id`, `monsters`, `boss` e `bossWaveSize`. Não manda cena, nível, drop nem ascensão. O servidor faz merge com o override anterior, então a cena gravada pelo mapa permanece. Um refresh da zona não cobre um rascunho sujo.

### Preview

Os dois editores reutilizam `preview.html`. Trocar atributo numérico ou só o nome não recarrega o GLTF. Item sem visual mostra a mensagem de ausência, sem um objeto genérico. O fundo do preview acompanha o azul do Studio 3.0. A geometria do cache não é descartada ao trocar de modelo. O material clonado é.

### Arquivos

Criados: `idle/admin-ui/src/admin/use-item-draft.ts`, `idle/admin-ui/src/admin/use-monster-draft.ts`.

Alterados: `idle/admin-ui/src/admin/admin-items.tsx`, `idle/admin-ui/src/admin/admin-monsters.tsx`, `idle/admin-ui/src/JogoIdleAdmin.tsx`, `idle/admin-ui/src/admin/admin-types.ts`, `idle/admin-ui/src/admin/studio/studio-3.css`, `idle/public/jogo-idle/admin-studio/preview-engine.js`.

### Limitações

- Raridade não é propriedade do template. O preview e a concessão é que escolhem uma.
- O editor não cria nem apaga monstros da lista. A lista continua a da zona.
- Não há spawn com posição.
- Não há loot nem habilidade por monstro.
- Salvar um item ainda passa por `normalizeTemplate`. Bônus de elemento de skill não é regravado.
- O preview de item sem GLB próprio continua sendo o billboard do ícone 3D, quando esse visual existe. Sem visual, a área fica vazia de propósito.
- O typecheck do admin segue acusando o erro antigo em `admin-hud-builder.tsx`.

### Pendências da Fase 7

A Fase 7 continua no texto acima: um editor de drop e TTK, loot e simulador só leem, dashboard sem pipeline falso, jogadores em lista com modal de ação perigosa, engajamento no kit novo, e temporada dizendo o estado real da API. Não foi executada.

## Correção pontual — skillElementBonus (29/10/2026)

Confirmado antes da Fase 7: `normalizeTemplate` reconstruía o template e omitia `skillElementBonus`. Salvar uma arma elemental ou uma joia de mago pelo catálogo apagava o bônus que o combate lê. A correção só copia os números já gravados. Não recalcula o bônus e não muda fórmula de combate.

`publicTemplate` já expunha o campo via `cloneTemplate`. O rascunho do item, ao atualizar um id existente, reenvia o objeto do catálogo. Item novo, sem origem, continua sem o campo.

Arquivos: `idle/lib/jogo-idle/game/items.ts`, `idle/admin-ui/src/admin/use-item-draft.ts`, `idle/admin-ui/src/admin/admin-types.ts`.

## Apêndice — Fase 7 implementada (29/10/2026)

A Fase 7 está no código. As seções anteriores e a Fase 8 não foram reescritas.

### Dashboard

A Visão Geral mostra zonas, monstros (snapshot ou soma das zonas), itens, personagens ativos, temporada, manutenção e o drop global em leitura. A atividade recente traz até oito ações e um atalho para Logs. Os atalhos abrem Mundo, Catálogo, Jogadores e Live Ops. O cartão de rascunho, revisão e publicado saiu.

### Jogadores

A aba é uma lista dos personagens ativos, com busca, e a ficha do selecionado. O alvo é o mesmo `targetId` do restante do admin. Ouro, nível, pontos, cosmético, limpeza de mochila e exclusão abrem `StudioModal` e só então fazem POST. O modal guarda o id aberto, então uma troca de seleção posterior não altera o alvo da confirmação. O ouro mostra o resultado esperado. O nível avisa que o servidor zera experiência, devolve os atributos da classe e recalcula pontos livres. O cap mostrado é 500 sem ascensão e 700 com ascensão. A lista não é o cadastro completo de contas.

### Live Ops

Drop global, golpes de mob, golpes de boss e chance do refinador têm um formulário, em Economia. Mercador e evento de farm são seções da mesma aba, cada um com o próprio salvamento. O POST manda só o recorte da seção. Um refresh do catálogo não cobre uma seção com alteração pendente. Loot, Visão Geral e Simulador leem esses valores e apontam para Economia. Configurações ficou com manutenção e o atalho. O histórico saiu de Economia e ficou em Logs, com filtro por ação, resumo e e-mail.

### Temporada e engajamento

A temporada mostra slug, estado, datas e notas. Não há botão de encerrar ou resetar. O endpoint de fim de temporada continua existindo no servidor e não é chamado pela interface. O painel de engajamento usa a série de 14 dias quando a API a devolve. No standalone, a resposta é a nota de missões desligadas mais claims e claimers, sem gráfico inventado.

### Modais

`StudioModal` cobre ouro, nível, pontos, cosmético, mochila, exclusão, encerrar evento de farm e ligar ou desligar manutenção. Sair de Live Ops com alteração pendente usa o mesmo modal de rascunho das outras abas. `window.confirm` permanece no HUD e na limpeza de override de zona, que são a Fase 8 e a tela de Zonas.

### Arquivos

Criado: `idle/admin-ui/src/admin/use-liveops-draft.ts`.

Alterados: `JogoIdleAdmin.tsx`, `admin-overview.tsx`, `admin-characters.tsx`, `admin-economy.tsx`, `admin-liveops.tsx`, `admin-settings.tsx`, `admin-loot.tsx`, `admin-season.tsx`, `admin-engagement.tsx`, `admin-simulate.tsx`, `admin-actions-history.tsx`, `admin-admins.tsx`, `admin-types.ts`, `studio-3.css`.

A correção de `skillElementBonus` está na seção anterior.

### Limitações

- A lista de jogadores é a de personagens ativos, não todas as contas.
- Encerrar temporada com reset não foi implementado.
- Não há loot por monstro nem agendamento de evento além da data de término.
- O drop de cada zona continua sendo editado em Zonas. É outro campo.
- A allowlist de administradores é somente leitura.
- O backup segue sem endpoint.
- O typecheck do admin segue acusando o erro antigo em `admin-hud-builder.tsx`.

### Pendências da Fase 8

A Fase 8 continua no texto acima: HUD dentro do shell, painéis recolhíveis, atalhos de undo e a retirada dos `window.confirm` que ainda restam no HUD e na limpeza de override de zona. Não foi executada.

## Apêndice — Fase 8 implementada (29/10/2026)

A Fase 8 está no código. O motor da HUD, a bridge, o iframe e os contratos de rascunho e publicação não foram reescritos.

### HUD Builder

O editor ocupa a altura do shell: barra de estado, canvas no centro, componentes à esquerda e inspetor à direita. Os painéis laterais recolhem. Abaixo de 1100px de largura da janela eles começam recolhidos. Essa largura não muda o breakpoint salvo da HUD.

A resolução continua sendo 1920×1080, 1366×768, 768×1024 ou 390×844, cada uma com o breakpoint que já tinha. O zoom Enquadrar, 50%, 75% e 100% só escala o iframe. Arrastar, redimensionar, snap, grade, modo organizado, modo livre, editar e pré-visualizar seguem os mesmos `postMessage`.

Desfazer e refazer continuam no histórico local do React. Cmd/Ctrl+Z não dispara enquanto o foco está num campo. Cmd/Ctrl+S continua salvando o rascunho. O histórico de revisões persistidas segue na lista do inspetor e restaura o rascunho, não o publicado.

Salvar rascunho continua no PUT com `expectedDraftRevision`. Publicar continua no POST com as duas revisões esperadas e só habilita com o rascunho limpo. O badge diz Salvo, Não salvo ou Salvando. A revisão publicada aparece ao lado, em texto separado. Conflito 409 pergunta se recarrega o servidor. O cabeçalho do Studio lê o mesmo `dirty` do editor. Trocar de aba, ir ao lobby ou fechar a página com edição local pede confirmação.

### Modais e tipo

`window.confirm` saiu do admin React. Publicar, restaurar padrão, restaurar revisão, conflito de rascunho e limpar overrides de zona usam `StudioModal`. A limpeza de zona continua o POST com `clear: true` daquela zona. A cena não entra nesse envio.

`trusted.reason` falhava porque `!trusted.ok` não estreitava a união. A leitura passou a ser `trusted.ok === false`, e a exceção do primeiro `ready` sem sessão permanece.

O typecheck de `idle/admin-ui` fecha sem erro.

### Arquivos

Alterados: `idle/admin-ui/src/admin/admin-hud-builder.tsx`, `idle/admin-ui/src/admin/admin-zones.tsx`, `idle/admin-ui/src/JogoIdleAdmin.tsx`, `idle/admin-ui/src/admin/studio/studio-3.css`.

### Limitações

- O preview continua sendo o iframe de `play.html?hudBuilder=1`. Não há um segundo renderer.
- A intro cinematográfica continua só no jogo, não no preview.
- Undo local e revisões gravadas continuam sendo mecanismos diferentes.
- Backup administrativo, CRUD de admins, reset real de temporada, loot por monstro e publicação versionada de mapa não foram criados.

### Depois do Admin Studio 3.0

- Reset de temporada de verdade, se o standalone passar a fazê-lo.
- Lista completa de personagens, se a API deixar de ser só a sessão ativa.
- Métricas de engajamento com série, se o standalone passar a devolvê-las.
- Publicação versionada do mapa, ainda só especificada.
- Backup e cadastro de administradores, ainda sem endpoint.

## Resumo das oito fases

Implementado:

1. Design system, shell, navegação e `StudioModal`.
2. Biblioteca 3D gerada, com o teto de 160 decorações.
3. World Builder com rascunho local, salvar e descartar.
4. Gizmos, snap, grade, duplicar, desfazer e refazer no mapa.
5. Biomas em overlay, camadas e o mesmo teto de cena.
6. Catálogo de itens e editor de monstros no Studio 3.0, com o bônus de elemento preservado ao salvar.
7. Dashboard, jogadores, Live Ops com um editor por configuração, temporada sem botão de reset falso.
8. HUD Builder no mesmo workspace, confirmações no modal e o erro de tipo da bridge corrigido.

Continua só no planejamento: publicação versionada de mapa, reset real de temporada, loot por monstro, backup e cadastro de administradores.

## Admin Studio 3.1 — Refinamento Visual e UX

Etapa de apresentação. Contratos de API, schemas, overlay, gizmos, snap, undo/redo, publicação da HUD e fluxos de confirmação permanecem os das oito fases.

### Problemas corrigidos

- O aviso "Mapa salvo." ficava no estado `message` do shell e não era limpo ao trocar de tela nem por tempo. Agora o sucesso some sozinho em cerca de quatro segundos, pode ser fechado e também some ao mudar de seção. Um erro permanece até o fechamento manual.
- Configurações mostravam o texto padrão de manutenção mesmo com o jogo liberado, porque o servidor guarda essa frase com a manutenção desligada. A frase do jogador só aparece quando a manutenção está ativa. O texto do card segue o estado real.
- O preview 3D usava distância fixa de câmera e, nos itens e monstros, também reduzia o clone para um tamanho alvo. O enquadramento passa a usar a caixa do modelo, a altura e a largura visíveis e uma margem. A escala do asset não é alterada para caber. Girar e aproximar continuam. "Enquadrar modelo" pede um novo enquadramento sem recarregar o modelo. Editar um número do formulário não troca o modelo e, por isso, não reinicia a câmera.

### Layout

- Editores de formulário (itens, monstros, zonas, visão geral, loot, configurações) deixam de esticar o painel até o fim da janela. O catálogo lateral continua com altura limitada e rolagem própria.
- World Builder e HUD Builder continuam ocupando a altura disponível.
- Visão geral: indicadores mais baixos, atalhos em quatro cards e a atividade no tamanho da lista.
- Zonas: cabeçalho com salvar e limpar overrides, depois os grupos Progressão, Recompensas e Boss. O pedido de limpeza não mudou.
- Loot: quatro cards no lugar do parágrafo único. A tabela marca chance global e override.
- Configurações: dois cards estreitos, sem título repetido.
- HUD: barra inferior em grupos (resolução e zoom, modo de layout, grade, preview, histórico). Revisões, tokens e transições começam recolhidos. Layout continua aberto.
- World Builder: bioma começa aberto; iluminação, atmosfera e preset começam recolhidos. O objeto selecionado continua visível. Nenhuma ferramenta da barra foi removida.

### Arquivos

- `idle/admin-ui/src/admin/admin-shell.tsx`
- `idle/admin-ui/src/JogoIdleAdmin.tsx`
- `idle/admin-ui/src/admin/admin-settings.tsx`
- `idle/admin-ui/src/admin/admin-overview.tsx`
- `idle/admin-ui/src/admin/admin-zones.tsx`
- `idle/admin-ui/src/admin/admin-loot.tsx`
- `idle/admin-ui/src/admin/admin-items.tsx`
- `idle/admin-ui/src/admin/admin-monsters.tsx`
- `idle/admin-ui/src/admin/admin-map.tsx`
- `idle/admin-ui/src/admin/admin-hud-builder.tsx`
- `idle/admin-ui/src/admin/studio/studio-ui.tsx`
- `idle/admin-ui/src/admin/studio/studio-3.css`
- `idle/admin-ui/src/admin/studio/studio-2.css`
- `idle/admin-ui/src/admin/studio/use-admin-preview-bridge.ts`
- `idle/public/jogo-idle/admin-studio/preview-engine.js`
- `idle/public/jogo-idle/admin-studio/prop-preview.js`

### Limitações

- Miniaturas reais dos assets do World Builder continuam pendentes. Os cards seguem com a abreviação da categoria.
- Não houve reset de temporada, loot por monstro, publicação versionada de mapa, backup nem cadastro de administradores.
- A validação visual desta etapa fica com quem usa o Studio.






