// The editor + run + explain + claim workflow shared by code challenges and AI reviews.
import { h, icon, toast } from '../dom.js';
import { codeBlock } from '../highlight.js';
import { award } from '../rewards.js';
import { execute } from '../runner/execute.js';
import { att, codeBase, DIAG_COST, EXPLAIN_BONUS, has, HINT_COST, hintPenalty, markDone, S, save } from '../state.js';
import { makeEditor } from './editor.js';
import { resultsView } from './results.js';
import { afterComplete, nextTarget } from '../views/kit.js';

export function codeBench(ch, L, idx, starter, hintsEl) {
  const a = att(ch.id);
  let entry = S.done[ch.id];
  const resultsEl = h('div', { class: 'results', 'aria-live': 'polite' });
  const claimEl = h('div');
  let draftTimer = null;

  const ed = makeEditor(entry ? entry.code : (S.drafts[ch.id] != null ? S.drafts[ch.id] : starter), {
    onChange: v => { clearTimeout(draftTimer); draftTimer = setTimeout(() => { if (!has(ch.id)) { S.drafts[ch.id] = v; save(); } }, 400); },
    onRun: () => run()
  });
  const runBtn = h('button', { class: 'btn', onclick: () => run() }, icon('play', 15), 'Run tests');
  let armed = false;
  const resetBtn = h('button', { class: 'btn ghost sm', onclick: () => {
    if (!armed) { armed = true; resetBtn.lastChild.textContent = 'Click again to confirm'; setTimeout(() => { armed = false; resetBtn.lastChild.textContent = 'Reset'; }, 2500); return; }
    armed = false; resetBtn.lastChild.textContent = 'Reset'; ed.value = starter; delete S.drafts[ch.id]; save(); resultsEl.replaceChildren();
  } }, icon('reset', 14), h('span', null, 'Reset'));

  function renderHints() {
    hintsEl.replaceChildren();
    if (has(ch.id) || !ch.hints || !ch.hints.length) return;
    for (let i = 0; i < a.hints; i++) hintsEl.append(h('div', { class: 'hint' }, h('b', null, 'Hint ' + (i + 1)), h('span', { html: ch.hints[i] })));
    if (a.hints < ch.hints.length) {
      const cost = HINT_COST[a.hints] || 15;
      hintsEl.append(h('div', { style: 'margin-top:10px' }, h('button', { class: 'btn ghost sm', onclick: () => { a.hints++; save(); renderHints(); } }, icon('bulb', 14), 'Reveal hint ' + (a.hints + 1) + ' (−' + cost + ' XP)')));
    }
    if (!a.hints) hintsEl.prepend(h('p', { class: 'muted', style: 'font-size:13.5px;margin:0' }, 'Stuck? Hints cost XP. Struggling a little first is the point.'));
  }

  async function run() {
    runBtn.disabled = true;
    const code = ed.value;
    const res = await execute(code, ch.tests);
    runBtn.disabled = false;
    resultsView(resultsEl, res);
    if (has(ch.id)) { if (res.ok) toast('Still passing', 'check'); return; }
    if (res.ok) showClaim(code);
    else { claimEl.replaceChildren(); a.fails++; save(); }
  }

  function showClaim(code) {
    const ta = h('textarea', { id: 'explain-' + ch.id, placeholder: ch.type === 'review' ? 'The bug was... my fix works because...' : 'Because...', 'aria-label': 'Explain why your solution works' });
    const count = h('span', { class: 'count' }, '0 / 20 characters');
    const btn = h('button', { class: 'btn', disabled: true, onclick: () => {
      const total = codeBase(ch, a) + EXPLAIN_BONUS;
      entry = { xp: total, hints: a.hints, fails: a.fails, code, explain: ta.value.trim(), at: Date.now() };
      if (ch.type === 'review') { entry.review = true; entry.diagFails = a.diagFails || 0; }
      markDone(ch.id, entry);
      delete S.drafts[ch.id];
      award(total);
      afterComplete(L);
      renderHints();
      showDone(true);
    } }, icon('bolt', 15), 'Claim XP');
    ta.addEventListener('input', () => { const n = ta.value.trim().length; count.textContent = n + ' / 20 characters'; btn.disabled = n < 20; });
    claimEl.replaceChildren(h('div', { class: 'claim' },
      h('h4', null, 'Passed. Now say why.'),
      h('p', { class: 'muted', style: 'margin:0;font-size:14px' }, ch.type === 'review' ? 'In your own words: what exactly was broken, and why does your fix hold up?' : 'In your own words, why does your solution work? Which language feature is doing the heavy lifting?'),
      ta,
      h('div', { class: 'row' }, count, btn)));
  }

  function showDone(justNow) {
    const nt = nextTarget(L, idx);
    const parts = [];
    if (justNow) {
      parts.push(h('div', { class: 'reward' },
        h('span', null, 'Base ', h('b', null, ch.xp)),
        entry.diagFails ? h('span', null, 'Misdiagnoses −' + DIAG_COST * entry.diagFails) : null,
        entry.hints ? h('span', null, 'Hints −' + hintPenalty(entry.hints)) : null,
        entry.fails ? h('span', null, 'Failed runs −' + Math.min(10, entry.fails * 2)) : null,
        h('span', null, 'Explanation +' + EXPLAIN_BONUS),
        h('span', null, 'Total ', h('b', null, entry.xp + ' XP'))));
    }
    claimEl.replaceChildren(h('div', null,
      parts,
      h('details', { class: 'sol', open: justNow }, h('summary', null, 'Compare with a reference solution'),
        codeBlock(ch.solution), h('p', { class: 'why', html: ch.why }),
        entry.explain ? h('p', { class: 'muted', style: 'font-size:13.5px' }, 'Your explanation: ' + entry.explain) : null),
      h('div', { class: 'done-actions', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: nt.go }, nt.label, icon('arrow', 15)))));
  }

  const bench = h('div', { class: 'bench-inner' },
    h('div', { class: 'toolbar' }, runBtn, resetBtn, h('span', { class: 'grow' }), h('span', { class: 'kbdhint' }, h('kbd', null, 'Ctrl'), ' + ', h('kbd', null, 'Enter'), ' runs')),
    ed.el, resultsEl, claimEl);
  renderHints();
  if (entry) showDone(false);
  return bench;
}
