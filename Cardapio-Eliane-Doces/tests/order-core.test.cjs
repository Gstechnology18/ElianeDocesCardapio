'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../dist/order-core.js');
const makeState = (quantities = {}, packaging = 'acrilico') => ({ quantities, packaging });
const details = { name: 'Ana', notes: '', fulfillment: 'Retirada', neededTime: '14:30' };

test('todos os produtos têm identidade válida e preço em centavos inteiros', () => {
  const ids = new Set();
  for (const category of core.categories) {
    assert.ok(!ids.has(category.id)); ids.add(category.id);
    assert.ok(category.items.length > 0);
    for (const packaging of ['acrilico', 'vidro']) {
      assert.ok(Number.isSafeInteger(core.unitFor(category, packaging)));
    }
    category.items.forEach((name, index) => assert.equal(core.findItem(core.keyFor(category.id, index)).name, name));
  }
  assert.equal(ids.size, 15);
});
test('um cento tradicional e unidades avulsas têm totais exatos', () => {
  const items = core.selectedItems(makeState({ 'tradicionais::0': 100, 'bem-casados::0': 3 }));
  assert.deepEqual(items.map(item => item.total), [18700, 2073]);
  assert.equal(items.reduce((sum, item) => sum + item.total, 0), 20773);
});
test('taças recalculam conforme a embalagem sem afetar outros doces', () => {
  const quantities = { 'tacas::0': 3, 'tradicionais::0': 7 };
  assert.deepEqual(core.selectedItems(makeState(quantities)).map(i => i.total), [1479, 1309]);
  assert.deepEqual(core.selectedItems(makeState(quantities, 'vidro')).map(i => i.total), [2046, 1309]);
});
test('quantidades inválidas, chaves inexistentes e limites não entram no total', () => {
  for (const value of [-1, 0.5, NaN, Infinity, '2', 10001, Number.MAX_SAFE_INTEGER]) {
    assert.equal(core.validQuantity(value), false);
    assert.deepEqual(core.selectedItems(makeState({ 'tradicionais::0': value })), []);
  }
  for (const key of ['tradicionais::-1', 'tradicionais::99', 'tradicionais::', 'tradicionais::1::2', '__proto__::0', null]) {
    assert.equal(core.findItem(key), null);
  }
  assert.equal(core.validQuantity(0), true);
  assert.equal(core.validQuantity(10000), true);
});
test('cupcakes: zero é permitido; 1 e 12 bloqueiam; 13 libera somando sabores', () => {
  assert.deepEqual(core.minimumErrors(makeState()), []);
  for (const count of [1, 12]) {
    const state = makeState({ 'cupcakes::0': count });
    assert.equal(core.minimumErrors(state).length, 1);
    assert.throws(() => core.buildMessage(state, details), /pelo menos 13/);
  }
  const state = makeState({ 'cupcakes::0': 6, 'cupcakes::1': 7 });
  assert.deepEqual(core.minimumErrors(state), []);
  assert.match(core.buildMessage(state, details), /114,40/);
});
test('seleção por nome ambíguo é rejeitada e a categoria resolve', () => {
  assert.throws(() => core.applySelection(makeState(), { itens: [{ nome: 'Chocolate', quantidade: 3 }] }), /categoria/);
  const result = core.applySelection(makeState(), { itens: [{ nome: 'Chocolate', categoria: 'Trufas', quantidade: 3 }] });
  assert.deepEqual(result.quantities, { 'trufas::0': 3 });
});
test('falha no fim do lote não altera itens anteriores ou embalagem', () => {
  const state = makeState({ 'tradicionais::0': 2 });
  const before = structuredClone(state);
  assert.throws(() => core.applySelection(state, { embalagem: 'vidro', itens: [
    { nome: 'Bem-casado', quantidade: 20 }, { nome: 'não existe', quantidade: 1 }
  ] }), /não encontrado/);
  assert.deepEqual(state, before);
});
test('seleção valida duplicados, quantidade, embalagem e tamanho do lote', () => {
  const item = { nome: 'Bem-casado', quantidade: 2 };
  assert.throws(() => core.applySelection(makeState(), { itens: [item, item] }), /repetido/);
  assert.throws(() => core.applySelection(makeState(), { itens: [], embalagem: 'madeira' }), /inválido/);
  assert.throws(() => core.applySelection(makeState(), { itens: [{ ...item, quantidade: 1.5 }] }), /inteira/);
  assert.throws(() => core.applySelection(makeState(), { itens: Array(501).fill(item) }), /500/);
  assert.throws(() => core.applySelection(makeState(), { itens: [{ ...item, categoria: 1 }] }), /inteira/);
});
test('seleção aceita busca sem acentos e remove quantidades zeradas', () => {
  const state = makeState({ 'tradicionais::0': 2 });
  const result = core.applySelection(state, { embalagem: 'vidro', itens: [
    { nome: ' brigadeiro ', categoria: 'tradicionais', quantidade: 0 },
    { nome: 'Cafe', categoria: 'macarons', quantidade: 4 }
  ] });
  assert.deepEqual(result.quantities, { 'macarons::3': 4 });
  assert.equal(result.packaging, 'vidro');
  assert.deepEqual(state.quantities, { 'tradicionais::0': 2 });
});
test('mensagem contém itens, embalagem, total e texto especial sem corromper a URL', () => {
  const state = makeState({ 'tacas::0': 2 }, 'vidro');
  const message = core.buildMessage(state, { ...details, name: 'João & Ana', notes: 'Sem "nozes" <teste> #festa\nÀs 14h' });
  assert.match(message, /13,64/);
  assert.match(message, /Tipo de taça: vidro/);
  assert.match(message, /Retirada/);
  const url = new URL('https://wa.me/' + core.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message));
  assert.equal(url.searchParams.get('text'), message);
  assert.equal(url.hash, '');
});
test('pedido vazio e recebimento ou horário inválidos não geram mensagem', () => {
  assert.throws(() => core.buildMessage(makeState(), details), /ao menos/);
  for (const changed of [{ fulfillment: '' }, { neededTime: '' }, { neededTime: '25:00' }, { neededTime: '1:00' }]) {
    assert.throws(() => core.buildMessage(makeState({ 'tradicionais::0': 1 }), { ...details, ...changed }), /horário válido/);
  }
  for (const neededTime of ['00:00', '23:59']) {
    assert.match(core.buildMessage(makeState({ 'tradicionais::0': 1 }), { ...details, neededTime }), new RegExp(neededTime));
  }
});
