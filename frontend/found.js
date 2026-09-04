document.addEventListener('DOMContentLoaded', async () => {
  try { await window.findxAuthReady; } catch (_error) { return; }
  const dropzone = document.getElementById('found-dropzone');
  const browseBtn = document.getElementById('found-browse-btn');
  const fileInput = document.getElementById('found-file-input');
  const fileChosen = document.getElementById('found-file-chosen');
  const form = document.getElementById('found-form');
  const success = document.getElementById('found-success');
  const submitButton = form.querySelector('button[type="submit"]');
  let isSubmitting = false;
  let coordinates = {};
  let cachedPhoto = null;
  let photoRequest = null;
  let analysisVersion = 0;
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

  function fileKey(file) {
    return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
  }

  function prefillFromAnalysis(details) {
    const itemNameInput = document.getElementById('found-item-name');
    const descriptionInput = document.getElementById('found-description');
    if (!itemNameInput.value.trim()) itemNameInput.value = details.itemName || details.item_name || '';
    if (!descriptionInput.value.trim()) descriptionInput.value = details.visualDescription || details.visual_description || '';
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

  async function processPhoto(file, version) {
    const key = fileKey(file);
    if (!key || cachedPhoto?.key === key) return cachedPhoto;
    fileChosen.textContent = 'Analyzing photo...';
    const uploaded = await uploadImage(file);
    if (version !== analysisVersion) return null;
    let extractedDetails = {};
    try {
      const analysisResponse = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/ai/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ image: uploaded.imageData }),
      });
      const analysis = await analysisResponse.json();
      if (!analysisResponse.ok) throw new Error(analysis.message || 'AI image analysis is unavailable');
      extractedDetails = analysis.extractedDetails || {};
      if (version === analysisVersion) prefillFromAnalysis(extractedDetails);
      fileChosen.textContent = 'Photo analyzed. You can edit the suggested details.';
    } catch (error) {
      fileChosen.textContent = 'AI photo analysis is unavailable. You can still complete the report manually.';
      console.warn('Found-image analysis unavailable:', error.message);
    }
    if (version !== analysisVersion) return null;
    cachedPhoto = { key, imageUrl: uploaded.imageUrl, imageData: uploaded.imageData, extractedDetails };
    return cachedPhoto;
  }

  function selectFile(file) {
    if (!file) return;
    showFile(file);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return;
    const version = ++analysisVersion;
    cachedPhoto = null;
    photoRequest = processPhoto(file, version).catch((error) => {
      if (version !== analysisVersion) return null;
      fileChosen.textContent = error.message || 'Unable to upload image.';
      fileChosen.style.display = 'block';
      throw error;
    });
  }

  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => selectFile(fileInput.files[0]));

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
      selectFile(file);
    }
  });

  form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;
  submitButton.disabled = true;

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
    isSubmitting = false;
    submitButton.disabled = false;
    return;
  }

  try {
    if (photoRequest) await photoRequest;
    const uploaded = cachedPhoto || await uploadImage(fileInput.files[0]);
    const extractedDetails = uploaded.extractedDetails || {};
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
    isSubmitting = false;
    submitButton.disabled = false;
  }
});
});
