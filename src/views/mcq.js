// Predict-the-output question.
import { h, icon } from '../dom.js';
import { codeBlock, rich } from '../highlight.js';
import { award } from '../rewards.js';
import { att, markDone, mcqBase, S, save } from '../state.js';
import { afterComplete, briefMeta, nextTarget } from './kit.js';

export function renderMcq(root, L, idx) {
  const ch = L.challenges[idx];
  const a = att(ch.id);
  let entry = S.done[ch.id];
  let selected = null;
  const wrong = new Set();
  const optsEl = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Answer options' });
  const fb = h('div', { 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn', disabled: true, onclick: () => check() }, 'Check answer');

  function drawOpts() {
    optsEl.replaceChildren();
    ch.options.forEach((o, i) => {
      const isRight = entry && i === ch.answer;
      optsEl.append(h('button', {
        class: 'opt' + (isRight ? ' right' : '') + (wrong.has(i) ? ' wrong' : '') + (selected === i && !entry && !wrong.has(i) ? ' sel' : ''),
        role: 'radio', 'aria-checked': String(selected === i), disabled: !!entry || wrong.has(i),
        onclick: () => { selected = i; checkBtn.disabled = false; drawOpts(); }
      }, h('span', { class: 'l' }, 'ABCD'[i]), h('span', null, o)));
    });
  }
  function showFeedback(justNow) {
    const nt = nextTarget(L, idx);
    fb.replaceChildren(h('div', { class: 'feedback good' }, h('b', null, justNow ? 'Correct' : 'Answer: ' + 'ABCD'[ch.answer]), h('span', { html: ch.explain }), h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: nt.go }, nt.label, icon('arrow', 15)))));
  }
  function check() {
    if (selected === null) return;
    if (selected === ch.answer) {
      const total = mcqBase(ch, a);
      entry = { xp: total, hints: 0, fails: a.fails, mcq: true, at: Date.now() };
      markDone(ch.id, entry);
      award(total); afterComplete(L);
      checkBtn.hidden = true; drawOpts(); showFeedback(true);
    } else {
      a.fails++; save(); wrong.add(selected); selected = null; checkBtn.disabled = true; drawOpts();
      fb.replaceChildren(h('div', { class: 'feedback bad' }, h('b', null, 'Not quite'), 'Trace the code line by line, then try another option.'));
    }
  }
  const brief = h('section', { class: 'brief' }, briefMeta(ch, entry), h('h2', null, ch.title), h('div', { html: rich(ch.prompt) }), codeBlock(ch.code));
  const bench = h('section', { class: 'bench' }, optsEl, h('div', null, checkBtn), fb);
  root.append(h('div', { class: 'work' }, brief, bench));
  drawOpts();
  if (entry) { checkBtn.hidden = true; showFeedback(false); }
}
