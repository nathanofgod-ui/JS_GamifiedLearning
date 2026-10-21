// Navigation. The current view lives in the URL hash, so reloads, bookmarks and the back button work.
import { createRouter } from './lib/router.js';
import { bus } from './bus.js';

const router = createRouter([
  { name: 'home', path: '/' },
  { name: 'lesson', path: '/lesson/:id/:step' },
  { name: 'badges', path: '/badges' },
  { name: 'review', path: '/review' },
  { name: 'placement', path: '/placement/:tier' },
  { name: 'board', path: '/board/1' },
  { name: 'board2', path: '/board/2' },
]);

export let view = { name: 'home' };
let teardown = null;

function toHash(v) {
  switch (v.name) {
    case 'lesson': return router.href('lesson', { id: v.id, step: v.step || 0 });
    case 'placement': return router.href('placement', { tier: v.tier });
    default: return router.href(v.name);
  }
}
function fromHash(hash) {
  const m = router.resolve(hash || '#/');
  if (!m) return { name: 'home' };
  if (m.name === 'lesson') return { name: 'lesson', id: m.params.id, step: Number(m.params.step) || 0 };
  if (m.name === 'placement') return { name: 'placement', tier: Number(m.params.tier) };
  return { name: m.name };
}

/** A view registers its cleanup here; it runs before the next render. */
export function setTeardown(fn) { teardown = fn; }

/** Render the current view again (keeps scroll position). */
export function rerender() {
  if (teardown) { try { teardown(); } catch (e) { console.error(e); } teardown = null; }
  bus.emit('render', view);
}

/** Go to a view: updates the hash, which triggers the render. */
export function go(v) {
  const hash = toHash(v);
  view = v;
  if (location.hash === hash) { rerender(); window.scrollTo({ top: 0 }); }
  else location.hash = hash;          // hashchange below does the rest
}

export function startNavigation(isKnown) {
  const sync = () => {
    const next = fromHash(location.hash);
    view = isKnown(next) ? next : { name: 'home' };
    rerender();
    window.scrollTo({ top: 0 });
  };
  window.addEventListener('hashchange', sync);
  sync();
}
