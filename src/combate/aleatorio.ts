export interface Aleatorio {
  proximo(): number
}

export function aleatorioNativo(): Aleatorio {
  return {
    proximo: () => Math.random(),
  }
}

export function aleatorioSequencia(valores: readonly number[]): Aleatorio {
  if (valores.length === 0) {
    throw new Error('A sequência aleatória precisa de ao menos um valor.')
  }

  let indice = 0
  return {
    proximo() {
      const valor = valores[Math.min(indice, valores.length - 1)] ?? 0
      indice += 1
      return valor
    },
  }
}
