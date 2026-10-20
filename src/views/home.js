// The roadmap.
import { ALL, BY_ID, tierItems, tierLessons, TIERS } from '../content.js';
import { h, icon, toast } from '../dom.js';
import { go, rerender } from '../nav.js';
import { doneList, dueIds, exportProgress, has, importProgress, INTERVALS, isPlaced, lessonDone, S, streakNow } from '../state.js';
import { checkBadges } from '../rewards.js';
import { entryStep, nextUp } from './kit.js';

export function renderHome(root) {
  const doneN = doneList().length, total = ALL.length;
  const nx = nextUp();
  const due = dueIds().length;
  const cta = h('div', { class: 'cta' });
  if (nx) cta.append(h('button', { class: 'btn', onclick: () => go({ name: 'lesson', id: nx.L.id, step: doneN === 0 ? entryStep(nx.L) : nx.step }) }, doneN === 0 ? 'Start lesson 1' : 'Continue: ' + nx.L.title, icon('arrow', 16)));
  else cta.append(h('button', { class: 'btn', onclick: () => go({ name: 'board2' }) }, 'Open your Board', icon('arrow', 16)));
  if (due) cta.append(h('button', { class: 'btn ghost', onclick: () => go({ name: 'review' }) }, icon('repeat', 16), 'Review ' + due + ' due'));
  cta.append(h('button', { class: 'btn ghost', onclick: () => go({ name: 'badges' }) }, icon('shield', 16), 'Badges'));

  const inRotation = Object.keys(S.srs).filter(id => BY_ID.has(id) && has(id)).length;
  const reviewTool = h('div', { class: 'tool' },
    h('div', { class: 'tool-h' }, icon('repeat', 18), h('h3', null, 'Review queue')),
    h('p', null, due ? due + ' item' + (due === 1 ? '' : 's') + ' due today. Finished challenges come back after 1, 3, 7, 14, 30 and 60 days; a miss sends one back to tomorrow.' : inRotation ? 'Nothing due today. ' + inRotation + ' items in rotation; they come back as their intervals run out.' : 'Every challenge you finish joins the queue and comes back the next day, then at growing intervals.'),
    boxStrip(),
    h('button', { class: 'btn sm' + (due ? '' : ' ghost'), onclick: () => go({ name: 'review' }) }, due ? 'Start review' : 'Open the queue', icon('arrow', 14)));
  const placeTool = h('div', { class: 'tool' },
    h('div', { class: 'tool-h' }, icon('target', 18), h('h3', null, 'Placement test')),
    h('p', null, 'Already solid on some topics? Two predict-the-output questions per lesson; get both right and that lesson is marked tested out. Board pieces still have to be written by you.'),
    h('div', { class: 'tool-acts' }, TIERS.filter(t => t.live).map(t => {
      const ls = tierLessons(t.n), placedN = ls.filter(isPlaced).length;
      return h('button', { class: 'btn ghost sm', onclick: () => go({ name: 'placement', tier: t.n }) }, 'Tier ' + t.n + ': ' + t.title, placedN ? h('span', { class: 'muted' }, ' · ' + placedN + ' out') : null);
    })));

  root.append(h('div', { class: 'wrap' },
    h('section', { class: 'hero' },
      h('div', null,
        h('h1', null, 'Learn JavaScript by writing it.'),
        h('p', { class: 'lead' }, 'Blank editor, hidden tests, no autocomplete. You build real utilities, audit code an AI got subtly wrong, and assemble it all into a project you understand line by line. Everything here is vanilla JavaScript.'),
        cta),
      h('div', { class: 'stats' },
        h('div', null, h('b', null, S.xp), h('span', null, 'XP')),
        h('div', null, h('b', null, doneN + '/' + total), h('span', null, 'Challenges')),
        h('div', null, h('b', null, streakNow()), h('span', null, 'Day streak')))),
    h('ul', { class: 'rules' },
      h('li', null, h('b', null, 'Try before you peek'), 'Hints cost XP and the reference solution only appears after your own code passes.'),
      h('li', null, h('b', null, 'Explain every pass'), 'To claim XP you write why your solution works. Understanding beats copying.'),
      h('li', null, h('b', null, 'Audit the machine'), 'AI review challenges hand you plausible code with a real bug. Name the bug, then fix it against hidden tests.'),
      h('li', null, h('b', null, 'Ship something'), 'Challenges marked as Board pieces are reused in the capstone project.')),
    h('section', { class: 'tools' }, reviewTool, placeTool),
    TIERS.map(t => renderTier(t)),
    progressPanel()));
}

export function boxStrip() {
  const counts = INTERVALS.map(() => 0);
  Object.keys(S.srs).forEach(id => { if (BY_ID.has(id) && has(id)) counts[S.srs[id].box]++; });
  const max = Math.max(1, ...counts);
  return h('div', { class: 'boxes', role: 'img', 'aria-label': 'Items per memory box: ' + counts.map((c, i) => INTERVALS[i] + ' day ' + c).join(', ') },
    counts.map((c, i) => h('div', { class: 'box' },
      h('span', { class: 'n' }, c),
      h('i', { style: 'height:' + Math.max(3, Math.round((c / max) * 34)) + 'px;opacity:' + (0.35 + (i / (INTERVALS.length - 1)) * 0.65) }),
      h('span', { class: 'd' }, INTERVALS[i] + 'd'))));
}

export function renderTier(t) {
  const sec = h('section', { class: 'tier' + (t.live ? '' : ' soon') });
  const items = tierItems(t.n);
  const doneN = items.filter(x => has(x.c.id)).length;
  sec.append(h('div', { class: 'tier-head' },
    h('span', { class: 'tn' }, 'Tier ' + t.n),
    h('h2', null, t.title),
    h('span', { class: 'tp' }, t.live ? doneN + '/' + items.length : 'Coming next'),
    h('p', null, t.sub)));
  if (!t.live) { sec.append(h('div', { class: 'soon-cap' }, icon('lock', 15), t.capstone)); return sec; }
  const ol = h('ol', { class: 'lessons' });
  tierLessons(t.n).forEach(L => {
    const finished = lessonDone(L), placed = !finished && isPlaced(L);
    ol.append(h('li', null, h('button', { class: 'lesson-row' + (finished ? ' done' : '') + (placed ? ' placed' : ''), onclick: () => go({ name: 'lesson', id: L.id, step: entryStep(L) }) },
      h('span', { class: 'num' }, finished ? icon('check', 22) : String(L.n).padStart(2, '0')),
      h('span', null, h('h3', null, L.title, placed ? h('span', { class: 'tag out' }, 'Tested out') : null), h('p', null, L.blurb)),
      h('span', { class: 'pips', 'aria-label': L.challenges.filter(c => has(c.id)).length + ' of ' + L.challenges.length + ' done' },
        L.challenges.map(c => h('i', { class: 'pip' + (has(c.id) ? ' on' : '') + (c.boss ? ' boss' : '') + (c.type === 'review' ? ' ai' : '') }))),
      h('span', { class: 'go' }, icon('arrow', 18)))));
  });
  sec.append(ol);
  const prior = t.n > 1 ? TIERS.filter(x => x.n < t.n && x.parts).flatMap(x => x.parts) : [];
  const ready = [...prior, ...t.parts].every(p => has(p[0]));
  const anyPlaced = tierLessons(t.n).some(L => isPlaced(L) && !lessonDone(L));
  sec.append(h('div', { class: 'capcard' },
    h('div', null, h('h3', null, 'Capstone: ' + t.capstone),
      h('p', null, ready ? 'Every piece is yours. Open the board and drive it with the code you wrote.'
        : 'Finish these challenges to unlock a board that runs on your own code.' + (prior.length ? ' It also uses your Tier ' + (t.n - 1) + ' pieces.' : '') + (anyPlaced ? ' Testing out of a lesson does not write its Board piece for you.' : '')),
      h('div', { class: 'parts' }, [...t.parts, ...prior.filter(p => !has(p[0]))].map(p => h('span', { class: 'part' + (has(p[0]) ? ' on' : '') }, has(p[0]) ? icon('check', 13) : icon('lock', 13), p[1])))),
    h('button', { class: 'btn', disabled: !ready, onclick: () => go({ name: t.board }) }, icon('layers', 16), 'Open the Board')));
  return sec;
}

// Progress is stored per browser and per site, so moving between the published artifact,
// localhost and GitHub Pages needs an explicit export/import.
function progressPanel() {
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      importProgress(await f.text());
      checkBadges();
      toast('Progress imported', 'check');
      rerender();
    } catch (e) {
      toast(e.message || 'Could not read that file', 'x');
    }
    file.value = '';
  });
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'js-forge-progress-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return h('section', { class: 'progress-io' },
    h('div', null, h('h3', null, 'Your progress'),
      h('p', null, 'Saved in this browser only (' + S.xp + ' XP, ' + doneList().length + ' challenges). Export it to move between devices, or between the hosted app and your local copy.')),
    h('div', { class: 'tool-acts' },
      h('button', { class: 'btn ghost sm', onclick: download }, icon('arrow', 14), 'Export'),
      h('button', { class: 'btn ghost sm', onclick: () => file.click() }, icon('reset', 14), 'Import'),
      file));
}
