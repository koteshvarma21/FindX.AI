/* ============================================================
   FindX.AI — profile menu
   Injects an avatar/profile pill into any <div id="profile-menu">
   found in the page's <nav>, replacing the old static "Log in"
   link. Click it to reveal "Edit profile" and "Log out".
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  try { await window.findxAuthReady; } catch (_error) { return; }
  const mount = document.getElementById('profile-menu');
  if (!mount) return;

  const isAuthed = !!localStorage.getItem('token');

  if (!isAuthed) {
    mount.innerHTML = '<a href="index.html" class="nav-login">Log in</a>';
    return;
  }

  const name = sessionStorage.getItem('findx-user-name') || 'Member';
  const initial = (name.trim().charAt(0) || 'F').toUpperCase();

  mount.classList.add('profile-menu');
  mount.innerHTML = `
    <button type="button" class="profile-btn" id="profile-btn" aria-haspopup="true" aria-expanded="false">
      <span class="profile-avatar"></span>
      <span class="profile-name"></span>
      <svg class="profile-caret" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#55607A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="profile-dropdown" role="menu">
      <a class="profile-dropdown-item" href="profile.html" role="menuitem">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="#1F2A44" stroke-width="1.8"/><path d="M4 20c1.6-3.6 4.8-5.5 8-5.5s6.4 1.9 8 5.5" stroke="#1F2A44" stroke-width="1.8" stroke-linecap="round"/></svg>
        Edit profile
      </a>
      <div class="profile-dropdown-divider"></div>
      <button type="button" class="profile-dropdown-item is-danger" id="logout-btn" role="menuitem">
        <svg viewBox="0 0 24 24" fill="none"><path d="M15 17l5-5-5-5" stroke="#B0392E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12H9" stroke="#B0392E" stroke-width="1.8" stroke-linecap="round"/><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4" stroke="#B0392E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Log out
      </button>
    </div>
  `;
  mount.querySelector('.profile-avatar').textContent = initial;
  mount.querySelector('.profile-name').textContent = name;

  const btn = document.getElementById('profile-btn');
  const logoutBtn = document.getElementById('logout-btn');

  function closeMenu() {
    mount.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = mount.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (e) => {
    if (!mount.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  logoutBtn.addEventListener('click', () => {
    window.clearFindxSession();
    window.location.href = 'index.html';
  });
});
