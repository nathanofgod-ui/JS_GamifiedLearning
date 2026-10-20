// Every lesson, in course order, plus tier metadata. Add a lesson: create its file, import it here, add it to its tier.
import typesLesson from './tier1/01-types.js';
import coercionLesson from './tier1/02-coercion.js';
import nullishLesson from './tier1/03-nullish.js';
import scopeLesson from './tier1/04-scope.js';
import closuresLesson from './tier1/05-closures.js';
import thisLesson from './tier1/06-this.js';
import arraysLesson from './tier1/07-arrays.js';
import stateLesson from './tier1/08-state.js';
import protoLesson from './tier2/09-proto.js';
import classesLesson from './tier2/10-classes.js';
import modulesLesson from './tier2/11-modules.js';
import eventsLesson from './tier2/12-events.js';
import routerLesson from './tier2/13-router.js';
import selectorsLesson from './tier2/14-selectors.js';
import renderLesson from './tier2/15-render.js';
import placement from './placement.js';

export const tiers = [
  {
    n: 1, title: 'Core Logic & State', live: true,
    sub: 'Types, scope, closures, this, arrays and an immutable store',
    capstone: 'Board, part 1: data helpers and a working state store', board: 'board',
    parts: [['arr-groupby', 'groupBy'], ['state-update', 'updateCard'], ['state-store', 'createStore']],
    lessons: [typesLesson, coercionLesson, nullishLesson, scopeLesson, closuresLesson, thisLesson, arraysLesson, stateLesson],
  },
  {
    n: 2, title: 'Architecture', live: true,
    sub: 'Prototypes and classes, modules, an event bus, a hash router, memoised selectors and a keyed render loop',
    capstone: 'Board, part 2: a routed, event-driven board with keyed rendering', board: 'board2',
    parts: [['sel-combine', 'combineReducers'], ['sel-create', 'createSelector'], ['ev-bus', 'createEventBus'], ['rt-router', 'createRouter'], ['render-reconcile', 'reconcile']],
    lessons: [protoLesson, classesLesson, modulesLesson, eventsLesson, routerLesson, selectorsLesson, renderLesson],
  },
  { n: 3, title: 'Async & Data', live: false, lessons: [],
    sub: 'Event loop, promises, async/await, AbortController, retries and debouncing',
    capstone: 'Board, part 3: load tasks from a real API with loading and error states' },
  { n: 4, title: 'Browser & Persistence', live: false, lessons: [],
    sub: 'DOM performance, drag and drop, storage, IndexedDB, keyboard and a11y',
    capstone: 'Board, part 4: drag cards between columns, offline storage' },
  { n: 5, title: 'Quality & the Audit', live: false, lessons: [],
    sub: 'Error handling, validation, tests you write yourself, and reviewing AI-written code',
    capstone: 'Board, part 5: tests, hardening, and the final code audit' },
];

export const lessons = tiers.flatMap(t => t.lessons);
export { placement };
