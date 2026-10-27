export type Lado = 'heroi' | 'monstro'

export type FaseCombate = 'combatendo' | 'intervalo'

export type MotivoIntervalo = 'vitoria' | 'derrota'

export interface Atributos {
  vidaMaxima: number
  ataque: number
  defesa: number
  velocidade: number
  chanceCritico: number
}

export interface CombatenteDefinicao {
  id: string
  nome: string
  lado: Lado
  atributos: Atributos
}

export interface CombatenteEstado {
  id: string
  nome: string
  lado: Lado
  atributos: Atributos
  vida: number
  vivo: boolean
  recargaRestanteMs: number
  intervaloAtaqueMs: number
  ultimoAtaqueEmMs: number | null
  ultimoDanoRecebido: number | null
  ultimoDanoFoiCritico: boolean
  ultimoDanoEmMs: number | null
}

export type EventoCombate =
  | {
      tipo: 'ataque'
      origemId: string
      alvoId: string
      dano: number
      critico: boolean
      momentoMs: number
    }
  | {
      tipo: 'morte'
      alvoId: string
      momentoMs: number
    }
  | {
      tipo: 'fim-de-onda'
      onda: number
      motivo: MotivoIntervalo
      momentoMs: number
    }
  | {
      tipo: 'reinicio'
      onda: number
      motivo: MotivoIntervalo
      momentoMs: number
    }

export interface EstadoCombate {
  onda: number
  decorridoMs: number
  fase: FaseCombate
  motivoIntervalo: MotivoIntervalo | null
  pausaRestanteMs: number
  combatentes: CombatenteEstado[]
  eventos: EventoCombate[]
}
