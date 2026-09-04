document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lost-items-grid');
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const imageUrl = (value) => window.resolveFindxAssetUrl ? window.resolveFindxAssetUrl(value) : value;

  try {
    const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/lost-items`);
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
      const image = imageUrl(item.original_image_url || item.ai_generated_image_url);
      card.innerHTML = `
        <div class="item-card-img">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.item_name || 'Lost item')}" loading="lazy">` : '<span>No image</span>'}
        </div>
        <div class="item-card-body">
          <span class="item-card-status status-lost">Lost</span>
          <h3>${escapeHtml(item.item_name || (item.description ? item.description.split('.')[0] : 'Lost item'))}</h3>
          <p class="item-description">${escapeHtml(item.description || 'No description provided.')}</p>
          <p class="item-location">Last seen near: ${escapeHtml(item.last_seen_location || 'Unknown location')}</p>
          <p class="item-card-meta">Reported ${escapeHtml(item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently')}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p>Unable to load lost items from the database.</p>';
  }
});
