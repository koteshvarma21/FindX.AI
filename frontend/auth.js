/* ============================================================
   FindX.AI auth — combined Log in / Sign up page, confirmed
   with an OTP. Powered by Featherless.AI.

   This file has TWO integration points marked "FEATHERLESS.AI
   API CALL" below. Replace the mock logic inside each function
   with real calls to your Featherless.AI endpoint and API key.
   Everything else (validation, tab switching, OTP boxes, resend
   timer, screen transitions) will keep working unchanged.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const authTabs = document.getElementById('auth-tabs');
  const loginStep = document.getElementById('login-credentials-step');
  const signupStep = document.getElementById('signup-details-step');
  const otpStep = document.getElementById('otp-step');
  const switchLoginCopy = document.getElementById('auth-switch-login');
  const switchSignupCopy = document.getElementById('auth-switch-signup');

  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  const loginEmailError = document.getElementById('login-email-error');
  const loginPasswordError = document.getElementById('login-password-error');
  const loginContinueBtn = document.getElementById('login-continue-btn');

  const signupNameInput = document.getElementById('signup-name');
  const signupUsernameInput = document.getElementById('signup-username');
  const signupEmailInput = document.getElementById('signup-email');
  const signupPasswordInput = document.getElementById('signup-password');
  const signupConfirmInput = document.getElementById('signup-confirm');
  const signupNameError = document.getElementById('signup-name-error');
  const signupUsernameError = document.getElementById('signup-username-error');
  const signupEmailError = document.getElementById('signup-email-error');
  const signupPasswordError = document.getElementById('signup-password-error');
  const signupConfirmError = document.getElementById('signup-confirm-error');
  const signupContinueBtn = document.getElementById('signup-continue-btn');

  const otpEmailDisplay = document.getElementById('otp-email-display');
  const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
  const otpError = document.getElementById('otp-error');
  const verifyBtn = document.getElementById('verify-btn');
  const resendBtn = document.getElementById('resend-btn');
  const backBtn = document.getElementById('back-btn');
  const resendTimerEl = document.getElementById('resend-timer');

  let resendInterval = null;
  let currentFlow = 'login';        // 'login' | 'signup'
  let previousStepEl = loginStep;   // step to return to on "Go back"
  let pendingEmail = '';

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('is-visible');
  }

  function clearAllErrors() {
    [loginEmailError, loginPasswordError, signupNameError, signupUsernameError,
     signupEmailError, signupPasswordError, signupConfirmError, otpError].forEach(clearError);
  }

  /* ---------------- Tab switching ---------------- */
  function setActiveTab(tab) {
    currentFlow = tab;
    Array.from(authTabs.querySelectorAll('.auth-tab-btn')).forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.authTab === tab);
    });
    clearAllErrors();
    otpStep.classList.add('is-hidden');
    clearInterval(resendInterval);

    if (tab === 'login') {
      loginStep.classList.remove('is-hidden');
      signupStep.classList.add('is-hidden');
      switchLoginCopy.classList.remove('is-hidden');
      switchSignupCopy.classList.add('is-hidden');
      previousStepEl = loginStep;
    } else {
      signupStep.classList.remove('is-hidden');
      loginStep.classList.add('is-hidden');
      switchSignupCopy.classList.remove('is-hidden');
      switchLoginCopy.classList.add('is-hidden');
      previousStepEl = signupStep;
    }
  }

  document.querySelectorAll('[data-auth-tab]').forEach((el) => {
    el.addEventListener('click', () => setActiveTab(el.dataset.authTab));
  });

  /* ------------------------------------------------------------
     FEATHERLESS.AI API CALL — send OTP
     Replace this mock with a real request, e.g.:

     async function sendOtpViaFeatherless(email) {
       const res = await fetch('https://api.featherless.ai/v1/otp/send', {
         method: 'POST',
         headers: {
           'Authorization': 'Bearer YOUR_FEATHERLESS_API_KEY',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ email }),
       });
       if (!res.ok) throw new Error('Failed to send OTP');
       return res.json();
     }
     ------------------------------------------------------------ */
  async function sendOtpViaFeatherless(email) {
    console.log(`[Featherless.AI] Sending OTP to ${email} (mock)`);
    return Promise.resolve({ sent: true });
  }

  /* ------------------------------------------------------------
     FEATHERLESS.AI API CALL — verify OTP
     Replace this mock with a real request, e.g.:

     async function verifyOtpViaFeatherless(email, code) {
       const res = await fetch('https://api.featherless.ai/v1/otp/verify', {
         method: 'POST',
         headers: {
           'Authorization': 'Bearer YOUR_FEATHERLESS_API_KEY',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ email, code }),
       });
       if (!res.ok) return { verified: false };
       return res.json();
     }
     ------------------------------------------------------------ */
  async function verifyOtpViaFeatherless(email, code) {
    console.log(`[Featherless.AI] Verifying OTP ${code} for ${email} (mock)`);
    return Promise.resolve({ verified: code.length === 6 });
  }

  function startResendTimer() {
    let seconds = 60;
    resendBtn.disabled = true;
    resendTimerEl.textContent = seconds;
    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      seconds -= 1;
      resendTimerEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(resendInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
      }
    }, 1000);
  }

  function resetResendLabel() {
    resendBtn.innerHTML = 'Resend code (<span id="resend-timer">60</span>s)';
  }

  function goToOtpStep(fromStep, email) {
    pendingEmail = email;
    previousStepEl = fromStep;
    otpEmailDisplay.textContent = email;
    fromStep.classList.add('is-hidden');
    otpStep.classList.remove('is-hidden');
    switchLoginCopy.classList.add('is-hidden');
    switchSignupCopy.classList.add('is-hidden');
    otpBoxes.forEach((box) => { box.value = ''; });
    otpBoxes[0].focus();
    startResendTimer();
  }

  /* Derive a friendly display name from an email's local part, e.g.
     "john.doe@x.com" -> "John Doe". Used for demo logins where no
     name was collected (real accounts would come from your backend). */
  function nameFromEmail(email) {
    const local = email.split('@')[0] || 'Member';
    return local
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Member';
  }

  /* -------- Login: Step 1 -> OTP -------- */
  loginStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginEmailError);
    clearError(loginPasswordError);

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    let valid = true;

    if (!isValidEmail(email)) {
      showError(loginEmailError, 'Enter a valid email address');
      valid = false;
    }
    if (!password) {
      showError(loginPasswordError, 'Enter your password');
      valid = false;
    }
    if (!valid) return;

    loginContinueBtn.disabled = true;
    loginContinueBtn.textContent = 'Sending code…';

    try {
      await sendOtpViaFeatherless(email);
      currentFlow = 'login';
      goToOtpStep(loginStep, email);
    } catch (err) {
      showError(loginPasswordError, 'Could not send code — try again');
    } finally {
      loginContinueBtn.disabled = false;
      loginContinueBtn.innerHTML = '<span class="btn-spark">✨</span> Continue';
    }
  });

  /* -------- Sign up: Step 1 -> OTP -------- */
  signupStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    [signupNameError, signupUsernameError, signupEmailError, signupPasswordError, signupConfirmError].forEach(clearError);

    const name = signupNameInput.value.trim();
    const username = signupUsernameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;
    const confirm = signupConfirmInput.value;
    let valid = true;

    if (!name) {
      showError(signupNameError, 'Enter your full name');
      valid = false;
    }
    if (!username) {
      showError(signupUsernameError, 'Choose a username');
      valid = false;
    }
    if (!isValidEmail(email)) {
      showError(signupEmailError, 'Enter a valid email address');
      valid = false;
    }
    if (!password || password.length < 6) {
      showError(signupPasswordError, 'Use at least 6 characters');
      valid = false;
    }
    if (confirm !== password) {
      showError(signupConfirmError, 'Passwords don\'t match');
      valid = false;
    }
    if (!valid) return;

    signupContinueBtn.disabled = true;
    signupContinueBtn.textContent = 'Sending code…';

    try {
      await sendOtpViaFeatherless(email);
      currentFlow = 'signup';
      goToOtpStep(signupStep, email);
    } catch (err) {
      showError(signupEmailError, 'Could not send code — try again');
    } finally {
      signupContinueBtn.disabled = false;
      signupContinueBtn.innerHTML = '<span class="btn-spark">✨</span> Create account';
    }
  });

  /* OTP box behavior: auto-advance, backspace, digits only */
  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      const digits = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, otpBoxes.length);
      if (!digits) return;
      e.preventDefault();
      digits.split('').forEach((d, idx) => { if (otpBoxes[idx]) otpBoxes[idx].value = d; });
      otpBoxes[Math.min(digits.length, otpBoxes.length - 1)].focus();
    });
  });

  /* -------- Shared: verify OTP, then route by flow -------- */
  otpStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(otpError);

    const code = otpBoxes.map((box) => box.value).join('');
    if (code.length < 6) {
      showError(otpError, 'Enter all 6 digits');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying…';

    try {
      const result = await verifyOtpViaFeatherless(pendingEmail, code);
      if (result.verified) {
        sessionStorage.setItem('findx-auth', 'true');
        sessionStorage.setItem('findx-user-email', pendingEmail);

        if (currentFlow === 'signup') {
          sessionStorage.setItem('findx-user-name', signupNameInput.value.trim());
          sessionStorage.setItem('findx-user-username', signupUsernameInput.value.trim());
        } else {
          // Demo login: no name is collected at login, so derive one.
          // A real backend would return the account's saved name here.
          if (!sessionStorage.getItem('findx-user-name')) {
            sessionStorage.setItem('findx-user-name', nameFromEmail(pendingEmail));
          }
        }

        window.location.href = 'home.html';
      } else {
        showError(otpError, 'That code didn\'t match — try again');
      }
    } catch (err) {
      showError(otpError, 'Verification failed — try again');
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<span class="btn-spark">✨</span> Verify &amp; continue';
    }
  });

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    await sendOtpViaFeatherless(pendingEmail);
    resetResendLabel();
    startResendTimer();
  });

  backBtn.addEventListener('click', () => {
    otpStep.classList.add('is-hidden');
    previousStepEl.classList.remove('is-hidden');
    if (previousStepEl === loginStep) {
      switchLoginCopy.classList.remove('is-hidden');
    } else {
      switchSignupCopy.classList.remove('is-hidden');
    }
    clearInterval(resendInterval);
  });

});
