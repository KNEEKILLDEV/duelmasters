export function initGame(cardList) {
  const deck = shuffle([...cardList]);
  const hand = deck.splice(0, 5);
  return { deck, hand };
}

function shuffle(array) {
  let m = array.length, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    [array[m], array[i]] = [array[i], array[m]];
  }
  return array;
}