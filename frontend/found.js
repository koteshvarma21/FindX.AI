document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('found-dropzone');
  const browseBtn = document.getElementById('found-browse-btn');
  const fileInput = document.getElementById('found-file-input');
  const fileChosen = document.getElementById('found-file-chosen');
  const form = document.getElementById('found-form');
  const success = document.getElementById('found-success');

  function showFile(file) {
    if (!file) return;
    fileChosen.textContent = `Selected: ${file.name}`;
    fileChosen.style.display = 'block';
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

  const email =
    sessionStorage.getItem('findx-user-email');

  const name =
    sessionStorage.getItem('findx-user-name');

  if (!email) {
    alert('Please login before submitting an item.');
    return;
  }

  try {
    const response = await fetch(
      'http://localhost:5000/api/found-items',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          item_name: itemName,
          description: description,
          found_location: location,
          found_at: date || undefined,
          contact_email: email,
          reporter_name: name
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
