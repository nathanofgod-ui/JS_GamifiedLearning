// Renders a test run.
import { h, icon } from '../dom.js';

export function resultsView(el, res) {
  el.replaceChildren();
  if (res.timeout) { el.append(h('div', { class: 'res-head fail' }, icon('x', 16), 'Timed out'), h('div', { class: 'errbox' }, 'Your code ran for more than 6 seconds. Look for an infinite loop or a recursion with no end.')); return; }
  if (res.error) { el.append(h('div', { class: 'res-head fail' }, icon('x', 16), 'Your code could not run'), h('div', { class: 'errbox' }, res.error)); }
  else {
    const passed = res.tests.filter(t => t.pass).length;
    el.append(h('div', { class: 'res-head ' + (res.ok ? 'pass' : 'fail') }, icon(res.ok ? 'check' : 'x', 16), res.ok ? 'All ' + res.tests.length + ' tests pass' : passed + ' of ' + res.tests.length + ' tests pass'),
      h('ul', { class: 'res-list' }, res.tests.map(t => h('li', { class: t.pass ? 'pass' : 'fail' }, icon(t.pass ? 'check' : 'x', 14), h('div', null, t.name), t.pass ? null : h('pre', null, t.msg)))));
  }
  if (res.logs && res.logs.length) el.append(h('div', { class: 'consolebox' }, h('b', null, 'Console'), res.logs.map(l => h('div', null, l))));
}
