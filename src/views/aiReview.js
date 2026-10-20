// AI review: diagnose plausible-but-wrong code, then fix it.
import { h, icon, shuffled, toast } from '../dom.js';
import { codeBlock, rich } from '../highlight.js';
import { att, DIAG_COST, S, save } from '../state.js';
import { codeBench } from '../ui/codeBench.js';
import { briefMeta } from './kit.js';

export function renderAIReview(root, L, idx) {
  const ch = L.challenges[idx];
  const a = att(ch.id);
  const entry = S.done[ch.id];
  const diagnosed = () => !!(a.diag || entry);
  const hintsEl = h('div', { class: 'hints' });
  const diagEl = h('div', { class: 'stage' });
  const fixEl = h('div', { class: 'stage' });

  const brief = h('section', { class: 'brief' }, briefMeta(ch, entry), h('h2', null, ch.title),
    h('div', { html: rich(ch.context) }),
    h('div', { class: 'aicode' }, h('div', { class: 'aicode-h' }, icon('bot', 14), 'What the assistant wrote'), codeBlock(ch.code)),
    h('div', { class: 'spec', html: rich(ch.prompt) }),
    hintsEl);

  const order = shuffled(ch.options.length);
  const wrong = new Set();
  let selected = null;
  function drawDiag() {
    diagEl.replaceChildren(h('p', { class: 'stage-h' }, 'Step 1 of 2 · Diagnose'), h('p', { class: 'q' }, ch.question));
    const opts = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Diagnosis options' });
    order.forEach((oi, pos) => {
      const right = diagnosed() && oi === ch.answer;
      opts.append(h('button', {
        class: 'opt prose' + (right ? ' right' : '') + (wrong.has(oi) ? ' wrong' : '') + (selected === oi && !diagnosed() ? ' sel' : ''),
        role: 'radio', 'aria-checked': String(selected === oi), disabled: diagnosed() || wrong.has(oi),
        onclick: () => { selected = oi; drawDiag(); }
      }, h('span', { class: 'l' }, 'ABCD'[pos]), h('span', null, ch.options[oi])));
    });
    diagEl.append(opts);
    if (diagnosed()) {
      diagEl.append(h('div', { class: 'feedback good' }, h('b', null, 'That\'s the bug'), h('span', { html: ch.diagnosis })));
    } else {
      const check = h('button', { class: 'btn', disabled: selected === null, onclick: () => {
        if (selected === ch.answer) {
          a.diag = true; save(); drawDiag(); drawFix();
          toast('Bug spotted. Now fix it.', 'search');
        } else {
          a.diagFails = (a.diagFails || 0) + 1; wrong.add(selected); selected = null; save(); drawDiag();
          diagEl.append(h('div', { class: 'feedback bad' }, h('b', null, 'Not that one'), 'Read the spec again and trace the code with an input that should work. (−' + DIAG_COST + ' XP)'));
        }
      } }, 'Lock in diagnosis');
      diagEl.append(h('div', null, check));
    }
  }
  function drawFix() {
    if (!diagnosed()) { fixEl.replaceChildren(h('p', { class: 'stage-h muted' }, 'Step 2 of 2 · Fix it'), h('p', { class: 'muted', style: 'font-size:14px' }, 'Diagnose first. The editor opens with the assistant\'s code once you have named the bug.')); return; }
    fixEl.replaceChildren(h('p', { class: 'stage-h' }, 'Step 2 of 2 · Fix it'),
      h('p', { class: 'muted', style: 'font-size:14px;margin-top:-4px' }, 'Change the assistant\'s code until it meets the spec. The hidden tests check the spec, not the diagnosis.'),
      codeBench(ch, L, idx, ch.code, hintsEl));
  }
  drawDiag(); drawFix();
  root.append(h('div', { class: 'work' }, brief, h('section', { class: 'bench' }, diagEl, fixEl)));
}
