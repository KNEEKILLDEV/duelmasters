export function renderBoard(state) {
  const root = document.getElementById('game-root');
  root.innerHTML = '<h2>Your Hand</h2><div class="hand"></div>';
  const handDiv = root.querySelector('.hand');
  state.hand.forEach(card => {
    const img = document.createElement('img');
    img.src = card.img;
    img.alt = card.name;
    img.className = 'card';
    handDiv.appendChild(img);
  });
}