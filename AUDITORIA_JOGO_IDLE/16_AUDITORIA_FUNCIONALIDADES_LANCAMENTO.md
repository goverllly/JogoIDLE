# 16 — Auditoria de funcionalidades e preparação para lançamento (Fase 6.1)

**Data:** 2026-10-28  
**HEAD:** `dddbc39` (`main`, commits locais preservados; sem push/pull/reset)  
**Runtime:** somente `idle/` (standalone). Véu de Cinzas não é referência.  
**Suite desta execução:** `cd idle && npm test` → **154 pass / 0 fail** (46 suites). `npm run admin:build` → **OK**.  
**Escopo:** auditoria. Nenhuma correção de código, gameplay, deploy ou PvP.

Legenda de status: **FUNCIONAL** · **PARCIAL** · **STUB** · **DESABILITADO** · **PLANEJADO** · **NECESSITA VALIDAÇÃO**.

Colunas da matriz: local = `IDLE_AUTH_MODE=local`; protected = sessão real + CSRF no servidor.

---

## Conclusão objetiva

### Obrigatório antes de convidar os primeiros jogadores (beta fechada)

1. **Cliente protected não envia CSRF.** O servidor **rejeita** mutações sem `X-CSRF-Token` (403 `CSRF_INVALID`). O jogo em `app.js` / lobby **não** anexa o token gravado no login. Em protected, farm/equip/criar via UI **não está pronto** — não é falha de “aceitar sem token”.
2. **Arena PvP está visível e clicável** e a API responde **501**. É funcionalidade **quebrada na UI**, não só “futuro escondido”.
3. **Restauração operacional completa não foi demonstrada** nesta auditoria (save + usuários + sessões + catálogo, serviço parado, ambiente isolado). Testes unitários restauram `save.json` em tmp; isso **não** classifica a beta como operacionalmente recuperável.
4. **Contas só por CLI** (`scripts/create-player.ts` / `create-admin.ts`). Aceitável para beta por convite **se** o procedimento estiver documentado para o operador. Não há reset de senha nem cadastro público (cadastro público **não** é obrigatório na beta).

### Pode ficar para depois da beta

- Arena PvP real, ranking HTTP legado, temporadas com reset, publicar mapa versionado, aba Backup no Admin, signup público, multi-instância, health/rate-limit amplo, Docker, métricas FPS/GPU da Fase 5, `frame-ancestors` (pendência de segurança da prévia — ver abaixo).
- Missões de engajamento (410) já estão desligadas na UI do play.

**Alpha local:** utilizável hoje pelo autor.  
**Beta fechada:** **não convidar ainda** até os itens 1–3 (CSRF no client, Arena não prometer duelo, drill de restore).  
**Lançamento público:** fora de escopo; falta onboarding, observabilidade e deploy.

---

## 1. CSRF (protected) — classificação

| Hipótese | Resultado |
|----------|-----------|
| Proteção funcionando e cliente não enviando token | **Confirmado** |
| Requisição autorizada corretamente (testes HTTP com header manual) | **Confirmado** em `gameplay-http.test.ts` / `auth.test.ts` |
| Requisição indevidamente aceita sem token | **Não** — `requireCsrf` em [`idle/src/auth/middleware.ts`](../idle/src/auth/middleware.ts) retorna 403 `CSRF_INVALID` |
| Problema não reproduzido | N/A para o gap de cliente |

Evidência:

- Servidor: `requireCsrf` ignora CSRF só em `mode === "local"`; em protected, métodos ≠ GET/HEAD/OPTIONS exigem `csrfHeaderMatches`.
- Cliente: [`login.html`](../idle/public/jogo-idle/login.html) grava `sessionStorage.jogo_idle_csrf`. [`app.js`](../idle/public/jogo-idle/app.js) `api()` envia `credentials: 'include'` e **não** lê esse storage nem define `X-CSRF-Token`.
- Teste: fluxos protected passam **quando o teste injeta o header**; CSRF inválido → 403 (suite 4.6).

**Endpoints afetados (todas as mutações sob `csrfGuard`):** farm start/stop, items, merchant, attributes, skills, pets, ascend, chapters, characters create/select/delete, admin POST, etc. GET `/api/me` não exige CSRF (farm ainda avança no servidor ao ler `/me`).

**Local:** CSRF desligado de propósito. Funcionar em local **não** implica pronto para beta.

**Não corrigido nesta etapa.**

---

## 2. Backup e restauração

| Dado | Arquivo | Notas |
|------|---------|--------|
| Personagens, progressão, catálogo, ações admin, HUD no save | `save.json` (`IDLE_DATA_DIR` ou `idle/data`) | `store.ts` + backups internos em `backups/` |
| Usuários | `auth-users.json` | `IDLE_AUTH_DIR` ou mesmo data dir ([`auth-io.ts`](../idle/src/auth/auth-io.ts)) |
| Sessões | `auth-sessions.json` | Idem; cópia quente pode revogar/rotar sessões depois |

Escrita de cada arquivo é atômica (tmp + rename). **Copiar o diretório com o servidor ligado** pode misturar `save.json` de um instante com `auth-users.json` de outro. Procedimento seguro: **parar o processo**, copiar o diretório de dados inteiro, restaurar com o processo parado, subir de novo.

Evidência de restore: testes de store em diretório temporário (`store.test.ts`) — **não** executados sobre o save pessoal, **não** um drill ops de users+sessions+save juntos. **Beta não marcada como operacionalmente pronta para recuperação.**

---

## 3. Stubs visíveis vs futuros

| Recurso | Visível / clicável | Backend | Classificação |
|---------|--------------------|---------|----------------|
| Botão **Arena** no play + modal “Duelos com aposta” | Sim ([`play.html`](../idle/public/jogo-idle/play.html), [`arena-ui.js`](../idle/public/jogo-idle/arena-ui.js)) | HTTP **501** | **Quebrado na UI** (promete o que não existe) |
| Galeria da Fama | Sim; chama `/fame/rankings` | Implementado, escopo local | **FUNCIONAL** local; protected **NECESSITA VALIDAÇÃO** de CSRF nas mutações de privacidade |
| `GET /ranking` e `GET /seasons` | Sem UI principal dedicada | Arrays vazios | **STUB** de API legada |
| Crônicas “Temporada” | Mostra `seasonKey` do capítulo | Não é ranking global | **PARCIAL** (rótulo), não PvP season |
| Admin **Publicar mapa** | Botão **disabled** | Save de cena aplica na hora | **Futuro** (versionamento), não quebrado se o operador usa Salvar |
| Admin **Backup** | Aba **disabled** | Store tem backup interno sem HTTP | **DESABILITADO** na UI |
| Admin encerrar temporada | UI existe | Stub de auditoria | **STUB** — não prometer reset |

Não implementar PvP/ranking/temporadas nesta fase.

---

## 4. Prévia 3D (HEAD `dddbc39`)

[`securityHeaders`](../idle/src/auth/middleware.ts): `preview.html` e `admin-studio/preview.html` **não** enviam `X-Frame-Options` (o `DENY` antigo bloqueava o iframe). Demais rotas: `SAMEORIGIN`.

**`Content-Security-Policy: frame-ancestors 'self'` não está no código.** Pendência de segurança da Fase 6 (clickjacking do preview por origem externa). **Middleware não alterado nesta auditoria.**

---

## 5. Operação (beta por convite)

| Item | Estado |
|------|--------|
| Health check | Ausente |
| Rate limit | Só login (5/min/IP) |
| HTTPS / proxy | Exigido pelo boot protected fora de loopback; sem compose/Docker no repo |
| Cookies / sessões | Implementados; logout revoga a sessão atual; sem API “revogar todas” |
| Persistência após restart | JSON em disco (save + auth) |
| Logs | stdout do processo; ações admin no save |
| Contas | CLI; sem reset de senha |
| Rollback | Parar processo, restaurar cópia do diretório, subir de novo |
| Instâncias | **Uma** — `store.ts` declara multi-processo não suportado |

---

## 6. Matriz (resumo)

| Funcionalidade | Status | Local | Protected (UI) | UI | API | Persiste | Testes | Beta? | Bloqueador |
|----------------|--------|-------|----------------|----|-----|----------|--------|-------|------------|
| Lobby / criar / selecionar / excluir | FUNCIONAL | Sim | **Não** (CSRF) | Sim | Sim | Sim | HTTP com header | Não | CSRF client |
| Login / sessão | PARCIAL | N/A (login 400) | API sim | login.html | Sim | auth JSON | auth.test | Convite CLI | Sem reset senha |
| 4 classes, PvE, farm on/off, inv, equip, refine, poções, skills, drops, níveis, capítulos, ascensão, pets | FUNCIONAL | Sim | UI não | Sim | Sim | Sim | combat/farm/inv/prog | Não até CSRF | CSRF client |
| Offline 2h + relatório | FUNCIONAL | Sim | UI não | Sim | via `/me` | Sim | farm-offline | Não até CSRF | — |
| Aparência pós-criação | PARCIAL | 403 | 403 | criar | bloqueada | nascimento | appearance-lock | Sim como “só na criação” | — |
| Galeria / jornada PvE | FUNCIONAL local | Sim | mutações CSRF | Sim | fame/journey | Sim | journey tests | Parcial | CSRF em PATCH |
| Arena PvP | DESABILITADO | 501 | 501 | **Clicável** | 501 | — | — | **Não** (esconder) | UI mente |
| Ranking `/ranking`, seasons HTTP | STUB | vazio | vazio | não é o fluxo fama | stub | — | — | Não prometer | — |
| Engajamento missões | DESABILITADO | 410 | 410 | off no play | 410 | — | — | OK desligado | — |
| HUD publicar | FUNCIONAL | Sim | admin CSRF | Sim | draft/publish | Sim | hud-api | Admin | — |
| Admin catálogo/economia/zonas/personagens | FUNCIONAL | Sim | admin | Sim | config | save.json | parcial | Operador | — |
| Publicar mapa versionado | DESABILITADO | botão off | — | disabled | save imediato existe | Sim | — | Opcional | — |
| Backup admin UI | DESABILITADO | aba off | — | disabled | sem HTTP | backups internos | store tests | Drill manual | Restore ops |
| Preview 3D | FUNCIONAL same-origin | Sim | iframe | lobby/criar | estático | — | — | Sim | Falta `frame-ancestors` |
| FPS/GPU prolongado | NECESSITA VALIDAÇÃO | — | — | — | — | — | — | Não bloqueia alpha | Fase 5 checklist |

---

## 7. Níveis

| Nível | Pronto | Bloqueia | Opcional / desligar |
|-------|--------|----------|---------------------|
| **ALPHA LOCAL** | Loop PvE em `local` | — | Arena pode confundir (501) |
| **BETA FECHADA** | Auth protected + CLI + isolamento testado | CSRF no client; Arena clicável; restore coordenado não ensaiado | PvP, seasons, signup, mapa publish |
| **PÚBLICO** | — | Tudo acima + health, abuse, deploy, recuperação de senha, observabilidade | — |

---

## 8. Prioridade (sem implementar)

| ID | Pri | Esforço | Ação |
|----|-----|---------|------|
| CSRF no `api()` do cliente | P0 | Pequeno | Enviar `X-CSRF-Token` do sessionStorage |
| Arena: esconder ou mensagem 501 clara | P0 | Pequeno | Não implementar duelo |
| Drill restore (processo parado, dir isolado) | P0 | Pequeno | Procedimento, sem tocar save pessoal |
| `frame-ancestors 'self'` no preview | P1 | Pequeno | Segurança iframe |
| Docs de convite (create-player) | P1 | Pequeno | Operador |
| Health + rate limit geral | P2 | Médio | Depois da beta |
| Ranking/temporadas/PvP/Docker | P3 | Grande | Pós-beta |

---

## 9. Roadmap (não executado)

- **6.2** — CSRF client + Arena não prometer PvP.
- **6.3** — Procedimento de convite e mensagens de auth.
- **6.4** — Backup parado + health/proxy (ainda 1 instância).
- **6.5** — Aceitação manual protected (login → criar → farm → refresh) + checklist GPU.
- **6.6** — Go/no-go da beta.

**Não iniciado:** 6.2+.
