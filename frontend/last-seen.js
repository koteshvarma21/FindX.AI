document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('last-seen-form');
  const descriptionInput = document.getElementById('final-description');
  const locationInput = document.getElementById('last-seen-location');
  const dateInput = document.getElementById('last-seen-date');
  const timeInput = document.getElementById('last-seen-time');

  const savedDescription = sessionStorage.getItem('findx-final-description') || 'No description saved yet.';
  descriptionInput.value = savedDescription;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const location = locationInput.value.trim();
    if (!location) {
      alert('Please enter the last seen location.');
      return;
    }

    const email = sessionStorage.getItem('findx-user-email');
    if (!email) {
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
      contact_email: email,
      last_seen_location: location,
      discovered_lost_at: discoveredLostAt || new Date().toISOString(),
      reporter_name: sessionStorage.getItem('findx-user-name') || 'Reporter',
    };

    try {
      const response = await fetch('http://localhost:5000/api/lost-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.errors?.join(', ') || result.message || 'Failed to save lost item');
      }

      const lostItemId = result.data?.lostItemId || result.data?.lost_id || result.data?._id;
      sessionStorage.setItem('findx-lost-item-id', lostItemId || '');
      window.location.href = `matches.html?lostItemId=${encodeURIComponent(lostItemId || '')}`;
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to save the lost item.');
    }
  });
});
