/* Regras do pedido, compartilhadas pelo navegador e pelos testes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrderCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const categories = [
  { id:'tradicionais', name:'Tradicionais', price:187, mode:'cento', image:'brigadeiros.jpg', items:['Brigadeiro','Branquinho','Moranguinho','Cajuzinho','Casadinho','Amendoim','Coco'] },
  { id:'trad-especiais', name:'Tradicionais especiais', price:214, mode:'cento', image:'brigadeiros.jpg', items:['Branquinho com uva','Coco em lascas','Abacaxi','Nozes','Damasco','Brigadeiro Power','Olho de sogra'] },
  { id:'bombons', name:'Bombons', price:367, mode:'cento', image:'bombons-morango.jpg', items:['Morango','Uva','Damasco','Cereja','Avelãs','Pistache','Banana-passa','Nozes','Castanhas','Amêndoas','Brigadeiro','Suíço'] },
  { id:'trufas', name:'Trufas', price:394, mode:'cento', image:'bombons-morango.jpg', items:['Chocolate','Abacaxi','Floresta Negra','Ópera','Café','Coco'] },
  { id:'fondados', name:'Fondados', price:367, mode:'cento', image:'pistache.jpg', items:['Camafeu','Damasco','Castanha','Amêndoas','Pistache'] },
  { id:'gourmet', name:'Brigadeiro Gourmet', price:367, mode:'cento', image:'pistache.jpg', items:['Ao leite (belga)','Meio amargo (belga)','Blossomos (raspas)','Pistache','Limão-siciliano','Romeu e Julieta','Avelãs','Brûlée','Churros','Ninho com Nutella','Caramelo e flor de sal','Cereja aveludada'] },
  { id:'caramelizados', name:'Caramelizados', price:367, mode:'cento', image:'pistache.jpg', items:['Damasco recheado','Branquinho com uva','Coco em lascas','Sucrilhos','Olho de sogra','Nozes','Cristal de pistache','Amêndoas','Abacaxi com amêndoas'] },
  { id:'especiais-1', name:'Especiais I', price:430, mode:'cento', image:'bombons-morango.jpg', items:['Trouxinhas tropicais','Souvenirs de limão','Souvenirs de damasco ou laranja','Cereja trufada','Casquinha de chocolate com physalis','Casquinha de chocolate com morango','Casquinha de chocolate com maracujá','Caixinha de nozes com abacaxi','Limão-siciliano e pimenta','Copinho de chocolate, caramelo, sal e pistache','Copinho crocante de Nutella e avelãs'] },
  { id:'especiais-2', name:'Especiais II', price:394, mode:'cento', image:'tacas.jpg', items:['Tartelete de limão','Tartelete de morango','Tartelete de chocolate','Tartelete de mousse de brigadeiro','Mini quindim'] },
  { id:'macarons', name:'Macarons', price:673, mode:'cento', image:'macarons.jpg', items:['Chocolate','Framboesa','Pistache','Café','Baunilha'] },
  { id:'especiais-3', name:'Especiais III', price:493, mode:'cento', image:'macarons.jpg', items:['Mini cheesecake','Mini tiramisù','Mini manjar na colher','Pavlova de frutas vermelhas','Puxa-puxa de pistache'] },
  { id:'bem-casados', name:'Bem-casados', price:6.91, mode:'unidade', image:'brigadeiros.jpg', items:['Bem-casado'] },
  { id:'tacas', name:'Doces em taças', price:493, glassPrice:682, mode:'cento', image:'tacas.jpg', packaging:true, items:['Brigadeiro branco e preto','Strogonoff de nozes','Morango','Uva','Branquinho','Gelado de limão','Gelado de abacaxi','Mousse de maracujá','Banoffee'] },
  { id:'cupcakes', name:'Cupcakes', price:8.80, mode:'unidade', image:'brigadeiros.jpg', minimum:13, items:['Chocolate','Brigadeiro','Doce de leite','Limão-siciliano','Frutas vermelhas'] },
  { id:'bombons-70', name:'Bombons 70% cacau', price:430, mode:'cento', image:'bombons-morango.jpg', items:['Damasco','Tâmaras com nozes','Banana-passa','Ameixa com coco'] }
];
  const MAX_QUANTITY = 10000;
  const WHATSAPP_NUMBER = '5548999613086';
  const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const keyFor = (categoryId, index) => `${categoryId}::${index}`;
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const priceFor = (category, packaging) => Math.round(
    (category.packaging && packaging === 'vidro' ? category.glassPrice : category.price) * 100
  );
  const unitFor = (category, packaging) => {
    const cents = priceFor(category, packaging);
    if (category.mode === 'cento' && cents % 100 !== 0) {
      throw new Error('O preço por cento precisa resultar em centavos inteiros por unidade.');
    }
    return category.mode === 'cento' ? cents / 100 : cents;
  };
  function findItem(key) {
    if (typeof key !== 'string') return null;
    const parts = key.split('::');
    if (parts.length !== 2 || !/^(0|[1-9]\d*)$/.test(parts[1])) return null;
    const category = categories.find(c => c.id === parts[0]);
    const index = Number(parts[1]);
    return category && index < category.items.length
      ? { category, index, name: category.items[index] } : null;
  }
  function validQuantity(qty) {
    return Number.isSafeInteger(qty) && qty >= 0 && qty <= MAX_QUANTITY;
  }
  function selectedItems(state) {
    return Object.entries(state.quantities).flatMap(([key, qty]) => {
      const item = findItem(key);
      return item && validQuantity(qty) && qty > 0
        ? [{ ...item, key, qty, total: unitFor(item.category, state.packaging) * qty }] : [];
    });
  }
  function minimumErrors(state) {
    const selected = selectedItems(state);
    return categories.filter(c => c.minimum).flatMap(category => {
      const count = selected.filter(item => item.category.id === category.id)
        .reduce((sum, item) => sum + item.qty, 0);
      return count && count < category.minimum
        ? [`${category.name}: selecione pelo menos ${category.minimum} unidades no total. Faltam ${category.minimum - count}.`] : [];
    });
  }
  // Valida o lote completo antes de devolver o próximo estado.
  function applySelection(state, input) {
    if (!input || !Array.isArray(input.itens) || input.itens.length > 500) {
      throw new Error('Informe uma lista de até 500 itens.');
    }
    if (input.embalagem !== undefined && !['acrilico', 'vidro'].includes(input.embalagem)) {
      throw new Error('Tipo de taça inválido.');
    }
    const quantities = { ...state.quantities };
    const seen = new Set();
    const updated = [];
    for (const requested of input.itens) {
      if (!requested || typeof requested.nome !== 'string' || !norm(requested.nome) ||
          !validQuantity(requested.quantidade) ||
          (requested.categoria !== undefined && typeof requested.categoria !== 'string')) {
        throw new Error(`Cada item precisa de nome e quantidade inteira entre 0 e ${MAX_QUANTITY}.`);
      }
      const wanted = norm(requested.nome);
      const matches = categories.flatMap(category => {
        if (requested.categoria !== undefined &&
            norm(category.id) !== norm(requested.categoria) &&
            norm(category.name) !== norm(requested.categoria)) return [];
        return category.items.flatMap((name, index) =>
          norm(name) === wanted ? [{ category, index, name }] : []);
      });
      if (!matches.length) throw new Error(`Doce não encontrado: ${requested.nome}`);
      if (matches.length > 1) {
        throw new Error(`Informe a categoria de ${requested.nome}: ${matches.map(m => m.category.id).join(', ')}.`);
      }
      const item = matches[0];
      const key = keyFor(item.category.id, item.index);
      if (seen.has(key)) throw new Error(`Item repetido no lote: ${item.name}.`);
      seen.add(key);
      if (requested.quantidade) quantities[key] = requested.quantidade;
      else delete quantities[key];
      updated.push({ nome: item.name, categoria: item.category.id, quantidade: requested.quantidade });
    }
    return { quantities, packaging: input.embalagem || state.packaging, updated };
  }
  function buildMessage(state, details) {
    const selected = selectedItems(state);
    if (!selected.length) throw new Error('Selecione ao menos um doce.');
    const errors = minimumErrors(state);
    if (errors.length) throw new Error(errors.join(' '));
    if (!['Entrega', 'Retirada'].includes(details.fulfillment) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.neededTime)) {
      throw new Error('Escolha entrega ou retirada e informe um horário válido.');
    }
    const total = selected.reduce((sum, item) => sum + item.total, 0);
    const name = details.name.trim().slice(0, 100);
    const notes = details.notes.trim().slice(0, 1000);
    const lines = selected.map(item =>
      `• ${item.qty}x ${item.name} (${item.category.name}) — ${money(item.total)}`);
    const packaging = selected.some(item => item.category.packaging)
      ? `\nTipo de taça: ${state.packaging === 'vidro' ? 'vidro' : 'acrílico'}` : '';
    return `Olá, Eliane Doces! 👋\n${name ? `Meu nome é ${name}. ` : ''}Gostaria de solicitar este pedido:\n\n${lines.join('\n')}${packaging}\n\n*Total estimado: ${money(total)}*\n\n*Recebimento:* ${details.fulfillment}\n*Horário necessário:* ${details.neededTime}${notes ? `\n\nObservações: ${notes}` : ''}\n\nPode confirmar a disponibilidade, as condições de entrega e o valor final, por favor?`;
  }
  return { categories, MAX_QUANTITY, WHATSAPP_NUMBER, norm, keyFor, money,
    priceFor, unitFor, findItem, validQuantity, selectedItems, minimumErrors,
    applySelection, buildMessage };
});
