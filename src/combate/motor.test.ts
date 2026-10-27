import { describe, expect, it } from 'vitest'
import { aleatorioSequencia } from './aleatorio.ts'
import { PAUSA_ENTRE_ONDAS_MS, recargaInicialMs } from './formulas.ts'
import { avancar, criarEstado } from './motor.ts'
import type { CombatenteDefinicao, CombatenteEstado, EstadoCombate } from './tipos.ts'

function definicao(
  id: string,
  lado: CombatenteDefinicao['lado'],
  atributos: Partial<CombatenteDefinicao['atributos']> = {},
): CombatenteDefinicao {
  return {
    id,
    nome: id,
    lado,
    atributos: {
      vidaMaxima: 100,
      ataque: 10,
      defesa: 0,
      velocidade: 100,
      chanceCritico: 0,
      ...atributos,
    },
  }
}

function contexto(
  definicoes: readonly CombatenteDefinicao[],
  rolagens: readonly number[] = [0.99],
) {
  return {
    definicoes,
    aleatorio: aleatorioSequencia(rolagens),
  }
}

function porId(estado: EstadoCombate, id: string): CombatenteEstado {
  const combatente = estado.combatentes.find((item) => item.id === id)
  if (!combatente) {
    throw new Error(`Combatente ausente: ${id}`)
  }
  return combatente
}

describe('avancar', () => {
  it('não altera o estado anterior', () => {
    const definicoes = [definicao('heroi', 'heroi', { ataque: 30 }), definicao('monstro', 'monstro')]
    const antes = criarEstado(definicoes, 1)
    const espera = recargaInicialMs(100)

    avancar(antes, espera, contexto(definicoes))

    expect(antes.combatentes[1]?.vida).toBe(100)
    expect(antes.fase).toBe('combatendo')
    expect(antes.eventos).toEqual([])
  })

  it('aplica um ataque automático quando a recarga termina', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 28 }),
      definicao('monstro', 'monstro', { defesa: 4, vidaMaxima: 80 }),
    ]
    const estado = criarEstado(definicoes, 1)
    const espera = recargaInicialMs(100)

    const cedo = avancar(estado, espera - 1, contexto(definicoes))
    const noTempo = avancar(estado, espera, contexto(definicoes))

    expect(porId(cedo, 'monstro').vida).toBe(80)
    expect(porId(noTempo, 'monstro').vida).toBe(53)
    expect(porId(noTempo, 'monstro').ultimoDanoRecebido).toBe(27)
    expect(porId(noTempo, 'heroi').ultimoAtaqueEmMs).toBe(espera)
  })

  it('registra crítico quando a rolagem permite', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 28, chanceCritico: 1 }),
      definicao('monstro', 'monstro', { defesa: 4, vidaMaxima: 100 }),
    ]
    const estado = avancar(
      criarEstado(definicoes, 1),
      recargaInicialMs(100),
      contexto(definicoes, [0]),
    )

    expect(porId(estado, 'monstro').vida).toBe(60)
    expect(porId(estado, 'monstro').ultimoDanoFoiCritico).toBe(true)
  })

  it('ignora quem já morreu e passa a atacar o próximo alvo', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 50 }),
      definicao('primeiro', 'monstro', { vidaMaxima: 1 }),
      definicao('segundo', 'monstro', { vidaMaxima: 40 }),
    ]
    const combate = contexto(definicoes)
    const primeiroGolpe = avancar(criarEstado(definicoes, 1), recargaInicialMs(100), combate)
    const segundoGolpe = avancar(primeiroGolpe, 1000, combate)

    expect(porId(primeiroGolpe, 'primeiro').vivo).toBe(false)
    expect(porId(primeiroGolpe, 'segundo').vida).toBe(40)
    expect(porId(segundoGolpe, 'segundo').vida).toBe(0)
    expect(porId(segundoGolpe, 'segundo').vivo).toBe(false)
  })

  it('impede o ataque de um combatente morto no mesmo passo', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 100, vidaMaxima: 40 }),
      definicao('monstro', 'monstro', { ataque: 100, vidaMaxima: 10 }),
    ]
    const estado = avancar(criarEstado(definicoes, 1), recargaInicialMs(100), contexto(definicoes))

    expect(porId(estado, 'monstro').vivo).toBe(false)
    expect(porId(estado, 'heroi').vida).toBe(40)
    expect(estado.eventos.filter((evento) => evento.tipo === 'ataque')).toHaveLength(1)
  })

  it('limita a quantidade de ataques recuperados em um único passo', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 1 }),
      definicao('monstro', 'monstro', { vidaMaxima: 500 }),
    ]
    const estado = avancar(criarEstado(definicoes, 1), 10_000, contexto(definicoes))
    const ataquesDoHeroi = estado.eventos.filter(
      (evento) => evento.tipo === 'ataque' && evento.origemId === 'heroi',
    )

    expect(ataquesDoHeroi).toHaveLength(4)
  })

  it('reinicia a onda seguinte quando os monstros morrem', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 100, vidaMaxima: 50 }),
      definicao('monstro', 'monstro', { vidaMaxima: 1, ataque: 100 }),
    ]
    const combate = contexto(definicoes)
    const fim = avancar(criarEstado(definicoes, 3), recargaInicialMs(100), combate)
    const durantePausa = avancar(fim, PAUSA_ENTRE_ONDAS_MS - 1, combate)
    const reinicio = avancar(fim, PAUSA_ENTRE_ONDAS_MS, combate)

    expect(fim.fase).toBe('intervalo')
    expect(fim.motivoIntervalo).toBe('vitoria')
    expect(durantePausa.onda).toBe(3)
    expect(durantePausa.fase).toBe('intervalo')
    expect(porId(durantePausa, 'monstro').vivo).toBe(false)
    expect(reinicio.onda).toBe(4)
    expect(reinicio.fase).toBe('combatendo')
    expect(reinicio.combatentes.every((combatente) => combatente.vida === combatente.atributos.vidaMaxima)).toBe(true)
  })

  it('recomeça a mesma onda quando os heróis morrem', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { vidaMaxima: 1, ataque: 1 }),
      definicao('monstro', 'monstro', { vidaMaxima: 80, ataque: 50 }),
    ]
    const combate = contexto(definicoes)
    const fim = avancar(criarEstado(definicoes, 2), recargaInicialMs(100), combate)
    const reinicio = avancar(fim, PAUSA_ENTRE_ONDAS_MS, combate)

    expect(fim.motivoIntervalo).toBe('derrota')
    expect(reinicio.onda).toBe(2)
    expect(porId(reinicio, 'heroi').vida).toBe(1)
    expect(porId(reinicio, 'monstro').vida).toBe(80)
  })

  it('não troca golpes durante a pausa', () => {
    const definicoes = [
      definicao('heroi', 'heroi', { ataque: 100 }),
      definicao('monstro', 'monstro', { vidaMaxima: 1 }),
    ]
    const combate = contexto(definicoes)
    const fim = avancar(criarEstado(definicoes, 1), recargaInicialMs(100), combate)
    const pausa = avancar(fim, 500, combate)

    expect(pausa.fase).toBe('intervalo')
    expect(pausa.eventos.some((evento) => evento.tipo === 'ataque' && evento.momentoMs > fim.decorridoMs)).toBe(false)
  })

  it('encerra a onda se um dos lados não tem sobreviventes', () => {
    const soHeroi = [definicao('heroi', 'heroi')]
    const soMonstro = [definicao('monstro', 'monstro')]

    expect(avancar(criarEstado(soHeroi, 1), 1, contexto(soHeroi)).motivoIntervalo).toBe('vitoria')
    expect(avancar(criarEstado(soMonstro, 1), 1, contexto(soMonstro)).motivoIntervalo).toBe('derrota')
  })

  it('rejeita tempo negativo e ignora tempo zero', () => {
    const definicoes = [definicao('heroi', 'heroi'), definicao('monstro', 'monstro')]
    const estado = criarEstado(definicoes, 1)

    expect(avancar(estado, 0, contexto(definicoes))).toBe(estado)
    expect(() => avancar(estado, -1, contexto(definicoes))).toThrow(/tempo negativo/)
  })
})
