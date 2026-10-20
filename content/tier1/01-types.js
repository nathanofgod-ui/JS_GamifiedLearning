// Tier 1, lesson 1: Values & Types
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'types',
  tier: 1,
  n: 1,
  title: 'Values & Types',
  blurb: 'Primitives, references, typeof and its blind spots',
  note: `
<p>JavaScript has seven <b>primitive</b> types: <code>string</code>, <code>number</code>, <code>bigint</code>, <code>boolean</code>, <code>undefined</code>, <code>null</code> and <code>symbol</code>. Everything else is an <b>object</b>: arrays, functions, dates, maps, class instances and plain <code>{}</code> records.</p>
<h4>Value vs reference</h4>
<p>Primitives are immutable and compared by value. Objects are compared by identity: two objects are equal only when they are the very same object in memory. Assigning or passing an object copies the <em>reference</em>, never the object.</p>
~~~
const a = { n: 1 };
const b = a;              // same object, two names
b.n = 2;
console.log(a.n);         // 2
console.log({} === {});   // false: two different objects
~~~
<h4>typeof and its blind spots</h4>
<ul>
<li><code>typeof null</code> is <code>'object'</code>. A bug from the first version of the language that can never be fixed without breaking the web.</li>
<li><code>typeof []</code> is also <code>'object'</code>. Use <code>Array.isArray</code> for arrays.</li>
<li><code>typeof</code> a function is <code>'function'</code>, even though functions are objects.</li>
<li><code>typeof</code> an undeclared variable is <code>'undefined'</code>. It does not throw.</li>
</ul>
<h4>Numbers are doubles</h4>
<p>Every <code>number</code> is a 64-bit IEEE-754 float. That is why <code>0.1 + 0.2 !== 0.3</code>, why integers are exact only up to <code>Number.MAX_SAFE_INTEGER</code> (2<sup>53</sup> &minus; 1), and why <code>bigint</code> exists. <code>NaN</code> is a number, and the only value that is not equal to itself.</p>`,
  eye: "When generated code says <code>typeof x === 'object'</code>, ask two questions: what happens for <code>null</code>, and what happens for arrays?",
  challenges: [
    {
      id: 'types-predict',
      type: 'mcq',
      title: 'Predict the typeof',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: 'console.log(typeof null, typeof [], typeof (() => {}), typeof NaN);',
      options: [
        'null object function number',
        'object object function number',
        'object array function NaN',
        'null array function number'
      ],
      answer: 1,
      explain: "<code>null</code> reports <code>'object'</code> (historic bug), arrays are objects, functions get their own <code>'function'</code> answer, and <code>NaN</code> is a <code>number</code>. There is no <code>'array'</code> or <code>'null'</code> result from <code>typeof</code>."
    },
    {
      id: 'types-typeof',
      type: 'code',
      title: 'Build a better typeof',
      xp: 40,
      prompt: `<p>Write <code>typeOf(value)</code> that returns a lowercase type name and tells the cases <code>typeof</code> cannot apart:</p>
<ul><li><code>'null'</code>, <code>'array'</code>, <code>'date'</code>, <code>'regexp'</code>, <code>'map'</code>, <code>'set'</code> for those values</li><li>the usual <code>typeof</code> answer for everything else (<code>'number'</code>, <code>'string'</code>, <code>'object'</code>, <code>'function'</code>, and so on)</li></ul>`,
      starter: `function typeOf(value) {
  // your code here
}`,
      hints: [
        '<code>typeof</code> alone cannot separate null or arrays from plain objects. Look at <code>Object.prototype.toString.call(x)</code>.',
        "It returns strings like <code>'[object Array]'</code>. You only need the word inside the brackets.",
        'Slice off the first 8 characters and the final <code>]</code>, then lowercase what is left.'
      ],
      tests: `
test('primitives', () => {
  eq(typeOf('hi'), 'string'); eq(typeOf(3), 'number'); eq(typeOf(true), 'boolean');
  eq(typeOf(undefined), 'undefined'); eq(typeOf(10n), 'bigint'); eq(typeOf(Symbol('s')), 'symbol');
});
test('NaN is still a number', () => eq(typeOf(NaN), 'number'));
test('null', () => eq(typeOf(null), 'null'));
test('arrays', () => { eq(typeOf([]), 'array'); eq(typeOf([1, 2]), 'array'); });
test('plain objects', () => eq(typeOf({}), 'object'));
test('functions', () => { eq(typeOf(function () {}), 'function'); eq(typeOf(() => 1), 'function'); });
test('date, regexp, map, set', () => {
  eq(typeOf(new Date()), 'date'); eq(typeOf(/x/), 'regexp');
  eq(typeOf(new Map()), 'map'); eq(typeOf(new Set()), 'set');
});`,
      solution: `function typeOf(value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}`,
      why: 'Every built-in carries an internal tag that <code>Object.prototype.toString</code> exposes as <code>[object Tag]</code>. That is how libraries tell arrays and dates apart reliably.'
    },
    {
      id: 'types-refs',
      type: 'mcq',
      title: 'Copy or reference?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const a = { n: 1 };
const b = a;
b.n = 2;

let x = 1;
let y = x;
y = 2;

console.log(a.n, x);`,
      options: ['1 1', '2 1', '2 2', '1 2'],
      answer: 1,
      explain: '<code>b</code> holds the same reference as <code>a</code>, so mutating through <code>b</code> changes what <code>a</code> sees. <code>y = x</code> copied a primitive value, so reassigning <code>y</code> leaves <code>x</code> alone.'
    }
  ]
};
