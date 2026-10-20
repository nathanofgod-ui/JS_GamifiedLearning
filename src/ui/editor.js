// The code editor: a textarea over highlighted code. No autocomplete, on purpose.
import { h } from '../dom.js';
import { highlight } from '../highlight.js';

export function makeEditor(initial, opts) {
  const gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
  const codeEl = h('code');
  const pre = h('pre', { 'aria-hidden': 'true' }, codeEl);
  const ta = h('textarea', { spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Code editor. Press Escape then Tab to leave.' });
  ta.value = initial;
  const root = h('div', { class: 'editor' }, gutter, pre, ta);
  let lines = 0, trap = true;
  function sync() {
    const v = ta.value;
    codeEl.innerHTML = highlight(v) + '\n ';
    const n = v.split('\n').length;
    if (n !== lines) { lines = n; gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); }
  }
  function insert(text) {
    ta.focus();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) {}
    if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
  }
  ta.addEventListener('input', () => { sync(); opts.onChange && opts.onChange(ta.value); });
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; });
  ta.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); opts.onRun && opts.onRun(); return; }
    if (e.key === 'Escape') { trap = false; return; }
    if (e.key === 'Tab' && !e.shiftKey && trap) { e.preventDefault(); insert('  '); return; }
    if (e.key !== 'Tab' && e.key !== 'Shift') trap = true;
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const indent = /^[ \t]*/.exec(v.slice(ls, s))[0];
      const before = s > 0 ? v[s - 1] : '', after = v[en] || '';
      const open = '{(['.indexOf(before) !== -1 && before !== '';
      e.preventDefault();
      if (open && after && '})]'.indexOf(after) !== -1) {
        insert('\n' + indent + '  \n' + indent);
        const pos = s + 1 + indent.length + 2;
        ta.setSelectionRange(pos, pos);
      } else insert('\n' + indent + (open ? '  ' : ''));
    }
  });
  sync();
  return {
    el: root,
    get value() { return ta.value; },
    set value(v) { ta.value = v; sync(); ta.scrollTop = 0; pre.scrollTop = 0; gutter.scrollTop = 0; },
    focus() { ta.focus(); }
  };
}
