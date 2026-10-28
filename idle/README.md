# Jogo IDLE (standalone)

Cópia jogável do Jogo IDLE **sem** gate de módulo externo e **sem** missões de engajamento (plantão, FlowTime, check-in).

## Como rodar

```bash
cd idle
npm install
npm run admin:build
npm run dev          # IDLE_AUTH_MODE=local + bind 127.0.0.1
```

Abra http://localhost:8787 — lobby para criar personagem e entrar no jogo.

- Admin Studio: http://localhost:8787/jogo-idle/admin/ (livre em `local`; login ADMIN em `protected`)
- Login page (protected): `/jogo-idle/login.html`
- Dev hot-reload do admin: `npm run admin:dev` (porta 5174, proxy da API)

Progresso em `idle/data/save.json`. Auth (protected): `idle/data/auth-users.json` + `auth-sessions.json` (gitignored).

### Modo protected (resumo)

```bash
export IDLE_AUTH_MODE=protected
export IDLE_SESSION_SECRET='pelo-menos-32-caracteres-aleatorios'
export IDLE_ALLOW_HTTP_LOCAL=1   # só loopback/teste; produção: HTTPS + IDLE_COOKIE_SECURE=1
IDLE_ADMIN_EMAIL=... IDLE_ADMIN_PASSWORD=... npm run auth:create-admin
IDLE_PLAYER_EMAIL=... IDLE_PLAYER_PASSWORD=... npm run auth:create-player
npm start
```

O identificador de login é o **e-mail** criado pela CLI (senha com no mínimo 10 caracteres). Não há cadastro público, código de convite nem redefinição de senha. Entregue e-mail e senha ao convidado por um canal seguro, fora da URL. A conta `PLAYER` não abre o Admin Studio.

Revogar o acesso ainda não tem comando de operador. `setUserDisabled` existe no código, mas não edite `auth-users.json` à mão. Uma CLI de desativação fica para uma etapa futura.

O fundo do portal troca sem mexer no formulário. Em `public/jogo-idle/login.css`:

```css
body.login-page {
  --login-background-image: url("/jogo-idle/assets/login/castelo-lua.webp");
  --login-background-position: 22% center;
  --login-background-position-mobile: 32% center;
}
```

Se a imagem não carregar, o gradiente navy da cena continua no lugar. O modo `local` (`npm run dev`) não usa esta tela: `/api/jogo-idle/auth/me` já responde autenticado e o portal devolve ao lobby.

Detalhes: `AUDITORIA_JOGO_IDLE/13_FASE2_AUTH.md`.

## O que foi removido / desligado

- `ModuleAccessGate` / `withModuleAuth` externos (substituídos por `IDLE_AUTH_MODE`)
- Missões de engajamento (`engagement/claim` responde 410)
- Bônus de plantão e FlowTime do TicTac
- Dependência do Prisma/auth externo

## O que permanece

- Cliente completo (`public/jogo-idle`)
- Admin Studio (catálogo, zonas, mapa, simulação, liveops)
- Motor de farm, inventário, mercador, skills, zonas
- Assets 3D e HUD originais
