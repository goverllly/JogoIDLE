# 11 — Plano de correção (checklist)

Branch de trabalho: **`main`** (sem branch de estabilização).  
Commit de partida Fase 0/1: `90f51da` → integrado em `main` até `59dd861`.  
Escopo concluído e **revalidado**: **Fases 0, 1, 2 (auth), 3 (HUD Builder) e 4 (gameplay/economia)**. Fases 5–6 permanecem **Pendente**.  
Detalhe Fase 2: `13_FASE2_AUTH.md`. Detalhe Fase 4: `14_AUDITORIA_GAMEPLAY.md`.

## Baseline (Fase 0) + revisão final

| Check | Comando | Resultado | Quando |
|-------|---------|-----------|--------|
| Git limpo | `git status` | Limpo em `main` | 2026-10-28 |
| HEAD partida | `git rev-parse --short HEAD` | `90f51da` (início) | 2026-10-28 |
| `npm test` (pré) | `cd idle && npm test` | **21 pass / 0 fail** | 2026-10-28 |
| `admin:build` (pré) | `cd idle && npm run admin:build` | **OK** | 2026-10-28 |
| `npm test` (pós Fase 1) | inclui store tests | **39 pass / 0 fail** | 2026-10-28 |
| `npm test` (revisão final) | + regressões | **44 pass / 0 fail** | 2026-10-28 |
| `admin:build` (revisão) | `cd idle && npm run admin:build` | **OK** | 2026-10-28 |
| `npm test` (pós Fase 2) | + auth HTTP/boot | **57 pass / 0 fail** | 2026-10-28 |
| `admin:build` (pós Fase 2) | `cd idle && npm run admin:build` | **OK** | 2026-10-28 |
| `save.json` no git | `.gitignore` | Ignorado + backups/tmp/evidence | Confirmado |
| Fase 1 validada | revisão final | **Sim — pronta para Fase 2** | 2026-10-28 |
| Fase 2 auth | `13_FASE2_AUTH.md` | Critérios de conclusão atendidos | 2026-10-28 |
| `npm test` (pós Fase 3) | + HUD state/API | **76 pass / 0 fail** | 2026-10-28 |
| `admin:build` (pós Fase 3) | `cd idle && npm run admin:build` | **OK** | 2026-10-28 |
| Fase 3 HUD Builder | dirty/undo, breakpoints, publish, CSS | Critérios atendidos | 2026-10-28 |
| `npm test` (pós Fase 4) | combate/progressão/inv/farm/HTTP | **130 pass / 0 fail** | 2026-10-28 |
| `admin:build` (pós Fase 4) | `cd idle && npm run admin:build` | **OK** | 2026-10-28 |
| Fase 4 gameplay | RNG + integridade + auditoria econômica | Critérios de integridade; **sem retune** | 2026-10-28 |

## Itens

| ID | Descrição | Pri | Arquivo | Evidência | Causa raiz | Correção | Status | Testes | Resultado | Commit |
|----|-----------|-----|---------|-----------|------------|----------|--------|--------|-----------|--------|
| P0-BASE-01 | Baseline + branch + checklist | P0 | `11_PLANO_CORRECAO.md` | Auditoria | — | Documentar + gitignore | Resolvido | npm test / admin:build | 21→39 pass; build OK | ver log git |
| P0-STORE-01 | WriteFileSync não atômico | P0 | `store-io.ts` | writeFileSync antigo | Truncamento | tmp+fsync+rename | Resolvido | fail before/during temp | Passou | ver log git |
| P0-STORE-02 | JSON corrupt → emptySave wipe | P0 | `store.ts` / `store-io.ts` | catch → emptySave | Catch silencioso | Bloquear writes; arquivo permanece | Resolvido | JSON inválido + restart | Passou | ver log git |
| P0-STORE-03 | Sem schema validation | P0 | `store-io.ts` | Só JSON.parse | Aceita qualquer JSON | validateSaveDocument + schemaVersion | Resolvido | structure + future schema | Passou | ver log git |
| P0-STORE-04 | Sem backups versionados | P0 | `store-backup.ts` | Aba Backup disabled | Sem motor | Backups internos (sem HTTP) | Resolvido | backup/restore | Passou | ver log git |
| P0-STORE-05 | Race lógica async + STALE | P0 | `store.ts` + local-service | Gaps async | Event loop ≠ transação lógica | updatedAt monotônico + STALE; doc limites | Resolvido | concurrent + STALE | Passou | ver log git |
| P2-AUTH-01… | Auth local/protected, Admin gate, CSRF, isolamento | P0 | `idle/src/auth/*`, `server.ts` | Auditoria + plano Fase 2 | Identidade fixa standalone | Sessões + middleware + testes HTTP | Resolvido | npm test 57 / admin:build | Passou | ver log git |
| P3-HUD-01… | Dirty/undo slice, breakpoints, bridge, draftRevision, publish atômico, CSS vars | P0 | `admin-hud-builder`, `hud-layout*`, `admin-service` | Plano Fase 3 | Dirty só components; gestos→desktop; Publicar disabled | Slice editável + concurrency + restore/CSS | Resolvido | npm test 76 / admin:build | Passou | ver log git |
| P4-COMBAT-01 | RNG não injetável no farm PvE | P0 | `combat.ts`, `items.ts`, `combat-skills.ts` | Plano Fase 4 | Math.random espalhado | `options.rng` + NaN guard | Resolvido | combat.test | Passou | ver log git |
| P4-PROG-01 | Ascensão/XP/capítulos sem testes de integridade | P0 | `character.ts`, `chapters.ts` | Plano Fase 4 | Sem cobertura | Testes consume-once + STALE | Resolvido | progression.test | Passou | ver log git |
| P4-INV-01 | Drops/inventário/refine sem invariantes | P0 | `inventory.ts`, `items.ts` | Plano Fase 4 | Sem cobertura | Sell/stack/Suco held/refine | Resolvido | inventory.test | Passou | ver log git |
| P4-FARM-01 | Offline sem matriz 30m–24h / 5k / pending | P0 | `combat.ts` | Plano Fase 4 | Teto 2h/request documentado | Matriz + chunks >2h | Resolvido | farm-offline.test | Passou | ver log git |
| P4-ECON-01 | Auditoria quantitativa sem retune | P1 | `phase4-economy-sim.mjs`, `14_*.md` | Plano Fase 4 | Relatório | Sim isolada + doc | Resolvido | sim + docs | Passou | ver log git |
| P4-HTTP-01 | Fluxos protected farm/sell/refine/ascend | P0 | `gameplay-http.test.ts` | Plano Fase 4 | Sem HTTP gameplay | CSRF/IDOR/replay | Resolvido | gameplay-http.test | Passou | ver log git |

## Limitações documentadas (concorrência)

- Métodos sync `load→mutate→save` no store não intercalam entre si no mesmo processo Node (event loop).
- Operações de gameplay assíncronas em `local-service` / `admin-service` podem carregar o personagem, aguardar, e só então `persist` — a proteção é **otimista** via `expectedUpdatedAt` / `STALE_CHARACTER` (409).
- Mutex só em `save()` **não** cobriria essa transação lógica; **não foi implementado nem afirmado**.
- `updatedAt` agora é `ISO#seq` para evitar duas revisões idênticas no mesmo milissegundo.
- Múltiplos processos/instâncias no mesmo `save.json`: **não suportado** nesta fase.

## Limitações OS / FS (escrita atômica)

- Temporário exclusivo no **mesmo diretório** do save; `rename` atômico no mesmo volume.
- `fsync` do arquivo e do diretório: best-effort (pode ser no-op/erro no Windows ou FS de rede).
- Falha antes do rename: principal intacto; tmp removido na limpeza.
