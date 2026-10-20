// Starting data. Persistence (localStorage, then IndexedDB) arrives with Tier 4.
export const SAMPLE_BOARD = {
  name: 'Board',
  columns: [
    { id: 'todo', title: 'To do', cards: [
      { id: 1, title: 'Sketch the data model', priority: 'high' },
      { id: 2, title: 'Write the reducer', priority: 'low' },
      { id: 3, title: 'Wire up subscribe', priority: 'low' },
      { id: 6, title: 'Design the route table', priority: 'high' },
    ] },
    { id: 'doing', title: 'In progress', cards: [
      { id: 4, title: 'Review AI-written code', priority: 'high' },
      { id: 7, title: 'Hook up the event bus', priority: 'low' },
    ] },
    { id: 'done', title: 'Done', cards: [
      { id: 5, title: 'Finish Tier 1', priority: 'low' },
      { id: 8, title: 'Build createStore', priority: 'high' },
    ] },
  ],
};
