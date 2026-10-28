const SETTINGS_KEY = 'wyd_idle_audio';

const ZONE_SCALES = {
  floresta: { root: 196, steps: [0, 2, 4, 7, 9, 12], wave: 'triangle' },
  cemiterio: { root: 146.8, steps: [0, 3, 5, 6, 10, 12], wave: 'sine' },
  jardim: { root: 174.6, steps: [0, 2, 3, 7, 8, 12], wave: 'triangle' },
  pantano: { root: 155.6, steps: [0, 3, 5, 7, 10, 12], wave: 'sine' },
  hidra: { root: 130.8, steps: [0, 1, 5, 7, 8, 12], wave: 'sawtooth' },
  gelo: { root: 233.1, steps: [0, 2, 5, 7, 9, 12], wave: 'sine' },
  abismo: { root: 110, steps: [0, 1, 4, 6, 8, 11], wave: 'sawtooth' },
};

/**
 * Camada procedural por zona (em cima do loop WAV `amb_*`).
 * Cada área tem filtro distinto + eventos de ambientação.
 */
const ZONE_AMBIENCE = {
  floresta: {
    noise: 0.018,
    filter: 'bandpass',
    freq: 1600,
    q: 0.55,
    sampleGain: 0.55,
    events: [
      { kind: 'chirp', min: 1400, max: 3200 },
      { kind: 'rustle', min: 2200, max: 5000 },
      { kind: 'bird', min: 3500, max: 8000 },
    ],
  },
  cemiterio: {
    noise: 0.028,
    filter: 'lowpass',
    freq: 360,
    q: 0.7,
    sampleGain: 0.62,
    events: [
      { kind: 'howl', min: 4500, max: 9000 },
      { kind: 'creak', min: 3000, max: 7000 },
      { kind: 'whisper', min: 5000, max: 11000 },
    ],
  },
  jardim: {
    noise: 0.016,
    filter: 'bandpass',
    freq: 980,
    q: 0.6,
    sampleGain: 0.5,
    events: [
      { kind: 'chime', min: 2200, max: 4800 },
      { kind: 'insect', min: 900, max: 2200 },
      { kind: 'breeze', min: 2800, max: 6000 },
    ],
  },
  pantano: {
    noise: 0.03,
    filter: 'lowpass',
    freq: 260,
    q: 0.5,
    sampleGain: 0.58,
    events: [
      { kind: 'drip', min: 600, max: 1500 },
      { kind: 'bubble', min: 1400, max: 3200 },
      { kind: 'frog', min: 2500, max: 5500 },
    ],
  },
  hidra: {
    noise: 0.034,
    filter: 'lowpass',
    freq: 200,
    q: 0.45,
    sampleGain: 0.6,
    events: [
      { kind: 'crackle', min: 160, max: 380 },
      { kind: 'ember', min: 800, max: 1800 },
      { kind: 'rumble', min: 2800, max: 5200 },
    ],
  },
  gelo: {
    noise: 0.022,
    filter: 'highpass',
    freq: 1600,
    q: 0.55,
    sampleGain: 0.52,
    events: [
      { kind: 'wind', min: 1800, max: 3600 },
      { kind: 'crystal', min: 2200, max: 5000 },
      { kind: 'gust', min: 3500, max: 7000 },
    ],
  },
  abismo: {
    noise: 0.04,
    filter: 'lowpass',
    freq: 90,
    q: 0.85,
    sampleGain: 0.65,
    events: [
      { kind: 'pulse', min: 1400, max: 2600 },
      { kind: 'drone', min: 3000, max: 6000 },
      { kind: 'rift', min: 4500, max: 9000 },
    ],
  },
};

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let ambBus = null;
let noiseBuffer = null;
let samples = {};
let music = null;
let ambience = null;

const settings = Object.assign(
  { muted: false, sfx: 0.7, music: 0.4 },
  JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'),
);

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.05);
  sfxBus.gain.setTargetAtTime(settings.sfx, t, 0.05);
  musicBus.gain.setTargetAtTime(settings.music, t, 0.2);
  ambBus.gain.setTargetAtTime(settings.music * 1.15, t, 0.2);
}

function makeNoise() {
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

async function loadManifest() {
  try {
    const res = await fetch('/jogo-idle/assets/sfx/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    await Promise.all(
      Object.entries(manifest).map(async ([name, file]) => {
        const r = await fetch(`/jogo-idle/assets/sfx/${file}`);
        if (!r.ok) return;
        samples[name] = await ctx.decodeAudioData(await r.arrayBuffer());
      }),
    );
    // Se já estava numa zona, reinicia para incluir o loop WAV.
    if (ambience?.zoneId && samples[`amb_${ambience.zoneId}`]) {
      const id = ambience.zoneId;
      startAmbience(id);
    }
  } catch {
    /* sem manifest: só sons sintetizados */
  }
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  ambBus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  sfxBus.connect(master);
  musicBus.connect(master);
  ambBus.connect(master);
  master.connect(comp).connect(ctx.destination);
  noiseBuffer = makeNoise();
  applyVolumes();
  loadManifest();
}

function env(node, t, attack, peak, decay) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone({ freq, to, type = 'sine', dur = 0.2, gain = 0.3, delay = 0, dest = sfxBus }) {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  env(g, t, 0.005, gain, dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise({ dur = 0.15, gain = 0.3, filter = 'bandpass', freq = 1200, to, q = 1, delay = 0, dest = sfxBus }) {
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  const g = ctx.createGain();
  env(g, t, 0.004, gain, dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function playSample(name, gain = 1) {
  const buf = samples[name];
  if (!buf) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.95 + Math.random() * 0.1;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(sfxBus);
  src.start();
  return true;
}

const SYNTH = {
  swing() {
    noise({ dur: 0.14, gain: 0.22, freq: 700, to: 2200, q: 0.8 });
  },
  slash() {
    noise({ dur: 0.11, gain: 0.28, freq: 900, to: 3200, q: 1.1 });
    tone({ freq: 420, to: 180, type: 'sawtooth', dur: 0.08, gain: 0.06 });
  },
  heavy() {
    noise({ dur: 0.22, gain: 0.4, filter: 'lowpass', freq: 900, to: 180 });
    tone({ freq: 90, to: 40, type: 'sine', dur: 0.22, gain: 0.4 });
    tone({ freq: 180, to: 70, type: 'triangle', dur: 0.16, gain: 0.12, delay: 0.02 });
  },
  punch() {
    noise({ dur: 0.08, gain: 0.3, filter: 'lowpass', freq: 700, to: 160 });
    tone({ freq: 140, to: 55, type: 'sine', dur: 0.1, gain: 0.28 });
  },
  arrow() {
    noise({ dur: 0.12, gain: 0.18, freq: 3000, to: 900, q: 4 });
    tone({ freq: 900, to: 500, type: 'triangle', dur: 0.08, gain: 0.05 });
  },
  crossbow() {
    noise({ dur: 0.06, gain: 0.22, freq: 2400, to: 700, q: 3 });
    tone({ freq: 280, to: 90, type: 'square', dur: 0.07, gain: 0.08 });
    noise({ dur: 0.18, gain: 0.12, freq: 1800, to: 400, q: 1.4, delay: 0.04 });
  },
  crossbow_heavy() {
    noise({ dur: 0.08, gain: 0.28, freq: 1600, to: 500, q: 2 });
    tone({ freq: 160, to: 50, type: 'sawtooth', dur: 0.12, gain: 0.14 });
    noise({ dur: 0.22, gain: 0.16, freq: 1200, to: 250, q: 1, delay: 0.05 });
  },
  magic() {
    tone({ freq: 440, to: 1320, type: 'sine', dur: 0.25, gain: 0.14 });
    tone({ freq: 660, to: 1760, type: 'triangle', dur: 0.22, gain: 0.07, delay: 0.03 });
  },
  wand() {
    tone({ freq: 880, to: 1760, type: 'sine', dur: 0.16, gain: 0.1 });
    tone({ freq: 1320, to: 990, type: 'triangle', dur: 0.2, gain: 0.06, delay: 0.02 });
    noise({ dur: 0.1, gain: 0.08, freq: 4000, to: 1200, q: 2 });
  },
  staff() {
    tone({ freq: 220, to: 660, type: 'sine', dur: 0.28, gain: 0.16 });
    tone({ freq: 330, to: 990, type: 'triangle', dur: 0.32, gain: 0.1, delay: 0.04 });
    noise({ dur: 0.18, gain: 0.12, filter: 'highpass', freq: 2000, q: 0.8 });
  },
  hit() {
    noise({ dur: 0.09, gain: 0.35, filter: 'lowpass', freq: 1800, to: 300 });
    tone({ freq: 160, to: 60, type: 'sine', dur: 0.12, gain: 0.35 });
  },
  crit() {
    noise({ dur: 0.14, gain: 0.45, filter: 'highpass', freq: 1500, q: 0.7 });
    tone({ freq: 220, to: 55, type: 'square', dur: 0.18, gain: 0.18 });
    tone({ freq: 1200, to: 1800, type: 'triangle', dur: 0.1, gain: 0.08, delay: 0.02 });
  },
  hurt() {
    tone({ freq: 110, to: 70, type: 'sawtooth', dur: 0.14, gain: 0.12 });
    noise({ dur: 0.07, gain: 0.15, filter: 'lowpass', freq: 600 });
  },
  kill() {
    tone({ freq: 300, to: 80, type: 'sawtooth', dur: 0.35, gain: 0.12 });
    noise({ dur: 0.3, gain: 0.15, filter: 'lowpass', freq: 900, to: 150 });
  },
  coin() {
    tone({ freq: 1318, type: 'square', dur: 0.07, gain: 0.06 });
    tone({ freq: 1976, type: 'square', dur: 0.16, gain: 0.06, delay: 0.07 });
  },
  drop(rarity = 'common') {
    const chords = {
      common: [523, 659],
      uncommon: [523, 659, 784],
      rare: [587, 740, 880],
      epic: [659, 831, 988, 1175],
      legendary: [523, 659, 784, 1046, 1318],
    };
    (chords[rarity] || chords.common).forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.28, gain: 0.1, delay: i * 0.045 }),
    );
  },
  equip() {
    tone({ freq: 392, to: 784, type: 'triangle', dur: 0.12, gain: 0.1 });
    tone({ freq: 523, type: 'sine', dur: 0.16, gain: 0.08, delay: 0.06 });
  },
  sell() {
    tone({ freq: 880, to: 440, type: 'square', dur: 0.12, gain: 0.07 });
    tone({ freq: 1318, type: 'square', dur: 0.08, gain: 0.05, delay: 0.08 });
  },
  levelup() {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.35, gain: 0.16, delay: i * 0.09 }),
    );
    tone({ freq: 1568, type: 'sine', dur: 0.8, gain: 0.08, delay: 0.36 });
  },
  spawn() {
    noise({ dur: 0.25, gain: 0.08, filter: 'lowpass', freq: 200, to: 900 });
  },
  faint() {
    [392, 311, 233, 175].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.12, delay: i * 0.14 }),
    );
  },
  click() {
    tone({ freq: 880, to: 660, type: 'triangle', dur: 0.05, gain: 0.07 });
  },
  skill_shield() {
    noise({ dur: 0.1, gain: 0.2, filter: 'lowpass', freq: 1200, to: 400 });
    tone({ freq: 520, to: 260, type: 'triangle', dur: 0.14, gain: 0.12 });
  },
  skill_dash() {
    noise({ dur: 0.16, gain: 0.32, freq: 400, to: 1800, q: 1 });
    tone({ freq: 110, to: 55, type: 'sine', dur: 0.18, gain: 0.28 });
  },
  skill_taunt() {
    tone({ freq: 180, to: 320, type: 'sawtooth', dur: 0.22, gain: 0.14 });
    tone({ freq: 240, to: 160, type: 'triangle', dur: 0.2, gain: 0.1, delay: 0.05 });
  },
  skill_cleave() {
    noise({ dur: 0.12, gain: 0.3, freq: 800, to: 200 });
    tone({ freq: 200, to: 80, type: 'sawtooth', dur: 0.12, gain: 0.1 });
  },
  skill_roar() {
    noise({ dur: 0.35, gain: 0.35, filter: 'lowpass', freq: 500, to: 120 });
    tone({ freq: 90, to: 45, type: 'sawtooth', dur: 0.4, gain: 0.22 });
    tone({ freq: 140, to: 70, type: 'triangle', dur: 0.3, gain: 0.1, delay: 0.04 });
  },
  skill_massacre() {
    noise({ dur: 0.2, gain: 0.45, filter: 'highpass', freq: 900, q: 0.6 });
    tone({ freq: 160, to: 40, type: 'square', dur: 0.22, gain: 0.16 });
    tone({ freq: 900, to: 1400, type: 'triangle', dur: 0.12, gain: 0.08, delay: 0.03 });
  },
  skill_bolts() {
    [880, 1100, 1320].forEach((f, i) =>
      tone({ freq: f, to: f * 1.4, type: 'sine', dur: 0.1, gain: 0.09, delay: i * 0.05 }),
    );
  },
  skill_nova() {
    tone({ freq: 330, to: 990, type: 'sine', dur: 0.35, gain: 0.14 });
    tone({ freq: 495, to: 1320, type: 'triangle', dur: 0.4, gain: 0.1, delay: 0.04 });
    noise({ dur: 0.25, gain: 0.12, filter: 'highpass', freq: 2000 });
  },
  skill_drain() {
    tone({ freq: 660, to: 220, type: 'sine', dur: 0.3, gain: 0.12 });
    tone({ freq: 440, to: 880, type: 'triangle', dur: 0.28, gain: 0.08, delay: 0.06 });
  },
  skill_rapid() {
    [0, 0.06].forEach((d) => {
      noise({ dur: 0.06, gain: 0.18, freq: 2400, to: 700, q: 3, delay: d });
      tone({ freq: 700, to: 400, type: 'triangle', dur: 0.06, gain: 0.05, delay: d });
    });
  },
  skill_pierce() {
    noise({ dur: 0.14, gain: 0.22, freq: 3500, to: 600, q: 5 });
    tone({ freq: 1200, to: 400, type: 'triangle', dur: 0.12, gain: 0.08 });
  },
  skill_rain() {
    [0, 0.05, 0.1, 0.15].forEach((d) =>
      noise({ dur: 0.07, gain: 0.14, freq: 2000 - d * 2000, to: 500, q: 2, delay: d }),
    );
  },
};

export function sfx(name, opts = {}) {
  if (!ctx || settings.muted) return;
  if (playSample(name, opts.gain ?? 1)) return;
  if (name === 'drop') {
    SYNTH.drop(opts.rarity);
    return;
  }
  SYNTH[name]?.(opts);
}

function scheduleMusicNote(m) {
  const { root, steps, wave } = m.scale;
  const t = ctx.currentTime + 0.05;
  const step = steps[Math.floor(Math.random() * steps.length)];
  const freq = root * 2 * Math.pow(2, step / 12);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1400;
  osc.type = wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  osc.connect(f).connect(g).connect(m.out);
  osc.start(t);
  osc.stop(t + 2.8);
}

function playAmbEvent(kind) {
  switch (kind) {
    case 'chirp': {
      const f0 = 1800 + Math.random() * 1600;
      tone({ freq: f0, to: f0 * (0.65 + Math.random() * 0.5), type: 'sine', dur: 0.11, gain: 0.035, dest: ambBus });
      break;
    }
    case 'bird': {
      const f0 = 2200 + Math.random() * 1200;
      tone({ freq: f0, to: f0 * 1.35, type: 'sine', dur: 0.08, gain: 0.04, dest: ambBus });
      tone({ freq: f0 * 1.2, to: f0 * 0.85, type: 'sine', dur: 0.1, gain: 0.028, delay: 0.09, dest: ambBus });
      break;
    }
    case 'rustle':
      noise({ dur: 0.35, gain: 0.04, filter: 'bandpass', freq: 1400, to: 700, q: 0.7, dest: ambBus });
      break;
    case 'howl':
      tone({ freq: 95, to: 68, type: 'sine', dur: 1.8, gain: 0.045, dest: ambBus });
      noise({ dur: 1.4, gain: 0.035, filter: 'lowpass', freq: 200, dest: ambBus });
      break;
    case 'creak':
      tone({ freq: 160, to: 110, type: 'sawtooth', dur: 0.55, gain: 0.03, dest: ambBus });
      noise({ dur: 0.4, gain: 0.025, filter: 'bandpass', freq: 500, q: 1.2, dest: ambBus });
      break;
    case 'whisper':
      noise({ dur: 1.1, gain: 0.03, filter: 'bandpass', freq: 900, to: 1400, q: 0.5, dest: ambBus });
      tone({ freq: 220, to: 180, type: 'sine', dur: 0.9, gain: 0.015, dest: ambBus });
      break;
    case 'chime':
      tone({ freq: 988, type: 'sine', dur: 0.9, gain: 0.028, dest: ambBus });
      tone({ freq: 1318, type: 'sine', dur: 0.75, gain: 0.02, delay: 0.12, dest: ambBus });
      tone({ freq: 1568, type: 'triangle', dur: 0.6, gain: 0.012, delay: 0.22, dest: ambBus });
      break;
    case 'insect':
      tone({ freq: 4200 + Math.random() * 800, type: 'square', dur: 0.05, gain: 0.012, dest: ambBus });
      tone({ freq: 3800 + Math.random() * 600, type: 'square', dur: 0.04, gain: 0.01, delay: 0.06, dest: ambBus });
      break;
    case 'breeze':
      noise({ dur: 1.2, gain: 0.03, filter: 'bandpass', freq: 1100, to: 600, q: 0.4, dest: ambBus });
      break;
    case 'drip':
      tone({ freq: 1400, to: 380, type: 'sine', dur: 0.09, gain: 0.045, dest: ambBus });
      noise({ dur: 0.12, gain: 0.04, filter: 'lowpass', freq: 800, dest: ambBus });
      break;
    case 'bubble':
      tone({ freq: 220 + Math.random() * 80, to: 90, type: 'sine', dur: 0.22, gain: 0.035, dest: ambBus });
      noise({ dur: 0.18, gain: 0.03, filter: 'lowpass', freq: 400, dest: ambBus });
      break;
    case 'frog':
      tone({ freq: 140, to: 90, type: 'triangle', dur: 0.18, gain: 0.04, dest: ambBus });
      tone({ freq: 160, to: 100, type: 'triangle', dur: 0.14, gain: 0.03, delay: 0.16, dest: ambBus });
      break;
    case 'crackle':
      noise({
        dur: 0.06 + Math.random() * 0.1,
        gain: 0.055,
        filter: 'highpass',
        freq: 2200,
        q: 0.6,
        dest: ambBus,
      });
      break;
    case 'ember':
      noise({ dur: 0.25, gain: 0.04, filter: 'bandpass', freq: 1800, to: 900, q: 0.8, dest: ambBus });
      tone({ freq: 90, to: 60, type: 'sine', dur: 0.3, gain: 0.02, dest: ambBus });
      break;
    case 'rumble':
      tone({ freq: 48, to: 36, type: 'sine', dur: 1.2, gain: 0.055, dest: ambBus });
      noise({ dur: 1, gain: 0.03, filter: 'lowpass', freq: 140, dest: ambBus });
      break;
    case 'wind':
      noise({ dur: 1.5, gain: 0.045, filter: 'bandpass', freq: 2400, to: 900, q: 0.4, dest: ambBus });
      break;
    case 'crystal':
      tone({ freq: 2100 + Math.random() * 900, type: 'sine', dur: 0.2, gain: 0.03, dest: ambBus });
      tone({ freq: 2800 + Math.random() * 600, type: 'triangle', dur: 0.25, gain: 0.02, delay: 0.05, dest: ambBus });
      break;
    case 'gust':
      noise({ dur: 0.9, gain: 0.05, filter: 'highpass', freq: 1200, to: 2800, q: 0.5, dest: ambBus });
      break;
    case 'pulse':
      tone({ freq: 52, to: 38, type: 'sine', dur: 1.15, gain: 0.07, dest: ambBus });
      tone({ freq: 78, to: 52, type: 'triangle', dur: 0.95, gain: 0.035, dest: ambBus });
      break;
    case 'drone':
      tone({ freq: 65, type: 'sine', dur: 1.6, gain: 0.04, dest: ambBus });
      tone({ freq: 97.5, type: 'sine', dur: 1.4, gain: 0.025, delay: 0.1, dest: ambBus });
      break;
    case 'rift':
      noise({ dur: 1.3, gain: 0.04, filter: 'lowpass', freq: 180, to: 80, dest: ambBus });
      tone({ freq: 40, to: 28, type: 'sawtooth', dur: 1.1, gain: 0.03, dest: ambBus });
      break;
    default:
      break;
  }
}

function startAmbience(zoneId) {
  stopAmbience();
  const cfg = ZONE_AMBIENCE[zoneId];
  if (!cfg || !ctx) return;

  const nodes = [];
  const timers = [];
  const now = ctx.currentTime;

  // Loop WAV dedicado da zona (quando carregado).
  const loopBuf = samples[`amb_${zoneId}`];
  if (loopBuf) {
    const src = ctx.createBufferSource();
    src.buffer = loopBuf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(cfg.sampleGain ?? 0.5, now + 1.2);
    src.connect(g).connect(ambBus);
    src.start();
    nodes.push({ src, g });
  }

  // Camada contínua de ruído filtrado (fallback + textura extra).
  const bed = ctx.createBufferSource();
  bed.buffer = noiseBuffer;
  bed.loop = true;
  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = cfg.filter;
  bedFilter.frequency.value = cfg.freq;
  bedFilter.Q.value = cfg.q;
  const bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, now);
  bedGain.gain.exponentialRampToValueAtTime(cfg.noise, now + 0.8);
  // LFO leve no filtro para o ambiente “respirar”.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07 + Math.random() * 0.05;
  lfoGain.gain.value = cfg.freq * 0.18;
  lfo.connect(lfoGain).connect(bedFilter.frequency);
  lfo.start();
  bed.connect(bedFilter).connect(bedGain).connect(ambBus);
  bed.start();
  nodes.push({ src: bed, g: bedGain, lfo });

  const schedule = (fn, min, max) => {
    const loop = () => {
      if (!ambience || ambience.zoneId !== zoneId) return;
      fn();
      timers.push(setTimeout(loop, min + Math.random() * (max - min)));
    };
    timers.push(setTimeout(loop, 500 + Math.random() * 1200));
  };

  for (const ev of cfg.events || []) {
    schedule(() => playAmbEvent(ev.kind), ev.min, ev.max);
  }

  ambience = { zoneId, nodes, timers };
}

function stopAmbience() {
  if (!ambience) return;
  const t = ctx?.currentTime ?? 0;
  for (const node of ambience.nodes || []) {
    try {
      if (node.g) {
        node.g.gain.cancelScheduledValues(t);
        node.g.gain.setTargetAtTime(0.0001, t, 0.25);
      }
      node.src.stop(t + 0.6);
      node.lfo?.stop(t + 0.6);
    } catch {
      /* already stopped */
    }
  }
  // legado: src único
  if (ambience.src) {
    try {
      ambience.src.stop();
    } catch {
      /* already stopped */
    }
  }
  ambience.timers.forEach(clearTimeout);
  ambience = null;
}

export function playZoneMusic(zoneId) {
  if (!ctx) return;
  if (music?.zoneId === zoneId) {
    if (ambience?.zoneId !== zoneId) startAmbience(zoneId);
    return;
  }
  stopMusic();
  if (!zoneId) return;

  const scale = ZONE_SCALES[zoneId] || ZONE_SCALES.floresta;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2);
  out.connect(musicBus);

  const drones = [1, 1.5].map((mult) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = scale.root * mult;
    g.gain.value = 0.05;
    osc.connect(g).connect(out);
    osc.start();
    return osc;
  });

  music = { zoneId, scale, out, drones, timer: null };
  const loop = () => {
    if (!music) return;
    scheduleMusicNote(music);
    music.timer = setTimeout(loop, 900 + Math.random() * 1600);
  };
  loop();
  startAmbience(zoneId);
}

export function stopMusic() {
  if (music) {
    const m = music;
    music = null;
    clearTimeout(m.timer);
    const t = ctx.currentTime;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setTargetAtTime(0.0001, t, 0.4);
    m.drones.forEach((o) => o.stop(t + 2));
  }
  stopAmbience();
}

export function setAmbience(zoneId) {
  if (!ctx) return;
  if (!zoneId) {
    stopAmbience();
    return;
  }
  if (ambience?.zoneId === zoneId) return;
  startAmbience(zoneId);
}

export function getAudioSettings() {
  return { ...settings };
}

export function setAudioSettings(patch) {
  Object.assign(settings, patch);
  saveSettings();
  applyVolumes();
}
