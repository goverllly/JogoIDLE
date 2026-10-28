import { heroSvg, monsterSvg } from './sprites.js';
import { weaponStyle } from './weapons.js';
import { sfx } from './audio.js';
import { createTimeline, floatText, flyCoins, coinCount, levelUpBurst, shake } from './fx.js';

const MIN_GAP = {
  attack: 320,
  hurt: 160,
  kill: 520,
  drop: 0,
  spawn: 380,
  levelup: 0,
  faint: 600,
  skill_cast: 180,
  skill_hit: 260,
};

export function createScene(root, { goldTarget, onTarget = () => {}, onTargetHp = () => {}, onHeroHp = () => {} }) {
  const arena = root;
  const sky = arena.querySelector('.arena__particles');
  const heroEl = arena.querySelector('.fighter.f-hero');
  const heroBody = heroEl.querySelector('.fighter__body');
  const heroHp = heroEl.querySelector('.bar span');
  const monsterEl = arena.querySelector('.fighter.f-monster');
  const monsterBody = monsterEl.querySelector('.fighter__body');
  const monsterHp = monsterEl.querySelector('.bar span');
  const monsterName = monsterEl.querySelector('.target-plate strong');
  const monsterLevel = monsterEl.querySelector('.target-plate span');
  const fx = arena.querySelector('.arena__fx');
  const idleMsg = arena.querySelector('.arena__idle-msg');

  let classId = null;
  let style = weaponStyle(null);
  let currentMonster = null;

  function rectIn(el) {
    const a = arena.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height };
  }

  function textAt(targetEl, text, cls) {
    const r = rectIn(targetEl);
    floatText(fx, r.x, r.y - r.h * 0.35, text, cls);
  }

  function setBar(span, value, max) {
    span.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  }

  function setMonster(target, animate) {
    if (!target) {
      monsterEl.classList.add('gone');
      currentMonster = null;
      onTarget(null);
      return;
    }
    if (currentMonster !== target.name) {
      monsterBody.innerHTML = monsterSvg(target.name);
      currentMonster = target.name;
    }
    monsterName.textContent = target.name;
    monsterLevel.textContent = `Nv. ${target.level}`;
    setBar(monsterHp, target.hp, target.maxHp);
    onTarget(target);
    monsterEl.classList.remove('gone');
    if (animate) {
      monsterBody.animate(
        [
          { transform: 'translateY(40px) scale(0.7)', opacity: 0, filter: 'brightness(3)' },
          { transform: 'translateY(0) scale(1)', opacity: 1, filter: 'brightness(1)' },
        ],
        { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
      );
    }
  }

  function projectile(kind, onHit) {
    const from = rectIn(heroBody);
    const to = rectIn(monsterBody);
    const el = document.createElement('div');
    el.className = `proj ${kind}`;
    el.style.left = `${from.x + from.w * 0.3}px`;
    el.style.top = `${from.y - from.h * 0.1}px`;
    fx.appendChild(el);
    const dx = to.x - (from.x + from.w * 0.3);
    const dy = to.y - (from.y - from.h * 0.1);
    const lift = kind === 'arrow' ? -28 : -10;
    el.animate(
      [
        { transform: `translate(0,0) rotate(${kind === 'arrow' ? -12 : 0}deg)` },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) rotate(0deg)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${kind === 'arrow' ? 12 : 0}deg)` },
      ],
      { duration: 240, easing: 'linear' },
    ).onfinish = () => {
      el.remove();
      onHit();
    };
  }

  function impactSpark(crit) {
    const r = rectIn(monsterBody);
    const el = document.createElement('div');
    el.className = `spark${crit ? ' crit' : ''}`;
    el.style.left = `${r.x - r.w * 0.15}px`;
    el.style.top = `${r.y}px`;
    fx.appendChild(el);
    el.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 },
      ],
      { duration: 320, easing: 'ease-out' },
    ).onfinish = () => el.remove();
  }

  function onAttack(e) {
    const ranged = Boolean(style.projectile);
    const hit = () => {
      impactSpark(e.crit);
      sfx(e.crit ? 'crit' : 'hit');
      monsterBody.animate(
        [
          { transform: 'translateX(0)', filter: 'brightness(1)' },
          { transform: 'translateX(10px)', filter: 'brightness(2.2) saturate(0.4)' },
          { transform: 'translateX(-6px)', filter: 'brightness(1.4)' },
          { transform: 'translateX(0)', filter: 'brightness(1)' },
        ],
        { duration: 260 },
      );
      textAt(monsterBody, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? 'crit' : 'dmg');
      setBar(monsterHp, e.monsterHp, e.monsterMaxHp);
      onTargetHp(e.monsterHp, e.monsterMaxHp);
      if (e.crit) shake(arena);
    };

    if (ranged) {
      sfx(style.sound);
      heroBody.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(0)' }],
        { duration: 220, easing: 'ease-out' },
      );
      projectile(style.projectile, hit);
    } else {
      sfx(style.sound);
      heroBody.animate(
        [
          { transform: 'translateX(0) rotate(0)' },
          { transform: 'translateX(70px) rotate(6deg)', offset: 0.45 },
          { transform: 'translateX(0) rotate(0)' },
        ],
        { duration: 340, easing: 'cubic-bezier(.3,.1,.3,1)' },
      );
      timeline.later(150, hit);
    }
  }

  function onHurt(e) {
    monsterBody.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-40px)', offset: 0.4 }, { transform: 'translateX(0)' }],
      { duration: 280, easing: 'ease-out' },
    );
    timeline.later(110, () => {
      if (e.dmg > 0) {
        sfx('hurt');
        heroBody.animate(
          [
            { filter: 'brightness(1)' },
            { filter: 'brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(5)' },
            { filter: 'brightness(1)' },
          ],
          { duration: 260 },
        );
        textAt(heroBody, `-${e.dmg}`, 'hurt');
      } else {
        textAt(heroBody, 'Bloqueio', 'block');
      }
      setBar(heroHp, e.hp, e.maxHp);
      onHeroHp(e.hp, e.maxHp);
    });
  }

  function onKill(e) {
    sfx('kill');
    monsterBody.animate(
      [
        { transform: 'translateY(0) rotate(0)', opacity: 1, filter: 'brightness(1)' },
        { transform: 'translateY(-10px) rotate(-4deg)', opacity: 1, filter: 'brightness(2.5)', offset: 0.2 },
        { transform: 'translateY(30px) rotate(10deg) scale(0.8)', opacity: 0, filter: 'brightness(0.4)' },
      ],
      { duration: 480, easing: 'ease-in', fill: 'forwards' },
    );
    textAt(monsterBody, `+${e.xp} XP`, 'xp');
    const r = monsterBody.getBoundingClientRect();
    flyCoins({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, goldTarget, coinCount(e.gold));
    setBar(heroHp, 1, 1);
  }

  function onDrop(e) {
    sfx('drop', { rarity: e.rarity });
    const r = rectIn(monsterBody);
    floatText(fx, r.x, r.y + r.h * 0.2, e.autoSoldFor ? `${e.name} → ${e.autoSoldFor}g` : e.name, `drop r-${e.rarity}`);
  }

  function onSpawn(e) {
    monsterBody.getAnimations().forEach((a) => a.cancel());
    sfx('spawn');
    setMonster(
      { name: e.monster, level: e.level, hp: e.monsterHp, maxHp: e.monsterMaxHp, attack: e.attack, defense: e.defense },
      true,
    );
  }

  function onLevelUp(e) {
    sfx('levelup');
    const r = rectIn(heroBody);
    levelUpBurst(fx, r.x, r.y, e.level);
    heroBody.animate(
      [
        { filter: 'drop-shadow(0 0 0 #ffd54a)' },
        { filter: 'drop-shadow(0 0 22px #ffd54a) brightness(1.4)' },
        { filter: 'drop-shadow(0 0 0 #ffd54a)' },
      ],
      { duration: 1400 },
    );
  }

  function onFaint() {
    sfx('faint');
    heroBody.animate(
      [
        { transform: 'rotate(0) translateY(0)', opacity: 1 },
        { transform: 'rotate(-80deg) translateY(30px)', opacity: 0.5 },
      ],
      { duration: 700, easing: 'ease-in', fill: 'forwards' },
    );
    timeline.later(1800, () => heroBody.getAnimations().forEach((a) => a.cancel()));
  }

  function onSkillCast(e) {
    if (e.sfx) sfx(e.sfx);
    heroBody.animate(
      [
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.5) drop-shadow(0 0 12px #c4b8ff)' },
        { filter: 'brightness(1)' },
      ],
      { duration: 420 },
    );
  }

  function onSkillHit(e) {
    if (e.sfx) sfx(e.sfx);
    else sfx(e.crit ? 'crit' : 'hit');
    const mon = arena.querySelector('.f-monster .fighter__body');
    if (mon) {
      mon.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
        { duration: 180 },
      );
    }
    const fx = arena.querySelector('.arena__fx');
    if (fx && e.dmg) {
      const el = document.createElement('span');
      el.className = `float ${e.crit ? 'crit' : 'dmg'}`;
      el.textContent = `-${e.dmg}`;
      fx.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  const timeline = createTimeline(
    {
      attack: onAttack,
      hurt: onHurt,
      kill: onKill,
      drop: onDrop,
      spawn: onSpawn,
      levelup: onLevelUp,
      faint: onFaint,
      skill_cast: onSkillCast,
      skill_hit: onSkillHit,
    },
    { minGap: MIN_GAP },
  );

  function play(events, finalTarget) {
    timeline.play(events, () => setMonster(finalTarget, false));
  }

  function setZone(zoneId) {
    arena.dataset.zone = zoneId || 'idle';
    idleMsg.classList.toggle('hidden', Boolean(zoneId));
    if (!zoneId) {
      timeline.clear();
      setMonster(null);
    }
  }

  function setHero(id, hp, maxHp, equipment, _appearance, _petId) {
    style = weaponStyle(equipment);
    if (classId !== id) {
      heroBody.innerHTML = heroSvg(id);
      classId = id;
    }
    if (!timeline.busy()) setBar(heroHp, hp, maxHp);
  }

  for (let i = 0; i < 22; i++) {
    const p = document.createElement('span');
    p.style.setProperty('--x', `${Math.random() * 100}%`);
    p.style.setProperty('--y', `${20 + Math.random() * 70}%`);
    p.style.setProperty('--d', `${6 + Math.random() * 8}s`);
    p.style.setProperty('--delay', `${-Math.random() * 10}s`);
    sky.appendChild(p);
  }

  return { play, setZone, setHero, setMonster, clearQueue: timeline.clear };
}
