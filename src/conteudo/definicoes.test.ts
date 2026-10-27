import { describe, expect, it } from 'vitest'
import { DEFINICOES } from './definicoes.ts'

describe('definicoes da arena', () => {
  it('expõe dois heróis e dois monstros com atributos válidos', () => {
    const herois = DEFINICOES.filter((definicao) => definicao.lado === 'heroi')
    const monstros = DEFINICOES.filter((definicao) => definicao.lado === 'monstro')
    const ids = new Set(DEFINICOES.map((definicao) => definicao.id))

    expect(herois).toHaveLength(2)
    expect(monstros).toHaveLength(2)
    expect(ids.size).toBe(DEFINICOES.length)

    for (const definicao of DEFINICOES) {
      expect(definicao.nome.trim().length).toBeGreaterThan(0)
      expect(definicao.atributos.vidaMaxima).toBeGreaterThan(0)
      expect(definicao.atributos.ataque).toBeGreaterThan(0)
      expect(definicao.atributos.defesa).toBeGreaterThanOrEqual(0)
      expect(definicao.atributos.velocidade).toBeGreaterThan(0)
      expect(definicao.atributos.chanceCritico).toBeGreaterThanOrEqual(0)
      expect(definicao.atributos.chanceCritico).toBeLessThanOrEqual(1)
    }
  })
})
