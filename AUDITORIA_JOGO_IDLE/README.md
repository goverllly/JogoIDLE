# Pacote de auditoria — Jogo IDLE

Documentação técnica extraída do **código e configuração reais** do projeto, para auditoria externa independente (arquitetura, mecânicas, economia, HUD, admin, segurança, performance e UX).

| Campo | Valor |
|-------|--------|
| Data de geração (UTC) | 2026-10-28 |
| Commit aproximado | `76c580f` |
| Escopo runtime | `idle/` (standalone Express em `:8787`) |
| Fora do escopo de runtime | Root Vite/Phaser “Véu de Cinzas” (`package.json` name `veu-de-cinzas`) — projeto **irmão** no monorepo |

## Como navegar

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [01_ARQUITETURA.md](01_ARQUITETURA.md) | Pastas, stack, API, persistência, Three.js, deploy |
| 02 | [02_MECANICAS.md](02_MECANICAS.md) | Combate, stats, classes, skills, capítulos, offline, duelo |
| 03 | [03_ECONOMIA_BALANCEAMENTO.md](03_ECONOMIA_BALANCEAMENTO.md) | Ouro, drops, XP, exemplos numéricos |
| 04 | [04_HUD_UX.md](04_HUD_UX.md) | HUD play, molduras, intro, responsividade |
| 05 | [05_ADMIN_STUDIO.md](05_ADMIN_STUDIO.md) | Abas admin, HUD Builder, catálogo, fases |
| 06 | [06_SEGURANCA_PERFORMANCE.md](06_SEGURANCA_PERFORMANCE.md) | Auth, riscos, arquivos grandes, polling |
| 07 | [07_FUNCIONALIDADES.md](07_FUNCIONALIDADES.md) | Matriz funcionalidade × status |
| 08 | [08_PROBLEMAS_CONHECIDOS.md](08_PROBLEMAS_CONHECIDOS.md) | Comprovado / risco / precisa teste |
| 09 | [09_ROADMAP_ATUAL.md](09_ROADMAP_ATUAL.md) | Roadmaps já documentados no repo |
| 10 | [10_GUIA_EXECUCAO_TESTES.md](10_GUIA_EXECUCAO_TESTES.md) | Como subir, smoke, `npm test` |

## Legendas de status

Usadas na matriz e nos relatórios:

- **Implementado** — comportamento presente e alcançável no standalone.
- **Parcialmente implementado** — UI/API parcial, stub, ou publish desabilitado na UI.
- **Planejado** — só em docs/roadmap, sem motor vivo correspondente.
- **Não encontrado** — buscado no código e ausente.
- **Necessita validação** — indício no código; falta prova em runtime/teste.

## Regras desta documentação

- Não inventa fórmulas, features ou deploy inexistentes.
- Cita caminhos e símbolos (`arquivo` + função/constante).
- Não contém senhas, tokens ou conteúdo de `.env`.
- **Não altera** o funcionamento do jogo; apenas adiciona esta pasta.

## Docs internos úteis (revalidar sempre)

- `idle/README.md` — como rodar o standalone.
- `docs/capitulos/` — visão capítulos / persistência / testes.
- `docs/balanceamento/` — auditorias e propostas de balanço (podem divergir do código atual).
- `docs/HUD_BUILDER.md`, `docs/MOLDURAS_COMBATE_AVALIACAO.md`.
- `idle/public/jogo-idle/assets/ASSETS-ROADMAP.md`.
