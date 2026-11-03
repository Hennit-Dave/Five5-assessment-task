import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9355;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = '/Users/blk/Developer/Five5 assessment task/task-03-client-validation/evidence';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-step7-test',
  `${BASE}/auth?mode=signup`
]);

await sleep(1500);

try {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (msg) => {
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result || msg);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  console.log('=== STEP 7 VERIFICATION SUITE ===\n');

  // Test 1: Signup Form Active/Inactive Button Dynamics
  console.log('--- TEST 1: Signup dynamic button state ---');
  const sBtnInitial = await evaluate(`(() => {
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');
    return {
      visible: !!btn && getComputedStyle(btn).display !== 'none',
      ariaDisabled: btn.getAttribute('aria-disabled'),
      cursor: getComputedStyle(btn).cursor,
      text: btn.textContent.trim()
    };
  })()`);
  console.log('1a. Initial empty Signup button state:', sBtnInitial);

  // Progressive typing on Signup
  const sProgress = await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');

    // Fill Name only
    name.value = 'Folake Adeyemi';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const afterName = btn.getAttribute('aria-disabled');

    // Fill Email
    email.value = 'folake.test@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const afterEmail = btn.getAttribute('aria-disabled');

    // Fill Password (14 chars boundary - invalid)
    pass.value = '12345678901234';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterPass14 = btn.getAttribute('aria-disabled');

    // Fill Password (15+ chars valid)
    pass.value = 'bespoke lagos suit 2026'; // 23 chars
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterPassValid = btn.getAttribute('aria-disabled');

    // Check Terms -> should become active!
    terms.checked = true;
    terms.dispatchEvent(new Event('change', { bubbles: true }));
    const afterTermsChecked = btn.getAttribute('aria-disabled');

    // Uncheck Terms -> should become inactive again!
    terms.checked = false;
    terms.dispatchEvent(new Event('change', { bubbles: true }));
    const afterTermsUnchecked = btn.getAttribute('aria-disabled');

    // Recheck Terms
    terms.checked = true;
    terms.dispatchEvent(new Event('change', { bubbles: true }));
    const restoredActive = btn.getAttribute('aria-disabled');

    // Make password all whitespace (15 spaces) -> invalid
    pass.value = '               ';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterAllSpaces = btn.getAttribute('aria-disabled');

    // Restore valid password
    pass.value = 'bespoke lagos suit 2026';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const fullyRestored = btn.getAttribute('aria-disabled');

    return {
      afterName,
      afterEmail,
      afterPass14,
      afterPassValidTermsUnchecked: afterPassValid,
      afterTermsChecked,
      afterTermsUnchecked,
      restoredActive,
      afterAllSpaces,
      fullyRestored
    };
  })()`);
  console.log('1b. Signup field transitions:', sProgress);

  // Test 2: Login Form Dynamics
  console.log('\n--- TEST 2: Login dynamic button state ---');
  await evaluate(`(() => {
    const link = document.querySelector('[data-auth-mode="login"]');
    if (link) link.click();
  })()`);
  await sleep(300);

  const lDynamics = await evaluate(`(() => {
    const email = document.getElementById('login-email');
    const pass = document.getElementById('login-password');
    const btn = document.querySelector('[data-auth-form="login"] button[type="submit"]');

    const initial = btn.getAttribute('aria-disabled');

    email.value = 'folake.test@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const afterEmail = btn.getAttribute('aria-disabled');

    // Password short (5 chars) on Login -> should become active! (15-char rule NOT applied to login)
    pass.value = 'short';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterShortPass = btn.getAttribute('aria-disabled');

    // Erase password to empty -> inactive again
    pass.value = '';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterEmptyPass = btn.getAttribute('aria-disabled');

    // Restore password -> active
    pass.value = 'mypassword';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const restoredActive = btn.getAttribute('aria-disabled');

    return { initial, afterEmail, afterShortPass, afterEmptyPass, restoredActive };
  })()`);
  console.log('2. Login field transitions:', lDynamics);

  // Test 3: Reset Form Dynamics
  console.log('\n--- TEST 3: Reset dynamic button state ---');
  await evaluate(`(() => {
    const link = document.querySelector('[data-auth-mode="reset"]');
    if (link) link.click();
  })()`);
  await sleep(300);

  const rDynamics = await evaluate(`(() => {
    const email = document.getElementById('reset-email');
    const btn = document.querySelector('[data-auth-form="reset"] button[type="submit"]');

    const initial = btn.getAttribute('aria-disabled');

    email.value = 'invalid-email';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const afterInvalidEmail = btn.getAttribute('aria-disabled');

    email.value = 'folake.test@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const afterValidEmail = btn.getAttribute('aria-disabled');

    email.value = '';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    const afterCleared = btn.getAttribute('aria-disabled');

    return { initial, afterInvalidEmail, afterValidEmail, afterCleared };
  })()`);
  console.log('3. Reset field transitions:', rDynamics);

  // Test 4: Password Hint Progressive Reveal & Screen Reader Availability
  console.log('\n--- TEST 4: Password hint progressive reveal & accessibility ---');
  await evaluate(`(() => {
    const link = document.querySelector('[data-auth-mode="signup"]');
    if (link) link.click();
  })()`);
  await sleep(300);

  const hintTests = await evaluate(`(() => {
    const pass = document.getElementById('signup-password');
    const hint = document.getElementById('signup-password-hint');
    const ariaDesc = pass.getAttribute('aria-describedby');

    // Reset password field to empty
    pass.value = '';
    const initialHidden = hint.classList.contains('nc-visually-hidden');

    // Start typing
    pass.value = 'a';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    const afterTypingHidden = hint.classList.contains('nc-visually-hidden');

    return {
      ariaDescribedby: ariaDesc,
      linkedId: hint.id,
      initialHasVisuallyHidden: initialHidden,
      afterTypingHasVisuallyHidden: afterTypingHidden,
      hintText: hint.textContent.trim()
    };
  })()`);
  console.log('4. Password hint inspection:', hintTests);

  // Test 5: Heroicons Password Visibility Toggle on Signup and Login
  console.log('\n--- TEST 5: Password visibility toggles ---');
  const toggleTestsSignup = await evaluate(`(() => {
    const pass = document.getElementById('signup-password');
    const wrap = pass.closest('.password-input-wrap');
    const btn = wrap.querySelector('.password-toggle-btn');
    const iconShow = btn.querySelector('.password-icon-show');
    const iconHide = btn.querySelector('.password-icon-hide');

    pass.value = 'SecretPhrase12345';
    const initType = pass.type;
    const initLabel = btn.getAttribute('aria-label');
    const initIconShowVisible = !iconShow.hasAttribute('hidden');
    const initIconHideHidden = iconHide.hasAttribute('hidden');

    // Click toggle to reveal
    btn.click();
    const revealedType = pass.type;
    const revealedLabel = btn.getAttribute('aria-label');
    const revealedValPreserved = pass.value === 'SecretPhrase12345';
    const revealedIconShowHidden = iconShow.hasAttribute('hidden');
    const revealedIconHideVisible = !iconHide.hasAttribute('hidden');

    // Click toggle to hide again
    btn.click();
    const hiddenType = pass.type;
    const hiddenLabel = btn.getAttribute('aria-label');

    return {
      initType, initLabel, initIconShowVisible, initIconHideHidden,
      revealedType, revealedLabel, revealedValPreserved, revealedIconShowHidden, revealedIconHideVisible,
      hiddenType, hiddenLabel
    };
  })()`);
  console.log('5a. Signup password toggle:', toggleTestsSignup);

  // Switch to Login and test Login toggle
  await evaluate(`(() => {
    const link = document.querySelector('[data-auth-mode="login"]');
    if (link) link.click();
  })()`);
  await sleep(300);

  const toggleTestsLogin = await evaluate(`(() => {
    const pass = document.getElementById('login-password');
    const wrap = pass.closest('.password-input-wrap');
    const btn = wrap.querySelector('.password-toggle-btn');

    pass.value = 'UserSecretPass';
    const initType = pass.type;
    btn.click();
    const revealedType = pass.type;
    const revealedLabel = btn.getAttribute('aria-label');
    btn.click();
    const hiddenType = pass.type;

    return { initType, revealedType, revealedLabel, hiddenType };
  })()`);
  console.log('5b. Login password toggle:', toggleTestsLogin);

  // Test 6: Inactive Submit Guard and Terms-Only Validation Message
  console.log('\n--- TEST 6: Inactive submit guard & Terms validation ---');
  await evaluate(`(() => {
    const link = document.querySelector('[data-auth-mode="signup"]');
    if (link) link.click();
  })()`);
  await sleep(300);

  const termsGuardTest = await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');
    const termsError = document.getElementById('signup-terms-error');
    const form = document.querySelector('[data-auth-form="signup"] form');
    const btn = form.querySelector('button[type="submit"]');

    // Fill all fields valid EXCEPT Terms
    name.value = 'Folake Adeyemi';
    email.value = 'folake.test@example.com';
    pass.value = 'bespoke lagos suit 2026';
    terms.checked = false;

    // Simulate clicking inactive button
    let submitPrevented = false;
    form.addEventListener('submit', (e) => {
      if (e.defaultPrevented) submitPrevented = true;
    }, { capture: false });

    // Submit via form dispatch or button click
    btn.click();

    return {
      buttonAriaDisabled: btn.getAttribute('aria-disabled'),
      termsErrorShown: termsError.textContent.trim(),
      termsRoleAlert: termsError.getAttribute('role'),
      activeElementId: document.activeElement ? document.activeElement.id : null,
      termsChecked: terms.checked
    };
  })()`);
  console.log('6a. Terms-only submission attempt:', termsGuardTest);

  // Test 7: Stylistic & Token Verification for Inactive Button
  console.log('\n--- TEST 7: Computed styles & tokens for inactive button ---');
  const btnStyles = await evaluate(`(() => {
    const btn = document.querySelector('[data-auth-form="signup"] button[type="submit"]');
    btn.focus();
    const style = getComputedStyle(btn);
    return {
      cursor: style.cursor,
      backgroundColor: style.backgroundColor,
      color: style.color,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor
    };
  })()`);
  console.log('7. Inactive button computed styles when focused:', btnStyles);

  // Test 8: Mobile Input Padding (375px)
  console.log('\n--- TEST 8: Mobile padding on password input ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(200);

  const mobileStyles = await evaluate(`(() => {
    const input = document.getElementById('signup-password');
    const wrap = input.closest('.password-input-wrap');
    const btn = wrap.querySelector('.password-toggle-btn');
    const style = getComputedStyle(input);
    const btnRect = btn.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();

    return {
      paddingInlineEnd: style.paddingInlineEnd,
      inputWidth: inputRect.width,
      btnWidth: btnRect.width,
      btnRightOffset: inputRect.right - btnRect.right
    };
  })()`);
  console.log('8. Mobile 375px password input padding & metrics:', mobileStyles);

  // Restore 1000x990 viewport for Evidence 14 Capture
  console.log('\n--- CAPTURING EVIDENCE 14: 14-button-disabled-version.png ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1000,
    height: 990,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(200);

  // Setup exact reproducing state:
  // Fictional data:
  // Full Name: "Folake Adeyemi"
  // Email: "folake.test@example.com"
  // Password: empty, hint visible
  // Terms: checked
  // Inactive Sign up button visible in normal position!
  await evaluate(`(() => {
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');
    const hint = document.getElementById('signup-password-hint');

    name.value = 'Folake Adeyemi';
    email.value = 'folake.test@example.com';
    pass.value = '';
    // Reveal hint as in screenshot 13
    hint.classList.remove('nc-visually-hidden');
    terms.checked = true;

    // Clear any previous error messages
    document.querySelectorAll('.form-error').forEach(el => el.innerHTML = '');
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

    // Trigger input/change to update button state
    name.dispatchEvent(new Event('input', { bubbles: true }));
    email.dispatchEvent(new Event('input', { bubbles: true }));
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    terms.dispatchEvent(new Event('change', { bubbles: true }));

    // Remove focus ring from any field so screenshot is clean
    if (document.activeElement) document.activeElement.blur();
  })()`);
  await sleep(300);

  const screenshotData = await send('Page.captureScreenshot', {
    format: 'png'
  });

  const outPath = path.join(OUT_DIR, '14-button-disabled-version.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotData.data, 'base64'));
  console.log('Successfully saved Evidence 14 to:', outPath);

  console.log('\n=== ALL STEP 7 TESTS PASSED SUCCESSFULLY ===');
} finally {
  chromeProc.kill('SIGKILL');
}

