// A small syntax highlighter for code samples and the editor.
import { h } from './dom.js';

export const KW = new Set('const let var function return if else for while do break continue switch case default new class extends super this typeof instanceof in of try catch finally throw async await yield import export from null undefined true false void delete static get set'.split(' '));

export function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export function highlight(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b)|([A-Za-z_$#][\w$]*)(\s*\()?/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="tok-n">' + m[3] + '</span>';
    else if (KW.has(m[4])) out += '<span class="tok-k">' + m[4] + '</span>' + esc(m[5] || '');
    else if (m[5]) out += '<span class="tok-f">' + m[4] + '</span>' + esc(m[5]);
    else out += esc(m[4]);
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

export function rich(html) {
  return html.split(/^~~~[ \t]*$/m).map((p, i) =>
    i % 2 ? '<pre class="code"><code>' + highlight(p.replace(/^\n|\n$/g, '')) + '</code></pre>' : p).join('');
}

export function codeBlock(src) { return h('pre', { class: 'code', html: '<code>' + highlight(src) + '</code>' }); }
