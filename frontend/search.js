document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const browseBtn = document.getElementById('browse-btn');
  const fileInput = document.getElementById('file-input');
  const fileChosen = document.getElementById('file-chosen');
  const submitBtn = document.getElementById('submit-search');

  const tabBtns = Array.from(document.querySelectorAll('.tab-btn[data-tab]'));
  const panels = Array.from(document.querySelectorAll('.panel[data-panel]'));

  const itemNameInput = document.getElementById('describe-item-name');
  const descriptionInput = document.getElementById('describe-description');
  const itemNameError = document.getElementById('describe-item-name-error');
  const descriptionError = document.getElementById('describe-description-error');

  let activeTab = 'upload';
  let isProcessingPhoto = false;

  // If we arrived from a link like search.html?tab=describe (e.g. the
  // home page tiles), open straight on that tab.
  const requestedTab = new URLSearchParams(window.location.search).get('tab');

  function showFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      fileChosen.textContent = 'Use a JPG, PNG, or WEBP image up to 10 MB.';
      fileChosen.style.color = '#B0392E';
      fileChosen.style.display = 'block';
      return;
    }
    fileChosen.textContent = `Selected: ${file.name}`;
    fileChosen.style.color = '';
    fileChosen.style.display = 'block';
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('is-visible');
  }

  /* -------- Tab switching: Upload photo <-> Describe item -------- */
  function setActiveTab(tab) {
    activeTab = tab;
    tabBtns.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
    panels.forEach((panel) => panel.classList.toggle('is-hidden', panel.dataset.panel !== tab));
    fileChosen.style.display = 'none';
    clearError(itemNameError);
    clearError(descriptionError);
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  if (requestedTab === 'describe' || requestedTab === 'upload') {
    setActiveTab(requestedTab);
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

  /* Both flows hand off to the AI chat assistant to fill in the rest
     of the description: an uploaded photo, or a typed-out item name
     and description entered right here on the Describe item tab. */
  submitBtn.addEventListener('click', async () => {
    if (activeTab === 'upload') {
      if (isProcessingPhoto) return;
      if (!fileInput.files.length) {
        fileChosen.textContent = 'Please choose a photo first, or use "Describe item" instead.';
        fileChosen.style.color = '#B0392E';
        fileChosen.style.display = 'block';
        return;
      }
      const file = fileInput.files[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return;
      isProcessingPhoto = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading and analyzing...';
      sessionStorage.setItem('findx-search-mode', 'upload');
      sessionStorage.removeItem('findx-extracted-details');
      sessionStorage.removeItem('findx-original-image');
      try {
        const imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Unable to read image file.'));
          reader.readAsDataURL(file);
        });
          const apiBase = window.FINDX_API_BASE || 'http://localhost:5000/api';
          const uploadResponse = await fetch(`${apiBase}/images/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            body: JSON.stringify({ image: imageData }),
          });
          const uploadResult = await uploadResponse.json();
          if (!uploadResponse.ok) throw new Error(`Unable to upload image: ${uploadResult.message || 'service unavailable'}`);
          sessionStorage.setItem('findx-original-image', uploadResult.imageUrl);

          const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/ai/analyze-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            body: JSON.stringify({ image: imageData }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Image analysis is currently unavailable');
          sessionStorage.setItem('findx-extracted-details', JSON.stringify(result.extractedDetails || {}));
      } catch (error) {
        console.error('Lost photo processing failed:', error.message);
        fileChosen.textContent = error.message.includes('upload') ? error.message : 'Image was uploaded, but AI image analysis is currently unavailable. You can continue by describing the item manually.';
        fileChosen.style.color = '#B0392E';
        fileChosen.style.display = 'block';
        if (error.message.includes('uploaded')) sessionStorage.setItem('findx-vision-warning', fileChosen.textContent);
        if (!sessionStorage.getItem('findx-original-image')) sessionStorage.removeItem('findx-search-mode');
        isProcessingPhoto = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
        return;
      }
      window.location.href = 'ai-talk.html';
      sessionStorage.removeItem('findx-item-name');
      sessionStorage.removeItem('findx-item-description');
      return;
    }

    // Describe item flow
    clearError(itemNameError);
    clearError(descriptionError);

    const itemName = itemNameInput.value.trim();
    const description = descriptionInput.value.trim();
    let valid = true;

    if (!itemName) {
      showError(itemNameError, 'Tell us what the item is called');
      valid = false;
    }
    if (!description) {
      showError(descriptionError, 'Add a short description');
      valid = false;
    }
    if (!valid) return;

    sessionStorage.setItem('findx-search-mode', 'describe');
    sessionStorage.setItem('findx-item-name', itemName);
    sessionStorage.setItem('findx-item-description', description);
    window.location.href = 'ai-talk.html';
  });
});
