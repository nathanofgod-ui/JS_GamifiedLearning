// Tier 1, lesson 5: Functions & Closures
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'closures',
  tier: 1,
  n: 5,
  title: 'Functions & Closures',
  blurb: 'Private state, factories, once and memoize',
  note: `
<p>Functions are values: you can store them, pass them in and return them. A <b>closure</b> is a function together with the variables from the place it was created. Those variables stay alive as long as the function does.</p>
~~~
function makeAdder(n) {
  return x => x + n;   // n lives on inside the returned function
}
const add5 = makeAdder(5);
add5(10);              // 15
~~~
<h4>Private state</h4>
<p>JavaScript has no access modifiers for plain functions, and doesn't need them. Variables in an outer function are unreachable from outside except through the functions you hand out.</p>
<h4>Patterns you will meet constantly</h4>
<ul>
<li><b>Factory</b>: a function that returns a configured object or function.</li>
<li><b>Wrapper / decorator</b>: takes a function, returns a function that adds behaviour (logging, caching, retrying, debouncing).</li>
<li><b>Callback with captured context</b>: event handlers and timers that remember local variables.</li>
</ul>
<h4>Useful details</h4>
<ul>
<li>Use rest parameters (<code>...args</code>) instead of <code>arguments</code>; arrow functions don't have <code>arguments</code> at all.</li>
<li>Keep wrappers transparent: forward <code>this</code> and every argument, and return the result.</li>
<li>Closures can leak memory by keeping large objects alive. Release references you no longer need.</li>
</ul>`,
  eye: 'For any returned function, ask: which variables does it close over, who else can reach them, and is that state per-call or shared by every caller?',
  challenges: [
    {
      id: 'closure-counter',
      type: 'code',
      title: 'Counter factory',
      xp: 40,
      prompt: `<p>Write <code>makeCounter(start = 0, step = 1)</code>. It returns an object with four methods and <b>no other properties</b>:</p>
<ul><li><code>inc()</code> adds <code>step</code> and returns the new value</li><li><code>dec()</code> subtracts <code>step</code> and returns the new value</li><li><code>reset()</code> goes back to <code>start</code> and returns it</li><li><code>value()</code> returns the current value</li></ul>
<p>The count must be truly private: no property on the returned object may expose or let you change it. Two counters must not affect each other.</p>`,
      starter: `function makeCounter(start = 0, step = 1) {
  // your code here
}`,
      hints: [
        'Declare a <code>let</code> variable inside <code>makeCounter</code>. The returned methods will close over it.',
        "Return an object literal with the four methods. Don't store the count on the object."
      ],
      tests: `
test('defaults', () => { const c = makeCounter(); eq(c.value(), 0); eq(c.inc(), 1); eq(c.inc(), 2); eq(c.dec(), 1); });
test('custom start and step', () => { const c = makeCounter(10, 5); eq(c.inc(), 15); eq(c.dec(), 10); eq(c.dec(), 5); });
test('reset', () => { const c = makeCounter(7); c.inc(); c.inc(); eq(c.reset(), 7); eq(c.value(), 7); });
test('counters are independent', () => { const a = makeCounter(); const b = makeCounter(); a.inc(); a.inc(); eq(b.value(), 0); eq(a.value(), 2); });
test('only the four methods exist', () => eq(Object.keys(makeCounter()).sort(), ['dec', 'inc', 'reset', 'value']));
test('count is private', () => { const c = makeCounter(3); for (const k of Object.keys(c)) assert(typeof c[k] === 'function', k + ' should be a function'); eq(c.value(), 3); });`,
      solution: `function makeCounter(start = 0, step = 1) {
  let count = start;
  return {
    inc() { count += step; return count; },
    dec() { count -= step; return count; },
    reset() { count = start; return count; },
    value() { return count; },
  };
}`,
      why: 'Each call creates a fresh <code>count</code>. The methods are the only code that can touch it, which is the closure version of a private field.'
    },
    {
      id: 'closure-once',
      type: 'code',
      title: 'once()',
      xp: 40,
      prompt: '<p>Write <code>once(fn)</code>. It returns a function that calls <code>fn</code> the first time it is called, passing along the arguments and <code>this</code>, and remembers the result. Every later call returns that first result without calling <code>fn</code> again.</p>',
      starter: `function once(fn) {
  // your code here
}`,
      hints: [
        'You need two private variables: a flag for "already called" and a place to keep the result.',
        'Return a regular <code>function</code>, not an arrow, so it can receive its own <code>this</code>. Forward it with <code>fn.apply(this, args)</code>.'
      ],
      tests: `
test('calls fn only once', () => { let n = 0; const f = once(() => ++n); f(); f(); f(); eq(n, 1); });
test('returns the first result every time', () => { let n = 0; const f = once(() => ++n * 10); eq(f(), 10); eq(f(), 10); });
test('passes arguments on the first call', () => { const f = once((a, b) => a + b); eq(f(2, 3), 5); eq(f(100, 100), 5); });
test('a first result of undefined is still remembered', () => { let n = 0; const f = once(() => { n++; }); f(); f(); eq(n, 1); });
test('keeps this', () => { const o = { x: 7, get: once(function () { return this.x; }) }; eq(o.get(), 7); });
test('separate wrappers are independent', () => { let n = 0; const a = once(() => ++n); const b = once(() => ++n); a(); b(); eq(n, 2); });`,
      solution: `function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}`,
      why: 'A boolean flag (rather than checking <code>result === undefined</code>) is what keeps functions that return nothing from being called twice.'
    },
    {
      id: 'closure-memo',
      type: 'code',
      title: 'memoize()',
      xp: 45,
      prompt: '<p>Write <code>memoize(fn)</code>. It returns a function that caches results by arguments. Calling it again with the same arguments returns the cached value without running <code>fn</code>. Different arguments (including different order) get separate cache entries, and a cached <code>undefined</code> still counts as a hit.</p>',
      starter: `function memoize(fn) {
  // your code here
}`,
      hints: [
        'A <code>Map</code> makes a good cache. For the key, turn the whole argument list into a string.',
        '<code>JSON.stringify(args)</code> gives you a key that distinguishes <code>(2, 3)</code> from <code>(3, 2)</code>.',
        'Check with <code>cache.has(key)</code>, not <code>cache.get(key) !== undefined</code>.'
      ],
      tests: `
test('caches by argument', () => { let calls = 0; const sq = memoize(x => { calls++; return x * x; }); eq(sq(4), 16); eq(sq(4), 16); eq(calls, 1); });
test('new arguments run again', () => { let calls = 0; const sq = memoize(x => { calls++; return x * x; }); sq(2); sq(3); sq(2); eq(calls, 2); });
test('multiple arguments', () => { let calls = 0; const sub = memoize((a, b) => { calls++; return a - b; }); eq(sub(5, 3), 2); eq(sub(3, 5), -2); eq(sub(5, 3), 2); eq(calls, 2); });
test('undefined results are cached', () => { let calls = 0; const f = memoize(() => { calls++; }); f(); f(); eq(calls, 1); });
test('each memoized function has its own cache', () => { let a = 0, b = 0; const fa = memoize(x => { a++; return x; }); const fb = memoize(x => { b++; return x; }); fa(1); fb(1); eq([a, b], [1, 1]); });`,
      solution: `function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}`,
      why: "The cache is a closure variable, so it lives exactly as long as the memoized function. Note the limits: <code>JSON.stringify</code> keys ignore functions and treat <code>1</code> and <code>'1'</code> differently only by quotes; real libraries are careful here."
    },
    {
      id: 'closure-review',
      type: 'review',
      title: 'AI review: memoize by key',
      xp: 55,
      context: '<p>You asked for a general-purpose <code>memoize</code> that works with any number of arguments. The assistant produced a compact version built on a string key.</p>',
      prompt: '<p><b>The spec:</b> <code>memoize(fn)</code> caches by the exact argument list. Two calls share an entry only if they have the same number of arguments and each argument is the same value as the <code>Map</code> would judge it (so objects match by identity). Falsy results such as <code>0</code> are cached too. <code>this</code> is passed through to <code>fn</code>.</p>',
      code: `function memoize(fn) {
  const cache = {};
  return function (...args) {
    const key = args.join(',');
    if (cache[key]) return cache[key];
    return (cache[key] = fn.apply(this, args));
  };
}`,
      question: 'What is wrong with this code?',
      options: [
        'Different calls produce the same key, like (1, 2) and ("1,2") or any two objects, and falsy results are never treated as cached',
        'The cache must be created inside the returned function to be private',
        'fn.apply(this, args) loses this because of the rest parameter',
        'An assignment expression evaluates to undefined, so the first call returns nothing'
      ],
      answer: 0,
      diagnosis: "<code>join</code> flattens very different argument lists into the same string: <code>(1, 2)</code>, <code>('1,2')</code> and <code>([1, 2])</code> all become <code>'1,2'</code>, and every object becomes <code>'[object Object]'</code>. The truthiness check means a cached <code>0</code> or <code>''</code> is recomputed every time. The assignment expression does return the assigned value, and <code>this</code> is passed correctly.",
      hints: [
        'Instead of one string key, walk a tree of <code>Map</code>s: one level per argument, so each argument is compared by the Map itself.',
        'Store the result at the final node under a key no caller can produce (a private <code>Symbol</code>), and check with <code>has</code>, not truthiness.'
      ],
      tests: `
test('caches repeat calls', () => { let n = 0; const f = memoize((a, b) => { n++; return a + b; }); eq(f(1, 2), 3); eq(f(1, 2), 3); eq(n, 1); });
test('different argument lists do not collide', () => { const f = memoize((...xs) => xs.length); eq(f(1, 2), 2); eq(f('1,2'), 1); eq(f([1, 2]), 1); });
test('objects are matched by identity', () => { const f = memoize(o => o.v); const a = { v: 'a' }, b = { v: 'b' }; eq(f(a), 'a'); eq(f(b), 'b'); });
test('falsy results are cached', () => { let n = 0; const f = memoize(() => { n++; return 0; }); f(); f(); f(); eq(n, 1); });
test('argument count matters', () => { let n = 0; const f = memoize((...xs) => ++n); f(1); f(1, undefined); eq(n, 2); });
test('this is passed through', () => { const o = { k: 2, m: memoize(function (x) { return x * this.k; }) }; eq(o.m(3), 6); });`,
      solution: `function memoize(fn) {
  const root = new Map();
  const RESULT = Symbol('result');      // no argument can ever equal this key
  return function (...args) {
    let node = root;
    for (const arg of args) {
      if (!node.has(arg)) node.set(arg, new Map());
      node = node.get(arg);
    }
    if (node.has(RESULT)) return node.get(RESULT);
    const result = fn.apply(this, args);
    node.set(RESULT, result);
    return result;
  };
}`,
      why: 'A trie of Maps compares each argument with SameValueZero instead of turning it into text, and the depth of the node encodes the argument count. Checking <code>has</code> instead of truthiness is the same <code>||</code> versus <code>??</code> lesson from Tier 1, in another costume.'
    }
  ]
};
