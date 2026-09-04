/* ============================================================
   FindX.AI — home page
   Wires up the two "How do you want to search?" tiles. Both
   just take the visitor to the search page — clicking "Upload
   a photo" opens it on the Upload tab, clicking "Describe it"
   opens it on the Describe tab.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const tags = document.querySelectorAll('.tag[data-mode]');

  function goToSearch(mode) {
    window.location.href = `search.html?tab=${mode}`;
  }

  tags.forEach((tag) => {
    tag.addEventListener('click', () => goToSearch(tag.dataset.mode));

    // Tiles are role="button" + tabindex="0", so make them keyboard-operable too.
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToSearch(tag.dataset.mode);
      }
    });
  });
});
