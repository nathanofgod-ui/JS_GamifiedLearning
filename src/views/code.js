// Write-the-code challenge.
import { h } from '../dom.js';
import { rich } from '../highlight.js';
import { S } from '../state.js';
import { codeBench } from '../ui/codeBench.js';
import { briefMeta } from './kit.js';

export function renderCode(root, L, idx) {
  const ch = L.challenges[idx];
  const hintsEl = h('div', { class: 'hints' });
  const brief = h('section', { class: 'brief' }, briefMeta(ch, S.done[ch.id]), h('h2', null, ch.title), h('div', { html: rich(ch.prompt) }), hintsEl);
  const bench = h('section', { class: 'bench' }, codeBench(ch, L, idx, ch.starter, hintsEl));
  root.append(h('div', { class: 'work' }, brief, bench));
}
