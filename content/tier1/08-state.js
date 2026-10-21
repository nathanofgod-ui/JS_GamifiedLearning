// Tier 1, lesson 8: Objects, Immutability & the Store
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'state',
  tier: 1,
  n: 8,
  title: 'Objects, Immutability & the Store',
  blurb: 'Structural sharing and your first state store',
  note: `
<p>UI code is easier to reason about when state changes by <b>replacing</b> values instead of editing them in place. Code can detect a change just by checking <code>newState !== oldState</code>.</p>
<h4>Spread is shallow</h4>
<p><code>{ ...obj }</code> and <code>[...arr]</code> copy one level. Nested objects are still shared with the original, so editing them edits both.</p>
~~~
const a = { user: { name: 'Ada' }, tags: ['x'] };
const b = { ...a };
b.user === a.user;   // true: same nested object
~~~
<h4>The immutable update pattern</h4>
<p>To change something deep, copy every object on the path to it and reuse everything else. Untouched branches keep their identity ("structural sharing"), which makes change detection cheap.</p>
~~~
const next = {
  ...state,
  user: { ...state.user, name: 'Grace' },   // new objects on the path
};                                          // state.tags is reused as is
~~~
<p><code>Object.freeze</code> makes an object read-only, but only one level deep. Use it in tests to catch accidental mutation.</p>
<h4>A store in thirty lines</h4>
<p>A store holds the current state in a closure, changes it through a <b>reducer</b> (a pure function <code>(state, action) =&gt; newState</code>), and notifies subscribers. This is the core idea behind Redux and most UI frameworks' state.</p>
~~~
const store = createStore(reducer, { count: 0 });
const off = store.subscribe(state => render(state));
store.dispatch({ type: 'inc' });
off();   // unsubscribe
~~~`,
  eye: 'In a reducer, any <code>push</code>, <code>splice</code>, <code>sort</code>, assignment to <code>state.x</code> or <code>Object.assign(state, ...)</code> is a bug. A shallow spread that edits a nested field is the subtler version of the same bug.',
  challenges: [
    {
      id: 'state-shallow',
      type: 'mcq',
      title: 'How shallow is the copy?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const a = { user: { name: 'Ada' }, tags: ['x'] };
const b = { ...a };

b.user.name = 'Grace';
b.tags = ['y'];

console.log(a.user.name, a.tags[0]);`,
      options: ['Ada x', 'Grace x', 'Grace y', 'Ada y'],
      answer: 1,
      explain: 'The spread copies the top level only. <code>b.user</code> and <code>a.user</code> are the same object, so editing <code>name</code> shows up in both. Assigning <code>b.tags</code> replaces the property on <code>b</code> alone, so <code>a.tags</code> is untouched.'
    },
    {
      id: 'state-update',
      type: 'code',
      title: 'updateCard',
      xp: 55,
      capstone: true,
      prompt: `<p>A board looks like <code>{ columns: [{ id, title, cards: [{ id, title, ... }] }] }</code>. Write <code>updateCard(board, cardId, patch)</code> that returns a <b>new</b> board in which the card with that id has the <code>patch</code> merged in.</p>
<ul><li>Never mutate the input (the tests deep-freeze it).</li><li>Any column or card that did not change must be the <b>same object</b> as before (<code>===</code>).</li><li>If no card has that id, return the original board.</li></ul>
<p class="muted">This will power editing and flagging cards on your Board.</p>`,
      starter: `function updateCard(board, cardId, patch) {
  // your code here
}`,
      hints: [
        "Use <code>board.columns.map(...)</code>. For a column that doesn't contain the card, return the column itself.",
        'For the column that does, return <code>{ ...col, cards: col.cards.map(...) }</code> and inside it replace only the matching card with <code>{ ...card, ...patch }</code>.',
        'Track whether anything changed so you can return the original board when the id is unknown.'
      ],
      tests: `
function deepFreeze(o) { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }
const make = () => deepFreeze({
  name: 'Sprint',
  columns: [
    { id: 'todo', title: 'To do', cards: [{ id: 1, title: 'A', priority: 'low' }, { id: 2, title: 'B', priority: 'low' }] },
    { id: 'done', title: 'Done', cards: [{ id: 3, title: 'C', priority: 'high' }] },
  ],
});
test('patches the card', () => {
  const next = updateCard(make(), 2, { title: 'B2', priority: 'high' });
  eq(next.columns[0].cards[1], { id: 2, title: 'B2', priority: 'high' });
});
test('does not mutate the input', () => {
  const b = make();
  updateCard(b, 1, { title: 'changed' });
  eq(b.columns[0].cards[0].title, 'A');
});
test('returns a new board and new path objects', () => {
  const b = make(); const next = updateCard(b, 1, { title: 'x' });
  assert(next !== b, 'board should be a new object');
  assert(next.columns !== b.columns, 'columns array should be new');
  assert(next.columns[0] !== b.columns[0], 'changed column should be new');
  assert(next.columns[0].cards[0] !== b.columns[0].cards[0], 'changed card should be new');
});
test('keeps untouched columns by reference', () => { const b = make(); const next = updateCard(b, 1, { title: 'x' }); assert(next.columns[1] === b.columns[1], 'other column should be reused'); });
test('keeps untouched cards by reference', () => { const b = make(); const next = updateCard(b, 1, { title: 'x' }); assert(next.columns[0].cards[1] === b.columns[0].cards[1], 'sibling card should be reused'); });
test('keeps other board fields', () => eq(updateCard(make(), 3, { title: 'z' }).name, 'Sprint'));
test('unknown id returns the same board', () => { const b = make(); assert(updateCard(b, 999, { title: 'x' }) === b, 'should return the original'); });`,
      solution: `function updateCard(board, cardId, patch) {
  let changed = false;
  const columns = board.columns.map(col => {
    if (!col.cards.some(c => c.id === cardId)) return col;
    changed = true;
    return {
      ...col,
      cards: col.cards.map(c => (c.id === cardId ? { ...c, ...patch } : c)),
    };
  });
  return changed ? { ...board, columns } : board;
}`,
      why: 'Only the objects on the path to the change are copied. Everything else keeps its identity, so a UI can skip re-rendering any column whose reference did not change.'
    },
    {
      id: 'state-review',
      type: 'review',
      title: 'AI review: the sneaky reducer',
      xp: 50,
      context: `<p>You asked for two new reducer cases. The assistant pointed out that it "returns a new state object with spread, so it's immutable".</p>`,
      prompt: '<p><b>The spec:</b> <code>boardReducer(state, action)</code> handles <code>renameColumn</code> (<code>{ id, title }</code>) and <code>removeCard</code> (<code>{ cardId }</code>) without mutating anything, reusing every untouched column and card. Unknown ids and unknown actions return the same state. (The tests deep-freeze the state.)</p>',
      code: `function boardReducer(state, action) {
  switch (action.type) {
    case 'renameColumn': {
      const col = state.columns.find(c => c.id === action.id);
      col.title = action.title;
      return { ...state };
    }
    case 'removeCard': {
      const col = state.columns.find(c => c.cards.some(card => card.id === action.cardId));
      col.cards.splice(col.cards.findIndex(card => card.id === action.cardId), 1);
      return { ...state, columns: [...state.columns] };
    }
    default:
      return state;
  }
}`,
      question: 'Is the assistant right that this is immutable?',
      options: [
        'Yes: spreading state at the end produces a fresh copy',
        'No: it edits the existing column and its cards array in place, and the shallow spread only copies the outer object',
        'No: find should be filter, because find returns a copy',
        'No: switch cases cannot declare const without a block'
      ],
      answer: 1,
      diagnosis: '<code>col</code> is the very column object inside the old state; assigning its <code>title</code> or <code>splice</code>-ing its cards changes the old state too, so anything comparing references sees "no change" in that column. The final spread copies one level, after the damage is done. An unknown id also crashes, because <code>col</code> is <code>undefined</code>. The blocks around the cases are fine.',
      hints: [
        'Use <code>map</code> over the columns: return the same column when it is unaffected and a new <code>{ ...col, ... }</code> when it is.',
        "Check up front whether the id exists, and return <code>state</code> if it doesn't."
      ],
      tests: `
function deepFreeze(o) { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }
const make = () => deepFreeze({ columns: [
  { id: 'todo', title: 'To do', cards: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }] },
  { id: 'done', title: 'Done', cards: [{ id: 3, title: 'C' }] },
] });
test('renames a column without mutating', () => { const s = make(); const n = boardReducer(s, { type: 'renameColumn', id: 'done', title: 'Shipped' }); eq(n.columns[1].title, 'Shipped'); eq(s.columns[1].title, 'Done'); assert(n.columns[0] === s.columns[0], 'untouched column should be reused'); });
test('removes a card without mutating', () => {
  const s = make(); const n = boardReducer(s, { type: 'removeCard', cardId: 1 });
  eq(n.columns[0].cards, [{ id: 2, title: 'B' }]); eq(s.columns[0].cards.length, 2);
  assert(n.columns[0].cards[0] === s.columns[0].cards[1], 'the remaining card should be reused');
  assert(n.columns[1] === s.columns[1], 'the other column should be reused');
});
test('unknown ids return the same state', () => { const s = make(); assert(boardReducer(s, { type: 'renameColumn', id: 'nope', title: 'x' }) === s, 'rename'); assert(boardReducer(s, { type: 'removeCard', cardId: 99 }) === s, 'remove'); });
test('unknown actions return the same state', () => { const s = make(); assert(boardReducer(s, { type: 'other' }) === s, 'should return state'); });`,
      solution: `function boardReducer(state, action) {
  switch (action.type) {
    case 'renameColumn': {
      if (!state.columns.some(c => c.id === action.id)) return state;
      return {
        ...state,
        columns: state.columns.map(c => (c.id === action.id ? { ...c, title: action.title } : c)),
      };
    }
    case 'removeCard': {
      const has = c => c.cards.some(card => card.id === action.cardId);
      if (!state.columns.some(has)) return state;
      return {
        ...state,
        columns: state.columns.map(c =>
          has(c) ? { ...c, cards: c.cards.filter(card => card.id !== action.cardId) } : c
        ),
      };
    }
    default:
      return state;
  }
}`,
      why: '"Returns a new object" is not the same as "does not mutate". Immutability means every object on the path to the change is copied <b>before</b> being changed, and nothing reachable from the old state is touched.'
    },
    {
      id: 'state-store',
      type: 'code',
      title: 'Boss: createStore',
      xp: 100,
      boss: true,
      capstone: true,
      prompt: `<p>Build the heart of your Board. Write <code>createStore(reducer, initialState)</code> returning an object with:</p>
<ul>
<li><code>getState()</code>: the current state.</li>
<li><code>dispatch(action)</code>: sets state to <code>reducer(state, action)</code>, then calls every subscriber with <code>(newState, previousState)</code>, <b>but only if the state actually changed</b> (<code>!==</code>). Returns the action.</li>
<li><code>subscribe(listener)</code>: registers a listener and returns an <code>unsubscribe</code> function. Calling unsubscribe twice must be harmless.</li>
</ul>
<p>A listener that unsubscribes itself during a dispatch must not stop the other listeners from running. Two stores must never share state or listeners.</p>`,
      starter: `function createStore(reducer, initialState) {
  // your code here
}`,
      hints: [
        'Keep <code>state</code> and a <code>Set</code> of listeners as closure variables. Return an object literal with the three methods.',
        'Remember <code>const prev = state</code> before calling the reducer, so you can pass it on and compare.',
        'Iterate over a copy of the listeners (<code>[...listeners]</code>) so changes to the set during a notification are safe.',
        '<code>subscribe</code> returns <code>() =&gt; listeners.delete(listener)</code>. Deleting something twice is fine for a Set.'
      ],
      tests: `
const counter = (s, a) => (a.type === 'inc' ? { n: s.n + 1 } : a.type === 'noop' ? s : s);
test('getState returns the initial state', () => { const init = { n: 0 }; assert(createStore(counter, init).getState() === init, 'should return the same object'); });
test('dispatch runs the reducer and stores the result', () => { const s = createStore(counter, { n: 0 }); s.dispatch({ type: 'inc' }); s.dispatch({ type: 'inc' }); eq(s.getState(), { n: 2 }); });
test('reducer receives state and action', () => { const seen = []; const s = createStore((st, a) => { seen.push([st, a]); return st; }, 5); const act = { type: 'x' }; s.dispatch(act); eq(seen[0][0], 5); assert(seen[0][1] === act, 'action passed through'); });
test('dispatch returns the action', () => { const s = createStore(counter, { n: 0 }); const act = { type: 'inc' }; assert(s.dispatch(act) === act, 'should return the action'); });
test('listeners get new and previous state', () => { const s = createStore(counter, { n: 0 }); const calls = []; s.subscribe((next, prev) => calls.push([next, prev])); s.dispatch({ type: 'inc' }); eq(calls, [[{ n: 1 }, { n: 0 }]]); });
test('no notification when state is unchanged', () => { const s = createStore(counter, { n: 0 }); let n = 0; s.subscribe(() => n++); s.dispatch({ type: 'noop' }); eq(n, 0); });
test('unsubscribe stops notifications', () => { const s = createStore(counter, { n: 0 }); let n = 0; const off = s.subscribe(() => n++); s.dispatch({ type: 'inc' }); off(); s.dispatch({ type: 'inc' }); eq(n, 1); });
test('unsubscribe twice is harmless', () => { const s = createStore(counter, { n: 0 }); const off = s.subscribe(() => {}); off(); off(); });
test('self-unsubscribing listener does not skip others', () => {
  const s = createStore(counter, { n: 0 }); const hits = [];
  const offA = s.subscribe(() => { hits.push('a'); offA(); });
  s.subscribe(() => hits.push('b'));
  s.dispatch({ type: 'inc' }); s.dispatch({ type: 'inc' });
  eq(hits, ['a', 'b', 'b']);
});
test('stores are independent', () => { const a = createStore(counter, { n: 0 }); const b = createStore(counter, { n: 0 }); let hits = 0; b.subscribe(() => hits++); a.dispatch({ type: 'inc' }); eq([a.getState().n, b.getState().n, hits], [1, 0, 0]); });`,
      solution: `function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    dispatch(action) {
      const prev = state;
      state = reducer(state, action);
      if (state !== prev) {
        [...listeners].forEach(listener => listener(state, prev));
      }
      return action;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}`,
      why: 'State and listeners live in a closure, so nothing outside can change them except through <code>dispatch</code>. Comparing references after the reducer runs is the same trick UI libraries use to decide whether to re-render.'
    }
  ]
};
