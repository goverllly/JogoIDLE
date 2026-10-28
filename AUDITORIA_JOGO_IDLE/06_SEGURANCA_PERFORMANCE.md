# 06 — Segurança e performance

Somente riscos e fatos com evidência no código. Sem claim de exploit comprovado em produção (standalone local).

## 1. Modelo de autenticação (standalone)

| Mecanismo | Evidência | Status |
|-----------|-----------|--------|
| User id fixo | `LOCAL_USER_ID = 1` em `local-service.ts`; `uid()` em `server.ts` | Sem login |
| Admin email fixo | `LOCAL_USER_EMAIL = "local@idle.local"`; `adminEmail()` | Sem cookie/session |
| Module gate | Removido — `idle/README.md` | Acesso livre local |
| Cookies / JWT | **Não encontrado** no path standalone | — |

**Risco comprovado pelo design:** qualquer cliente que alcance a porta (ex. `:8787`) pode chamar APIs de jogo e `/api/jogo-idle/admin/*` (grant, catalog, simulate, publish HUD). Adequado a single-player local; **não** pronto para exposição pública sem auth.

## 2. Superfície admin

Rotas admin incluem: `admin/config`, `grant`, `catalog`, `character`, `season/end`, `simulate`, `hud-layout/*`, `world-snapshot`, `actions`.  
Validação: payloads JSON (`express.json` limit **2mb**); lógica de negócio em `admin-service` / `local-service` — **Necessita validação** de sanitização exaustiva; sanitize HUD existe em `hud-layout.ts` (`sanitizeHudLayoutDocument`).

## 3. Stubs e desligamentos (reduzem superfície PvP)

| Rota | Resposta |
|------|----------|
| `POST .../engagement/claim` | **410** |
| `arena/*` (enter/leave/players/challenge/respond/forfeit) | **501** |
| `GET ranking` / `seasons` | Arrays vazios (stub) |

## 4. Persistência

- Arquivo `idle/data/save.json` via `store.ts`.
- Sem Prisma no runtime standalone (`service.ts` legado Prisma **não** é o path ativo).
- Risco: corrupção/concorrência de escrita JSON sob múltiplos writes — **Risco** (não medido aqui); backup tab UI disabled.

## 5. Performance — cliente

| Arquivo | ~Linhas | Nota |
|---------|---------|------|
| `theme-ref.css` | 4370 | CSS grande (molduras SVG inline) |
| `service.ts` (legado) | 2872 | Não no hot path standalone |
| `app.js` | 2269 | Poll + UI |
| `scene3d.js` | 2076 | Three + props |
| `admin-hud-builder.tsx` | 928 | Só admin |
| `JogoIdleAdmin.tsx` | 1170 | Shell admin |
| Three vendored | `vendor/three/` r170 | Bundle local |

**Polling:** `POLL_MS = 2000` em `app.js` — 1 GET estado / 2s por aba aberta.  
**CD ticker:** 100ms no DOM durante combate.  
**3D:** densidade de props por zona (`scene3d.js` ZONE_LOOK); packs Kenney/Quaternius lazy via `kaykit-props.js` — carga inicial **Necessita validação** (FPS/rede).

## 6. Performance — servidor

- Express 5 + `tsx`; farm processado sob demanda nas rotas (catch-up offline capped — ver `02_MECANICAS.md`).
- Sem worker queue / Redis encontrado no standalone.
- JSON body 2mb — protege um pouco DoS de payload; sem rate limit encontrado.

## 7. Segredos

- Esta auditoria **não** copia `.env` / tokens.
- Auth descrita só por mecanismo (user/email constantes).

## 8. Classificação rápida

| Item | Tipo |
|------|------|
| Admin aberto no standalone | Comprovado (código) |
| Arena/engagement desligados | Comprovado |
| Poll 2s sob carga multi-aba | Risco perf |
| CSS/JS grandes em play | Risco perf (tamanho) |
| Vazamento de save.json se host público | Risco (filesystem + API) |
| Bug de race no store | Necessita validação |
