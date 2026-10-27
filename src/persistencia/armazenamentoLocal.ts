import type { ProgressoSalvo, RepositorioProgresso } from './contrato.ts'
import { interpretarProgresso } from './interpretarProgresso.ts'

const CHAVE = 'veu-de-cinzas.progresso'

interface ArmazenamentoChaveValor {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
}

export function criarRepositorioLocal(
  armazenamento: ArmazenamentoChaveValor = localStorage,
): RepositorioProgresso {
  return {
    carregar() {
      try {
        const bruto = armazenamento.getItem(CHAVE)
        if (!bruto) {
          return null
        }
        return interpretarProgresso(JSON.parse(bruto) as unknown)
      } catch {
        return null
      }
    },
    salvar(progresso: ProgressoSalvo) {
      try {
        armazenamento.setItem(CHAVE, JSON.stringify(progresso))
      } catch {
        // O confronto continua mesmo se o navegador recusar a gravação.
      }
    },
  }
}
