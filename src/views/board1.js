// Capstone, part 1.
import { TIERS } from '../content.js';
import { h, icon } from '../dom.js';
import { go } from '../nav.js';
import { has } from '../state.js';
import { boardReducer, loadPiece } from './boardShared.js';
import { crumbs } from './kit.js';

export function renderBoard(root) {
  const wrap = h('div', { class: 'wrap' }, crumbs(),
    h('div', { class: 'page-title' }, h('h1', null, 'Board, part 1'), h('p', { class: 'muted', style: 'max-width:62ch' }, 'This board runs on the functions you wrote: createStore holds the state, updateCard handles the priority toggle, groupBy builds the priority count. Cards below are samples. Part 2 adds routing, events, selectors and keyed rendering; persistence arrives in Tier 4.')));
  root.append(wrap);
  const ids = ['arr-groupby', 'state-update', 'state-store'];
  if (!ids.every(has)) { wrap.append(h('p', null, 'Finish groupBy, updateCard and createStore to unlock the board.')); return; }
  let api;
  try { api = { groupBy: loadPiece('arr-groupby', 'groupBy'), updateCard: loadPiece('state-update', 'updateCard'), createStore: loadPiece('state-store', 'createStore') }; }
  catch (e) { wrap.append(h('p', { class: 'errbox' }, 'Your saved solutions could not be loaded: ' + e.message)); return; }

  const initial = { name: 'Board', columns: [
    { id: 'todo', title: 'To do', cards: [{ id: 1, title: 'Sketch the data model', priority: 'high' }, { id: 2, title: 'Write the reducer', priority: 'low' }, { id: 3, title: 'Wire up subscribe', priority: 'low' }] },
    { id: 'doing', title: 'In progress', cards: [{ id: 4, title: 'Review AI-written code', priority: 'high' }] },
    { id: 'done', title: 'Done', cards: [{ id: 5, title: 'Finish Tier 1', priority: 'low' }] }] };
  const reducer = boardReducer(api);
  const store = api.createStore(reducer, initial);
  const boardEl = h('div', { class: 'board' });
  const sideEl = h('div', { class: 'board-side' });
  const logEl = h('div', { class: 'log' });
  const logs = [];
  let nextId = 100, renders = 0;
  const input = h('input', { id: 'newcard', type: 'text', placeholder: 'New card title', 'aria-label': 'New card title', maxlength: '80' });
  const addCard = () => { const t = input.value.trim(); if (!t) return; store.dispatch({ type: 'add', id: nextId++, title: t }); input.value = ''; input.focus(); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });

  function draw() {
    renders++;
    const st = store.getState();
    boardEl.replaceChildren(...st.columns.map((col, ci) => h('div', { class: 'col' },
      h('h3', null, col.title, h('span', null, col.cards.length)),
      col.cards.map(card => h('div', { class: 'card' },
        h('div', { class: 't' }, card.title),
        h('div', { class: 'acts' },
          h('button', { class: 'prio ' + card.priority, title: 'Toggle priority (uses updateCard)', onclick: () => store.dispatch({ type: 'patch', cardId: card.id, patch: { priority: card.priority === 'high' ? 'low' : 'high' } }) }, card.priority),
          h('span', { class: 'grow' }),
          h('button', { class: 'mini', 'aria-label': 'Move left', disabled: ci === 0, onclick: () => store.dispatch({ type: 'move', cardId: card.id, to: st.columns[ci - 1].id }) }, icon('left', 14)),
          h('button', { class: 'mini', 'aria-label': 'Move right', disabled: ci === st.columns.length - 1, onclick: () => store.dispatch({ type: 'move', cardId: card.id, to: st.columns[ci + 1].id }) }, icon('right', 14))))))));
    const all = st.columns.flatMap(c => c.cards);
    const groups = api.groupBy(all, c => c.priority);
    sideEl.replaceChildren(
      h('div', { class: 'panel' }, h('h4', null, 'Cards by priority (groupBy)'),
        ['high', 'low'].map(k => h('div', { class: 'kv' }, h('span', null, k), h('span', null, (groups[k] || []).length)))),
      h('div', { class: 'panel' }, h('h4', null, 'Dispatched actions (subscribe)'), logEl),
      h('div', { class: 'panel' }, h('h4', null, 'Store'), h('div', { class: 'kv' }, h('span', null, 'Re-renders'), h('span', null, renders)), h('div', { class: 'kv' }, h('span', null, 'Cards total'), h('span', null, all.length))));
  }
  store.subscribe(() => draw());
  const origDispatch = store.dispatch;
  store.dispatch = function (act) {
    const prev = store.getState();
    const r = origDispatch.call(store, act);
    logs.unshift(act.type + (act.cardId ? ' #' + act.cardId : '') + (act.to ? ' → ' + act.to : '') + (store.getState() === prev ? '  (no change)' : ''));
    logEl.replaceChildren(...logs.slice(0, 20).map(l => h('div', null, l)));
    return r;
  };
  wrap.append(boardEl, h('div', { class: 'addrow' }, input, h('button', { class: 'btn', onclick: addCard }, icon('plus', 15), 'Add card')), sideEl);
  if (has('render-reconcile') && [...TIERS[1].parts].every(p => has(p[0]))) wrap.append(h('p', { style: 'margin-top:18px' }, h('button', { class: 'btn ghost', onclick: () => go({ name: 'board2' }) }, icon('layers', 15), 'Open Board, part 2')));
  draw();
}
// The board's own reducer: written once here and shared by both parts. updateCard is yours.
