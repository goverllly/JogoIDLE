# 02 — Navegação: Crônicas das Quatro Eras

**Status:** especificação de UI. **Não implementar interface nesta etapa.**

---

## Regra atual

- Navegação de play: `.rail-actions` com Galeria, Divindade, Merchant, Logout ([`play.html`](../../idle/public/sinergia-idle/play.html)).
- Seleção de região via `zone-select` / área pop; sem conceito de capítulo.
- Identidade visual: HUD 3.0 Dark Fantasy Medieval (navy/ouro, Cinzel, theme-ref).

## Proposta

### Entrada

- Botão **CAPÍTULOS** na navegação principal (`.rail-actions`, padrão Galeria).
- Destino: tela **Crônicas das Quatro Eras** (`cronicas.html` ou rota equivalente — nome final na implementação).
- Acessível desde o lobby/play; não exige Cap.I concluído.

### Layout — quatro cards

Todos os cards **visíveis desde o início** (incluindo bloqueados). Artes **independentes por capítulo** (slots; sem gerar arte genérica nem reusar asset de outro capítulo como definitivo).

Cada card apresenta:

| Campo | Conteúdo |
|-------|----------|
| Número | I–IV |
| Nome | ex. A Floresta Esquecida |
| Tema visual | arte + paleta do bioma |
| Classificação | Mortal / Celestial / Divino / Semideus |
| Nível atual | nível no bucket **desta temporada** (ou “—” se locked) |
| Progresso % | XP no nível + avanço regional |
| Regiões | lista/resumo das 5 |
| Chefe final | nome |
| Missão de desbloqueio | quest/ritual (ou “—” no Cap.I) |
| Recompensas principais | cosmético / classificação / mats |
| Estado | ver abaixo |
| CTA | Entrar (só se permitido) |

### Estados obrigatórios

| Estado | UI | Interação |
|--------|-----|-----------|
| **BLOQUEADO** | Overlay/selo; arte visível; requisitos listados | Não entra; tap/click mostra o que falta |
| **DISPONÍVEL** | Destaque “pronto”; nível 1 ou ainda não iniciado | Pode entrar |
| **EM PROGRESSO** | Nível + %; regiões parciais | Pode entrar; resume farm |
| **CONCLUÍDO** | Selo de conclusão da campanha principal do capítulo | Pode entrar (replay opcional / mats) |

**Acesso na temporada:** status deriva dos desbloqueios **sazonais**, não do legado histórico. Legado pode mostrar badge “Já conquistou historicamente” sem liberar entrada.

### Fluxo Entrar

```mermaid
flowchart TD
  click[CTA_Entrar]
  api[POST_chapters_enter]
  stop[Stop_persist_farm]
  val[Server_valida_unlock_sazonal]
  switch[currentChapterId_level_xp]
  hud[HUD_zonas_do_capitulo]
  click --> api --> stop --> val
  val -->|ok| switch --> hud
  val -->|fail| err[Erro_requisitos]
```

Troca: interrompe caça, persiste XP/drops, valida servidor, carrega bucket do capítulo. Sem re-ritual, sem re-coleta de quest única.

### Desktop e mobile

- Desktop: grid 2×2 ou fila de 4 cards com detalhe lateral.
- Mobile: stack vertical; card expansível; CTA sticky.
- Acessibilidade: contraste HUD 3.0; foco teclado; texto de requisitos não só ícone.

### Artes por capítulo (entregues)

Pasta: [`idle/public/sinergia-idle/assets/chapters/`](../../idle/public/sinergia-idle/assets/chapters/)  
Resolução: **1024×1536** PNG.

| Cap. | Arquivo | URL pública | Tema |
|------|---------|-------------|------|
| I | `cap-I.png` | `/sinergia-idle/assets/chapters/cap-I.png` | Floresta / ruínas sob a lua |
| II | `cap-II.png` | `/sinergia-idle/assets/chapters/cap-II.png` | Cemitério gótico |
| III | `cap-III.png` | `/sinergia-idle/assets/chapters/cap-III.png` | Inferno / magma |
| IV | `cap-IV.png` | `/sinergia-idle/assets/chapters/cap-IV.png` | Vazio / buraco negro |

Origem: `Downloads/Capitulo1.png` … `Capitulo4.png`. Cards da UI Crônicas devem usar estes paths (não reutilizar arte de outro capítulo).

---

## Alterações necessárias (futuras)

- HTML/CSS/JS da tela + botão CAPÍTULOS.
- API pública de status dos 4 cards (`GET /chapters` / embutido em `/me`).
- HUD: filtro de zonas por `currentChapterId`.

## Dependências

- Modelo `chapters` (doc 07).
- Assets de arte (pipeline externo).
- Tokens theme-ref / hud.css.

## Impactos nos jogadores

- Nenhuma até implementação.
- Legado histórico aparece como badge, sem skip de temporada.

## Critérios de aceite (quando implementar)

- Quatro cards visíveis; bloqueado mostra requisitos; entrar só com unlock server-side.
- Mobile usável; artes por capítulo (ou placeholder explícito).
- Troca de capítulo não duplica quests nem corrompe farm.

## Migração / rollback

UI atrás da mesma feature flag `chaptersV1`. Flag off: botão oculto; play legado.
