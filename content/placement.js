// Placement test: two predict-the-output questions per lesson. Both right = tested out of that lesson.
export default {
  types: [
    {
      code: 'console.log(typeof typeof 1, Array.isArray(Object.create(Array.prototype)));',
      options: ['number true', 'string false', 'string true', 'number false'],
      answer: 1,
      explain: "<code>typeof</code> always returns a string, so <code>typeof typeof 1</code> is <code>'string'</code>. An object that merely inherits from <code>Array.prototype</code> is not an array; <code>Array.isArray</code> checks the real thing."
    },
    {
      code: 'console.log(0.1 + 0.2 === 0.3, Number.MAX_SAFE_INTEGER + 2 === Number.MAX_SAFE_INTEGER + 1);',
      options: ['true false', 'false false', 'false true', 'true true'],
      answer: 2,
      explain: 'Binary doubles cannot store 0.1 exactly. Past 2<sup>53</sup> only even integers are representable, so <code>2**53 + 1</code> rounds to <code>2**53</code>.'
    }
  ],
  coercion: [
    {
      code: "console.log([1] == 1, [1, 2] == '1,2', null >= 0, undefined == 0);",
      options: [
        'true true true false',
        'false true false false',
        'true false true true',
        'false false true false'
      ],
      answer: 0,
      explain: "Arrays become strings (<code>'1'</code>, <code>'1,2'</code>) under <code>==</code>. Relational operators convert <code>null</code> to 0, but <code>==</code> only pairs <code>null</code>/<code>undefined</code> with each other."
    },
    {
      code: "console.log(1 + '2' - 1, '3' * '4', true + true + '1');",
      options: ['11 12 21', '111 12 21', '11 34 2', '12 12 true1'],
      answer: 0,
      explain: "<code>1 + '2'</code> is <code>'12'</code>, then <code>-</code> makes it 11. <code>*</code> converts both strings. <code>true + true</code> is 2, then concatenation gives <code>'21'</code>."
    }
  ],
  nullish: [
    {
      code: `const o = { a: 0, b: null, c: { d: '' } };
console.log(o.a || 5, o.a ?? 5, o.b ?? 'x', o.c?.d || 'y', o.z?.d);`,
      options: [
        '5 0 x y undefined',
        '0 0 x  undefined',
        '5 5 x y undefined',
        '5 0 null y TypeError'
      ],
      answer: 0,
      explain: '<code>||</code> replaces any falsy value, <code>??</code> only <code>null</code>/<code>undefined</code>. <code>o.z?.d</code> short-circuits to <code>undefined</code> instead of throwing.'
    },
    {
      code: `let n = 0;
const f = () => ++n;
const o = null;
o?.go(f());
let x = null;
x ??= f();
x ??= f();
console.log(n, x);`,
      options: ['2 1', '1 1', '3 2', '2 2'],
      answer: 1,
      explain: 'Optional chaining short-circuits the whole call, arguments included, so the first <code>f()</code> never runs. <code>??=</code> only evaluates its right side when the target is nullish: once.'
    }
  ],
  scope: [
    {
      code: `var x = 'outer';
function f() {
  console.log(x);
  var x = 'inner';
}
f();`,
      options: ['outer', 'inner', 'undefined', 'ReferenceError'],
      answer: 2,
      explain: 'The inner <code>var x</code> is hoisted to the top of <code>f</code> and initialised to <code>undefined</code>, shadowing the outer <code>x</code> for the whole function.'
    },
    {
      code: `const fns = [];
for (var i = 0; i < 3; i++) {
  let j = i;
  fns.push(() => i + j);
}
console.log(fns.map(f => f()).join(','));`,
      options: ['0,2,4', '3,4,5', '3,3,3', '6,6,6'],
      answer: 1,
      explain: 'There is one <code>var i</code>, which is 3 by the time anything runs. Each iteration has its own <code>let j</code> (0, 1, 2).'
    }
  ],
  closures: [
    {
      code: `function make() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const a = make(), b = make();
a.inc(); a.inc(); b.inc();
const { inc, get } = a;
inc();
console.log(get(), b.get());`,
      options: ['2 1', '3 1', '3 3', '1 1'],
      answer: 1,
      explain: "Each <code>make()</code> call has its own <code>n</code>. Destructuring copies the functions, which still close over <code>a</code>'s <code>n</code>; they don't use <code>this</code>, so detaching them is harmless."
    },
    {
      code: `let x = 1;
const show = () => x;
x = 2;
function wrap() {
  let x = 3;
  return show();
}
console.log(wrap());`,
      options: ['1', '2', '3', 'undefined'],
      answer: 1,
      explain: 'Scope is lexical: <code>show</code> sees the <code>x</code> where it was <b>written</b>, not where it is called. Closures capture variables, not values, so it sees the current value 2.'
    }
  ],
  this: [
    {
      code: `'use strict';
function who() { return this === undefined ? 'undefined' : this.id; }
const a = { id: 'a', who };
const b = { id: 'b', who: a.who };
const bound = who.bind(a);
console.log(b.who(), bound.call(b), (0, a.who)());`,
      options: ['a a undefined', 'b a undefined', 'b b undefined', 'b a a'],
      answer: 1,
      explain: "<code>this</code> is decided by the call: <code>b.who()</code> gives <code>b</code>. A bound function ignores <code>call</code>'s receiver. The comma expression yields the bare function, so it is a plain call: <code>undefined</code> in strict mode."
    },
    {
      code: `'use strict';
const counter = {
  count: 0,
  inc() { this.count++; return this; }
};
const { inc } = counter;
counter.inc().inc();
try { inc(); } catch (e) { console.log(e.constructor.name, counter.count); }`,
      options: ['TypeError 2', 'TypeError 3', 'Nothing is printed', 'ReferenceError 2'],
      answer: 0,
      explain: 'Chaining works because <code>inc</code> returns <code>this</code>. The destructured <code>inc</code> is called with no receiver, so <code>this</code> is <code>undefined</code> and reading <code>undefined.count</code> throws a <code>TypeError</code>.'
    }
  ],
  arrays: [
    {
      code: "console.log([10, 1, 2].sort().join(','), [1, 2, 3].map(parseInt).join(','));",
      options: ['1,2,10 1,2,3', '1,10,2 1,NaN,NaN', '1,10,2 1,2,3', '1,2,10 1,NaN,NaN'],
      answer: 1,
      explain: 'Default <code>sort</code> compares strings. <code>map</code> passes <code>(value, index)</code>, so <code>parseInt</code> gets radix 1 (invalid) and radix 2 (where 3 is not a digit).'
    },
    {
      code: `const arr = [3, 1, 2];
const sorted = arr.sort((x, y) => x - y);
sorted.push(4);
console.log(arr.length, arr === sorted, [1, 2, 3].includes(NaN), [NaN].includes(NaN), [NaN].indexOf(NaN));`,
      options: [
        '3 false false true -1',
        '4 true false true -1',
        '4 true false false -1',
        '3 true false true 0'
      ],
      answer: 1,
      explain: '<code>sort</code> sorts in place and returns the same array. <code>includes</code> uses SameValueZero (finds <code>NaN</code>); <code>indexOf</code> uses <code>===</code> (never finds it).'
    }
  ],
  state: [
    {
      code: `const state = Object.freeze({ list: [1, 2], meta: { n: 1 } });
const next = { ...state, list: [...state.list, 3] };
next.meta.n = 2;
console.log(state.list.length, state.meta.n, next.list === state.list, Object.isFrozen(next));`,
      options: ['2 1 false false', '2 2 false false', '3 2 false true', '2 2 true false'],
      answer: 1,
      explain: '<code>freeze</code> is shallow and spread is shallow: <code>next.meta</code> is the same unfrozen object, so the edit shows through <code>state</code>. The spread result is a new, unfrozen object.'
    },
    {
      code: `const s0 = { cards: [{ id: 1, done: false }] };
const s1 = { ...s0, cards: s0.cards.map(c => (c.id === 1 ? { ...c, done: true } : c)) };
const s2 = { ...s1, cards: s1.cards.map(c => (c.id === 2 ? { ...c, done: true } : c)) };
console.log(s0.cards[0].done, s1.cards === s0.cards, s2.cards === s1.cards, s2.cards[0] === s1.cards[0]);`,
      options: [
        'false false true true',
        'false false false true',
        'true false false true',
        'false false false false'
      ],
      answer: 1,
      explain: '<code>map</code> always returns a new array, even when nothing matched, so <code>s2.cards</code> is new although no card changed. The card objects themselves are reused.'
    }
  ],
  proto: [
    {
      code: `function Animal() {}
Animal.prototype.legs = 4;
const cat = new Animal();
Animal.prototype = { legs: 2 };
const bird = new Animal();
console.log(cat.legs, bird.legs, cat instanceof Animal);`,
      options: ['2 2 true', '4 2 false', '4 2 true', '2 2 false'],
      answer: 1,
      explain: "<code>cat</code> keeps its link to the <b>old</b> prototype object. <code>instanceof</code> looks for the <b>current</b> <code>Animal.prototype</code> in <code>cat</code>'s chain and doesn't find it."
    },
    {
      code: `const proto = { hello() { return 'hi ' + this.name; } };
const o = Object.create(proto, { name: { value: 'Ada' } });
const keys = [];
for (const k in o) keys.push(k);
console.log(o.hello(), keys.join(','), Object.keys(o).length);`,
      options: ['hi Ada name,hello 1', 'hi Ada hello 0', 'hi undefined hello 0', 'hi Ada name 1'],
      answer: 1,
      explain: 'Properties defined through a descriptor default to non-enumerable, so <code>name</code> is hidden from both loops. <code>for...in</code> still finds the inherited, enumerable <code>hello</code>.'
    }
  ],
  classes: [
    {
      code: `class A {
  constructor() { this.init(); }
  init() { this.kind = 'A'; }
}
class B extends A {
  kind = 'field';
  init() { this.kind = 'B'; }
}
console.log(new B().kind);`,
      options: ['A', 'B', 'field', 'undefined'],
      answer: 2,
      explain: "<code>A</code>'s constructor calls the overriding <code>init</code>, setting <code>'B'</code>. Then <code>super()</code> returns and <code>B</code>'s field initialisers run, overwriting it with <code>'field'</code>."
    },
    {
      code: `class Box {
  #v = 1;
  static peek(b) { return #v in b ? b.#v : 'no'; }
}
console.log(Box.peek(new Box()), Box.peek({ v: 1 }), typeof Box, Object.keys(new Box()).length);`,
      options: ['1 no function 0', '1 1 class 1', '1 no object 0', 'undefined no function 1'],
      answer: 0,
      explain: '<code>#v in b</code> is a brand check that is false for look-alikes. Classes are functions, and private fields are not properties, so <code>Object.keys</code> sees nothing.'
    }
  ],
  modules: [
    {
      code: `// config.js
export const settings = { theme: 'light' };
export let version = 1;

// main.js
import { settings, version } from './config.js';
settings.theme = 'dark';
version = 2;
console.log(settings.theme);`,
      options: [
        'dark',
        'light',
        'A TypeError at version = 2, so nothing is printed',
        'A SyntaxError before anything runs'
      ],
      answer: 2,
      explain: 'Imported bindings are read-only, so assigning to <code>version</code> throws a <code>TypeError</code> at runtime. Mutating the imported <b>object</b> was allowed and already happened.'
    },
    {
      code: `// a.js
import { b } from './b.js';
export const a = 'A';
console.log('a sees', b);

// b.js
import { a } from './a.js';
export const b = 'B';
console.log('b sees', typeof a);

// main.js
import './a.js';`,
      options: [
        'b sees undefined, then a sees B',
        'b sees string, then a sees B',
        'A ReferenceError in b.js: a is used before it is initialised',
        'a sees undefined, then b sees string'
      ],
      answer: 2,
      explain: '<code>a.js</code> waits for <code>b.js</code>, which runs first and reads <code>a</code> while it is still in the temporal dead zone. Even <code>typeof</code> throws there.'
    }
  ],
  events: [
    {
      code: `const t = new EventTarget();
const log = [];
const h = () => log.push('h');
t.addEventListener('x', h, { once: true });
t.addEventListener('x', h);
t.dispatchEvent(new Event('x'));
t.dispatchEvent(new Event('x'));
console.log(log.length);`,
      options: ['1', '2', '3', '4'],
      answer: 0,
      explain: 'The same function for the same type is only registered once; the second <code>addEventListener</code> is ignored, including its options. The one registration was <code>once</code>, so it ran once.'
    },
    {
      code: `const t = new EventTarget();
const log = [];
t.addEventListener('x', () => { log.push(1); throw new Error('boom'); });
t.addEventListener('x', () => log.push(2));
t.dispatchEvent(new Event('x'));
console.log(log.join(','));`,
      options: ['1', '1,2', '2', 'Error: boom is thrown and nothing is printed'],
      answer: 1,
      explain: '<code>dispatchEvent</code> isolates listeners: the error is reported (to <code>window.onerror</code> or the console) and the next listener still runs. <code>dispatchEvent</code> itself does not throw.'
    }
  ],
  router: [
    {
      code: `const p = new URLSearchParams('?tag=a&tag=b&q=hello+world&empty=');
console.log(JSON.stringify([p.get('tag'), p.getAll('tag').length, p.get('q'), p.get('empty'), p.get('missing')]));`,
      options: [
        '["a",2,"hello world","",null]',
        '["b",2,"hello+world","",null]',
        '["a,b",2,"hello world",null,null]',
        '["a",2,"hello+world",null,undefined]'
      ],
      answer: 0,
      explain: "<code>get</code> returns the first value, <code>getAll</code> every value. Form encoding turns <code>+</code> into a space. An empty value is <code>''</code>; a missing key is <code>null</code>."
    },
    {
      code: "console.log(encodeURIComponent('a/b c?'), encodeURI('/a b/c?d=1'), decodeURIComponent('%41'));",
      options: [
        'a%2Fb%20c%3F /a%20b/c?d=1 A',
        'a/b%20c? /a%20b/c?d=1 A',
        'a%2Fb%20c%3F %2Fa%20b%2Fc%3Fd%3D1 A',
        'a%2Fb+c%3F /a+b/c?d=1 %41'
      ],
      answer: 0,
      explain: '<code>encodeURIComponent</code> escapes URL syntax characters, which is what a single segment needs. <code>encodeURI</code> keeps <code>/</code>, <code>?</code> and <code>=</code> because it assumes a whole URL.'
    }
  ],
  selectors: [
    {
      code: `const reducer = (s = { n: 0 }, a) => (a.type === 'inc' ? { n: s.n + 1 } : { ...s });
const s0 = reducer(undefined, {});
const s1 = reducer(s0, { type: 'noop' });
const s2 = reducer(s1, { type: 'inc' });
console.log(s0 === s1, s1.n, s2.n, s0 === reducer(s0, { type: 'noop' }));`,
      options: ['true 0 1 true', 'false 0 1 false', 'true 0 1 false', 'false 1 1 false'],
      answer: 1,
      explain: 'The default branch spreads, so even an ignored action returns a new object. Every subscriber comparing references would think the state changed.'
    },
    {
      code: `const last = { v: undefined, has: false };
function memo(v) {
  if (last.has && last.v === v) return 'hit';
  last.has = true; last.v = v;
  return 'miss';
}
console.log([memo(NaN), memo(NaN), memo(0), memo(-0)].join(' '));`,
      options: [
        'miss hit miss miss',
        'miss miss miss hit',
        'miss hit miss hit',
        'miss miss miss miss'
      ],
      answer: 1,
      explain: 'With <code>===</code>, <code>NaN</code> never equals itself (a miss every time) while <code>0 === -0</code> is true. <code>Object.is</code> gets both cases the other way round, which is why memoisers use it.'
    }
  ],
  render: [
    {
      prompt: '<p>A keyed list goes from <code>prev</code> to <code>next</code>. No items are added or removed. What is the smallest number of nodes that must move?</p>',
      code: `const prev = ['a', 'b', 'c', 'd', 'e'];
const next = ['b', 'c', 'e', 'a', 'd'];`,
      options: ['1', '2', '3', '4'],
      answer: 1,
      explain: 'The old indexes in new order are <code>[1, 2, 4, 0, 3]</code>. Its longest increasing subsequence has length 3 (<code>b c e</code> or <code>b c d</code>), so 5 &minus; 3 = 2 nodes move.'
    },
    {
      code: `let renders = 0;
const listeners = [() => renders++];
const store = {
  state: { n: 0 },
  set(s) { if (s !== this.state) { this.state = s; listeners.forEach(f => f()); } }
};
store.set(store.state);
store.set({ ...store.state });
store.set({ n: 1 });
console.log(renders);`,
      options: ['1', '2', '3', '0'],
      answer: 1,
      explain: 'Only identity counts: the same object is no change, but a spread copy with identical contents is a new object and triggers a render, just like the new <code>{ n: 1 }</code>.'
    }
  ]
};
