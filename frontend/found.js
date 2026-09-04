document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('found-dropzone');
  const browseBtn = document.getElementById('found-browse-btn');
  const fileInput = document.getElementById('found-file-input');
  const fileChosen = document.getElementById('found-file-chosen');
  const form = document.getElementById('found-form');
  const success = document.getElementById('found-success');
  let coordinates = {};
  document.getElementById('use-found-location-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      coordinates = { found_lat: coords.latitude, found_lng: coords.longitude };
      document.getElementById('found-location-status').textContent = 'Location added.';
    }, () => { document.getElementById('found-location-status').textContent = 'Location unavailable; text location will be used.'; });
  });

  function showFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      fileChosen.textContent = 'Use a JPG, PNG, or WEBP image up to 10 MB.';
      fileChosen.style.display = 'block';
      return;
    }
    fileChosen.textContent = `Selected: ${file.name}`;
    fileChosen.style.display = 'block';
  }

  async function uploadImage(file) {
    if (!file) return { imageUrl: '', imageData: '' };
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Use a JPG, PNG, or WEBP image up to 10 MB.');
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/images/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify({ image }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Image upload failed');
    return { imageUrl: result.imageUrl, imageData: image };
  }

  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => showFile(fileInput.files[0]));

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      showFile(file);
    }
  });

  form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const itemName =
    document.getElementById('found-item-name').value.trim();

  const description =
    document.getElementById('found-description').value.trim();

  const location =
    document.getElementById('found-location').value.trim();

  const date =
    document.getElementById('found-date').value;

  const name =
    sessionStorage.getItem('findx-user-name');

  if (!localStorage.getItem('token')) {
    alert('Please login before submitting an item.');
    return;
  }

  try {
    const uploaded = await uploadImage(fileInput.files[0]);
    let extractedDetails = {};
    if (uploaded.imageData) {
      try {
        const analysisResponse = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/ai/analyze-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ image: uploaded.imageData }),
        });
        const analysis = await analysisResponse.json();
        if (!analysisResponse.ok) throw new Error(analysis.message || 'Image analysis is currently unavailable');
        extractedDetails = analysis.extractedDetails || {};
      } catch (analysisError) {
        console.warn('Found-image analysis unavailable:', analysisError.message);
        alert('Image was uploaded, but AI image analysis is currently unavailable. You can continue by describing the item manually.');
      }
    }
    const response = await fetch(
      `${window.FINDX_API_BASE || 'http://localhost:5000/api'}/found-items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          , Authorization: `Bearer ${localStorage.getItem('token')}`
        },

        body: JSON.stringify({
          item_name: itemName,
          description: description,
          found_location: location,
          found_at: date || undefined,
          contact_email: sessionStorage.getItem('findx-user-email'),
          reporter_name: name,
          image_url: uploaded.imageUrl,
          ...coordinates,
          category: extractedDetails.category,
          color: extractedDetails.color,
          brand: extractedDetails.brand,
          size: extractedDetails.size,
          material: extractedDetails.material,
          model: extractedDetails.model,
          unique_features: extractedDetails.uniqueFeatures || [],
          visual_description: extractedDetails.visualDescription
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || 'Failed to submit found item'
      );
    }

    success.classList.add('is-visible');

    form.reset();

    setTimeout(() => {
      window.location.href = 'found-items.html';
    }, 1000);

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});
});
