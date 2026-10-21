// Checks your pieces off the main thread, so an infinite loop can't freeze the page.
import * as mine from '../src/index.js';
import { checkPieces } from './checkPieces.js';

checkPieces(mine).then(
  results => self.postMessage({ results }),
  err => self.postMessage({ error: String(err && err.message || err) })
);
