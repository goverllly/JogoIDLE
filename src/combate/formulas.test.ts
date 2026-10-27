import { describe, expect, it } from 'vitest'
import {
  calcularDano,
  intervaloAtaqueMs,
  recargaInicialMs,
} from './formulas.ts'

describe('calcularDano', () => {
  it('reduz o dano conforme a defesa', () => {
    const semDefesa = calcularDano({
      ataque: 40,
      defesaAlvo: 0,
      chanceCritico: 0,
      rolagem: 0.5,
    })
    const comDefesa = calcularDano({
      ataque: 40,
      defesaAlvo: 100,
      chanceCritico: 0,
      rolagem: 0.5,
    })

    expect(semDefesa).toEqual({ dano: 40, critico: false })
    expect(comDefesa).toEqual({ dano: 20, critico: false })
  })

  it('arredonda a mitigação parcial', () => {
    const resultado = calcularDano({
      ataque: 28,
      defesaAlvo: 4,
      chanceCritico: 0.15,
      rolagem: 0.9,
    })

    expect(resultado).toEqual({ dano: 27, critico: false })
  })

  it('multiplica o dano quando a rolagem cai abaixo da chance de crítico', () => {
    const critico = calcularDano({
      ataque: 28,
      defesaAlvo: 4,
      chanceCritico: 0.15,
      rolagem: 0,
    })
    const noLimite = calcularDano({
      ataque: 28,
      defesaAlvo: 4,
      chanceCritico: 0.2,
      rolagem: 0.2,
    })

    expect(critico).toEqual({ dano: 40, critico: true })
    expect(noLimite.critico).toBe(false)
  })

  it('causa no mínimo 1 de dano', () => {
    const resultado = calcularDano({
      ataque: 0,
      defesaAlvo: 500,
      chanceCritico: 0,
      rolagem: 0.4,
    })

    expect(resultado).toEqual({ dano: 1, critico: false })
  })

  it('trata chance zero como golpe comum mesmo com rolagem zero', () => {
    const resultado = calcularDano({
      ataque: 10,
      defesaAlvo: 0,
      chanceCritico: 0,
      rolagem: 0,
    })

    expect(resultado).toEqual({ dano: 10, critico: false })
  })
})

describe('intervaloAtaqueMs', () => {
  it('usa um segundo na velocidade de referência', () => {
    expect(intervaloAtaqueMs(100)).toBe(1000)
    expect(recargaInicialMs(100)).toBe(400)
  })

  it('encurta o intervalo quando a velocidade aumenta', () => {
    expect(intervaloAtaqueMs(200)).toBe(500)
    expect(intervaloAtaqueMs(110)).toBe(909)
  })

  it('não deixa o intervalo cair abaixo do piso', () => {
    expect(intervaloAtaqueMs(800)).toBe(250)
  })

  it('trata velocidade inválida como a mais lenta aceita', () => {
    expect(intervaloAtaqueMs(0)).toBe(100_000)
    expect(intervaloAtaqueMs(-20)).toBe(100_000)
  })
})
