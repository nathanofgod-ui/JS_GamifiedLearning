// Pieces shared by every challenge view.
import { LESSONS, tierLessons, TIERS } from '../content.js';
import { h, icon, toast } from '../dom.js';
import { go } from '../nav.js';
import { EXPLAIN_BONUS, has, lessonClear, lessonDone, S } from '../state.js';

export const lessonById = id => LESSONS.find(l => l.id === id);

export function entryStep(L) {
  const firstUndone = L.challenges.findIndex(c => !has(c.id));
  const anyDone = L.challenges.some(c => has(c.id));
  if (!S.seen[L.id] && !anyDone) return 0;
  return firstUndone === -1 ? 0 : firstUndone + 1;
}

export function nextUp() {
  for (const t of TIERS) {
    if (!t.live) continue;
    for (const L of tierLessons(t.n)) {
      if (lessonClear(L)) continue;
      return { L, step: entryStep(L) || 1 };
    }
  }
  return null;
}

export const crumbs = () => h('div', { class: 'crumbs' }, h('button', { class: 'linkbtn', onclick: () => go({ name: 'home' }) }, icon('back', 15), 'Roadmap'));

export function nextTarget(L, idx) {
  if (idx + 1 < L.challenges.length) return { label: 'Next: ' + L.challenges[idx + 1].title, go: () => go({ name: 'lesson', id: L.id, step: idx + 2 }) };
  const li = LESSONS.indexOf(L);
  if (li + 1 < LESSONS.length) return { label: 'Next lesson: ' + LESSONS[li + 1].title, go: () => go({ name: 'lesson', id: LESSONS[li + 1].id, step: entryStep(LESSONS[li + 1]) }) };
  return { label: 'Back to the roadmap', go: () => go({ name: 'home' }) };
}

export function afterComplete(L) {
  if (lessonDone(L)) toast('Lesson complete: ' + L.title, 'trophy');
}

export function briefMeta(ch, entry) {
  const kind = ch.boss ? h('span', { class: 'tag boss' }, 'Boss')
    : ch.type === 'review' ? h('span', { class: 'tag ai' }, icon('bot', 12), 'AI review')
    : h('span', { class: 'tag' }, ch.type === 'mcq' ? 'Code review' : 'Code challenge');
  return h('div', { class: 'meta' }, kind,
    ch.capstone ? h('span', { class: 'tag' }, 'Board piece') : null,
    entry ? h('span', { class: 'tag ok' }, 'Completed +' + entry.xp + ' XP') : h('span', { class: 'tag xp' }, 'Up to ' + (ch.xp + (ch.type === 'mcq' ? 0 : EXPLAIN_BONUS)) + ' XP'));
}
