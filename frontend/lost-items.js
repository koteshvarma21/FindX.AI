document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lost-items-grid');

  try {
    const response = await fetch('http://localhost:5000/api/lost-items');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errors?.join(', ') || result.message || 'Failed to load lost items');
    }

    if (!result.data || !result.data.length) {
      grid.innerHTML = '<p>No lost items have been reported yet.</p>';
      return;
    }

    grid.innerHTML = '';

    result.data.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-img">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke="#E8630A" stroke-width="1.6"/><circle cx="12" cy="13" r="3.5" stroke="#E8630A" stroke-width="1.6"/></svg>
        </div>
        <div class="item-card-body">
          <span class="item-card-status status-lost">Lost</span>
          <h3>${item.description ? item.description.split('.')[0] : 'Lost item'}</h3>
          <p class="item-description">${item.description || 'No description provided.'}</p>
          <p class="item-location">Last seen near: ${item.last_seen_location || 'Unknown location'}</p>
          <p class="item-card-meta">Reported ${item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently'}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p>Unable to load lost items from the database.</p>';
  }
});
