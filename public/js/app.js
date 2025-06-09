import { cards } from '../../src/js/cardData.js';
import { initGame } from './gameLogic.js';
import { renderBoard } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const state = initGame(cards);
  renderBoard(state);
});