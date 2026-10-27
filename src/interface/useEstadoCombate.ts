import { useSyncExternalStore } from 'react'
import type { SessaoCombate } from '../aplicacao/sessaoCombate.ts'
import type { EstadoCombate } from '../combate/tipos.ts'

export function useEstadoCombate(sessao: SessaoCombate): EstadoCombate {
  return useSyncExternalStore(sessao.inscrever, sessao.obterEstado)
}
