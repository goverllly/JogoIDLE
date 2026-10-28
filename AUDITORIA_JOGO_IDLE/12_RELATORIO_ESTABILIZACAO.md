# 12 — Relatório de estabilização

Branch: `stabilize/store-integrity`  
Partida: `90f51da`  
Escopo deste relatório: **Fases 0 e 1** apenas.

## Fase 0 — Proteção e diagnóstico

### Problemas / ações
- Working tree limpa em `main` @ `90f51da`.
- Branch `stabilize/store-integrity` criada.
- Checklist em `11_PLANO_CORRECAO.md`.
- `.gitignore` ampliado: `idle/data/backups/`, tmp/bak, evidence copies.

### Testes baseline
| Comando | Resultado |
|---------|-----------|
| `npm test` (só game) | 21 pass / 0 fail |
| `npm run admin:build` | OK |

### Decisão
- Fixtures de store usam `os.tmpdir()` + `storeTestApi.resetForTests({ savePath })`.
- Save real do desenvolvedor não entra em commits.

### Status
**Resolvido** (baseline).

---

## Fase 1 — Persistência

### Problemas encontrados (revalidados no código)
1. `writeFileSync` direto em `save.json` (risco de truncar).
2. `catch` em `load()` → `emptySave()` (wipe silencioso após JSON inválido).
3. Sem validação de estrutura / schemaVersion.
4. Sem backups versionados.
5. Risco de colisão de `updatedAt` no mesmo ms + races lógicas async no `persist()`.

### Causa raiz
Camada de I/O mínima sem atomicidade, sem distinção ENOENT vs corrupt, e confiança indevida em “JSON parseou”.

### Correções realizadas
| Área | Implementação |
|------|----------------|
| I/O atômico | `store-io.ts`: tmp exclusivo → write+fsync → rename → fsync dir (best-effort) |
| Corrupção | Principal **não** é renomeado/removido; evidence copy opcional; `STORE_PERSISTENCE_BLOCKED` |
| Schema | `validateSaveDocument`; legacy sem version OK; future version → `STORE_SCHEMA_INCOMPATIBLE` |
| Unknown keys | Preservados no top-level |
| Backups | `store-backup.ts` + `store.createBackupNow` / `restoreFromBackupFile` (sem HTTP admin) |
| Concorrência | Documentada; `updatedAt` monotônico `iso#seq`; `STALE_CHARACTER` preservado e testado |

### Arquivos
- `idle/src/store-errors.ts` (novo)
- `idle/src/store-io.ts` (novo)
- `idle/src/store-backup.ts` (novo)
- `idle/src/store.ts` (reescrito)
- `idle/src/__tests__/store.test.ts` (novo)
- `idle/package.json` (script test)
- `.gitignore`
- `AUDITORIA_JOGO_IDLE/11_PLANO_CORRECAO.md`
- `AUDITORIA_JOGO_IDLE/12_RELATORIO_ESTABILIZACAO.md`

### Decisões arquiteturais
- **Não** converter a API pública do store para Promise.
- **Não** afirmar que um mutex em `save()` protege a transação lógica async de `local-service`.
- Proteção de lost-update entre requests: otimista (`expectedUpdatedAt`).
- RMW sync no event loop já é serial no processo único.
- Multi-instância: **não suportado**.
- Sem endpoints HTTP de restore (auth = Fase 2).
- Sem Prisma/SQLite/Postgres.

### Limitações OS/FS
- `rename` atômico no mesmo volume; tmp sempre no mesmo diretório do save.
- `fsync` / fsync de diretório: best-effort (pode falhar no Windows ou FS de rede).
- Teste de permissão (`chmod 0`) pulado no Windows.

### Testes executados (pós-correção)
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **39 pass / 0 fail** (21 game + 18 store) |
| `cd idle && npm run admin:build` | **OK** |

### Riscos remanescentes
- Dois processos Node no mesmo `save.json` ainda podem corromper (documentado).
- Operações admin sem optimistic lock em catalog/fame (mesmo padrão pré-existente).
- Auth admin aberta (Fase 2).

### Validação manual sugerida
- Subir `npm run dev`, jogar um pouco, matar o processo no meio de um save (raro), confirmar save íntegro.
- Não expor `:8787` em LAN sem Fase 2.

### Status Fase 1
**Resolvido** para critérios de aceitação de persistência desta fase.

---

## Revisão final Fase 1 (pré–Fase 2)

**Data:** 2026-10-28  
**Branch / HEAD na revisão:** `main` @ `59dd861` (antes dos commits desta revisão)  
**Política:** sem push automático; trabalho só em `main`.

### Arquivos verificados
- `idle/src/store.ts` — importa `store-io.ts` + `store-backup.ts`; usa `atomicWriteJson` / `createBackupFromValidSave`
- `idle/src/store-io.ts` — escrita atômica, validação, corrupt read
- `idle/src/store-backup.ts` — backups / restore interno
- `idle/src/local-service.ts` / `admin-service.ts` — `DB_UPDATED_AT` / `STALE_CHARACTER` por igualdade
- `idle/src/server.ts` — static apenas `public/jogo-idle` (sem servir `idle/data/`)
- `idle/package.json` — `npm test` inclui `src/__tests__/**/*.test.ts`
- `idle/src/__tests__/store.test.ts`

### Problemas encontrados
| Item | Severidade | Conclusão |
|------|------------|-----------|
| `updatedAt` com sufixo `#seq` vs `Date.parse` | Residual | **Não comprovado** no path standalone; callers usam igualdade. `Date.parse("…Z#1")` → `NaN` (risco futuro). |
| Tmp órfão após falha | Gap de teste | Produção já limpava tmp; teste de regressão adicionado. |
| Restore com falha no rename | Gap de teste | Principal preservado; teste + `writeOptions` no restore. |
| `deleteCharacter` → backup | OK | Confirmado por teste. |
| `adminEndSeason` sem backup | Limitação | Stub não muta save; não conectado (esperado). |
| HTTP em `/data` | OK | Não exposto. |

### Correções nesta revisão
- Nenhuma mudança de gameplay / schema de save.
- `restoreBackupToSavePath` aceita `writeOptions` (habilita teste de falha no rename do principal sem afetar o safety-backup).
- Testes de regressão: legacy ISO, limpeza `.tmp`, delete→backup, restore falho, smoke integração.

### Testes executados
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` (revisão) | **44 pass / 0 fail** |
| `cd idle && npm run admin:build` | **OK** |

### Limitações remanescentes
- Multi-processo no mesmo `save.json`: não suportado.
- `updatedAt` `ISO#seq` não é timestamp parseável; se no futuro precisar de data, preferir campo ISO separado + `revision` numérico.
- `adminEndSeason` stub sem soft-reset / backup.

### Veredito
**Fase 1 validada.** Auth passou à Fase 2 (abaixo / `13_FASE2_AUTH.md`).

---

## Fase 2 — Autenticação / autorização

### Entregue
- `IDLE_AUTH_MODE=local|protected` com boot fail-closed (HTTPS/proxy/cookie Secure).
- Usuários Argon2id + sessões com hash SHA-256; CSRF + Origin; Admin Studio gated antes do static.
- `userId=1` reservado; CLIs `auth:create-admin` / `auth:create-player`; isolamento multi-conta.
- `assertIdleAdmin` via ALS do principal (protected) sem allowlist fixa bloqueando ADMIN legítimo.
- Persistência auth atômica em `auth-users.json` / `auth-sessions.json` (gitignored).

### Testes
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **57 pass / 0 fail** |
| `cd idle && npm run admin:build` | **OK** |

### Veredito
**Fase 2 concluída no código standalone.** Lançamento público ainda depende de TLS na borda e revisão de implantação.

---

## Fase 3 — Estabilização do HUD Builder

### Problemas revalidados
- Dirty/undo só em `components` (tokens/intro/breakpoints ignorados).
- Drag/resize/reorder gravavam sempre no desktop.
- Botão Publicar desabilitado (“Fase 5”) apesar da API existir.
- Sem `draftRevision` / conflito otimista no rascunho; `basedOnRevision` não checado na publish.
- Publish mutava memória antes do write (risco de divergência disco/memória).
- `--side-panel-w` / `--hud-h` podiam permanecer após restore.
- Bridge sem `source`/sessão/seq e fallback silencioso de breakpoint.

### Correções
| Área | Entrega |
|------|---------|
| Estado | Slice editável `{name,breakpoints,components,tokens}`; undo/redo completo |
| Breakpoints | Gestos e live patch usam breakpoint ativo; inválido rejeitado |
| Bridge | origin + source + sessionId + seq; allowlist de props/tipos |
| Draft | `draftRevision` + `expectedDraftRevision` → 409 `HUD_DRAFT_CONFLICT` |
| Publish | expected published+draft; snapshot/rollback se write falhar; UI com confirm; bloqueado se dirty |
| Restore | só draft; histórico na UI; CSS vars limpas e reaplicadas |
| Preview | editor aplica documento sanitizado do servidor pós-save/publish |

### Arquivos principais
- `idle/lib/jogo-idle/hud-builder-state.ts` (novo)
- `idle/lib/jogo-idle/hud-layout.ts` (`draftRevision`, `replaceHudCatalogPayload`)
- `idle/admin-ui/src/admin/admin-hud-builder.tsx`, `App.tsx` (CSRF header)
- `idle/public/jogo-idle/hud-builder-bridge.js`, `hud-layout-runtime.js`
- `idle/src/admin-service.ts`, `server.ts`
- `idle/src/__tests__/hud-builder-state.test.ts`, `hud-api.test.ts`

### Testes
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **76 pass / 0 fail** (57 Fase 1–2 + 19 HUD) |
| `cd idle && npm run admin:build` | **OK** |

### Compatibilidade Fase 2
Auth/`requireAdmin`/CSRF preservados; rotas HUD admin continuam atrás do gate; modo `local` sem login obrigatório.

### Riscos remanescentes
- Sem E2E browser completo do iframe (unit + HTTP + smoke manual).
- Auth/catalog/save single-process.
- Rollback ao vivo exige republicar após restore no rascunho (by design).

### Veredito
**Fase 3 concluída** — HUD Builder estabilizado para edição, save, publish e restore com evidências automatizadas.

---

## Fase 4 — Integridade do gameplay, economia e balanceamento

### Escopo
Integridade técnica (RNG, farm offline, inventário, ascensão, HTTP) + auditoria quantitativa **sem retune**. Detalhe: `14_AUDITORIA_GAMEPLAY.md`.

### Correções de integridade
| Área | Entrega |
|------|---------|
| RNG | `options.rng` em `processFarm` e callees; sem mock global de `Math.random` |
| NaN | Guard em dano outgoing/incoming e HP |
| Testes | 4.1 combate · 4.2 progressão · 4.3 inventário · 4.4 offline · 4.6 HTTP |
| Economia | Sim isolada → `AUDITORIA_JOGO_IDLE/fase4_economy/` (não grava `docs/balanceamento/` nem save) |

### Decisão de produto (offline)
Teto **2h por request** (`maxCatchUpMs`) + **5000 ticks**; chunks com `catchUpPending` podem acumular >2h. Não alterado automaticamente.

### Balanceamento
Somente relatório (`14_AUDITORIA_GAMEPLAY.md`). Nenhum preço/prob/fórmula mudado sem bug de integridade comprovado.

### Testes
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **130 pass / 0 fail** |
| `cd idle && npm run admin:build` | **OK** |

### Veredito
**Fase 4 (integridade) concluída.** Retune de balanceamento permanece decisão conjunta.

---

## Matriz (Fases 0–4)

| ID | Problema | Prioridade | Status | Teste | Commit |
|----|----------|------------|--------|-------|--------|
| P0-BASE-01 | Baseline / branch / checklist | P0 | Resolvido | 21 pass + admin build | (chore phase 0) |
| P0-STORE-01 | Escrita não atômica | P0 | Resolvido | atomic failure tests | (fix store) |
| P0-STORE-02 | Wipe em JSON corrupt | P0 | Resolvido | corrupt + restart tests | (fix store) |
| P0-STORE-03 | Schema / estrutura | P0 | Resolvido | structure + future schema | (fix store) |
| P0-STORE-04 | Backups | P0 | Resolvido | backup/restore tests | (fix store) |
| P0-STORE-05 | STALE / concurrency | P0 | Resolvido | concurrent + monotonic | (fix store) |
| P0-STORE-REV | Revisão final Fase 1 | P0 | Resolvido | 44 pass + admin build | (esta revisão) |
| P2-AUTH | Auth protected + Admin gate + CSRF | P0 | Resolvido | 57 pass + admin build | (fase 2 commits) |
| P3-HUD | HUD Builder dirty/breakpoints/publish/CSS | P0 | Resolvido | 76 pass + admin build | (fase 3 commits) |
| P4-GAMEPLAY | Combate/farm/inv/ascensão/HTTP + auditoria | P0 | Resolvido | suite Fase 4 + admin build | (fase 4 commits) |
| P5-PERF | Probe + sync /me + suspend + 5.7 | P1 | Implementação OK; GPU % N/A | ≥151 pass; HTTP/CDP em `15_*.md` | ver commits perf |
| Fase 6.1 | Auditoria funcional / beta | P1 | Documentada | 154 pass; ver `16_*.md` | `0c52cae` |
| Fase 6.2 | CSRF client, duelo oculto, restore isolado, embed da prévia | P0 | Resolvido no código | 161 pass no código; 167 com teste local do portal; admin:build OK | `73a45e0` `e452eac` `2f7cca2` `384060d` |

---

## Fase 5 — Performance (fechamento 5.7)

### Entregue
- Instrumentação gated; sync `/me`; `setRenderSuspended`; destroy; benches Node.
- 5.7: worktrees isolados + `IDLE_DATA_DIR` confirmado; regressão `ISO#2` vs `#10`; HTTP before/after; CDP entrada/heap/rAF; zonas×20 API; contrato source suspend.

### Não declarado como ganho
- FPS / GPU % / VRAM (DevTools Performance completo pendente; CDP Cursor sem emulação de visibility).
- Cold-load browser bytes (2ª versão mediu com cache quente).

### Testes
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **≥151 pass / 0 fail** |
| Veredito | **Implementação concluída; validação visual/GPU parcial** — pronto para Fase 6 funcional |

---

## Fase 6.2 — Bloqueadores da beta

### Entregue
- Cliente lê `jogo_idle_csrf` e envia `X-CSRF-Token` só em mutação same-origin. O servidor continua rejeitando token ausente, inválido ou de outra sessão.
- Duelo PvP oculto (`#arena-combat-btn`, `#arena-btn`). A caça `#arena` permanece. API 501 preservada.
- Restore com o processo parado, cópia do diretório e segunda instância. Conta, personagem, inventário, refino, preço do catálogo e papéis conferidos. Login por senha ok. Sessão antiga continua válida com outro `IDLE_SESSION_SECRET`, porque o segredo não assina o cookie.
- Prévia: `frame-ancestors 'self'` e `X-Frame-Options: SAMEORIGIN` só nas duas páginas. Iframe same-origin carregou no navegador.
- Aceitação protected no navegador, dados temporários: login, lobby, criar, +1 FOR, equipar, refinar, farm start/stop, logout, concessão admin.

### Não declarado
- Beta liberada para convite. Faltam HTTPS, health, observabilidade e a fase de convite.
- Canvas 3D da página de play (a consulta não achou `canvas`).
- Fase 6.3. Não iniciada.

### Testes
| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **161 pass / 0 fail** no código da 6.2. **167 pass / 0 fail** com `login-ui.test.ts` local, fora do Git |
| `cd idle && npm run admin:build` | **OK** |
