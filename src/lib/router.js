// The app's own router: the reference solutions to "createRouter" and "matchRoute" (Tier 2, lesson 13).
export function createRouter(routes) {
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

export function matchRoute(pattern, path) {
  const segments = s => {
    const trimmed = s.replace(/^\/+|\/+$/g, '');
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
}
