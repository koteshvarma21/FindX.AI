const API_BASE = window.FINDX_API_BASE || 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-credentials-step');
  const signupForm = document.getElementById('signup-details-step');
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => tab.addEventListener('click', () => {
    const signup = tab.dataset.authTab === 'signup';
    loginForm?.classList.toggle('is-hidden', signup);
    signupForm?.classList.toggle('is-hidden', !signup);
    document.querySelectorAll('[data-auth-tab]').forEach((button) => button.classList.toggle('is-active', button === tab));
  }));

  const showError = (id, message) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = message;
      element.classList.add('is-visible');
    }
  };

  const clearErrors = () => document.querySelectorAll('.field-error').forEach((element) => {
    element.textContent = '';
    element.classList.remove('is-visible');
  });

  const saveSession = (result) => {
    localStorage.setItem('token', result.token);
    sessionStorage.setItem('findx-auth', 'true');
    sessionStorage.setItem('findx-user-email', result.user.email || '');
    sessionStorage.setItem('findx-user-name', result.user.fullName || result.user.name || '');
    sessionStorage.setItem('findx-user-username', result.user.username || '');
    window.location.href = 'home.html';
  };

  const request = async (path, payload) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.errors?.join(', ') || 'Authentication failed');
    return result;
  };

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    try {
      saveSession(await request('/auth/login', {
        username: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      }));
    } catch (error) {
      showError('login-password-error', error.message);
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    const password = document.getElementById('signup-password').value;
    if (password.length < 8) {
      showError('signup-password-error', 'Use at least 8 characters');
      return;
    }
    if (password !== document.getElementById('signup-confirm').value) {
      showError('signup-confirm-error', "Passwords don't match");
      return;
    }
    try {
      saveSession(await request('/auth/register', {
        username: document.getElementById('signup-username').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        password,
        fullName: document.getElementById('signup-name').value.trim(),
      }));
    } catch (error) {
      showError('signup-email-error', error.message);
    }
  });
});
