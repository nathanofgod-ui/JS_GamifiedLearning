// Tier 2, lesson 11: Modules & Encapsulation
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'modules',
  tier: 2,
  n: 11,
  title: 'Modules & Encapsulation',
  blurb: 'ES modules, live bindings, singletons, cycles',
  note: `
<p>Everything you write from here on is split across files. ES modules decide what each file can see, when it runs, and what state is shared. LWC uses them too, but the platform hides the parts that bite: evaluation order, caching and cycles.</p>
<h4>The basics, precisely</h4>
<ul>
<li>A module has its own top-level scope. Nothing leaks to the global object unless you put it there. Unexported means private.</li>
<li>Modules are always strict mode, and top-level <code>this</code> is <code>undefined</code>.</li>
<li><code>import</code> and <code>export</code> are static: they must sit at the top level with literal paths, so tools can see the whole dependency graph without running anything. <code>import()</code> is the dynamic, promise-returning version (Tier 3).</li>
<li>In the browser, no build step needed: <code>&lt;script type="module" src="main.js"&gt;</code>. Specifiers need <code>./</code> and the file extension; bare names like <code>'lodash'</code> need an import map.</li>
</ul>
<h4>Evaluated once, shared by all</h4>
<p>The browser keeps a module map keyed by URL. The first import fetches and evaluates a module; every later import gets the <b>same instance</b>. So module-level state is a singleton: one cache, one counter, one array, shared by every importer (and by every test in the same run).</p>
<h4>Imports are live bindings, not copies</h4>
~~~
// counter.js
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from './counter.js';
increment();
console.log(count);   // 1: you are looking at counter.js's variable
count = 5;            // TypeError: imports are read-only views
~~~
<p>An imported object can still be mutated (<code>settings.theme = 'dark'</code> works), because the binding is read-only, not the object. That is a common way for "private" module state to leak.</p>
<h4>How the graph is loaded</h4>
<p>The loader walks the graph depth-first: a module's dependencies are evaluated before it is. A module that is already loaded is reused. A module that is <b>currently loading</b> and gets imported again means a cycle. Real ES modules allow cycles, but the second module sees the first one's exports before they are initialised, and touching a <code>let</code>, <code>const</code> or <code>class</code> export at that point throws a <code>ReferenceError</code> (the temporal dead zone again). Function declarations are hoisted, which is why some cycles happen to work.</p>
<h4>Before ES modules</h4>
<p>You will meet the older patterns in generated code: the <b>IIFE module</b> (<code>const api = (function () { const secret = []; return { ... }; })();</code>) and CommonJS (<code>require</code>/<code>module.exports</code>, which copies values instead of binding them live). The challenge in this lesson builds a tiny AMD-style loader so you can see what any module system has to get right.</p>`,
  eye: 'Look for module-level mutable state in generated code (<code>let cache = {}</code> at the top of a file): it is shared by every importer. Look for functions that return internal arrays or objects directly: callers can now edit your private state. And check cycles: two modules that import each other usually mean a third module is missing.',
  challenges: [
    {
      id: 'mod-live',
      type: 'mcq',
      title: 'Live bindings',
      xp: 15,
      prompt: '<p>Two ES module files. What does <code>main.js</code> print?</p>',
      code: `// counter.js
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from './counter.js';
increment();
increment();
console.log(count);`,
      options: ['0', '2', 'TypeError: Assignment to constant variable', 'undefined'],
      answer: 1,
      explain: "An import is a live, read-only view of the exporting module's variable. <code>increment</code> changes <code>counter.js</code>'s <code>count</code>, and <code>main.js</code> sees the change. There is no assignment in <code>main.js</code>, so nothing throws. (CommonJS would have printed 0, because <code>require</code> copies the value.)"
    },
    {
      id: 'mod-once',
      type: 'mcq',
      title: 'How many times does it run?',
      xp: 15,
      prompt: '<p>Four module files. What gets logged when <code>main.js</code> runs?</p>',
      code: `// store.js
console.log('store init');
export const state = { n: 0 };

// a.js
import { state } from './store.js';
state.n++;

// b.js
import { state } from './store.js';
state.n++;

// main.js
import './a.js';
import './b.js';
import { state } from './store.js';
console.log(state.n);`,
      options: [
        'store init, then 2',
        'store init three times, then 2',
        'store init three times, then 1',
        'store init, then 0'
      ],
      answer: 0,
      explain: 'A module is evaluated once per URL and then cached. <code>a.js</code>, <code>b.js</code> and <code>main.js</code> all receive the same <code>state</code> object, and both increments land on it. Handy for a single app store, a trap for anything that should be per-instance.'
    },
    {
      id: 'mod-loader',
      type: 'code',
      title: 'Build a module loader',
      xp: 70,
      prompt: `<p>Write <code>createModuleSystem()</code> returning <code>{ define, require }</code>:</p>
<ul>
<li><code>define(name, deps, factory)</code> registers a module. Defining the same name twice throws.</li>
<li><code>require(name)</code> returns the module's exports: <code>factory(...resolvedDeps)</code>, with the dependencies resolved in order.</li>
<li>Factories are lazy (nothing runs at define time) and run <b>at most once</b>; every later <code>require</code> returns the cached value, even if that value is <code>undefined</code>.</li>
<li>Unknown modules throw an error whose message includes the missing name.</li>
<li>Cycles throw an error whose message includes the cycle path, for example <code>a -&gt; b -&gt; a</code>.</li>
<li>If a factory throws, nothing is cached, the error propagates, and a later <code>require</code> tries again (it must not be reported as a cycle).</li>
<li>Two systems never share anything.</li>
</ul>`,
      starter: `function createModuleSystem() {
  // your code here
}`,
      hints: [
        'Keep two maps in the closure: definitions, and the cache of evaluated exports. Use <code>cache.has(name)</code>, not a truthiness check, so <code>undefined</code> exports count as loaded.',
        "Track the modules currently being evaluated in a stack. If <code>require</code> is asked for a name that is already on the stack, that's a cycle, and the stack holds its path.",
        'Push before resolving dependencies and pop in a <code>finally</code> block, so a throwing factory does not leave its name on the stack.'
      ],
      tests: `
test('require returns the factory result', () => { const m = createModuleSystem(); m.define('pi', [], () => 3.14); eq(m.require('pi'), 3.14); });
test('dependencies are injected in order', () => { const m = createModuleSystem(); m.define('a', [], () => 'A'); m.define('b', [], () => 'B'); m.define('ba', ['b', 'a'], (b, a) => b + a); eq(m.require('ba'), 'BA'); });
test('factories are lazy and run once', () => {
  const m = createModuleSystem(); let runs = 0;
  m.define('x', [], () => { runs++; return {}; }); eq(runs, 0);
  const first = m.require('x');
  m.define('y', ['x'], x => x); m.define('z', ['x'], x => x);
  assert(m.require('y') === first && m.require('z') === first, 'everyone should get the same instance');
  eq(runs, 1);
});
test('a module can export undefined', () => { const m = createModuleSystem(); let runs = 0; m.define('u', [], () => { runs++; }); m.require('u'); m.require('u'); eq(runs, 1); });
test('unknown module', () => { const m = createModuleSystem(); const e = throws(() => m.require('nope')); assert(/nope/.test(e.message), 'message should name the module'); });
test('unknown dependency', () => { const m = createModuleSystem(); m.define('a', ['ghost'], g => g); const e = throws(() => m.require('a')); assert(/ghost/.test(e.message), 'message should name the missing dependency'); });
test('duplicate define throws', () => { const m = createModuleSystem(); m.define('a', [], () => 1); throws(() => m.define('a', [], () => 2)); eq(m.require('a'), 1); });
test('cycles are reported with their path', () => {
  const m = createModuleSystem();
  m.define('a', ['b'], b => b); m.define('b', ['a'], a => a); m.define('c', ['a'], a => a);
  const e = throws(() => m.require('c'));
  assert(e.message.includes('a -> b -> a'), 'message should contain "a -> b -> a", got: ' + e.message);
});
test('self-dependency is a cycle', () => { const m = createModuleSystem(); m.define('me', ['me'], x => x); const e = throws(() => m.require('me')); assert(e.message.includes('me -> me'), 'got: ' + e.message); });
test('a throwing factory is not cached and not mistaken for a cycle', () => {
  const m = createModuleSystem(); let tries = 0;
  m.define('flaky', [], () => { tries++; if (tries === 1) throw new Error('boom'); return 'ok'; });
  eq(throws(() => m.require('flaky')).message, 'boom');
  eq(m.require('flaky'), 'ok'); eq(tries, 2);
});
test('diamonds load the shared module once', () => {
  const m = createModuleSystem(); let runs = 0;
  m.define('base', [], () => ++runs); m.define('l', ['base'], b => b); m.define('r', ['base'], b => b);
  m.define('top', ['l', 'r'], (l, r) => [l, r]);
  eq(m.require('top'), [1, 1]); eq(runs, 1);
});
test('systems are independent', () => { const a = createModuleSystem(); const b = createModuleSystem(); a.define('x', [], () => 1); throws(() => b.require('x')); b.define('x', [], () => 2); eq([a.require('x'), b.require('x')], [1, 2]); });`,
      solution: `function createModuleSystem() {
  const defs = new Map();    // name -> { deps, factory }
  const cache = new Map();   // name -> exports
  const loading = [];        // names currently being evaluated, outermost first

  function define(name, deps, factory) {
    if (defs.has(name)) throw new Error('Module already defined: ' + name);
    defs.set(name, { deps, factory });
  }

  function require(name) {
    if (cache.has(name)) return cache.get(name);
    const def = defs.get(name);
    if (!def) throw new Error('Unknown module: ' + name);
    const at = loading.indexOf(name);
    if (at !== -1) {
      throw new Error('Circular dependency: ' + loading.slice(at).concat(name).join(' -> '));
    }
    loading.push(name);
    try {
      const exports = def.factory(...def.deps.map(require));
      cache.set(name, exports);
      return exports;
    } finally {
      loading.pop();
    }
  }

  return { define, require };
}`,
      why: 'A loader is a depth-first search with memoisation. The three-state idea (unvisited, in progress, done) is the same one used to detect cycles in any directed graph; here "in progress" is the stack and "done" is the cache. <code>finally</code> keeps the stack honest when a factory throws.'
    },
    {
      id: 'mod-review',
      type: 'review',
      title: 'AI review: the leaky module',
      xp: 50,
      context: '<p>You asked for a small task-list module whose state is private: callers can only change it through its methods.</p>',
      prompt: "<p><b>The spec:</b> <code>createTaskList()</code> returns an independent list. <code>add(title)</code> returns the new task's index. <code>getAll()</code> returns the tasks as <code>{ title, done }</code> objects. <code>complete(i)</code> marks a task done and ignores unknown indexes. <code>remaining()</code> counts unfinished tasks. Nothing a caller does with the result of <code>getAll()</code> may change the list.</p>",
      code: `function createTaskList() {
  const tasks = [];
  return {
    add(title) {
      tasks.push({ title, done: false });
      return tasks.length - 1;
    },
    getAll() {
      return tasks;
    },
    complete(i) {
      if (tasks[i]) tasks[i].done = true;
    },
    remaining() {
      return tasks.filter(t => !t.done).length;
    }
  };
}`,
      question: 'What is wrong with this code?',
      options: [
        'tasks should be declared with let, because const arrays cannot be pushed to',
        'getAll hands out the private array and the task objects inside it, so callers can edit the list directly',
        'The object literal methods lose their this, so add cannot reach tasks',
        'Every call to createTaskList shares the same tasks array'
      ],
      answer: 1,
      diagnosis: 'The closure hides the <code>tasks</code> variable, but <code>getAll</code> returns the array itself, and the task objects in it. A caller can push fake tasks or flip <code>done</code> without going through <code>complete</code>. Encapsulation needs copies at the boundary. (<code>const</code> only stops reassignment, and the methods never use <code>this</code>.)',
      hints: [
        'Return a copy of the array, and copies of the task objects too: a shallow copy of the array alone still shares the tasks.'
      ],
      tests: `
test('add returns the index and getAll lists tasks', () => { const l = createTaskList(); eq(l.add('a'), 0); eq(l.add('b'), 1); eq(l.getAll(), [{ title: 'a', done: false }, { title: 'b', done: false }]); });
test('complete and remaining', () => { const l = createTaskList(); l.add('a'); l.add('b'); l.complete(0); eq(l.remaining(), 1); eq(l.getAll()[0].done, true); });
test('pushing into the result does not add a task', () => { const l = createTaskList(); l.add('a'); l.getAll().push({ title: 'sneaky', done: false }); eq(l.remaining(), 1); eq(l.getAll().length, 1); });
test('editing a returned task does not change the list', () => { const l = createTaskList(); l.add('a'); l.getAll()[0].done = true; eq(l.remaining(), 1); });
test('lists are independent', () => { const a = createTaskList(); const b = createTaskList(); a.add('x'); eq(b.getAll(), []); });
test('complete ignores unknown indexes', () => { const l = createTaskList(); l.add('a'); l.complete(5); l.complete(-1); eq(l.remaining(), 1); });`,
      solution: `function createTaskList() {
  const tasks = [];
  return {
    add(title) {
      tasks.push({ title, done: false });
      return tasks.length - 1;
    },
    getAll() {
      return tasks.map(t => ({ ...t }));   // copies all the way down
    },
    complete(i) {
      if (tasks[i]) tasks[i].done = true;
    },
    remaining() {
      return tasks.filter(t => !t.done).length;
    }
  };
}`,
      why: 'A closure makes a <b>variable</b> private, not the objects it points to. Anything you return is shared with the caller, so the boundary of a module is where copies (or frozen, immutable data) belong.'
    }
  ]
};
