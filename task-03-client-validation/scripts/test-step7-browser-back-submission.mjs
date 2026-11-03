import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9358;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-bfcache-test',
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
  const events = [];

  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      events.push(msg);
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

  // Track POST requests across entire test session
  const postRequests = [];
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.method === 'Network.requestWillBeSent') {
      const { request } = msg.params;
      if (request.method === 'POST') {
        postRequests.push({
          requestId: msg.params.requestId,
          url: request.url,
          method: request.method,
          postData: request.postData,
          timestamp: msg.params.timestamp
        });
      }
    } else if (msg.method === 'Network.responseReceived') {
      const { response, requestId } = msg.params;
      const matched = postRequests.find(r => r.requestId === requestId);
      if (matched) {
        matched.status = response.status;
        matched.statusText = response.statusText;
      }
    }
  });

  console.log('=== STEP 7 BROWSER BACK-NAVIGATION & SUBMISSION TEST ===\n');

  async function testForm(formName, endpoint, fillFn, refillFn) {
    console.log(`====================================================`);
    console.log(`TESTING FORM: ${formName.toUpperCase()} (${endpoint})`);
    console.log(`====================================================`);

    const startPostCount = postRequests.filter(r => r.url.endsWith(endpoint)).length;

    // 1. Open the form
    await send('Page.navigate', { url: `${BASE}/auth?mode=${formName}` });
    await sleep(500);

    // Set a window canary marker to test for bfcache vs fresh document
    await evaluate(`window.__bfcacheCanary = 'nitscut_' + Date.now();`);

    // 2. Fill form with valid fictional data
    console.log(`[Attempt 1] Filling form with valid fictional data...`);
    await evaluate(fillFn);
    await sleep(200);

    const btnStateBefore1 = await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      return {
        disabled: btn.getAttribute('aria-disabled'),
        text: btn.textContent.trim()
      };
    })()`);
    console.log(`[Attempt 1] Submit button state before submission:`, btnStateBefore1);

    // Submit form (Attempt 1)
    console.log(`[Attempt 1] Submitting form...`);
    await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      btn.click();
    })()`);
    await sleep(1000);

    // Check attempt 1 network and screen result
    const attempt1Posts = postRequests.filter(r => r.url.endsWith(endpoint));
    const attempt1Count = attempt1Posts.length - startPostCount;
    const latestPost1 = attempt1Posts[attempt1Posts.length - 1];

    const screen1 = await evaluate(`(() => {
      const h1 = document.querySelector('h1');
      const body = document.body.innerText;
      return {
        url: window.location.href,
        heading: h1 ? h1.textContent.trim() : null,
        hasPrototypeNotice: body.includes('Prototype submission received')
      };
    })()`);

    console.log(`[Attempt 1] Result:`);
    console.log(`  POST requests sent: ${attempt1Count} (expected: 1)`);
    console.log(`  Response status: ${latestPost1 ? latestPost1.status : 'N/A'}`);
    console.log(`  Screen heading: "${screen1.heading}"`);
    console.log(`  Screen URL: ${screen1.url}`);

    // 3. Browser Back button
    console.log(`\n[Back Navigation] Triggering browser Back button (history.back())...`);
    await evaluate(`window.history.back()`);
    await sleep(800);

    // Check back navigation and bfcache restoration
    const backInspection = await evaluate(`(() => {
      const navEntry = window.performance.getEntriesByType('navigation')[0];
      const canarySurvived = !!window.__bfcacheCanary;
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');

      // Check fields
      const inputs = Array.from(document.querySelectorAll('[data-auth-form="${formName}"] input')).map(i => ({
        id: i.id,
        type: i.type,
        value: i.type === 'checkbox' ? (i.checked ? '[checked]' : '[unchecked]') : (i.value ? (i.type === 'password' ? '***' : i.value) : '[empty]')
      }));

      return {
        url: window.location.href,
        navType: navEntry ? navEntry.type : 'unknown',
        bfcacheCanarySurvived: canarySurvived,
        btnAriaDisabled: btn ? btn.getAttribute('aria-disabled') : null,
        inputs
      };
    })()`);

    console.log(`[Back Navigation] Inspection:`);
    console.log(`  Restored URL: ${backInspection.url}`);
    console.log(`  PerformanceNavigationTiming.type: ${backInspection.navType}`);
    console.log(`  bfcache heap preserved (window marker): ${backInspection.bfcacheCanarySurvived}`);
    console.log(`  Restored inputs:`, backInspection.inputs);
    console.log(`  Button active state immediately after back: ${backInspection.btnAriaDisabled ? 'inactive (aria-disabled=' + backInspection.btnAriaDisabled + ')' : 'active'}`);

    // Refill any empty required fields (e.g. password cleared by browser)
    if (refillFn) {
      console.log(`[Attempt 2] Refilling empty required fields...`);
      await evaluate(refillFn);
      await sleep(200);
    }

    const btnStateBefore2 = await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      return {
        disabled: btn ? btn.getAttribute('aria-disabled') : null,
        text: btn ? btn.textContent.trim() : null
      };
    })()`);
    console.log(`[Attempt 2] Submit button state after refill:`, btnStateBefore2);

    // 4. Submit once more (Attempt 2)
    console.log(`[Attempt 2] Submitting form once more...`);
    await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      btn.click();
    })()`);
    await sleep(1000);

    const attempt2Posts = postRequests.filter(r => r.url.endsWith(endpoint));
    const attempt2Total = attempt2Posts.length - startPostCount;
    const latestPost2 = attempt2Posts[attempt2Posts.length - 1];

    const screen2 = await evaluate(`(() => {
      const h1 = document.querySelector('h1');
      const body = document.body.innerText;
      return {
        url: window.location.href,
        heading: h1 ? h1.textContent.trim() : null,
        hasPrototypeNotice: body.includes('Prototype submission received')
      };
    })()`);

    console.log(`[Attempt 2] Result:`);
    console.log(`  Total POST requests sent: ${attempt2Total} (expected: 2, exactly 1 new)`);
    console.log(`  Response status: ${latestPost2 ? latestPost2.status : 'N/A'}`);
    console.log(`  Screen heading: "${screen2.heading}"`);
    console.log(`  Screen URL: ${screen2.url}`);

    const passed = attempt1Count === 1 && attempt2Total === 2 && latestPost2 && latestPost2.status === 200;
    console.log(`[Verdict] ${formName.toUpperCase()}: ${passed ? 'PASSED (2 POSTs total, 0 duplicates, 0 blocks)' : 'FAILED'}\n`);

    return {
      form: formName,
      endpoint,
      attempt1Posts: attempt1Count,
      attempt1Status: latestPost1 ? latestPost1.status : 'N/A',
      attempt1Screen: screen1.heading,
      navType: backInspection.navType,
      bfcache: backInspection.bfcacheCanarySurvived,
      inputsRestored: backInspection.inputs,
      attempt2NewPosts: attempt2Total - attempt1Count,
      attempt2TotalPosts: attempt2Total,
      attempt2Status: latestPost2 ? latestPost2.status : 'N/A',
      attempt2Screen: screen2.heading,
      passed
    };
  }

  // --- SIGNUP DEFINITION ---
  const signupFill = `(() => {
    const name = document.getElementById('signup-name');
    const email = document.getElementById('signup-email');
    const pass = document.getElementById('signup-password');
    const terms = document.getElementById('signup-terms');

    name.value = 'Folake Adeyemi';
    email.value = 'folake.test@example.com';
    pass.value = 'bespoke lagos suit 2026';
    terms.checked = true;

    name.dispatchEvent(new Event('input', { bubbles: true }));
    email.dispatchEvent(new Event('input', { bubbles: true }));
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    terms.dispatchEvent(new Event('change', { bubbles: true }));
  })()`;

  const signupRefill = `(() => {
    const pass = document.getElementById('signup-password');
    if (!pass.value) {
      pass.value = 'bespoke lagos suit 2026';
      pass.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`;

  // --- LOGIN DEFINITION ---
  const loginFill = `(() => {
    const email = document.getElementById('login-email');
    const pass = document.getElementById('login-password');

    email.value = 'folake.test@example.com';
    pass.value = 'mypassword123';

    email.dispatchEvent(new Event('input', { bubbles: true }));
    pass.dispatchEvent(new Event('input', { bubbles: true }));
  })()`;

  const loginRefill = `(() => {
    const pass = document.getElementById('login-password');
    if (!pass.value) {
      pass.value = 'mypassword123';
      pass.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`;

  // --- RESET DEFINITION ---
  const resetFill = `(() => {
    const email = document.getElementById('reset-email');
    email.value = 'folake.test@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
  })()`;

  const resetRefill = `(() => {
    const email = document.getElementById('reset-email');
    if (!email.value) {
      email.value = 'folake.test@example.com';
      email.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`;

  const rSignup = await testForm('signup', '/auth/signup', signupFill, signupRefill);
  const rLogin = await testForm('login', '/auth/login', loginFill, loginRefill);
  const rReset = await testForm('reset', '/auth/reset', resetFill, resetRefill);

  console.log('====================================================');
  console.log('FINAL BROWSER BACK-NAVIGATION RESULTS TABLE');
  console.log('====================================================');
  console.table([rSignup, rLogin, rReset]);

} finally {
  chromeProc.kill('SIGKILL');
}

