// Runs learner code against hidden tests in a module worker, with a hard timeout.
// The worker is terminated afterwards, so an infinite loop in learner code can never freeze the page.
import { runSuite } from './suite.js';

export function execute(code, tests) {
  return new Promise(resolve => {
    let worker, done = false, timer = null;
    const finish = r => {
      if (done) return; done = true; clearTimeout(timer);
      try { worker && worker.terminate(); } catch (e) {}
      resolve(r);
    };
    timer = setTimeout(() => finish({ timeout: true }), 6000);
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = e => finish(e.data);
      worker.onerror = e => { e.preventDefault(); finish({ error: e.message || 'The code could not be run.', tests: [], logs: [] }); };
      worker.postMessage({ code, tests });
    } catch (err) {
      runSuite(code, tests).then(finish);
    }
  });
}
