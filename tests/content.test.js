// npm test
// Guards the course content: every reference solution passes its hidden tests, every starter and every
// flawed AI snippet fails them, and every predict-the-output answer matches what the code really prints.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lessons, placement, tiers } from '../content/index.js';
import { runSuite } from '../src/runner/suite.js';

const challenges = lessons.flatMap(l => l.challenges.map(c => ({ ...c, lesson: l.id })));

// ---------- running predict-the-output code ----------
// Each snippet runs in its own Node process, so global state and asynchronous errors can't leak between them.
const PRINTER = `
const show = v => typeof v === 'string' ? v
  : Array.isArray(v) ? '[' + v.map(x => (typeof x === 'string' ? JSON.stringify(x) : show(x))).join(', ') + ']'
  : String(v);
const lines = [];
const con = { log: (...args) => lines.push(args.map(show).join(' ')) };
const code = require('fs').readFileSync(0, 'utf8');
try { new Function('console', code)(con); } catch (e) { lines.push('THREW ' + e.constructor.name + ': ' + e.message); }
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', () => {});          // listener errors EventTarget reports later
setTimeout(() => process.stdout.write(lines.join(', then ')), 5);
`;
function printed(code) {
  return execFileSync(process.execPath, ['--input-type=commonjs', '-e', PRINTER], { input: code, encoding: 'utf8' });
}

// Questions spread across several ES module files: run them as real modules.
// Each maps to the outcome that the correct option describes.
const MODULE_QUESTIONS = {
  'mod-live': { stdout: '2' },
  'mod-once': { stdout: 'store init\n2' },
  'placement:modules:0': { error: 'TypeError' },
  'placement:modules:1': { error: 'ReferenceError' },
};
const isModuleCode = code => /^\/\/ [\w-]+\.js$/m.test(code);
function runModules(code) {
  const dir = mkdtempSync(join(tmpdir(), 'jsforge-'));
  try {
    const files = code.split(/^\/\/ ([\w-]+\.js)$/m).slice(1);
    for (let i = 0; i < files.length; i += 2) writeFileSync(join(dir, files[i]), files[i + 1]);
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    try { return { stdout: execFileSync(process.execPath, [join(dir, 'main.js')], { encoding: 'utf8', stdio: 'pipe' }).trim() }; }
    catch (e) { return { error: (/^(\w*Error)/m.exec(String(e.stderr)) || [])[1] || 'unknown' }; }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
async function checkPredict(key, q) {
  if (isModuleCode(q.code)) {
    const expected = MODULE_QUESTIONS[key];
    assert.ok(expected, 'add an expected outcome for module question ' + key);
    assert.deepEqual(runModules(q.code), expected);
    return;
  }
  if (q.prompt && !/What does this print|What is the value/.test(q.prompt)) return;   // reasoning questions, not runnable
  const out = printed(q.code + '\n' + (q.probe || ''));
  assert.equal(out, q.options[q.answer], 'the marked answer should be what the code prints');
}

// ---------- structure ----------
describe('structure', () => {
  test('challenge ids are unique', () => {
    const ids = challenges.map(c => c.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  });
  test('lesson numbers run in order', () => assert.deepEqual(lessons.map(l => l.n), lessons.map((_, i) => i + 1)));
  test('every live lesson has placement questions', () => {
    for (const l of lessons) assert.equal(placement[l.id]?.length, 2, l.id);
  });
  test('capstone parts point at real challenges', () => {
    for (const t of tiers.filter(t => t.live)) for (const [id] of t.parts) assert.ok(challenges.some(c => c.id === id), id);
  });
  test('answers point at real options', () => {
    for (const c of challenges.filter(c => c.options)) assert.ok(c.answer >= 0 && c.answer < c.options.length, c.id);
  });
});

// ---------- code challenges and AI reviews ----------
describe('code challenges', () => {
  for (const c of challenges.filter(c => c.type === 'code' || c.type === 'review')) {
    test(c.id + ': reference solution passes', async () => {
      const r = await runSuite(c.solution, c.tests);
      assert.equal(r.error, null);
      assert.deepEqual(r.tests.filter(t => !t.pass).map(t => t.name + ': ' + t.msg), []);
    });
    test(c.id + ': ' + (c.type === 'review' ? 'the flawed AI code fails' : 'the starter fails'), async () => {
      const r = await runSuite(c.type === 'review' ? c.code : c.starter, c.tests);
      assert.equal(r.ok, false);
    });
  }
});

// ---------- predict the output ----------
describe('predict-the-output answers', () => {
  for (const c of challenges.filter(c => c.type === 'mcq')) test(c.id, () => checkPredict(c.id, c));
  for (const [lessonId, qs] of Object.entries(placement)) {
    qs.forEach((q, i) => test('placement ' + lessonId + ' #' + (i + 1), () => checkPredict('placement:' + lessonId + ':' + i, q)));
  }
});
