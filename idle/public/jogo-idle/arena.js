/** Arena somente 3D — sem fallback SVG/2D. */
export function createArena(root, hooks) {
  let scene3d = null;
  let loadError = null;
  const state = { zone: null, hero: null, target: null, zoneThemes: null };

  function showLoadError(err) {
    loadError = err;
    root.classList.add('arena--3d-only', 'is-3d', 'arena--3d-error');
    let el = root.querySelector('.arena__3d-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'arena__3d-error';
      el.setAttribute('role', 'alert');
      root.appendChild(el);
    }
    el.textContent = 'Não foi possível carregar a visualização 3D. Recarregue a página.';
    console.error('Arena 3D indisponível (sem fallback 2D):', err);
  }

  async function ensureScene() {
    if (scene3d || loadError) return;
    try {
      const { createScene3D } = await import('./scene3d.js');
      scene3d = createScene3D(root, hooks);
    } catch (err) {
      showLoadError(err);
    }
  }

  async function activate() {
    await ensureScene();
    root.classList.add('arena--3d-only', 'is-3d');
    if (!scene3d) return;
    scene3d.setActive(true);
    if (state.zoneThemes) scene3d.setZoneThemes?.(state.zoneThemes);
    if (state.hero) scene3d.setHero(...state.hero);
    scene3d.setZone(state.zone);
    if (state.zone) scene3d.setMonster(state.target, false);
  }

  const ready = activate();

  return {
    ready,
    play(events, finalTarget) {
      state.target = finalTarget;
      scene3d?.play(events, finalTarget);
    },
    setZone(zone) {
      state.zone = zone;
      scene3d?.setZone(zone);
    },
    setZoneThemes(map) {
      state.zoneThemes = map;
      scene3d?.setZoneThemes?.(map);
    },
    setHero(classId, hp, maxHp, equipment, appearance, petId) {
      state.hero = [classId, hp, maxHp, equipment, appearance, petId];
      scene3d?.setHero(classId, hp, maxHp, equipment, appearance, petId);
    },
    setMonster(target, animate) {
      state.target = target;
      scene3d?.setMonster(target, animate);
    },
    /** Aba oculta — não usa setActive(false). */
    setRenderSuspended(on) {
      scene3d?.setRenderSuspended?.(on);
    },
    /** Destruição definitiva (não é troca de zona). */
    destroy() {
      scene3d?.destroy?.();
      scene3d = null;
    },
  };
}
