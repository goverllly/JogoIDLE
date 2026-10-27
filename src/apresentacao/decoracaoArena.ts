import type Phaser from 'phaser'
import { ARTE_HUD, HABILIDADES_PREVIEW, obterItemArte, urlArte } from '../conteudo/bibliotecaArte.ts'

export interface DecoracaoPosicao {
  readonly idArte: string
  readonly x: number
  readonly y: number
  readonly escala: number
}

/** Baús, moedas e poções espalhados no chão da cripta. */
export const DECORACOES_ARENA: readonly DecoracaoPosicao[] = [
  { idArte: ARTE_HUD.bau, x: 120, y: 448, escala: 0.42 },
  { idArte: ARTE_HUD.bauMagico, x: 840, y: 442, escala: 0.4 },
  { idArte: ARTE_HUD.pilhaOuro, x: 168, y: 456, escala: 0.32 },
  { idArte: ARTE_HUD.ouro, x: 200, y: 460, escala: 0.28 },
  { idArte: ARTE_HUD.saco, x: 780, y: 452, escala: 0.34 },
  { idArte: ARTE_HUD.chave, x: 800, y: 458, escala: 0.26 },
  { idArte: ARTE_HUD.pocaoCura, x: 150, y: 420, escala: 0.3 },
  { idArte: ARTE_HUD.pocaoMana, x: 810, y: 418, escala: 0.3 },
]

export function chaveTexturaArte(idArte: string): string {
  return `arte:${idArte}`
}

export function idsArteUsadosNaArena(): readonly string[] {
  const ids = new Set<string>()
  for (const decoracao of DECORACOES_ARENA) {
    ids.add(decoracao.idArte)
  }
  for (const lista of Object.values(HABILIDADES_PREVIEW)) {
    for (const id of lista) {
      ids.add(id)
    }
  }
  return [...ids]
}

export function carregarArteNoLoader(
  load: Phaser.Loader.LoaderPlugin,
  ids: readonly string[],
): void {
  for (const id of ids) {
    const item = obterItemArte(id)
    if (!item) {
      continue
    }
    load.image(chaveTexturaArte(id), urlArte(item.caminho))
  }
}
