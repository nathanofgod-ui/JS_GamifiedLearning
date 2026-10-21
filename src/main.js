// Entry point. Wires the bus to the views and starts hash navigation.
import { $ } from './dom.js';
import { bus } from './bus.js';
import { startNavigation } from './nav.js';
import { LESSONS, tierOf } from './content.js';
import { checkBadges } from './rewards.js';
import { buildBar, updateBar } from './ui/bar.js';
import { renderHome } from './views/home.js';
import { renderLesson } from './views/lesson.js';
import { renderBadges } from './views/badges.js';
import { renderReviewQueue } from './views/queue.js';
import { renderPlacement } from './views/placement.js';
import { renderBoard } from './views/board1.js';
import { renderBoard2 } from './views/board2.js';

const VIEWS = {
  home: renderHome,
  lesson: renderLesson,
  badges: renderBadges,
  review: renderReviewQueue,
  placement: renderPlacement,
  board: renderBoard,
  board2: renderBoard2,
};

function isKnown(v) {
  if (!VIEWS[v.name]) return false;
  if (v.name === 'lesson') {
    const L = LESSONS.find(l => l.id === v.id);
    return !!L && Number.isInteger(v.step) && v.step >= 0 && v.step <= L.challenges.length;
  }
  if (v.name === 'placement') return !!(tierOf(v.tier) && tierOf(v.tier).live);
  return true;
}

bus.on('render', view => {
  const main = $('#main');
  main.replaceChildren();
  VIEWS[view.name](main);
  updateBar();
});
bus.on('progress', () => updateBar());

buildBar();
checkBadges();
startNavigation(isKnown);
