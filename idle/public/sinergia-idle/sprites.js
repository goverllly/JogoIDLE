const HERO_PALETTES = {
  GUERREIRO: { cloth: '#8c2f2a', trim: '#d9b45a', skin: '#e2b48c', hair: '#3a2416' },
  MAGO: { cloth: '#3b3f8f', trim: '#9fd6ff', skin: '#e9c3a0', hair: '#d8d8e6' },
  ARQUEIRO: { cloth: '#2f6b3e', trim: '#c9a227', skin: '#dcae86', hair: '#6b3e1e' },
};

function heroWeapon(classId, p) {
  if (classId === 'GUERREIRO') {
    return `
      <g class="weapon">
        <rect x="86" y="40" width="6" height="62" rx="2" fill="#cfd8dc" stroke="#7a8a90" stroke-width="1.5"/>
        <rect x="78" y="98" width="22" height="6" rx="2" fill="${p.trim}"/>
        <rect x="86" y="104" width="6" height="14" rx="2" fill="#5a3a22"/>
      </g>
      <path d="M22 78 q-8 22 6 42 l18 -6 q-10 -18 -4 -38z" fill="${p.trim}" stroke="#6b5420" stroke-width="2"/>`;
  }
  if (classId === 'MAGO') {
    return `
      <g class="weapon">
        <rect x="88" y="34" width="5" height="104" rx="2" fill="#6b4a2b"/>
        <circle class="orb-glow" cx="90.5" cy="30" r="11" fill="${p.trim}" opacity="0.35"/>
        <circle cx="90.5" cy="30" r="6.5" fill="#e8f6ff"/>
      </g>
      <path d="M42 22 L60 -4 L78 22 Z" fill="${p.cloth}" stroke="${p.trim}" stroke-width="2"/>`;
  }
  return `
    <g class="weapon">
      <path d="M92 40 q24 40 0 80" fill="none" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/>
      <line x1="92" y1="40" x2="92" y2="120" stroke="#e8e0c8" stroke-width="1.2"/>
    </g>
    <path d="M40 30 q20 -26 40 0 v8 h-40z" fill="${p.cloth}"/>`;
}

export function heroSvg(classId) {
  const p = HERO_PALETTES[classId] || HERO_PALETTES.GUERREIRO;
  const robe = classId === 'MAGO';
  return `
  <svg viewBox="0 -10 120 170" class="sprite hero-sprite" aria-hidden="true">
    <ellipse cx="60" cy="156" rx="34" ry="6" fill="rgba(0,0,0,0.35)"/>
    ${robe
      ? `<path d="M40 70 L28 150 H92 L80 70 Z" fill="${p.cloth}" stroke="${p.trim}" stroke-width="2"/>`
      : `<rect x="44" y="108" width="12" height="44" rx="4" fill="#2a2a2a"/>
         <rect x="64" y="108" width="12" height="44" rx="4" fill="#2a2a2a"/>`}
    <path d="M38 64 q22 -10 44 0 l4 50 h-52z" fill="${p.cloth}" stroke="${p.trim}" stroke-width="2"/>
    <rect x="38" y="104" width="44" height="6" fill="${p.trim}"/>
    <circle cx="60" cy="40" r="17" fill="${p.skin}"/>
    <path d="M43 38 q4 -20 17 -20 q13 0 17 20 q-6 -8 -17 -8 q-11 0 -17 8z" fill="${p.hair}"/>
    <circle cx="66" cy="42" r="2" fill="#1b1b1b"/>
    <rect x="80" y="70" width="10" height="34" rx="5" fill="${p.skin}"/>
    ${heroWeapon(classId, p)}
  </svg>`;
}

const MONSTERS = {
  'Esqueleto Errante': { kind: 'skeleton', body: '#e7e1cf', dark: '#8f8873', eye: '#7fd7ff' },
  'Saqueador Ósseo': { kind: 'zombie', body: '#a9a08a', dark: '#5a5245', eye: '#ffef7a' },
  'Guerreiro Ósseo': { kind: 'skeleton', body: '#d8d2c0', dark: '#6f6858', eye: '#ff4a4a' },
  'Necromante Aprendiz': { kind: 'spirit', body: '#b48aff', dark: '#5a3a9e', eye: '#1b0d33' },
  'Espectro Musgoso': { kind: 'spirit', body: '#7fffc4', dark: '#2a9a6e', eye: '#0d3b2a' },
  'Guardião Espinhoso': { kind: 'plant', body: '#4f9a4a', dark: '#2b5a2a', eye: '#ff3d6e' },
  'Campeão Flamejante': { kind: 'skeleton', body: '#ffb08a', dark: '#8a3a1a', eye: '#ffd54a' },
  'Arquimago Cinzento': { kind: 'spirit', body: '#c8c0d8', dark: '#5a5068', eye: '#ff7a3d' },
  'Afogado do Pântano': { kind: 'zombie', body: '#6a7a4a', dark: '#2a3a18', eye: '#b8ff6a' },
  'Bruxo Lodoso': { kind: 'spirit', body: '#9aff7a', dark: '#2a5a18', eye: '#0d2a08' },
  'Sentinela Congelada': { kind: 'skeleton', body: '#d8ecff', dark: '#6a88aa', eye: '#7fd7ff' },
  'Caçador da Nevasca': { kind: 'zombie', body: '#e8f4ff', dark: '#6a7a90', eye: '#4f9fff' },
  'Cavaleiro do Abismo': { kind: 'skeleton', body: '#a078ff', dark: '#2a1848', eye: '#ff7aff' },
  'Lich Abissal': { kind: 'spirit', body: '#c05aff', dark: '#1a0638', eye: '#ffd54a' },
  Lobo: { kind: 'wolf', body: '#7d8590', dark: '#4b5159', eye: '#ffd54a' },
  Javali: { kind: 'boar', body: '#6e4a2e', dark: '#3f2918', eye: '#ff6b4a' },
  Zumbi: { kind: 'zombie', body: '#6f8f5a', dark: '#3c4d30', eye: '#ffef7a' },
  Esqueleto: { kind: 'skeleton', body: '#e7e1cf', dark: '#8f8873', eye: '#ff4a4a' },
  'Planta Carnívora': { kind: 'plant', body: '#4f9a4a', dark: '#2b5a2a', eye: '#ff3d6e' },
  'Espírito Verde': { kind: 'spirit', body: '#7fffc4', dark: '#2a9a6e', eye: '#0d3b2a' },
  'Hidra Jovem': { kind: 'hydra', body: '#4d8a7a', dark: '#24493f', eye: '#ffd54a' },
  'Hidra Anciã': { kind: 'hydra', body: '#8a5a9e', dark: '#432a50', eye: '#ffb347' },
};

const SHAPES = {
  wolf: (c) => `
    <ellipse cx="80" cy="150" rx="60" ry="7" fill="rgba(0,0,0,0.35)"/>
    <path d="M140 92 q22 -18 18 -40 q-10 18 -24 26z" fill="${c.dark}"/>
    <ellipse cx="88" cy="100" rx="52" ry="26" fill="${c.body}"/>
    <rect x="50" y="110" width="11" height="38" rx="4" fill="${c.dark}"/>
    <rect x="70" y="112" width="11" height="36" rx="4" fill="${c.body}"/>
    <rect x="104" y="112" width="11" height="36" rx="4" fill="${c.dark}"/>
    <rect x="122" y="110" width="11" height="38" rx="4" fill="${c.body}"/>
    <path d="M44 70 L8 92 L42 104 Z" fill="${c.body}"/>
    <circle cx="46" cy="82" r="22" fill="${c.body}"/>
    <path d="M36 62 L42 42 L52 62Z M52 60 L62 42 L66 64Z" fill="${c.dark}"/>
    <circle cx="36" cy="80" r="3.5" fill="${c.eye}"/>
    <path d="M12 94 l6 6 l5 -6 l5 6" stroke="#fff" stroke-width="2" fill="none"/>`,
  boar: (c) => `
    <ellipse cx="80" cy="150" rx="62" ry="7" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="90" cy="100" rx="58" ry="36" fill="${c.body}"/>
    <path d="M60 66 q30 -22 70 0" stroke="${c.dark}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <rect x="52" y="118" width="14" height="30" rx="4" fill="${c.dark}"/>
    <rect x="112" y="118" width="14" height="30" rx="4" fill="${c.dark}"/>
    <ellipse cx="38" cy="104" rx="28" ry="24" fill="${c.body}"/>
    <ellipse cx="16" cy="110" rx="12" ry="10" fill="${c.dark}"/>
    <path d="M22 118 q-8 -16 -18 -22 M34 122 q-4 -18 -14 -26" stroke="#f4ecd8" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="94" r="3.5" fill="${c.eye}"/>`,
  zombie: (c) => `
    <ellipse cx="80" cy="152" rx="40" ry="7" fill="rgba(0,0,0,0.35)"/>
    <rect x="62" y="108" width="14" height="44" rx="4" fill="#3d3a33"/>
    <rect x="84" y="108" width="14" height="44" rx="4" fill="#3d3a33"/>
    <path d="M56 62 h48 l6 50 h-60z" fill="#5a5245"/>
    <path d="M60 72 L14 82 L16 92 L60 86Z" fill="${c.body}"/>
    <path d="M62 92 L18 100 L20 110 L62 104Z" fill="${c.dark}"/>
    <circle cx="80" cy="44" r="20" fill="${c.body}"/>
    <path d="M64 36 q8 -12 22 -10" stroke="${c.dark}" stroke-width="4" fill="none"/>
    <circle cx="70" cy="46" r="3.5" fill="${c.eye}"/>
    <circle cx="84" cy="44" r="2.5" fill="${c.eye}"/>
    <path d="M66 56 h16" stroke="#2a2a20" stroke-width="3"/>`,
  skeleton: (c) => `
    <ellipse cx="80" cy="152" rx="38" ry="7" fill="rgba(0,0,0,0.35)"/>
    <path d="M68 108 v42 M92 108 v42" stroke="${c.body}" stroke-width="7" stroke-linecap="round"/>
    <rect x="76" y="62" width="8" height="48" fill="${c.body}"/>
    <path d="M62 72 h36 M60 82 h40 M62 92 h36" stroke="${c.body}" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 70 L32 96 M98 70 L120 50" stroke="${c.body}" stroke-width="6" stroke-linecap="round"/>
    <path d="M120 50 L134 10" stroke="#9aa4a8" stroke-width="5" stroke-linecap="round"/>
    <rect x="114" y="46" width="14" height="5" fill="${c.dark}" transform="rotate(-20 121 48)"/>
    <circle cx="80" cy="40" r="19" fill="${c.body}"/>
    <rect x="70" y="52" width="20" height="10" rx="2" fill="${c.body}"/>
    <circle cx="72" cy="40" r="5" fill="#1a1a1a"/><circle cx="88" cy="40" r="5" fill="#1a1a1a"/>
    <circle cx="72" cy="40" r="2" fill="${c.eye}"/><circle cx="88" cy="40" r="2" fill="${c.eye}"/>
    <path d="M74 56 v6 M80 56 v6 M86 56 v6" stroke="#1a1a1a" stroke-width="1.5"/>`,
  plant: (c) => `
    <ellipse cx="80" cy="152" rx="44" ry="7" fill="rgba(0,0,0,0.35)"/>
    <path d="M50 150 q-20 -20 -30 -6 q14 0 30 10z M110 150 q20 -20 30 -6 q-14 0 -30 10z" fill="${c.dark}"/>
    <path d="M80 150 q-14 -40 4 -78" stroke="${c.dark}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M36 54 q44 -50 88 0 q-44 10 -88 0z" fill="${c.body}"/>
    <path d="M36 58 q44 50 88 0 q-44 -6 -88 0z" fill="#8f1f3a"/>
    <path d="M44 56 l6 10 l6 -10 l6 10 l6 -10 l6 10 l6 -10 l6 10 l6 -10 l6 10 l6 -10 l6 10" stroke="#fff" stroke-width="2" fill="none"/>
    <circle cx="66" cy="38" r="4" fill="${c.eye}"/><circle cx="94" cy="38" r="4" fill="${c.eye}"/>`,
  spirit: (c) => `
    <ellipse cx="80" cy="152" rx="34" ry="6" fill="rgba(0,0,0,0.25)"/>
    <path d="M40 120 q0 -90 40 -90 q40 0 40 90 l-10 -10 l-10 12 l-10 -12 l-10 12 l-10 -12 l-10 12z"
      fill="${c.body}" opacity="0.75"/>
    <path d="M52 112 q0 -60 28 -66" stroke="#fff" stroke-width="3" opacity="0.35" fill="none"/>
    <ellipse cx="68" cy="66" rx="6" ry="9" fill="${c.eye}"/>
    <ellipse cx="92" cy="66" rx="6" ry="9" fill="${c.eye}"/>
    <ellipse cx="80" cy="90" rx="8" ry="5" fill="${c.eye}" opacity="0.8"/>`,
  hydra: (c) => `
    <ellipse cx="90" cy="152" rx="64" ry="8" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="100" cy="122" rx="54" ry="28" fill="${c.body}"/>
    <path d="M150 124 q28 6 20 -22" stroke="${c.dark}" stroke-width="10" fill="none" stroke-linecap="round"/>
    ${[
      { x: 40, y: 34, bend: -20 },
      { x: 76, y: 14, bend: 0 },
      { x: 112, y: 32, bend: 20 },
    ]
      .map(
        (h) => `
      <path d="M100 110 Q${h.x + h.bend} 80 ${h.x + 10} ${h.y + 14}" stroke="${c.body}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <ellipse cx="${h.x}" cy="${h.y + 10}" rx="18" ry="12" fill="${c.body}" stroke="${c.dark}" stroke-width="2"/>
      <path d="M${h.x - 18} ${h.y + 12} l8 4 l4 -4 l4 4" stroke="#fff" stroke-width="1.6" fill="none"/>
      <circle cx="${h.x - 4}" cy="${h.y + 6}" r="3" fill="${c.eye}"/>
      <path d="M${h.x + 4} ${h.y - 2} l8 -10 l-1 12z" fill="${c.dark}"/>`,
      )
      .join('')}
    <path d="M70 120 q30 14 60 0" stroke="${c.dark}" stroke-width="3" fill="none"/>`,
};

export function monsterSvg(name) {
  const c = MONSTERS[name] || MONSTERS.Lobo;
  return `
  <svg viewBox="0 -10 180 170" class="sprite monster-sprite monster-${c.kind}" aria-hidden="true">
    ${SHAPES[c.kind](c)}
  </svg>`;
}

export function isRangedClass(classId) {
  return classId === 'ARQUEIRO' || classId === 'MAGO';
}
