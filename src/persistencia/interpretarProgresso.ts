import type { ProgressoSalvo } from './contrato.ts'

export function interpretarProgresso(valor: unknown): ProgressoSalvo | null {
  if (typeof valor !== 'object' || valor === null) {
    return null
  }

  const registro = valor as Record<string, unknown>
  if (registro.versao !== 1) {
    return null
  }
  if (!Number.isInteger(registro.ondaAlcancada) || Number(registro.ondaAlcancada) < 1) {
    return null
  }

  return {
    versao: 1,
    ondaAlcancada: registro.ondaAlcancada as number,
  }
}
