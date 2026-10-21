# Board

A kanban board with no framework and no dependencies, where every moving part is a module I wrote:

| Concern | Module | What it does |
| --- | --- | --- |
| State | [`createStore`](src/createStore.js) | Holds state in a closure and notifies subscribers only when the state actually changes |
| State | [`combineReducers`](src/combineReducers.js) | Splits state into `{ board, ui }` slices and returns the same object when nothing changed |
| State | [`updateCard`](src/updateCard.js) | Updates a card immutably, with structural sharing |
| Derived data | [`createSelector`](src/createSelector.js) | Memoised filtering, sorting and counts |
| Derived data | [`groupBy`](src/groupBy.js) | Counts cards by priority |
| Events | [`createEventBus`](src/createEventBus.js) | Lets actions announce what happened; the activity feed listens with a `*` wildcard |
| Routing | [`matchRoute`](src/matchRoute.js), [`createRouter`](src/createRouter.js) | `#/priority/high?sort=priority`, `#/card/7`, a not-found view; Back, reload and shared links all work |
| Rendering | [`lis`](src/lis.js), [`reconcile`](src/reconcile.js) | Keyed list diffing that moves as few DOM nodes as possible (longest increasing subsequence) |

The glue code, which is also part of the project, is in [`app/`](app/): the board reducer, the sample data and the view in `kanban.js`.

## Building it

Every file in `src/` starts as a stub that throws `Not implemented yet`. Each one is a challenge in JS Forge, with the same spec and the same hidden tests.

```sh
npm run test:board   # pieces you haven't started show as TODO; started ones run every hidden test
npm start            # then open http://localhost:5173/board/
```

The page checks every piece first, in a worker so an infinite loop can't hang it. Until all ten pass it shows a checklist with the first failing tests. Once they all pass, the board mounts on your code. If one of your pieces throws while you use the board, the error is shown on the page rather than swallowed. If your `reconcile` leaves a column out of order, that column is rebuilt and the board tells you.

`createRouter` imports your `matchRoute`, and `reconcile` imports your `lis`, as real modules. The course challenges have you paste them in instead.

## Coming with the next tiers

- **Tier 3**: load tasks from an API, with loading and error states, cancellation and retries.
- **Tier 4**: drag and drop, keyboard support, and persistence in `localStorage` and then IndexedDB.
- **Tier 5**: your own tests, hardening, and a final audit of AI-written code.
