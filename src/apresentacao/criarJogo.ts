import Phaser from 'phaser'
import type { SessaoCombate } from '../aplicacao/sessaoCombate.ts'
import { ALTURA_ARENA, LARGURA_ARENA } from './medidas.ts'
import { CenaArena } from './CenaArena.ts'

export function criarJogo(elemento: HTMLElement, sessao: SessaoCombate): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: elemento,
    width: LARGURA_ARENA,
    height: ALTURA_ARENA,
    backgroundColor: '#120f0c',
    banner: false,
    autoFocus: false,
    audio: { noAudio: true },
    input: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: false,
    },
    scene: [new CenaArena(sessao)],
  })
}
