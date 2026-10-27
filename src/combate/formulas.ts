export const CONSTANTE_DEFESA = 100
export const MULTIPLICADOR_CRITICO = 1.5
export const INTERVALO_BASE_MS = 1000
export const REFERENCIA_VELOCIDADE = 100
export const INTERVALO_MINIMO_MS = 250
export const FRACAO_RECARGA_INICIAL = 0.4
export const PAUSA_ENTRE_ONDAS_MS = 1600
export const MAX_ATAQUES_POR_PASSO = 4
export const LIMITE_EVENTOS = 30

export interface EntradaDano {
  ataque: number
  defesaAlvo: number
  chanceCritico: number
  rolagem: number
}

export interface ResultadoDano {
  dano: number
  critico: boolean
}

/**
 * Mitigação = defesa / (defesa + 100).
 * Dano = ataque × (1 − mitigação), no mínimo 1.
 * Crítico multiplica o dano por 1,5 quando a rolagem é menor que a chance.
 * Intervalo = 1000 × 100 / velocidade, com piso de 250 ms.
 */
export function calcularDano(entrada: EntradaDano): ResultadoDano {
  const ataque = Math.max(0, entrada.ataque)
  const defesa = Math.max(0, entrada.defesaAlvo)
  const mitigacao = defesa / (defesa + CONSTANTE_DEFESA)
  const bruto = ataque * (1 - mitigacao)
  const critico = entrada.rolagem < entrada.chanceCritico
  const ajustado = critico ? bruto * MULTIPLICADOR_CRITICO : bruto

  return {
    dano: Math.max(1, Math.round(ajustado)),
    critico,
  }
}

export function intervaloAtaqueMs(velocidade: number): number {
  const velocidadeSegura = Math.max(1, velocidade)
  const intervalo = Math.round((INTERVALO_BASE_MS * REFERENCIA_VELOCIDADE) / velocidadeSegura)
  return Math.max(INTERVALO_MINIMO_MS, intervalo)
}

export function recargaInicialMs(velocidade: number): number {
  return Math.round(intervaloAtaqueMs(velocidade) * FRACAO_RECARGA_INICIAL)
}
