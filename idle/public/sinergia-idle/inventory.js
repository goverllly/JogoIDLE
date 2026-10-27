import { itemIcon3d, canRenderItem3d, resolveItemVisual, shouldLiveSpin3d } from './item-icon3d.js';
import { disposeItemSpin3d, mountItemSpin3d } from './item-spin3d.js';
import { confirmDialog } from './confirm-dialog.js';

const PAGE_SIZE = 20;

const EQUIP_SLOTS = new Set([
  'weapon',
  'offhand',
  'head',
  'chest',
  'legs',
  'gloves',
  'boots',
  'ring',
  'necklace',
]);

const SLOT_NAMES = {
  weapon: 'Arma',
  offhand: 'Mão secundária',
  head: 'Elmo',
  chest: 'Peito',
  legs: 'Calça',
  gloves: 'Luva',
  boots: 'Bota',
  ring: 'Anel',
  necklace: 'Colar',
};

function isConsumableItem(item) {
  return Boolean(item?.consumable || item?.slot === 'consumable');
}

function isEquipItem(item) {
  return EQUIP_SLOTS.has(item?.slot);
}

function matchesInvFilter(item, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'consumable') return isConsumableItem(item);
  if (filter === 'equip') return isEquipItem(item);
  if (filter === 'item') return !isConsumableItem(item) && !isEquipItem(item);
  return true;
}

const CLASS_NAMES = { GUERREIRO: 'Guerreiro', BARBARO: 'Bárbaro', MAGO: 'Mago', ARQUEIRO: 'Arqueiro' };

const STAT_LABELS = {
  str: 'FOR',
  dex: 'DES',
  int: 'INT',
  con: 'CON',
  mp: 'MP',
  attack: 'Ataque',
  defense: 'Defesa',
  hp: 'HP',
  crit: 'Crítico',
};

function itemLabel(item) {
  const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
  let base = item.displayName;
  if (!base) {
    const refine = Number(item.refineLevel) || 0;
    base = refine > 0 ? `${item.name} +${refine}` : item.name;
  }
  return qty > 1 ? `${base} ×${qty}` : base;
}

/** Lista de classes do item → rótulo do tooltip (nunca "undefined"). */
function formatItemClasses(classes) {
  const list = Array.isArray(classes)
    ? classes.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!list.length) return '—';
  if (list.length > 1) return 'Todas';
  return CLASS_NAMES[list[0]] || list[0];
}

function itemClassIds(item) {
  return Array.isArray(item?.classes)
    ? item.classes.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
}

const ICONS = {
  sword: '<path d="M19 3l-9.5 9.5M19 3h-3l-9 9 3 3 9-9V3zM7.5 13.5l-3 3 3 3 3-3M5 19l-2 2"/>',
  greatsword: '<path d="M20 2l-11 11M20 2h-4L6 12l6 6L22 8V4zM6.5 14.5L3 18l3 3 3.5-3.5M4.5 19.5L2 22"/><path d="M8 10l6 6"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z"/><path d="M12 6v12M7 10h10"/>',
  wand: '<path d="M4 20L15 9"/><path d="M17 3l1 2.5L20.5 6 18 7l-1 2.5L16 7l-2.5-1L16 5z"/>',
  staff: '<path d="M6 22L16 8"/><circle cx="18" cy="5.5" r="3"/><path d="M14.5 7.5l2 2"/>',
  book: '<path d="M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z"/><path d="M7 9h2M15 9h2"/>',
  crossbow: '<path d="M3 8c4-4 14-4 18 0M12 5v16M3 8l9 6 9-6"/><path d="M10 19l2 2 2-2"/>',
  dagger: '<path d="M18 3l-8 8 3 3 8-8V3zM9 12l-3 3 3 3M7 17l-4 4"/>',
  head: '<path d="M4 15a8 8 0 0116 0v3H4z"/><path d="M4 15h16M12 7v8M9 18v3h6v-3"/>',
  chest: '<path d="M7 3l5 2 5-2 4 4-3 3v11H6V10L3 7z"/><path d="M12 5v16M9 13h6"/>',
  legs: '<path d="M6 3h12l-1 18h-4l-1-11-1 11H7z"/><path d="M6 7h12"/>',
  gloves: '<path d="M7 21v-6L4 11l2-2 3 3V4a1.5 1.5 0 013 0v6-7a1.5 1.5 0 013 0v7-5a1.5 1.5 0 013 0v9c0 3-2 5-3 7z"/>',
  boots: '<path d="M7 3h6v10l7 3v4H4V3"/><path d="M4 16h16"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M9 5l3-3 3 3-3 3z"/>',
  necklace: '<path d="M4 3c0 7 4 11 8 11s8-4 8-11"/><path d="M12 14l-3 3 3 4 3-4z"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.ring}</svg>`;
}

function formatStat(stat, v) {
  return stat === 'crit' ? `${v.toFixed(1)}%` : String(v);
}

function canUse(item, character) {
  return itemClassIds(item).includes(character.classId) && character.level >= item.level;
}

/**
 * Mochila + slots equipados. Toda mudança passa pelo servidor via `onAction`;
 * aqui só se desenha o que veio em `character.inventory` / `character.equipment`.
 */
export function createInventoryUI({
  grid,
  count,
  pageTabs,
  filterTabs = [],
  slots,
  buttons,
  onAction,
  smartInvBody = null,
  onPrefsSave = null,
}) {
  const tip = document.createElement('div');
  tip.className = 'item-tip hidden';
  document.body.appendChild(tip);

  const menu = document.createElement('div');
  menu.className = 'item-menu hidden';
  document.body.appendChild(menu);

  let character = null;
  let page = 0;
  let sellMode = false;
  let renderKey = '';
  let selectedUid = null;
  let invFilter = 'all';
  const itemsByUid = new Map();

  function tipHtml(item, compareTo) {
    const lines = [];
    lines.push(`<strong class="r-${item.rarity}">${itemLabel(item)}</strong>`);
    if (item.refineLevel > 0) {
      lines.push(`<small class="refine-tag">Refinado +${item.refineLevel}</small>`);
    }
    lines.push(
      `<small>${item.rarityName} · ${SLOT_NAMES[item.slot] || item.slot}${item.twoHanded ? ' (duas mãos)' : ''} · Tier ${item.tier}</small>`,
    );
    const statKeys = new Set([...Object.keys(item.stats), ...Object.keys(compareTo?.stats || {})]);
    const rows = [];
    for (const stat of statKeys) {
      const v = item.stats[stat] || 0;
      let delta = '';
      if (compareTo && compareTo.uid !== item.uid) {
        const d = v - (compareTo.stats[stat] || 0);
        const shown = stat === 'crit' ? Math.round(d * 10) / 10 : d;
        if (shown) delta = ` <em class="${shown > 0 ? 'up' : 'down'}">${shown > 0 ? '+' : ''}${formatStat(stat, shown)}</em>`;
      }
      if (v || delta) rows.push(`<li><span>${STAT_LABELS[stat]}</span><b>+${formatStat(stat, v)}</b>${delta}</li>`);
    }
    lines.push(`<ul>${rows.join('')}</ul>`);
    const classIds = itemClassIds(item);
    const classOk = classIds.includes(character.classId);
    const levelOk = character.level >= item.level;
    lines.push(
      `<small class="${classOk ? '' : 'bad'}">Classe: ${formatItemClasses(classIds)}</small>`,
      `<small class="${levelOk ? '' : 'bad'}">Nível ${item.level}+</small>`,
    );
    if (compareTo && compareTo.uid !== item.uid) lines.push(`<small class="muted">Comparando com: ${compareTo.name}</small>`);
    lines.push(`<small class="gold">Venda: ${item.sellPrice.toLocaleString('pt-BR')} gold</small>`);
    return lines.join('');
  }

  function showTip(el, item, compareTo) {
    tip.innerHTML = tipHtml(item, compareTo);
    tip.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let x = r.left - tw - 10;
    if (x < 8) x = r.right + 10;
    const y = Math.min(window.innerHeight - th - 8, Math.max(8, r.top));
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function hideTip() {
    tip.classList.add('hidden');
  }

  function closeMenu() {
    selectedUid = null;
    menu.classList.add('hidden');
  }

  function positionMenu(el) {
    const r = el.getBoundingClientRect();
    const x = Math.min(window.innerWidth - menu.offsetWidth - 8, r.left);
    const y = Math.min(window.innerHeight - menu.offsetHeight - 8, r.bottom + 4);
    menu.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function openMenu(el, entries, uid = null) {
    hideTip();
    selectedUid = uid;
    menu.innerHTML = '';
    for (const e of entries) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e.label;
      b.disabled = Boolean(e.disabled);
      if (e.title) b.title = e.title;
      b.addEventListener('click', () => {
        closeMenu();
        e.run();
      });
      menu.appendChild(b);
    }
    menu.classList.remove('hidden');
    positionMenu(el);
  }

  function findItemElement(uid) {
    const invCell = grid.querySelector(`.item[data-uid="${CSS.escape(uid)}"]`);
    if (invCell) return invCell;
    return Object.values(slots).find((el) => el.dataset.uid === uid) || null;
  }

  function hasRefiner() {
    return (character?.inventory || []).some((i) => i.templateId === 'consumable_refiner');
  }

  function menuEntriesFor(item, source, equipSlot = null) {
    if (item.consumable || item.slot === 'consumable') {
      if (item.templateId === 'consumable_suco_celestial') {
        return [
          {
            label: 'Levar à Divindade',
            run: () => onAction('divindade', { uid: item.uid }),
            title: 'Item de ritual — não refine; use na Divindade',
          },
          {
            label: 'Item de ritual (não refinável)',
            disabled: true,
            title: 'Suco Divino só serve no ritual da Divindade',
          },
        ];
      }
      if (item.templateId === 'consumable_hp_potion') {
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        return [
          {
            label: qty > 1 ? `Beber poção (+HP) · resta ${qty}` : 'Beber poção (+HP)',
            run: () => onAction('usePotion', { uid: item.uid }),
          },
        ];
      }
      if (item.templateId === 'consumable_mana_potion') {
        const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
        return [
          {
            label: qty > 1 ? `Beber poção (+MP) · resta ${qty}` : 'Beber poção (+MP)',
            run: () => onAction('useManaPotion', { uid: item.uid }),
          },
        ];
      }
      if (item.templateId === 'consumable_attr_reset') {
        return [
          {
            label: 'Resetar pontos de atributo',
            run: async () => {
              const ok = await confirmDialog({
                title: 'Reset de Pontos',
                message:
                  'Devolve todos os pontos distribuídos (acima da base da classe) para o pool livre. Confirmar?',
                confirmLabel: 'Resetar',
                cancelLabel: 'Cancelar',
              });
              if (!ok) return;
              return onAction('useAttrReset', { uid: item.uid });
            },
            title: 'Zera FOR/INT/DES/CON investidos e libera os pontos novamente',
          },
        ];
      }
      return [{ label: 'Usar em outro item (Refinar)', disabled: true, title: 'Abra o item alvo e escolha Refinar' }];
    }
    if (source === 'equip') {
      const slot = equipSlot || item.slot;
      const entries = [{ label: 'Remover', run: () => onAction('unequip', { slot }) }];
      if (hasRefiner() && (item.refineLevel || 0) < 10) {
        entries.push({
          label: `Refinar → +${(item.refineLevel || 0) + 1}`,
          run: () => onAction('refine', { uid: item.uid }),
        });
      }
      if (item.locked) {
        entries.push({
          label: 'Desproteger',
          run: async () => {
            const ok = await confirmDialog({
              title: 'Remover proteção',
              message: `Remover o cadeado de ${item.name}?`,
              confirmLabel: 'Desproteger',
              cancelLabel: 'Cancelar',
              danger: true,
            });
            if (ok) onAction('unlock', { uid: item.uid });
          },
        });
      } else {
        entries.push({
          label: 'Proteger',
          run: () => onAction('lock', { uid: item.uid }),
        });
      }
      return entries;
    }
    const usable = canUse(item, character);
    const dual = Boolean(character.canUseOffhand);
    const main = character.equipment?.weapon;
    const mainIs1H = main && !main.twoHanded;
    const entries = [];

    if (item.slot === 'offhand') {
      entries.push({
        label: 'Equipar (2ª mão)',
        disabled: !usable || !dual,
        title: !dual
          ? 'Sua classe não usa 2ª mão'
          : usable
            ? ''
            : 'Classe ou nível incompatível',
        run: () => onAction('equip', { uid: item.uid, hand: 'off' }),
      });
    } else if (item.slot === 'weapon' && !item.twoHanded && dual) {
      entries.push(
        {
          label: 'Equipar (principal)',
          disabled: !usable,
          title: usable ? '' : 'Classe ou nível incompatível',
          run: () => onAction('equip', { uid: item.uid, hand: 'main' }),
        },
        {
          label: 'Equipar (secundária)',
          disabled: !usable || !mainIs1H,
          title: !mainIs1H
            ? 'Equipe antes uma arma de uma mão na principal'
            : usable
              ? ''
              : 'Classe ou nível incompatível',
          run: () => onAction('equip', { uid: item.uid, hand: 'off' }),
        },
      );
    } else {
      entries.push({
        label: 'Equipar',
        disabled: !usable,
        title: usable ? '' : 'Classe ou nível incompatível',
        run: () => onAction('equip', { uid: item.uid, hand: 'auto' }),
      });
    }

    if (hasRefiner() && (item.refineLevel || 0) < 10) {
      entries.push({
        label: `Refinar → +${(item.refineLevel || 0) + 1}`,
        run: () => onAction('refine', { uid: item.uid }),
      });
    }
    if (item.locked) {
      entries.push({
        label: 'Desproteger',
        run: async () => {
          const ok = await confirmDialog({
            title: 'Remover proteção',
            message: `Remover o cadeado de ${item.name}? O item poderá ser vendido.`,
            confirmLabel: 'Desproteger',
            cancelLabel: 'Cancelar',
            danger: true,
          });
          if (ok) onAction('unlock', { uid: item.uid });
        },
      });
      entries.push({
        label: 'Vender (protegido)',
        disabled: true,
        title: 'Desbloqueie o cadeado antes de vender',
      });
    } else {
      entries.push({
        label: 'Proteger',
        run: () => onAction('lock', { uid: item.uid }),
      });
      entries.push({ label: `Vender (${item.sellPrice} gold)`, run: () => sell(item) });
    }
    return entries;
  }

  /** Mantém o menu aberto após drop/farm se o item selecionado ainda existir. */
  function restoreSelection() {
    if (!selectedUid) return;
    const item = itemsByUid.get(selectedUid);
    if (!item) {
      closeMenu();
      return;
    }
    let equipSlot = null;
    for (const [slot, equippedItem] of Object.entries(character.equipment || {})) {
      if (equippedItem?.uid === selectedUid) {
        equipSlot = slot;
        break;
      }
    }
    if (!equipSlot) {
      const inv = character.inventory || [];
      const idx = inv.findIndex((i) => i.uid === selectedUid);
      if (idx >= 0) {
        const nextPage = Math.floor(idx / PAGE_SIZE);
        if (nextPage !== page) {
          page = nextPage;
          render();
        }
      } else {
        closeMenu();
        return;
      }
    }
    const el = findItemElement(selectedUid);
    if (!el) {
      closeMenu();
      return;
    }
    openMenu(el, menuEntriesFor(item, equipSlot ? 'equip' : 'inv', equipSlot), selectedUid);
  }

  function confirmRareSellEnabled() {
    const ia = character?.inventoryAutomation;
    // Default true se prefs ainda não vieram / campo ausente.
    return ia?.confirmRareSell !== false;
  }

  function syncConfirmRareToggle() {
    const el = document.getElementById('inv-confirm-rare');
    if (el) el.checked = confirmRareSellEnabled();
  }

  async function sell(item) {
    if (item.locked) {
      await confirmDialog({
        title: 'Item protegido',
        message: 'Este item está com cadeado. Desprotege antes de vender.',
        confirmLabel: 'Entendi',
        cancelLabel: 'Fechar',
      });
      return;
    }
    const needsRareConfirm =
      confirmRareSellEnabled() &&
      item.rarity !== 'common' &&
      item.rarity !== 'uncommon';
    if (needsRareConfirm) {
      const ok = await confirmDialog({
        title: 'Vender item',
        message: `Vender ${item.name} (${item.rarityName}) por ${item.sellPrice.toLocaleString('pt-BR')} gold?`,
        confirmLabel: 'Vender',
        cancelLabel: 'Cancelar',
        danger: true,
        rarity: item.rarity,
      });
      if (!ok) return;
    }
    onAction('sell', { uid: item.uid });
  }

  function applyRefineGlow(el, item) {
    const lvl = Math.max(0, Math.min(10, Math.floor(Number(item?.refineLevel) || 0)));
    el.classList.toggle('has-refine', lvl > 0);
    el.classList.toggle('refine-on-fire', lvl >= 9);
    if (lvl > 0) {
      el.dataset.refine = String(lvl);
      el.style.setProperty('--refine-lvl', String(lvl));
      // +1 ~ 2.8s/volta; +10 ~ 0.55s/volta
      el.style.setProperty('--refine-spin', `${Math.max(0.55, 3.05 - lvl * 0.25)}s`);
      // Pulso mais curto e intenso em refine alto
      el.style.setProperty('--refine-pulse', `${Math.max(0.55, 1.85 - lvl * 0.12)}s`);
      el.style.setProperty('--refine-glow', String(0.45 + lvl * 0.055));
    } else {
      delete el.dataset.refine;
      el.style.removeProperty('--refine-lvl');
      el.style.removeProperty('--refine-spin');
      el.style.removeProperty('--refine-pulse');
      el.style.removeProperty('--refine-glow');
    }
  }

  function applyItemVisual(el, item, { equip = false } = {}) {
    disposeItemSpin3d(el);
    const tier = equip ? '' : `<span class="item-tier">T${item.tier}</span>`;
    const refineLvl = Math.max(0, Math.floor(Number(item.refineLevel) || 0));
    const refine =
      refineLvl > 0
        ? `<span class="item-refine" data-lvl="${refineLvl}">+${refineLvl}</span>`
        : '';
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const stack =
      !equip && qty > 1 ? `<span class="item-qty">${qty}</span>` : '';
    const ring = refineLvl > 0 ? '<span class="refine-ring" aria-hidden="true"></span>' : '';
    // +9/+10: camada de chama na borda do slot
    const fire =
      refineLvl >= 9 ? '<span class="refine-fire" aria-hidden="true"></span>' : '';
    const lock = item.locked ? '<span class="item-lock" title="Protegido" aria-hidden="true">🔒</span>' : '';
    const visual = resolveItemVisual(item);
    const iconName = item.slot === 'ring' ? 'ring' : item.icon;
    const artSrc =
      typeof item.art === 'string' && item.art.trim()
        ? item.art.trim()
        : '';
    const glyph = artSrc
      ? `<img class="item-art" src="${artSrc}" alt="" />`
      : icon(iconName);
    el.innerHTML = `${ring}${fire}${lock}${glyph}${tier}${refine}${stack}`;
    applyRefineGlow(el, item);
    el.classList.toggle('is-locked', Boolean(item.locked));
    el.title = item.locked ? `${itemLabel(item)} (protegido)` : itemLabel(item);
    if (artSrc || !canRenderItem3d(visual)) return;
    const token = item.uid;
    el.dataset.iconToken = token;
    // Custom Blender (elmo mago etc.): canvas 3D girando — mesmo formato do admin.
    if (shouldLiveSpin3d(visual)) {
      mountItemSpin3d(el, { visual, token });
      return;
    }
    itemIcon3d(visual, item.rarity).then((url) => {
      if (!url || !el.isConnected || el.dataset.iconToken !== token) return;
      const img = document.createElement('img');
      img.className = 'item-3d';
      img.alt = '';
      img.src = url;
      const svg = el.querySelector('svg');
      if (svg) svg.replaceWith(img);
      else el.insertBefore(img, el.firstChild);
    });
  }

  function itemCell(item) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `inv-cell item r-${item.rarity}`;
    if (!canUse(item, character)) cell.classList.add('unusable');
    cell.dataset.uid = item.uid;
    applyItemVisual(cell, item);
    applyRefineGlow(cell, item);
    return cell;
  }

  function render() {
    const invAll = character.inventory || [];
    const filtered = invAll.filter((item) => matchesInvFilter(item, invFilter));
    const size = character.inventorySize || 20;
    // Em "Todos" a grade reflete a capacidade; nos filtros, só o tamanho do resultado.
    const bagSlots = invFilter === 'all' ? size : Math.max(filtered.length, 1);
    const pages = Math.max(1, Math.ceil(bagSlots / PAGE_SIZE));
    page = Math.min(page, pages - 1);

    itemsByUid.clear();
    for (const i of invAll) itemsByUid.set(i.uid, i);
    for (const i of Object.values(character.equipment || {})) itemsByUid.set(i.uid, i);

    grid.innerHTML = '';
    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, bagSlots);
    for (let i = start; i < end; i++) {
      if (i < filtered.length) grid.appendChild(itemCell(filtered[i]));
      else {
        const empty = document.createElement('div');
        empty.className = 'inv-cell';
        grid.appendChild(empty);
      }
    }
    while (grid.children.length < PAGE_SIZE) {
      const empty = document.createElement('div');
      empty.className = 'inv-cell';
      grid.appendChild(empty);
    }

    const countLabel = `${invAll.length}/${size}`;
    count.textContent = countLabel;
    count.classList.toggle('full', invAll.length >= size);
    const countToggle = document.getElementById('inv-count-toggle');
    if (countToggle) countToggle.textContent = countLabel;

    filterTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.invFilter === invFilter);
    });

    pageTabs.forEach((tab, i) => {
      const unlocked = i < pages;
      tab.disabled = !unlocked;
      tab.classList.toggle('locked', !unlocked);
      tab.classList.toggle('active', unlocked && i === page);
      if (unlocked) {
        const n = filtered.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE).length;
        tab.textContent = String(i + 1);
        tab.title = n ? `${n} itens nesta página` : `Página ${i + 1}`;
      } else {
        tab.textContent = String(i + 1);
        tab.title = 'Compre expansão de mochila no Mercador';
      }
    });

    for (const [slot, el] of Object.entries(slots)) {
      const item = character.equipment?.[slot];
      // Preserva classes de posição do paper-doll (slot--head, etc.).
      const posClass = [...el.classList].filter((c) => c.startsWith('slot--')).join(' ');
      el.className = item
        ? `slot filled r-${item.rarity}${posClass ? ` ${posClass}` : ''}`
        : `slot${posClass ? ` ${posClass}` : ''}`;
      el.dataset.uid = item ? item.uid : '';
      delete el.dataset.iconToken;
      if (item) applyItemVisual(el, item, { equip: true });
      else {
        disposeItemSpin3d(el);
        el.innerHTML = '';
        applyRefineGlow(el, null);
      }
    }
    const dual = Boolean(character.canUseOffhand);
    if (!dual || (character.equipment?.weapon?.twoHanded && !character.equipment.offhand)) {
      slots.offhand.classList.add('blocked');
    }
  }

  grid.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.item');
    if (!cell || !menu.classList.contains('hidden')) return;
    const item = itemsByUid.get(cell.dataset.uid);
    if (item) showTip(cell, item, character.equipment?.[item.slot]);
  });
  grid.addEventListener('mouseleave', hideTip);
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.item');
    if (!cell) return;
    const item = itemsByUid.get(cell.dataset.uid);
    if (!item) return;
    if (sellMode) return sell(item);
    openMenu(cell, menuEntriesFor(item, 'inv'), item.uid);
  });

  for (const [slot, el] of Object.entries(slots)) {
    el.addEventListener('mouseenter', () => {
      const item = itemsByUid.get(el.dataset.uid);
      if (item) showTip(el, item);
    });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('click', () => {
      const item = itemsByUid.get(el.dataset.uid);
      if (!item) return;
      openMenu(el, menuEntriesFor(item, 'equip', slot), item.uid);
    });
  }

  pageTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (tab.disabled) return;
      page = i;
      render();
    });
  });

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const next = tab.dataset.invFilter || 'all';
      if (next === invFilter) return;
      invFilter = next;
      page = 0;
      renderKey = '';
      render();
    });
  });

  buttons.sort.disabled = false;
  buttons.junk.disabled = false;
  buttons.sell.disabled = false;
  buttons.sort.addEventListener('click', () => onAction('sort', {}));
  buttons.junk.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Limpeza de mochila',
      message: 'Vender todos os itens comuns e os incomuns de outras classes?',
      confirmLabel: 'Limpar',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (ok) onAction('sell-junk', {});
  });
  buttons.sell.addEventListener('click', () => {
    sellMode = !sellMode;
    buttons.sell.classList.toggle('active', sellMode);
    grid.classList.toggle('sell-mode', sellMode);
  });

  document.getElementById('inv-confirm-rare')?.addEventListener('change', (e) => {
    const checked = Boolean(e.target.checked);
    onPrefsSave?.({ confirmRareSell: checked });
  });

  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target) && !e.target.closest('.item, .slot')) closeMenu();
  });
  window.addEventListener('scroll', () => { hideTip(); closeMenu(); }, true);

  function renderSmartInv() {
    if (!smartInvBody) return;
    const ia = character?.inventoryAutomation;
    if (!ia) {
      smartInvBody.innerHTML =
        '<p class="idle-smart-inv__hint muted">Carregue um personagem para configurar.</p>';
      return;
    }
    const rarities = ia.rarityOptions || [];
    const petName = ia.pet?.name || 'Nenhum';
    const effSell = ia.effective?.sell;
    const effEquip = ia.effective?.equip;
    smartInvBody.innerHTML = `
      <p class="idle-smart-inv__pet">Pet ativo: <strong>${petName}</strong>
        ${ia.pet?.canSell ? '· venda' : ''}
        ${ia.pet?.canEquip ? '· autoequip' : ''}
      </p>
      <label class="idle-smart-inv__row">
        <span>Venda automática (pet)</span>
        <input type="checkbox" data-smart="autoSell" ${ia.autoSellEnabled ? 'checked' : ''} />
      </label>
      <p class="idle-smart-inv__hint">Limite de raridade para o pet vender (fora da classe):</p>
      <div class="idle-smart-inv__rarities" role="radiogroup">
        ${rarities
          .map(
            (r) => `
          <label class="idle-smart-inv__radio ${ia.maxSellRarity === r.id ? 'is-on' : ''}">
            <input type="radio" name="smart-rarity" value="${r.id}" ${
              ia.maxSellRarity === r.id ? 'checked' : ''
            } />
            ${r.name}
          </label>`,
          )
          .join('')}
      </div>
      ${
        ia.maxSellRarity === 'legendary' || ia.maxSellRarity === 'epic'
          ? '<p class="idle-smart-inv__warn">Atenção: o pet poderá vender itens elegíveis até essa raridade.</p>'
          : ''
      }
      <label class="idle-smart-inv__row">
        <span>Equipar melhorias automaticamente (pet)</span>
        <input type="checkbox" data-smart="autoEquip" ${ia.autoEquipEnabled ? 'checked' : ''} />
      </label>
      <label class="idle-smart-inv__row">
        <span>Confirmar venda de raros (modo Vender)</span>
        <input type="checkbox" data-smart="confirmRare" ${ia.confirmRareSell !== false ? 'checked' : ''} />
      </label>
      <p class="idle-smart-inv__hint">Desative para vender rare/épico/lendário sem diálogo. Itens com cadeado continuam protegidos.</p>
      <p class="idle-smart-inv__status ${effSell ? 'is-on' : ''}">
        Venda efetiva agora: ${effSell ? 'ativa' : 'inativa'}
        ${ia.notes?.sellWithoutPet ? ` — ${ia.notes.sellWithoutPet}` : ''}
      </p>
      <p class="idle-smart-inv__status ${effEquip ? 'is-on' : ''}">
        Autoequip efetiva agora: ${effEquip ? 'ativa' : 'inativa'}
        ${ia.notes?.equipWithoutPet ? ` — ${ia.notes.equipWithoutPet}` : ''}
      </p>
      <p class="idle-smart-inv__note">${ia.notes?.lockVsRarity || ''}</p>
      <p class="idle-smart-inv__note">${ia.notes?.bagFull || ''}</p>
      <p class="idle-smart-inv__shield">Itens com cadeado, equipados ou especiais (ex.: Suco) não são vendidos automaticamente.</p>
    `;
    smartInvBody.querySelector('[data-smart="autoSell"]')?.addEventListener('change', (e) => {
      onPrefsSave?.({ autoSellEnabled: e.target.checked });
    });
    smartInvBody.querySelector('[data-smart="autoEquip"]')?.addEventListener('change', (e) => {
      onPrefsSave?.({ autoEquipEnabled: e.target.checked });
    });
    smartInvBody.querySelector('[data-smart="confirmRare"]')?.addEventListener('change', (e) => {
      onPrefsSave?.({ confirmRareSell: e.target.checked });
    });
    smartInvBody.querySelectorAll('input[name="smart-rarity"]').forEach((el) => {
      el.addEventListener('change', () => {
        if (el.checked) onPrefsSave?.({ maxSellRarity: el.value });
      });
    });
  }

  return {
    update(c) {
      character = c;
      const keepUid = selectedUid;
      const key = [
        c.level,
        page,
        invFilter,
        (c.inventory || [])
          .map((i) => `${i.uid}:${i.locked ? 1 : 0}:r${i.refineLevel || 0}:q${i.qty || 1}`)
          .join(','),
        Object.values(c.equipment || {})
          .map((i) => `${i?.uid}:${i?.locked ? 1 : 0}:r${i?.refineLevel || 0}`)
          .join(','),
        JSON.stringify(c.inventoryAutomation || {}),
      ].join('|');
      if (key === renderKey) {
        syncConfirmRareToggle();
        renderSmartInv();
        return;
      }
      renderKey = key;
      hideTip();
      if (keepUid) {
        const inv = (c.inventory || []).filter((i) => matchesInvFilter(i, invFilter));
        const idx = inv.findIndex((i) => i.uid === keepUid);
        if (idx >= 0) page = Math.floor(idx / PAGE_SIZE);
        selectedUid = keepUid;
      } else {
        closeMenu();
      }
      render();
      syncConfirmRareToggle();
      renderSmartInv();
      if (keepUid) restoreSelection();
    },
    rerender() {
      renderKey = '';
    },
  };
}
