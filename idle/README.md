# Jogo IDLE (standalone)

Cópia jogável do Jogo IDLE **sem** gate de módulo externo e **sem** missões de engajamento (plantão, FlowTime, check-in).

## Como rodar

```bash
cd idle
npm install
npm run admin:build
npm run dev
```

Abra http://localhost:8787 — lobby para criar personagem e entrar no jogo.

- Admin Studio: http://localhost:8787/jogo-idle/admin/
- Dev hot-reload do admin: `npm run admin:dev` (porta 5174, proxy da API)

Progresso em `idle/data/save.json`.

## O que foi removido / desligado

- `ModuleAccessGate` / `withModuleAuth` (acesso livre local; admin sempre liberado)
- Missões de engajamento (`engagement/claim` responde 410)
- Bônus de plantão e FlowTime do TicTac
- Dependência do Prisma/auth externo

## O que permanece

- Cliente completo (`public/jogo-idle`)
- Admin Studio (catálogo, zonas, mapa, simulação, liveops)
- Motor de farm, inventário, mercador, skills, zonas
- Assets 3D e HUD originais
