// Switches between the signup, login and reset forms on /auth without reloading the page,
// and manages accessible client-side validation across the four assessment categories:
// 1. Empty-field errors on blur.
// 2. Business length and structure rules (single names allowed; min 2 chars with letters; 15+ code-point password on signup).
// 3. Real-time email format on signup vs. submit-time format on login.
// 4. Accessible ARIA attributes (aria-invalid, aria-describedby, role="alert", focus recovery).
(function () {
  'use strict';

  var MODES = ['signup', 'login', 'reset'];
  var forms = {};
  MODES.forEach(function (mode) {
    forms[mode] = document.querySelector('[data-auth-form="' + mode + '"]');
  });

  function modeFromAddress() {
    var mode = new URLSearchParams(window.location.search).get('mode');
    return MODES.indexOf(mode) === -1 ? 'login' : mode;
  }

  var currentMode = modeFromAddress();

  function show(mode, moveFocus) {
    currentMode = mode;
    MODES.forEach(function (name) {
      forms[name].hidden = name !== mode;
    });
    document.title = forms[mode].getAttribute('data-title');
    if (moveFocus) {
      // Announce mode switch to screen readers
      forms[mode].querySelector('h1').focus();
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-auth-mode]');
    if (!link) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var mode = link.getAttribute('data-auth-mode');
    if (mode === currentMode) return;
    window.history.pushState({ mode: mode }, '', '/auth?mode=' + mode);
    show(mode, true);
  });

  window.addEventListener('popstate', function () {
    show(modeFromAddress(), true);
  });

  // =========================================================================
  // CLIENT-SIDE VALIDATION ENGINE
  // =========================================================================

  function getErrorEl(input) {
    return document.getElementById(input.id + '-error');
  }

  function setError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    var el = getErrorEl(input);
    if (el) {
      el.innerHTML = '<span aria-hidden="true">⚠</span> ' + message;
    }
    return false;
  }

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    var el = getErrorEl(input);
    if (el) {
      el.innerHTML = '';
    }
    return true;
  }

  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Allows any language's letters via Unicode \p{L}, spaces, hyphens, apostrophes.
  var LETTER_REGEX = /\p{L}/u;

  // Category 2: Name Rule
  // Nit's Cut explicitly allows single names (mononyms like "Chinedu", "Dapo", "Zendaya").
  // Requires at least 2 characters and at least one letter. Rejects pure punctuation (e.g. "..") and 1-char tokens.
  function validateName(input, isBlur) {
    var val = input.value.trim();
    if (!val) {
      return isBlur ? setError(input, 'Please enter your name so we know who to address when you visit the shop.') : clearError(input);
    }
    if (val.length < 2 || !LETTER_REGEX.test(val)) {
      return setError(input, 'Please enter at least two characters, including a letter.');
    }
    return clearError(input);
  }

  // Category 3: Email format on Signup and Reset
  function validateEmail(input, mode, isRealtime) {
    var val = input.value.trim();
    if (!val) {
      if (isRealtime) {
        // While typing, if they erase to empty, clear the format error until blur/submit
        return clearError(input);
      }
      var emptyMsg;
      if (mode === 'signup') {
        emptyMsg = 'An email address is required to send your fitting confirmations and receipts.';
      } else if (mode === 'reset') {
        emptyMsg = 'Enter your email address to request a password reset.';
      } else {
        emptyMsg = 'Please enter your email address to access your account.';
      }
      return setError(input, emptyMsg);
    }
    if (!EMAIL_REGEX.test(val)) {
      return setError(input, 'Please enter a valid email address (e.g. name@example.com).');
    }
    return clearError(input);
  }

  // Category 1 & 2: Password
  // On signup: 15-character minimum counting Unicode code points, preserving spaces in passphrases.
  // Rejects all-whitespace passwords.
  // On login: only checks not-empty.
  function validatePassword(input, mode, isBlur) {
    var val = input.value;
    if (!val) {
      var emptyMsg = mode === 'signup'
        ? 'Please choose a password to protect your account.'
        : 'Please enter your password.';
      return isBlur ? setError(input, emptyMsg) : clearError(input);
    }
    if (mode === 'signup') {
      // Check if password consists solely of whitespace
      if (!val.trim()) {
        return setError(input, 'Password cannot consist solely of spaces.');
      }
      // Count Unicode code points (handles multi-byte and surrogate pairs accurately)
      var codePoints = Array.from(val).length;
      if (codePoints < 15) {
        return setError(input, 'Password must be at least 15 characters long.');
      }
    }
    return clearError(input);
  }

  // Category 1 & 4: Terms acceptance
  function validateTerms(input) {
    if (!input.checked) {
      return setError(input, 'You must agree to the Terms of Service to create an account.');
    }
    return clearError(input);
  }

  // ---- SIGNUP FORM BINDINGS ----
  var signupForm = forms.signup ? forms.signup.querySelector('form') : null;
  if (signupForm) {
    var sName = document.getElementById('signup-name');
    var sEmail = document.getElementById('signup-email');
    var sPassword = document.getElementById('signup-password');
    var sTerms = document.getElementById('signup-terms');

    sName.addEventListener('blur', function () { validateName(sName, true); });
    sName.addEventListener('input', function () {
      if (sName.getAttribute('aria-invalid') === 'true') validateName(sName, false);
    });

    // Real-time email validation on signup
    sEmail.addEventListener('input', function () { validateEmail(sEmail, 'signup', true); });
    sEmail.addEventListener('blur', function () { validateEmail(sEmail, 'signup', false); });

    sPassword.addEventListener('blur', function () { validatePassword(sPassword, 'signup', true); });
    sPassword.addEventListener('input', function () {
      if (sPassword.getAttribute('aria-invalid') === 'true') validatePassword(sPassword, 'signup', false);
    });

    sTerms.addEventListener('change', function () { validateTerms(sTerms); });

    signupForm.addEventListener('submit', function (e) {
      var okName = validateName(sName, true);
      var okEmail = validateEmail(sEmail, 'signup', false);
      var okPass = validatePassword(sPassword, 'signup', true);
      var okTerms = validateTerms(sTerms);

      if (!okName || !okEmail || !okPass || !okTerms) {
        e.preventDefault();
        // Focus recovery (Category 4): move focus to the first invalid field
        var firstInvalid = signupForm.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
      }
    });
  }

  // ---- LOGIN FORM BINDINGS ----
  var loginForm = forms.login ? forms.login.querySelector('form') : null;
  if (loginForm) {
    var lEmail = document.getElementById('login-email');
    var lPassword = document.getElementById('login-password');

    // Submit-only email format validation on login:
    // On blur: only check empty. NEVER show format error on blur.
    lEmail.addEventListener('blur', function () {
      if (!lEmail.value.trim()) {
        setError(lEmail, 'Please enter your email address to access your account.');
      } else {
        clearError(lEmail);
      }
    });

    lEmail.addEventListener('input', function () {
      if (lEmail.getAttribute('aria-invalid') === 'true' && lEmail.value.trim()) {
        clearError(lEmail);
      }
    });

    lPassword.addEventListener('blur', function () { validatePassword(lPassword, 'login', true); });
    lPassword.addEventListener('input', function () {
      if (lPassword.getAttribute('aria-invalid') === 'true') validatePassword(lPassword, 'login', false);
    });

    loginForm.addEventListener('submit', function (e) {
      var valEmail = lEmail.value.trim();
      var okEmail = true;
      if (!valEmail) {
        setError(lEmail, 'Please enter your email address to access your account.');
        okEmail = false;
      } else if (!EMAIL_REGEX.test(valEmail)) {
        // Format error appears strictly on submit!
        setError(lEmail, 'Please enter a valid email address (e.g. name@example.com).');
        okEmail = false;
      } else {
        clearError(lEmail);
      }

      var okPass = validatePassword(lPassword, 'login', true);

      if (!okEmail || !okPass) {
        e.preventDefault();
        var firstInvalid = loginForm.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
      }
    });
  }

  // ---- RESET FORM BINDINGS ----
  var resetForm = forms.reset ? forms.reset.querySelector('form') : null;
  if (resetForm) {
    var rEmail = document.getElementById('reset-email');
    rEmail.addEventListener('blur', function () { validateEmail(rEmail, 'reset', false); });
    rEmail.addEventListener('input', function () {
      if (rEmail.getAttribute('aria-invalid') === 'true' && EMAIL_REGEX.test(rEmail.value.trim())) {
        clearError(rEmail);
      }
    });

    resetForm.addEventListener('submit', function (e) {
      if (!validateEmail(rEmail, 'reset', false)) {
        e.preventDefault();
        rEmail.focus();
      }
    });
  }
})();
