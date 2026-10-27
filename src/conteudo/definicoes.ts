import type { CombatenteDefinicao } from '../combate/tipos.ts'

export const DEFINICOES: readonly CombatenteDefinicao[] = [
  {
    id: 'vigia-da-cinza',
    nome: 'Vigia da Cinza',
    lado: 'heroi',
    atributos: {
      vidaMaxima: 240,
      ataque: 28,
      defesa: 14,
      velocidade: 115,
      chanceCritico: 0.15,
    },
  },
  {
    id: 'clerigo-das-brasas',
    nome: 'Clérigo das Brasas',
    lado: 'heroi',
    atributos: {
      vidaMaxima: 280,
      ataque: 20,
      defesa: 18,
      velocidade: 90,
      chanceCritico: 0.08,
    },
  },
  {
    id: 'horror-rastejante',
    nome: 'Horror Rastejante',
    lado: 'monstro',
    atributos: {
      vidaMaxima: 200,
      ataque: 15,
      defesa: 6,
      velocidade: 100,
      chanceCritico: 0.05,
    },
  },
  {
    id: 'aparicao-da-laje',
    nome: 'Aparição da Laje',
    lado: 'monstro',
    atributos: {
      vidaMaxima: 140,
      ataque: 19,
      defesa: 2,
      velocidade: 130,
      chanceCritico: 0.2,
    },
  },
]
