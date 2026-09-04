document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('matches-grid');
  const params = new URLSearchParams(window.location.search);
  const lostItemId = params.get('lostItemId');

  if (!lostItemId) {
    grid.innerHTML = '<p>No lost item selected. Please return to Search and complete the flow.</p>';
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/matches/lost/${lostItemId}`);
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
      const overallScore = Number(match.overall_score ?? 0);
      const semantics = Number(match.semantic_score ?? 0);
      const location = Number(match.location_score ?? 0);
      const category = Number(match.category_score ?? 0);
      const reason = match.ai_reason || 'AI matched these reports based on item similarity and location.';
      const status = match.match_status || 'pending';

      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-card-body">
          <span class="item-card-status status-found">${status === 'confirmed' ? 'Match Confirmed' : status === 'rejected' ? 'Rejected' : `${overallScore}% ${overallScore >= 80 ? 'Strong Match' : overallScore >= 65 ? 'Possible Match' : 'Low Match'}`}</span>
          <h3>${foundItem.item_name || 'Found item'}</h3>
          <p class="item-description">${foundItem.description || 'No description yet.'}</p>
          <p class="item-location">Found near: ${foundItem.found_location || 'Unknown location'}</p>
          <p class="item-card-meta">Match score: ${overallScore}% · Semantic ${semantics}% · Location ${location}% · Category ${category}%</p>
          <p class="item-card-meta">AI reason: ${reason}</p>
          <div class="match-actions">
            <button type="button" class="btn-primary confirm-match" ${status !== 'pending' ? 'disabled' : ''}>This Is My Item</button>
            <button type="button" class="btn-secondary reject-match" ${status !== 'pending' ? 'disabled' : ''}>Not My Item</button>
          </div>
        </div>
      `;
      grid.appendChild(card);

      const updateStatus = async (nextStatus) => {
        if (nextStatus === 'confirmed' && !window.confirm('Are you sure this is your lost item?')) return;
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/matches/${match._id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
