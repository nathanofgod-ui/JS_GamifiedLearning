// Tier 1, lesson 2: Coercion & Equality
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'coercion',
  tier: 1,
  n: 2,
  title: 'Coercion & Equality',
  blurb: 'What == really does, and when === is not enough',
  note: `
<p>JavaScript converts values implicitly in many places. The conversion rules are small once you see them, and they explain most "wat" moments.</p>
<h4>The rules that matter</h4>
<ul>
<li><code>+</code> with any string operand concatenates. Every other arithmetic operator (<code>-</code>, <code>*</code>, <code>/</code>) converts both sides to numbers.</li>
<li><code>==</code> runs the abstract equality algorithm and coerces types. <code>===</code> never coerces.</li>
<li><code>null == undefined</code> is true, and neither equals anything else under <code>==</code>.</li>
<li>Objects become primitives through <code>valueOf</code> / <code>toString</code>, so <code>[] == false</code> is <code>true</code>.</li>
</ul>
~~~
'5' + 2        // '52'
'5' - 2        // 3
null == 0      // false
null >= 0      // true (relational operators coerce differently!)
[] == false    // true
NaN === NaN    // false
Object.is(NaN, NaN)   // true
Object.is(0, -0)      // false
~~~
<h4>Falsy values</h4>
<p>Exactly eight: <code>false</code>, <code>0</code>, <code>-0</code>, <code>0n</code>, <code>''</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. Everything else is truthy, including <code>'0'</code>, <code>[]</code> and <code>{}</code>.</p>
<h4>Converting on purpose</h4>
<p>Prefer explicit conversion: <code>Number(x)</code>, <code>String(x)</code>, <code>Boolean(x)</code>. Be careful: <code>Number('')</code> and <code>Number([])</code> are both <code>0</code>, and <code>parseInt('12px')</code> is <code>12</code> while <code>Number('12px')</code> is <code>NaN</code>.</p>`,
  eye: 'Every <code>==</code> in generated code deserves a second look. So does <code>if (value)</code> used as a number check: it rejects a valid <code>0</code>.',
  challenges: [
    {
      id: 'coerce-predict',
      type: 'mcq',
      title: 'Predict the coercion',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: "console.log('5' + 2, '5' - 2, [] == false, null == 0);",
      options: ['7 3 false false', '52 3 true false', '52 3 true true', '7 3 true false'],
      answer: 1,
      explain: "<code>+</code> sees a string and concatenates (<code>'52'</code>); <code>-</code> converts to numbers (<code>3</code>). <code>[]</code> becomes <code>''</code> then <code>0</code>, which equals <code>false</code> as <code>0</code>. And <code>null == 0</code> is false: under <code>==</code>, null only equals undefined."
    },
    {
      id: 'coerce-numeric',
      type: 'code',
      title: 'Is it really a number?',
      xp: 40,
      prompt: `<p>Write <code>isNumeric(v)</code> for validating input fields. It returns <code>true</code> for finite numbers and for strings that represent a finite number (surrounding whitespace is fine), and <code>false</code> for everything else.</p>
~~~
isNumeric(42)        // true
isNumeric(' 42 ')    // true
isNumeric('1e3')     // true
isNumeric('')        // false
isNumeric('12px')    // false
isNumeric([])        // false  (careful!)
isNumeric(Infinity)  // false
~~~`,
      starter: `function isNumeric(v) {
  // your code here
}`,
      hints: [
        "<code>Number(x)</code> does most of the work, but it also turns <code>''</code>, <code>'  '</code>, <code>[]</code>, <code>null</code> and <code>true</code> into numbers.",
        'Reject anything that is not a number or a string before you call <code>Number</code> at all.',
        'For strings, reject empty or whitespace-only ones with <code>trim()</code>, then check <code>Number.isFinite(Number(v))</code>.'
      ],
      tests: `
test('finite numbers', () => { eq(isNumeric(42), true); eq(isNumeric(0), true); eq(isNumeric(-3.5), true); });
test('numeric strings', () => { eq(isNumeric('42'), true); eq(isNumeric(' 42 '), true); eq(isNumeric('-3.5'), true); eq(isNumeric('1e3'), true); eq(isNumeric('0'), true); });
test('NaN and Infinity', () => { eq(isNumeric(NaN), false); eq(isNumeric(Infinity), false); eq(isNumeric('Infinity'), false); });
test('empty and blank strings', () => { eq(isNumeric(''), false); eq(isNumeric('   '), false); });
test('text', () => { eq(isNumeric('abc'), false); eq(isNumeric('12px'), false); });
test('null and undefined', () => { eq(isNumeric(null), false); eq(isNumeric(undefined), false); });
test('booleans', () => { eq(isNumeric(true), false); eq(isNumeric(false), false); });
test('arrays and objects', () => { eq(isNumeric([]), false); eq(isNumeric([5]), false); eq(isNumeric({}), false); });`,
      solution: `function isNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'string') return false;
  if (v.trim() === '') return false;
  return Number.isFinite(Number(v));
}`,
      why: 'Coercion is a tool for the last step only. Filtering by <code>typeof</code> first keeps <code>[]</code>, <code>null</code> and <code>true</code> out, and the blank-string check covers the one string that <code>Number</code> converts to <code>0</code>.'
    },
    {
      id: 'coerce-same',
      type: 'code',
      title: 'Reimplement Object.is',
      xp: 45,
      prompt: `<p>Write <code>sameValue(a, b)</code> that behaves like <code>Object.is</code> <b>without calling it</b>. It differs from <code>===</code> in exactly two cases:</p>
<ul><li><code>NaN</code> is the same as <code>NaN</code></li><li><code>0</code> and <code>-0</code> are <em>not</em> the same</li></ul>`,
      starter: `function sameValue(a, b) {
  // your code here
}`,
      hints: [
        'NaN is the only value where <code>x !== x</code>. Use that to detect it.',
        '<code>0 === -0</code> is true, but <code>1 / 0</code> is <code>Infinity</code> and <code>1 / -0</code> is <code>-Infinity</code>.',
        'Handle the NaN case, then the zero case with the division trick, then fall back to <code>===</code>.'
      ],
      tests: `
test('does not use Object.is', () => assert(!/Object\\s*\\.\\s*is/.test(String(sameValue)), 'Write the logic yourself'));
test('NaN is NaN', () => eq(sameValue(NaN, NaN), true));
test('0 and -0 differ', () => { eq(sameValue(0, -0), false); eq(sameValue(-0, 0), false); });
test('same zeros', () => { eq(sameValue(0, 0), true); eq(sameValue(-0, -0), true); });
test('ordinary values', () => { eq(sameValue(1, 1), true); eq(sameValue('a', 'a'), true); eq(sameValue(1, 2), false); eq(sameValue(1, '1'), false); });
test('null vs undefined', () => eq(sameValue(null, undefined), false));
test('objects compare by identity', () => { const o = {}; eq(sameValue(o, o), true); eq(sameValue({}, {}), false); });`,
      solution: `function sameValue(a, b) {
  if (a !== a && b !== b) return true;            // both NaN
  if (a === 0 && b === 0) return 1 / a === 1 / b; // tell 0 from -0
  return a === b;
}`,
      why: '<code>1 / 0</code> is <code>Infinity</code> and <code>1 / -0</code> is <code>-Infinity</code>, which is the classic way to observe the sign of zero. Everything else is already correct under <code>===</code>.'
    },
    {
      id: 'coerce-review',
      type: 'review',
      title: 'AI review: parseQuantity',
      xp: 45,
      context: '<p>You asked an assistant for a function that reads the quantity field of an order form. It wrote two lines and said it handles all the edge cases.</p>',
      prompt: "<p><b>The spec:</b> <code>parseQuantity(input)</code> receives a number or a string from a form field. It returns a whole number that is 0 or more, or <code>null</code> when the input isn't one: empty or blank, negative, fractional, text like <code>'12px'</code>, or anything that is not a number or string. Surrounding whitespace is fine.</p>",
      code: `function parseQuantity(input) {
  const n = parseInt(input);
  return n || null;
}`,
      question: 'What is the real problem here?',
      options: [
        'parseInt needs a radix, otherwise "08" is read as octal',
        'A valid 0 becomes null because || treats it as missing, and parseInt quietly accepts "12px" and "3.7"',
        'parseInt throws a TypeError when the input is already a number',
        'Replacing || with ?? would make it meet the spec'
      ],
      answer: 1,
      diagnosis: `<code>||</code> falls back on any falsy value, and <code>0</code> is falsy: ordering zero items becomes "invalid". <code>parseInt</code> reads digits until it hits something else, so <code>'12px'</code> is 12 and <code>'3.7'</code> is 3. Modern <code>parseInt</code> is base 10 by default, and <code>??</code> alone would still accept <code>'12px'</code>, <code>-2</code> and <code>NaN</code>.`,
      hints: [
        'Check the type first: only numbers and strings can be quantities.',
        "<code>Number('12px')</code> is <code>NaN</code>, unlike <code>parseInt</code>. But <code>Number('')</code> is 0, so treat blank strings yourself. Then <code>Number.isInteger(n) &amp;&amp; n &gt;= 0</code>."
      ],
      tests: `
test('numbers and numeric strings', () => { eq(parseQuantity(3), 3); eq(parseQuantity('42'), 42); eq(parseQuantity(' 7 '), 7); });
test('zero is a valid quantity', () => { eq(parseQuantity(0), 0); eq(parseQuantity('0'), 0); });
test('trailing junk is rejected', () => { eq(parseQuantity('12px'), null); eq(parseQuantity('3 apples'), null); });
test('fractions are rejected', () => { eq(parseQuantity('3.7'), null); eq(parseQuantity(2.5), null); });
test('negatives are rejected', () => { eq(parseQuantity(-2), null); eq(parseQuantity('-1'), null); });
test('empty and blank are rejected', () => { eq(parseQuantity(''), null); eq(parseQuantity('   '), null); });
test('non-numbers are rejected', () => { eq(parseQuantity(null), null); eq(parseQuantity(undefined), null); eq(parseQuantity([]), null); eq(parseQuantity(true), null); eq(parseQuantity(NaN), null); eq(parseQuantity(Infinity), null); });`,
      solution: `function parseQuantity(input) {
  if (typeof input === 'string') {
    input = input.trim();
    if (input === '') return null;        // Number('') would be 0
  } else if (typeof input !== 'number') {
    return null;                          // [] and true would coerce to numbers
  }
  const n = Number(input);
  return Number.isInteger(n) && n >= 0 ? n : null;
}`,
      why: 'Validation is easier to get right as a whitelist: decide which types are acceptable, convert explicitly, then check the exact property you need. <code>Number.isInteger</code> rejects <code>NaN</code>, <code>Infinity</code> and fractions in one go.'
    }
  ]
};
