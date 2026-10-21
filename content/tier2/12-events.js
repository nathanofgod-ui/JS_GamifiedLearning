// Tier 2, lesson 12: The Event Bus
// Strings that hold HTML are trusted content. A block between ~~~ lines inside a note or prompt is rendered as code.
export default {
  id: 'events',
  tier: 2,
  n: 12,
  title: 'The Event Bus',
  blurb: 'Observer pattern, re-entrancy, error isolation',
  note: `
<p>Your store's <code>subscribe</code> is the observer pattern for a single topic: "state changed". An <b>event bus</b> generalises it to named topics, so parts of an app can announce things ("card moved", "route changed") without knowing who listens. The browser ships one: <code>EventTarget</code>.</p>
~~~
const bus = new EventTarget();
bus.addEventListener('card:moved', e => console.log(e.detail.id));
bus.dispatchEvent(new CustomEvent('card:moved', { detail: { id: 4 } }));
~~~
<p>A hand-rolled bus is twenty lines. Making it <b>correct</b> is where the work is, because listeners are arbitrary code that runs in the middle of your loop.</p>
<h4>The hard cases</h4>
<ul>
<li><b>Mutation during emit.</b> A listener unsubscribes itself (or another listener), or subscribes a new one, while you are iterating. Iterating the live array with <code>forEach</code> and removing with <code>splice</code> silently skips the next listener. The DOM's rule: take a snapshot at the start, skip anything removed since, and do not call anything added since.</li>
<li><b>Re-entrancy.</b> A listener emits another event, maybe the same one. A <code>once</code> listener must be removed <i>before</i> it is called, or a nested emit will call it a second time.</li>
<li><b>Error isolation.</b> One throwing listener must not silence the rest. The DOM reports the error and carries on; a library usually offers an <code>onError</code> hook.</li>
<li><b>Identity.</b> To remove a listener you need the same function you added. <code>once</code> wraps the function, so <code>off(type, original)</code> only works if you remember which wrapper belongs to which original.</li>
<li><b>Leaks.</b> Every <code>on</code> keeps a function, and everything it closes over, alive until <code>off</code>. Returning an unsubscribe function from <code>on</code> makes cleanup easy to do.</li>
</ul>
<h4>When not to use one</h4>
<p>A bus hides control flow: from the emitting line you cannot see what will run. Use the store for <b>state</b> (one source of truth, subscribers re-render from it) and the bus for <b>notifications</b> that several unrelated parts care about: activity logs, analytics, toasts, "something was saved". In your Board, the store owns the cards; the bus tells the activity feed what just happened.</p>`,
  eye: 'In generated pub/sub code, check: does <code>emit</code> iterate a live array that listeners can change? Does <code>once</code> remove the wrapper or the original? Can one throwing listener silence the rest? Is listener storage a plain object (where an event called <code>constructor</code> or <code>toString</code> already "exists")? Is every <code>on</code> paired with an <code>off</code> when a view is torn down?',
  challenges: [
    {
      id: 'ev-order',
      type: 'mcq',
      title: 'Who hears it?',
      xp: 15,
      prompt: "<p>This uses the browser's own <code>EventTarget</code>. What does it print?</p>",
      code: `const bus = new EventTarget();
const log = [];
const a = () => { log.push('a'); bus.removeEventListener('ping', b); };
const b = () => log.push('b');
const c = () => { log.push('c'); bus.addEventListener('ping', d); };
const d = () => log.push('d');

bus.addEventListener('ping', a);
bus.addEventListener('ping', b);
bus.addEventListener('ping', c);

bus.dispatchEvent(new Event('ping'));
bus.dispatchEvent(new Event('ping'));
console.log(log.join(''));`,
      options: ['abcacd', 'acacd', 'abcabcd', 'acdacd'],
      answer: 1,
      explain: 'Removal takes effect immediately: <code>b</code> was removed by <code>a</code> before its turn, so it is skipped even in the dispatch already under way. Additions wait: <code>d</code> joins during the first dispatch but is only called from the second. Your bus will follow the same two rules.'
    },
    {
      id: 'ev-bus',
      type: 'code',
      title: 'Board piece: createEventBus',
      xp: 70,
      capstone: true,
      prompt: `<p>Write <code>createEventBus(options = {})</code> returning <code>{ on, once, off, emit }</code>:</p>
<ul>
<li><code>on(type, fn)</code> registers a listener and returns a function that removes it. Registering the same function for the same type twice has no extra effect.</li>
<li><code>once(type, fn)</code> is the same, but the listener is removed just before its first call. Also returns a remover.</li>
<li><code>off(type, fn)</code> removes <code>fn</code>, whether it was added with <code>on</code> or <code>once</code>. Unknown listeners are ignored.</li>
<li><code>emit(type, payload)</code> calls the listeners for <code>type</code> in registration order with <code>(payload, type)</code>, then every <code>'*'</code> listener with the same arguments. It returns how many listeners it called.</li>
<li>Listeners added during an emit are not called by that emit. Listeners removed during an emit, before their turn, are skipped.</li>
<li>A throwing listener does not stop the others. Errors go to <code>options.onError(error, type)</code> if given; otherwise, once every listener has run, <code>emit</code> rethrows the first error.</li>
</ul>
<p class="muted">Your Board's activity feed and notifications will run on this bus.</p>`,
      starter: `function createEventBus(options = {}) {
  // your code here
}`,
      hints: [
        'Store listeners per type in a <code>Map</code> of <code>fn -&gt; record</code>, where a record remembers <code>{ fn, once }</code>. A Map keeps insertion order and makes "same function twice" and <code>off</code> trivial.',
        'In <code>emit</code>, snapshot the records with <code>[...listeners.values()]</code>. Before calling one, check it is still the registered record for its function; that skips anything removed mid-emit.',
        'Delete a <code>once</code> record before calling it. Wrap each call in <code>try/catch</code>, collect errors, and decide at the end whether to rethrow.'
      ],
      tests: `
test('on + emit passes payload and type', () => { const bus = createEventBus(); const got = []; bus.on('add', (p, t) => got.push([p, t])); bus.emit('add', { id: 1 }); eq(got, [[{ id: 1 }, 'add']]); });
test('listeners run in registration order', () => { const bus = createEventBus(); const log = []; bus.on('x', () => log.push(1)); bus.on('x', () => log.push(2)); bus.on('x', () => log.push(3)); bus.emit('x'); eq(log, [1, 2, 3]); });
test('emit returns how many listeners ran', () => { const bus = createEventBus(); bus.on('x', () => {}); bus.on('x', () => {}); bus.on('*', () => {}); eq(bus.emit('x'), 3); eq(bus.emit('nobody'), 1); });
test('the same function is registered once', () => { const bus = createEventBus(); let n = 0; const f = () => n++; bus.on('x', f); bus.on('x', f); bus.emit('x'); eq(n, 1); });
test('on returns a remover', () => { const bus = createEventBus(); let n = 0; const off = bus.on('x', () => n++); bus.emit('x'); off(); off(); bus.emit('x'); eq(n, 1); });
test('off removes a listener', () => { const bus = createEventBus(); let n = 0; const f = () => n++; bus.on('x', f); bus.off('x', f); bus.off('x', () => {}); bus.off('never', f); bus.emit('x'); eq(n, 0); });
test('once fires a single time', () => { const bus = createEventBus(); let n = 0; bus.once('x', () => n++); bus.emit('x'); bus.emit('x'); eq(n, 1); });
test('off works for once listeners too', () => { const bus = createEventBus(); let n = 0; const f = () => n++; bus.once('x', f); bus.off('x', f); bus.emit('x'); eq(n, 0); });
test('once survives a nested emit', () => { const bus = createEventBus(); let n = 0; bus.once('x', () => { n++; bus.emit('x'); }); bus.emit('x'); eq(n, 1); });
test('wildcards hear everything, after specific listeners', () => { const bus = createEventBus(); const log = []; bus.on('*', (p, t) => log.push('*' + t)); bus.on('a', () => log.push('a')); bus.emit('a'); bus.emit('b'); eq(log, ['a', '*a', '*b']); });
test('listeners added during emit wait for the next one', () => { const bus = createEventBus(); const log = []; bus.on('x', () => { log.push('a'); bus.on('x', () => log.push('late')); }); bus.emit('x'); eq(log, ['a']); bus.emit('x'); eq(log, ['a', 'a', 'late']); });
test('listeners removed during emit are skipped', () => { const bus = createEventBus(); const log = []; const b = () => log.push('b'); bus.on('x', () => { log.push('a'); bus.off('x', b); }); bus.on('x', b); bus.on('x', () => log.push('c')); bus.emit('x'); eq(log, ['a', 'c']); });
test('a throwing listener does not stop the others', () => {
  const errors = []; const bus = createEventBus({ onError: (e, t) => errors.push([e.message, t]) }); const log = [];
  bus.on('x', () => { throw new Error('bad'); }); bus.on('x', () => log.push('ok'));
  eq(bus.emit('x'), 2); eq(log, ['ok']); eq(errors, [['bad', 'x']]);
});
test('without onError the first error is rethrown after everyone ran', () => {
  const bus = createEventBus(); const log = [];
  bus.on('x', () => { throw new Error('first'); }); bus.on('x', () => { throw new Error('second'); }); bus.on('x', () => log.push('ran'));
  eq(throws(() => bus.emit('x')).message, 'first'); eq(log, ['ran']);
});
test('event names from Object.prototype are just names', () => { const bus = createEventBus(); const log = []; bus.on('constructor', p => log.push(p)); eq(bus.emit('toString', 1), 0); bus.emit('constructor', 2); eq(log, [2]); });
test('buses are independent', () => { const a = createEventBus(); const b = createEventBus(); let n = 0; b.on('x', () => n++); a.emit('x'); eq(n, 0); });`,
      solution: `function createEventBus(options = {}) {
  const topics = new Map();   // type -> Map(fn -> { fn, once })

  function add(type, fn, once) {
    if (!topics.has(type)) topics.set(type, new Map());
    const listeners = topics.get(type);
    if (!listeners.has(fn)) listeners.set(fn, { fn, once });
    return () => off(type, fn);
  }

  function off(type, fn) {
    const listeners = topics.get(type);
    if (listeners) listeners.delete(fn);
  }

  function emit(type, payload) {
    const errors = [];
    let called = 0;
    const run = key => {
      const listeners = topics.get(key);
      if (!listeners) return;
      for (const rec of [...listeners.values()]) {
        if (listeners.get(rec.fn) !== rec) continue;   // removed (or replaced) since the snapshot
        if (rec.once) listeners.delete(rec.fn);        // before the call, so nested emits can't reuse it
        called++;
        try {
          rec.fn(payload, type);
        } catch (err) {
          if (options.onError) options.onError(err, type);
          else errors.push(err);
        }
      }
    };
    run(type);
    if (type !== '*') run('*');
    if (errors.length) throw errors[0];
    return called;
  }

  return {
    on: (type, fn) => add(type, fn, false),
    once: (type, fn) => add(type, fn, true),
    off,
    emit,
  };
}`,
      why: `Snapshot plus "is this record still registered?" gives exactly the DOM's semantics: removals take effect at once, additions wait. Keying listeners by the original function solves <code>off</code> for <code>once</code> listeners without wrapper bookkeeping, and a <code>Map</code> never confuses an event called <code>constructor</code> with an inherited property.`
    },
    {
      id: 'ev-review',
      type: 'review',
      title: 'AI review: the skipped listener',
      xp: 50,
      context: '<p>You asked an assistant for a minimal event emitter. It wrote this and the demo with one listener per event worked.</p>',
      prompt: '<p><b>The spec:</b> <code>on(type, fn)</code>, <code>off(type, fn)</code>, <code>once(type, fn)</code> and <code>emit(type, payload)</code>. Every listener registered when <code>emit</code> starts must run, even if an earlier listener removes itself. Any string is a valid event name. Emitting an event nobody listens to does nothing.</p>',
      code: `function createEmitter() {
  const listeners = {};
  return {
    on(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    off(type, fn) {
      const list = listeners[type];
      if (!list) return;
      const i = list.indexOf(fn);
      if (i !== -1) list.splice(i, 1);
    },
    once(type, fn) {
      const wrapper = payload => {
        this.off(type, wrapper);
        fn(payload);
      };
      this.on(type, wrapper);
    },
    emit(type, payload) {
      (listeners[type] || []).forEach(fn => fn(payload));
    }
  };
}`,
      question: 'Which problem will bite first in a real app?',
      options: [
        'once uses this inside an arrow function, so it points at the wrong object',
        'When a once listener removes itself, splice shifts the live array under forEach and the next listener is skipped',
        'forEach passes (value, index, array), so listeners receive the wrong payload',
        'off should use filter instead of splice because splice is slow'
      ],
      answer: 1,
      diagnosis: "<code>forEach</code> walks indexes of the live array. When the <code>once</code> wrapper at index 0 splices itself out, the listener that was at index 1 moves to 0 and the loop continues at index 1: that listener never runs. There is a second bug hiding: <code>listeners</code> is a plain object, so events named <code>constructor</code> or <code>toString</code> find inherited functions instead of arrays. The arrow's <code>this</code> comes from <code>once</code>, where it is the emitter, so that part is fine.",
      hints: [
        'Iterate over a copy of the array in <code>emit</code>.',
        'Swap the plain object for a <code>Map</code> so event names cannot collide with <code>Object.prototype</code>.'
      ],
      tests: `
test('every listener runs even when a once listener removes itself', () => { const em = createEmitter(); const log = []; em.once('x', () => log.push('a')); em.on('x', () => log.push('b')); em.emit('x'); em.emit('x'); eq(log, ['a', 'b', 'b']); });
test('once fires once', () => { const em = createEmitter(); let n = 0; em.once('x', () => n++); em.emit('x'); em.emit('x'); eq(n, 1); });
test('off removes a listener', () => { const em = createEmitter(); let n = 0; const f = () => n++; em.on('x', f); em.off('x', f); em.emit('x'); eq(n, 0); });
test('payload is passed', () => { const em = createEmitter(); let got; em.on('x', p => { got = p; }); em.emit('x', 42); eq(got, 42); });
test('any string is a valid event name', () => { const em = createEmitter(); const log = []; em.on('constructor', p => log.push(p)); em.on('toString', p => log.push(p)); em.emit('constructor', 1); em.emit('toString', 2); em.emit('hasOwnProperty', 3); eq(log, [1, 2]); });
test('emitting an unknown event is harmless', () => { const em = createEmitter(); em.emit('nothing'); });`,
      solution: `function createEmitter() {
  const listeners = new Map();   // no inherited keys to collide with
  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    off(type, fn) {
      const list = listeners.get(type);
      if (!list) return;
      const i = list.indexOf(fn);
      if (i !== -1) list.splice(i, 1);
    },
    once(type, fn) {
      const wrapper = payload => {
        this.off(type, wrapper);
        fn(payload);
      };
      this.on(type, wrapper);
    },
    emit(type, payload) {
      const list = listeners.get(type);
      if (list) [...list].forEach(fn => fn(payload));   // snapshot first
    }
  };
}`,
      why: 'Never iterate a collection that the loop body can change. A snapshot makes the iteration immune to listeners adding or removing themselves. And a <code>Map</code> is the right dictionary whenever keys come from outside your code.'
    }
  ]
};
