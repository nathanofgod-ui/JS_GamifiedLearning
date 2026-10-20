// A lesson: field notes plus its challenges.
import { h, icon } from '../dom.js';
import { rich } from '../highlight.js';
import { go, rerender, view } from '../nav.js';
import { has, isPlaced, lessonDone, S, save } from '../state.js';
import { renderAIReview } from './aiReview.js';
import { renderCode } from './code.js';
import { crumbs, entryStep, lessonById } from './kit.js';
import { renderMcq } from './mcq.js';

export function renderLesson(root) {
  const L = lessonById(view.id), step = view.step;
  const steps = h('nav', { class: 'steps', 'aria-label': 'Lesson steps' },
    h('button', { class: 'step' + (step === 0 ? ' cur' : ''), onclick: () => go({ name: 'lesson', id: L.id, step: 0 }) }, icon('book', 15), 'Field notes'),
    L.challenges.map((c, i) => h('button', { class: 'step' + (step === i + 1 ? ' cur' : '') + (has(c.id) ? ' done' : '') + (c.type === 'review' ? ' ai' : ''), onclick: () => go({ name: 'lesson', id: L.id, step: i + 1 }) },
      has(c.id) ? icon('check', 15) : c.type === 'review' ? icon('bot', 15) : h('span', { class: 'k' }, String(i + 1)), c.title)));
  const body = h('div');
  const placedNote = isPlaced(L) && !lessonDone(L)
    ? h('span', { class: 'placed-note' }, h('span', { class: 'tag out' }, 'Tested out'),
        h('button', { class: 'linkbtn', onclick: () => { delete S.placed[L.id]; save(); rerender(); } }, 'Undo'))
    : null;
  root.append(h('div', { class: 'wrap' }, crumbs(),
    h('div', { class: 'lesson-title' }, h('span', null, 'Tier ' + L.tier + ' · Lesson ' + L.n), h('h1', null, L.title), placedNote),
    steps, body));
  if (step === 0) renderNotes(body, L);
  else {
    const ch = L.challenges[step - 1];
    if (ch.type === 'mcq') renderMcq(body, L, step - 1);
    else if (ch.type === 'review') renderAIReview(body, L, step - 1);
    else renderCode(body, L, step - 1);
  }
}

export function renderNotes(root, L) {
  S.seen[L.id] = true; save();
  root.append(h('article', { class: 'notes' },
    h('div', { html: rich(L.note) }),
    h('div', { class: 'eye', html: '<b>Reviewer\'s eye.</b> ' + L.eye }),
    h('button', { class: 'btn', onclick: () => go({ name: 'lesson', id: L.id, step: Math.max(1, entryStep(L)) }) }, 'Start the challenges', icon('arrow', 16))));
}
