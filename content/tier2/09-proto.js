// Tier 2, lesson 9: Prototypes & the Chain
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'proto',
  tier: 2,
  n: 9,
  title: 'Prototypes & the Chain',
  blurb: 'Property lookup, Object.create, what new really does',
  note: `
<p>Classes, <code>instanceof</code>, method sharing and half of the "why is this undefined" bugs all sit on one mechanism: every object has a hidden link to another object, its <b>prototype</b>. Framework code hides this. Generated code gets it subtly wrong.</p>
<h4>Lookup walks the chain, writes do not</h4>
<p>Reading <code>obj.x</code> checks <code>obj</code>'s own properties, then its prototype's, then that object's prototype, until it finds <code>x</code> or reaches <code>null</code>. Writing <code>obj.x = 1</code> almost always creates or overwrites an <b>own</b> property on <code>obj</code>, leaving the prototype alone. That is called <b>shadowing</b>.</p>
~~~
const base = { greet() { return 'hi ' + this.name; }, name: 'base' };
const child = Object.create(base);   // child's prototype is base
child.name = 'child';                // own property, shadows base.name

child.greet();                       // 'hi child': found on base, this = child
Object.getPrototypeOf(child) === base;   // true
Object.hasOwn(child, 'greet');           // false
~~~
<p>Two exceptions to "writes stay local": if the chain has a <b>setter</b> for that name, the setter runs instead; if it has a non-writable property of that name, the write fails (and throws in strict mode).</p>
<h4>Two things called "prototype"</h4>
<ul>
<li><code>Object.getPrototypeOf(x)</code> (the old <code>x.__proto__</code>) is the object <code>x</code> inherits from.</li>
<li><code>F.prototype</code> is an ordinary property that only functions have. It is the object that <b>instances made with</b> <code>new F()</code> will inherit from. <code>Object.getPrototypeOf(F)</code> is <code>Function.prototype</code>, something else entirely.</li>
</ul>
<h4>What new does, step by step</h4>
<ol>
<li>Create an empty object whose prototype is <code>F.prototype</code>.</li>
<li>Call <code>F</code> with <code>this</code> set to that object.</li>
<li>If <code>F</code> returned an object (or function), use that. Otherwise use the new object. Returned primitives are ignored.</li>
</ol>
<p><code>x instanceof F</code> is the mirror image: it walks <code>x</code>'s chain looking for <code>F.prototype</code>. Nothing else. So replacing <code>F.prototype</code> after objects were created makes old instances stop being <code>instanceof F</code>, and <code>Object.create(F.prototype)</code> makes an "instance" without ever running <code>F</code>.</p>
<h4>Enumeration and the chain</h4>
<ul>
<li><code>for...in</code> visits enumerable properties <b>including inherited ones</b>. <code>Object.keys</code>, <code>Object.entries</code> and spread only see own enumerable properties.</li>
<li><code>Object.create(null)</code> makes an object with no prototype at all: a clean dictionary with no <code>toString</code> or <code>constructor</code> keys lurking. It also has no <code>hasOwnProperty</code> method, which is why <code>Object.hasOwn(obj, k)</code> exists.</li>
</ul>
<h4>The shared-state trap</h4>
<p>Putting <b>methods</b> on the prototype is the point: one function shared by every instance. Putting <b>mutable data</b> there is a bug: one array shared by every instance, and every instance that pushes into it pushes into the same array. Data belongs on the instance, set in the constructor.</p>`,
  eye: "When generated code puts an array or object on a prototype (or in a class's static or module scope) and then mutates it, every instance is sharing it. Also check <code>for...in</code> loops without an own-property check, and <code>obj.hasOwnProperty(k)</code> on objects that might come from <code>Object.create(null)</code> or user data.",
  challenges: [
    {
      id: 'proto-shadow',
      type: 'mcq',
      title: 'Shadow and reveal',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const base = { greet: 'hello', count: 0 };
const child = Object.create(base);

child.greet = 'hi';
child.count++;
delete child.greet;

console.log(child.greet, child.count, base.count, Object.keys(child).join(','));`,
      options: ['hi 1 1 greet,count', 'hello 1 0 count', 'undefined 1 0 count', 'hello 1 1 count'],
      answer: 1,
      explain: "<code>child.count++</code> reads <code>0</code> through the chain, then writes an <b>own</b> <code>count</code> of 1 on <code>child</code>; <code>base.count</code> stays 0. Deleting the own <code>greet</code> uncovers the inherited <code>'hello'</code> again. Only <code>count</code> is an own key now."
    },
    {
      id: 'proto-new',
      type: 'code',
      title: 'Rebuild new',
      xp: 45,
      prompt: `<p>Write <code>myNew(Ctor, ...args)</code> that does exactly what <code>new Ctor(...args)</code> does for an ordinary constructor function:</p>
<ul>
<li>the result inherits from <code>Ctor.prototype</code> and <code>Ctor</code> runs with <code>this</code> set to it;</li>
<li>if <code>Ctor</code> returns an object or a function, that is the result instead;</li>
<li>returned primitives (including <code>null</code>) are ignored.</li>
</ul>
<p>Do not use the <code>new</code> keyword or <code>Reflect.construct</code> anywhere in your function (comments included). That's the point.</p>`,
      starter: `function myNew(Ctor, ...args) {
  // your code here
}`,
      hints: [
        'Step one is an object whose prototype is <code>Ctor.prototype</code>. <code>Object.create</code> does exactly that.',
        'Call the constructor with <code>Ctor.apply(obj, args)</code> and keep what it returns.',
        "<code>typeof null</code> is <code>'object'</code>, so check for null explicitly before deciding to use the returned value."
      ],
      tests: `
function Point(x, y) { this.x = x; this.y = y; }
Point.prototype.len = function () { return Math.hypot(this.x, this.y); };
test('creates an instance', () => { const p = myNew(Point, 3, 4); eq([p.x, p.y], [3, 4]); assert(Object.getPrototypeOf(p) === Point.prototype, 'prototype should be Point.prototype'); });
test('prototype methods work', () => eq(myNew(Point, 3, 4).len(), 5));
test('instanceof agrees', () => assert(myNew(Point, 1, 1) instanceof Point, 'should be instanceof Point'));
test('this is the new object', () => { let seen; function F() { seen = this; } const o = myNew(F); assert(seen === o, 'this inside the constructor should be the returned object'); });
test('a returned object replaces the instance', () => { function F() { this.a = 1; return { b: 2 }; } eq(myNew(F), { b: 2 }); });
test('a returned function replaces it too', () => { const g = () => 1; function F() { return g; } assert(myNew(F) === g, 'should return the function'); });
test('returned primitives and null are ignored', () => { function F() { this.a = 1; return 42; } eq(myNew(F).a, 1); function G() { this.a = 2; return null; } eq(myNew(G).a, 2); });
test('does not use new or Reflect.construct', () => assert(!/\\bnew\\b|Reflect\\s*\\.\\s*construct/.test(String(myNew)), 'Build it from the parts'));`,
      solution: `function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);
  const result = Ctor.apply(obj, args);
  const isObject = result !== null && (typeof result === 'object' || typeof result === 'function');
  return isObject ? result : obj;
}`,
      why: '<code>new</code> is three steps you can perform by hand: link, call, choose. The "choose" step is why a constructor that returns an object silently throws away <code>this</code>, a pattern some libraries use on purpose and generated code uses by accident.'
    },
    {
      id: 'proto-instanceof',
      type: 'code',
      title: 'Walk the chain',
      xp: 40,
      prompt: `<p>Write <code>isInstance(value, Ctor)</code> that returns the same answer as <code>value instanceof Ctor</code> for ordinary constructors and classes, without using <code>instanceof</code>.</p>
<ul>
<li>Primitives (<code>1</code>, <code>'s'</code>, <code>null</code>, <code>undefined</code>, ...) are never instances.</li>
<li>Throw a <code>TypeError</code> if <code>Ctor</code> is not a function, as <code>instanceof</code> does.</li>
</ul>`,
      starter: `function isInstance(value, Ctor) {
  // your code here
}`,
      hints: [
        "<code>instanceof</code> looks for <code>Ctor.prototype</code> somewhere in <code>value</code>'s prototype chain.",
        'Loop with <code>Object.getPrototypeOf</code> until you find it or reach <code>null</code>.',
        'Functions are objects too: <code>(() =&gt; 1) instanceof Function</code> is true, so only rule out non-object, non-function values.'
      ],
      tests: `
class A {}
class B extends A {}
test('direct instance', () => eq(isInstance(new A(), A), true));
test('inherited', () => { eq(isInstance(new B(), A), true); eq(isInstance(new B(), Object), true); });
test('not related', () => eq(isInstance(new A(), B), false));
test('arrays and functions', () => { eq(isInstance([], Array), true); eq(isInstance([], Object), true); eq(isInstance(() => 1, Function), true); });
test('primitives are never instances', () => { eq(isInstance(1, Number), false); eq(isInstance('s', String), false); eq(isInstance(null, Object), false); eq(isInstance(undefined, Object), false); });
test('null-prototype objects', () => eq(isInstance(Object.create(null), Object), false));
test('Object.create chains', () => { function F() {} const o = Object.create(Object.create(F.prototype)); eq(isInstance(o, F), true); });
test('throws TypeError for a non-function', () => { const e = throws(() => isInstance({}, {})); assert(e instanceof TypeError, 'should be a TypeError'); });
test('does not use instanceof', () => assert(!/instanceof/.test(String(isInstance)), 'Walk the chain yourself'));`,
      solution: `function isInstance(value, Ctor) {
  if (typeof Ctor !== 'function') throw new TypeError('Right-hand side is not callable');
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return false;
  const target = Ctor.prototype;
  let proto = Object.getPrototypeOf(value);
  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}`,
      why: '<code>instanceof</code> is a linked-list search for one specific object. It knows nothing about who constructed the value, which is why it breaks across iframes (each has its own <code>Array.prototype</code>) and why <code>Array.isArray</code> exists.'
    },
    {
      id: 'proto-review',
      type: 'review',
      title: 'AI review: shared tags',
      xp: 50,
      context: '<p>You asked an assistant for a <code>Card</code> constructor where each card keeps its own list of tags. It produced this, and it passed a quick test with a single card.</p>',
      prompt: '<p><b>The spec:</b> every card owns its own <code>tags</code> array. <code>addTag(tag)</code> adds a tag once (no duplicates) and returns the card so calls can chain. <code>hasTag(tag)</code> reports whether the card has it. The methods stay on <code>Card.prototype</code>, shared by all cards.</p>',
      code: `function Card(title) {
  this.title = title;
}

Card.prototype.tags = [];

Card.prototype.addTag = function (tag) {
  if (!this.tags.includes(tag)) this.tags.push(tag);
  return this;
};

Card.prototype.hasTag = function (tag) {
  return this.tags.includes(tag);
};`,
      question: 'What is wrong with this code?',
      options: [
        'addTag should be an arrow function so that this points at the card',
        'tags lives on the prototype, so every card pushes into one shared array',
        'Methods must be defined inside the constructor or instances cannot see them',
        'includes compares with ==, so the tag "1" and the number 1 collide'
      ],
      answer: 1,
      diagnosis: "<code>this.tags</code> is found through the prototype chain, and <code>push</code> mutates that one shared array. No own property is ever created, so the first card's tags show up on every card. An arrow function would break <code>this</code> entirely, and <code>includes</code> uses SameValueZero, not <code>==</code>.",
      hints: [
        'Data that belongs to one instance must be created per instance. Where does code run once per <code>new Card()</code>?'
      ],
      tests: `
test('cards do not share tags', () => { const a = new Card('A'); const b = new Card('B'); a.addTag('bug'); eq(a.tags, ['bug']); eq(b.tags, []); });
test('tags is an own property', () => assert(Object.hasOwn(new Card('A'), 'tags'), 'each card should own its tags array'));
test('dedupes and chains', () => { const c = new Card('C'); assert(c.addTag('x').addTag('x').addTag('y') === c, 'addTag should return the card'); eq(c.tags, ['x', 'y']); });
test('hasTag', () => { const c = new Card('C').addTag('ui'); eq(c.hasTag('ui'), true); eq(c.hasTag('api'), false); });
test('methods stay shared on the prototype', () => { const a = new Card('A'); const b = new Card('B'); assert(a.addTag === b.addTag && !Object.hasOwn(a, 'addTag'), 'keep the methods on Card.prototype'); });`,
      solution: `function Card(title) {
  this.title = title;
  this.tags = [];          // one array per card
}

Card.prototype.addTag = function (tag) {
  if (!this.tags.includes(tag)) this.tags.push(tag);
  return this;
};

Card.prototype.hasTag = function (tag) {
  return this.tags.includes(tag);
};`,
      why: 'Methods on the prototype are shared on purpose; state on the prototype is shared by accident. The same bug appears as <code>static tags = []</code> in a class or a module-level array behind a factory.'
    }
  ]
};
