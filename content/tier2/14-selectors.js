// Tier 2, lesson 14: Reducers & Selectors at Scale
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'selectors',
  tier: 2,
  n: 14,
  title: 'Reducers & Selectors at Scale',
  blurb: 'combineReducers, derived state, memoisation',
  note: `
<p>One reducer with a <code>switch</code> over every action works for ten actions and collapses at fifty. Two ideas keep a store manageable: split the reducer by <b>slice</b> of state, and stop storing anything you can <b>derive</b>.</p>
<h4>Slice reducers</h4>
<p>Each slice reducer owns one key of the state and receives <b>every</b> action. It returns its slice unchanged for actions it does not care about. A default parameter supplies its initial value when the store starts with <code>undefined</code>.</p>
~~~
const ui = (state = { filter: 'all' }, action) =>
  action.type === 'filter' ? { ...state, filter: action.value } : state;

const reducer = combineReducers({ board, ui });
// reducer(undefined, { type: '@@init' }) -> { board: ..., ui: { filter: 'all' } }
~~~
<p>The combiner's one subtle duty: if no slice changed, return the <b>previous state object</b>. Your <code>createStore</code> only notifies when <code>next !== prev</code>, so a combiner that always builds a fresh object re-renders the whole app on every action, including ones nobody handles.</p>
<h4>Derived state</h4>
<p>"How many high-priority cards?" and "which cards match the filter?" are functions of the state. Storing them as well means two sources of truth that will drift apart. Compute them with <b>selectors</b>: plain functions <code>state =&gt; value</code>.</p>
<h4>Memoised selectors</h4>
<p>Recomputing on every render is wasteful, and worse, a selector that returns a <b>new array</b> each time makes every downstream identity check fail. The fix is the pattern Reselect made popular:</p>
~~~
const selectVisible = createSelector(
  s => s.board.cards,        // input selectors: cheap lookups
  s => s.ui.filter,
  (cards, filter) => cards.filter(c => filter === 'all' || c.priority === filter)
);
~~~
<p>Every call runs the input selectors. If each returns the same value as last time (<code>Object.is</code>), the expensive result function is skipped and the previous result is returned, same reference and all. This only works because state is immutable: unchanged data keeps its identity, so identity is a free change detector.</p>
<h4>The traps</h4>
<ul>
<li>An input selector that does work (<code>s =&gt; s.cards.filter(...)</code>) returns a new array every time, so the memo never hits.</li>
<li>Memoising on the whole state misses on every unrelated change and ignores extra arguments.</li>
<li>A cache of size one is shared by every caller; selectors that take an id need one instance per component, or a bigger cache.</li>
</ul>`,
  eye: 'Generated reducers often "normalise" by spreading on every action (<code>return { ...state }</code> in the default branch), which defeats every identity check downstream. Generated selectors often do their filtering inside an input selector, or memoise on the whole state. Ask: what exactly is compared, and does unchanged data keep its reference?',
  challenges: [
    {
      id: 'sel-memo',
      type: 'mcq',
      title: 'Does the memo hit?',
      xp: 15,
      prompt: '<p>How many times does the expensive function run? What does this print?</p>',
      code: `let computed = 0;
const memoLast = fn => {
  let lastArg, lastResult, has = false;
  return arg => {
    if (has && arg === lastArg) return lastResult;
    has = true; lastArg = arg; computed++;
    return (lastResult = fn(arg));
  };
};

const countCards = memoLast(cards => cards.length);
const state = { cards: [{ p: 'high' }, { p: 'low' }] };
const selectHigh = s => s.cards.filter(c => c.p === 'high');

countCards(selectHigh(state));
countCards(selectHigh(state));
countCards(state.cards);
countCards(state.cards);
console.log(computed);`,
      options: ['1', '2', '3', '4'],
      answer: 2,
      explain: '<code>filter</code> builds a new array on every call, so the first two calls both miss even though the state never changed. The third call misses because it is a different array again; only the fourth, with the identical <code>state.cards</code>, hits. Doing work in an input selector defeats memoisation.'
    },
    {
      id: 'sel-combine',
      type: 'code',
      title: 'Board piece: combineReducers',
      xp: 55,
      capstone: true,
      prompt: `<p>Write <code>combineReducers(reducers)</code>. <code>reducers</code> maps keys to slice reducers. It returns a reducer <code>(state, action)</code> that:</p>
<ul>
<li>calls every slice reducer with its slice (<code>undefined</code> if missing) and the action, in key order;</li>
<li>throws an error naming the key if a slice reducer returns <code>undefined</code>;</li>
<li>returns the <b>previous state object</b> if every slice is <code>===</code> to before; otherwise a new object (never mutating the old one);</li>
<li>handles a missing <code>state</code> (the store's first call), and drops keys that no reducer owns.</li>
</ul>
<p class="muted">Your Board's state becomes <code>{ board, ui }</code>, combined by this function.</p>`,
      starter: `function combineReducers(reducers) {
  // your code here
}`,
      hints: [
        'Default the state parameter to <code>{}</code>. Build <code>next</code> while tracking a <code>changed</code> flag.',
        'If the old state has a different number of keys than the reducers, something must change too.'
      ],
      tests: `
const count = (s = 0, a) => (a.type === 'inc' ? s + 1 : s);
const todos = (s = [], a) => (a.type === 'add' ? s.concat([a.text]) : s);
test('builds the initial state from each slice', () => eq(combineReducers({ count, todos })(undefined, { type: '@@init' }), { count: 0, todos: [] }));
test('every slice sees every action, in key order', () => {
  const seen = [];
  const r = combineReducers({ a: (s = 0, act) => { seen.push('a:' + act.type); return s; }, b: (s = 0, act) => { seen.push('b:' + act.type); return s; } });
  r(undefined, { type: 'x' }); eq(seen, ['a:x', 'b:x']);
});
test('updates only the slice that changed', () => { const r = combineReducers({ count, todos }); const s0 = r(undefined, { type: '@@init' }); const s1 = r(s0, { type: 'inc' }); eq(s1.count, 1); assert(s1.todos === s0.todos, 'unchanged slice should keep its identity'); });
test('returns the same state object when nothing changed', () => { const r = combineReducers({ count, todos }); const s0 = r(undefined, { type: '@@init' }); assert(r(s0, { type: 'unknown' }) === s0, 'should return the previous state'); });
test('does not mutate the previous state', () => { const r = combineReducers({ count, todos }); const s0 = Object.freeze(r(undefined, { type: '@@init' })); const s1 = r(s0, { type: 'inc' }); eq([s0.count, s1.count], [0, 1]); });
test('a slice returning undefined is an error', () => { const r = combineReducers({ count, broken: () => undefined }); assert(/broken/.test(throws(() => r(undefined, { type: 'x' })).message), 'message should name the slice'); });
test('reducers nest', () => { const r = combineReducers({ ui: combineReducers({ count }), todos }); eq(r(r(undefined, { type: '@@init' }), { type: 'inc' }), { ui: { count: 1 }, todos: [] }); });
test('keys no reducer owns are dropped', () => eq(combineReducers({ count })({ count: 0, stale: true }, { type: 'x' }), { count: 0 }));`,
      solution: `function combineReducers(reducers) {
  const keys = Object.keys(reducers);
  return function combination(state = {}, action) {
    let changed = Object.keys(state).length !== keys.length;
    const next = {};
    for (const key of keys) {
      const prevSlice = state[key];
      const nextSlice = reducers[key](prevSlice, action);
      if (nextSlice === undefined) {
        throw new Error('Reducer "' + key + '" returned undefined for action ' + action.type);
      }
      next[key] = nextSlice;
      if (nextSlice !== prevSlice) changed = true;
    }
    return changed ? next : state;
  };
}`,
      why: "The combiner is a reducer built from reducers, so it can nest. Returning the old object when nothing changed is what lets <code>createStore</code>'s <code>!==</code> check, and every memoised selector downstream, do their jobs."
    },
    {
      id: 'sel-review',
      type: 'review',
      title: 'AI review: the memo that never hits',
      xp: 50,
      context: "<p>You asked for a memoised selector helper. The assistant's version caches on the state object.</p>",
      prompt: "<p><b>The spec:</b> <code>createSelector(...inputSelectors, resultFn)</code> returns a selector. Every input selector is called with all of the selector's arguments; <code>resultFn</code> receives their results and only runs again when one of those results changes (<code>Object.is</code>). Otherwise the previous result is returned, same reference.</p>",
      code: `function createSelector(...fns) {
  const resultFn = fns.pop();
  let lastState, lastResult;
  return state => {
    if (state === lastState) return lastResult;
    lastState = state;
    lastResult = resultFn(...fns.map(fn => fn(state)));
    return lastResult;
  };
}`,
      question: 'What is wrong with this design?',
      options: [
        'fns.pop() mutates the array of input selectors, which breaks the next call',
        'It memoises on the whole state, so any unrelated change recomputes, and it drops every argument after state',
        'lastResult should be compared with Object.is instead of ===',
        'It should cache every state it has seen, not only the last one'
      ],
      answer: 1,
      diagnosis: "Immutable state means <b>any</b> update produces a new root object, so hovering a card or changing the route recomputes and returns a new array. And <code>state =&gt;</code> throws away extra arguments: <code>selectCard(state, 2)</code> after <code>selectCard(state, 1)</code> returns card 1 from the cache. The memo must compare the <b>input selectors' results</b>. (<code>pop</code> runs once at creation, which is fine.)",
      hints: [
        'Accept <code>(...args)</code>, compute <code>values = inputs.map(fn =&gt; fn(...args))</code>, and compare those with the previous values.'
      ],
      tests: `
const state = { cards: [{ id: 1, p: 'high' }, { id: 2, p: 'low' }], ui: { hover: null } };
test('computes the result', () => eq(createSelector(s => s.cards, cards => cards.length)(state), 2));
test('extra arguments are respected', () => { const byId = createSelector((s, id) => s.cards, (s, id) => id, (cards, id) => cards.find(c => c.id === id)); eq(byId(state, 1).id, 1); eq(byId(state, 2).id, 2); });
test('unrelated state changes still hit the cache', () => {
  let runs = 0;
  const sel = createSelector(s => s.cards, cards => { runs++; return cards.filter(c => c.p === 'high'); });
  const a = sel(state); const b = sel({ ...state, ui: { hover: 2 } });
  assert(a === b, 'the cards did not change, so the previous result should be reused'); eq(runs, 1);
});
test('recomputes when an input changes', () => { let runs = 0; const sel = createSelector(s => s.cards, cards => { runs++; return cards.length; }); sel(state); eq(sel({ ...state, cards: [] }), 0); eq(runs, 2); });`,
      solution: `function createSelector(...fns) {
  const resultFn = fns.pop();
  let lastInputs = null;
  let lastResult;
  return (...args) => {
    const inputs = fns.map(fn => fn(...args));
    if (lastInputs && inputs.every((v, i) => Object.is(v, lastInputs[i]))) return lastResult;
    lastResult = resultFn(...inputs);
    lastInputs = inputs;
    return lastResult;
  };
}`,
      why: 'Memoise on the narrowest thing the result depends on. The input selectors are cheap lookups that turn "the whole state" into "the two values I actually use", and identity comparison on those is both correct and nearly free.'
    },
    {
      id: 'sel-create',
      type: 'code',
      title: 'Board piece: createSelector',
      xp: 60,
      capstone: true,
      prompt: `<p>Now the full version. Write <code>createSelector(...inputSelectors, resultFn)</code>:</p>
<ul>
<li>Input selectors may also be passed as one array: <code>createSelector([a, b], fn)</code>.</li>
<li>Every call runs every input selector with all of the selector's arguments.</li>
<li>If every input result is <code>Object.is</code>-equal to the previous call's, return the cached result without running <code>resultFn</code>. The first call always computes.</li>
<li>The selector has <code>recomputations()</code> (how many times <code>resultFn</code> ran) and <code>resetRecomputations()</code>.</li>
<li>If <code>resultFn</code> throws, the next call must try again, not return a stale result.</li>
</ul>
<p class="muted">Your Board will show its selectors' recomputation counts live.</p>`,
      starter: `function createSelector(...fns) {
  // your code here
}`,
      hints: [
        '<code>const resultFn = fns.pop();</code> then <code>const inputs = Array.isArray(fns[0]) ? fns[0] : fns;</code>',
        'Functions are objects: you can attach <code>selector.recomputations = () =&gt; count</code> before returning it.',
        'Only store the new inputs after <code>resultFn</code> has returned successfully.'
      ],
      tests: `
const state = { cards: [{ id: 1, p: 'high' }, { id: 2, p: 'low' }], filter: 'high' };
test('computes from the inputs', () => { const sel = createSelector(s => s.cards, s => s.filter, (cards, f) => cards.filter(c => c.p === f)); eq(sel(state), [{ id: 1, p: 'high' }]); });
test('caches while inputs are identical', () => { const sel = createSelector(s => s.cards, cards => cards.map(c => c.id)); const a = sel(state); const b = sel({ ...state, filter: 'low' }); assert(a === b, 'same cards array should hit the cache'); eq(sel.recomputations(), 1); });
test('recomputes when an input changes', () => { const sel = createSelector(s => s.filter, f => f.toUpperCase()); eq(sel(state), 'HIGH'); eq(sel({ ...state, filter: 'low' }), 'LOW'); eq(sel.recomputations(), 2); });
test('input selectors run every time', () => { let n = 0; const sel = createSelector(s => { n++; return s.cards; }, c => c.length); sel(state); sel(state); eq(n, 2); });
test('extra arguments reach the input selectors', () => { const sel = createSelector((s, id) => s.cards, (s, id) => id, (cards, id) => cards.find(c => c.id === id)); eq(sel(state, 2), { id: 2, p: 'low' }); assert(sel(state, 2) === sel(state, 2), 'should be cached'); eq(sel.recomputations(), 1); });
test('accepts an array of input selectors', () => eq(createSelector([s => s.cards, s => s.filter], (cards, f) => cards.length + f)(state), '2high'));
test('NaN inputs still hit the cache', () => { const sel = createSelector(s => s.v, v => [v]); const a = sel({ v: NaN }); assert(sel({ v: NaN }) === a, 'Object.is(NaN, NaN) is true'); });
test('the first call always computes', () => { const sel = createSelector(s => s.missing, x => 'computed:' + x); eq(sel({}), 'computed:undefined'); eq(sel.recomputations(), 1); });
test('resetRecomputations', () => { const sel = createSelector(s => s.filter, f => f); sel(state); sel({ filter: 'x' }); sel.resetRecomputations(); eq(sel.recomputations(), 0); sel({ filter: 'y' }); eq(sel.recomputations(), 1); });
test('a throwing resultFn is retried', () => { let fail = true; const sel = createSelector(s => s.v, v => { if (fail) throw new Error('nope'); return v * 2; }); throws(() => sel({ v: 1 })); fail = false; eq(sel({ v: 1 }), 2); });
test('selectors keep separate caches', () => { const a = createSelector(s => s.v, v => v + 1); const b = createSelector(s => s.v, v => v + 2); eq([a({ v: 1 }), b({ v: 1 }), a({ v: 1 })], [2, 3, 2]); eq([a.recomputations(), b.recomputations()], [1, 1]); });`,
      solution: `function createSelector(...fns) {
  const resultFn = fns.pop();
  const inputs = Array.isArray(fns[0]) ? fns[0] : fns;
  let lastValues = null;
  let lastResult;
  let count = 0;

  function selector(...args) {
    const values = inputs.map(fn => fn(...args));
    if (lastValues && values.every((v, i) => Object.is(v, lastValues[i]))) return lastResult;
    count++;
    const result = resultFn(...values);   // if this throws, nothing is cached
    lastValues = values;
    lastResult = result;
    return result;
  }

  selector.recomputations = () => count;
  selector.resetRecomputations = () => { count = 0; };
  return selector;
}`,
      why: 'The cache is two closure variables, and the order of the assignments is the whole error-handling story: commit the new inputs only once there is a result to go with them. Exposing a recomputation counter turns "is my memo working?" from a guess into a number.'
    }
  ]
};
