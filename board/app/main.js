// Board entry point: check your pieces first, then mount the board on them.
import { h, icon } from './dom.js';
import { mountKanban } from './kanban.js';

const main = document.querySelector('#main');

function checkInWorker(timeoutMs = 8000) {
  return new Promise(resolve => {
    const worker = new Worker(new URL('./check.worker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); resolve({ error: 'Checking took longer than ' + timeoutMs / 1000 + ' seconds. One of your pieces probably never returns (an infinite loop?). Run npm run test:board to find it.' }); }, timeoutMs);
    worker.onmessage = e => { clearTimeout(timer); worker.terminate(); resolve(e.data); };
    worker.onerror = e => { e.preventDefault(); clearTimeout(timer); worker.terminate(); resolve({ error: e.message || 'Your modules could not be loaded. Look for a syntax error or a missing export in board/src.' }); };
  });
}

function checklist(results) {
  return h('ul', { class: 'checklist' }, results.map(r => {
    const failed = r.error || r.tests.filter(t => !t.pass);
    const state = r.ok ? 'ok' : r.notStarted ? 'todo' : 'bad';
    return h('li', null,
      h('span', { class: state }, icon(r.ok ? 'check' : r.notStarted ? 'lock' : 'x', 16)),
      h('span', null, h('b', null, r.names.join(', ')), ' · ' + r.where, h('span', { class: 'file' }, 'board/src/' + r.file)),
      h('span', { class: 'st ' + state }, r.ok ? r.tests.length + '/' + r.tests.length + ' tests' : r.notStarted ? 'not started' : (r.error ? 'error' : (r.tests.length - failed.length) + '/' + r.tests.length + ' tests')),
      !r.ok && !r.notStarted ? h('pre', null, r.error ? r.error : failed.slice(0, 3).map(t => t.name + '\n' + t.msg).join('\n\n')) : null);
  }));
}

async function start() {
  main.replaceChildren(
    h('div', { class: 'board-head' }, h('h1', null, 'Board'), h('a', { href: '../' }, 'Open JS Forge')),
    h('p', { class: 'muted' }, 'Checking your pieces against the hidden tests…'));
  const res = await checkInWorker();
  if (res.error) {
    main.append(h('div', { class: 'errbox board-err' }, res.error));
    return;
  }
  const done = res.results.filter(r => r.ok).length;
  const ready = done === res.results.length;
  main.replaceChildren(h('div', { class: 'board-head' }, h('h1', null, 'Board'), h('a', { href: '../' }, 'Open JS Forge')));
  if (!ready) {
    main.append(
      h('p', { style: 'max-width:70ch' }, 'This board runs entirely on modules you write in board/src. ' + done + ' of ' + res.results.length + ' pieces pass their tests so far. Each one is a challenge in JS Forge; solve it there, then write it here as a real module (or the other way round), and check with npm run test:board.'),
      checklist(res.results));
    return;
  }
  const mount = h('div');
  main.append(
    h('details', { class: 'pieces' }, h('summary', null, 'All ' + done + ' pieces pass their tests'), checklist(res.results)),
    mount);
  try {
    const mine = await import('../src/index.js');
    mountKanban(mount, mine);
  } catch (e) {
    mount.append(h('div', { class: 'errbox board-err' }, 'The board crashed while starting: ' + (e && e.message || e)));
    console.error(e);
  }
}

start();
