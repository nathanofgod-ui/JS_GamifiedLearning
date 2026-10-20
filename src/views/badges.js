// Badge cabinet.
import { h, icon } from '../dom.js';
import { BADGES } from '../rewards.js';
import { S } from '../state.js';
import { crumbs } from './kit.js';

export function renderBadges(root) {
  root.append(h('div', { class: 'wrap' }, crumbs(),
    h('div', { class: 'page-title' }, h('h1', null, 'Badges'), h('p', { class: 'muted' }, Object.keys(S.badges).length + ' of ' + BADGES.length + ' earned')),
    h('div', { class: 'badge-grid' }, BADGES.map(b => h('div', { class: 'badge ' + (S.badges[b.id] ? 'on' : 'off') },
      h('div', { class: 'seal' }, icon(S.badges[b.id] ? b.icon : 'lock', 22)),
      h('div', null, h('b', null, b.name), h('span', null, b.desc)))))));
}
