// Small DOM helpers for the Board.
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

const PATHS = {
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 9.5 17 19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
};
export function icon(name, size = 16) {
  return h('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + PATHS[name] + '"/></svg>' });
}
export function toast(msg, ic = 'check') {
  const t = h('div', { class: 'toast' }, icon(ic, 18), msg);
  document.querySelector('#toasts').append(t);
  setTimeout(() => t.remove(), 3400);
}
