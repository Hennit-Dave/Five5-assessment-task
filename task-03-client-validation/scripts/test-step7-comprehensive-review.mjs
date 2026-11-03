import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const APP_PORT = 3000;
const PROXY_PORT = 3099;
const CDP_PORT = 9370;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------------------------------------------------------------------------
// TEST-ONLY LOCAL PROXY TO SIMULATE SLOW RESPONSE WITHOUT MODIFYING APP SERVER
// ---------------------------------------------------------------------------
let simulateSlowResponse = false;
const slowDelayMs = 1500;
const serverPostLog = [];

const proxyServer = http.createServer((req, res) => {
  const isPost = req.method === 'POST';
  if (isPost) {
    serverPostLog.push({ url: req.url, timestamp: Date.now() });
  }

  // Forward request to local app server
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: APP_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    const handleResponse = () => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    };

    if (isPost && simulateSlowResponse) {
      setTimeout(handleResponse, slowDelayMs);
    } else {
      handleResponse();
    }
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end('Proxy Error: ' + err.message);
  });

  req.pipe(proxyReq);
});

await new Promise((resolve) => proxyServer.listen(PROXY_PORT, '127.0.0.1', resolve));

// Launch Chrome pointing at Proxy
const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-step7-final-review',
  `http://127.0.0.1:${PROXY_PORT}/auth?mode=signup`
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

  const evaluate = async (expression, awaitPromise = false) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })).result.value;

  await send('Page.enable');
  await send('Network.enable');

  console.log('================================================================');
  console.log('STEP 7 RIGOROUS VERIFICATION SUITE');
  console.log('1. Rapid double-click test across Signup, Login, and Reset');
  console.log('2. Slow-response in-flight field editing test');
  console.log('3. Back-navigation & deliberate resubmission test with assertions');
  console.log('================================================================\n');

  const forms = {
    signup: {
      endpoint: '/auth/signup',
      fill: `(() => {
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
      })()`,
      editField: `(() => {
        const name = document.getElementById('signup-name');
        name.value = 'Folake O. Adeyemi';
        name.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
      refillAfterBack: `(() => {
        const pass = document.getElementById('signup-password');
        if (!pass.value) {
          pass.value = 'bespoke lagos suit 2026';
          pass.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    },
    login: {
      endpoint: '/auth/login',
      fill: `(() => {
        const email = document.getElementById('login-email');
        const pass = document.getElementById('login-password');
        email.value = 'folake.test@example.com';
        pass.value = 'mypassword123';
        email.dispatchEvent(new Event('input', { bubbles: true }));
        pass.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
      editField: `(() => {
        const email = document.getElementById('login-email');
        email.value = 'folake.edited@example.com';
        email.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
      refillAfterBack: `(() => {
        const pass = document.getElementById('login-password');
        if (!pass.value) {
          pass.value = 'mypassword123';
          pass.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    },
    reset: {
      endpoint: '/auth/reset',
      fill: `(() => {
        const email = document.getElementById('reset-email');
        email.value = 'folake.test@example.com';
        email.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
      editField: `(() => {
        const email = document.getElementById('reset-email');
        email.value = 'folake.edited@example.com';
        email.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
      refillAfterBack: `(() => {
        const email = document.getElementById('reset-email');
        if (!email.value) {
          email.value = 'folake.test@example.com';
          email.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    }
  };

  // ---------------------------------------------------------------------------
  // PART 1: RAPID DOUBLE-CLICK TEST (Signup, Login, Reset)
  // Fail unless exactly 1 POST is sent.
  // ---------------------------------------------------------------------------
  console.log('--- PART 1: RAPID DOUBLE-CLICK SUBMISSION TEST ---');
  simulateSlowResponse = false;

  for (const [formName, config] of Object.entries(forms)) {
    console.log(`\nTesting rapid double-click on: ${formName.toUpperCase()} (${config.endpoint})`);
    
    const initialLogLength = serverPostLog.filter(p => p.url.startsWith(config.endpoint)).length;

    await send('Page.navigate', { url: `http://127.0.0.1:${PROXY_PORT}/auth?mode=${formName}` });
    await sleep(400);

    await evaluate(config.fill);
    await sleep(150);

    // Double-click submit button rapidly in same turn
    await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      btn.click();
      btn.click();
    })()`);
    await sleep(800);

    const afterLogLength = serverPostLog.filter(p => p.url.startsWith(config.endpoint)).length;
    const postCount = afterLogLength - initialLogLength;

    console.log(`  POST requests received at server: ${postCount}`);
    if (postCount !== 1) {
      console.error(`FAILED: Expected exactly 1 POST for double-click on ${formName}, got ${postCount}`);
      process.exit(1);
    }
    console.log(`  Assertion PASSED: Exactly 1 POST received.`);
  }

  // ---------------------------------------------------------------------------
  // PART 2: SLOW-RESPONSE IN-FLIGHT FIELD EDITING TEST
  // Verify edit and second click occur while first request is pending,
  // and confirm only 1 POST was sent.
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 2: SLOW-RESPONSE IN-FLIGHT FIELD EDITING TEST ---');
  simulateSlowResponse = true;

  for (const [formName, config] of Object.entries(forms)) {
    console.log(`\nTesting slow-response in-flight edit on: ${formName.toUpperCase()} (${config.endpoint})`);

    const initialLogLength = serverPostLog.filter(p => p.url.startsWith(config.endpoint)).length;

    await send('Page.navigate', { url: `http://127.0.0.1:${PROXY_PORT}/auth?mode=${formName}` });
    await sleep(400);

    await evaluate(config.fill);
    await sleep(150);

    // In page: submit once, then 200ms later (while proxy holds response for 1500ms) edit field and submit again!
    console.log(`  [In-flight] Submitting request with 1500ms proxy delay; editing field and resubmitting at 200ms...`);
    const inFlightResult = await evaluate(`(() => {
      const form = document.querySelector('[data-auth-form="${formName}"] form');
      const btn = form.querySelector('button[type="submit"]');
      
      const t0 = Date.now();
      btn.click(); // First click -> sends POST

      let secondClickExecuted = false;
      let secondClickTime = 0;
      let editExecuted = false;

      // At 200ms (request is in flight)
      setTimeout(() => {
        ${config.editField};
        editExecuted = true;
        btn.click(); // Second click while in flight!
        secondClickExecuted = true;
        secondClickTime = Date.now() - t0;
      }, 200);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ editExecuted, secondClickExecuted, secondClickTime });
        }, 500);
      });
    })()`, true);

    console.log(`  [In-flight] Edit executed at in-flight: ${inFlightResult.editExecuted}, Second click executed: ${inFlightResult.secondClickExecuted} at ${inFlightResult.secondClickTime}ms`);

    // Verify the edit and second click actually occurred while pending
    if (!inFlightResult.secondClickExecuted || inFlightResult.secondClickTime >= slowDelayMs) {
      console.error(`FAILED: Second click was not executed while request was pending!`);
      process.exit(1);
    }

    // Wait for the slow response to complete
    await sleep(1200);

    const afterLogLength = serverPostLog.filter(p => p.url.startsWith(config.endpoint)).length;
    const postCount = afterLogLength - initialLogLength;

    console.log(`  Total POST requests received for slow attempt: ${postCount}`);
    if (postCount !== 1) {
      console.error(`FAILED: Expected exactly 1 POST during slow response with in-flight edit on ${formName}, got ${postCount}`);
      process.exit(1);
    }
    console.log(`  Assertion PASSED: Exactly 1 POST received; second submit cleanly blocked during in-flight edit.`);
  }

  simulateSlowResponse = false;

  // ---------------------------------------------------------------------------
  // PART 3: BACK-NAVIGATION & DELIBERATE RESUBMISSION TEST
  // Assert 1 HTTP 200 before Back, verify cached page restored,
  // assert 1 new HTTP 200 after resubmission.
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 3: BACK-NAVIGATION & DELIBERATE RESUBMISSION TEST ---');
  const summaryResults = [];

  for (const [formName, config] of Object.entries(forms)) {
    console.log(`\nTesting Back-navigation on: ${formName.toUpperCase()} (${config.endpoint})`);

    const trackedPosts = [];
    const onTrack = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.method === 'Network.requestWillBeSent' && msg.params.request.method === 'POST') {
        if (msg.params.request.url.includes(config.endpoint)) {
          trackedPosts.push({
            requestId: msg.params.requestId,
            url: msg.params.request.url,
            status: null
          });
        }
      } else if (msg.method === 'Network.responseReceived') {
        const matched = trackedPosts.find(p => p.requestId === msg.params.requestId);
        if (matched) matched.status = msg.params.response.status;
      }
    };
    ws.addEventListener('message', onTrack);

    // 1. Open form
    await send('Page.navigate', { url: `http://127.0.0.1:${PROXY_PORT}/auth?mode=${formName}` });
    await sleep(400);

    // Set canary marker to verify cached page restoration
    await evaluate(`window.__bfcacheCanary = 'canary_' + Date.now();`);

    // 2. Fill form with valid fictional data
    await evaluate(config.fill);
    await sleep(150);

    // Submit Attempt 1
    console.log(`  [Attempt 1] Submitting form...`);
    await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      btn.click();
    })()`);
    await sleep(800);

    // Assert: Exactly 1 POST received with HTTP 200
    if (trackedPosts.length !== 1) {
      console.error(`FAILED: Expected exactly 1 POST for Attempt 1 on ${formName}, got ${trackedPosts.length}`);
      process.exit(1);
    }
    const post1 = trackedPosts[0];
    if (!post1 || post1.status !== 200) {
      console.error(`FAILED: Expected HTTP 200 for Attempt 1 on ${formName}, got ${post1 ? post1.status : 'N/A'}`);
      process.exit(1);
    }
    console.log(`  Assertion PASSED: Attempt 1 sent 1 POST with HTTP 200.`);

    // 3. Browser Back
    console.log(`  [Back] Navigating back via window.history.back()...`);
    await evaluate(`window.history.back()`);
    await sleep(600);

    // Assert: Browser restored the cached page
    const backState = await evaluate(`(() => {
      return {
        url: window.location.href,
        canarySurvived: !!window.__bfcacheCanary,
        btnDisabled: document.querySelector('[data-auth-form="${formName}"] button[type="submit"]').getAttribute('aria-disabled')
      };
    })()`);

    console.log(`  [Back] Restored URL: ${backState.url}, Cached page restored (canary): ${backState.canarySurvived}`);
    if (!backState.canarySurvived) {
      console.error(`FAILED: Cached page was not restored on ${formName}!`);
      process.exit(1);
    }
    console.log(`  Assertion PASSED: Cached page confirmed restored.`);

    // Refill any field if needed
    if (config.refillAfterBack) {
      await evaluate(config.refillAfterBack);
      await sleep(150);
    }

    const btnBefore2 = await evaluate(`document.querySelector('[data-auth-form="${formName}"] button[type="submit"]').getAttribute('aria-disabled')`);
    console.log(`  [Attempt 2] Button active state before resubmission: ${btnBefore2 ? 'inactive' : 'active'}`);

    // 4. Submit Attempt 2
    console.log(`  [Attempt 2] Submitting form deliberately once more...`);
    await evaluate(`(() => {
      const btn = document.querySelector('[data-auth-form="${formName}"] button[type="submit"]');
      btn.click();
    })()`);
    await sleep(800);

    // Assert: Exactly 2 POSTs total (1 new POST) with HTTP 200
    if (trackedPosts.length !== 2) {
      console.error(`FAILED: Expected 2 POSTs total (1 new POST) for Attempt 2 on ${formName}, got ${trackedPosts.length}`);
      process.exit(1);
    }
    const post2 = trackedPosts[1];
    if (!post2 || post2.status !== 200) {
      console.error(`FAILED: Expected HTTP 200 for Attempt 2 on ${formName}, got ${post2 ? post2.status : 'N/A'}`);
      process.exit(1);
    }
    console.log(`  Assertion PASSED: Attempt 2 sent exactly 1 new POST with HTTP 200 (Total: 2).`);

    ws.removeEventListener('message', onTrack);

    summaryResults.push({
      form: formName,
      endpoint: config.endpoint,
      attempt1Posts: 1,
      attempt1Status: post1.status,
      cachedPageRestored: backState.canarySurvived,
      attempt2NewPosts: 1,
      totalPosts: trackedPosts.length,
      attempt2Status: post2.status,
      passed: true
    });
  }

  console.log('\n================================================================');
  console.log('FINAL STEP 7 RIGOROUS SUMMARY TABLE');
  console.log('================================================================');
  console.table(summaryResults);
  console.log('\nALL STEP 7 ASSERTIONS PASSED WITH ZERO FAILURES.\n');

} finally {
  chromeProc.kill('SIGKILL');
  proxyServer.close();
}
