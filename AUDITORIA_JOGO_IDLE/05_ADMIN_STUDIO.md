# 05 — Admin Studio

Fontes: `idle/admin-ui/src/` (React), build servido em `idle/public/jogo-idle/admin/`; APIs em `idle/src/server.ts` + `admin-service.ts`.

## 1. Como abrir

- Produção local: `http://localhost:8787/jogo-idle/admin/` (após `npm run admin:build`)
- Dev: `npm run admin:dev` (Vite ~5174, proxy API) — `idle/README.md`
- Redirect legado: `/jogo-idle/admin.html` → `/jogo-idle/admin/`

Auth standalone: `LOCAL_USER_EMAIL = "local@idle.local"`; `assertIdleAdmin` usa esse e-mail fixo — **sem cookie/sessão**. Qualquer cliente no host age como admin.

## 2. Abas (`ADMIN_TABS` em `admin-types.ts`)

| id | Label | Seção | Status UI |
|----|-------|-------|-----------|
| overview | Visão Geral | manage | Ativa |
| items | Itens | manage | Ativa |
| zones | Zonas | manage | Ativa (só overrides; criação Fase 3) |
| map | Mapa | manage | Ativa; publish versionado disabled (Fase 4) |
| hud | Editor de HUD | tools | Ativa; **Publicar** disabled (Fase 5) |
| monsters | Monstros | manage | Ativa; skills/drops mob Fase 2 |
| loot | Loot & Drops | manage | Ativa; loot tables por monstro Fase 2 |
| economy | Economia | manage | Ativa |
| season | Temporada | manage | Ativa (standalone: audit/stub end) |
| characters | Personagens | manage | Ativa |
| simulate | Simulador | manage | Ativa (não grava) |
| settings | Configurações | manage | Ativa |
| engagement | Engajamento | manage | Ativa (métricas; claim jogador 410) |
| backup | Backup / Restore | tools | **`disabled: true`** — Fase 4 |
| logs | Logs do Sistema | tools | Ativa (`admin/actions`) |
| admins | Usuários Admin | tools | Ativa (allowlist leitura; “Fase 1”) |

## 3. HUD Builder (draft / publish)

Arquivo: `admin-hud-builder.tsx`.

| Ação | UI | API |
|------|----|-----|
| Carregar | GET admin hud-layout | `adminGetHudLayout` |
| Salvar rascunho | Botão salvar | `PUT /admin/hud-layout/draft` |
| Restaurar default | Ativo | `POST .../restore` |
| Histórico | Via API | `GET .../history` |
| **Publicar** | `<StudioBtn disabled title="Publicação: Fase 5">` | `POST .../publish` **existe** no server |

Preview: iframe + `hud-builder-bridge.js` (Fase 2 — alças, drag). Tokens de intro editáveis no draft.

Runtime do jogo: só **published** (`GET /hud-layout`).

## 4. Catálogo — itens

`admin-items.tsx` — CRUD via `admin/catalog`, preview 3D, duplicate/reset/delete.  
Nota UI: “Loot tables por monstro: Fase 2” — pool global por tier no motor.

Status: **Implementado** para templates de item.

## 5. Monstros / loot / zonas / mapa

| Módulo | Implementado | Lacuna explícita no código |
|--------|--------------|----------------------------|
| Monstros | Overrides/catálogo por zona | Skills de mob; loot tables por monstro → Fase 2 (`admin-monsters.tsx`) |
| Loot | % zona / pool tier | Tabelas por criatura → Fase 2 (`admin-loot.tsx`, `content/facade.ts`) |
| Zonas | Overrides nível/drop/boss/acesso | “Criação de zonas novas: Fase 3” (`admin-zones.tsx`) |
| Mapa | Props 3D, bake biome, save zona | Publicar versionado Fase 4; snap Fase 3 (`admin-map.tsx`) |

## 6. Economia, temporada, personagens, simulador

- **Economia** (`admin-economy.tsx`): drop global, TTK, mercador, eventos engajamento (admin).
- **Temporada** (`admin-season.tsx`): UI de encerrar; `adminEndSeason` grava ação “stub standalone” (`admin-service.ts`).
- **Personagens**: grant / update / delete via admin APIs.
- **Simulador**: `POST /admin/simulate` — estimativas sem gravar save.

## 7. Engagement / admins / settings

- Claim jogador: **410** (`server.ts`).
- Métricas admin: `GET /admin/engagement-metrics`.
- Admins: tela read-only “Fase 1” (`admin-admins.tsx`).
- Settings: balance/runtime; texto menciona publish/histórico Fase 4 (`admin-settings.tsx`).

## 8. Resumo de fases citadas na UI admin

| Fase | Onde aparece |
|------|----------------|
| 1 | Zonas IDs fixos; admins allowlist |
| 2 | HUD componentes; loot/monstros tables |
| 3 | Criar zonas; snap mapa |
| 4 | Backup tab; publish mapa; versionamento overview |
| 5 | Botão Publicar HUD |
