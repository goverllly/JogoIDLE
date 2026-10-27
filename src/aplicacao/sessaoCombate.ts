import { aleatorioNativo, type Aleatorio } from '../combate/aleatorio.ts'
import { criarEstado, avancar as avancarCombate } from '../combate/motor.ts'
import type { CombatenteDefinicao, EstadoCombate } from '../combate/tipos.ts'
import type { RepositorioProgresso } from '../persistencia/contrato.ts'

const PASSO_MS = 50
const DELTA_MAXIMO_MS = 100

export interface SessaoCombate {
  obterEstado(): EstadoCombate
  inscrever(ouvinte: () => void): () => void
  iniciar(): void
  parar(): void
  avancar(deltaMs: number): void
}

export function criarSessao(opcoes: {
  definicoes: readonly CombatenteDefinicao[]
  repositorio: RepositorioProgresso
  aleatorio?: Aleatorio
}): SessaoCombate {
  const contexto = {
    definicoes: opcoes.definicoes,
    aleatorio: opcoes.aleatorio ?? aleatorioNativo(),
  }
  const progresso = opcoes.repositorio.carregar()
  let estado = criarEstado(opcoes.definicoes, progresso?.ondaAlcancada ?? 1)
  let acumulado = 0
  let quadro = 0
  const ouvintes = new Set<() => void>()

  function notificar(): void {
    for (const ouvinte of ouvintes) {
      ouvinte()
    }
  }

  function avancar(deltaMs: number): void {
    const ondaAnterior = estado.onda
    estado = avancarCombate(estado, deltaMs, contexto)
    if (estado.onda > ondaAnterior) {
      opcoes.repositorio.salvar({
        versao: 1,
        ondaAlcancada: estado.onda,
      })
    }
    notificar()
  }

  function iniciar(): void {
    if (quadro !== 0) {
      return
    }

    let anterior = performance.now()
    const ciclo = (agora: number) => {
      const delta = Math.min(DELTA_MAXIMO_MS, agora - anterior)
      anterior = agora
      acumulado += delta
      while (acumulado >= PASSO_MS) {
        avancar(PASSO_MS)
        acumulado -= PASSO_MS
      }
      quadro = window.requestAnimationFrame(ciclo)
    }

    quadro = window.requestAnimationFrame(ciclo)
  }

  function parar(): void {
    if (quadro === 0) {
      return
    }
    window.cancelAnimationFrame(quadro)
    quadro = 0
  }

  return {
    obterEstado: () => estado,
    inscrever(ouvinte) {
      ouvintes.add(ouvinte)
      return () => {
        ouvintes.delete(ouvinte)
      }
    },
    iniciar,
    parar,
    avancar,
  }
}
