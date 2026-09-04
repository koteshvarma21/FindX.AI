window.findxAuthReady = (async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.clearFindxSession();
    window.location.replace('index.html');
    throw new Error('Authentication required');
  }
  const base = window.FINDX_API_BASE || 'http://localhost:5000/api';
  const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    window.clearFindxSession();
    window.location.replace('index.html');
    throw new Error('Token rejected');
  }
  const result = await response.json();
  const user = result.user || {};
  sessionStorage.setItem('findx-user-name', user.fullName || user.name || user.username || 'Member');
  sessionStorage.setItem('findx-user-email', user.email || '');
  sessionStorage.setItem('findx-user-username', user.username || '');
  sessionStorage.setItem('findx-auth', 'true');
  return user;
})();
