# 16 — Auditoria de funcionalidades e preparação para lançamento

**Auditoria 6.1:** 2026-10-28, HEAD `dddbc39`, suite **154 pass / 0 fail**. Sem correção de código.  
**Correção 6.2:** 2026-10-28. HEAD de código `384060d` (`main`, sem push/pull/reset/rebase/deploy).  
**Commits 6.2:** `73a45e0` CSRF no cliente · `e452eac` duelo oculto · `2f7cca2` restore isolado · `384060d` embed da prévia. O registro desta seção é o commit de documentação seguinte.  
**Suite 6.2:** no código desses commits, **161 pass / 0 fail** (154 + 4 CSRF + 1 arena + 1 prévia + 1 restore). Nesta entrega o working tree também tinha `idle/src/__tests__/login-ui.test.ts` fora do Git (6 testes do portal); `cd idle && npm test` reportou **167 pass / 0 fail**, 54 suites, `duration_ms` 2545. `npm run admin:build` → **OK** (124 módulos, `admin/assets/index-DZM_7zpl.js`).  
**Runtime:** somente `idle/`. Véu de Cinzas não é referência. Fórmulas, economia, farm, HUD Builder, assets e Three.js não foram alterados. Fase 6.3 não foi iniciada.

As seções 1–9 foram atualizadas com o resultado da 6.2. A suite de 154 é o baseline da auditoria, antes dessas correções.

Legenda de status: **FUNCIONAL** · **PARCIAL** · **STUB** · **DESABILITADO** · **PLANEJADO** · **NECESSITA VALIDAÇÃO**.

Colunas da matriz: local = `IDLE_AUTH_MODE=local`; protected = sessão real + CSRF no servidor.

---

## Conclusão objetiva (depois da 6.2)

Os três bloqueadores da 6.1 e a política de embed da prévia foram tratados no código `384060d`. O jogo em modo `protected` completa o fluxo de sessão na UI, e um segundo processo recupera conta, personagem, inventário, catálogo e papéis a partir de uma cópia feita com o servidor parado.

**Ainda impede convidar jogadores:**

- HTTPS / proxy de produção e health check continuam ausentes.
- Não há rastreamento de erros nem rate limit além do login.
- Contas só por CLI. Sem reset de senha e sem cadastro público.
- Uma instância só. `IDLE_SESSION_SECRET` não assina o cookie: restaurar `auth-sessions.json` mantém a sessão antiga válida mesmo com outro segredo.
- Aceitação de convidado, mensagens de auth e o go/no-go ficam para as fases seguintes. A 6.3 não começou nesta entrega.

**Alpha local:** utilizável.  
**Beta fechada:** bloqueadores de CSRF, duelo clicável e restore **não** são mais o impedimento. O convite continua **não liberado** pelos itens operacionais acima.  
**Lançamento público:** fora de escopo.

### O que a 6.1 tinha marcado como obrigatório

1. Cliente protected não enviava CSRF. **Corrigido** em `73a45e0`. O servidor continua rejeitando mutação sem token válido.
2. Arena PvP estava clicável com API 501. **A entrada de duelo foi ocultada** em `e452eac`. A API continua 501. A caça `#arena` permanece.
3. Restore coordenado não tinha sido demonstrado. **Demonstrado** em `2f7cca2`, só com dados temporários.
4. Contas só por CLI. **Inalterado.** Aceitável para convite quando o operador tiver o procedimento; não há reset de senha.

---

## 1. CSRF (protected)

**Estado 6.2:** o servidor não mudou. `requireCsrf` em [`idle/src/auth/middleware.ts`](../idle/src/auth/middleware.ts) continua devolvendo 403 `CSRF_INVALID` quando o header não casa com a sessão. GET/HEAD/OPTIONS e o login público não exigem o header. Modo `local` continua sem CSRF.

O cliente passou a usar um único helper, [`idle/public/jogo-idle/http.js`](../idle/public/jogo-idle/http.js), importado pelos scripts ES do jogo e pelo Admin (`admin-ui/src/App.tsx` → o mesmo módulo; o bundle gerado contém `jogo_idle_csrf` e `X-CSRF-Token`).

- Lê só o cookie `jogo_idle_csrf`. Não usa `jogo_idle_sid` e não grava o token em `localStorage` nem `sessionStorage`.
- `new Headers(init.headers)` preserva headers já enviados pela chamada.
- `X-CSRF-Token` só em POST/PUT/PATCH/DELETE same-origin. Caminho relativo é same-origin. URL `//...` e outra origem não recebem o token.
- Uma mutação, um `fetch`. 401 `AUTH_REQUIRED` vai uma vez a `/jogo-idle/login.html?next=` saneado (só caminho `/jogo-idle/`, nunca a própria login, nunca `//`). 403 não navega e não repete o POST.

Teste: [`client-csrf.test.ts`](../idle/src/__tests__/client-csrf.test.ts) — helper; ciclo login/lobby; mutação protected sem token, com token de outra sessão, token inválido e token do cookie; fonte única sem segundo POST.

**UI protected (dados temporários, não é o save pessoal):** em `127.0.0.1:8795`, contas `beta-player@example.test` e `beta-admin@example.test`. Login → lobby → criar BetaHero (Guerreiro) → jogar. Admin concedeu 10 pontos, um Refinador e a Espada Reta de Ferro. De volta ao jogador: +1 FOR (toast `+1 STR`, linha 12→16 passou a 13→17), equipar a espada na mão principal, refinar até `Espada Reta de Ferro +1` (refinador saiu da mochila), iniciar caça (`Boss em 8 abates`) e parar (`Parado`). Logout pelo `#logout-btn` caiu em `login.html`, sem voltar ao lobby. Logout do admin via POST `/api/jogo-idle/auth/logout` respondeu 200 e a página seguinte foi o login. O canvas do play não apareceu nessa consulta; a cena 3D do play não foi dada como verificada.

---

## 2. Backup e restauração

| Dado | Arquivo | Notas |
|------|---------|--------|
| Personagens, progressão, catálogo, ações admin, HUD no save | `save.json` (`IDLE_DATA_DIR` ou `idle/data`) | `store.ts` + backups internos em `backups/` |
| Usuários | `auth-users.json` | `IDLE_AUTH_DIR` ou mesmo data dir ([`auth-io.ts`](../idle/src/auth/auth-io.ts)) |
| Sessões | `auth-sessions.json` | Idem; cópia quente pode revogar/rotar sessões depois |

Escrita de cada arquivo é atômica (tmp + rename). **Copiar o diretório com o servidor ligado** pode misturar `save.json` de um instante com `auth-users.json` de outro. Procedimento seguro: **parar o processo**, copiar o diretório de dados inteiro, restaurar com o processo parado, subir de novo.

**Ensaio 6.2** ([`restore-drill.test.ts`](../idle/src/__tests__/restore-drill.test.ts)), só em `os.tmpdir()` (`jogo-idle-restore-src` / `jogo-idle-restore-dst`). Contas `restore-player@example.test`, `restore-admin@example.test`, `restore-other@example.test`. Segredos fictícios `SECRET_A` e `SECRET_B`. O teste afirma que o JSON de usuários não contém `pedro`, `gmail` nem `hotmail`. Nada disso entrou no Git.

Sequência que passou: o processo pai cria RestoreHero, +1 FOR, equipa a arma inicial (mão principal ou secundária), vende a poção, refina, inicia e para o farm, e o admin grava `refinerPrice` 424242. O pai fecha. `cpSync` copia o diretório. O preço em memória do pai é forçado a 1 com `persist: false`. Um filho `node --import tsx src/server.ts` sobe com `IDLE_DATA_DIR` no destino, `IDLE_SESSION_SECRET=SECRET_B` e as variáveis de caminho do pai removidas.

O filho devolveu o personagem (id, nome, FOR, ouro, nível, uid da arma, `refineLevel` 1, poção ausente), `merchant.refinerPrice === 424242`, login novo com a senha restaurada, outro jogador com 0 personagens e 403 `ADMIN_REQUIRED`, e o admin com `GET /api/jogo-idle/admin/actions` 200. O cookie antigo ainda autenticou: o segredo não assina a sessão; o disco guarda só o SHA-256 do token. Sem `auth-sessions.json`, esse cookie cairia e o login por senha seguiria válido via `auth-users.json`. O filho recebeu SIGTERM. O `afterEach` devolve o preço do refinador em memória, sem gravar em `idle/data`.

JSON bem formado sozinho não foi aceito como prova. A prova é a segunda instância lendo o disco.

---

## 3. Stubs visíveis vs futuros

| Recurso | Visível / clicável | Backend | Classificação |
|---------|--------------------|---------|----------------|
| Botões de duelo `#arena-combat-btn` e `#arena-btn` | Ocultos, `disabled`, `aria-disabled` ([`play.html`](../idle/public/jogo-idle/play.html)) | HTTP **501** | **DESABILITADO** na UI. `arena-ui.js` permanece no disco e não é montado (`arenaUi = null`). Não há parâmetro `duel`/`pvp` na URL; nenhum interceptor genérico de “arena”. `#arena` é o cenário de caça e continua no layout. CSS no fim de `theme-ref.css` força `display: none !important` só nesses dois botões, porque a regra do palco usa `inline-flex !important`. |
| Galeria da Fama | Sim; chama `/fame/rankings` | Implementado, escopo local | **FUNCIONAL**. Mutações usam o helper de `http.js` |
| `GET /ranking` e `GET /seasons` | Sem UI principal dedicada | Arrays vazios | **STUB** de API legada |
| Crônicas “Temporada” | Mostra `seasonKey` do capítulo | Não é ranking global | **PARCIAL** (rótulo), não PvP season |
| Admin **Publicar mapa** | Botão **disabled** | Save de cena aplica na hora | **Futuro** (versionamento), não quebrado se o operador usa Salvar |
| Admin **Backup** | Aba **disabled** | Store tem backup interno sem HTTP | **DESABILITADO** na UI |
| Admin encerrar temporada | UI existe | Stub de auditoria | **STUB** — não prometer reset |

Não implementar PvP/ranking/temporadas nesta fase.

---

## 4. Prévia 3D

[`securityHeaders`](../idle/src/auth/middleware.ts), commit `384060d`. Só `/jogo-idle/preview.html` e `/jogo-idle/admin-studio/preview.html` recebem `Content-Security-Policy: frame-ancestors 'self'` e `X-Frame-Options: SAMEORIGIN`. As outras rotas continuam com `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: no-referrer`, sem CSP. A autenticação administrativa não mudou. O iframe não foi trocado por canvas inline. Origem externa não foi liberada.

Teste HTTP: [`preview-headers.test.ts`](../idle/src/__tests__/preview-headers.test.ts) (modo local, save temporário) — as duas prévias 200 com esses dois headers; `lobby.html` sem CSP e com `SAMEORIGIN`.

Navegador (mesmo servidor temporário da aceitação): o iframe do lobby carregou `preview.html` com canvas; o iframe do Admin Studio carregou `admin-studio/preview.html` com canvas 560×560. O webview do Cursor mostrou o mesmo comportamento same-origin; não houve divergência a registrar e nenhuma origem externa foi aberta. Órbita, zoom e `postMessage` não foram exercitados além do carregamento do iframe.

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
| Lobby / criar / selecionar / excluir | FUNCIONAL | Sim | UI sim (aceitação) | Sim | Sim | Sim | HTTP + browser | Convite ainda bloqueado por ops | — |
| Login / sessão | PARCIAL | N/A (login 400) | API e UI sim | login.html | Sim | auth JSON | auth + client-csrf | Convite CLI | Sem reset senha |
| 4 classes, PvE, farm on/off, inv, equip, refine, poções, skills, drops, níveis, capítulos, ascensão, pets | FUNCIONAL | Sim | UI: attrs, equip, refine, farm | Sim | Sim | Sim | combat/farm/inv/prog + browser | Loop protected ok | Canvas do play não confirmado |
| Offline 2h + relatório | FUNCIONAL | Sim | Não refeito na UI desta fase | Sim | via `/me` | Sim | farm-offline | — | — |
| Aparência pós-criação | PARCIAL | 403 | 403 | criar | bloqueada | nascimento | appearance-lock | Sim como “só na criação” | — |
| Galeria / jornada PvE | FUNCIONAL | Sim | helper compartilhado | Sim | fame/journey | Sim | journey + client-csrf | Parcial | — |
| Arena PvP (duelo) | DESABILITADO | 501 | 501 | Botões ocultos; `#arena` é caça | 501 | — | arena-ui-source | Não prometer | API 501 de propósito |
| Caça PvE `#arena` | FUNCIONAL | Sim | Sim | Cenário visível | farm | Sim | farm + browser | Sim | — |
| Ranking `/ranking`, seasons HTTP | STUB | vazio | vazio | não é o fluxo fama | stub | — | — | Não prometer | — |
| Engajamento missões | DESABILITADO | 410 | 410 | off no play | 410 | — | — | OK desligado | — |
| HUD publicar | FUNCIONAL | Sim | admin CSRF | Sim | draft/publish | Sim | hud-api | Admin | — |
| Admin catálogo/economia/zonas/personagens | FUNCIONAL | Sim | admin | Sim | config | save.json | parcial | Operador | — |
| Publicar mapa versionado | DESABILITADO | botão off | — | disabled | save imediato existe | Sim | — | Opcional | — |
| Backup admin UI | DESABILITADO | aba off | — | disabled | sem HTTP | backups internos | store + restore-drill | Drill feito fora da UI | Sem UI admin |
| Preview 3D | FUNCIONAL same-origin | Sim | iframe carregou | lobby/criar/studio | estático | — | preview-headers + browser | Sim | Sem origem externa |
| FPS/GPU prolongado | NECESSITA VALIDAÇÃO | — | — | — | — | — | — | Não bloqueia alpha | Fase 5 checklist |

---

## 7. Níveis

| Nível | Pronto | Bloqueia | Opcional / desligar |
|-------|--------|----------|---------------------|
| **ALPHA LOCAL** | Loop PvE em `local` | — | Duelo oculto; caça `#arena` segue |
| **BETA FECHADA** | Auth protected, CSRF no cliente, duelo oculto, restore ensaiado | HTTPS, health, observabilidade, procedimento de convite, uma instância, segredo não invalida sessão antiga | PvP real, seasons, signup, mapa publish |
| **PÚBLICO** | — | Tudo acima + health, abuse, deploy, recuperação de senha, observabilidade | — |

---

## 8. Prioridade (sem implementar)

| ID | Pri | Esforço | Ação |
|----|-----|---------|------|
| CSRF no cliente | P0 | Feito `73a45e0` | Cookie `jogo_idle_csrf` apenas; sem sessionStorage |
| Arena: esconder o duelo | P0 | Feito `e452eac` | API 501; `#arena` intacto |
| Drill restore (processo parado, dir isolado) | P0 | Feito `2f7cca2` | Segunda instância; save pessoal intocado |
| `frame-ancestors 'self'` no preview | P1 | Feito `384060d` | Também `X-Frame-Options: SAMEORIGIN` só nas duas páginas |
| Docs de convite (create-player) | P1 | Feito no portal | `README` + login; sem troca de senha e sem CLI de revogação |
| Health + rate limit geral | P2 | Médio | Depois da beta |
| Ranking/temporadas/PvP/Docker | P3 | Grande | Pós-beta |

---

## 9. Roadmap

- **6.2** — entregue: CSRF no cliente, duelo oculto, restore isolado, embed da prévia, aceitação protected no navegador (atributo, equipar, refinar, farm, logout, uma ação admin).
- **6.3** — portal de login dos convidados e mensagens de auth. Sem redefinição de senha e sem CLI para revogar.
- **6.4** — health/proxy (ainda 1 instância). O restore parado da 6.2 não substitui health.
- **6.5** — o fluxo manual protected foi feito na 6.2; checklist GPU continua aberto. O canvas do play não foi confirmado.
- **6.6** — Go/no-go da beta. Ainda não.

**6.2 concluída no código.** O portal cobre a entrada da 6.3; troca de senha e revogação por CLI continuam fora. 6.4–6.6 seguem em aberto.

---

## 10. Adendo — portal de login (2026-10-28)

A entrada dos convidados é [`idle/public/jogo-idle/login.html`](../idle/public/jogo-idle/login.html), com estilo próprio em `login.css`. O POST continua sendo `/api/jogo-idle/auth/login` com `{ email, password }`. Cookies, CSRF e modo `local` não mudaram.

- Fundo: `--login-background-image`, `--login-background-position` e `--login-background-position-mobile`. O gradiente navy fica por baixo da imagem.
- Convite: `npm run auth:create-player`. Sem cadastro público e sem redefinição de senha.
- Revogação: ainda sem CLI. `setUserDisabled` existe; não editar `auth-users.json` à mão.
