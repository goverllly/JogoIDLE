import type { Aleatorio } from './aleatorio.ts'
import {
  LIMITE_EVENTOS,
  MAX_ATAQUES_POR_PASSO,
  PAUSA_ENTRE_ONDAS_MS,
  calcularDano,
  intervaloAtaqueMs,
  recargaInicialMs,
} from './formulas.ts'
import type {
  CombatenteDefinicao,
  CombatenteEstado,
  EstadoCombate,
  EventoCombate,
  Lado,
  MotivoIntervalo,
} from './tipos.ts'

export interface ContextoCombate {
  aleatorio: Aleatorio
  definicoes: readonly CombatenteDefinicao[]
}

export function criarEstado(
  definicoes: readonly CombatenteDefinicao[],
  onda: number,
): EstadoCombate {
  return {
    onda,
    decorridoMs: 0,
    fase: 'combatendo',
    motivoIntervalo: null,
    pausaRestanteMs: 0,
    combatentes: definicoes.map(criarCombatente),
    eventos: [],
  }
}

export function avancar(
  estado: EstadoCombate,
  deltaMs: number,
  contexto: ContextoCombate,
): EstadoCombate {
  if (deltaMs < 0) {
    throw new Error('O avanço do combate não aceita tempo negativo.')
  }
  if (deltaMs === 0) {
    return estado
  }

  const momentoMs = estado.decorridoMs + deltaMs
  if (estado.fase === 'intervalo') {
    return avancarIntervalo(estado, deltaMs, momentoMs, contexto)
  }

  let eventos = estado.eventos
  const combatentes = estado.combatentes.map((combatente) => ({ ...combatente }))

  for (let indice = 0; indice < combatentes.length; indice += 1) {
    let atacante = combatentes[indice]
    if (!atacante || !atacante.vivo) {
      continue
    }

    let recarga = atacante.recargaRestanteMs - deltaMs
    let disparos = 0

    while (recarga <= 0 && disparos < MAX_ATAQUES_POR_PASSO) {
      const indiceAlvo = encontrarAlvo(combatentes, atacante.lado)
      if (indiceAlvo < 0) {
        break
      }

      const alvo = combatentes[indiceAlvo]
      if (!alvo) {
        break
      }

      const resultado = calcularDano({
        ataque: atacante.atributos.ataque,
        defesaAlvo: alvo.atributos.defesa,
        chanceCritico: atacante.atributos.chanceCritico,
        rolagem: contexto.aleatorio.proximo(),
      })
      const vida = Math.max(0, alvo.vida - resultado.dano)

      combatentes[indiceAlvo] = {
        ...alvo,
        vida,
        vivo: vida > 0,
        ultimoDanoRecebido: resultado.dano,
        ultimoDanoFoiCritico: resultado.critico,
        ultimoDanoEmMs: momentoMs,
      }

      recarga += atacante.intervaloAtaqueMs
      disparos += 1
      atacante = {
        ...atacante,
        recargaRestanteMs: recarga,
        ultimoAtaqueEmMs: momentoMs,
      }
      combatentes[indice] = atacante

      eventos = registrar(eventos, {
        tipo: 'ataque',
        origemId: atacante.id,
        alvoId: alvo.id,
        dano: resultado.dano,
        critico: resultado.critico,
        momentoMs,
      })

      if (vida <= 0) {
        eventos = registrar(eventos, {
          tipo: 'morte',
          alvoId: alvo.id,
          momentoMs,
        })
      }
    }

    if (disparos === 0) {
      combatentes[indice] = {
        ...atacante,
        recargaRestanteMs: Math.max(0, recarga),
      }
    }
  }

  const heroisVivos = combatentes.some((combatente) => combatente.lado === 'heroi' && combatente.vivo)
  const monstrosVivos = combatentes.some((combatente) => combatente.lado === 'monstro' && combatente.vivo)

  if (!heroisVivos || !monstrosVivos) {
    const motivo: MotivoIntervalo = heroisVivos ? 'vitoria' : 'derrota'
    eventos = registrar(eventos, {
      tipo: 'fim-de-onda',
      onda: estado.onda,
      motivo,
      momentoMs,
    })

    return {
      onda: estado.onda,
      decorridoMs: momentoMs,
      fase: 'intervalo',
      motivoIntervalo: motivo,
      pausaRestanteMs: PAUSA_ENTRE_ONDAS_MS,
      combatentes,
      eventos,
    }
  }

  return {
    onda: estado.onda,
    decorridoMs: momentoMs,
    fase: 'combatendo',
    motivoIntervalo: null,
    pausaRestanteMs: 0,
    combatentes,
    eventos,
  }
}

function criarCombatente(definicao: CombatenteDefinicao): CombatenteEstado {
  return {
    id: definicao.id,
    nome: definicao.nome,
    lado: definicao.lado,
    atributos: definicao.atributos,
    vida: definicao.atributos.vidaMaxima,
    vivo: true,
    intervaloAtaqueMs: intervaloAtaqueMs(definicao.atributos.velocidade),
    recargaRestanteMs: recargaInicialMs(definicao.atributos.velocidade),
    ultimoAtaqueEmMs: null,
    ultimoDanoRecebido: null,
    ultimoDanoFoiCritico: false,
    ultimoDanoEmMs: null,
  }
}

function encontrarAlvo(combatentes: readonly CombatenteEstado[], lado: Lado): number {
  const ladoAlvo: Lado = lado === 'heroi' ? 'monstro' : 'heroi'
  return combatentes.findIndex((combatente) => combatente.lado === ladoAlvo && combatente.vivo)
}

function avancarIntervalo(
  estado: EstadoCombate,
  deltaMs: number,
  momentoMs: number,
  contexto: ContextoCombate,
): EstadoCombate {
  const pausaRestanteMs = estado.pausaRestanteMs - deltaMs
  if (pausaRestanteMs > 0) {
    return {
      ...estado,
      decorridoMs: momentoMs,
      pausaRestanteMs,
    }
  }

  const motivo = estado.motivoIntervalo ?? 'derrota'
  const onda = motivo === 'vitoria' ? estado.onda + 1 : estado.onda
  const reinicio = criarEstado(contexto.definicoes, onda)

  return {
    ...reinicio,
    decorridoMs: momentoMs,
    eventos: registrar(estado.eventos, {
      tipo: 'reinicio',
      onda,
      motivo,
      momentoMs,
    }),
  }
}

function registrar(eventos: readonly EventoCombate[], evento: EventoCombate): EventoCombate[] {
  const inicio = Math.max(0, eventos.length + 1 - LIMITE_EVENTOS)
  return [...eventos.slice(inicio), evento]
}
