// Tier 1, lesson 6: this & Binding
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'this',
  tier: 1,
  n: 6,
  title: 'this & Binding',
  blurb: 'How this is decided, call/apply/bind, arrows',
  note: `
<p><code>this</code> is not about where a function is written. For regular functions it is decided <b>at the call site</b>. Arrow functions are the exception: they have no <code>this</code> of their own and read it from the surrounding scope.</p>
<h4>The rules, in priority order</h4>
<ol>
<li><code>new Fn()</code>: <code>this</code> is the new object.</li>
<li><code>fn.call(ctx)</code> / <code>fn.apply(ctx)</code> / <code>fn.bind(ctx)</code>: <code>this</code> is <code>ctx</code>.</li>
<li><code>obj.method()</code>: <code>this</code> is <code>obj</code>.</li>
<li>A plain call <code>fn()</code>: <code>undefined</code> in strict mode and class bodies, the global object in sloppy mode.</li>
</ol>
~~~
const user = { name: 'Ada', hi() { return this.name; } };
user.hi();             // 'Ada'
const hi = user.hi;
hi();                  // lost: this is not user any more
setTimeout(user.hi);   // same problem with callbacks
~~~
<h4>Fixes</h4>
<ul>
<li><code>const hi = user.hi.bind(user)</code> fixes <code>this</code> permanently.</li>
<li>Wrap it: <code>setTimeout(() => user.hi())</code>.</li>
<li>Inside methods, use arrow functions for callbacks so they inherit the method's <code>this</code>.</li>
</ul>
<p><b>Avoid</b> arrow functions as object <em>methods</em> or prototype methods when you need <code>this</code>: they capture the outer scope, not the object.</p>`,
  eye: "Whenever a method is passed as a callback without wrapping (<code>items.map(obj.method)</code>, <code>addEventListener('click', obj.onClick)</code>), assume <code>this</code> is lost until proven otherwise.",
  challenges: [
    {
      id: 'this-extract',
      type: 'mcq',
      title: 'The detached method',
      xp: 15,
      prompt: '<p>What does this print, line by line? (Class bodies always run in strict mode.)</p>',
      code: `class Timer {
  constructor() { this.label = 'T'; }
  start() { return this.label; }
}

const t = new Timer();
const { start } = t;

try {
  console.log(start());
} catch (e) {
  console.log(e.name);
}
console.log(t.start());`,
      options: ['T, then T', 'undefined, then T', 'TypeError, then T', 'TypeError, then TypeError'],
      answer: 2,
      explain: 'Destructuring copies the function, not the object. Called as a plain function in strict mode, <code>this</code> is <code>undefined</code>, so <code>this.label</code> throws a <code>TypeError</code>. Called as <code>t.start()</code> it works.'
    },
    {
      id: 'this-arrow',
      type: 'mcq',
      title: 'Arrow vs regular',
      xp: 15,
      prompt: '<p>What does this print? (Assume strict mode.)</p>',
      code: `'use strict';
const o = {
  v: 1,
  getA() { return (() => this.v)(); },
  getB() { return (function () { return this?.v; })(); },
};
console.log(o.getA(), o.getB());`,
      options: ['1 1', '1 undefined', 'undefined undefined', 'undefined 1'],
      answer: 1,
      explain: 'The arrow inside <code>getA</code> inherits <code>this</code> from the method, which is <code>o</code>. The inner regular function in <code>getB</code> is called plainly, so in strict mode its <code>this</code> is <code>undefined</code> and <code>?.</code> turns that into <code>undefined</code>.'
    },
    {
      id: 'this-bind',
      type: 'code',
      title: 'Rebuild bind()',
      xp: 45,
      prompt: `<p>Write <code>myBind(fn, ctx, ...preset)</code>. It returns a new function that, when called, runs <code>fn</code> with <code>this</code> set to <code>ctx</code> and with the <code>preset</code> arguments first, followed by any arguments of the call. Do not use <code>Function.prototype.bind</code>.</p>
~~~
function greet(greeting, mark) { return greeting + ', ' + this.name + mark; }
const hi = myBind(greet, { name: 'Ada' }, 'Hi');
hi('!');   // 'Hi, Ada!'
~~~`,
      starter: `function myBind(fn, ctx, ...preset) {
  // your code here
}`,
      hints: [
        'Return a function that collects its own arguments with a rest parameter.',
        '<code>fn.apply(ctx, argsArray)</code> calls with a chosen <code>this</code>. Build the array from preset arguments followed by call arguments.'
      ],
      tests: `
function greet(greeting, mark) { return greeting + ', ' + this.name + mark; }
test('does not use .bind', () => assert(!/\\.\\s*bind\\s*\\(/.test(String(myBind)), 'Write the logic yourself'));
test('sets this', () => eq(myBind(greet, { name: 'Ada' })('Hi', '!'), 'Hi, Ada!'));
test('preset arguments come first', () => eq(myBind(greet, { name: 'Ada' }, 'Hi')('!'), 'Hi, Ada!'));
test('all arguments preset', () => eq(myBind(greet, { name: 'Bo' }, 'Yo', '?')(), 'Yo, Bo?'));
test('later this cannot override', () => { const holder = { name: 'Eve', say: myBind(greet, { name: 'Ada' }, 'Hi') }; eq(holder.say('!'), 'Hi, Ada!'); });
test('returns the result of fn', () => eq(myBind((a, b) => a * b, null, 3)(4), 12));`,
      solution: `function myBind(fn, ctx, ...preset) {
  return function (...args) {
    return fn.apply(ctx, [...preset, ...args]);
  };
}`,
      why: 'A bound function is just a closure over <code>fn</code>, <code>ctx</code> and the preset arguments. Real <code>bind</code> also handles <code>new</code>, which is why its specification is longer.'
    }
  ]
};
