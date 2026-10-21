// Placement test: skip lessons you already know.
import { bus } from '../bus.js';
import { PLACEMENT, tierLessons, tierOf } from '../content.js';
import { h, icon } from '../dom.js';
import { codeBlock } from '../highlight.js';
import { go, view } from '../nav.js';
import { checkBadges } from '../rewards.js';
import { isPlaced, lessonDone, S, save } from '../state.js';
import { crumbs } from './kit.js';

export function renderPlacement(root) {
  const t = tierOf(view.tier);
  const lessons = tierLessons(t.n);
  const answers = {};          // 'lessonId:i' -> option index
  let submitted = false;
  const wrap = h('div', { class: 'wrap' }, crumbs());
  root.append(wrap);
  const pending = () => lessons.filter(L => !lessonDone(L) && !isPlaced(L) && PLACEMENT[L.id]);
  const body = h('div');
  wrap.append(h('div', { class: 'page-title' }, h('h1', null, 'Placement test · Tier ' + t.n),
    h('p', { class: 'muted', style: 'max-width:66ch' }, 'Two predict-the-output questions per lesson. Answer both right and the lesson is marked tested out: the roadmap skips it, and you can still do it any time. No XP and no hints here, and no penalty for missing; it only decides where you start. Capstone pieces in a lesson you test out of still have to be written by you.')),
    body);

  function draw() {
    body.replaceChildren();
    const todo = pending();
    const skipped = lessons.filter(L => lessonDone(L) || isPlaced(L));
    if (skipped.length) body.append(h('p', { class: 'muted', style: 'font-size:14px' }, 'Not included: ' + skipped.map(L => L.title + (lessonDone(L) ? ' (completed)' : ' (tested out)')).join(', ') + '.'));
    if (!todo.length && !submitted) { body.append(h('div', { class: 'feedback good' }, h('b', null, 'Nothing left to test'), 'Every lesson in this tier is completed or tested out.'), h('button', { class: 'btn', style: 'margin-top:14px', onclick: () => go({ name: 'home' }) }, 'Back to the roadmap')); return; }
    const groups = (submitted ? lastRun : todo).map(L => {
      const qs = PLACEMENT[L.id];
      const res = submitted ? qs.map((q, i) => answers[L.id + ':' + i] === q.answer) : null;
      const pass = res && res.every(Boolean);
      return h('section', { class: 'pl-lesson' },
        h('div', { class: 'pl-head' }, h('span', { class: 'tn' }, 'Lesson ' + L.n), h('h3', null, L.title),
          submitted ? h('span', { class: 'tag ' + (pass ? 'ok' : 'xp') }, pass ? 'Tested out' : 'Study this one') : null),
        qs.map((q, i) => {
          const key = L.id + ':' + i;
          return h('div', { class: 'pq' },
            h('div', { html: q.prompt || '<p>What does this print?</p>' }), codeBlock(q.code),
            h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Answer options' }, q.options.map((o, oi) => h('button', {
              class: 'opt' + (o.length > 40 ? ' prose' : '') + (submitted && oi === q.answer ? ' right' : '') + (submitted && answers[key] === oi && oi !== q.answer ? ' wrong' : '') + (!submitted && answers[key] === oi ? ' sel' : ''),
              role: 'radio', 'aria-checked': String(answers[key] === oi), disabled: submitted,
              onclick: () => { answers[key] = oi; draw(); }
            }, h('span', { class: 'l' }, 'ABCD'[oi]), h('span', null, o)))),
            submitted ? h('div', { class: 'feedback ' + (res[i] ? 'good' : 'bad') }, h('b', null, res[i] ? 'Right' : 'Answer: ' + 'ABCD'[q.answer]), h('span', { html: q.explain })) : null);
        }));
    });
    if (submitted) {
      const passed = lastRun.filter(L => isPlaced(L));
      body.append(h('div', { class: 'feedback ' + (passed.length ? 'good' : 'bad'), style: 'margin:6px 0 18px' },
        h('b', null, passed.length ? 'Tested out of ' + passed.length + ' lesson' + (passed.length === 1 ? '' : 's') : 'No lessons tested out this time'),
        passed.length ? passed.map(L => L.title).join(', ') + '. The rest are where your learning starts.' : 'Good news: you now know exactly where to start.'),
        h('div', { class: 'done-actions', style: 'margin-bottom:22px' },
          h('button', { class: 'btn', onclick: () => go({ name: 'home' }) }, 'Back to the roadmap', icon('arrow', 15)),
          pending().length ? h('button', { class: 'btn ghost', onclick: () => { submitted = false; Object.keys(answers).forEach(k => delete answers[k]); draw(); window.scrollTo({ top: 0 }); } }, icon('reset', 15), 'Retake the rest') : null));
    }
    body.append(...groups);
    if (!submitted) {
      const total = todo.reduce((s, L) => s + PLACEMENT[L.id].length, 0);
      const answered = Object.keys(answers).length;
      body.append(h('div', { class: 'pl-submit' },
        h('span', { class: 'muted' }, answered + ' of ' + total + ' answered'),
        h('button', { class: 'btn', disabled: answered < total, onclick: submit }, icon('target', 15), 'Submit')));
    }
  }
  let lastRun = [];
  function submit() {
    lastRun = pending();
    lastRun.forEach(L => { if (PLACEMENT[L.id].every((q, i) => answers[L.id + ':' + i] === q.answer)) S.placed[L.id] = Date.now(); });
    submitted = true; save(); checkBadges(); bus.emit("progress"); draw(); window.scrollTo({ top: 0 });
  }
  draw();
}
