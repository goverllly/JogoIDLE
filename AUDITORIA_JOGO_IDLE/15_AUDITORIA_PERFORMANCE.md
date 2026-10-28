# 15 — Auditoria de performance (Fase 5)

**Partida:** `bb136fb` (UX pós-Fase 4)  
**Runtime de verdade:** standalone `idle/` (`lobby.html` → `criar.html` → `play.html`)  
**Política:** medir → otimizar só gargalo confirmado → comparar → regressão.  
**Push/pull/reset/rebase:** não executados.

---

## Baseline de execução (Agent)

| Check | Resultado |
|-------|-----------|
| HEAD partida | `bb136fb` |
| Working tree | limpa antes do início |
| `cd idle && npm test` (pré) | **137 pass / 0 fail** |
| `cd idle && npm run admin:build` (pré) | **OK** |
| `cd idle && npm test` (pós mudanças desta fase) | **149 pass / 0 fail** |
| `admin:build` (pós) | OK (reexecutar no commit final) |

### Ambiente de máquina (Agent / host)

| Campo | Valor |
|-------|-------|
| OS | Darwin 25.6.0 arm64 |
| SoC / GPU | Apple M5 (Metal Supported) — chipset unificado |
| Node | v24.18.0 |
| Browser FPS / WebGL / Network bytes | **não medidos nesta sessão Agent** (sem Chrome DevTools Performance anexado) |
| devicePixelRatio / refresh rate / resolução de teste | **pendente** checklist manual |

**Fase 5 NÃO está integralmente validada para métricas de GPU/FPS de navegador.**  
O que segue distingue **medido (Node/código)** de **checklist pendente (browser)**.

---

## Inventário (carregamento / render)

| Módulo | Papel |
|--------|-------|
| `idle/public/jogo-idle/arena.js` | Orquestra 2D+3D; hoje **sempre** cria 2D antes do 3D |
| `idle/public/jogo-idle/scene3d.js` | Three.js, `setAnimationLoop`, GLTF actors, zonas, FX |
| `idle/public/jogo-idle/scene.js` | Fallback 2D |
| `idle/public/jogo-idle/kaykit-props.js` | Props GLB / preload |
| `idle/public/jogo-idle/fx.js` | Timeline de combate / DOM FX |
| `idle/public/jogo-idle/app.js` | Poll 2s, HUD, `/api/me` |
| `idle/public/jogo-idle/perf-probe.js` | Diagnóstico (gated) |
| `idle/public/jogo-idle/client-sync.js` | Ordenação revision /me vs mutações |
| `idle/src/local-service.ts` | `syncAndPublic` → `processFarm` + persist |
| `idle/lib/jogo-idle/game/combat.ts` | Farm ticks / eventos |

Assets: KayKit / modelos em `MODEL_DIR` (GLB), HUD icons, skills art — preservados.

---

## 5.1 — Instrumentação

### Probe (`perf-probe.js`)

- Ativa **somente** se `GET /api/meta.perfDiagnostics === true` **e** (`localStorage.idle_perf=1` ou `?idle_perf=1`).
- `perfDiagnostics` no boot: `IDLE_AUTH_MODE=local` **e** `IDLE_PERF_DIAGNOSTICS=1`.
- **Protected:** sempre `perfDiagnostics=false` (mesmo com env=1) — testado.
- Não usa hostname como prova de segurança.
- Não registra cookies/tokens/payloads; não envia telemetria externa.
- Distingue: rAF FPS (aba visível) vs frames WebGL pós-`render`; `renderer.info` = contagens (não VRAM bytes); amostras hidden separadas.
- Overhead probe ligado vs desligado: **pendente** medição browser (comparar duas sessões).

### Como ativar (dev)

```bash
IDLE_AUTH_MODE=local IDLE_BIND=127.0.0.1 IDLE_PERF_DIAGNOSTICS=1 npm run dev
# no browser: localStorage.setItem('idle_perf','1'); location.reload()
# snapshot: window.__idlePerfSnapshot()
```

---

## Análise de concorrência (5.4) — código

| Cenário | Risco antes | Mitigação |
|---------|-------------|-----------|
| Dois `/me` sobrepostos | UI/scene com resposta antiga | `runRefreshExclusive` + epoch |
| Sell/equip/refine vs `/me` atrasado | Snapshot antigo sobrescreve | `character.revision` + `acceptCharacterSnapshot` |
| Mutação em voo | `/me` com mesma rev | `pendingMutations` bloqueia equal |
| Eventos de combate | Replay duplicado / stale | `acceptFarmPresentation` + `farmBatchKey` |
| Offline report | Já tinha seq | Mantido (`beginRefresh` do offline-report) |
| Abort fetch | Não cancela farm no server | Documentado; não usamos abort como cancelamento de economia |

`publicCharacter` agora expõe `revision` a partir de `__dbUpdatedAt`.

---

## 5.2 — Three.js (render lifecycle)

| API | Comportamento |
|-----|----------------|
| `setRenderSuspended(true/false)` | Só pausa/retoma `setAnimationLoop`; **não** `timeline.clear()`; `clock.getDelta()` no resume |
| `setActive(false)` | Desativação explícita da arena: limpa timeline, esconde plates |
| `destroy()` | Dispose renderer/controles/atores — **não** usar em troca de zona |

`visibilitychange`: suspende via `setRenderSuspended`; ao voltar, `refresh()` (sem ticks no frontend; eventos stale filtrados).

**Ganho de GPU/FPS com aba oculta:** hipótese forte pelo código; **números before/after = pendente browser**.

### Não alterado sem prova

- Sombras / AA / cap DPR 1.75 (sem retune visual).
- Lazy-init do fallback 2D (`arena.js` ainda cria 2D primeiro) — candidato; sem timing browser.
- Eviction de `modelCache` / recompressão GLB.

---

## 5.6 — Backend (medido em Node)

| Cenário | Métrica | Valor (esta máquina) | Nota |
|---------|---------|----------------------|------|
| `processFarm` janela 2h | wall time | ~9–20 ms (suite) | CPU simulação; **não** FPS |
| `processFarm` 30s vs 2h | relativo | 30s ≪ 2h | Esperado |

Bench em `farm-perf-bench.test.ts` (save temp / personagem em memória).

---

## Matriz de cenários browser (checklist manual)

Preencher com DevTools. Não inventar %.

| # | Cenário | FPS/p95 | Mem JS | renderer.info | Network | Resultado |
|---|---------|---------|--------|---------------|---------|-----------|
| 1 | Lobby | — | — | — | — | Pendente |
| 2 | Criar/selecionar | — | — | — | — | Pendente |
| 3 | Entrada play | — | — | — | — | Pendente |
| 4 | Arena sem combate | — | — | — | — | Pendente |
| 5 | Combate contínuo | — | — | — | — | Pendente |
| 6 | Combate + skills | — | — | — | — | Pendente |
| 7 | Troca zonas ×20 | — | geo/tex estável? | — | — | Pendente |
| 8 | Capítulo | — | — | — | — | Pendente |
| 9 | Equipar/trocar | — | — | — | — | Pendente |
| 10 | Painéis open/close | — | — | — | — | Pendente |
| 11 | HUD Builder preview | — | — | — | — | Pendente |
| 12 | Desktop/Tablet/Mobile | — | — | — | — | Pendente |
| — | Aba hidden/visible ×20 | webglFrames hidden | — | — | — | Pendente |
| — | Probe on vs off | overhead | — | — | — | Pendente |

### Stress (após warm-up)

20× monstro / zona / equip-char / visibility / resize + combate longo — observar **patamar** de geo/tex/listeners (crescimento inicial de cache ≠ vazamento).

---

## Decisões / áreas sem mudança

- `POLL_MS` permanece 2000 (sem latência/DOM medidos no browser).
- Sem SSE/WebSocket.
- Sem presets Alto/Médio/Baixo (sem evidência de device fraco nesta sessão).
- Fórmulas, farm 2h, auth, HUD publish, economia: intactos.

---

## Critério de conclusão da Fase 5

| Item | Status |
|------|--------|
| Instrumentação + gate servidor | Feito |
| Sync /me vs mutações + testes | Feito |
| Suspend render ≠ setActive | Feito (benefício GPU pendente medir) |
| Benchmarks Node farm | Feito |
| Matriz browser before/after | **Pendente** — Fase 5 **não** 100% validada visualmente |
| 137 testes preservados (+ regressões) | 149 pass |

---

## Commits esperados (locais)

Ver `git log` após entrega — mensagens `perf(...)` / `docs(perf)`.
