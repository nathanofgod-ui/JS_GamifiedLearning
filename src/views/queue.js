// The spaced-repetition review queue.
import { bus } from '../bus.js';
import { BY_ID } from '../content.js';
import { h, icon, shuffled } from '../dom.js';
import { codeBlock, rich } from '../highlight.js';
import { rerender } from '../nav.js';
import { award, checkBadges } from '../rewards.js';
import { execute } from '../runner/execute.js';
import { dayKey, dueIds, has, INTERVALS, S, save, srsGrade } from '../state.js';
import { makeEditor } from '../ui/editor.js';
import { resultsView } from '../ui/results.js';
import { boxStrip } from './home.js';
import { crumbs } from './kit.js';

export const SESSION_SIZE = 10;

export const REVIEW_XP = { mcq: 3, review: 4, code: 8 };

export let session = null;   // { ids, i, ok, xp, done }

export function renderReviewQueue(root) {
  const wrap = h('div', { class: 'wrap' }, crumbs());
  root.append(wrap);
  if (session && !session.done && session.i < session.ids.length) { renderReviewItem(wrap); return; }

  const due = dueIds();
  const inRot = Object.keys(S.srs).filter(id => BY_ID.has(id) && has(id));
  const upcoming = inRot.filter(id => S.srs[id].due > dayKey()).sort((a, b) => S.srs[a].due.localeCompare(S.srs[b].due));
  const summary = session && session.done
    ? h('div', { class: 'feedback good', style: 'margin-bottom:18px' }, h('b', null, 'Session complete'),
        session.ok + ' of ' + session.ids.length + ' remembered' + (session.xp ? ', +' + session.xp + ' XP.' : '.') + ' Misses come back tomorrow; the rest move further out.')
    : null;
  wrap.append(h('div', { class: 'page-title' }, h('h1', null, 'Review queue'),
    h('p', { class: 'muted', style: 'max-width:64ch' }, 'Spaced repetition: every challenge you finish comes back after 1 day, then 3, 7, 14, 30 and 60. Remember it and it moves one step further out; miss it and it starts again tomorrow. Code challenges come back as a blank editor: you rewrite them from memory against the same hidden tests.')),
    summary,
    h('div', { class: 'tools' },
      h('div', { class: 'tool' },
        h('div', { class: 'tool-h' }, icon('repeat', 18), h('h3', null, due.length ? due.length + ' due today' : 'Nothing due today')),
        h('p', null, due.length ? 'A session takes up to ' + SESSION_SIZE + ' items, oldest first. Predict questions earn ' + REVIEW_XP.mcq + ' XP, bug spotting ' + REVIEW_XP.review + ', a rewrite from memory ' + REVIEW_XP.code + '.' : upcoming.length ? 'The next item comes back on ' + S.srs[upcoming[0]].due + '.' : 'Finish a challenge and it joins the queue tomorrow.'),
        due.length ? h('button', { class: 'btn', onclick: () => { session = { ids: due.slice(0, SESSION_SIZE), i: 0, ok: 0, xp: 0, done: false }; rerender(); } }, icon('play', 15), 'Start a session (' + Math.min(due.length, SESSION_SIZE) + ')') : null),
      h('div', { class: 'tool' },
        h('div', { class: 'tool-h' }, icon('layers', 18), h('h3', null, 'Memory boxes')),
        h('p', null, inRot.length + ' items in rotation. ' + S.rv.ok + ' of ' + S.rv.total + ' reviews remembered so far.'),
        boxStrip())));
  if (inRot.length) {
    const rows = inRot.slice().sort((a, b) => S.srs[a].due.localeCompare(S.srs[b].due)).slice(0, 40).map(id => {
      const x = BY_ID.get(id), r = S.srs[id];
      return h('li', { class: 'qrow' }, h('span', { class: 'qk' }, x.c.type === 'code' ? 'rewrite' : x.c.type === 'review' ? 'spot' : 'predict'),
        h('span', { class: 'qt' }, x.c.title, h('span', { class: 'muted' }, ' · ' + x.l.title)),
        h('span', { class: 'qd' + (r.due <= dayKey() ? ' due' : '') }, r.due <= dayKey() ? 'due' : r.due));
    });
    wrap.append(h('h3', { class: 'sub-h' }, 'Schedule'), h('ul', { class: 'qlist' }, rows));
  }
}

export function renderReviewItem(wrap) {
  const id = session.ids[session.i];
  const { l: L, c: ch } = BY_ID.get(id);
  const body = h('div');
  wrap.append(h('div', { class: 'lesson-title' },
    h('span', null, 'Review ' + (session.i + 1) + ' of ' + session.ids.length),
    h('h1', null, ch.type === 'code' ? 'Rewrite from memory' : ch.type === 'review' ? 'Spot the bug' : 'Predict the output')),
    h('div', { class: 'steps' }, h('span', { class: 'tag' }, 'Tier ' + L.tier + ' · ' + L.title), h('span', { class: 'tag' }, ch.title),
      h('span', { class: 'grow' }), h('button', { class: 'linkbtn', onclick: () => { if (session.ids.length - session.i <= 1) session.done = true; else session.ids.push(session.ids.splice(session.i, 1)[0]); rerender(); } }, icon('skip', 14), 'Skip for now'),
      h('button', { class: 'linkbtn', onclick: () => { session = null; rerender(); } }, icon('x', 14), 'End session')),
    body);
  const finish = ok => {
    srsGrade(id, ok);
    if (ok) { session.ok++; session.xp += REVIEW_XP[ch.type]; award(REVIEW_XP[ch.type]); } else { save(); bus.emit("progress"); }
    checkBadges();
  };
  const nextBtn = () => h('button', { class: 'btn', onclick: () => { session.i++; if (session.i >= session.ids.length) session.done = true; rerender(); } }, session.i + 1 < session.ids.length ? 'Next item' : 'Finish', icon('arrow', 15));

  if (ch.type === 'code') {
    const resEl = h('div', { class: 'results', 'aria-live': 'polite' });
    const after = h('div');
    let graded = false;
    const ed = makeEditor(ch.starter, { onRun: () => run() });
    const runBtn = h('button', { class: 'btn', onclick: () => run() }, icon('play', 15), 'Run tests');
    const giveUp = h('button', { class: 'btn ghost sm', onclick: () => {
      if (graded) return; graded = true; finish(false);
      runBtn.disabled = true; giveUp.disabled = true;
      after.replaceChildren(h('div', { class: 'feedback bad' }, h('b', null, 'Back to tomorrow'), 'Study the reference, then close it and try writing it in your head.'),
        h('details', { class: 'sol', open: true, style: 'margin-top:10px' }, h('summary', null, 'Reference solution'), codeBlock(ch.solution), h('p', { class: 'why', html: ch.why })),
        h('div', { style: 'margin-top:12px' }, nextBtn()));
    } }, icon('bulb', 14), 'I\'m stuck: show the reference');
    async function run() {
      if (graded) return;
      runBtn.disabled = true;
      const res = await execute(ed.value, ch.tests);
      runBtn.disabled = false;
      resultsView(resEl, res);
      if (res.ok) {
        graded = true; finish(true); runBtn.disabled = true; giveUp.disabled = true;
        after.replaceChildren(h('div', { class: 'feedback good' }, h('b', null, 'Remembered'), 'It moves to the ' + INTERVALS[S.srs[id].box] + '-day box.'),
          h('details', { class: 'sol', style: 'margin-top:10px' }, h('summary', null, 'Compare with the reference'), codeBlock(ch.solution)),
          h('div', { style: 'margin-top:12px' }, nextBtn()));
      }
    }
    body.append(h('div', { class: 'work' },
      h('section', { class: 'brief' }, h('h2', null, ch.title), h('div', { html: rich(ch.prompt) })),
      h('section', { class: 'bench' }, h('div', { class: 'toolbar' }, runBtn, giveUp, h('span', { class: 'grow' }), h('span', { class: 'kbdhint' }, h('kbd', null, 'Ctrl'), ' + ', h('kbd', null, 'Enter'), ' runs')), ed.el, resEl, after)));
    return;
  }

  // mcq or AI review: one shot, options shuffled so position can't be memorised
  const isReview = ch.type === 'review';
  const order = shuffled(ch.options.length);
  let selected = null, answered = false;
  const opts = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Answer options' });
  const fb = h('div', { 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn', disabled: true, onclick: () => {
    answered = true; const ok = selected === ch.answer; finish(ok); draw(); checkBtn.hidden = true;
    fb.replaceChildren(h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') }, h('b', null, ok ? 'Remembered' : 'Missed: it comes back tomorrow'), h('span', { html: isReview ? ch.diagnosis : ch.explain }), h('div', { style: 'margin-top:10px' }, nextBtn())));
  } }, 'Check answer');
  function draw() {
    opts.replaceChildren(...order.map((oi, pos) => h('button', {
      class: 'opt' + (isReview ? ' prose' : '') + (answered && oi === ch.answer ? ' right' : '') + (answered && oi === selected && oi !== ch.answer ? ' wrong' : '') + (!answered && selected === oi ? ' sel' : ''),
      role: 'radio', 'aria-checked': String(selected === oi), disabled: answered,
      onclick: () => { selected = oi; checkBtn.disabled = false; draw(); }
    }, h('span', { class: 'l' }, 'ABCD'[pos]), h('span', null, ch.options[oi]))));
  }
  draw();
  const brief = isReview
    ? h('section', { class: 'brief' }, h('h2', null, ch.title), h('div', { class: 'spec', html: rich(ch.prompt) }), h('div', { class: 'aicode' }, h('div', { class: 'aicode-h' }, icon('bot', 14), 'What the assistant wrote'), codeBlock(ch.code)))
    : h('section', { class: 'brief' }, h('h2', null, ch.title), h('div', { html: rich(ch.prompt) }), codeBlock(ch.code));
  body.append(h('div', { class: 'work' }, brief, h('section', { class: 'bench' }, isReview ? h('p', { class: 'q' }, ch.question) : null, opts, h('div', null, checkBtn), fb)));
}
