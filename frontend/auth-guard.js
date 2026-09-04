/* Runs before the rest of the page — sends visitors to index.html
   (the login / sign up page) until they've completed the
   email/username + password + OTP flow there. */
(function () {
  if (!sessionStorage.getItem('findx-auth')) {
    window.location.replace('index.html');
  }
})();
