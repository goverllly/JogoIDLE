# 06 — Plano de implementação

## Fases

1. Docs (este diretório)  
2. Schema + bloqueio + cosmetics fix + `resolveVisualLook`  
3. Preview Frente/Costas/Reset  
4. Studio `criar.html` 3 etapas  
5. Lobby CTA  
6. Combate usa birth look  
7. Testes automatizados (`appearance-lock.test.ts`) + manuais  

## Critérios de aceite

- [ ] 4 classes criáveis com paletas reais  
- [ ] Elmo default oculto no Studio  
- [ ] Confirm aviso definitivo  
- [ ] API update appearance → 403  
- [ ] Cosmetics não mutam appearance  
- [ ] Chars antigos seguem jogáveis  
- [ ] Sem mudança de fórmulas combate/economia/capítulos  

## Arquivos-alvo

`appearance.ts`, `cosmetics.ts`, `character.ts`, `server.ts`, `local-service.ts`, `service.ts`, `preview.js`, `criar.*`, `lobby.html`, `scene3d.js`, `__tests__/appearance-*.test.ts`
