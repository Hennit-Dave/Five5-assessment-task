// Switches between the signup, login and reset forms on /auth without reloading the page.
// The server already renders the correct form for any /auth?mode=... address, so this script only
// improves the experience: it never fetches anything and never creates a request of its own.
(function () {
  'use strict';

  var MODES = ['signup', 'login', 'reset'];
  var forms = {};
  MODES.forEach(function (mode) {
    forms[mode] = document.querySelector('[data-auth-form="' + mode + '"]');
  });
  var switchLinks = document.querySelectorAll('.auth-switch [data-auth-mode]');

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
    switchLinks.forEach(function (link) {
      var active = link.getAttribute('data-auth-mode') === mode;
      link.classList.toggle('btn-active', active);
      link.classList.toggle('btn-secondary', !active);
      if (active) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    document.title = forms[mode].getAttribute('data-title');
    if (moveFocus) {
      // Tell keyboard and screen reader users that the form changed.
      forms[mode].querySelector('h1').focus();
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-auth-mode]');
    if (!link) return;
    // Leave new-tab and new-window clicks to the browser.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var mode = link.getAttribute('data-auth-mode');
    if (mode === currentMode) return;
    window.history.pushState({ mode: mode }, '', '/auth?mode=' + mode);
    show(mode, true);
  });

  // Back and Forward change the address without a page load; show the form that matches it.
  window.addEventListener('popstate', function () {
    show(modeFromAddress(), true);
  });
})();
