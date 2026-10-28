# Guia Visual — HUD 3.0 Jogo IDLE

**Data:** 2026-10-26  
**Uso:** direção artística e regras técnicas para produção de assets.  
**Companheiros:** [`AUDITORIA_COMPONENTES_VISUAIS.md`](AUDITORIA_COMPONENTES_VISUAIS.md) · [`CATALOGO_ASSETS_HUD_3.md`](CATALOGO_ASSETS_HUD_3.md) · [`PROMPTS_ASSETS_HUD_3.md`](PROMPTS_ASSETS_HUD_3.md)

---

## 1. Visão

Transformar a UI Jogo IDLE de painéis CSS/navy + PNGs opacos em uma experiência **Dark Fantasy Medieval** coerente: pedra negra, metal envelhecido, molduras góticas douradas, lanternas/brasas, ruínas e luz cinematográfica — sem sacrificar legibilidade nem a lógica dinâmica do jogo.

**Não é objetivo deste guia** alterar código. A implementação CSS virá depois da biblioteca de imagens.

---

## 2. Paleta oficial

Tokens verificados em `theme-ref.css` (`.play-stage`):

| Papel | HEX | Token / uso |
|-------|-----|-------------|
| Azul profundo (fundo) | `#061323` | `--bg` |
| Azul secundário | `#0a1a2e` | `--bg-2` |
| Card | `#0c1c30` / `#102438` | `--card` / `--card-2` |
| Linha / metal frio | `#1e3a55` / `#7a93a8` | `--line` / `--metal` |
| Ouro principal | `#F4B52B` | `--gold` |
| Ouro claro | `#FFD56A` | `--gold-bright` |
| Ouro envelhecido | `#D99A27` | `--gold-soft` |
| Texto | `#e8f0f8` | `--ink` |
| Texto secundário | `#8aa4bc` | `--muted` |
| HP | `#e53935` → `#ff7043` | meters |
| MP | `#26c6da` → `#4dd0e1` | meters |
| XP | `#ab47bc` → `#ce93d8` | meters |
| OK / perigo | `#26a69a` / `#ef5350` | `--ok` / `--danger` |

**Raridades (não substituir por ouro):** common `#b5ad9c`, uncommon `#63c763`, rare `#4f9fff`, epic `#b46cff`, legendary `#ff9a2e`.

**Âmbar de brilho (arte):** `#ff8a3d`–`#e85d04` — glow de cantos/lanternas; não tokenizado; usar com parcimônia.

**Tipografia:** display Cinzel 600/700; corpo Source Sans 3 400/600/700. Texto sempre HTML/CSS.

---

## 3. Materiais e iluminação

| Material | Uso |
|----------|-----|
| Pedra negra / basalto | Corpo das molduras, painéis |
| Metal envelhecido (ferro, bronze sujo) | Filetes internos, rebites |
| Ouro polido + ouro gasto | Ornamentos góticos, cantos, títulos decorativos sem glyphs de texto |
| Vidro / cristal fumê | Miolo semi-transparente atrás de conteúdo (via CSS + alpha) |
| Brasa / lanterna | Pontos de luz nos cantos ou eixo; nunca no centro safe |

**Iluminação:** key light superior suave; rim light ouro nos ornamentos; centro do painel mais escuro e limpo. Evitar bloom exagerado e “glow purple UI” genérico.

---

## 4. Simetria e geometria

Regras obrigatórias para molduras:

1. Bordas esquerda e direita **espelhadas** (testar com flip horizontal).  
2. Cantos superior/inferior em pares compatíveis.  
3. Ornamento central (topo e base) alinhado ao **eixo vertical**.  
4. Espessura de filete dourado **constante** dentro da mesma família (SM/MD/LG/side).  
5. Não colocar spikes, runas ou joias no **miolo safe**.  
6. Composição adequada à proporção do componente (não forçar arte quadrada em slot vertical 1087∶1447).

---

## 5. Transparência e formatos

| Tipo | Formato | Alfa |
|------|--------|------|
| Molduras, ornamentos, slots, botões | PNG ou WebP | **Obrigatório** — transparência real |
| Fundos de miolo (`bg-*`) | JPG ou WebP opaco | Sem alfa |
| Ícones UI/skills | SVG atuais | Vetorial |

**Proibido:** fundo branco/preto fingindo transparência; matte sujo nas bordas; comprimir até destruir o canal alfa.

Cantos da arte devem ter anti-alias suave sobre alpha, não halo branco.

---

## 6. Nine-slice e responsividade

### Quando usar nine-slice (técnica C)

- `frame-modal-md` / `lg`  
- `frame-panel-side` (rail/bag/drawers)  
- `frame-arena`  
- `frame-btn-*`, `frame-tab*`, `frame-tooltip`, `frame-menu`  

### Quando NÃO usar (proporção fixa + `100% 100%`)

- `frame-heroi`, `frame-skills`, `frame-alvo`, `frame-zona` — já acoplados a `aspect-ratio` / grid em `theme-ref.css`.

### Evitar

- `background-size: cover` em molduras ornamentadas (problema atual de `painel-arcano-gotico`).  
- Esticar cantos com ornamentos complexos.  
- Uma única arte “genérica” para ratios muito diferentes (vertical 1087∶1447 ≠ horizontal 2172∶724).

### Mobile

- Drawers ≤980px: mesma `frame-panel-side`, largura `min(320px, 88vw)`.  
- Trio combate: `@media` já ajusta aspect; mesma arte, escala.  
- Não depender de crop; se preciso, variante `@1.5x` só se o nine-slice falhar em testes futuros.

---

## 7. Margens seguras (conteúdo)

Valores alinhados ao padding CSS atual dos units (`theme-ref.css`):

| Componente | Safe inset aprox. |
|------------|-------------------|
| `.unit--hero` | Top 10% · L/R 11% · Bottom 13% |
| `.unit--skills` | Top 9% · L/R 12% · Bottom 11% |
| `.unit--target` | Top 9% · L/R 11% · Bottom 14% |
| `.zone-plaque` | L/R ~12% · T/B ~8–10% |
| `.card--rail` / bag | ≥12px (@1×) do edge; ornamentos ≤24–36px de espessura de borda |
| Modais | Padding visual ≥16px; botões nunca sob ornamento de canto |
| Slots 68 / 48 / 56 | Ícone ≤62% do miolo; moldura ≤ outer ring |

**Overflow:** units e cards usam `overflow: hidden` — ornamentos desenhados *fora* do retângulo serão clipados. Desenhar a moldura **dentro** do bitmap do componente.

---

## 8. Legibilidade e usabilidade

1. Contraste texto `#e8f0f8` sobre miolo `#061323`–`#0e2238`.  
2. Não colocar textura ruidosa atrás de títulos Cinzel.  
3. Controles (skills, toggles, attr-plus) ficam no safe; arte só emoldura.  
4. Estados disabled/selected: CSS (opacity, border, filter) — não exigir terceira arte se 1–2 frames + CSS bastarem.  
5. Raridade: cor via `--rc`; moldura base única.  
6. Progresso (HP/MP/XP): fill CSS; imagem só no track/caps.

---

## 9. O que deve continuar em CSS

- Gradientes de fill de meters e rage/mp switch  
- Animações hit/heal, item-glow, refine angle  
- Tipografia e números (`#stat-*`, deltas)  
- Backdrops e blur de modal  
- Toggle switch 36×20  
- Classes de estado (`.active`, `.is-on`, `.filled`, `.blocked`, `.locked`)  
- Layout grid (`--hud-h`, colunas do trio)

---

## 10. Famílias visuais (espessura)

| Família | Espessura de moldura (rec. @1×) | Cantos nine-slice |
|---------|--------------------------------|-------------------|
| Modal SM/MD/LG | 10–16px | 24–32px |
| Panel side | 12–20px | 28–36px |
| Trio / zona | 8–14% da menor dimensão nas bordas densas | N/A (stretch uniforme) |
| Tooltip / toast | 6–10px | 16–20px |
| Botão | 4–8px | 12–16px |
| Slot | anel 3–5px | N/A |

Manter a mesma “voz” (pedra + ouro gótico) em todas; variar só densidade e escala.

---

## 11. Integração futura (referência, não executar)

1. Preferir `border-image` ou camadas `background` com nine-slice.  
2. Trio/zona: manter `center / 100% 100%` + ratio CSS = ratio arte.  
3. Substituir RGB atuais por RGBA sem mudar IDs de seletor.  
4. Rail/bag: abandonar `cover` na moldura.  
5. Não reativar ranking assets até existir tela.

---

## 12. Checklist de QA de arte

- [ ] Flip L/R idêntico  
- [ ] Alfa limpo (sem matte)  
- [ ] Safe area livre de ornamentos críticos  
- [ ] Proporção = catálogo  
- [ ] Sem texto UI  
- [ ] Sem UI falsa (sliders, janelas OS)  
- [ ] Compatível com nine-slice se marcado C  
- [ ] Paleta dentro da tabela §2  
- [ ] Não parece “dashboard SaaS” nem neon purple  

---

*Guia alinhado aos tokens e paddings reais do play-stage.*
