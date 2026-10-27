import { describe, expect, it } from 'vitest'
import { interpretarProgresso } from './interpretarProgresso.ts'

describe('interpretarProgresso', () => {
  it('aceita a versão atual com onda inteira positiva', () => {
    expect(interpretarProgresso({ versao: 1, ondaAlcancada: 4 })).toEqual({
      versao: 1,
      ondaAlcancada: 4,
    })
  })

  it('rejeita conteúdo ausente, versão diferente ou onda inválida', () => {
    expect(interpretarProgresso(null)).toBeNull()
    expect(interpretarProgresso('4')).toBeNull()
    expect(interpretarProgresso({ versao: 2, ondaAlcancada: 4 })).toBeNull()
    expect(interpretarProgresso({ versao: 1, ondaAlcancada: 0 })).toBeNull()
    expect(interpretarProgresso({ versao: 1, ondaAlcancada: 1.5 })).toBeNull()
  })
})
