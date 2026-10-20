// The test harness. Runs `code` followed by a challenge's `tests` in one strict-mode async function,
// with test/assert/eq/throws and a capturing console in scope. Used by the browser worker, by the
// content checks in tests/, and by board/ (where `inject` supplies your imported functions).
export async function runSuite(code, tests, inject = {}) {
  const logs = [];
  const queue = [];
  const out = { ok: false, error: null, tests: [], logs: logs };

  function fmt(v, top, depth, seen) {
    depth = depth || 0;
    seen = seen || [];
    const t = typeof v;
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (t === 'string') return top ? v : JSON.stringify(v);
    if (t === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (t === 'bigint') return v + 'n';
    if (t === 'symbol') return v.toString();
    if (t === 'boolean') return String(v);
    if (t === 'function') return 'ƒ ' + (v.name || 'anonymous');
    if (seen.indexOf(v) !== -1) return '[Circular]';
    if (depth > 4) return Array.isArray(v) ? '[…]' : '{…}';
    seen = seen.concat([v]);
    const sub = function (x) { return fmt(x, false, depth + 1, seen); };
    if (v instanceof Error) return v.name + ': ' + v.message;
    if (v instanceof Date) return isNaN(v) ? 'Invalid Date' : v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (v instanceof Map) return 'Map(' + v.size + ') { ' + Array.from(v, function (e) { return sub(e[0]) + ' => ' + sub(e[1]); }).join(', ') + ' }';
    if (v instanceof Set) return 'Set(' + v.size + ') { ' + Array.from(v, sub).join(', ') + ' }';
    if (Array.isArray(v)) {
      const items = Array.from(v.slice(0, 30), sub);
      if (v.length > 30) items.push('… ' + (v.length - 30) + ' more');
      return '[' + items.join(', ') + ']';
    }
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    return '{ ' + keys.map(function (k) {
      return (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + sub(v[k]);
    }).join(', ') + ' }';
  }

  function deepEqual(a, b, seen) {
    if (a === b || (a !== a && b !== b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
    seen = seen || [];
    for (let i = 0; i < seen.length; i++) if (seen[i][0] === a && seen[i][1] === b) return true;
    seen.push([a, b]);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    if (a instanceof Map || b instanceof Map) {
      if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
      for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k), seen)) return false;
      return true;
    }
    if (a instanceof Set || b instanceof Set) {
      if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
      for (const v of a) if (!b.has(v)) return false;
      return true;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k], seen)) return false;
    }
    return true;
  }

  const test = function (name, fn) { queue.push({ name: name, fn: fn }); };
  const assert = function (cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); };
  const eq = function (actual, expected, msg) {
    if (!deepEqual(actual, expected)) {
      throw new Error((msg ? msg + '\n' : '') + 'Expected  ' + fmt(expected) + '\nReceived  ' + fmt(actual));
    }
  };
  const throws = function (fn, msg) {
    try { fn(); } catch (e) { return e; }
    throw new Error(msg || 'Expected the function to throw');
  };
  const con = {};
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (k) {
    con[k] = function () {
      const parts = Array.prototype.map.call(arguments, function (x) { return fmt(x, true); });
      logs.push((k === 'warn' || k === 'error' ? k + ': ' : '') + parts.join(' '));
    };
  });

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    const names = Object.keys(inject);
    const body = new AsyncFunction('test', 'assert', 'eq', 'throws', 'console', ...names, '"use strict";\n' + code + '\n;\n' + tests);
    await body(test, assert, eq, throws, con, ...names.map(n => inject[n]));
  } catch (e) {
    out.error = (e && e.name ? e.name + ': ' : '') + (e && e.message !== undefined ? e.message : String(e));
    return out;
  }
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    try {
      await Promise.race([
        Promise.resolve().then(t.fn),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('Test timed out after 1 second')); }, 1000); })
      ]);
      out.tests.push({ name: t.name, pass: true });
    } catch (e) {
      out.tests.push({ name: t.name, pass: false, msg: String(e && e.message !== undefined ? e.message : e) });
    }
  }
  out.ok = out.tests.length > 0 && out.tests.every(function (t) { return t.pass; });
  return out;
}
