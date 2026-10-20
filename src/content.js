// The course content, indexed for the app. The content itself lives in /content, one file per lesson.
import { tiers, lessons, placement } from '../content/index.js';

export const TIERS = tiers;
export const LESSONS = lessons;
export const PLACEMENT = placement;

export const ALL = LESSONS.flatMap(l => l.challenges.map((c, i) => ({ l, c, i })));
export const BY_ID = new Map(ALL.map(x => [x.c.id, x]));
export const tierOf = n => TIERS.find(t => t.n === n);
export const tierLessons = n => LESSONS.filter(l => l.tier === n);
export const tierItems = n => ALL.filter(x => x.l.tier === n);
