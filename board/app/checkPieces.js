// Runs each piece's hidden tests (the same ones the app uses) against your modules.
// Shared by the browser checker (check.worker.js) and `npm run test:board` (test/pieces.test.js).
import { runSuite } from '../../src/runner/suite.js';
import { lessons } from '../../content/index.js';
import { PIECES } from '../pieces.js';

const challenge = id => lessons.flatMap(l => l.challenges).find(c => c.id === id);

export async function checkPiece(piece, mine) {
  const ch = challenge(piece.id);
  const inject = Object.fromEntries(piece.names.map(n => [n, mine[n]]));
  const res = await runSuite('', ch.tests, inject);
  const notStarted = !!res.error && /Not implemented yet/.test(res.error)
    || (res.tests.length > 0 && res.tests.every(t => !t.pass && /Not implemented yet/.test(t.msg)));
  return { ...piece, title: ch.title, ok: res.ok, notStarted, error: res.error, tests: res.tests };
}

export async function checkPieces(mine) {
  const out = [];
  for (const piece of PIECES) out.push(await checkPiece(piece, mine));
  return out;
}
