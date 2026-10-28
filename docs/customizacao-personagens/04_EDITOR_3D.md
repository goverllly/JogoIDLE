# 04 — Editor 3D (Studio)

## Rota

`/jogo-idle/criar.html` — entrada pelo lobby (Novo personagem).

## Fluxo em 3 etapas

1. **Classe e nome** — 4 classes + input nome.  
2. **Personalização 3D** — preview central + paletas.  
3. **Revisão e confirmação** — aviso de aparência definitiva + Criar.

## Preview

Iframe `preview.html` / `preview.js`:

- Orbit + zoom  
- Presets: Frente, Costas, Reset (`postMessage`)  
- `applyLook` em tempo real  
- Elmo **oculto por padrão** no draft do Studio  
- Gear de combate oculto no preview  

## Layout

- Esquerda / topo: identidade e passos  
- Centro: modelo 3D dominante  
- Direita: categorias (pele, vestimenta, metal, capa, elmo, pose, escala)  
- Inferior: Voltar · Restaurar · Avançar / Confirmar  

## Visual HUD 3.0

Navy, aço, ouro antigo, Cinzel, painéis com borda azulada.