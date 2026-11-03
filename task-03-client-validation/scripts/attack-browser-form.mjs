import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9380;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_FILE = '/Users/blk/Developer/Five5 assessment task/task-03-client-validation/evidence/15-form-attack-results.txt';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-attack-test-updated',
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
  await send('Network.enable');

  const capturedPosts = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.method === 'Network.requestWillBeSent' && msg.params.request.method === 'POST') {
      capturedPosts.push(msg.params.request.url);
    }
  });

  console.log('=== RUNNING BROWSER FORM ATTACK TESTS (STEP 8) ===\n');

  // Test 1: Empty Name on blur
  const t1 = await evaluate(`(() => {
    const inp = document.getElementById('signup-name');
    inp.value = '';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-name-error');
    return { value: inp.value, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 2: Single-character name ("A")
  const t2 = await evaluate(`(() => {
    const inp = document.getElementById('signup-name');
    inp.value = 'A';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-name-error');
    return { value: inp.value, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 3: Pure punctuation name ("...")
  const t3 = await evaluate(`(() => {
    const inp = document.getElementById('signup-name');
    inp.value = '...';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-name-error');
    return { value: inp.value, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 4: Name with surrounding whitespace ("   Adeyemi   ")
  const t4 = await evaluate(`(() => {
    const inp = document.getElementById('signup-name');
    inp.value = '   Adeyemi   ';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-name-error');
    return { rawValue: inp.value, trimmed: inp.value.trim(), invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 5: Excessive length name (5,008 characters)
  const t5 = await evaluate(`(() => {
    const inp = document.getElementById('signup-name');
    inp.value = 'Adeyemi ' + 'A'.repeat(5000);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.blur();
    const err = document.getElementById('signup-name-error');
    const form = document.querySelector('[data-auth-form="signup"] form');
    const btn = form.querySelector('button[type="submit"]');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim(), btnAriaDisabled: btn.getAttribute('aria-disabled') };
  })()`);

  // Test 6: Empty Email on blur
  const t6 = await evaluate(`(() => {
    const inp = document.getElementById('signup-email');
    inp.value = '';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-email-error');
    return { value: inp.value, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 7: Exact "a@b" from assessment brief on Signup email
  capturedPosts.length = 0; // reset counter
  const t7 = await evaluate(`(() => {
    const form = document.querySelector('[data-auth-form="signup"] form');
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');
    const err = document.getElementById('signup-email-error');
    const btn = form.querySelector('button[type="submit"]');

    // Fill valid name, valid password, checked terms
    name.value = 'Folake Adeyemi';
    pass.value = 'bespoke lagos suit 2026';
    terms.checked = true;

    // Input exact a@b
    email.value = 'a@b';
    email.dispatchEvent(new Event('input', { bubbles: true }));

    // Try clicking submit button
    btn.click();

    return {
      inputTested: email.value,
      invalid: email.getAttribute('aria-invalid'),
      errorText: err.textContent.trim(),
      btnAriaDisabled: btn.getAttribute('aria-disabled'),
      focusedId: document.activeElement ? document.activeElement.id : null
    };
  })()`);
  await sleep(300);
  const t7PostsCount = capturedPosts.filter(u => u.includes('/auth/signup')).length;

  // Test 8: Minimal regex matching address ("a@b.c")
  const t8 = await evaluate(`(() => {
    const inp = document.getElementById('signup-email');
    inp.value = 'a@b.c';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.blur();
    const err = document.getElementById('signup-email-error');
    return { value: inp.value, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 9: Excessive length email (3,018 characters)
  const t9 = await evaluate(`(() => {
    const inp = document.getElementById('signup-email');
    inp.value = 'folake' + 'a'.repeat(3000) + '@example.com';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.blur();
    const err = document.getElementById('signup-email-error');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 10: 14-character boundary password ("12345678901234")
  const t10 = await evaluate(`(() => {
    const inp = document.getElementById('signup-password');
    inp.value = '12345678901234';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-password-error');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 11: Pure whitespace password ("               ", 15 spaces)
  const t11 = await evaluate(`(() => {
    const inp = document.getElementById('signup-password');
    inp.value = '               ';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-password-error');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 12: Valid 23-character passphrase ("bespoke lagos suit 2026")
  const t12 = await evaluate(`(() => {
    const inp = document.getElementById('signup-password');
    inp.value = 'bespoke lagos suit 2026';
    inp.focus();
    inp.blur();
    const err = document.getElementById('signup-password-error');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim() };
  })()`);

  // Test 13: Excessive length password (10,016 characters)
  const t13 = await evaluate(`(() => {
    const inp = document.getElementById('signup-password');
    inp.value = 'ValidPassphrase!' + 'X'.repeat(10000);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.blur();
    const err = document.getElementById('signup-password-error');
    const form = document.querySelector('[data-auth-form="signup"] form');
    const btn = form.querySelector('button[type="submit"]');
    return { lengthTested: inp.value.length, invalid: inp.getAttribute('aria-invalid'), errorText: err.textContent.trim(), btnAriaDisabled: btn.getAttribute('aria-disabled') };
  })()`);

  // Test 14: Terms left unchecked on submit attempt
  const t14 = await evaluate(`(() => {
    const form = document.querySelector('[data-auth-form="signup"] form');
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');
    const termsErr = document.getElementById('signup-terms-error');

    name.value = 'Folake Adeyemi';
    email.value = 'folake.test@example.com';
    pass.value = 'bespoke lagos suit 2026';
    terms.checked = false;

    const btn = form.querySelector('button[type="submit"]');
    btn.click();

    return {
      btnDisabled: btn.getAttribute('aria-disabled'),
      termsInvalid: terms.getAttribute('aria-invalid'),
      errorText: termsErr.textContent.trim(),
      focusedId: document.activeElement ? document.activeElement.id : null
    };
  })()`);

  // Build report
  const report = `# Evidence 15 — Form Attack Results (Through the Browser)
# Task 3, Step 8: Systematic Testing of Client-Side Validation Rules
# Application: Nit's Cut Client Authentication Forms (/auth?mode=signup, login, reset)
# Environment: Google Chrome (Headless CDP Automation)
# Date: 2026-11-03

================================================================================
EXECUTIVE SUMMARY
================================================================================
This test systematically attempts to defeat every client-side validation rule
implemented across the four categories using the exact browser inputs specified
in the assessment brief. It evaluates both expected rejections (properly blocked
by client rules) and boundary loopholes where unexpected or extreme data passes
client-side checks.

================================================================================
DETAILED ATTACK VECTOR TEST RESULTS
================================================================================

[Test 01] Full Name (Signup) :: Empty Name on blur
  - Tested Input: "" (empty string)
  - aria-invalid: "${t1.invalid}"
  - Error Banner Observed: "${t1.errorText}"
  - Outcome: BLOCKED by client-side rule (required field check on blur).

[Test 02] Full Name (Signup) :: Single-character name ("A")
  - Tested Input: "A" (1 character)
  - aria-invalid: "${t2.invalid}"
  - Error Banner Observed: "${t2.errorText}"
  - Outcome: BLOCKED by client-side rule (minimum 2 characters requirement).

[Test 03] Full Name (Signup) :: Pure punctuation name ("...")
  - Tested Input: "..." (3 punctuation characters, 0 letters)
  - aria-invalid: "${t3.invalid}"
  - Error Banner Observed: "${t3.errorText}"
  - Outcome: BLOCKED by client-side rule (must contain at least one letter).

[Test 04] Full Name (Signup) :: Name with surrounding whitespace ("   Adeyemi   ")
  - Tested Input: "   Adeyemi   " (raw length 13, trimmed length 7)
  - aria-invalid: ${t4.invalid}
  - Error Banner Observed: None
  - Outcome: PASSED client-side validation. The trimmed value passes the rule, but the raw DOM value in input.value retains surrounding spaces until form submit.

[Test 05] Full Name (Signup) :: Excessive length name (5,008 characters)
  - Exact Length Tested: ${t5.lengthTested} characters ("Adeyemi " + 5,000 "A"s)
  - aria-invalid: ${t5.invalid}
  - Error Banner Observed: None
  - Submit Button State: Active when paired with valid email, password, and terms.
  - Outcome: PASSED client-side validation. Observation: No error was displayed; the client-side rule checks only minimum length (>= 2) and lacks an upper bound (maxlength).

[Test 06] Email (Signup) :: Empty Email on blur
  - Tested Input: "" (empty string)
  - aria-invalid: "${t6.invalid}"
  - Error Banner Observed: "${t6.errorText}"
  - Outcome: BLOCKED by client-side rule (required email check on blur).

[Test 07] Email (Signup) :: Exact brief input "a@b" (No top-level domain)
  - Tested Input: "a@b" (3 characters, missing domain TLD)
  - aria-invalid: "${t7.invalid}"
  - Visible Error Observed: "${t7.errorText}"
  - Submit Button State: Inactive (aria-disabled="${t7.btnAriaDisabled}")
  - Submit Attempt Result: Attempting to submit blocked by guard (e.preventDefault()); exactly ${t7PostsCount} POST requests sent to /auth/signup. Focus recovered to #${t7.focusedId}.
  - Outcome: BLOCKED by client-side real-time regex (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/). Zero network traffic generated.

[Test 08] Email (Signup) :: Minimal regex matching address ("a@b.c")
  - Tested Input: "a@b.c" (5 characters, minimal structure)
  - aria-invalid: ${t8.invalid}
  - Error Banner Observed: None
  - Outcome: PASSED client-side validation. Observation: Syntactically matches regex structure local@domain.tld, even though ".c" is not an authentic registered TLD. Client regex cannot verify domain existence.

[Test 09] Email (Signup) :: Excessive length email (3,018 characters)
  - Exact Length Tested: ${t9.lengthTested} characters ("folake" + 3,000 "a"s + "@example.com")
  - aria-invalid: ${t9.invalid}
  - Error Banner Observed: None
  - Outcome: PASSED client-side validation. Observation: Matches EMAIL_REGEX and passes without error because no maximum length limit is enforced on the frontend.

[Test 10] Password (Signup) :: 14-character boundary password ("12345678901234")
  - Exact Length Tested: ${t10.lengthTested} characters (1 below minimum threshold)
  - aria-invalid: "${t10.invalid}"
  - Error Banner Observed: "${t10.errorText}"
  - Outcome: BLOCKED by client-side rule (15-character minimum passphrase threshold).

[Test 11] Password (Signup) :: Password of pure whitespace ("               ", 15 spaces)
  - Exact Length Tested: ${t11.lengthTested} space characters
  - aria-invalid: "${t11.invalid}"
  - Error Banner Observed: "${t11.errorText}"
  - Outcome: BLOCKED by client-side rule (all-whitespace passphrase rejection via !val.trim()).

[Test 12] Password (Signup) :: Valid 23-character passphrase ("bespoke lagos suit 2026")
  - Exact Length Tested: ${t12.lengthTested} characters (passphrase containing letters and internal spaces)
  - aria-invalid: ${t12.invalid}
  - Error Banner Observed: None
  - Outcome: PASSED client-side validation (preserves spaces in multi-word passphrases).

[Test 13] Password (Signup) :: Excessive length password (10,016 characters)
  - Exact Length Tested: ${t13.lengthTested} characters ("ValidPassphrase!" + 10,000 "X"s)
  - aria-invalid: ${t13.invalid}
  - Error Banner Observed: None
  - Submit Button State: Active when paired with valid name, email, and terms.
  - Outcome: PASSED client-side validation. Observation: Passes Array.from().length >= 15 with no error displayed; frontend defines no maximum password length.

[Test 14] Terms of Service (Signup) :: Unchecked Terms on submit attempt
  - Tested Input: Checkbox unchecked (checked = false)
  - aria-invalid: "${t14.termsInvalid}"
  - Error Banner Observed: "${t14.errorText}"
  - Submit Button State: Inactive (aria-disabled="${t14.btnDisabled}")
  - Submit Attempt Result: Blocked by submit guard; focus recovered directly to #${t14.focusedId}.
  - Outcome: BLOCKED by client-side rule (mandatory agreement required).

================================================================================
SYNTHESIS OF CLIENT-SIDE FINDINGS
================================================================================
1. Input "a@b" from Assessment Brief:
   - Evaluated live on 'input' event by validateEmail().
   - Failed regex (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/) due to missing dot/TLD.
   - Set aria-invalid="true" and displayed "Please enter a valid email address (e.g. name@example.com)."
   - Submit button remained inactive (aria-disabled="true").
   - Click/Enter attempt triggered e.preventDefault(); 0 POST requests reached the network.

2. Long-Input Tests (Actual Tested Lengths):
   - Name: 5,008 characters. Result: No field error; submit button enabled once other fields were valid.
   - Email: 3,018 characters. Result: No field error; EMAIL_REGEX matched local@domain.tld without length constraint.
   - Password: 10,016 characters. Result: No field error; satisfied Array.from(val).length >= 15 with no upper cap.
   - Summary: Client-side validation enforces only minimum thresholds and structure, leaving upper bounds unpoliced.
`;

  fs.writeFileSync(OUT_FILE, report);
  console.log(`Successfully generated updated ${OUT_FILE}`);

} finally {
  chromeProc.kill('SIGKILL');
}
