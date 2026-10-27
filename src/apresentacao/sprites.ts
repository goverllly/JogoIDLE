import type Phaser from 'phaser'

export const LARGURA_SPRITE = 96
export const ALTURA_SPRITE = 112

export function chaveTextura(id: string): string {
  return `silhueta-${id}`
}

export function desenharSilhueta(grafico: Phaser.GameObjects.Graphics, id: string): void {
  grafico.clear()
  if (id === 'vigia-da-cinza') {
    desenharVigia(grafico)
    return
  }
  if (id === 'clerigo-das-brasas') {
    desenharClerigo(grafico)
    return
  }
  if (id === 'horror-rastejante') {
    desenharHorror(grafico)
    return
  }
  if (id === 'aparicao-da-laje') {
    desenharAparicao(grafico)
    return
  }
  desenharGenerico(grafico)
}

function desenharSombra(grafico: Phaser.GameObjects.Graphics, x: number, largura: number): void {
  grafico.fillStyle(0x000000, 0.35)
  grafico.fillRect(x, 102, largura, 6)
}

function desenharVigia(grafico: Phaser.GameObjects.Graphics): void {
  desenharSombra(grafico, 22, 52)
  grafico.fillStyle(0x2f3a46, 1)
  grafico.fillTriangle(48, 26, 20, 104, 76, 104)
  grafico.fillStyle(0x5d6d7e, 1)
  grafico.fillRect(38, 48, 20, 40)
  grafico.fillStyle(0x1d242c, 1)
  grafico.fillCircle(48, 40, 14)
  grafico.fillStyle(0xd7c4a3, 1)
  grafico.fillRect(41, 38, 14, 4)
  grafico.fillStyle(0xd5d8de, 1)
  grafico.fillRect(72, 38, 5, 42)
  grafico.fillStyle(0x8a6a3b, 1)
  grafico.fillRect(66, 74, 16, 4)
}

function desenharClerigo(grafico: Phaser.GameObjects.Graphics): void {
  desenharSombra(grafico, 18, 60)
  grafico.fillStyle(0x6e342c, 1)
  grafico.fillTriangle(48, 22, 16, 104, 80, 104)
  grafico.fillStyle(0xe0b15c, 1)
  grafico.fillCircle(48, 16, 6)
  grafico.fillStyle(0xd7c4a3, 1)
  grafico.fillCircle(48, 42, 11)
  grafico.fillStyle(0x4a241e, 1)
  grafico.fillRect(34, 32, 28, 12)
  grafico.fillStyle(0x6e6256, 1)
  grafico.fillRect(76, 26, 4, 74)
  grafico.fillStyle(0xc4553a, 1)
  grafico.fillCircle(78, 24, 5)
}

function desenharHorror(grafico: Phaser.GameObjects.Graphics): void {
  desenharSombra(grafico, 12, 72)
  grafico.fillStyle(0x3d5536, 1)
  grafico.fillRect(16, 70, 64, 32)
  grafico.fillCircle(34, 66, 18)
  grafico.fillStyle(0xc9a15b, 1)
  grafico.fillCircle(28, 62, 4)
  grafico.fillCircle(40, 64, 3)
  grafico.fillStyle(0x2c241c, 1)
  grafico.fillTriangle(20, 86, 6, 106, 30, 98)
  grafico.fillTriangle(72, 82, 92, 106, 62, 96)
  grafico.fillStyle(0x87a36a, 1)
  grafico.fillRect(18, 78, 18, 8)
}

function desenharAparicao(grafico: Phaser.GameObjects.Graphics): void {
  grafico.fillStyle(0x6a5a8a, 0.92)
  grafico.fillTriangle(48, 14, 32, 106, 64, 106)
  grafico.fillStyle(0xc7c3d4, 0.55)
  grafico.fillTriangle(48, 22, 14, 72, 30, 100)
  grafico.fillTriangle(48, 26, 84, 68, 66, 104)
  grafico.fillStyle(0xf2f0ea, 1)
  grafico.fillRect(40, 40, 5, 5)
  grafico.fillRect(52, 40, 5, 5)
}

function desenharGenerico(grafico: Phaser.GameObjects.Graphics): void {
  desenharSombra(grafico, 28, 40)
  grafico.fillStyle(0x8a8175, 1)
  grafico.fillCircle(48, 30, 12)
  grafico.fillRect(36, 42, 24, 60)
}
