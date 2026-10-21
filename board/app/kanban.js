// The kanban board. Every moving part is one of your modules:
//   state      createStore + combineReducers({ board, ui })   card edits go through updateCard
//   derived    createSelector (filtering, sorting, counts via groupBy)
//   routing    createRouter on the real location.hash, so back/forward, reload and links work
//   events     createEventBus: actions announce what happened; the activity feed listens
//   rendering  reconcile: each column moves existing DOM nodes instead of rebuilding them
import { h, icon, toast } from './dom.js';
import { createBoardReducer } from './boardReducer.js';
import { SAMPLE_BOARD } from './sampleData.js';

const ROUTES = [
  { name: 'board', path: '/' },
  { name: 'priority', path: '/priority/:level' },
  { name: 'card', path: '/card/:id' },
];

export function mountKanban(root, mine) {
  const { groupBy, updateCard, createStore, combineReducers, createSelector, createEventBus, createRouter, reconcile } = mine;

  const errorsEl = h('div', { 'aria-live': 'polite' });
  const fail = (where, e) => {
    errorsEl.replaceChildren(h('div', { class: 'errbox board-err' }, 'Your ' + where + ' threw: ' + (e && e.message || e)));
    console.error(where, e);
  };

  /* ---------- state ---------- */
  const boardSlice = createBoardReducer(updateCard);
  const board = (state = SAMPLE_BOARD, act) => boardSlice(state, act);
  const ui = (state = { route: null }, act) => (act.type === 'route' ? { ...state, route: act.route } : state);
  const reducer = combineReducers({ board, ui });
  const store = createStore(reducer, reducer(undefined, { type: '@@init' }));
  const bus = createEventBus({ onError: (e, type) => feed('listener error on ' + type + ': ' + e.message) });
  const router = createRouter(ROUTES);

  /* ---------- selectors ---------- */
  const selRoute = s => s.ui.route;
  const selFilter = createSelector(selRoute, r => (r && r.match && r.match.name === 'priority' ? r.match.params.level : 'all'));
  const selSort = createSelector(selRoute, r => (r && r.match && r.match.query.sort === 'priority' ? 'priority' : 'manual'));
  const selCards = createSelector(s => s.board, b => b.columns.flatMap(c => c.cards));
  const selCounts = createSelector(selCards, cards => groupBy(cards, c => c.priority));
  const selColumns = createSelector(s => s.board, selFilter, selSort, (b, filter, sort) => b.columns.map(col => {
    let cards = filter === 'all' ? col.cards : col.cards.filter(c => c.priority === filter);
    if (sort === 'priority') cards = [...cards].sort((x, y) => (x.priority === 'high' ? 0 : 1) - (y.priority === 'high' ? 0 : 1));
    return { id: col.id, title: col.title, cards, total: col.cards.length };
  }));
  const selSelected = createSelector(selRoute, selCards, (r, cards) =>
    (r && r.match && r.match.name === 'card' ? (cards.find(c => String(c.id) === r.match.params.id) || null) : undefined));

  /* ---------- actions: change state, then announce it ---------- */
  let nextId = 100;
  const safeDispatch = a => { try { store.dispatch(a); } catch (e) { fail('reducer or store', e); } };
  const emit = (type, payload) => { try { bus.emit(type, payload); } catch (e) { fail('event bus', e); } };
  const columnIndexOf = id => store.getState().board.columns.findIndex(c => c.cards.some(x => x.id === id));
  const cardOf = id => selCards(store.getState()).find(c => c.id === id);
  const act = {
    move(id, dir) {
      const cols = store.getState().board.columns, ci = columnIndexOf(id), to = cols[ci + dir];
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
    },
  };

  /* ---------- routing on the real address bar ---------- */
  function syncRoute() {
    const url = location.hash || '#/';
    let match = null;
    try { match = router.resolve(url); } catch (e) { fail('router', e); }
    safeDispatch({ type: 'route', route: { url, match } });
    emit('route:changed', { url, name: match ? match.name : null });
  }
  const navigate = url => { if (location.hash === url) syncRoute(); else location.hash = url; };
  window.addEventListener('hashchange', syncRoute);
  const href = (name, params, query = '') => {
    try { return router.href(name, params || {}) + query; } catch (e) { fail('router href', e); return '#/'; }
  };
  const link = (label, url, cls = '') => h('a', { class: 'qlink ' + cls, href: url }, label);

  /* ---------- activity feed: a bus listener ---------- */
  const feedLines = [];
  const feedEl = h('div', { class: 'log' });
  function feed(line) {
    feedLines.unshift(line);
    feedEl.replaceChildren(...feedLines.slice(0, 30).map(l => h('div', null, l)));
  }
  bus.on('*', (payload, type) => feed(type + '  ' + (payload && typeof payload === 'object'
    ? Object.entries(payload).map(([k, v]) => k + '=' + v).join(' ') : String(payload))));
  bus.once('card:moved', () => toast('First move. The activity feed heard it on your bus.', 'route'));
  bus.on('card:added', p => toast('Card added: ' + p.title, 'plus'));

  /* ---------- DOM: persistent columns, keyed cards patched with your reconcile ---------- */
  const boardEl = h('div', { class: 'board' });
  const cols = new Map();
  for (const c of store.getState().board.columns) {
    const list = h('div', { class: 'list' });
    const count = h('span');
    const el = h('div', { class: 'col' }, h('h3', null, c.title, count), list);
    cols.set(c.id, { el, list, count, nodes: new Map(), keys: [] });
    boardEl.append(el);
  }
  let selectedId = null;
  function makeCardEl(id) {
    const title = h('a', { class: 't', href: href('card', { id }) });
    const prio = h('button', { class: 'prio', title: 'Toggle priority (updateCard)', onclick: () => act.toggle(id) });
    const left = h('button', { class: 'mini', 'aria-label': 'Move left', onclick: () => act.move(id, -1) }, icon('left', 14));
    const right = h('button', { class: 'mini', 'aria-label': 'Move right', onclick: () => act.move(id, 1) }, icon('right', 14));
    const el = h('div', { class: 'card', 'data-key': id }, title, h('div', { class: 'acts' }, prio, h('span', { class: 'grow' }), left, right));
    return {
      el,
      update(card, ci, ncols) {
        if (title.textContent !== card.title) title.textContent = card.title;
        prio.textContent = card.priority;
        prio.className = 'prio ' + card.priority;
        left.disabled = ci === 0;
        right.disabled = ci === ncols - 1;
        el.classList.toggle('sel', selectedId === id);
      },
    };
  }
  const flash = (el, cls) => { el.classList.remove('fl-in', 'fl-mv'); void el.offsetWidth; el.classList.add(cls); };
  const stats = { renders: 0, last: { insert: 0, move: 0, remove: 0 }, total: { insert: 0, move: 0, remove: 0 }, fallbacks: 0 };

  function patchColumn(entry, col, ci, ncols) {
    const nextKeys = col.cards.map(c => c.id);
    let plan = null;
    try { plan = reconcile(entry.keys, nextKeys); } catch (e) { fail('reconcile', e); }
    const valid = plan && Array.isArray(plan.remove) && Array.isArray(plan.insert) && Array.isArray(plan.move);
    if (!valid) plan = { remove: entry.keys.slice(), insert: nextKeys.slice(), move: [] };   // fall back to a rebuild
    for (const k of plan.remove) { const n = entry.nodes.get(k); if (n) { n.el.remove(); entry.nodes.delete(k); } }
    const ins = new Set(plan.insert), mv = new Set(plan.move);
    let anchor = null;
    for (let i = nextKeys.length - 1; i >= 0; i--) {
      const k = nextKeys[i];
      let node = entry.nodes.get(k);
      if (!node) { node = makeCardEl(k); entry.nodes.set(k, node); ins.add(k); }
      if (ins.has(k) || mv.has(k)) {
        entry.list.insertBefore(node.el, anchor);
        if (stats.renders > 1) flash(node.el, ins.has(k) ? 'fl-in' : 'fl-mv');
      }
      anchor = node.el;
    }
    // Trust, then verify: does the DOM now match the new order?
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
    return valid
      ? { insert: plan.insert.length, move: plan.move.length, remove: plan.remove.length }
      : { insert: nextKeys.length, move: 0, remove: prevLen };
  }

  /* ---------- the rest of the page ---------- */
  const hashEl = h('code');
  const qlinks = h('div', { class: 'qlinks' });
  const detailEl = h('div', { class: 'panel detail', hidden: true });
  const routeEl = h('div');
  const selEl = h('div');
  const renderEl = h('div');

  function draw() {
    stats.renders++;
    const st = store.getState();
    const route = selRoute(st);
    const m = route && route.match;
    hashEl.textContent = route ? route.url : '#/';
    const selected = selSelected(st);
    selectedId = selected ? selected.id : null;

    const columns = selColumns(st);
    const sum = { insert: 0, move: 0, remove: 0 };
    columns.forEach((col, ci) => {
      const r = patchColumn(cols.get(col.id), col, ci, columns.length);
      sum.insert += r.insert; sum.move += r.move; sum.remove += r.remove;
    });
    if (stats.renders > 1) { stats.last = sum; for (const k of Object.keys(sum)) stats.total[k] += sum[k]; }

    const filter = selFilter(st), sort = selSort(st);
    const keepSort = sort === 'priority' ? '?sort=priority' : '';
    const base = (route ? route.url : '#/').split('?')[0];
    qlinks.replaceChildren(
      link('All', href('board', {}, keepSort), filter === 'all' ? 'on' : ''),
      link('High', href('priority', { level: 'high' }, keepSort), filter === 'high' ? 'on' : ''),
      link('Low', href('priority', { level: 'low' }, keepSort), filter === 'low' ? 'on' : ''),
      link(sort === 'priority' ? 'Manual order' : 'Sort by priority', base + (sort === 'priority' ? '' : '?sort=priority'), sort === 'priority' ? 'on' : ''),
      link('Broken link', '#/oops/404'));

    routeEl.replaceChildren(m
      ? h('div', null,
          h('div', { class: 'kv' }, h('span', null, 'name'), h('span', null, m.name)),
          h('div', { class: 'kv' }, h('span', null, 'params'), h('span', null, JSON.stringify(m.params))),
          h('div', { class: 'kv' }, h('span', null, 'query'), h('span', null, JSON.stringify(m.query))))
      : h('div', { class: 'notfound' }, h('b', null, 'No route matches'),
          h('span', null, (route ? route.url : '') + ': resolve returned null, so the board shows this instead of crashing. '),
          link('Go home', href('board'))));
    if (m && m.name === 'priority' && m.params.level !== 'high' && m.params.level !== 'low') {
      routeEl.append(h('p', { class: 'muted', style: 'font-size:13px;margin:6px 0 0' }, 'The route matched, but "' + m.params.level + '" is not a priority, so every card is hidden. Validating params is the view\'s job.'));
    }

    if (selected === undefined) detailEl.hidden = true;
    else {
      detailEl.hidden = false;
      if (!selected) detailEl.replaceChildren(h('h4', null, 'Card #' + m.params.id), h('p', { class: 'muted' }, 'No card with that id.'), link('Close', href('board')));
      else {
        const ttl = h('input', { type: 'text', value: selected.title, 'aria-label': 'Card title', maxlength: '80' });
        ttl.addEventListener('keydown', e => { if (e.key === 'Enter') act.rename(selected.id, ttl.value); });
        const colTitle = st.board.columns[columnIndexOf(selected.id)].title;
        detailEl.replaceChildren(h('h4', null, 'Card #' + selected.id + ' · ' + colTitle),
          h('div', { class: 'addrow', style: 'margin-top:4px' }, ttl, h('button', { class: 'btn sm', onclick: () => act.rename(selected.id, ttl.value) }, 'Rename')),
          h('p', { class: 'muted', style: 'font-size:13px;margin:8px 0' }, 'This panel exists because the URL says so. Reload, or copy the address into a new tab: same view.'),
          link('Close', href('board')));
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
      h('p', { class: 'muted', style: 'font-size:12.5px;margin:6px 0 0' }, '+ inserted, ~ moved, − removed DOM nodes. Toggle a priority or open a card: the selector counts barely move and only touched nodes flash.'));
  }

  store.subscribe(() => draw());

  const addInput = h('input', { type: 'text', placeholder: 'New card title', 'aria-label': 'New card title', maxlength: '80' });
  const addCard = () => { act.add(addInput.value); addInput.value = ''; addInput.focus(); };
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });

  root.append(
    h('div', { class: 'hashbar' }, 'location.hash', hashEl),
    qlinks, errorsEl, detailEl, boardEl,
    h('div', { class: 'addrow' }, addInput, h('button', { class: 'btn', onclick: addCard }, icon('plus', 15), 'Add card')),
    h('div', { class: 'board-side' },
      h('div', { class: 'panel' }, h('h4', null, 'Route (createRouter)'), routeEl),
      h('div', { class: 'panel' }, h('h4', null, 'Activity (bus "*" listener)'), feedEl),
      h('div', { class: 'panel' }, h('h4', null, 'Selectors (createSelector)'), selEl),
      h('div', { class: 'panel' }, h('h4', null, 'DOM patches (reconcile)'), renderEl)));

  syncRoute();
  if (stats.renders === 0) draw();
  return { store, bus, router, navigate };
}
