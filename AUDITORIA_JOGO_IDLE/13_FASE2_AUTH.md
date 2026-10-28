# 13 — Fase 2: autenticação e autorização (standalone)

Escopo: `IDLE_AUTH_MODE=local|protected`, sessões server-side, Admin Studio gated, isolamento de `userId`, CSRF, boot fail-closed.  
**Não** inclui: cadastro público, OAuth, multi-instância auth, mudança de gameplay/HUD/Three.js.

## Modos

| Modo | Bind padrão | Identidade | Uso |
|------|-------------|------------|-----|
| `local` | `127.0.0.1` | `userId=1` ADMIN (`local@idle.local`) sem cookie | `npm run dev` |
| `protected` | exige `IDLE_SESSION_SECRET` (≥32) | sessão HttpOnly + Argon2id | implantação / testes públicos |

`userId=1` permanece **reservado ao legado local**. Contas CLI começam em `≥2` e nunca herdam personagens do save legado automaticamente.

## Boot fail-closed (protected)

- Sem secret → exit 1.
- Bind non-loopback → exige `IDLE_COOKIE_SECURE=1` e (`IDLE_TRUST_PROXY=1` + `IDLE_TRUSTED_PROXIES` **ou** `IDLE_ASSUME_DIRECT_TLS=1`).
- `IDLE_TRUST_PROXY=1` sozinho (sem lista) → recusado.
- Loopback HTTP só com `IDLE_ALLOW_HTTP_LOCAL=1`.
- Headers `X-Forwarded-*` do cliente são descartados quando não há proxies confiáveis configurados.
- Bind em `127.0.0.1` **não** prova isolamento público (túnel/proxy pode expor).

## Sessões

- Cookie `jogo_idle_sid` HttpOnly; disco `auth-sessions.json` guarda **SHA-256(token)** apenas.
- CSRF synchronizer: token na sessão; cliente envia `X-CSRF-Token` (cookie legível auxiliar).
- Rotação no login; revogação no logout; expiração no servidor; role lida do user store a cada request (não cached na sessão).
- Conta `disabled` → sessão inválida.
- Persistência: escrita atômica + `chmod 600`, mesma família da Fase 1. **Processo único** — não é backend distribuído.
- Arquivos: `idle/data/auth-users.json`, `idle/data/auth-sessions.json` (gitignored, fora de `public/`).

## Admin Studio

Gate `requireAdminPage` **antes** de qualquer `express.static` que possa servir `/jogo-idle/admin*`, incluindo `assets/*.js|css` do Vite e fallback SPA.

## Contas (CLI)

```bash
IDLE_ADMIN_EMAIL=... IDLE_ADMIN_PASSWORD=... npm run auth:create-admin
IDLE_PLAYER_EMAIL=... IDLE_PLAYER_PASSWORD=... npm run auth:create-player
```

Via `tsx` (ESM/TS). Sem contas default; senhas nunca logadas. Role `PLAYER` no create-player; promoção não aceita payload de cliente.

## admin-service

`assertIdleAdmin()` usa AsyncLocalStorage do principal autenticado no modo protected (não allowlist hardcoded). Local legado continua via allowlist/`local@idle.local` apenas fora de protected.

## Evidência de testes (pós Fase 2)

| Comando | Resultado |
|---------|-----------|
| `cd idle && npm test` | **57 pass / 0 fail** (44 Fase 1 + auth HTTP/boot) |
| `cd idle && npm run admin:build` | OK |

Cobertura auth inclui: assets admin sem auth, PLAYER vs ADMIN, isolamento 2 jogadores + legado userId=1, CSRF, boot inseguro, proxy/headers, sessão revogada/restart, store auth corrompido, Host local.

## Critério de conclusão — status

- [x] Local sem login obrigatório  
- [x] Protected exige login  
- [x] Auth individual + Admin Studio/API protegidos  
- [x] Isolamento de personagens  
- [x] Sessões revogáveis + CSRF  
- [x] Sem colisão com legado `userId=1`  
- [x] Testes + admin:build  
- [x] Docs atualizados  

**Ainda fora / dependente de implantação:** TLS real na borda, revisão final de superfície de API, testes de penetração em ambiente público.
