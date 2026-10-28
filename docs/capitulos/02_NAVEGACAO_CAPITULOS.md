# 02 — Navegação: Crônicas das Quatro Eras

**Status:** especificação de UI. **Não implementar interface nesta etapa.**

---

## Regra atual

- Navegação de play: `.rail-actions` com Galeria, Divindade, Merchant, Logout ([`play.html`](../../idle/public/jogo-idle/play.html)).
- Seleção de região via `zone-select` / área pop; sem conceito de capítulo.
- Identidade visual: HUD 3.0 Dark Fantasy Medieval (navy/ouro, Cinzel, theme-ref).

## Proposta

### Entrada

- Botão **CAPÍTULOS** na navegação principal (`.rail-actions`, padrão Galeria).
- Destino: tela **Crônicas das Quatro Eras** (`cronicas.html` ou rota equivalente — nome final na implementação).
- Acessível desde o lobby/play; não exige Cap.I concluído.
- Tom da tela: **selecionar uma nova era de aventura**, não um painel administrativo.

### Artes definitivas (obrigatório)

Pasta: [`idle/public/jogo-idle/assets/chapters/`](../../idle/public/jogo-idle/assets/chapters/)  
Resolução: **1024×1536** PNG — proporção **2:3**.

| Cap. | Arquivo | URL pública | Tema |
|------|---------|-------------|------|
| I | `cap-I.png` | `/jogo-idle/assets/chapters/cap-I.png` | Floresta |
| II | `cap-II.png` | `/jogo-idle/assets/chapters/cap-II.png` | Cemitério |
| III | `cap-III.png` | `/jogo-idle/assets/chapters/cap-III.png` | Chamas |
| IV | `cap-IV.png` | `/jogo-idle/assets/chapters/cap-IV.png` | Vazio |

**Regras de renderização da arte:**

1. As quatro artes são **definitivas**. Moldura dourada e numeração romana **já estão na imagem**.
2. Preservar a proporção **2:3** e a **moldura completa** — sem crop.
3. Usar encaixe equivalente a `object-fit: contain` (nunca `cover`, cortes ou distorção que eliminem partes da arte).
4. **Não** empilhar outra moldura complexa por cima das existentes (sem second frame, nine-slice ou bordas ornamentais sobre a PNG).
5. Destaques de UI (seleção, ativo, bloqueado) via glow/overlay/selo **discretos**, sem cobrir a moldura dourada nem o numeral romano.

### Layout — galeria de cartas

A **arte é o elemento principal** de cada carta. Identidade Dark Fantasy Medieval (navy/ouro, Cinzel, atmosfera).

#### Desktop (espaço suficiente)

- Priorizar **quatro cartas verticais lado a lado** (galeria horizontal).
- Painel de detalhes ao lado (direita) ou abaixo da galeria, conforme largura.
- Cartas em escala que caibam **inteiras** (2:3) sem corte; gap confortável entre elas.

#### Resoluções menores / tablet

- Adaptar sem cortar imagens: scroll horizontal da galeria, ou 2×2 com cartas menores ainda em `contain`, ou fila com snap.
- Painel de detalhes permanece legível; nunca trocar `contain` por `cover` para “preencher”.

#### Mobile

- Apresentação responsiva: carrossel/fila com snap ou stack com preview grande da carta selecionada.
- Seleção confortável (alvo de toque adequado); painel de detalhes abaixo ou em sheet.
- CTA Entrar sticky quando a carta selecionada permitir entrada.

### Conteúdo das cartas (capa)

As capas **não** carregam o bloco completo de dados. Na carta, apenas:

| Elemento na capa | Nota |
|------------------|------|
| Arte 2:3 completa | Herói visual |
| Estado (selo/badge) | BLOQUEADO / DISPONÍVEL / EM PROGRESSO / CONCLUÍDO |
| Indicador de capítulo **ativo** | Se `currentChapterId` for esta carta — independente da seleção |
| Nome curto (opcional, discreto) | Sem lista de regiões/requisitos na capa |

Todos os cards **visíveis desde o início** (incluindo bloqueados).

### Painel de detalhes

Ao **selecionar** uma carta (clique/toque/foco), abrir/atualizar o painel de detalhes com:

| Campo | Conteúdo |
|-------|----------|
| Nome do capítulo | ex. A Floresta Esquecida |
| Classificação | Mortal / Celestial / Divino / Semideus |
| Nível atual | bucket **desta temporada** (ou “—” se locked) |
| Progresso de XP | barra + texto |
| Regiões | lista/resumo das 5 |
| Chefe final | nome |
| Missão atual | quest ativa / desbloqueio (ou “—” no Cap.I sem quest) |
| Requisitos restantes | o que falta para desbloquear ou concluir |
| Recompensas | cosmético / classificação / mats |
| Botão de entrada | habilitado só se permitido |

A carta selecionada recebe **destaque visual** (borda/luz suave, elevação leve) **sem** tapar a arte nem a moldura dourada.

Capítulo **bloqueado**: painel mostra requisitos e objetivos futuros; CTA Entrar ausente ou desabilitado com mensagem clara.

### Estados obrigatórios

| Estado | UI | Interação |
|--------|-----|-----------|
| **BLOQUEADO** | Selo/overlay leve; arte **inteira** visível | Consultável; requisitos no painel; **não** entra |
| **DISPONÍVEL** | Destaque “pronto”; ainda não iniciado ou L1 | Pode entrar |
| **EM PROGRESSO** | Badge de progresso; regiões parciais no painel | Pode entrar; resume farm do capítulo |
| **CONCLUÍDO** | Selo de conclusão da **campanha** do capítulo | Pode entrar (replay / mats) |

**Conclusão ≠ só nível 500.**  
`CONCLUÍDO` exige campanha principal + requisitos finais do capítulo (quest/ritual/chefe conforme [04_QUESTS_E_RITUAIS.md](04_QUESTS_E_RITUAIS.md)), não apenas atingir o cap de nível.

**Capítulo ativo (adicional):**  
Indicador permanente na carta cujo id = `currentChapterId`, **independente** de qual carta está selecionada para leitura. Seleção ≠ ativo.

**Acesso na temporada:** status deriva dos desbloqueios **sazonais**, não do legado histórico. Legado pode mostrar badge “Já conquistou historicamente” sem liberar entrada.

Capítulos **já desbloqueados na temporada atual** permanecem acessíveis (retorno livre).

### Navegação e consulta

1. O jogador pode **consultar qualquer carta**, inclusive bloqueadas.
2. Carta bloqueada → painel com requisitos e teaser de objetivos futuros; sem entrada.
3. Carta desbloqueada na temporada → Entrar disponível (se não for a ativa, troca após validação).
4. Consultar não interrompe a caça; só o fluxo **Entrar** (abaixo) mexe no farm.

### Fluxo Entrar

Validar no **servidor antes** de interromper a caça. Se a validação falhar, a caça **continua normalmente**.

```mermaid
flowchart TD
  click[CTA_Entrar]
  api[POST_chapters_enter]
  val[Server_valida_unlock_e_requisitos]
  stop[Stop_e_persist_farm]
  switch[currentChapterId_level_xp]
  hud[HUD_zonas_do_capitulo]
  fail[Erro_requisitos]
  keep[Caca_continua]
  click --> api --> val
  val -->|ok| stop --> switch --> hud
  val -->|fail| fail --> keep
```

Regras:

1. `POST /chapters/enter` (ou equivalente) valida unlock sazonal + consistência do personagem **primeiro**.
2. Só após OK: interromper caça, persistir XP/drops/estado, trocar `currentChapterId`, espelhar level/xp do bucket, filtrar zonas.
3. Em falha: resposta de erro com faltantes; **não** chamar stop farm; UI permanece na Crônicas com mensagem.
4. Sem re-ritual; sem re-coleta de quest única; sem transferir XP entre capítulos.

### Experiência, motion e acessibilidade

- Sensação de **escolher uma era**, não configurar um admin.
- Animações discretas: fade/slide do painel, glow suave na seleção/ativo, transição ao Entrar.
- Efeitos de iluminação alinhados ao tema (ouro/navy); evitar ruído visual.
- Respeitar `prefers-reduced-motion`.
- Teclado: setas entre cartas, Enter seleciona, atalho para Entrar quando habilitado.
- Contraste HUD 3.0; estados e requisitos em texto, não só ícone/cor.
- Touch targets adequados no mobile.

---

## Alterações necessárias (futuras)

- HTML/CSS/JS da tela + botão CAPÍTULOS.
- API pública de status dos 4 cards (`GET /chapters` / embutido em `/me`) + `POST /chapters/enter` com validação **antes** do stop farm.
- HUD: filtro de zonas por `currentChapterId`; indicador de capítulo ativo.
- CSS das cartas: `object-fit: contain`, aspect-ratio 2/3, sem moldura duplicada.

## Dependências

- Modelo `chapters` ([07_ARQUITETURA_E_PERSISTENCIA.md](07_ARQUITETURA_E_PERSISTENCIA.md)).
- Artes em `assets/chapters/` (já no projeto).
- Tokens theme-ref / hud.css.
- Regras de conclusão de capítulo ([04_QUESTS_E_RITUAIS.md](04_QUESTS_E_RITUAIS.md)).

## Impactos nos jogadores

- Nenhuma até implementação.
- Legado histórico aparece como badge, sem skip de temporada.
- Consulta de cartas bloqueadas educa sobre a campanha sem punir.

## Critérios de aceite (quando implementar)

- Quatro cartas 2:3 íntegras; sem `cover`/crop; sem moldura extra sobre a PNG.
- Desktop: quatro cartas lado a lado quando couber; mobile usável sem cortar arte.
- Painel de detalhes com todos os campos; capas sem dump de dados.
- Estados + indicador de **capítulo ativo** distintos da seleção.
- CONCLUÍDO exige campanha/requisitos finais, não só L500.
- Entrar: validação server-first; falha mantém a caça.
- Bloqueados consultáveis; desbloqueados sazonais acessíveis.
- Motion discreto + acessibilidade (teclado / reduced-motion).

## Migração / rollback

UI atrás da mesma feature flag `chaptersV1`. Flag off: botão oculto; play legado.
