// Learner progress: persistence, XP rules, streaks and the spaced-repetition schedule.
import { BY_ID } from './content.js';

export const SAVE_KEY = 'jsforge.v1';

export const blank = () => ({ xp: 0, streak: { count: 0, last: null }, done: {}, drafts: {}, attempt: {}, badges: {}, seen: {}, placed: {}, srs: {}, rv: { ok: 0, total: 0 } });

export const S = (function () {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
  return blank();
})();

export function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

export const att = id => (S.attempt[id] = S.attempt[id] || { hints: 0, fails: 0 });

export const HINT_COST = [5, 10, 15, 15];

export const EXPLAIN_BONUS = 10;

export const DIAG_COST = 5;

export const TITLES = ['Initiate', 'Scripter', 'Tinkerer', 'Smith', 'Artisan', 'Architect', 'Master'];

export const lvlFloor = L => 50 * (L - 1) * L;

export function levelOf(xp) { let L = 1; while (xp >= lvlFloor(L + 1)) L++; return L; }

export const titleOf = L => TITLES[Math.min(L - 1, TITLES.length - 1)];

export const hintPenalty = n => { let t = 0; for (let i = 0; i < n; i++) t += HINT_COST[i] || 15; return t; };

export const codeBase = (ch, a) => Math.max(Math.round(ch.xp * 0.4), ch.xp - hintPenalty(a.hints) - Math.min(10, a.fails * 2) - DIAG_COST * (a.diagFails || 0));

export const mcqBase = (ch, a) => Math.max(5, ch.xp - 5 * a.fails);

export const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };

export function streakNow() {
  if (!S.streak.last) return 0;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (S.streak.last === dayKey() || S.streak.last === dayKey(y)) ? S.streak.count : 0;
}

export function bumpStreak() {
  const today = dayKey();
  if (S.streak.last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.streak.count = S.streak.last === dayKey(y) ? S.streak.count + 1 : 1;
  S.streak.last = today;
}

export const has = id => !!S.done[id];

export const doneList = () => Object.values(S.done);

export const lessonDone = l => l.challenges.every(c => has(c.id));

export const isPlaced = l => !!S.placed[l.id];

export const lessonClear = l => lessonDone(l) || isPlaced(l);

export const INTERVALS = [1, 3, 7, 14, 30, 60];

export function srsAdd(id) { if (!S.srs[id]) S.srs[id] = { box: 0, due: addDays(dayKey(), 1), reps: 0, lapses: 0 }; }

export function srsGrade(id, ok) {
  const r = S.srs[id] || (S.srs[id] = { box: 0, due: dayKey(), reps: 0, lapses: 0 });
  r.reps++;
  if (ok) r.box = Math.min(r.box + 1, INTERVALS.length - 1);
  else { r.box = 0; r.lapses++; }
  r.due = addDays(dayKey(), INTERVALS[r.box]);
  S.rv.total++; if (ok) S.rv.ok++;
}

export function dueIds() {
  const today = dayKey();
  return Object.keys(S.srs).filter(id => BY_ID.has(id) && has(id) && S.srs[id].due <= today)
    .sort((a, b) => S.srs[a].due.localeCompare(S.srs[b].due) || S.srs[a].box - S.srs[b].box);
}

// Challenges finished before the queue existed (or imported from elsewhere): spread them over the coming days.
export function backfillSrs() {
  const missing = Object.keys(S.done).filter(id => !S.srs[id] && BY_ID.has(id)).sort((a, b) => (S.done[a].at || 0) - (S.done[b].at || 0));
  missing.forEach((id, i) => { S.srs[id] = { box: 0, due: addDays(dayKey(), Math.floor(i / 8)), reps: 0, lapses: 0 }; });
  if (missing.length) save();
}
backfillSrs();

export function markDone(id, entry) { S.done[id] = entry; srsAdd(id); }

// Progress is per browser and per origin: the published artifact, localhost and GitHub Pages each keep their own.
// Export/import moves it between them.
export function exportProgress() {
  return JSON.stringify({ app: 'js-forge', version: 1, exportedAt: new Date().toISOString(), progress: S }, null, 2);
}
export function importProgress(text) {
  const data = JSON.parse(text);
  const incoming = data && data.app === 'js-forge' ? data.progress : data;
  if (!incoming || typeof incoming !== 'object' || typeof incoming.xp !== 'number' || typeof incoming.done !== 'object') {
    throw new Error('That file does not look like JS Forge progress.');
  }
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, blank(), incoming);
  backfillSrs();
  save();
}
