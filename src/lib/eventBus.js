// The app's own event bus. This is the reference solution to the Tier 2 challenge "createEventBus",
// so the app runs on exactly what the course asks you to build.
export function createEventBus(options = {}) {
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
}
