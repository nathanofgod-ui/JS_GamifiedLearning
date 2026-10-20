// Tier 1, lesson 3: Truthiness & Defaults
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'nullish',
  tier: 1,
  n: 3,
  title: 'Truthiness & Defaults',
  blurb: 'OR vs nullish coalescing, optional chaining',
  note: `
<p>Real configuration and API data is full of missing values. JavaScript gives you three operators for it, and they are not interchangeable.</p>
<h4>|| versus ??</h4>
<p><code>a || b</code> returns <code>b</code> whenever <code>a</code> is <em>falsy</em>: <code>0</code>, <code>''</code> and <code>false</code> included. <code>a ?? b</code> returns <code>b</code> only when <code>a</code> is <code>null</code> or <code>undefined</code>. For defaults, <code>??</code> is almost always what you mean.</p>
~~~
const volume = 0;
volume || 50     // 50   (wrong: 0 is a valid volume)
volume ?? 50     // 0
~~~
<h4>Optional chaining</h4>
<p><code>a?.b</code> stops and yields <code>undefined</code> if <code>a</code> is <code>null</code> or <code>undefined</code>. It short-circuits the entire rest of the chain, and works for calls (<code>fn?.()</code>) and indexing (<code>arr?.[0]</code>).</p>
<h4>Destructuring defaults</h4>
<p>A default in <code>const { x = 5 } = obj</code> applies only when the value is <code>undefined</code>. A <code>null</code> slips straight through. If you need both treated as missing, use <code>??</code>.</p>
<h4>Logical assignment</h4>
<p><code>a ??= b</code>, <code>a ||= b</code> and <code>a &amp;&amp;= b</code> assign only when the condition holds, a compact way to lazily initialise a field.</p>`,
  eye: "<code>value || default</code> is the single most common subtle bug in generated code. Check whether <code>0</code>, <code>''</code> or <code>false</code> are legitimate values for that variable.",
  challenges: [
    {
      id: 'nullish-predict',
      type: 'mcq',
      title: 'Which default wins?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const cfg = { retries: 0, name: '' };
console.log(cfg.retries || 3, cfg.retries ?? 3, cfg.name || 'anon', cfg.timeout?.ms);`,
      options: [
        '0 0 anon undefined',
        '3 0 anon undefined',
        '3 3 anon undefined',
        '3 0 anon TypeError'
      ],
      answer: 1,
      explain: "<code>0 || 3</code> is <code>3</code> because 0 is falsy; <code>0 ?? 3</code> keeps the <code>0</code>. The empty string is falsy so <code>||</code> picks <code>'anon'</code>. <code>cfg.timeout</code> is undefined, so <code>?.</code> returns <code>undefined</code> instead of throwing."
    },
    {
      id: 'nullish-port',
      type: 'code',
      title: 'Safe port lookup',
      xp: 35,
      prompt: '<p>Write <code>getPort(config)</code>. It returns <code>config.server.port</code>, or <code>3000</code> when the port is missing. Any part of the path may be missing, and <code>config</code> itself may be <code>undefined</code>. A port of <code>0</code> is valid (the OS picks a free one) and must be kept.</p>',
      starter: `function getPort(config) {
  // your code here
}`,
      hints: [
        'Chain the lookups with <code>?.</code> so a missing parent gives <code>undefined</code> instead of a TypeError.',
        '<code>||</code> would replace a port of 0. Use the operator that only reacts to null and undefined.'
      ],
      tests: `
test('no config at all', () => { eq(getPort(), 3000); eq(getPort(null), 3000); });
test('missing parents', () => { eq(getPort({}), 3000); eq(getPort({ server: null }), 3000); eq(getPort({ server: {} }), 3000); });
test('present value', () => eq(getPort({ server: { port: 8080 } }), 8080));
test('keeps port 0', () => eq(getPort({ server: { port: 0 } }), 0));
test('null port falls back', () => eq(getPort({ server: { port: null } }), 3000));`,
      solution: `function getPort(config) {
  return config?.server?.port ?? 3000;
}`,
      why: '<code>?.</code> removes the crash, <code>??</code> removes the falsy trap. Together they are the modern way to read optional data.'
    },
    {
      id: 'nullish-defaults',
      type: 'code',
      title: 'Options with defaults',
      xp: 40,
      prompt: `<p>Write <code>withDefaults(options)</code> that returns a new object with exactly three keys: <code>retries</code> (default <code>3</code>), <code>verbose</code> (default <code>false</code>) and <code>name</code> (default <code>'anon'</code>).</p>
<p>A value counts as missing only when it is <code>null</code> or <code>undefined</code>. Values like <code>0</code>, <code>false</code> and <code>''</code> must survive. Calling it with no argument must work.</p>`,
      starter: `function withDefaults(options) {
  // your code here
}`,
      hints: [
        'Give the parameter itself a default so <code>withDefaults()</code> does not crash.',
        'Destructuring defaults ignore <code>null</code>, so <code>??</code> per field is the safer tool here.'
      ],
      tests: `
test('empty call', () => eq(withDefaults(), { retries: 3, verbose: false, name: 'anon' }));
test('empty object', () => eq(withDefaults({}), { retries: 3, verbose: false, name: 'anon' }));
test('keeps falsy values', () => eq(withDefaults({ retries: 0, verbose: false, name: '' }), { retries: 0, verbose: false, name: '' }));
test('null counts as missing', () => eq(withDefaults({ retries: null, name: null }), { retries: 3, verbose: false, name: 'anon' }));
test('custom values', () => eq(withDefaults({ retries: 5, verbose: true, name: 'job' }), { retries: 5, verbose: true, name: 'job' }));
test('returns only the three keys', () => eq(Object.keys(withDefaults({ extra: 1 })).sort(), ['name', 'retries', 'verbose']));
test('does not mutate input', () => { const o = { retries: 1 }; withDefaults(o); eq(o, { retries: 1 }); });`,
      solution: `function withDefaults(options = {}) {
  return {
    retries: options.retries ?? 3,
    verbose: options.verbose ?? false,
    name: options.name ?? 'anon',
  };
}`,
      why: 'A parameter default only triggers on <code>undefined</code>, so <code>withDefaults(null)</code> would still crash. If callers can pass <code>null</code>, use <code>options?.retries</code> as well.'
    }
  ]
};
