import type { CombatenteEstado } from '../combate/tipos.ts'
import { TEXTOS } from '../conteudo/textos.ts'

export function formatarVida(atual: number, maxima: number): string {
  return `${atual} / ${maxima}`
}

export function formatarCritico(chance: number): string {
  return `${Math.round(chance * 100)}%`
}

export function formatarUltimoGolpe(combatente: CombatenteEstado): string {
  if (combatente.ultimoDanoRecebido === null) {
    return TEXTOS.semGolpe
  }
  if (combatente.ultimoDanoFoiCritico) {
    return TEXTOS.golpeCritico(combatente.ultimoDanoRecebido)
  }
  return String(combatente.ultimoDanoRecebido)
}

export function proporcaoRecarga(combatente: CombatenteEstado): number {
  if (!combatente.vivo || combatente.intervaloAtaqueMs <= 0) {
    return 0
  }
  return Math.min(1, Math.max(0, 1 - combatente.recargaRestanteMs / combatente.intervaloAtaqueMs))
}

export function proporcaoVida(combatente: CombatenteEstado): number {
  if (combatente.atributos.vidaMaxima <= 0) {
    return 0
  }
  return Math.min(1, Math.max(0, combatente.vida / combatente.atributos.vidaMaxima))
}
