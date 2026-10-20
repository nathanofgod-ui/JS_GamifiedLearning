// Runs in a dedicated module worker so learner code can't touch the page and can be killed on timeout.
import { runSuite } from './suite.js';

self.onmessage = async e => {
  const result = await runSuite(e.data.code, e.data.tests);
  self.postMessage(result);
};
