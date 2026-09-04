document.addEventListener('DOMContentLoaded', async () => {
  try { await window.findxAuthReady; } catch (_error) { return; }
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

  async function loadProfile() {
    const name = sessionStorage.getItem('findx-user-name') || '';
    const username = sessionStorage.getItem('findx-user-username') || '';
    const email = sessionStorage.getItem('findx-user-email') || '';
    nameInput.value = name;
    usernameInput.value = username;
    emailInput.value = email;
    avatarLg.textContent = (name.trim().charAt(0) || 'F').toUpperCase();
    try {
      const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/auth/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
      if (response.ok) {
        const result = await response.json();
        const user = result.user || {};
        nameInput.value = user.fullName || user.name || name;
        usernameInput.value = user.username || username;
        emailInput.value = user.email || email;
      }
    } catch (error) { console.warn('Profile load failed:', error.message); }
  }

  loadProfile();

  detailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    if (!name) return;

    try {
      const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify({ fullName: name, username }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Profile update failed');
      sessionStorage.setItem('findx-user-name', result.user.fullName || result.user.name || name);
      sessionStorage.setItem('findx-user-username', result.user.username || username);
    } catch (error) { showError(detailsSuccess, error.message); return; }
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

  passwordForm.addEventListener('submit', async (e) => {
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
    if (!next || next.length < 8) {
      showError(newPasswordError, 'Use at least 8 characters');
      valid = false;
    }
    if (confirm !== next) {
      showError(confirmNewPasswordError, 'Passwords don\'t match');
      valid = false;
    }
    if (!valid) return;

    try {
      const response = await fetch(`${window.FINDX_API_BASE || 'http://localhost:5000/api'}/auth/password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Password update failed');
      passwordForm.reset();
      passwordSuccess.classList.add('is-visible');
      setTimeout(() => passwordSuccess.classList.remove('is-visible'), 4000);
    } catch (error) {
      showError(newPasswordError, error.message);
    }
  });
});
