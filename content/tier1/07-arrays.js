// Tier 1, lesson 7: Arrays & Higher-Order Functions
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'arrays',
  tier: 1,
  n: 7,
  title: 'Arrays & Higher-Order Functions',
  blurb: 'map, reduce, sort traps, pipe, recursion',
  note: `
<p>A higher-order function takes or returns functions. Array methods are where most JavaScript logic lives, so fluency here pays off everywhere.</p>
<h4>The core set</h4>
<ul>
<li><code>map</code>: transform every item. <code>filter</code>: keep some. <code>reduce</code>: fold everything into one value.</li>
<li><code>find</code> / <code>findIndex</code>, <code>some</code> / <code>every</code>, <code>includes</code>, <code>flatMap</code>.</li>
<li>Callbacks receive <code>(item, index, array)</code>. That is why <code>['1','2','3'].map(parseInt)</code> gives <code>[1, NaN, NaN]</code>.</li>
</ul>
<h4>Traps</h4>
<ul>
<li><code>sort()</code> without a comparator sorts <b>as strings</b>: <code>[10, 9, 1].sort()</code> is <code>[1, 10, 9]</code>. Use <code>(a, b) =&gt; a - b</code>.</li>
<li><code>sort</code>, <code>reverse</code>, <code>splice</code>, <code>push</code> and <code>pop</code> <b>mutate</b>. <code>map</code>, <code>filter</code>, <code>slice</code>, <code>concat</code>, and the newer <code>toSorted</code> / <code>toSpliced</code> do not.</li>
<li><code>reduce</code> without an initial value throws on an empty array.</li>
</ul>
~~~
const totals = orders.reduce((acc, o) => {
  acc[o.user] = (acc[o.user] ?? 0) + o.amount;
  return acc;
}, {});
~~~
<h4>Composition</h4>
<p>Small functions combined are easier to test than one big loop. <code>pipe(f, g, h)(x)</code> means <code>h(g(f(x)))</code>.</p>`,
  eye: 'Look for <code>.sort()</code> with no comparator on numbers, <code>reduce</code> with no initial value, and <code>arr.sort()</code> applied directly to state that should not change.',
  challenges: [
    {
      id: 'arr-sort',
      type: 'mcq',
      title: 'Default sort',
      xp: 15,
      prompt: '<p>What is the value of <code>result</code>?</p>',
      code: 'const result = [10, 9, 1, 2].sort();',
      probe: 'console.log(JSON.stringify(result).replace(/,/g, ", "));',
      options: ['[1, 2, 9, 10]', '[1, 10, 2, 9]', '[10, 9, 2, 1]', '[10, 9, 1, 2]'],
      answer: 1,
      explain: "Without a comparator, <code>sort</code> converts items to strings and compares them by UTF-16 code units, so <code>'10'</code> sorts before <code>'2'</code>. Use <code>sort((a, b) =&gt; a - b)</code> for numbers."
    },
    {
      id: 'arr-groupby',
      type: 'code',
      title: 'groupBy',
      xp: 45,
      capstone: true,
      prompt: `<p>Write <code>groupBy(items, keyFn)</code>. It returns a plain object whose keys are the results of <code>keyFn(item, index)</code> and whose values are arrays of the matching items, in their original order. Do not mutate the input. An empty array gives <code>{}</code>.</p>
~~~
groupBy([1, 2, 3, 4, 5], n => (n % 2 ? 'odd' : 'even'));
// { odd: [1, 3, 5], even: [2, 4] }
~~~
<p class="muted">This helper will power the "cards by priority" count on your Board.</p>`,
      starter: `function groupBy(items, keyFn) {
  // your code here
}`,
      hints: [
        '<code>reduce</code> with <code>{}</code> as the initial value is a natural fit.',
        "For each item compute the key, create the array if it doesn't exist yet (<code>??=</code> helps), then push."
      ],
      tests: `
test('odd and even', () => eq(groupBy([1, 2, 3, 4, 5], n => (n % 2 ? 'odd' : 'even')), { odd: [1, 3, 5], even: [2, 4] }));
test('objects by property', () => {
  const cards = [{ id: 1, p: 'high' }, { id: 2, p: 'low' }, { id: 3, p: 'high' }];
  eq(groupBy(cards, c => c.p), { high: [cards[0], cards[2]], low: [cards[1]] });
});
test('passes the index', () => eq(groupBy(['a', 'b', 'c'], (_, i) => i % 2), { 0: ['a', 'c'], 1: ['b'] }));
test('empty input', () => eq(groupBy([], x => x), {}));
test('does not mutate the input', () => { const src = [3, 1, 2]; groupBy(src, x => x); eq(src, [3, 1, 2]); });
test('keeps original order inside groups', () => eq(groupBy([5, 3, 9, 1], () => 'all'), { all: [5, 3, 9, 1] }));`,
      solution: `function groupBy(items, keyFn) {
  return items.reduce((groups, item, i) => {
    const key = keyFn(item, i);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});
}`,
      why: '<code>reduce</code> threads one accumulator through the array. <code>??=</code> creates the group the first time a key appears. (<code>Object.groupBy</code> exists in modern engines; knowing how it works is the point.)'
    },
    {
      id: 'arr-pipe',
      type: 'code',
      title: 'pipe()',
      xp: 45,
      prompt: '<p>Write <code>pipe(...fns)</code>. It returns a function that passes its input through each function from left to right. The first function may receive all the arguments; each later function receives the previous result. <code>pipe()</code> with no functions returns its first argument unchanged.</p>',
      starter: `function pipe(...fns) {
  // your code here
}`,
      hints: [
        'Return a function with its own rest parameter for the arguments.',
        'Call the first function with all arguments, then <code>reduce</code> over the rest.',
        'Empty <code>fns</code> is a special case: there is no "first function" to call.'
      ],
      tests: `
test('left to right', () => eq(pipe(x => x + 1, x => x * 2)(3), 8));
test('order matters', () => eq(pipe(x => x * 2, x => x + 1)(3), 7));
test('first function can take several arguments', () => eq(pipe((a, b) => a + b, x => x * 10)(1, 2), 30));
test('no functions returns the input', () => { eq(pipe()(5), 5); const o = {}; eq(pipe()(o) === o, true); });
test('single function', () => eq(pipe(s => s.toUpperCase())('hi'), 'HI'));
test('works with strings', () => eq(pipe(s => s.trim(), s => s.split(' '), a => a.length)('  a b c  '), 3));`,
      solution: `function pipe(...fns) {
  return (...args) => {
    if (fns.length === 0) return args[0];
    const [first, ...rest] = fns;
    return rest.reduce((acc, fn) => fn(acc), first(...args));
  };
}`,
      why: '<code>reduce</code> is the engine of composition: the accumulator is the value flowing through the pipeline.'
    },
    {
      id: 'arr-flatten',
      type: 'code',
      title: 'flatten',
      xp: 45,
      prompt: `<p>Write <code>flatten(arr, depth = Infinity)</code> that flattens nested arrays up to <code>depth</code> levels. Do not use <code>Array.prototype.flat</code>. Return a new array and leave the input untouched.</p>
~~~
flatten([1, [2, [3, [4]]]]);     // [1, 2, 3, 4]
flatten([1, [2, [3, [4]]]], 1);  // [1, 2, [3, [4]]]
~~~`,
      starter: `function flatten(arr, depth = Infinity) {
  // your code here
}`,
      hints: [
        'This is a natural recursion: an item that is an array gets flattened one level less deeply.',
        'Stop recursing when <code>depth</code> reaches 0 and push the item as it is.'
      ],
      tests: `
test('does not use .flat(', () => assert(!/\\.\\s*flat\\s*\\(/.test(String(flatten)), 'Write the logic yourself'));
test('deep by default', () => eq(flatten([1, [2, [3, [4]]]]), [1, 2, 3, 4]));
test('depth 1', () => eq(flatten([1, [2, [3, [4]]]], 1), [1, 2, [3, [4]]]));
test('depth 0 copies', () => { const src = [1, [2]]; const out = flatten(src, 0); eq(out, [1, [2]]); eq(out !== src, true); });
test('empty arrays vanish', () => eq(flatten([[], [1, []], []]), [1]));
test('keeps non-array values', () => eq(flatten([null, ['a', { x: 1 }], undefined]), [null, 'a', { x: 1 }, undefined]));
test('does not mutate the input', () => { const src = [1, [2, [3]]]; flatten(src); eq(src, [1, [2, [3]]]); });`,
      solution: `function flatten(arr, depth = Infinity) {
  const out = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) out.push(...flatten(item, depth - 1));
    else out.push(item);
  }
  return out;
}`,
      why: 'The recursion mirrors the shape of the data. Each level of nesting is one call on the stack, which is also why extremely deep arrays can overflow it.'
    },
    {
      id: 'arr-review',
      type: 'review',
      title: 'AI review: sortCards',
      xp: 45,
      context: '<p>You asked for a helper that orders cards for display. The assistant wrote a one-liner that looked right on its sample data.</p>',
      prompt: '<p><b>The spec:</b> <code>sortCards(cards)</code> returns a <b>new</b> array: high-priority cards first, then by title A to Z (use <code>localeCompare</code>). The input is never modified. Cards that tie keep their original order.</p>',
      code: `function sortCards(cards) {
  return cards.sort((a, b) =>
    (a.priority === 'high' && b.priority !== 'high') || a.title > b.title
  );
}`,
      question: 'What is wrong with this code?',
      options: [
        'Array.prototype.sort is not stable, so tied cards get shuffled',
        "It sorts the caller's array in place, and the comparator returns true/false instead of a negative, zero or positive number",
        'localeCompare is required for sort to work on strings at all',
        'Arrow functions cannot be used as sort comparators'
      ],
      answer: 1,
      diagnosis: `<code>sort</code> mutates and returns the <b>same</b> array, so the caller's data (maybe your store's state) is reordered. The comparator returns booleans, which become 1 or 0 and never negative, so "a comes first" can never be expressed and the order depends on the engine's algorithm. Sort has been stable since ES2019.`,
      hints: [
        'Copy before sorting: <code>[...cards]</code> or <code>cards.toSorted(...)</code>.',
        'Return a number: compare a priority rank first, and only if that is 0, fall back to <code>a.title.localeCompare(b.title)</code>. <code>||</code> on numbers does exactly that.'
      ],
      tests: `
const cards = () => Object.freeze([
  Object.freeze({ id: 1, title: 'Write docs', priority: 'low' }),
  Object.freeze({ id: 2, title: 'Fix login', priority: 'high' }),
  Object.freeze({ id: 3, title: 'Add tests', priority: 'low' }),
  Object.freeze({ id: 4, title: 'Audit deps', priority: 'high' }),
  Object.freeze({ id: 5, title: 'Add tests', priority: 'low' }),
]);
test('does not touch the input', () => { const src = cards(); const out = sortCards(src); assert(out !== src, 'return a new array'); eq(src.map(c => c.id), [1, 2, 3, 4, 5]); });
test('high priority first, then by title', () => eq(sortCards(cards()).map(c => c.id), [4, 2, 3, 5, 1]));
test('ties keep their order', () => { const src = cards(); eq(sortCards([src[4], src[2]]).map(c => c.id), [5, 3]); });
test('empty input', () => eq(sortCards([]), []));`,
      solution: `function sortCards(cards) {
  const rank = c => (c.priority === 'high' ? 0 : 1);
  return [...cards].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}`,
      why: 'A comparator answers "how do a and b compare", which needs three outcomes. Chaining comparisons with <code>||</code> works because 0 (a tie) is falsy and moves on to the next criterion.'
    }
  ]
};
