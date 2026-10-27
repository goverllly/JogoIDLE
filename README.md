# JogoIDLE

Dois fronts no mesmo repositório:

1. **Sinergia IDLE (standalone)** em `idle/` — o jogo completo do TicTac, **sem** gate de acesso SinergIA e **sem** missões de engajamento (plantão/FlowTime/check-in).
2. **Véu de Cinzas** (raiz) — arena provisória Phaser + React (Ecos do Ocaso / docs).

## Sinergia IDLE

```bash
cd idle && npm install && npm run dev
```

Abre http://localhost:8787 — lobby → criar personagem → jogar. Save em `idle/data/save.json`.

Na raiz: `npm run dev:idle`.

---

# Véu de Cinzas

Arena provisória de um RPG idle 2D, de fantasia sombria. Esta etapa entrega a fundação técnica e um confronto automático. Não é o jogo completo.

O título visível é provisório e está em `src/conteudo/textos.ts`. O nome da pasta do projeto não é usado no código.

## Como executar

Requer Node.js 24.

```bash
npm install
npm run dev
```

O comando abre a arena em `http://localhost:5173`.

```bash
npm test
npm run lint
npm run build
```

`npm test` cobre cálculo de dano, recarga, morte, reinício de onda e a gravação da onda vencida. `npm run build` gera a versão de produção em `dist/`.

## O que esta etapa faz

Dois heróis e dois monstros entram em uma cripta. Cada um ataca sozinho quando a recarga acaba. O dano considera ataque, defesa e crítico. Quem chega a zero de vida tomba e deixa de agir. Se os monstros tombam, a onda avança depois de uma pausa. Se os heróis tombam, a mesma onda recomeça. Nos dois casos a vida volta ao máximo.

O encontro atual favorece os heróis, para que a contagem de ondas avance durante a demonstração. A derrota existe no motor e é coberta por teste.

## Decisões

- **Combate puro.** `src/combate` não importa React nem Phaser. O tempo entra como milissegundos e o acaso entra por uma função injetada, para o teste ser determinístico.
- **Uma sessão, dois leitores.** `src/aplicacao/sessaoCombate.ts` avança o motor em passos de 50 ms. A cena Phaser e o painel React leem o mesmo estado, no mesmo documento. Não há iframe nem `postMessage`.
- **Conteúdo separado das regras.** Nomes, atributos e textos ficam em `src/conteudo`. Trocar o elenco não exige mudar a fórmula.
- **Apresentação.** As silhuetas dos combatentes ainda são desenhadas em runtime. Ícones de poções, habilidades, rações, moedas e baús ficam em `public/assets/` (catálogo tipado em `src/conteudo/bibliotecaArte.ts`) e aparecem na HUD, na arena e na biblioteca de arte da página.
- **Salvamento estreito.** A porta `RepositorioProgresso` guarda apenas a onda alcançada. A implementação atual usa `localStorage`, na chave `veu-de-cinzas.progresso`. Vida e recarga não são salvas no meio do golpe. Um adaptador futuro pode implementar a mesma porta com API Node.js e PostgreSQL; essa API não existe nesta etapa.
- **Ordem no mesmo instante.** Quem aparece antes na lista age primeiro. Os heróis vêm antes dos monstros, então um golpe que mata impede o ataque daquele monstro no mesmo passo.
- **Fórmula.** A defesa mitiga `defesa / (defesa + 100)` do ataque. O crítico, quando a rolagem cai abaixo da chance, multiplica o dano por 1,5. Todo golpe causa no mínimo 1. O intervalo é `1000 × 100 / velocidade`, com piso de 250 ms. O primeiro golpe sai com 40% desse intervalo. Um passo longo dispara no máximo 4 ataques por combatente.

## Versões usadas

Consultadas depois da instalação, não de memória:

| Pacote | Versão |
| --- | --- |
| Phaser | 4.2.1 |
| React | 19.3.1 |
| TypeScript | 6.0.3 |
| Vite | 8.3.5 |
| Vitest | 5.0.5 |

A cena usa a API instalada: `Phaser.Game`, `Scene`, `graphics.generateTexture`, `Scale.FIT` e `audio.noAudio`. O banner de console do Phaser fica desligado.

O build avisa que o pacote do Phaser passa de 500 kB. É o tamanho da biblioteca nesta etapa, não uma falha da arena.

## Arquivos importantes

```text
index.html                          documento em português
src/main.tsx                        composição: sessão, relógio e interface
src/combate/formulas.ts             dano, crítico e recarga
src/combate/motor.ts                ataques, morte e ondas
src/conteudo/definicoes.ts          dois heróis e dois monstros
src/conteudo/bibliotecaArte.ts      catálogo dos 160 ícones em public/assets
src/conteudo/textos.ts              textos visíveis
public/assets/                      pacotes NewGameAssets (poções, skills, tesouros)
src/persistencia/contrato.ts        porta de salvamento
src/persistencia/armazenamentoLocal.ts
src/aplicacao/sessaoCombate.ts      relógio e assinatura do estado
src/apresentacao/CenaArena.ts       cripta, sprites e barras
src/apresentacao/criarJogo.ts       configuração do Phaser
src/interface/App.tsx               painel de atributos
```

Os testes ficam ao lado do código que verificam, com o sufixo `.test.ts`.

## Fora desta etapa

Experiência, equipamento, habilidades, loot, mapa, som, contas e qualquer serviço HTTP ou banco. A onda também não fica mais forte com o tempo.

## Próximos passos

1. Trocar o título provisório e o elenco quando a identidade estiver fechada.
2. Fazer a onda seguinte alterar o conteúdo, em vez de repetir o mesmo encontro.
3. Permitir que ataque, defesa, velocidade e crítico mudem fora do combate.
4. Implementar `RepositorioProgresso` num servidor Node.js com PostgreSQL, sem mudar o motor.
