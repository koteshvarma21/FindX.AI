/* Runs before the rest of the page and requires a real backend JWT. */
(async function () {
  const token = localStorage.getItem('token');
  if (!token) return window.location.replace('index.html');
  try {
    const base = window.FINDX_API_BASE || 'http://localhost:5000/api';
    const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Token rejected');
  } catch (_error) {
    localStorage.removeItem('token');
    sessionStorage.removeItem('findx-auth');
    window.location.replace('index.html');
  }
})();
