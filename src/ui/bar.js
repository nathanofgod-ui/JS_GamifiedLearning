// The sticky status bar.
import { $, h, icon } from '../dom.js';
import { go } from '../nav.js';
import { BADGES } from '../rewards.js';
import { dueIds, levelOf, lvlFloor, S, streakNow, titleOf } from '../state.js';

export const barRef = {};

export function buildBar() {
  barRef.lvlN = h('span', { class: 'n' });
  barRef.lvlT = h('span', { class: 't' });
  barRef.fill = h('i');
  barRef.xp = h('span', { class: 'xpnum' });
  barRef.review = h('button', { class: 'chip btnlike', onclick: () => go({ name: 'review' }), title: 'Review queue: items due today' }, icon('repeat', 15), (barRef.reviewN = h('span')));
  barRef.streak = h('span', { class: 'chip', title: 'Days in a row with XP earned' }, icon('flame', 15), (barRef.streakN = h('span')));
  barRef.badges = h('button', { class: 'chip btnlike', onclick: () => go({ name: 'badges' }), 'aria-label': 'Open badges' }, icon('shield', 15), (barRef.badgeN = h('span')));
  const bar = h('div', { class: 'bar' }, h('div', { class: 'wrap' },
    h('button', { class: 'brand', onclick: () => go({ name: 'home' }), 'aria-label': 'JS Forge home' }, h('span', { class: 'mark' }, icon('bolt', 16)), 'JS Forge'),
    h('span', { class: 'spacer' }),
    h('div', { class: 'lvl' }, barRef.lvlN, barRef.lvlT, h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Level progress' }, barRef.fill), barRef.xp),
    h('div', { class: 'chips' }, barRef.review, barRef.streak, barRef.badges)));
  $('#bar').replaceChildren(bar);
}

export function updateBar() {
  const L = levelOf(S.xp), lo = lvlFloor(L), hi = lvlFloor(L + 1);
  barRef.lvlN.textContent = 'Lv ' + L;
  barRef.lvlT.textContent = titleOf(L);
  barRef.fill.style.width = Math.round(((S.xp - lo) / (hi - lo)) * 100) + '%';
  barRef.xp.textContent = S.xp + ' / ' + hi + ' XP';
  barRef.streakN.textContent = streakNow();
  barRef.badgeN.textContent = Object.keys(S.badges).length + '/' + BADGES.length;
  const due = dueIds().length;
  barRef.reviewN.textContent = due;
  barRef.review.classList.toggle('hot', due > 0);
  barRef.review.setAttribute('aria-label', due + ' review items due');
}
