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

## Matriz (Fases 0–1)

| ID | Problema | Prioridade | Status | Teste | Commit |
|----|----------|------------|--------|-------|--------|
| P0-BASE-01 | Baseline / branch / checklist | P0 | Resolvido | 21 pass + admin build | (chore phase 0) |
| P0-STORE-01 | Escrita não atômica | P0 | Resolvido | atomic failure tests | (fix store) |
| P0-STORE-02 | Wipe em JSON corrupt | P0 | Resolvido | corrupt + restart tests | (fix store) |
| P0-STORE-03 | Schema / estrutura | P0 | Resolvido | structure + future schema | (fix store) |
| P0-STORE-04 | Backups | P0 | Resolvido | backup/restore tests | (fix store) |
| P0-STORE-05 | STALE / concurrency | P0 | Resolvido | concurrent + monotonic | (fix store) |
| Fases 2–6 | Auth, HUD, … | P1+ | Pendente | — | — |
