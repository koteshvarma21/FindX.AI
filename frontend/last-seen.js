document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('last-seen-form');
  const descriptionInput = document.getElementById('final-description');
  const locationInput = document.getElementById('last-seen-location');
  const dateInput = document.getElementById('last-seen-date');
  const timeInput = document.getElementById('last-seen-time');
  const travelPathInput = document.getElementById('travel-path');
  const locationButton = document.getElementById('use-location-btn');
  const locationStatus = document.getElementById('location-status');
  let coordinates = {};

  locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) { locationStatus.textContent = 'Location unavailable; text location will be used.'; return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { coordinates = { last_seen_lat: coords.latitude, last_seen_lng: coords.longitude }; locationStatus.textContent = 'Location added.'; },
      () => { locationStatus.textContent = 'Location unavailable; text location will be used.'; }
    );
  });

  const savedDescription = sessionStorage.getItem('findx-final-description') || 'No description saved yet.';
  const extractedDetails = JSON.parse(sessionStorage.getItem('findx-extracted-details') || '{}');
  descriptionInput.value = savedDescription;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const location = locationInput.value.trim();
    if (!location) {
      alert('Please enter the last seen location.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login before submitting the report.');
      return;
    }

    const dateValue = dateInput.value;
    const timeValue = timeInput.value;

    let discoveredLostAt = '';
    if (dateValue) {
      discoveredLostAt = timeValue ? `${dateValue}T${timeValue}:00` : `${dateValue}T00:00:00`;
    }

    const payload = {
      description: savedDescription,
      item_name: extractedDetails.itemName || sessionStorage.getItem('findx-item-name') || undefined,
      category: extractedDetails.category,
      color: extractedDetails.color,
      brand: extractedDetails.brand,
      size: extractedDetails.size,
      material: extractedDetails.material,
      model: extractedDetails.model,
      unique_features: extractedDetails.uniqueFeatures || [],
      visual_description: extractedDetails.visualDescription,
      original_image_url: sessionStorage.getItem('findx-original-image') || undefined,
      ai_generated_image_url: sessionStorage.getItem('findx-final-image') || undefined,
      generated_image: sessionStorage.getItem('findx-generated-image-id') || undefined,
      contact_email: sessionStorage.getItem('findx-user-email') || undefined,
      last_seen_location: location,
      ...coordinates,
      travel_path: travelPathInput.value.split(',').map((place) => place.trim()).filter(Boolean).map((place) => ({ location: place })),
      user_confidence_score: sessionStorage.getItem('findx-image-confidence') ? Number(sessionStorage.getItem('findx-image-confidence')) : undefined,
      discovered_lost_at: discoveredLostAt || new Date().toISOString(),
      reporter_name: sessionStorage.getItem('findx-user-name') || 'Reporter',
    };

    try {
      const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/lost-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.errors?.join(', ') || result.message || 'Failed to save lost item');
      }

      const lostItemId = result.data?.lostItemId || result.data?.lost_id || result.data?._id;
      sessionStorage.setItem('findx-lost-item-id', lostItemId || '');
      ['findx-search-mode', 'findx-item-name', 'findx-item-description', 'findx-original-image', 'findx-extracted-details', 'findx-final-description', 'findx-final-image', 'findx-generated-image-id', 'findx-image-confidence'].forEach((key) => sessionStorage.removeItem(key));
      window.location.href = `matches.html?lostItemId=${encodeURIComponent(lostItemId || '')}`;
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to save the lost item.');
    }
  });
});
