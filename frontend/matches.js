document.addEventListener('DOMContentLoaded', async () => {
  try { await window.findxAuthReady; } catch (_error) { return; }
  const grid = document.getElementById('matches-grid');
  const apiBase = window.FINDX_API_BASE || 'http://localhost:5000/api';
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const formatScore = (value) => {
    const number = Number(value);
    return value !== null && value !== undefined && Number.isFinite(number) ? `${Math.round(number)}%` : 'N/A';
  };
  const params = new URLSearchParams(window.location.search);
  const lostItemId = params.get('lostItemId');

  if (!lostItemId) {
    grid.innerHTML = '<p>No lost item selected. Please return to Search and complete the flow.</p>';
    return;
  }

  try {
    const response = await fetch(`${apiBase}/matches/lost/${lostItemId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Could not load matches');
    }

    const matches = Array.isArray(result.data) ? result.data : [];
    if (!matches.length) {
      grid.innerHTML = '<p>No strong matches yet. Try updating your description or last-seen location.</p>';
      return;
    }

    grid.innerHTML = '';

    matches.forEach((match) => {
      const foundItem = match.found_item || {};
      const overallScore = Number(match.overall_score);
      const semantics = match.semantic_score;
      const location = match.location_score;
      const category = match.category_score;
      const reason = match.ai_reason || 'AI matched these reports based on item similarity and location.';
      const status = match.match_status || 'pending';
      const lostItem = match.lost_item || {};
      const lostImage = lostItem.original_image_url || lostItem.ai_generated_image_url;
      const foundImage = foundItem.image_url;

      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-body">
          <span class="item-card-status status-found">${status === 'confirmed' ? 'Match Confirmed' : status === 'rejected' ? 'Rejected' : `${overallScore}% ${overallScore >= 80 ? 'Strong Match' : overallScore >= 65 ? 'Possible Match' : 'Low Match'}`}</span>
          <div class="match-images"><div>${lostImage ? `<img src="${escapeHtml(window.resolveFindxAssetUrl ? window.resolveFindxAssetUrl(lostImage) : lostImage)}" alt="Your lost item">` : 'Your item'}</div><div>${foundImage ? `<img src="${escapeHtml(window.resolveFindxAssetUrl ? window.resolveFindxAssetUrl(foundImage) : foundImage)}" alt="Possible found item">` : 'Possible item'}</div></div>
          <h3>${escapeHtml(foundItem.item_name || 'Found item')}</h3>
          <p class="item-description">${escapeHtml(foundItem.description || 'No description yet.')}</p>
          <p class="item-location">Found near: ${escapeHtml(foundItem.found_location || 'Unknown location')}</p>
          <p class="item-card-meta">Overall ${formatScore(overallScore)} · Semantic ${formatScore(semantics)} · Visual features ${formatScore(match.visual_feature_score)} · Category ${formatScore(category)} · Color ${formatScore(match.color_score)} · Brand ${formatScore(match.brand_score)} · Features ${formatScore(match.unique_features_score)} · Location ${formatScore(location)} · Time ${formatScore(match.time_score)}</p>
          <p class="item-card-meta">AI reason: ${escapeHtml(reason)}</p>
          <div class="match-actions">
            <button type="button" class="btn-primary confirm-match" ${status !== 'pending' ? 'disabled' : ''}>This Is My Item</button>
            <button type="button" class="btn-secondary reject-match" ${status !== 'pending' ? 'disabled' : ''}>Not My Item</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
      card.querySelectorAll('img').forEach((image) => { image.onerror = () => { image.replaceWith(document.createTextNode('Image unavailable')); }; });

      const updateStatus = async (nextStatus) => {
        if (nextStatus === 'confirmed' && !window.confirm('Are you sure this is your lost item?')) return;
        const actionButtons = card.querySelectorAll('button');
        actionButtons.forEach((button) => { button.disabled = true; });
        try {
          const statusResponse = await fetch(`${apiBase}/matches/${match._id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            body: JSON.stringify({ status: nextStatus }),
          });
          const statusResult = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusResult.message || 'Could not update match');
          if (nextStatus === 'rejected') card.remove();
          else {
            card.querySelector('.item-card-status').textContent = 'Match Confirmed';
            card.querySelectorAll('button').forEach((button) => { button.disabled = true; });
          }
        } catch (error) {
          actionButtons.forEach((button) => { button.disabled = false; });
          console.error(error);
          alert(error.message || 'Unable to update match status.');
        }
      };
      card.querySelector('.confirm-match').addEventListener('click', () => updateStatus('confirmed'));
      card.querySelector('.reject-match').addEventListener('click', () => updateStatus('rejected'));
    });
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p>Unable to load match results right now.</p>';
  }
});
