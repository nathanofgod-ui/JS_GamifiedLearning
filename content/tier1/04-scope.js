// Tier 1, lesson 4: Scope & Hoisting
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'scope',
  tier: 1,
  n: 4,
  title: 'Scope & Hoisting',
  blurb: 'var, let, const, the temporal dead zone',
  note: `
<p>Scope decides where a name is visible. Hoisting decides what exists <em>before</em> its line runs. Together they explain most "why is this undefined" bugs.</p>
<h4>Three declarations</h4>
<ul>
<li><code>var</code>: function-scoped, hoisted and initialised to <code>undefined</code>. Redeclaring is allowed.</li>
<li><code>let</code> / <code>const</code>: block-scoped. They are hoisted too, but sit in the <b>temporal dead zone</b> until the declaration runs; touching them early throws <code>ReferenceError</code>.</li>
<li><b>Function declarations</b> are hoisted with their body, so you can call them above their definition. Function <em>expressions</em> assigned to a <code>const</code> are not.</li>
</ul>
~~~
console.log(a);   // undefined (var is hoisted)
var a = 1;

sayHi();          // works: declaration hoisted
function sayHi() { console.log('hi'); }

console.log(b);   // ReferenceError: TDZ
let b = 2;
~~~
<h4>Closures capture bindings, not values</h4>
<p>A function remembers the <em>variable</em>, not a snapshot of it. With <code>var</code> in a loop there is one shared variable. With <code>let</code> in a <code>for</code> head, the engine creates a fresh binding for every iteration.</p>
~~~
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j)); // 0 1 2
~~~
<p><code>const</code> protects the binding, not the value: <code>const list = []; list.push(1)</code> is fine.</p>`,
  eye: 'Spot <code>var</code> and loops that create callbacks. Also check whether a function declaration inside an <code>if</code> block is relied on outside it. Strict mode and sloppy mode differ there.',
  challenges: [
    {
      id: 'scope-tdz',
      type: 'mcq',
      title: 'Hoisting vs the dead zone',
      xp: 15,
      prompt: '<p>What does this print, line by line?</p>',
      code: `console.log(a);
var a = 1;

try {
  console.log(b);
} catch (e) {
  console.log(e.name);
}
let b = 2;`,
      options: [
        '1, then 2',
        'undefined, then ReferenceError',
        'ReferenceError, then ReferenceError',
        'undefined, then undefined'
      ],
      answer: 1,
      explain: '<code>var a</code> is hoisted and initialised to <code>undefined</code>. <code>let b</code> is hoisted too, but is uninitialised until its line runs, so reading it earlier throws a <code>ReferenceError</code>.'
    },
    {
      id: 'scope-loop',
      type: 'mcq',
      title: 'The loop trap',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns.map(f => f()));`,
      options: ['[0, 1, 2]', '[3, 3, 3]', '[2, 2, 2]', '[undefined, undefined, undefined]'],
      answer: 1,
      explain: 'There is a single function-scoped <code>i</code>. All three arrow functions close over that one variable, and by the time they run the loop has finished with <code>i === 3</code>.'
    },
    {
      id: 'scope-fix',
      type: 'code',
      title: 'Fix the shared variable',
      xp: 30,
      prompt: "<p>This function should return an array of <code>n</code> functions where the function at position <code>k</code> returns <code>k</code>. It has the loop bug you just saw. Fix it without changing the function's name or what it returns.</p>",
      starter: `function makeGetters(n) {
  const getters = [];
  for (var i = 0; i < n; i++) {
    getters.push(() => i);
  }
  return getters;
}`,
      hints: [
        'The problem is the single shared <code>i</code>. You need a new binding per iteration.',
        'Changing one keyword in the loop header does it. Explain to yourself <em>why</em> that works.'
      ],
      tests: `
test('each getter returns its own index', () => eq(makeGetters(3).map(f => f()), [0, 1, 2]));
test('longer arrays', () => eq(makeGetters(6).map(f => f()), [0, 1, 2, 3, 4, 5]));
test('zero getters', () => eq(makeGetters(0), []));
test('getters are independent of call order', () => { const g = makeGetters(4); eq([g[3](), g[0](), g[2](), g[1]()], [3, 0, 2, 1]); });`,
      solution: `function makeGetters(n) {
  const getters = [];
  for (let i = 0; i < n; i++) {
    getters.push(() => i);
  }
  return getters;
}`,
      why: '<code>let</code> in a <code>for</code> header gives each iteration its own copy of the variable, so each arrow function closes over a different <code>i</code>.'
    },
    {
      id: 'scope-review',
      type: 'review',
      title: 'AI review: shared ids',
      xp: 40,
      context: '<p>You asked for a factory that creates id generators, one per entity type, so cards get <code>card-1, card-2, ...</code> and columns get <code>col-1, col-2, ...</code>.</p>',
      prompt: "<p><b>The spec:</b> <code>createIdGenerator(prefix)</code> returns a function. Each call returns the next id, <code>prefix + '-' + n</code>, with <code>n</code> starting at 1. Every generator counts on its own.</p>",
      code: `let nextId = 1;

function createIdGenerator(prefix) {
  return function () {
    return prefix + '-' + nextId++;
  };
}`,
      question: 'What is wrong with this code?',
      options: [
        'nextId++ returns the incremented value, so the first id is prefix-2',
        'nextId lives outside the factory, so every generator shares one counter',
        'The inner function needs .bind(prefix) to remember the prefix',
        'nextId should be declared with var so that it is hoisted'
      ],
      answer: 1,
      diagnosis: 'Each call to <code>createIdGenerator</code> creates a new closure over <code>prefix</code>, but they all close over the <b>same</b> module-level <code>nextId</code>. The first generator works in a demo; the second one starts wherever the first left off. Postfix <code>++</code> returns the old value, so the first id really is <code>-1</code>.',
      hints: [
        'Each generator needs its own counter. What runs once per call to <code>createIdGenerator</code>?'
      ],
      tests: `
test('counts from 1', () => { const g = createIdGenerator('card'); eq([g(), g(), g()], ['card-1', 'card-2', 'card-3']); });
test('generators are independent', () => { const a = createIdGenerator('a'); const b = createIdGenerator('b'); a(); a(); eq(b(), 'b-1'); eq(a(), 'a-3'); });
test('a new generator starts fresh', () => { createIdGenerator('x')(); eq(createIdGenerator('x')(), 'x-1'); });`,
      solution: `function createIdGenerator(prefix) {
  let nextId = 1;             // one counter per generator
  return function () {
    return prefix + '-' + nextId++;
  };
}`,
      why: 'Where a variable is declared decides how many copies exist. Inside the factory, every call makes a fresh binding that only its own returned function can see.'
    }
  ]
};
