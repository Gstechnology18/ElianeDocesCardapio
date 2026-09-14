'use strict';

const state = { quantities: {}, packaging: 'acrilico', filter: 'all', search: '' };
const menu = document.querySelector('#menu');
const chips = document.querySelector('#chips');
const search = document.querySelector('#search');
const cart = document.querySelector('#cart');
const clearCartButton = document.querySelector('#clearCart');
const MIN_CART_QUANTITY = 10;
const { categories, money, norm, keyFor, findItem, MAX_QUANTITY, WHATSAPP_NUMBER } = OrderCore;
const priceFor = category => OrderCore.priceFor(category, state.packaging);
const unitFor = category => OrderCore.unitFor(category, state.packaging);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const priceLabel = category => category.mode === 'cento' ? `${money(priceFor(category))}/cento` : `${money(priceFor(category))}/unidade`;
const enforceMinCartQuantity = qty => qty === 0 ? 0 : Math.max(MIN_CART_QUANTITY, qty);
const adjustCartQuantity = (key, delta) => {
  const current = state.quantities[key] || 0;
  const next = current + delta;
  if (next <= 0) return setQuantity(key, 0);
  const clamped = next < MIN_CART_QUANTITY ? MIN_CART_QUANTITY : next;
  setQuantity(key, clamped);
  return true;
};

function clearCart() {
  if (!Object.keys(state.quantities).length) return;
  state.quantities = {};
  renderMenu();
  renderCart();
}

function renderChips() {
  chips.innerHTML = `<button class="chip active" aria-pressed="true" type="button" data-filter="all">Todos</button>` + categories.map(c => `<button class="chip" aria-pressed="false" type="button" data-filter="${c.id}">${c.name}</button>`).join('');
  chips.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.filter = button.dataset.filter;
    chips.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c === button);
      c.setAttribute('aria-pressed', String(c === button));
    });
    renderMenu();
    document.querySelector('.intro').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start' });
  });
}

function renderMenu() {
  const query = norm(state.search.trim());
  let visible = 0;
  menu.innerHTML = categories.map(category => {
    if (state.filter !== 'all' && state.filter !== category.id) return '';
    const filtered = category.items.map((name, index) => ({ name, index })).filter(item => !query || norm(item.name).includes(query) || norm(category.name).includes(query));
    if (!filtered.length) return '';
    visible++;
    const packaging = category.packaging ? `<fieldset class="packaging"><legend>Tipo de taça:</legend><label class="pack-option"><input type="radio" name="packaging" value="acrilico" ${state.packaging === 'acrilico' ? 'checked' : ''}><span>Acrílico · ${money(Math.round(category.price * 100))}/cento</span></label><label class="pack-option"><input type="radio" name="packaging" value="vidro" ${state.packaging === 'vidro' ? 'checked' : ''}><span>Vidro · ${money(Math.round(category.glassPrice * 100))}/cento</span></label></fieldset>` : '';
    const minimum = category.minimum ? ` · mínimo ${category.minimum} na categoria` : '';
    const items = filtered.map(item => {
      const key = keyFor(category.id, item.index);
      const qty = state.quantities[key] || 0;
      return `<article class="item" data-key="${key}"><div class="item-info"><span class="item-name">${escapeHTML(item.name)}</span><span class="item-unit">${money(unitFor(category))} por unidade${minimum}</span></div><div class="stepper" role="group" aria-label="Quantidade de ${escapeHTML(item.name)}"><button type="button" data-action="minus" aria-label="Diminuir ${escapeHTML(item.name)}" ${qty === 0 ? 'disabled' : ''}>−</button><input class="qty" type="number" inputmode="numeric" min="0" max="${MAX_QUANTITY}" step="1" value="${qty}" aria-label="Quantidade de ${escapeHTML(item.name)} em ${escapeHTML(category.name)}"><button type="button" data-action="plus" aria-label="Aumentar ${escapeHTML(item.name)}" ${qty === MAX_QUANTITY ? 'disabled' : ''}>+</button></div></article>`;
    }).join('');
    return `<section id="${category.id}" class="category" style="--image:url('assets/${category.image}')"><div class="category-head"><div class="category-title"><h3>${escapeHTML(category.name)}</h3><p>${category.items.length} ${category.items.length === 1 ? 'opção' : 'opções'} disponíveis</p></div><span class="price-pill">${priceLabel(category)}</span></div>${packaging}<div class="items">${items}</div></section>`;
  }).join('');
  document.querySelector('#emptySearch').style.display = visible ? 'none' : 'block';
}

const selectedItems = () => OrderCore.selectedItems(state);

function renderCart() {
  const selected = selectedItems();
  const quantity = selected.reduce((sum,item) => sum + item.qty, 0);
  const total = selected.reduce((sum,item) => sum + item.total, 0);
  const lines = selected.length ? selected.map(item => `
    <div class="cart-line">
      <strong>${escapeHTML(item.name)}</strong>
      <span>${escapeHTML(item.category.name)}${item.category.packaging ? ` · ${state.packaging === 'vidro' ? 'Vidro' : 'Acrílico'}` : ''} · ${item.qty} un.</span>
      <div class="cart-line-price">${money(item.total)}</div>
      <div class="cart-line-actions">
        <button type="button" class="qty-step" data-cart-action="minus" data-cart-key="${item.key}" aria-label="Diminuir ${escapeHTML(item.name)}">−</button>
        <input class="cart-qty" type="number" min="${MIN_CART_QUANTITY}" max="${MAX_QUANTITY}" step="1" value="${item.qty}" data-cart-key="${item.key}" aria-label="Quantidade de ${escapeHTML(item.name)} no carrinho">
        <button type="button" class="qty-step" data-cart-action="plus" data-cart-key="${item.key}" aria-label="Aumentar ${escapeHTML(item.name)}">＋</button>
      </div>
      <button type="button" class="remove-item" data-remove="${item.key}" aria-label="Remover ${escapeHTML(item.name)} de ${escapeHTML(item.category.name)}">Remover</button>
    </div>
  `).join('') : `<div class="cart-empty">Seu pedido ainda está vazio.<br>Escolha seus doces no cardápio.</div>`;
  document.querySelector('#cartItems').innerHTML = lines;
  document.querySelector('#cartCount').textContent = quantity;
  document.querySelector('#mobileCount').textContent = quantity;
  document.querySelector('#cartTotal').textContent = money(total);
  document.querySelector('#mobileTotal').textContent = money(total);
  clearCartButton.disabled = !Object.keys(state.quantities).length;
  clearCartButton.setAttribute('aria-disabled', String(!Object.keys(state.quantities).length));
  const errors = OrderCore.minimumErrors(state);
  document.querySelector('#quantityError').textContent = errors.join(' ');
  document.querySelector('#whatsapp').disabled = !selected.length || errors.length > 0;
  document.querySelector('#cartStatus').textContent = `${quantity} unidades no pedido. Total estimado: ${money(total)}.`;
}

function setQuantity(key, next) {
  if (!findItem(key)) return false;
  const raw = Number(next);
  if (!Number.isSafeInteger(raw) || raw < 0 || raw > MAX_QUANTITY) return false;
  const normalized = enforceMinCartQuantity(raw);
  if (raw > 0 && raw < MIN_CART_QUANTITY) {
    document.querySelector('#cartStatus').textContent = `A quantidade mínima por item é de ${MIN_CART_QUANTITY} unidades. Use Remover para excluir o item.`;
  }
  if (normalized) state.quantities[key] = normalized; else delete state.quantities[key];
  const row = menu.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (row) {
    row.querySelector('.qty').value = normalized;
    row.querySelector('[data-action="minus"]').disabled = normalized === 0;
    row.querySelector('[data-action="plus"]').disabled = normalized >= MAX_QUANTITY;
  }
  renderCart();
  return true;
}

menu.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const key = button.closest('[data-key]').dataset.key;
  const current = state.quantities[key] || 0;
  const next = button.dataset.action === 'plus'
    ? (current > 0 ? current + 1 : MIN_CART_QUANTITY)
    : Math.max(0, current - 1);
  setQuantity(key, next);
});
menu.addEventListener('change', event => {
  if (event.target.matches('.qty')) {
    const input = event.target;
    const key = input.closest('[data-key]').dataset.key;
    const raw = Number(input.value);
    if (!input.value || !input.validity.valid || !Number.isFinite(raw) || raw < 0 || raw > MAX_QUANTITY) {
      input.value = state.quantities[key] || 0;
      document.querySelector('#cartStatus').textContent = `Use uma quantidade inteira entre 0 e ${MAX_QUANTITY}.`;
      return;
    }
    setQuantity(key, raw === 0 ? 0 : enforceMinCartQuantity(raw));
    return;
  }
  if (event.target.name !== 'packaging' || !['acrilico', 'vidro'].includes(event.target.value)) return;
  const packaging = event.target.value;
  state.packaging = packaging;
  renderMenu();
  renderCart();
  menu.querySelector(`input[name="packaging"][value="${packaging}"]`)?.focus({ preventScroll: true });
});
document.querySelector('#cartItems').addEventListener('click', event => {
  const cartButton = event.target.closest('[data-cart-action]');
  if (cartButton) {
    const { cartKey, cartAction } = cartButton.dataset;
    if (cartAction === 'plus') {
      adjustCartQuantity(cartKey, 1);
    } else {
      const current = state.quantities[cartKey] || 0;
      const next = current - 1;
      if (next <= 0) setQuantity(cartKey, 0); else setQuantity(cartKey, next);
    }
    return;
  }
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const buttons = [...document.querySelectorAll('[data-remove]')];
  const index = buttons.indexOf(button);
  setQuantity(button.dataset.remove, 0);
  const remaining = [...document.querySelectorAll('[data-remove]')];
  (remaining[Math.min(index, remaining.length - 1)] || document.querySelector('#customerName')).focus();
});
document.querySelector('#cartItems').addEventListener('input', event => {
  if (!event.target.matches('.cart-qty')) return;
  const input = event.target;
  const key = input.dataset.cartKey;
  const raw = Number(input.value);
  if (!Number.isFinite(raw) || raw < 0 || raw > MAX_QUANTITY) {
    input.value = state.quantities[key] || MIN_CART_QUANTITY;
    return;
  }
  const next = raw === 0 ? 0 : enforceMinCartQuantity(raw);
  setQuantity(key, next);
  input.value = state.quantities[key] || 0;
});
clearCartButton.addEventListener('click', clearCart);

search.addEventListener('input', () => { state.search = search.value; renderMenu(); });

const mobileQuery = matchMedia('(max-width: 980px)');
const toggle = document.querySelector('#cartToggle');
const backdrop = document.querySelector('#cartBackdrop');
const background = [...document.querySelectorAll('.site-header, .toolbar-wrap, #catalogue, footer, #cartToggle')];
let returnFocus = null;

function syncCart() {
  const mobile = mobileQuery.matches;
  const opened = mobile && cart.classList.contains('open');
  if (!mobile) cart.classList.remove('open');
  cart.inert = mobile && !opened;
  cart.setAttribute('aria-hidden', String(mobile && !opened));
  toggle.setAttribute('aria-expanded', String(opened));
  document.body.classList.toggle('cart-open', opened);
  backdrop.hidden = !opened;
  background.forEach(element => { element.inert = opened; });
  if (opened) {
    cart.setAttribute('role', 'dialog');
    cart.setAttribute('aria-modal', 'true');
  } else {
    cart.removeAttribute('role');
    cart.removeAttribute('aria-modal');
  }
}
function openCart() {
  if (!mobileQuery.matches) return;
  returnFocus = document.activeElement;
  cart.classList.add('open');
  syncCart();
  document.querySelector('#cartClose').focus({ preventScroll: true });
}
function closeCart() {
  const wasOpen = cart.classList.contains('open');
  cart.classList.remove('open');
  syncCart();
  if (wasOpen && mobileQuery.matches) {
    const target = returnFocus?.isConnected && !returnFocus.closest('[inert]') ? returnFocus : toggle;
    target.focus({ preventScroll: true });
  }
}
toggle.addEventListener('click', openCart);
document.querySelector('#cartClose').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', event => {
  if (!mobileQuery.matches || !cart.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCart();
  } else if (event.key === 'Tab') {
    const elements = [...cart.querySelectorAll('button, input, textarea, a[href], [tabindex]')]
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && (document.activeElement === first || !cart.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !cart.contains(document.activeElement))) {
      event.preventDefault(); first?.focus();
    }
  }
});
mobileQuery.addEventListener('change', () => {
  const focused = document.activeElement;
  syncCart();
  if (mobileQuery.matches && cart.inert && cart.contains(focused)) toggle.focus();
  else if (!mobileQuery.matches && (focused === toggle || focused.id === 'cartClose')) {
    document.querySelector('#customerName').focus({ preventScroll: true });
  }
});

function buildWhatsAppMessage() {
  return OrderCore.buildMessage(state, {
    name: document.querySelector('#customerName').value,
    fulfillment: document.querySelector('input[name="fulfillment"]:checked')?.value || '',
    neededTime: document.querySelector('#neededTime').value,
    notes: document.querySelector('#notes').value
  });
}
function validateOrderDetails(focusInvalid = true) {
  const fulfillment = document.querySelector('input[name="fulfillment"]:checked');
  const time = document.querySelector('#neededTime');
  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time.value) && time.validity.valid;
  const valid = Boolean(fulfillment && timeValid);
  document.querySelector('#orderDetails').classList.toggle('invalid', !valid);
  time.setAttribute('aria-invalid', String(!timeValid));
  document.querySelectorAll('input[name="fulfillment"]').forEach(input =>
    input.setAttribute('aria-invalid', String(!fulfillment)));
  document.querySelector('#orderDetailsError').textContent = !fulfillment && !timeValid
    ? 'Escolha entrega ou retirada e informe o horário.'
    : !fulfillment ? 'Escolha entrega ou retirada.' : !timeValid ? 'Informe um horário válido.' : '';
  if (!valid && focusInvalid) {
    (fulfillment ? time : document.querySelector('input[name="fulfillment"]')).focus();
  }
  return valid;
}
document.querySelector('#orderForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedItems().length || OrderCore.minimumErrors(state).length) return;
  if (!validateOrderDetails()) return;
  // A navegação direta evita depender da permissão de pop-ups.
  window.location.assign(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage())}`);
});
document.querySelectorAll('input[name="fulfillment"], #neededTime').forEach(input =>
  input.addEventListener('change', () => {
    if (document.querySelector('#orderDetails').classList.contains('invalid')) validateOrderDetails(false);
  }));

async function registerWebMCP() {
  const context = document.modelContext;
  if (typeof context?.registerTool !== 'function') return;
  const summary = () => ({
    itens: selectedItems().map(item => ({
      nome: item.name, categoria: item.category.id, quantidade: item.qty, subtotal: money(item.total)
    })),
    total: money(selectedItems().reduce((sum, item) => sum + item.total, 0)),
    embalagem: selectedItems().some(item => item.category.packaging) ? state.packaging : null,
    erros: OrderCore.minimumErrors(state),
    recebimento: document.querySelector('input[name="fulfillment"]:checked')?.value || null,
    horario: document.querySelector('#neededTime').value || null
  });
  const definitions = [
    {
      name: 'configurar_pedido_doces', title: 'Configurar pedido',
      description: 'Define quantidades no carrinho, sem enviar o pedido. Informe a categoria quando houver nomes repetidos. Consulte ler_cardapio_doces para nomes e categorias. Cupcakes exigem mais de 12 unidades no total para envio.',
      inputSchema: {
        type: 'object',
        properties: {
          embalagem: { type: 'string', enum: ['acrilico', 'vidro'] },
          itens: { type: 'array', maxItems: 500, items: {
            type: 'object', properties: {
              nome: { type: 'string', minLength: 1 },
              categoria: { type: 'string', description: 'ID ou nome da categoria.' },
              quantidade: { type: 'integer', minimum: 0, maximum: MAX_QUANTITY }
            }, required: ['nome', 'quantidade'], additionalProperties: false
          } }
        },
        required: ['itens'], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => {
        const next = OrderCore.applySelection(state, input);
        state.quantities = next.quantities;
        state.packaging = next.packaging;
        renderMenu(); renderCart();
        return { atualizados: next.updated, ...summary() };
      }
    },
    {
      name: 'ler_resumo_pedido', title: 'Ler resumo do pedido',
      description: 'Retorna os doces escolhidos, embalagem, total e pendências de quantidade mínima.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => summary()
    },
    {
      name: 'ler_cardapio_doces', title: 'Ler cardápio',
      description: 'Lista categorias, nomes exatos, preços em reais e mínimos por categoria para configurar o pedido.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => categories.map(category => ({
        categoria: category.id, nome: category.name, itens: category.items,
        preco: category.price, unidadePreco: category.mode,
        minimoCategoria: category.minimum || null,
        ...(category.packaging ? { precoVidro: category.glassPrice } : {})
      }))
    }
  ];
  for (const definition of definitions) {
    try { await context.registerTool(definition); }
    catch (error) { console.warn(`Não foi possível registrar ${definition.name}.`, error); }
  }
}

renderChips();
renderMenu();
renderCart();
syncCart();
void registerWebMCP();
