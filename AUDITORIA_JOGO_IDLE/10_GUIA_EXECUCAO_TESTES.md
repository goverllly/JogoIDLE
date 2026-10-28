# 10 — Guia de execução e testes

Fonte operacional: `idle/README.md`, `idle/package.json`.

## 1. Subir o standalone

```bash
cd idle
npm install          # também roda postinstall → admin-ui install
npm run admin:build  # gera public/jogo-idle/admin/
npm run dev          # tsx watch src/server.ts
```

- Porta default: **8787** (`PORT` env opcional).
- Lobby: http://localhost:8787/jogo-idle/lobby.html  
- Play: http://localhost:8787/jogo-idle/play.html  
- Admin: http://localhost:8787/jogo-idle/admin/  

Hot-reload admin: `npm run admin:dev` (Vite, proxy API — ver README).

Progresso: `idle/data/save.json`.

## 2. Smoke checklist (manual)

| # | Passo | Esperado |
|---|-------|----------|
| 1 | Abrir lobby | Página carrega; criar/selecionar personagem |
| 2 | Entrar play | Intro (se enabled) → HUD; cena 3D |
| 3 | Start farm | HP monstro cai; XP/gold sobem no poll ~2s |
| 4 | Stop farm | Farm para |
| 5 | Inventário / equip | Item aparece/equipa sem erro API |
| 6 | Abrir admin | Studio React; Visão Geral com dados |
| 7 | HUD: salvar draft | “Rascunho” salva; **Publicar** continua disabled |
| 8 | Play após draft | Layout play = published anterior (não o draft), salvo publish via API |
| 9 | Engagement claim (se UI) | Falha / 410 |
| 10 | Arena (se UI) | 501 / desligada |

## 3. Testes automatizados

```bash
cd idle
npm test
```

Script: `tsx --test lib/jogo-idle/game/__tests__/**/*.test.ts`

### Arquivos atuais (3)

| Arquivo | Foco aproximado |
|---------|-----------------|
| `appearance-lock.test.ts` | normalize appearance, cosméticos, locks por classe |
| `journey-model.test.ts` | modelo journey |
| `journey-collect.test.ts` | coleta/estatísticas journey |

~26 `it(`/`describe` agregados nas contagens por arquivo; **não** cobrem combate, drops, admin HTTP, HUD, Three.js, store I/O.

## 4. O que os testes **não** cobrem hoje

- `processFarm` / crit / block / skills MP
- Drop rates, refine, ritual
- Offline catch-up
- Express routes / admin auth
- Persistência `save.json`
- Cliente `app.js` / `scene3d.js` / intro
- Duelo / arena
- Capítulos end-to-end HTTP
- Visual regression / a11y

## 5. Audit de balanceamento (opcional, não muda runtime do jogo em produção)

```bash
cd idle
npm run audit:balance
```

Roda `scripts/balance-audit/run-all.mjs` + `write-docs.mjs`. Para esta pasta de auditoria, copiar saídas se desejado; **não** é requisito para jogar.

## 6. Root monorepo (Véu de Cinzas)

`npm` na raiz do repo **não** sobe o IDLE. Tratar como projeto irmão (Vite/Phaser). Não usar como smoke do Jogo IDLE.
