import { confirmDialog } from './confirm-dialog.js';

/**
 * Modal do mercador — ofertas server-side (mochila, Refinador, pets).
 */
export function createMerchantUI({ button, onBuy, getState }) {
  const root = document.createElement('div');
  root.id = 'idle-merchant';
  root.className = 'idle-merchant hidden';
  root.innerHTML = `
    <div class="idle-merchant__backdrop" data-act="close"></div>
    <div class="idle-merchant__panel" role="dialog" aria-modal="true" aria-labelledby="merchant-title">
      <header class="idle-merchant__head">
        <div>
          <p class="idle-merchant__eyebrow">Mercador</p>
          <h2 id="merchant-title">Loja da guilda</h2>
        </div>
        <button type="button" class="idle-merchant__close" data-act="close" aria-label="Fechar">✕</button>
      </header>
      <p class="idle-merchant__hint">O preço é definido pelo administrador do IDLE.</p>
      <div class="idle-merchant__list" id="merchant-list"></div>
    </div>
  `;
  document.body.appendChild(root);

  const list = root.querySelector('#merchant-list');

  const PET_SKU_TO_ID = {
    pet_dog: 'dog',
    pet_cat: 'cat',
    pet_parrot: 'parrot',
  };

  function offerIcon(offer) {
    if (typeof offer.art === 'string' && offer.art.trim()) {
      return `<img class="idle-merchant__offer-art" src="${offer.art.trim()}" alt="" />`;
    }
    if (offer.icon === 'dog' || offer.sku === 'pet_dog') return '🐶';
    if (offer.icon === 'cat' || offer.sku === 'pet_cat') return '🐱';
    if (offer.icon === 'parrot' || offer.sku === 'pet_parrot') return '🦜';
    if (offer.icon === 'refiner' || offer.sku === 'refiner') return '✦';
    if (offer.icon === 'attr_reset' || offer.sku === 'attr_reset') return '↺';
    return '🎒';
  }

  function ownedCount(offer, character) {
    if (offer.sku === 'bag_upgrade') return character?.bagUpgrades || 0;
    const petId = PET_SKU_TO_ID[offer.sku];
    if (petId) {
      const unlocked = character?.pets?.unlocked || [];
      return unlocked.includes(petId) ? 1 : 0;
    }
    return 0;
  }

  function petStatusLabel(offer, character, soldOut) {
    if (!soldOut) return null;
    const petId = PET_SKU_TO_ID[offer.sku];
    if (!petId) return 'Já adquirido';
    const active = character?.pets?.activeId === petId;
    if (!active) return 'Comprado · escolha no painel Companheiro';
    const caps = character?.pets?.caps || [];
    const hasEquip = caps.includes('autoEquipBetter');
    const hasSell = caps.includes('autoSellWrongClass');
    if (hasEquip && hasSell) return 'Ativo · equipa + vende';
    if (hasEquip) return 'Ativo · auto-equipa';
    if (hasSell) return 'Ativo · vende fora da classe';
    return 'Ativo';
  }

  function close() {
    root.classList.add('hidden');
  }

  function open() {
    render();
    root.classList.remove('hidden');
  }

  function render() {
    const { merchant, character } = getState();
    const offerings = merchant?.offerings || [];
    const gold = character?.gold || 0;

    list.innerHTML = '';
    if (!offerings.length) {
      list.innerHTML = '<p class="idle-merchant__empty">Nenhuma oferta no momento.</p>';
      return;
    }

    for (const offer of offerings) {
      const owned = ownedCount(offer, character);
      const max = offer.maxPurchases;
      const soldOut = max != null && owned >= max;
      const price = Number(offer.price) || 0;
      const canAfford = gold >= price;
      const status = soldOut
        ? petStatusLabel(offer, character, soldOut)
        : `${price.toLocaleString('pt-BR')} gold`;
      const card = document.createElement('article');
      card.className = 'idle-merchant__offer';
      card.innerHTML = `
        <div class="idle-merchant__offer-ico" aria-hidden="true">${offerIcon(offer)}</div>
        <div class="idle-merchant__offer-body">
          <strong>${offer.name}</strong>
          <p>${offer.description || ''}</p>
          <small>${status}</small>
        </div>
        <button type="button" class="idle-merchant__buy" ${soldOut || !canAfford ? 'disabled' : ''}>
          ${soldOut ? 'Comprado' : canAfford ? 'Comprar' : 'Sem ouro'}
        </button>
      `;
      const buyBtn = card.querySelector('.idle-merchant__buy');
      buyBtn.addEventListener('click', async () => {
        if (soldOut) return;
        const ok = await confirmDialog({
          title: 'Mercador',
          message: `Comprar ${offer.name} por ${price.toLocaleString('pt-BR')} gold?`,
          confirmLabel: 'Comprar',
          cancelLabel: 'Cancelar',
        });
        if (!ok) return;
        await onBuy(offer.sku);
        render();
      });
      list.appendChild(card);
    }
  }

  button?.addEventListener('click', () => open());
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.classList.contains('hidden')) close();
  });

  return { open, close, render };
}
