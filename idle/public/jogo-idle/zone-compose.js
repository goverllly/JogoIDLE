/**
 * Regra única de composição do cenário.
 * O editor e o jogo importam este módulo. Saves sem decorationMode
 * continuam como antes: decorações manuais só entram no bioma bare.
 */
import { placeableEntry } from './prop-catalog.js';

export const DECORATION_LAYERS = ['vegetacao', 'estrutura', 'decoracao', 'efeito'];

const CATEGORY_LAYER = {
  arvores: 'vegetacao',
  arbustos: 'vegetacao',
  vegetacao: 'vegetacao',
  rochas: 'vegetacao',
  terrenos: 'estrutura',
  pisos: 'estrutura',
  paredes: 'estrutura',
  portas: 'estrutura',
  pontes: 'estrutura',
  construcoes: 'estrutura',
  ruinas: 'estrutura',
  tochas: 'efeito',
  fogueiras: 'efeito',
  iluminacao: 'efeito',
};

/** true quando o runtime deve desenhar a lista manual junto do que o bioma já desenha. */
export function manualsVisibleInPlay(propsKind, decorationMode) {
  if (decorationMode === 'overlay') return true;
  return propsKind === 'bare';
}

export function layerForDecoration(decoration) {
  const explicit = decoration?.layer;
  if (DECORATION_LAYERS.includes(explicit)) return explicit;
  const entry = placeableEntry(decoration?.pack, decoration?.key);
  return CATEGORY_LAYER[entry?.category] || 'decoracao';
}
