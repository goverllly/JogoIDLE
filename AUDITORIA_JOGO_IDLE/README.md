# Pacote de auditoria — Jogo IDLE

Documentação técnica extraída do **código e configuração reais** do projeto, para auditoria externa independente (arquitetura, mecânicas, economia, HUD, admin, segurança, performance e UX).

**Fonte canônica:** branch `main` do repositório público [goverllly/JogoIDLE](https://github.com/goverllly/JogoIDLE). Preferir o GitHub a qualquer ZIP antigo.

| Campo | Valor |
|-------|--------|
| Data de geração (UTC) | 2026-10-28 |
| Commit de referência | `ffc9640` (rename + este pacote) |
| Escopo runtime | `idle/` (standalone Express em `:8787`) |
| Paths de código/cliente | `idle/lib/jogo-idle/`, `idle/public/jogo-idle/`, API `/api/jogo-idle/*` |
| Fora do escopo de runtime | Root Vite/Phaser “Véu de Cinzas” (`package.json` name `veu-de-cinzas`) — projeto **irmão** no monorepo |

## Nomenclatura (importante para revisores)

| Antes (roteiros / ZIPs antigos) | Na `main` atual |
|---------------------------------|-----------------|
| “Sinergia IDLE” / SinergIA | **Jogo IDLE** |
| `idle/lib/sinergia-idle/` | `idle/lib/jogo-idle/` |
| `idle/public/sinergia-idle/` | `idle/public/jogo-idle/` |
| `/api/sinergia-idle/*` | `/api/jogo-idle/*` |
| Pasta `AUDITORIA_SINERGIA_IDLE/` | Esta pasta: **`AUDITORIA_JOGO_IDLE/`** |

Não existe mais `sinergia-idle` nem `AUDITORIA_SINERGIA_IDLE` na `main`. Se um roteiro citar esses nomes, trate como alias histórico e use os paths `jogo-idle` desta tabela.

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
| 11 | [11_PLANO_CORRECAO.md](11_PLANO_CORRECAO.md) | Checklist estabilização |
| 12 | [12_RELATORIO_ESTABILIZACAO.md](12_RELATORIO_ESTABILIZACAO.md) | Relatório Fases 0–4 |
| 13 | [13_FASE2_AUTH.md](13_FASE2_AUTH.md) | Auth local/protected |
| 14 | [14_AUDITORIA_GAMEPLAY.md](14_AUDITORIA_GAMEPLAY.md) | Fase 4: integridade + economia (sem retune) |

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
