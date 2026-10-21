// Tiny DOM helpers: element builder, icons, toasts.


export const $ = (s, el) => (el || document).querySelector(s);

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

export const P = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  flame: 'M12 2.5c.6 3.6-3.4 5.2-3.4 9.4a3.9 3.9 0 0 0 7.8 0c0-1.6-.7-2.8-1.6-3.7-.1 1.8-1 2.7-2 2.7.3-2.5.2-5.5-.8-8.4z',
  check: 'M5 12.5 9.5 17 19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  play: 'M7 5l12 7-12 7z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  trophy: 'M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 20h8',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
  shield: 'M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  plus: 'M12 5v14M5 12h14',
  repeat: 'M4 10a7 7 0 0 1 12.2-4.2L19 8.5M20 14a7 7 0 0 1-12.2 4.2L5 15.5M19 3.5v5h-5M5 20.5v-5h5',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.2v1.6',
  bot: 'M5 9h14v10H5zM12 9V5.5M10.5 4.5h3M9 13.5v1.5M15 13.5v1.5M2.5 13v3M21.5 13v3',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  skip: 'M5 5l9 7-9 7zM18 5v14'
};

export function icon(n, s) {
  s = s || 16;
  return h('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + P[n] + '"/></svg>' });
}

export function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function toast(msg, ic) {
  const t = h('div', { class: 'toast' }, icon(ic || 'bolt', 18), msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3400);
}
