// Badges and XP awards.
import { bus } from './bus.js';
import { LESSONS, tierItems, TIERS } from './content.js';
import { toast } from './dom.js';
import { bumpStreak, doneList, has, lessonDone, levelOf, S, save, streakNow, titleOf } from './state.js';

export const BADGES = [
  { id: 'spark', name: 'First Spark', desc: 'Complete your first challenge', icon: 'bolt', test: () => doneList().length >= 1 },
  { id: 'clean', name: 'Clean Run', desc: 'Pass a code challenge on your very first run', icon: 'check', test: () => doneList().some(d => d.code && d.fails === 0) },
  { id: 'selfrel', name: 'Self-Reliant', desc: 'Finish 3 code challenges without a single hint', icon: 'shield', test: () => doneList().filter(d => d.code && d.hints === 0).length >= 3 },
  { id: 'detective', name: 'Type Detective', desc: 'Rebuild typeof from scratch', icon: 'search', test: () => has('types-typeof') },
  { id: 'nullsafe', name: 'Null Safe', desc: 'Handle missing data in both defaults challenges', icon: 'shield', test: () => has('nullish-port') && has('nullish-defaults') },
  { id: 'closure', name: 'Closure Keeper', desc: 'Build counter, once and memoize', icon: 'lock', test: () => has('closure-counter') && has('closure-once') && has('closure-memo') },
  { id: 'eye', name: 'Sharp Eye', desc: 'Get 5 code-review questions right on the first try', icon: 'search', test: () => doneList().filter(d => d.mcq && d.fails === 0).length >= 5 },
  { id: 'scholar', name: 'Scholar', desc: 'Finish 3 lessons', icon: 'book', test: () => LESSONS.filter(lessonDone).length >= 3 },
  { id: 'fire', name: 'On Fire', desc: 'Reach a 3-day streak', icon: 'flame', test: () => S.streak.count >= 3 && streakNow() >= 3 },
  { id: 'store', name: 'Store Builder', desc: 'Beat the boss: createStore', icon: 'trophy', test: () => has('state-store') },
  { id: 'forged', name: 'Forged', desc: 'Complete every challenge in Tier 1', icon: 'star', test: () => tierItems(1).every(x => has(x.c.id)) },
  { id: 'auditor', name: 'AI Auditor', desc: 'Fix 3 flawed, AI-written snippets', icon: 'bot', test: () => doneList().filter(d => d.review).length >= 3 },
  { id: 'hunter', name: 'Bug Hunter', desc: 'Spot the bug on the first try in 5 AI reviews', icon: 'search', test: () => doneList().filter(d => d.review && d.diagFails === 0).length >= 5 },
  { id: 'fasttrack', name: 'Fast Track', desc: 'Test out of a lesson with the placement test', icon: 'target', test: () => Object.keys(S.placed).length >= 1 },
  { id: 'memory', name: 'Long Memory', desc: 'Recall 20 items correctly in the review queue', icon: 'repeat', test: () => S.rv.ok >= 20 },
  { id: 'chain', name: 'Chain Walker', desc: 'Rebuild new and instanceof', icon: 'layers', test: () => has('proto-new') && has('proto-instanceof') },
  { id: 'wired', name: 'Wired Up', desc: 'Unlock Board, part 2', icon: 'route', test: () => [...TIERS[0].parts, ...TIERS[1].parts].every(p => has(p[0])) },
  { id: 'reconciler', name: 'Reconciler', desc: 'Beat the boss: reconcile', icon: 'trophy', test: () => has('render-reconcile') },
  { id: 'architect', name: 'Architect', desc: 'Complete every challenge in Tier 2', icon: 'star', test: () => tierItems(2).every(x => has(x.c.id)) }
];

export function checkBadges() {
  for (const b of BADGES) if (!S.badges[b.id] && b.test()) { S.badges[b.id] = Date.now(); toast('Badge earned: ' + b.name, 'shield'); }
}

export function award(xp) {
  const before = levelOf(S.xp);
  S.xp += xp;
  bumpStreak();
  const after = levelOf(S.xp);
  if (xp) toast('+' + xp + ' XP', 'bolt');
  if (after > before) toast('Level ' + after + ': ' + titleOf(after), 'trophy');
  checkBadges();
  save();
  bus.emit("progress");
}
