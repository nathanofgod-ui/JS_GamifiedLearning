// Tier 2, lesson 13: Hash Routing
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'router',
  tier: 2,
  n: 13,
  title: 'Hash Routing',
  blurb: 'URLs as state: match, rank, parse, build links',
  note: `
<p>A router is a function from a URL to "which view, with which parameters". Single-page apps need one so that the back button, bookmarks and shared links work. LWC's navigation service did this for you; here you build it.</p>
<h4>URL anatomy</h4>
~~~
const u = new URL('https://forge.dev/app?mode=dark#/board/7?tab=activity');
u.pathname   // '/app'
u.search     // '?mode=dark'
u.hash       // '#/board/7?tab=activity'
~~~
<p>Everything after <code>#</code> is the <b>fragment</b>. It is never sent to the server, changing it never reloads the page, and every change adds a history entry and fires <code>hashchange</code>. That makes it the zero-config way to route a static app. A <code>?</code> inside the hash is just part of the hash; you parse it yourself.</p>
<p>The alternative is the History API: <code>history.pushState</code> plus the <code>popstate</code> event gives clean paths, but the server must answer every path with your app's HTML. Same router logic, different source of URLs.</p>
<h4>Matching</h4>
<ul>
<li>Normalise: strip the <code>#</code>, split off the query, drop leading and trailing slashes, split on <code>/</code>.</li>
<li>Compare segment by segment: static text must match exactly, <code>:param</code> captures one non-empty segment, a final <code>*</code> captures the rest.</li>
<li><b>Decode</b> captured values with <code>decodeURIComponent</code>, and treat malformed escapes (<code>%E0%A4%A</code>) as "no match" rather than a crash.</li>
</ul>
<h4>Ranking</h4>
<p>Several routes can match the same URL: <code>/board/new</code> matches both <code>/board/new</code> and <code>/board/:id</code>. Depending on declaration order is fragile. Rank instead: walk the segments left to right, static beats param beats splat; prefer routes without a splat; break remaining ties by order.</p>
<h4>Queries and links</h4>
<p><code>URLSearchParams</code> parses <code>?a=1&amp;b=two%20words</code>, turns <code>+</code> into a space, and keeps repeated keys (<code>getAll</code>). Going the other way, build links from route names (<code>href('card', { id: 7 })</code>) instead of concatenating strings around the app; then a route's path lives in exactly one place, and every parameter gets <code>encodeURIComponent</code>. <code>encodeURI</code> is for whole URLs and leaves <code>/</code>, <code>?</code> and <code>#</code> alone, which is exactly wrong for a single segment.</p>
~~~
window.addEventListener('hashchange', () => {
  const match = router.resolve(location.hash);
  render(match ?? { name: 'notFound', params: {}, query: {} });
});
~~~`,
  eye: `Regex-based routers in generated code often forget <code>^</code> and <code>$</code> (so <code>/board/:id</code> also matches <code>/archive/board/7/edit</code>), don't escape <code>.</code>, and never decode params. Also check that unknown routes lead to a "not found" view instead of an exception, and that links are built with <code>encodeURIComponent</code>.`,
  challenges: [
    {
      id: 'rt-url',
      type: 'mcq',
      title: 'Where does the query live?',
      xp: 15,
      prompt: '<p>What does this print?</p>',
      code: `const u = new URL('https://forge.dev/app?mode=dark#/board/7?tab=activity');
console.log(u.search, '|', u.hash, '|', new URLSearchParams(u.search).get('tab'));`,
      options: [
        '?tab=activity | #/board/7 | activity',
        '?mode=dark | #/board/7?tab=activity | null',
        '?mode=dark&tab=activity | #/board/7 | activity',
        '?mode=dark | #/board/7 | activity'
      ],
      answer: 1,
      explain: "The URL's own query ends at the <code>#</code>. Everything after it, including <code>?tab=activity</code>, is the fragment. A hash router has to split its own query out of <code>location.hash</code>; <code>location.search</code> will never see it."
    },
    {
      id: 'rt-match',
      type: 'code',
      title: 'matchRoute',
      xp: 50,
      prompt: `<p>Write <code>matchRoute(pattern, path)</code>. It returns an object of parameters when <code>path</code> matches <code>pattern</code>, otherwise <code>null</code>.</p>
<ul>
<li>Leading and trailing slashes are ignored (<code>'/'</code>, <code>''</code> and <code>'/board/'</code> are fine).</li>
<li>Static segments match exactly. <code>:name</code> matches one <b>non-empty</b> segment. The segment counts must agree.</li>
<li>A final <code>*</code> matches the rest of the path (possibly nothing) and is returned as <code>params['*']</code>, joined with <code>/</code>.</li>
<li>Captured values are decoded with <code>decodeURIComponent</code>. Malformed encoding means no match.</li>
<li>Return a new object every time; a match without params is <code>{}</code>.</li>
</ul>
~~~
matchRoute('/board/:id/card/:cardId', '/board/7/card/42');   // { id: '7', cardId: '42' }
matchRoute('/files/*', '/files/a/b%20c.txt');                 // { '*': 'a/b c.txt' }
matchRoute('/board/:id', '/board');                           // null
~~~`,
      starter: `function matchRoute(pattern, path) {
  // your code here
}`,
      hints: [
        "Write a small helper that trims slashes from both ends and splits; an empty result should be <code>[]</code>, not <code>['']</code>.",
        "Loop over the pattern's segments. Handle <code>*</code> first (it ends the loop), then <code>:param</code>, then static text.",
        '<code>decodeURIComponent</code> throws a <code>URIError</code> on bad input. Catch it and return <code>null</code>.'
      ],
      tests: `
test('static routes', () => { eq(matchRoute('/board', '/board'), {}); eq(matchRoute('/board', '/boards'), null); });
test('params', () => eq(matchRoute('/board/:id/card/:cardId', '/board/7/card/42'), { id: '7', cardId: '42' }));
test('segment counts must match', () => { eq(matchRoute('/board/:id', '/board'), null); eq(matchRoute('/board/:id', '/board/7/extra'), null); });
test('params never match an empty segment', () => eq(matchRoute('/board/:id/card', '/board//card'), null));
test('trailing slashes are ignored', () => { eq(matchRoute('/board/:id', '/board/7/'), { id: '7' }); eq(matchRoute('/board/', '/board'), {}); });
test('root', () => { eq(matchRoute('/', '/'), {}); eq(matchRoute('/', ''), {}); eq(matchRoute('/', '/x'), null); });
test('params are decoded', () => eq(matchRoute('/tag/:name', '/tag/needs%20review'), { name: 'needs review' }));
test('malformed encoding does not match', () => eq(matchRoute('/tag/:name', '/tag/%E0%A4%A'), null));
test('static segments are literal', () => { eq(matchRoute('/file.json', '/fileXjson'), null); eq(matchRoute('/a+b', '/a+b'), {}); });
test('splat matches the rest', () => { eq(matchRoute('/files/*', '/files/a/b%20c.txt'), { '*': 'a/b c.txt' }); eq(matchRoute('/files/*', '/files'), { '*': '' }); });
test('returns a fresh object each time', () => { const a = matchRoute('/x', '/x'); const b = matchRoute('/x', '/x'); assert(a !== b, 'do not share a result object'); });`,
      solution: `function matchRoute(pattern, path) {
  const segments = s => {
    const trimmed = s.replace(/^\\/+|\\/+$/g, '');
    return trimmed === '' ? [] : trimmed.split('/');
  };
  const pat = segments(pattern);
  const parts = segments(path);
  const params = {};

  try {
    for (let i = 0; i < pat.length; i++) {
      const seg = pat[i];
      if (seg === '*' && i === pat.length - 1) {
        params['*'] = parts.slice(i).map(p => decodeURIComponent(p)).join('/');
        return params;
      }
      if (i >= parts.length) return null;
      if (seg.startsWith(':')) {
        if (parts[i] === '') return null;
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
      } else if (seg !== parts[i]) {
        return null;
      }
    }
  } catch (e) {
    return null;            // URIError from a malformed escape
  }
  return parts.length === pat.length ? params : null;
}`,
      why: 'Comparing segments instead of building a regex means static text can never be misread as regex syntax, and every rule (empty segments, splats, decoding) is one readable line. The <code>try</code> turns a malformed URL into a "not found", which is what a user typing in the address bar deserves.'
    },
    {
      id: 'rt-router',
      type: 'code',
      title: 'Board piece: createRouter',
      xp: 75,
      capstone: true,
      prompt: `<p>Write <code>createRouter(routes)</code>, where <code>routes</code> is an array of <code>{ name, path }</code>. It returns <code>{ resolve, href }</code>:</p>
<ul>
<li><code>resolve(url)</code> accepts <code>'#/board/7?tab=a'</code> or <code>'/board/7'</code>; an empty url or <code>'#'</code> means <code>'/'</code>. It returns <code>{ name, params, query }</code> or <code>null</code>. <code>query</code> is a plain object; for repeated keys the last value wins.</li>
<li>When several routes match, compare them segment by segment from the left: static beats <code>:param</code>, which beats <code>*</code>. If all compared segments tie, a route without <code>*</code> wins. If it is still a tie, the earlier route wins.</li>
<li><code>href(name, params = {})</code> builds <code>'#/...'</code>, encoding each parameter with <code>encodeURIComponent</code>. A <code>*</code> value is encoded segment by segment, keeping its slashes. Unknown route names throw, and a missing parameter throws an error that names it.</li>
</ul>
<p>Paste in your <code>matchRoute</code> from the last challenge (or write it again: good practice).</p>
<p class="muted">Your Board's address bar, card links and filters will run on this router.</p>`,
      starter: `function createRouter(routes) {
  // your code here
}`,
      hints: [
        `Precompute each route's segment kinds once: 0 for static, 1 for <code>:param</code>, 2 for <code>*</code>. "Better" is then a small comparison function.`,
        'In <code>resolve</code>, strip one leading <code>#</code>, split on the first <code>?</code>, and use <code>Object.fromEntries(new URLSearchParams(queryString))</code>.',
        "For <code>href</code>, map over the path's segments: static stays, <code>:x</code> becomes <code>encodeURIComponent(String(params.x))</code>, <code>*</code> is split on <code>/</code>, encoded piece by piece and joined again."
      ],
      tests: `
const routes = [
  { name: 'card', path: '/board/:id/card/:cardId' },
  { name: 'board', path: '/board/:id' },
  { name: 'new', path: '/board/new' },
  { name: 'files', path: '/files/*' },
  { name: 'filesRoot', path: '/files' },
  { name: 'home', path: '/' },
];
test('resolves a hash with params', () => eq(createRouter(routes).resolve('#/board/7'), { name: 'board', params: { id: '7' }, query: {} }));
test('works without the #', () => eq(createRouter(routes).resolve('/board/7/card/3').params, { id: '7', cardId: '3' }));
test('an empty hash goes home', () => { const r = createRouter(routes); eq(r.resolve('').name, 'home'); eq(r.resolve('#').name, 'home'); eq(r.resolve('#/').name, 'home'); });
test('parses the query', () => eq(createRouter(routes).resolve('#/board/7?tab=activity&q=a%20b').query, { tab: 'activity', q: 'a b' }));
test('repeated query keys keep the last value', () => eq(createRouter(routes).resolve('#/?t=1&t=2').query, { t: '2' }));
test('static beats param regardless of order', () => eq(createRouter(routes).resolve('#/board/new').name, 'new'));
test('earlier route wins a true tie', () => eq(createRouter([{ name: 'a', path: '/x/:id' }, { name: 'b', path: '/x/:key' }]).resolve('/x/1'), { name: 'a', params: { id: '1' }, query: {} }));
test('a route without * beats a splat', () => { const r = createRouter(routes); eq(r.resolve('#/files').name, 'filesRoot'); eq(r.resolve('#/files/a/b').params, { '*': 'a/b' }); });
test('unknown paths give null', () => eq(createRouter(routes).resolve('#/nope/1'), null));
test('href builds encoded links', () => { const r = createRouter(routes); eq(r.href('card', { id: 7, cardId: 'a b' }), '#/board/7/card/a%20b'); eq(r.href('home'), '#/'); });
test('href round-trips through resolve', () => { const r = createRouter(routes); eq(r.resolve(r.href('card', { id: 'x/y', cardId: '1' })).params, { id: 'x/y', cardId: '1' }); });
test('href checks its inputs', () => { const r = createRouter(routes); assert(/cardId/.test(throws(() => r.href('card', { id: 1 })).message), 'the error should name the missing param'); throws(() => r.href('ghost')); });
test('href with a splat keeps the slashes', () => eq(createRouter(routes).href('files', { '*': 'a/b c' }), '#/files/a/b%20c'));`,
      solution: `function createRouter(routes) {
  const kindsOf = path => path.split('/').filter(Boolean)
    .map(seg => (seg === '*' ? 2 : seg.startsWith(':') ? 1 : 0));
  const compiled = routes.map((route, order) => ({
    route, order, kinds: kindsOf(route.path), splat: kindsOf(route.path).includes(2),
  }));

  // true when a should win over b
  function better(a, b) {
    const n = Math.min(a.kinds.length, b.kinds.length);
    for (let i = 0; i < n; i++) {
      if (a.kinds[i] !== b.kinds[i]) return a.kinds[i] < b.kinds[i];
    }
    if (a.splat !== b.splat) return !a.splat;
    return a.order < b.order;
  }

  function resolve(url) {
    const raw = url.startsWith('#') ? url.slice(1) : url;
    const q = raw.indexOf('?');
    const path = q === -1 ? raw : raw.slice(0, q);
    const query = Object.fromEntries(new URLSearchParams(q === -1 ? '' : raw.slice(q + 1)));
    let best = null;
    for (const c of compiled) {
      const params = matchRoute(c.route.path, path);
      if (params && (!best || better(c, best.c))) best = { c, params };
    }
    return best ? { name: best.c.route.name, params: best.params, query } : null;
  }

  function href(name, params = {}) {
    const route = routes.find(r => r.name === name);
    if (!route) throw new Error('Unknown route: ' + name);
    const segs = route.path.split('/').filter(Boolean).map(seg => {
      if (seg === '*') return String(params['*'] ?? '').split('/').map(encodeURIComponent).join('/');
      if (seg.startsWith(':')) {
        const key = seg.slice(1);
        if (params[key] == null) throw new Error('Missing param "' + key + '" for route ' + name);
        return encodeURIComponent(String(params[key]));
      }
      return seg;
    });
    return '#/' + segs.join('/');
  }

  return { resolve, href };
}

function matchRoute(pattern, path) {
  const segments = s => {
    const trimmed = s.replace(/^\\/+|\\/+$/g, '');
    return trimmed === '' ? [] : trimmed.split('/');
  };
  const pat = segments(pattern);
  const parts = segments(path);
  const params = {};
  try {
    for (let i = 0; i < pat.length; i++) {
      const seg = pat[i];
      if (seg === '*' && i === pat.length - 1) {
        params['*'] = parts.slice(i).map(p => decodeURIComponent(p)).join('/');
        return params;
      }
      if (i >= parts.length) return null;
      if (seg.startsWith(':')) {
        if (parts[i] === '') return null;
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
      } else if (seg !== parts[i]) {
        return null;
      }
    }
  } catch (e) {
    return null;
  }
  return parts.length === pat.length ? params : null;
}`,
      why: 'Ranking by specificity makes route order irrelevant, which is what keeps a growing route table from breaking when someone adds a line in the wrong place. Building links through <code>href</code> means paths and encoding live in one place, and the round-trip test proves that what <code>href</code> writes, <code>resolve</code> reads back.'
    },
    {
      id: 'rt-review',
      type: 'review',
      title: 'AI review: the greedy route',
      xp: 50,
      context: '<p>You asked for a small route matcher. The assistant reached for a regular expression.</p>',
      prompt: '<p><b>The spec:</b> <code>matchRoute(pattern, path)</code> supports <code>:params</code> only. The <b>whole</b> path must match the pattern; a single trailing slash is fine. Static text is literal. Captured values are decoded with <code>decodeURIComponent</code>. No match returns <code>null</code>.</p>',
      code: `function matchRoute(pattern, path) {
  const keys = [];
  const re = new RegExp(
    pattern.replace(/:(\\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })
  );
  const m = path.match(re);
  if (!m) return null;
  return Object.fromEntries(keys.map((k, i) => [k, m[i + 1]]));
}`,
      question: 'What is the most serious problem?',
      options: [
        'String.prototype.replace only replaces the first :param',
        'The regex is not anchored, so the pattern can match anywhere inside a longer path',
        '([^/]+) should be (.*) so that params can contain slashes',
        'Object.fromEntries does not exist in browsers'
      ],
      answer: 1,
      diagnosis: 'Without <code>^</code> and <code>$</code>, <code>/board/:id</code> happily matches <code>/board/7/card/2</code> and <code>/archive/board/7</code>, so the wrong view renders with wrong params. Two quieter bugs ride along: the pattern is not escaped, so the <code>.</code> in <code>/export.json</code> matches any character, and captured values are never decoded. The <code>/g</code> flag does replace every param.',
      hints: [
        "Anchor the expression: <code>'^' + ... + '/?$'</code>.",
        'Escape regex metacharacters in the static parts before building the expression, and wrap decoding in <code>try/catch</code>. Or drop the regex and compare segments.'
      ],
      tests: `
test('basic params', () => eq(matchRoute('/board/:id', '/board/7'), { id: '7' }));
test('longer paths do not match', () => eq(matchRoute('/board/:id', '/board/7/card/2'), null));
test('the route must match from the start', () => eq(matchRoute('/board/:id', '/archive/board/7'), null));
test('a trailing slash is fine', () => eq(matchRoute('/board/:id', '/board/7/'), { id: '7' }));
test('dots are literal', () => eq(matchRoute('/export.json', '/exportXjson'), null));
test('params are decoded', () => eq(matchRoute('/tag/:name', '/tag/a%20b'), { name: 'a b' }));
test('no match gives null', () => eq(matchRoute('/a', '/b'), null));`,
      solution: `function matchRoute(pattern, path) {
  const keys = [];
  const source = pattern
    .replace(/\\/+$/, '')
    .split('/')
    .map(seg => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^$()|[\\]{}\\\\]/g, '\\\\$&');   // escape regex syntax
    })
    .join('/');
  const m = new RegExp('^' + source + '/?$').exec(path);
  if (!m) return null;
  try {
    return Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
  } catch (e) {
    return null;
  }
}`,
      why: 'A regex built from user-facing strings needs three things: anchors, escaping, and a plan for what the captures mean. Missing any one of them gives code that passes the happy-path demo and fails on real URLs.'
    }
  ]
};
