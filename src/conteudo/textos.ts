import type { FaseCombate, MotivoIntervalo } from '../combate/tipos.ts'

export const TEXTOS = {
  titulo: 'Véu de Cinzas',
  subtitulo: 'Arena provisória',
  descricao: 'Dois heróis enfrentam dois monstros em combate automático. Abaixo, a biblioteca completa de arte do projeto.',
  onda: (numero: number) => `Onda ${numero}`,
  herois: 'Heróis',
  monstros: 'Monstros',
  vida: 'Vida',
  ataque: 'Ataque',
  defesa: 'Defesa',
  velocidade: 'Velocidade',
  critico: 'Crítico',
  recarga: 'Recarga',
  ultimoGolpe: 'Último golpe',
  semGolpe: 'Nenhum',
  golpeCritico: (dano: number) => `${dano} (crítico)`,
  combatendo: 'Confronto em andamento',
  vitoria: 'Grupo inimigo derrotado',
  derrota: 'Os heróis tombaram',
  tombou: 'Tombou',
  emCombate: 'Em combate',
  instrucao: 'Os golpes acontecem sozinhos. A onda recomeça quando um dos lados tomba.',
  habilidades: 'Habilidades (prévia)',
  faixaTesouro: 'Tesouros e consumíveis em exibição',
  galeriaTitulo: 'Biblioteca de arte',
  galeriaDescricao: (itens: number, pacotes: number) =>
    `${itens} ícones em ${pacotes} pacotes, prontos em public/assets.`,
  galeriaBusca: 'Buscar ícone…',
  galeriaFiltros: 'Filtrar por pacote',
  galeriaTodos: 'Todos',
  galeriaContagem: (quantidade: number) =>
    quantidade === 1 ? '1 ícone visível' : `${quantidade} ícones visíveis`,
} as const

export function descreverSituacao(fase: FaseCombate, motivo: MotivoIntervalo | null): string {
  if (fase === 'intervalo') {
    return motivo === 'vitoria' ? TEXTOS.vitoria : TEXTOS.derrota
  }
  return TEXTOS.combatendo
}
