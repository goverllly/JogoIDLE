import { describe, expect, it } from 'vitest'
import { aleatorioSequencia } from '../combate/aleatorio.ts'
import { PAUSA_ENTRE_ONDAS_MS, recargaInicialMs } from '../combate/formulas.ts'
import type { CombatenteDefinicao } from '../combate/tipos.ts'
import { criarSessao } from '../aplicacao/sessaoCombate.ts'
import type { ProgressoSalvo, RepositorioProgresso } from './contrato.ts'
import { criarRepositorioLocal } from './armazenamentoLocal.ts'

function repositorioMemoria(inicial: ProgressoSalvo | null = null): RepositorioProgresso & {
  ler(): ProgressoSalvo | null
} {
  let progresso = inicial
  return {
    carregar: () => progresso,
    salvar: (proximo) => {
      progresso = proximo
    },
    ler: () => progresso,
  }
}

const definicoes: readonly CombatenteDefinicao[] = [
  {
    id: 'heroi',
    nome: 'Herói',
    lado: 'heroi',
    atributos: { vidaMaxima: 40, ataque: 100, defesa: 0, velocidade: 100, chanceCritico: 0 },
  },
  {
    id: 'monstro',
    nome: 'Monstro',
    lado: 'monstro',
    atributos: { vidaMaxima: 1, ataque: 1, defesa: 0, velocidade: 100, chanceCritico: 0 },
  },
]

describe('sessão e armazenamento', () => {
  it('começa na onda salva e grava a próxima onda vencida', () => {
    const repositorio = repositorioMemoria({ versao: 1, ondaAlcancada: 3 })
    const sessao = criarSessao({
      definicoes,
      repositorio,
      aleatorio: aleatorioSequencia([0.9]),
    })

    expect(sessao.obterEstado().onda).toBe(3)

    sessao.avancar(recargaInicialMs(100))
    expect(sessao.obterEstado().fase).toBe('intervalo')
    expect(repositorio.ler()).toEqual({ versao: 1, ondaAlcancada: 3 })

    sessao.avancar(PAUSA_ENTRE_ONDAS_MS)
    expect(sessao.obterEstado().onda).toBe(4)
    expect(repositorio.ler()).toEqual({ versao: 1, ondaAlcancada: 4 })
  })

  it('guarda e recupera o progresso em um armazenamento de chave e valor', () => {
    const dados = new Map<string, string>()
    const armazenamento = {
      getItem: (chave: string) => dados.get(chave) ?? null,
      setItem: (chave: string, valor: string) => {
        dados.set(chave, valor)
      },
    }
    const repositorio = criarRepositorioLocal(armazenamento)

    expect(repositorio.carregar()).toBeNull()
    repositorio.salvar({ versao: 1, ondaAlcancada: 6 })
    expect(criarRepositorioLocal(armazenamento).carregar()).toEqual({
      versao: 1,
      ondaAlcancada: 6,
    })

    dados.set('veu-de-cinzas.progresso', '{')
    expect(criarRepositorioLocal(armazenamento).carregar()).toBeNull()
  })
})
