// Tier 2, lesson 15: The Render Loop
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'render',
  tier: 2,
  n: 15,
  title: 'The Render Loop',
  blurb: 'Keys, reconciliation, the fewest DOM moves',
  note: `
<p>A UI is a function of state: <code>view = render(state)</code>. The simplest render loop throws away the old DOM and builds a new one on every change. It is correct, and it is also why typed text vanishes, focus jumps, scroll resets and transitions never play. The fix is to <b>reconcile</b>: compare the old list of things on screen with the new list and touch only what changed.</p>
<h4>Keys</h4>
<p>To know that the third card now is the same card that was first a moment ago, every item needs a <b>stable, unique key</b>, such as its id. With index keys, inserting at the top shifts every key by one: the renderer reuses the wrong nodes, and per-node state (an input's text, focus, an animation) sticks to the wrong item.</p>
<h4>Reconciling a keyed list</h4>
<ol>
<li>Keys only in the old list: <b>remove</b> their nodes.</li>
<li>Keys only in the new list: <b>insert</b> new nodes.</li>
<li>Keys in both: the node is reused. Some of them have to <b>move</b>.</li>
</ol>
<p>Which ones? Take the kept keys in their new order and write down each one's old index. Any <b>increasing</b> run in that sequence is already in the right relative order and can stay put; everything else moves. To move as few nodes as possible, keep the <b>longest increasing subsequence</b>. That is exactly what Vue and Inferno do.</p>
~~~
prev:  a b c d e        kept keys in new order: e a b c d
next:  e a b c d        their old indexes:      4 0 1 2 3
                        LIS = 0 1 2 3  ->  only e moves
~~~
<h4>Applying the plan</h4>
<p>Walk the new order from the end, keeping an <code>anchor</code> (the node that must follow). Inserted or moved nodes go <code>insertBefore(node, anchor)</code>; nodes that stay are left alone. Every node then becomes the anchor for the one before it.</p>
~~~
let anchor = null;
for (let i = next.length - 1; i >= 0; i--) {
  const key = next[i];
  const node = nodes.get(key) ?? createNode(key);
  if (!stays.has(key)) list.insertBefore(node, anchor);  // null anchor = append
  anchor = node;
}
~~~
<h4>When to render</h4>
<p>Render after the store says state changed (its <code>!==</code> check), render only the parts whose inputs changed (memoised selectors), and batch several changes into one frame with <code>requestAnimationFrame</code>. Tier 3 covers the timing; this lesson covers the diff.</p>
<h4>LIS in O(n log n)</h4>
<p>Patience sorting: keep <code>tails[k]</code>, the index of the smallest value that ends an increasing run of length <code>k + 1</code>. Each new value binary-searches the first tail that is not smaller, replaces it, and remembers the previous tail as its predecessor. Following predecessors back from the last tail rebuilds one longest subsequence.</p>`,
  eye: "Generated list rendering often keys by array index, or rebuilds a whole list with <code>innerHTML</code> on every change. Both lose input state and focus. Also look for event handlers that capture an item's <b>index</b> or column at render time: once nodes are reused, that captured position is stale.",
  challenges: [
    {
      id: 'render-keys',
      type: 'mcq',
      title: 'Index as key',
      xp: 15,
      prompt: '<p>A tiny keyed renderer reuses the node whose key matches. Which row ends up holding the text the user typed?</p>',
      code: `function render(nodes, items, keyOf) {
  const next = new Map();
  items.forEach((item, i) => {
    const key = keyOf(item, i);
    const node = nodes.get(key) || { input: '' };   // reuse or create
    node.label = item;
    next.set(key, node);
  });
  return next;
}

let nodes = render(new Map(), ['Ada', 'Grace'], (_, i) => i);
nodes.get(1).input = 'notes';                      // typed into Grace's row

nodes = render(nodes, ['Linus', 'Ada', 'Grace'], (_, i) => i);
const row = [...nodes.values()].find(n => n.input === 'notes');
console.log(row.label);`,
      options: ['Grace', 'Ada', 'Linus', 'undefined'],
      answer: 1,
      explain: "With index keys, prepending <code>'Linus'</code> shifts every key. The node that had key 1 (Grace's, holding the typed text) is reused for whatever is now at index 1: Ada. Keyed by name or id, the text would have stayed with Grace."
    },
    {
      id: 'render-lis',
      type: 'code',
      title: 'Longest increasing subsequence',
      xp: 60,
      prompt: `<p>Write <code>lis(nums)</code>. It returns the <b>indexes</b> (in ascending order) of one longest strictly increasing subsequence of <code>nums</code>. Any longest one is accepted.</p>
~~~
lis([10, 9, 2, 5, 3, 7, 101, 18]);   // e.g. [2, 3, 5, 6]: values 2, 5, 7, 101
lis([7, 8, 1]);                      // [0, 1]
~~~
<p>It must handle 100,000 numbers in well under a second, so the O(n&sup2;) dynamic programme will not do. Your <code>reconcile</code> boss uses this.</p>`,
      starter: `function lis(nums) {
  // your code here
}`,
      hints: [
        'Keep <code>tails</code>: <code>tails[k]</code> is the index of the smallest value that ends an increasing run of length <code>k + 1</code>. It stays sorted by value.',
        'For each <code>i</code>, binary-search the first position whose value is <code>&gt;= nums[i]</code>, put <code>i</code> there, and record <code>prev[i]</code> as the tail just before that position (or -1).',
        'At the end, start from the last entry of <code>tails</code> and follow <code>prev</code> back, then reverse.'
      ],
      tests: `
function check(nums, expectedLen) {
  const idx = lis(nums);
  assert(Array.isArray(idx), 'return an array of indexes');
  eq(idx.length, expectedLen, 'length of the subsequence');
  for (let i = 1; i < idx.length; i++) {
    assert(idx[i] > idx[i - 1], 'indexes must increase');
    assert(nums[idx[i]] > nums[idx[i - 1]], 'values must strictly increase');
  }
}
function refLen(a) { const t = []; for (const x of a) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } t[lo] = x; } return t.length; }
test('classic example', () => check([10, 9, 2, 5, 3, 7, 101, 18], 4));
test('empty and single', () => { eq(lis([]), []); eq(lis([5]), [0]); });
test('already sorted', () => check([1, 2, 3, 4, 5], 5));
test('reversed', () => check([5, 4, 3, 2, 1], 1));
test('duplicates do not count twice', () => check([2, 2, 2, 3, 3], 2));
test('negative numbers', () => check([-3, -1, -2, 0, -5, 4], 4));
test('returns indexes, not values', () => eq(lis([7, 8, 1]), [0, 1]));
test('100,000 items quickly', () => {
  const n = 100000; const nums = Array.from({ length: n }, (_, i) => (i * 7919) % 100003);
  const t = Date.now(); check(nums, refLen(nums));
  assert(Date.now() - t < 700, 'too slow: aim for O(n log n)');
});`,
      solution: `function lis(nums) {
  const tails = [];                       // indexes; nums[tails[k]] is increasing
  const prev = new Array(nums.length);
  for (let i = 0; i < nums.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {                     // first tail whose value is >= nums[i]
      const mid = (lo + hi) >> 1;
      if (nums[tails[mid]] < nums[i]) lo = mid + 1;
      else hi = mid;
    }
    prev[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const out = [];
  for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = prev[i]) out.push(i);
  return out.reverse();
}`,
      why: '<code>tails</code> is always sorted, so each element costs one binary search: O(n log n) overall. Storing indexes instead of values is what makes the predecessor chain, and therefore the actual subsequence, recoverable.'
    },
    {
      id: 'render-reconcile',
      type: 'code',
      title: 'Boss: reconcile',
      xp: 120,
      boss: true,
      capstone: true,
      prompt: `<p>Write <code>reconcile(prevKeys, nextKeys)</code>. Both are arrays of unique keys (strings or numbers; <code>1</code> and <code>'1'</code> are different keys). Return <code>{ remove, insert, move }</code>:</p>
<ul>
<li><code>remove</code>: keys in <code>prevKeys</code> but not <code>nextKeys</code>, in <code>prevKeys</code> order.</li>
<li><code>insert</code>: keys in <code>nextKeys</code> but not <code>prevKeys</code>, in <code>nextKeys</code> order.</li>
<li><code>move</code>: keys in both lists whose nodes must move, <b>as few as possible</b>, in <code>nextKeys</code> order. Every kept key not in <code>move</code> must keep its old relative order.</li>
</ul>
<p>The tests also apply your plan to a simulated list and check that it produces <code>nextKeys</code>. It must handle 50,000 keys in well under a second. Paste in your <code>lis</code>.</p>
<p class="muted">Your Board part 2 renders every column through this function, and shows how many DOM moves each update cost.</p>`,
      starter: `function reconcile(prevKeys, nextKeys) {
  // your code here
}`,
      hints: [
        'Build a <code>Map</code> from key to old index and a <code>Set</code> of new keys. <code>remove</code> and <code>insert</code> are then one <code>filter</code> each.',
        'Take the kept keys in new order and map each to its old index. The keys at the positions of an LIS of that array can stay.',
        'Everything kept that is not in the LIS goes into <code>move</code>, in new order.'
      ],
      tests: `
function lisLen(a) { const t = []; for (const x of a) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } t[lo] = x; } return t.length; }
function verify(prev, next) {
  const r = reconcile(prev, next);
  const nextSet = new Set(next), prevSet = new Set(prev);
  eq(r.remove, prev.filter(k => !nextSet.has(k)), 'remove');
  eq(r.insert, next.filter(k => !prevSet.has(k)), 'insert');
  const kept = next.filter(k => prevSet.has(k));
  const pos = new Map(prev.map((k, i) => [k, i]));
  eq(r.move.length, kept.length - lisLen(kept.map(k => pos.get(k))), 'number of moves (fewest possible)');
  const moveSet = new Set(r.move);
  eq(r.move, kept.filter(k => moveSet.has(k)), 'move must hold kept keys, in next order');
  const stay = kept.filter(k => !moveSet.has(k)).map(k => pos.get(k));
  for (let i = 1; i < stay.length; i++) assert(stay[i] > stay[i - 1], 'keys that stay must keep their old relative order');
  const dom = prev.filter(k => nextSet.has(k));
  let anchor = null;
  for (let i = next.length - 1; i >= 0; i--) {
    const k = next[i];
    if (!prevSet.has(k) || moveSet.has(k)) {
      const at = dom.indexOf(k); if (at !== -1) dom.splice(at, 1);
      dom.splice(anchor === null ? dom.length : dom.indexOf(anchor), 0, k);
    }
    anchor = k;
  }
  eq(dom, next, 'applying the plan should produce next');
  return r;
}
test('no change', () => eq(verify(['a', 'b', 'c'], ['a', 'b', 'c']), { remove: [], insert: [], move: [] }));
test('append and remove', () => verify(['a', 'b', 'c'], ['a', 'c', 'd']));
test('swap two', () => eq(verify(['a', 'b', 'c', 'd'], ['a', 'c', 'b', 'd']).move.length, 1));
test('move the last item to the front', () => eq(verify(['a', 'b', 'c', 'd', 'e'], ['e', 'a', 'b', 'c', 'd']).move, ['e']));
test('reverse', () => verify([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]));
test('everything new', () => verify(['a', 'b'], ['x', 'y']));
test('empty lists', () => { verify([], ['a']); verify(['a'], []); verify([], []); });
test('mixed shuffle', () => verify(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], ['h', 'c', 'x', 'a', 'd', 'g', 'b', 'y', 'f']));
test('1 and "1" are different keys', () => verify([1, '1', 2], ['1', 2, 1]));
test('50,000 keys quickly', () => {
  const n = 50000; const prev = Array.from({ length: n }, (_, i) => 'k' + i);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const next = prev.filter(() => rand() > 0.1);
  for (let i = next.length - 1; i > 0; i--) { if (rand() < 0.3) { const j = Math.floor(rand() * (i + 1)); const t = next[i]; next[i] = next[j]; next[j] = t; } }
  for (let i = 0; i < 2000; i++) next.splice(Math.floor(rand() * next.length), 0, 'new' + i);
  const t = Date.now(); const r = reconcile(prev, next); const ms = Date.now() - t;
  const prevSet = new Set(prev); const pos = new Map(prev.map((k, i) => [k, i]));
  const kept = next.filter(k => prevSet.has(k));
  eq(r.insert.length, 2000); eq(r.move.length, kept.length - lisLen(kept.map(k => pos.get(k))));
  assert(ms < 700, 'too slow (' + ms + 'ms): aim for O(n log n)');
});`,
      solution: `function reconcile(prevKeys, nextKeys) {
  const oldIndex = new Map(prevKeys.map((k, i) => [k, i]));
  const nextSet = new Set(nextKeys);

  const remove = prevKeys.filter(k => !nextSet.has(k));
  const insert = nextKeys.filter(k => !oldIndex.has(k));
  const kept = nextKeys.filter(k => oldIndex.has(k));

  // kept keys whose old indexes form a longest increasing run can stay put
  const stays = new Set(lis(kept.map(k => oldIndex.get(k))).map(i => kept[i]));
  const move = kept.filter(k => !stays.has(k));

  return { remove, insert, move };
}

function lis(nums) {
  const tails = [];
  const prev = new Array(nums.length);
  for (let i = 0; i < nums.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nums[tails[mid]] < nums[i]) lo = mid + 1;
      else hi = mid;
    }
    prev[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const out = [];
  for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = prev[i]) out.push(i);
  return out.reverse();
}`,
      why: `Minimising moves is minimising "kept keys that are not in an increasing run", which is exactly maximising the run: the LIS. A <code>Map</code> keyed by the raw key keeps <code>1</code> and <code>'1'</code> apart, which a plain-object lookup would not.`
    }
  ]
};
