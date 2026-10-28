/** Arena somente 3D. Se o WebGL falhar, cai no 2D sem toggle de UI. */
export function createArena(root, hooks) {
  let scene2d = null;
  let scene3d = null;
  let failed3d = false;
  const state = { zone: null, hero: null, target: null, zoneThemes: null };

  async function ensureScenes() {
    if (!scene2d) {
      const { createScene } = await import('./scene.js');
      scene2d = createScene(root, hooks);
    }
    if (scene3d || failed3d) return;
    try {
      const { createScene3D } = await import('./scene3d.js');
      scene3d = createScene3D(root, hooks);
    } catch (err) {
      console.warn('3D indisponível, usando fallback 2D:', err);
      failed3d = true;
    }
  }

  function current() {
    return scene3d || scene2d;
  }

  async function activate() {
    await ensureScenes();
    const use3d = Boolean(scene3d);
    root.classList.toggle('is-3d', use3d);
    root.classList.add('arena--3d-only');
    scene3d?.setActive(use3d);
    if (use3d) scene2d?.clearQueue?.();
    const s = current();
    if (!s) return;
    if (state.zoneThemes) s.setZoneThemes?.(state.zoneThemes);
    if (state.hero) s.setHero(...state.hero);
    s.setZone(state.zone);
    if (state.zone) s.setMonster(state.target, false);
  }

  const ready = activate();

  return {
    ready,
    play(events, finalTarget) {
      state.target = finalTarget;
      current()?.play(events, finalTarget);
    },
    setZone(zone) {
      state.zone = zone;
      current()?.setZone(zone);
    },
    setZoneThemes(map) {
      state.zoneThemes = map;
      current()?.setZoneThemes?.(map);
    },
    setHero(classId, hp, maxHp, equipment, appearance, petId) {
      state.hero = [classId, hp, maxHp, equipment, appearance, petId];
      current()?.setHero(classId, hp, maxHp, equipment, appearance, petId);
    },
    setMonster(target, animate) {
      state.target = target;
      current()?.setMonster(target, animate);
    },
    /** Aba oculta — não usa setActive(false). */
    setRenderSuspended(on) {
      scene3d?.setRenderSuspended?.(on);
    },
    /** Destruição definitiva (não é troca de zona). */
    destroy() {
      scene3d?.destroy?.();
      scene3d = null;
      scene2d?.destroy?.();
      scene2d = null;
    },
  };
}
