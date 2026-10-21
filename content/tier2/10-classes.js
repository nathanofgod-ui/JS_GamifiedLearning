// Tier 2, lesson 10: Classes Under the Hood
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'classes',
  tier: 2,
  n: 10,
  title: 'Classes Under the Hood',
  blurb: 'Fields vs methods, #private, static, super',
  note: `
<p><code>class</code> is mostly new syntax for the prototype machinery from the last lesson, plus a few things the old syntax could not do. Knowing which parts are sugar and which are new is what lets you read generated class code critically.</p>
<h4>The sugar</h4>
<ul>
<li><code>typeof SomeClass</code> is <code>'function'</code>. Methods are stored on <code>SomeClass.prototype</code>, just like hand-written <code>F.prototype.method = ...</code>, except they are non-enumerable.</li>
<li><code>extends</code> links two chains: <code>B.prototype</code> inherits from <code>A.prototype</code> (instance methods), and <code>B</code> itself inherits from <code>A</code> (static members).</li>
</ul>
<h4>What is genuinely different</h4>
<ul>
<li>Class bodies are always strict mode. Calling a class without <code>new</code> throws.</li>
<li>Class declarations are hoisted into the temporal dead zone, like <code>let</code>.</li>
<li>In a derived class, <code>this</code> does not exist until <code>super()</code> returns. The <b>parent</b> creates the object.</li>
</ul>
<h4>Fields are per instance</h4>
<p>A field like <code>count = 0</code> or <code>onClick = () =&gt; {}</code> is an <b>own property</b> created on each instance at construction time (in a derived class, right after <code>super()</code> returns). A method is one function on the prototype.</p>
~~~
class Btn {
  label = 'ok';                 // own property, per instance
  onClick = () => this.label;   // a new function per instance, this fixed forever
  render() { return this.label; }   // one function on Btn.prototype
}
~~~
<p>Arrow-function fields are the standard fix for callbacks losing <code>this</code>. The cost: one closure per instance, and the function is not on the prototype, so subclasses cannot call it with <code>super.onClick()</code> and tests cannot stub it on the prototype.</p>
<h4>Real privacy: #fields</h4>
<p><code>#title</code> is private to the class body. It does not show up in <code>Object.keys</code>, <code>JSON.stringify</code> or the console's property list, and reading <code>obj.#title</code> on an object that was not constructed by the class throws a <code>TypeError</code>. That makes it a <b>brand check</b>: <code>#title in obj</code> tells you whether <code>obj</code> is a real instance. An <code>_title</code> underscore is only a convention that anyone can overwrite.</p>
<h4>Accessors and static</h4>
<ul>
<li><code>get</code>/<code>set</code> pairs live on the prototype and are where validation goes. If the constructor assigns through the setter (<code>this.title = title</code>), construction is validated too.</li>
<li>In a <code>static</code> method, <code>this</code> is whichever class the method was called on. So <code>static create() { return new this(); }</code> builds a subclass instance when called as <code>SubClass.create()</code>.</li>
<li><code>toJSON()</code> controls what <code>JSON.stringify</code> sees, which matters as soon as state is private.</li>
</ul>`,
  eye: 'Watch for methods passed as callbacks (<code>this</code> lost), <code>.bind(this)</code> inside <code>addEventListener</code> (a new function every time, so <code>removeEventListener</code> can never match it), arrow fields where an override is expected, and "private" state kept in <code>_underscore</code> fields.',
  challenges: [
    {
      id: 'class-fields',
      type: 'mcq',
      title: 'Method or field?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `class Btn {
  label = 'ok';
  onClick = () => this.label;
  render() { return this.label; }
}

const a = new Btn(), b = new Btn();
console.log(a.onClick === b.onClick, a.render === b.render, Object.keys(a).join(','));`,
      options: [
        'true true label',
        'false true label,onClick',
        'true false label,onClick,render',
        'false false label,onClick'
      ],
      answer: 1,
      explain: 'Each instance gets its own <code>onClick</code> arrow (an own, enumerable property), so the two are different functions. <code>render</code> is a single function on <code>Btn.prototype</code>, shared and non-enumerable.'
    },
    {
      id: 'class-static',
      type: 'mcq',
      title: 'Who is this in a static?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `class Model {
  static create() { return new this(); }
  kind() { return 'model'; }
}

class Card extends Model {
  kind() { return 'card:' + super.kind(); }
}

const c = Card.create();
console.log(c instanceof Card, c.kind(), Object.getPrototypeOf(Card) === Model);`,
      options: [
        'false model true',
        'true card:model true',
        'true card:model false',
        'TypeError: this is not a constructor'
      ],
      answer: 1,
      explain: "<code>Card.create()</code> runs the inherited static with <code>this === Card</code>, so it builds a <code>Card</code>. <code>super.kind()</code> calls the parent method with the same <code>this</code>. And <code>extends</code> links the constructors themselves: <code>Card</code>'s prototype is <code>Model</code>, which is how statics are inherited."
    },
    {
      id: 'class-card',
      type: 'code',
      title: 'A Card class with real privacy',
      xp: 55,
      prompt: `<p>Write a <code>Card</code> class:</p>
<ul>
<li><code>new Card({ id, title, priority = 'low' })</code>. <code>id</code> is a normal public field; <code>title</code> and <code>priority</code> are stored in <code>#private</code> fields.</li>
<li><code>title</code> getter/setter: the value must be a string with at least one non-space character, stored trimmed, otherwise throw <code>TypeError</code>.</li>
<li><code>priority</code> getter/setter: <code>'low'</code> or <code>'high'</code>, otherwise throw <code>RangeError</code>.</li>
<li>The constructor validates through the setters.</li>
<li><code>toggle()</code> flips the priority and returns <code>this</code>.</li>
<li><code>toJSON()</code> returns <code>{ id, title, priority }</code>.</li>
<li><code>static from(obj)</code> builds an instance of whichever class it is called on.</li>
<li><code>static count</code> counts how many cards have been constructed.</li>
</ul>`,
      starter: `class Card {
  // your code here
}`,
      hints: [
        'Declare <code>#title;</code> and <code>#priority;</code> in the class body, then write <code>get title()</code> / <code>set title(value)</code> pairs that read and write them.',
        'In the constructor, assign <code>this.title = title</code> (not <code>this.#title</code>) so the setter validates.',
        '<code>static from(obj) { return new this(obj); }</code> respects subclasses. <code>static count = 0;</code> and <code>Card.count++</code> in the constructor.'
      ],
      tests: `
test('constructs with defaults', () => { const c = new Card({ id: 1, title: 'Write tests' }); eq([c.id, c.title, c.priority], [1, 'Write tests', 'low']); });
test('only id is a visible own property', () => eq(Object.keys(new Card({ id: 1, title: 'x' })), ['id']));
test('title is trimmed and validated', () => {
  const c = new Card({ id: 1, title: '  Hi  ' }); eq(c.title, 'Hi');
  assert(throws(() => { c.title = '   '; }) instanceof TypeError, 'a blank title should throw TypeError');
  assert(throws(() => { c.title = 42; }) instanceof TypeError, 'a non-string title should throw TypeError');
  eq(c.title, 'Hi');
});
test('constructor validates too', () => {
  assert(throws(() => new Card({ id: 1, title: '' })) instanceof TypeError, 'empty title');
  assert(throws(() => new Card({ id: 1, title: 'x', priority: 'urgent' })) instanceof RangeError, 'bad priority');
});
test('priority is validated', () => { const c = new Card({ id: 1, title: 'x' }); c.priority = 'high'; eq(c.priority, 'high'); assert(throws(() => { c.priority = 'HIGH'; }) instanceof RangeError, 'should throw RangeError'); });
test('toggle flips and chains', () => { const c = new Card({ id: 1, title: 'x' }); assert(c.toggle() === c, 'toggle should return this'); eq(c.priority, 'high'); eq(c.toggle().priority, 'low'); });
test('serialises with JSON.stringify', () => eq(JSON.parse(JSON.stringify(new Card({ id: 7, title: 'x', priority: 'high' }))), { id: 7, title: 'x', priority: 'high' }));
test('a fake card cannot read the private state', () => { const fake = Object.create(Card.prototype); assert(throws(() => fake.title) instanceof TypeError, 'reading title on a non-Card should throw TypeError'); });
test('Card.from respects subclasses', () => { class Epic extends Card {} const e = Epic.from({ id: 2, title: 'Big' }); assert(e instanceof Epic, 'should be an Epic'); eq(e.title, 'Big'); });
test('Card.count counts constructions', () => { const before = Card.count; new Card({ id: 1, title: 'a' }); Card.from({ id: 2, title: 'b' }); eq(Card.count - before, 2); });
test('methods live on the prototype', () => { const a = new Card({ id: 1, title: 'a' }); assert(!Object.hasOwn(a, 'toggle') && typeof Card.prototype.toggle === 'function', 'toggle should be a prototype method'); });`,
      solution: `class Card {
  static count = 0;
  id;
  #title;
  #priority;

  constructor({ id, title, priority = 'low' }) {
    this.id = id;
    this.title = title;          // runs the setter
    this.priority = priority;
    Card.count++;
  }

  get title() { return this.#title; }
  set title(value) {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError('title must be a non-empty string');
    this.#title = value.trim();
  }

  get priority() { return this.#priority; }
  set priority(value) {
    if (value !== 'low' && value !== 'high') throw new RangeError('priority must be "low" or "high"');
    this.#priority = value;
  }

  toggle() {
    this.priority = this.priority === 'high' ? 'low' : 'high';
    return this;
  }

  toJSON() {
    return { id: this.id, title: this.title, priority: this.priority };
  }

  static from(obj) {
    return new this(obj);
  }
}`,
      why: 'Private fields make invalid states unreachable: the only way to change <code>#title</code> is through the setter, and the brand check means a look-alike object cannot borrow the methods. <code>new this()</code> in a static method is what lets factories work for subclasses.'
    },
    {
      id: 'class-review',
      type: 'review',
      title: 'AI review: the lost this',
      xp: 50,
      context: "<p>You asked an assistant for a <code>Counter</code> that can attach itself to a button's click event and detach again later.</p>",
      prompt: "<p><b>The spec:</b> <code>attach(button)</code> makes every click increment that counter's <code>count</code>. <code>detach(button)</code> removes the listener. <code>increment()</code> also works when called directly. Like the real DOM, the test button ignores a second <code>addEventListener</code> with the very same function, and <code>removeEventListener</code> only removes the very same function.</p>",
      code: `class Counter {
  count = 0;

  increment() {
    this.count++;
  }

  attach(button) {
    button.addEventListener('click', this.increment);
  }

  detach(button) {
    button.removeEventListener('click', this.increment.bind(this));
  }
}`,
      question: 'What is wrong with this code?',
      options: [
        'count = 0 needs to move into a constructor because fields are not created on instances',
        'this.increment is passed unbound, so this is the button; and detach removes a brand-new bound function that was never added',
        'The listener leaks unless it is registered with { once: true }',
        'increment should be static so that all counters can share it'
      ],
      answer: 1,
      diagnosis: 'When the button calls the handler, <code>this</code> is the button, so <code>this.count++</code> quietly writes <code>NaN</code> onto the button. And every <code>.bind(this)</code> creates a new function, so <code>removeEventListener</code> is asked to remove something that was never registered. Both bugs need one stable, bound function per instance.',
      hints: [
        'You need a single function per counter that always has the right <code>this</code>, and the same function must be used in attach and detach.',
        'An arrow-function field (<code>increment = () =&gt; { ... }</code>) or binding once in the constructor both work.'
      ],
      tests: `
function fakeButton() {
  const handlers = new Set();   // like the DOM, adding the same function twice is a no-op
  return {
    addEventListener(type, fn) { if (type === 'click') handlers.add(fn); },
    removeEventListener(type, fn) { if (type === 'click') handlers.delete(fn); },
    click() { for (const fn of [...handlers]) fn.call(this, { type: 'click' }); },
    get size() { return handlers.size; }
  };
}
test('a click increments the counter', () => { const c = new Counter(); const b = fakeButton(); c.attach(b); b.click(); b.click(); eq(c.count, 2); });
test('detach removes the listener', () => { const c = new Counter(); const b = fakeButton(); c.attach(b); b.click(); c.detach(b); b.click(); eq(c.count, 1); eq(b.size, 0); });
test('attaching twice does not double count', () => { const c = new Counter(); const b = fakeButton(); c.attach(b); c.attach(b); b.click(); eq(c.count, 1); });
test('two counters on one button stay independent', () => { const a = new Counter(); const z = new Counter(); const b = fakeButton(); a.attach(b); z.attach(b); b.click(); a.detach(b); b.click(); eq([a.count, z.count], [1, 2]); });
test('increment works when called directly', () => { const c = new Counter(); c.increment(); c.increment(); eq(c.count, 2); });`,
      solution: `class Counter {
  count = 0;

  // one function per instance, with this fixed to the instance
  increment = () => {
    this.count++;
  };

  attach(button) {
    button.addEventListener('click', this.increment);
  }

  detach(button) {
    button.removeEventListener('click', this.increment);
  }
}`,
      why: "The listener's identity matters as much as its <code>this</code>. An arrow field gives each instance one stable function, which both fixes <code>this</code> and makes removal possible. Binding in the constructor (<code>this.increment = this.increment.bind(this)</code>) does the same while keeping the method on the prototype."
    }
  ]
};
