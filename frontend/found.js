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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Demo-only: no backend wired up yet. Show a confirmation instead.
    success.classList.add('is-visible');
    setTimeout(() => success.classList.remove('is-visible'), 4000);
  });
});
