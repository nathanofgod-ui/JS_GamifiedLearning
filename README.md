# JS Forge

Learn serious vanilla JavaScript by writing it. JS Forge is a gamified course for people who already program and want to master the parts that framework work leaves shaky: coercion, scope, closures, `this`, prototypes, modules, the event loop. It also trains you to read AI-generated JavaScript critically, so you don't have to depend on it.

- **Write-the-code challenges** start from a blank stub in an editor with no autocomplete, and hidden tests check them live.
- **AI review challenges** hand you plausible code an assistant wrote, with a real bug in it. You name the bug, then fix it.
- **Explain to claim.** You write why your solution works before you get the XP. Hints cost XP, and the reference solution appears only after your own code passes.
- **A placement test** lets you skip what you already know.
- **A review queue** brings finished challenges back after 1, 3, 7, 14, 30 and 60 days; code challenges come back as a blank editor.
- **A capstone**: a kanban board built from the pieces you write, in [`board/`](board/).

No framework, no dependencies, no build step. It's ES modules all the way down.

## Run it

You need Node 20 or later, and nothing to install.

```sh
npm start          # http://localhost:5173  (the course)  and  /board/  (your board)
npm test           # checks the course content
npm run test:board # checks your board pieces
```

Any static server works (`python3 -m http.server`, for example). Opening `index.html` straight from disk does **not** work, because browsers block ES modules on `file://`.

### Put it online with GitHub Pages

1. Go to **Settings → Pages**.
2. Set **Source: Deploy from a branch**, then choose **main** and **/ (root)**.
3. A minute later the course is at `https://<you>.github.io/<repo>/` and your board is at `.../board/`.

### Your progress

Progress lives in your browser's `localStorage`, separately for each site: the hosted artifact, `localhost` and GitHub Pages each keep their own. Use **Export** and **Import** at the bottom of the roadmap to move it between them. Exported files are git-ignored because they contain your solutions.

## How it fits together

```
index.html            the course shell; loads src/main.js as a module
styles/app.css        all styles (light and dark)
content/              the course itself, one file per lesson
  index.js            tier metadata and lesson order
  tier1/, tier2/      lessons: notes, challenges, hidden tests, reference solutions
  placement.js        placement-test questions
src/
  main.js             entry point: wires the bus to the views
  nav.js              hash routing, so reloads, bookmarks and Back work
  bus.js              app-wide event bus, which keeps the import graph acyclic
  lib/                the app's own event bus and router (the course's reference solutions)
  state.js            progress, XP rules, streaks, spaced-repetition schedule
  rewards.js          badges and XP awards
  runner/             test harness, plus a module worker that runs your code with a timeout
  ui/                 status bar, editor, results, the code-and-claim workbench
  views/              one module per screen
board/                your capstone project (see board/README.md)
tests/                content checks run by npm test and CI
scripts/serve.js      zero-dependency dev server
```

A few design decisions are worth reading the code for:

- **Learner code never runs on the page.** `src/runner/execute.js` starts a module worker, runs the hidden tests there, and terminates it after 6 seconds, so an infinite loop can't freeze the UI.
- **No import cycles.** Low-level modules announce things on `src/bus.js` instead of importing the UI. Lesson 11 of the course explains why.
- **The app runs on the course's own answers.** `src/lib/eventBus.js` and `src/lib/router.js` are the reference solutions to Tier 2 challenges.

## About the hidden tests

The tests and reference solutions are in `content/` because this is a static site with nothing server-side to hide them in. Reading them before you solve a challenge works against the point of the course, so don't. The app only shows a solution after your code passes.

## Adding content

1. Copy a lesson file in `content/tierN/`, and give the lesson and each challenge a unique `id`.
2. Import the lesson in `content/index.js` and add it to its tier's `lessons`.
3. Add two placement questions for it in `content/placement.js`.
4. Run `npm test`. It fails if a solution doesn't pass, if a starter or flawed snippet passes, or if a predict-the-output answer doesn't match what the code prints.

Challenge types are `code` (stub, tests, solution), `mcq` (predict the output) and `review` (flawed AI code, a diagnosis question, then a fix against tests). The lesson files have examples of each.

## Roadmap

| Tier | Topic | Board part | Status |
| --- | --- | --- | --- |
| 1 | Core logic and state | Data helpers and a store | ✅ 8 lessons, 30 challenges |
| 2 | Architecture | Router, event bus, selectors, keyed rendering | ✅ 7 lessons, 26 challenges |
| 3 | Async and data | Load tasks from a real API | Planned |
| 4 | Browser and persistence | Drag and drop, offline storage | Planned |
| 5 | Quality and the audit | Tests, hardening, a final audit of AI-written code | Planned |
