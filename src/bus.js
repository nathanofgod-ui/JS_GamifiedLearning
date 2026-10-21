// One app-wide bus for notifications ("render this view", "progress changed").
// It lets low-level modules announce things without importing the UI, which keeps the import graph acyclic.
import { createEventBus } from './lib/eventBus.js';

export const bus = createEventBus({ onError: (err, type) => console.error('[bus] listener for "' + type + '" failed:', err) });
