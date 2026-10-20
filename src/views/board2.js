// Capstone, part 2: router, bus, selectors and keyed rendering, all yours.
import { TIERS } from '../content.js';
import { h, icon, toast } from '../dom.js';
import { setTeardown } from '../nav.js';
import { has } from '../state.js';
import { boardReducer, loadPiece } from './boardShared.js';
import { crumbs } from './kit.js';

export function renderBoard2(root) {
  const wrap = h('div', { class: 'wrap' }, crumbs(),
    h('div', { class: 'page-title' }, h('h1', null, 'Board, part 2'),
      h('p', { class: 'muted', style: 'max-width:70ch' }, 'Same board, now with architecture, and every moving part is a function you wrote. The address bar is driven by your createRouter, the state is combined by your combineReducers, derived data comes from your createSelector, the activity feed listens on your createEventBus, and each column is patched by your reconcile, which moves existing DOM nodes instead of rebuilding them.')));
  wrap.append(h('p', { class: 'muted', style: 'max-width:70ch;font-size:14px' }, 'This view runs the code you claimed in the app. To own it as a real project, write the same pieces as modules in ',
    h('code', null, 'board/src'), ' and open ', h('a', { href: 'board/' }, 'the standalone Board'), ', which runs on your files with the real address bar.'));
  root.append(wrap);
  const need = [...TIERS[0].parts, ...TIERS[1].parts];
  const missing = need.filter(p => !has(p[0]));
  if (missing.length) { wrap.append(h('p', null, 'Still to build: ' + missing.map(p => p[1]).join(', ') + '.')); return; }
  let api;
  try {
    api = {
      groupBy: loadPiece('arr-groupby', 'groupBy'), updateCard: loadPiece('state-update', 'updateCard'), createStore: loadPiece('state-store', 'createStore'),
      combineReducers: loadPiece('sel-combine', 'combineReducers'), createSelector: loadPiece('sel-create', 'createSelector'),
      createEventBus: loadPiece('ev-bus', 'createEventBus'), createRouter: loadPiece('rt-router', 'createRouter'), reconcile: loadPiece('render-reconcile', 'reconcile')
    };
  } catch (e) { wrap.append(h('p', { class: 'errbox' }, 'Your saved solutions could not be loaded: ' + e.message)); return; }

  const errorsEl = h('div', { 'aria-live': 'polite' });
  const fail = (where, e) => { errorsEl.replaceChildren(h('div', { class: 'errbox board-err' }, 'Your ' + where + ' threw: ' + (e && e.message || e))); };

  /* state: { board, ui } via your combineReducers */
  const SAMPLE = { name: 'Board', columns: [
    { id: 'todo', title: 'To do', cards: [{ id: 1, title: 'Sketch the data model', priority: 'high' }, { id: 2, title: 'Write the reducer', priority: 'low' }, { id: 3, title: 'Wire up subscribe', priority: 'low' }, { id: 6, title: 'Design the route table', priority: 'high' }] },
    { id: 'doing', title: 'In progress', cards: [{ id: 4, title: 'Review AI-written code', priority: 'high' }, { id: 7, title: 'Hook up the event bus', priority: 'low' }] },
    { id: 'done', title: 'Done', cards: [{ id: 5, title: 'Finish Tier 1', priority: 'low' }, { id: 8, title: 'Build createStore', priority: 'high' }] }] };
  const boardSlice = boardReducer(api);
  const board = (state = SAMPLE, act) => boardSlice(state, act);
  const ui = (state = { route: null }, act) => (act.type === 'route' ? { ...state, route: act.route } : state);
  let store, bus, router;
  try {
    const reducer = api.combineReducers({ board, ui });
    store = api.createStore(reducer, reducer(undefined, { type: '@@init' }));
    bus = api.createEventBus({ onError: (e, type) => feed('listener error on ' + type + ': ' + e.message) });
    router = api.createRouter([
      { name: 'board', path: '/' },
      { name: 'priority', path: '/priority/:level' },
      { name: 'card', path: '/card/:id' },
    ]);
  } catch (e) { fail('setup code', e); wrap.append(errorsEl); return; }

  /* selectors via your createSelector */
  const selRoute = s => s.ui.route;
  const selFilter = api.createSelector(selRoute, r => (r && r.match && r.match.name === 'priority' ? r.match.params.level : 'all'));
  const selSort = api.createSelector(selRoute, r => (r && r.match && r.match.query.sort === 'priority' ? 'priority' : 'manual'));
  const selCards = api.createSelector(s => s.board, b => b.columns.flatMap(c => c.cards));
  const selCounts = api.createSelector(selCards, cards => api.groupBy(cards, c => c.priority));
  const selColumns = api.createSelector(s => s.board, selFilter, selSort, (b, filter, sort) => b.columns.map(col => {
    let cards = filter === 'all' ? col.cards : col.cards.filter(c => c.priority === filter);
    if (sort === 'priority') cards = [...cards].sort((x, y) => (x.priority === 'high' ? 0 : 1) - (y.priority === 'high' ? 0 : 1));
    return { id: col.id, title: col.title, cards, total: col.cards.length };
  }));
  const selSelected = api.createSelector(selRoute, selCards, (r, cards) => (r && r.match && r.match.name === 'card' ? (cards.find(c => String(c.id) === r.match.params.id) || null) : undefined));

  /* actions: dispatch to the store, announce on the bus */
  const where = id => store.getState().board.columns.findIndex(c => c.cards.some(x => x.id === id));
  const cardOf = id => selCards(store.getState()).find(c => c.id === id);
  const act = {
    move(id, dir) {
      const cols = store.getState().board.columns, ci = where(id), to = cols[ci + dir];
      if (!to) return;
      safeDispatch({ type: 'move', cardId: id, to: to.id });
      emit('card:moved', { id, from: cols[ci].id, to: to.id });
    },
    toggle(id) {
      const c = cardOf(id); if (!c) return;
      const priority = c.priority === 'high' ? 'low' : 'high';
      safeDispatch({ type: 'patch', cardId: id, patch: { priority } });
      emit('card:updated', { id, priority });
    },
    rename(id, title) {
      title = title.trim(); const c = cardOf(id);
      if (!c || !title || title === c.title) return;
      safeDispatch({ type: 'patch', cardId: id, patch: { title } });
      emit('card:updated', { id, title });
    },
    add(title) {
      title = title.trim(); if (!title) return;
      const id = nextId++;
      safeDispatch({ type: 'add', id, title });
      emit('card:added', { id, title });
    }
  };
  let nextId = 100;
  function safeDispatch(a) { try { store.dispatch(a); } catch (e) { fail('reducer or store', e); } }
  function emit(type, payload) { try { bus.emit(type, payload); } catch (e) { fail('event bus', e); } }

  /* history + navigation via your createRouter */
  const hist = ['#/'];
  let pos = 0;
  function navigate(url, push) {
    if (!url.startsWith('#')) url = '#' + url;
    let match = null;
    try { match = router.resolve(url); } catch (e) { fail('router', e); }
    if (push !== false) { hist.splice(pos + 1); hist.push(url); pos = hist.length - 1; }
    safeDispatch({ type: 'route', route: { url, match } });
    emit('route:changed', { url, name: match ? match.name : null });
  }
  const link = (label, name, params, query) => {
    let url = '#/';
    try { url = router.href(name, params || {}) + (query || ''); } catch (e) { fail('router href', e); }
    return h('a', { class: 'qlink', href: url, onclick: e => { e.preventDefault(); navigate(url); } }, label);
  };

  /* bus listeners */
  const feedLines = [];
  const feedEl = h('div', { class: 'log' });
  function feed(line) { feedLines.unshift(line); feedEl.replaceChildren(...feedLines.slice(0, 30).map(l => h('div', null, l))); }
  const offs = [];
  try {
    offs.push(bus.on('*', (payload, type) => feed(type + '  ' + (payload && typeof payload === 'object' ? Object.entries(payload).map(([k, v]) => k + '=' + v).join(' ') : String(payload)))));
    offs.push(bus.once('card:moved', () => toast('First move. The activity feed heard it on your bus.', 'route')));
    offs.push(bus.on('card:added', p => toast('Card added: ' + p.title, 'plus')));
  } catch (e) { fail('event bus', e); }

  /* DOM: persistent columns, keyed cards patched with your reconcile */
  const urlInput = h('input', { class: 'addr-in', type: 'text', 'aria-label': 'Address', spellcheck: 'false' });
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(urlInput.value.trim() || '#/'); });
  const backBtn = h('button', { class: 'mini', 'aria-label': 'Back', onclick: () => { if (pos > 0) { pos--; navigate(hist[pos], false); } } }, icon('left', 14));
  const fwdBtn = h('button', { class: 'mini', 'aria-label': 'Forward', onclick: () => { if (pos < hist.length - 1) { pos++; navigate(hist[pos], false); } } }, icon('right', 14));
  const boardEl = h('div', { class: 'board' });
  const cols = new Map();
  store.getState().board.columns.forEach(c => {
    const list = h('div', { class: 'list' });
    const count = h('span');
    const el = h('div', { class: 'col' }, h('h3', null, c.title, count), list);
    cols.set(c.id, { el, list, count, nodes: new Map(), keys: [] });
    boardEl.append(el);
  });
  let selectedId = null;
  function makeCardEl(id) {
    const title = h('a', { class: 't', href: '#', onclick: e => { e.preventDefault(); navigate(router.href('card', { id })); } });
    const prio = h('button', { class: 'prio', title: 'Toggle priority (updateCard)', onclick: () => act.toggle(id) });
    const left = h('button', { class: 'mini', 'aria-label': 'Move left', onclick: () => act.move(id, -1) }, icon('left', 14));
    const right = h('button', { class: 'mini', 'aria-label': 'Move right', onclick: () => act.move(id, 1) }, icon('right', 14));
    const el = h('div', { class: 'card', 'data-key': id }, title, h('div', { class: 'acts' }, prio, h('span', { class: 'grow' }), left, right));
    return {
      el,
      update(card, ci, ncols) {
        if (title.textContent !== card.title) title.textContent = card.title;
        try { title.setAttribute('href', router.href('card', { id })); } catch (e) {}
        prio.textContent = card.priority; prio.className = 'prio ' + card.priority;
        left.disabled = ci === 0; right.disabled = ci === ncols - 1;
        el.classList.toggle('sel', selectedId === id);
      }
    };
  }
  const flash = (el, cls) => { el.classList.remove('fl-in', 'fl-mv'); void el.offsetWidth; el.classList.add(cls); };
  const stats = { renders: 0, last: { insert: 0, move: 0, remove: 0 }, total: { insert: 0, move: 0, remove: 0 }, fallbacks: 0 };

  function patchColumn(entry, col, ci, ncols) {
    const nextKeys = col.cards.map(c => c.id);
    let plan;
    try { plan = api.reconcile(entry.keys, nextKeys); } catch (e) { fail('reconcile', e); plan = null; }
    const valid = plan && Array.isArray(plan.remove) && Array.isArray(plan.insert) && Array.isArray(plan.move);
    if (!valid) plan = { remove: entry.keys.slice(), insert: nextKeys.slice(), move: [] };   // fall back to a rebuild
    plan.remove.forEach(k => { const n = entry.nodes.get(k); if (n) { n.el.remove(); entry.nodes.delete(k); } });
    const ins = new Set(plan.insert), mv = new Set(plan.move);
    let anchor = null;
    for (let i = nextKeys.length - 1; i >= 0; i--) {
      const k = nextKeys[i];
      let node = entry.nodes.get(k);
      if (!node) { node = makeCardEl(k); entry.nodes.set(k, node); ins.add(k); }
      if (ins.has(k) || mv.has(k)) { entry.list.insertBefore(node.el, anchor); if (entry.keys.length || stats.renders > 1) flash(node.el, ins.has(k) ? 'fl-in' : 'fl-mv'); }
      anchor = node.el;
    }
    // trust, then verify: does the DOM now match the new order?
    const domKeys = [...entry.list.children].map(el => el.getAttribute('data-key'));
    if (domKeys.join(',') !== nextKeys.join(',')) {
      stats.fallbacks++;
      entry.list.replaceChildren(...nextKeys.map(k => entry.nodes.get(k).el));
      fail('reconcile plan', 'it left the list out of order, so the board rebuilt this column. Check the moves.');
    }
    col.cards.forEach(c => entry.nodes.get(c.id).update(c, ci, ncols));
    entry.count.textContent = col.cards.length === col.total ? col.total : col.cards.length + '/' + col.total;
    const prevLen = entry.keys.length;
    entry.keys = nextKeys;
    return { insert: valid ? plan.insert.length : nextKeys.length, move: valid ? plan.move.length : 0, remove: valid ? plan.remove.length : prevLen };
  }

  const routeEl = h('div');
  const detailEl = h('div', { class: 'panel detail' });
  const selEl = h('div');
  const renderEl = h('div');
  const qlinks = h('div', { class: 'qlinks' });

  function draw() {
    stats.renders++;
    const st = store.getState();
    const route = selRoute(st);
    urlInput.value = route ? route.url : '#/';
    backBtn.disabled = pos === 0; fwdBtn.disabled = pos === hist.length - 1;
    const selected = selSelected(st);
    selectedId = selected ? selected.id : null;

    const columns = selColumns(st);
    const sum = { insert: 0, move: 0, remove: 0 };
    columns.forEach((col, ci) => { const r = patchColumn(cols.get(col.id), col, ci, columns.length); sum.insert += r.insert; sum.move += r.move; sum.remove += r.remove; });
    if (stats.renders > 1) { stats.last = sum; Object.keys(sum).forEach(k => { stats.total[k] += sum[k]; }); }

    const filter = selFilter(st), sort = selSort(st);
    const sortQ = sort === 'priority' ? '' : '?sort=priority';
    qlinks.replaceChildren(
      link('All', 'board', {}, sort === 'priority' ? '?sort=priority' : ''), link('High', 'priority', { level: 'high' }, sort === 'priority' ? '?sort=priority' : ''), link('Low', 'priority', { level: 'low' }, sort === 'priority' ? '?sort=priority' : ''),
      h('a', { class: 'qlink' + (sort === 'priority' ? ' on' : ''), href: '#', onclick: e => { e.preventDefault(); const base = (route ? route.url : '#/').split('?')[0]; navigate(base + sortQ); } }, sort === 'priority' ? 'Manual order' : 'Sort by priority'),
      h('a', { class: 'qlink', href: '#', onclick: e => { e.preventDefault(); navigate('#/oops/404'); } }, 'Broken link'));
    boardEl.classList.toggle('filtered', filter !== 'all');

    const m = route && route.match;
    routeEl.replaceChildren(m
      ? h('div', null, h('div', { class: 'kv' }, h('span', null, 'name'), h('span', null, m.name)), h('div', { class: 'kv' }, h('span', null, 'params'), h('span', null, JSON.stringify(m.params))), h('div', { class: 'kv' }, h('span', null, 'query'), h('span', null, JSON.stringify(m.query))))
      : h('div', { class: 'notfound' }, h('b', null, 'No route matches'), h('span', null, (route ? route.url : '') + ': resolve returned null, so the app shows this instead of crashing. '), link('Go home', 'board')));
    if (m && m.name === 'priority' && m.params.level !== 'high' && m.params.level !== 'low') routeEl.append(h('p', { class: 'muted', style: 'font-size:13px;margin:6px 0 0' }, 'The route matched, but "' + m.params.level + '" is not a priority, so every card is hidden. Validating params is the view\'s job.'));

    if (selected === undefined) { detailEl.hidden = true; }
    else {
      detailEl.hidden = false;
      if (!selected) detailEl.replaceChildren(h('h4', null, 'Card #' + m.params.id), h('p', { class: 'muted' }, 'No card with that id.'), link('Close', 'board'));
      else {
        const ttl = h('input', { type: 'text', value: selected.title, 'aria-label': 'Card title', maxlength: '80' });
        ttl.addEventListener('keydown', e => { if (e.key === 'Enter') act.rename(selected.id, ttl.value); });
        const colTitle = st.board.columns[where(selected.id)].title;
        detailEl.replaceChildren(h('h4', null, 'Card #' + selected.id + ' · ' + colTitle),
          h('div', { class: 'addrow', style: 'margin-top:4px' }, ttl, h('button', { class: 'btn sm', onclick: () => act.rename(selected.id, ttl.value) }, 'Rename')),
          h('p', { class: 'muted', style: 'font-size:13px;margin:8px 0' }, 'This panel exists because the URL says so. Copy the address, go elsewhere, paste it back: same view.'),
          link('Close', 'board'));
      }
    }

    const counts = selCounts(st);
    selEl.replaceChildren(
      ...['high', 'low'].map(k => h('div', { class: 'kv' }, h('span', null, k + ' cards (groupBy)'), h('span', null, (counts[k] || []).length))),
      h('div', { class: 'kv' }, h('span', null, 'selColumns recomputed'), h('span', null, selColumns.recomputations ? selColumns.recomputations() : '?')),
      h('div', { class: 'kv' }, h('span', null, 'selCounts recomputed'), h('span', null, selCounts.recomputations ? selCounts.recomputations() : '?')),
      h('div', { class: 'kv' }, h('span', null, 'store renders'), h('span', null, stats.renders)));
    renderEl.replaceChildren(
      h('div', { class: 'kv' }, h('span', null, 'last render'), h('span', null, '+' + stats.last.insert + ' ~' + stats.last.move + ' −' + stats.last.remove)),
      h('div', { class: 'kv' }, h('span', null, 'all renders'), h('span', null, '+' + stats.total.insert + ' ~' + stats.total.move + ' −' + stats.total.remove)),
      h('div', { class: 'kv' }, h('span', null, 'fallback rebuilds'), h('span', null, stats.fallbacks)),
      h('p', { class: 'muted', style: 'font-size:12.5px;margin:6px 0 0' }, '+ inserted, ~ moved, − removed DOM nodes. Click a title or toggle priority: the selector counts barely move and only touched nodes flash.'));
  }

  let unsub = null;
  try { unsub = store.subscribe(() => draw()); } catch (e) { fail('createStore', e); }
  setTeardown(() => { if (typeof unsub === 'function') unsub(); offs.forEach(off => { try { typeof off === 'function' && off(); } catch (e) {} }); });

  const addInput = h('input', { type: 'text', placeholder: 'New card title', 'aria-label': 'New card title', maxlength: '80' });
  const addCard = () => { act.add(addInput.value); addInput.value = ''; addInput.focus(); };
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });

  wrap.append(
    h('div', { class: 'addr' }, backBtn, fwdBtn, h('span', { class: 'addr-pre' }, 'board.app/'), urlInput, h('button', { class: 'btn sm', onclick: () => navigate(urlInput.value.trim() || '#/') }, 'Go')),
    qlinks, errorsEl, detailEl, boardEl,
    h('div', { class: 'addrow' }, addInput, h('button', { class: 'btn', onclick: addCard }, icon('plus', 15), 'Add card')),
    h('div', { class: 'board-side' },
      h('div', { class: 'panel' }, h('h4', null, 'Route (createRouter)'), routeEl),
      h('div', { class: 'panel' }, h('h4', null, 'Activity (bus "*" listener)'), feedEl),
      h('div', { class: 'panel' }, h('h4', null, 'Selectors (createSelector)'), selEl),
      h('div', { class: 'panel' }, h('h4', null, 'DOM patches (reconcile)'), renderEl)));
  detailEl.hidden = true;
  navigate('#/');
  if (stats.renders === 0) draw();
}
