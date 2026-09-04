document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('profile-name');
  const usernameInput = document.getElementById('profile-username');
  const emailInput = document.getElementById('profile-email');
  const avatarLg = document.getElementById('profile-avatar-lg');
  const detailsForm = document.getElementById('details-form');
  const detailsSuccess = document.getElementById('details-success');

  const passwordForm = document.getElementById('password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const currentPasswordError = document.getElementById('current-password-error');
  const newPasswordError = document.getElementById('new-password-error');
  const confirmNewPasswordError = document.getElementById('confirm-new-password-error');
  const passwordSuccess = document.getElementById('password-success');

  function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('is-visible');
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
  }

  function loadProfile() {
    const name = sessionStorage.getItem('findx-user-name') || '';
    const username = sessionStorage.getItem('findx-user-username') || '';
    const email = sessionStorage.getItem('findx-user-email') || '';
    nameInput.value = name;
    usernameInput.value = username;
    emailInput.value = email;
    avatarLg.textContent = (name.trim().charAt(0) || 'F').toUpperCase();
  }

  loadProfile();

  detailsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    if (!name) return;

    sessionStorage.setItem('findx-user-name', name);
    sessionStorage.setItem('findx-user-username', username);
    avatarLg.textContent = name.charAt(0).toUpperCase();

    // Keep the header profile pill in sync without a full reload.
    const headerName = document.querySelector('.profile-name');
    const headerAvatar = document.querySelector('.profile-avatar');
    if (headerName) headerName.textContent = name;
    if (headerAvatar) headerAvatar.textContent = name.charAt(0).toUpperCase();

    detailsSuccess.classList.add('is-visible');
    setTimeout(() => detailsSuccess.classList.remove('is-visible'), 4000);
  });

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    [currentPasswordError, newPasswordError, confirmNewPasswordError].forEach(clearError);

    const current = currentPasswordInput.value;
    const next = newPasswordInput.value;
    const confirm = confirmNewPasswordInput.value;
    let valid = true;

    if (!current) {
      showError(currentPasswordError, 'Enter your current password');
      valid = false;
    }
    if (!next || next.length < 6) {
      showError(newPasswordError, 'Use at least 6 characters');
      valid = false;
    }
    if (confirm !== next) {
      showError(confirmNewPasswordError, 'Passwords don\'t match');
      valid = false;
    }
    if (!valid) return;

    // Demo-only: no backend wired up yet to actually change the password.
    passwordForm.reset();
    passwordSuccess.classList.add('is-visible');
    setTimeout(() => passwordSuccess.classList.remove('is-visible'), 4000);
  });
});
