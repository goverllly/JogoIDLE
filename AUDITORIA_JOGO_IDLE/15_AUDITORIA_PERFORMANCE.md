# 15 — Auditoria de performance (Fase 5 + 5.7)

**Partida Fase 5:** `bb136fb`  
**HEAD pós-5.x / 5.7:** ver `git log` (commits `323cf04`… + 5.7)  
**Runtime:** standalone `idle/` · saves de teste em `.perf-wt/` (isolados; **não** `idle/data/save.json` pessoal)  
**Push/pull/reset/rebase:** não executados · Fase 6 **não** iniciada.

---

## Veredito Fase 5

| Critério | Resultado |
|----------|-----------|
| Testes verdes | **Sim** — suite ≥151 pass (regressões ISO#seq + suspend source) |
| Browser medido (DevTools/CDP equivalentes) | **Parcial** — Network/heap/rAF/entrada; **sem** FPS/p95 GPU DevTools Performance completo |
| Regressões relevantes | **Nenhuma** encontrada (ISO#2 vs #10 OK; sync OK) |
| Conclusão | **Implementação concluída; validação visual/GPU parcial.** Adequado para idle: sync HTTP correto, suspend funcional, memória JS estável no warm, `/me` sem regressão de latência. **Não** declarar ganho % de FPS/GPU. |

---

## Isolamento de saves (5.7)

Confirmado em **ambas** as revisões (`bb136fb` e `a439515`): [`idle/src/store.ts`](idle/src/store.ts) lê `IDLE_DATA_DIR` / `IDLE_SAVE_PATH`; auth usa `IDLE_DATA_DIR` via [`auth-io.ts`](idle/src/auth/auth-io.ts).

| Item | Evidência |
|------|-----------|
| Worktrees | `.perf-wt/baseline` @ `bb136fb`, `.perf-wt/current` @ `a439515` |
| Data dirs | `.perf-wt/data-*` com `save.json` próprio |
| Bind | `IDLE_BIND=127.0.0.1` + `IDLE_AUTH_MODE=local` (loopback only) |
| Save pessoal | medições escreveram só em `.perf-wt/…/save.json` (`mainSaveUntouchedCheck: true`) |

Servidores medidos **em sequência** (nunca baseline + current disputando CPU/GPU).

---

## 5.7 — `ISO#seq` / client-sync

`compareRevision` em [`client-sync.js`](idle/public/jogo-idle/client-sync.js):

- **Não** usa `Date.parse` na revision.
- Ordena por ISO textual + **seq numérico** (`Number` após `#`).
- Regressão: `ISO#2` &lt; `ISO#10` (lexicográfico do token seria invertido) — **pass**.
- Snapshot `#2` após `#10` aplicado é rejeitado — **pass**.
- `reset()` após troca de personagem — **pass**.
- Store `nextUpdatedAt()` = `` `${ISO}#${seq}` ``; STALE continua por **igualdade** de token.

---

## Comparação HTTP (métrica primária comparável — probe OFF)

Ambiente: Darwin arm64 · Apple M5 · Node 24 · Guerreiro Lv1 · zona `bosque_sussurros` · bind `127.0.0.1`.

| Cenário | Antes `bb136fb` | Depois `a439515` (nodiag) | Δ | Conclusão |
|---------|----------------:|--------------------------:|---|-----------|
| `/api/me` p50 (ms) | 17.18 | 15.08 | ~−2 ms | Semelhante (ruído) |
| `/api/me` p95 (ms) | 21.73 | 19.00 | ~−3 ms | Semelhante |
| Payload `/me` mediano (B) | 9463 | 9503 | +40 B | `revision` no JSON |
| Create char (ms) | 35.3 | 19.7 | — | Não atribuir (variação) |
| Overlap 3× `/me` wall (ms) | 43.4 | 44.4 | ~0 | Semelhante |
| Revisions no overlap | `null` (sem campo) | `#15…#17` crescentes | — | Pós-5: revision exposta |

**Probe ON** (`IDLE_PERF_DIAGNOSTICS=1`, sem `idle_perf` no cliente HTTP): meta `perfDiagnostics:true`; `/me` p50 19.33 ms — **não** comparar com baseline como equivalente (servidor com flag; cliente probe off neste run HTTP).

Arquivos: `.perf-wt/measure-baseline.json`, `measure-current-nodiag.json`, `measure-current-diag.json`.

---

## Comparação browser (CDP / Resource Timing — probe OFF)

Mesmo navegador embutido Cursor · DPR **2** · viewport ~586×716 · Guerreiro.

| Cenário | Antes | Depois (nodiag) | Conclusão |
|---------|------:|----------------:|-----------|
| rAF ~1s | ~60 | ~60 | Semelhante (não é FPS DevTools) |
| Recursos na play | 250 | 250 | Semelhante |
| GLB count | 98 | 97 | Semelhante |
| Heap JS após ~3s warm (B) | ~30.3M | ~31.3M | Semelhante (ordem de grandeza) |
| DCL / load / GLB bytes | **incomparável** | cold ~4.2 MB GLB | Baseline medido **depois** → cache HTTP quente (DCL 39 ms, GLB transfer 29 KB) — **não** usar como ganho |

### Suspensão de aba

| Checagem | Resultado |
|----------|-----------|
| `Emulation.setEmulatedVisibilityState` no CDP Cursor | **Indisponível** |
| Redefinir `document.visibilityState` | **Bloqueado** |
| Contrato código: `setRenderSuspended` ≠ `timeline.clear` | **Testado** (`render-suspend-source.test.ts`) |
| `visibilitychange` → `setRenderSuspended`, não `scene.setActive(false)` | **Testado** |
| Ganho % CPU/GPU vs baseline | **Não mensurado** — não declarar |

Navegador pode pausar rAF sozinho quando a aba está realmente oculta; ausência de frames ≠ prova isolada de ganho do Three.js.

### Zona ×20 (API, save isolado)

20 alternâncias `bosque_sussurros` ↔ `pantano_sombras`: latências ~45–71 ms/ciclo; save só no data dir de teste; sem falha.

### Combate contínuo FPS / draw calls / VRAM

**Pendente** DevTools Performance manual (impedimento: CDP Cursor sem painel Performance completo / sem FPS estável reportável). Checklist para o desenvolvedor:

1. Worktree ou checkout isolado + `IDLE_DATA_DIR` temp + `IDLE_BIND=127.0.0.1`.
2. Chrome estável, mesma janela, cold cache (`Disable cache`).
3. Performance: 60–90 s combate; Memory: heap após warm + 20 zone swaps.
4. Repetir em `bb136fb` e HEAD; preencher tabela com medianas.

---

## Matriz resumo 5.7

| Cenário | Antes | Depois | Variação | Ambiente | Conclusão |
|---------|-------|--------|----------|----------|-----------|
| A Entrada (HTTP create/select) | ~18–35 ms | ~15–20 ms | ruído | Node loopback | Sem regressão |
| B Combate FPS | — | — | — | — | **Inconclusivo / pendente manual** |
| C Zonas ×20 | — | 45–71 ms API | — | isolado | Estável (API) |
| D Aba oculta | loop contínuo (código) | suspend API | funcional | código+teste | Sem % GPU |
| E `/me` Network | p50 17 ms | p50 15 ms | ~0 | HTTP seq | Sem regressão |
| Memória JS warm | ~30 MB | ~31 MB | ~0 | CDP | Sem vazamento óbvio no intervalo curto |
| Probe overhead | n/a | HTTP diag p50 19 ms | — | não eq. | Só complementar |

---

## Decisões / não feitos

- Sem SSE/WebSocket, compressão GLB, presets gráficos, lazy-init 2D.
- Sem mudança de `POLL_MS`, fórmulas, farm 2h, auth, HUD Builder, assets.
- 149/151 testes ≠ unidades de FPS.

---

## Limitações remanescentes

1. FPS / frame-time p95 / GPU / VRAM reais — checklist manual Chrome.
2. Comparação cold-load browser exigiria limpar cache entre versões (nesta sessão o 2º load foi warm).
3. Suspensão: prova funcional + contrato de código; sem telemetria GPU before/after.
4. Lazy-init 2D e cache GLB eviction — sem evidência de gargalo.

---

## Recomendação pós-Fase 5

Seguir para **Fase 6 — auditoria de funcionalidades / preparação de lançamento** (stubs vs pronto), não novas micro-otimizações sem o checklist GPU manual se desejar fechar 100% visual.

---

## Testes / build (5.7)

| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **≥151 pass** (inclui ISO#2/#10 + suspend source) |
| `cd idle && npm run admin:build` | **OK** |
