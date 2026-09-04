document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('found-items-grid');

  try {
    const response = await fetch(
      `${window.FINDX_API_BASE || 'http://localhost:5000/api'}/found-items`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error('Could not load found items');
    }

    grid.innerHTML = '';

    if (!result.data || result.data.length === 0) {
      grid.innerHTML = '<p>No found items reported yet.</p>';
      return;
    }

    result.data.forEach((item) => {
      const card = document.createElement('div');

      card.className = 'item-card';

      card.innerHTML = `
        <div class="item-card-body">

          <span class="item-card-status status-found">
            Found
          </span>

          <h3></h3>

          <p class="item-description"></p>

          <p class="item-location"></p>

          <p class="item-card-meta"></p>

        </div>
      `;

      card.querySelector('h3').textContent =
        item.item_name || 'Found Item';

      card.querySelector('.item-description').textContent =
        item.description || '';

      card.querySelector('.item-location').textContent =
        `Found at: ${item.found_location || 'Unknown'}`;

      card.querySelector('.item-card-meta').textContent =
        item.created_at
          ? `Reported ${new Date(
              item.created_at
            ).toLocaleDateString()}`
          : '';

      grid.appendChild(card);
    });

  } catch (error) {
    console.error(error);

    grid.innerHTML =
      '<p>Unable to load found items.</p>';
  }
});