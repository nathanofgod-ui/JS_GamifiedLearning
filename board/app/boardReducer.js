// The board slice: moving, patching and adding cards. Card edits go through your updateCard.
export function createBoardReducer(updateCard) {
  return function board(state, act) {
    switch (act.type) {
      case 'move': {
        const from = state.columns.find(c => c.cards.some(x => x.id === act.cardId));
        const to = state.columns.find(c => c.id === act.to);
        if (!from || !to || from === to) return state;
        const card = from.cards.find(x => x.id === act.cardId);
        return {
          ...state,
          columns: state.columns.map(c =>
            c === from ? { ...c, cards: c.cards.filter(x => x !== card) }
            : c === to ? { ...c, cards: c.cards.concat([card]) }
            : c),
        };
      }
      case 'patch':
        return updateCard(state, act.cardId, act.patch);
      case 'add':
        return {
          ...state,
          columns: state.columns.map((c, i) => (i === 0 ? { ...c, cards: c.cards.concat([{ id: act.id, title: act.title, priority: 'low' }]) } : c)),
        };
      default:
        return state;
    }
  };
}
