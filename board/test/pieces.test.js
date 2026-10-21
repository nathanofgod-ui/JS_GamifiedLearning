// npm run test:board
// One test per Board piece, with one subtest per hidden test. Same tests as the challenges in the app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mine from '../src/index.js';
import { PIECES } from '../pieces.js';
import { checkPiece } from '../app/checkPieces.js';

for (const piece of PIECES) {
  test(piece.names.join(', ') + '  (' + piece.file + ')', async t => {
    const r = await checkPiece(piece, mine);
    if (r.notStarted) return t.todo('not implemented yet: ' + piece.where);
    if (r.error) assert.fail(r.error);
    for (const one of r.tests) {
      await t.test(one.name, () => { if (!one.pass) assert.fail(one.msg); });
    }
  });
}
