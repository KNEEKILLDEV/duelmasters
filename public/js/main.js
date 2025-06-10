document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('cardData.json');
  const cards = await res.json();
  const container = document.getElementById('cards');
  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.innerHTML = `
      <img src="dm01_images/${card.img.split('/').pop()}" alt="${card.name}" />
      <h3>${card.name}</h3>
      <p>Cost: ${card.cost} | Power: ${card.power}</p>
      <p>${card.text}</p>
    `;
    container.appendChild(cardEl);
  });
});
