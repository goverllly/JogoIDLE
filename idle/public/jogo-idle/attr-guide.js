/**
 * Textos de orientação de atributos — espelham computeStats (sem alterar o motor).
 * FOR → ATK físico (não-Mago) + parcela de defesa; INT → MP (+ ATK mágico no Mago);
 * DES → velocidade e crítico (caps no balance); CON → HP e defesa.
 */

/** @typedef {'GUERREIRO'|'BARBARO'|'MAGO'|'ARQUEIRO'|string} ClassId */

/**
 * @param {ClassId} classId
 * @returns {{ str: string, int: string, dex: string, con: string, emphasize?: ('str'|'dex'|'con')[] }}
 */
export function getAttrHints(classId) {
  const id = String(classId || '').toUpperCase();
  const dex =
    'Velocidade de ataque e chance de crítico (respeitando os limites do jogo).';
  const con = 'Vida máxima e defesa.';
  const intBase = 'Mana (MP) máxima.';

  if (id === 'MAGO') {
    return {
      str: 'Pouco impacto no ataque mágico; parcela menor na defesa.',
      int: 'Ataque mágico e mana (MP). Fonte principal de dano do Mago.',
      dex,
      con,
      emphasize: ['int'],
    };
  }

  if (id === 'ARQUEIRO') {
    return {
      str: 'Dano físico das flechas (ataque básico). Não confundir com destreza.',
      int: intBase,
      dex: 'Velocidade de ataque e chance de crítico — não aumenta o dano básico das flechas.',
      con: 'Resistência: vida máxima e defesa.',
      emphasize: ['str', 'dex', 'con'],
    };
  }

  // Guerreiro / Bárbaro / fallback físico
  return {
    str: 'Ataque físico e parcela da defesa. Fonte principal de dano.',
    int: intBase,
    dex,
    con,
    emphasize: ['str', 'con'],
  };
}

/**
 * Aplica hints visíveis + title complementar nas linhas `.attr-row[data-stat]`.
 * @param {ParentNode | Document} root
 * @param {ClassId} classId
 */
export function applyAttrGuides(root, classId) {
  const scope = root || document;
  const hints = getAttrHints(classId);
  const emphasize = new Set(hints.emphasize || []);

  for (const key of /** @type {const} */ (['str', 'int', 'dex', 'con'])) {
    const row = scope.querySelector?.(`.attr-row[data-stat="${key}"]`);
    if (!row) continue;
    row.classList.toggle('attr-row--key', emphasize.has(key));
    const el = row.querySelector('[data-attr-hint]');
    if (el) {
      el.textContent = hints[key];
      el.hidden = false;
    }
    const titleTarget = row.querySelector('dt') || row;
    titleTarget.setAttribute('title', hints[key]);
  }
}
