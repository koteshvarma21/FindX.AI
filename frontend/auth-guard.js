/* Runs before the rest of the page and requires a real backend JWT. */
(function () {
  if (!localStorage.getItem('token')) {
    window.location.replace('index.html');
  }
})();
