import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:3000';
const CDP_PORT = 9345;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeProc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/chrome-step2-verify',
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

  const send = (method, params = {}) => new Promise(resolve => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;

  await send('Page.enable');

  // Verify Signup Form
  const signupInfo = await evaluate(`(() => {
    const section = document.querySelector('[data-auth-form="signup"]');
    const inputs = [...section.querySelectorAll('input')].map(i => ({
      name: i.name,
      type: i.type,
      id: i.id,
      checked: i.checked,
      hasLabel: !!document.querySelector('label[for="' + i.id + '"]')
    }));
    const button = section.querySelector('button');
    const termsLink = section.querySelector('a[href="/terms"]');
    return {
      hidden: section.hidden,
      inputs,
      buttonType: button ? button.type : null,
      buttonText: button ? button.textContent.trim() : null,
      termsLinkText: termsLink ? termsLink.textContent.trim() : null,
      termsLinkTarget: termsLink ? termsLink.target : null
    };
  })()`);

  console.log('--- SIGNUP FORM VERIFICATION ---');
  console.log('Visible (not hidden):', !signupInfo.hidden);
  console.log('Inputs found:', signupInfo.inputs);
  console.log('Submit button:', signupInfo.buttonText, '(type="' + signupInfo.buttonType + '")');
  console.log('Terms link text:', signupInfo.termsLinkText, '(target="' + signupInfo.termsLinkTarget + '")');

  // Verify Login Form
  const loginInfo = await evaluate(`(() => {
    const section = document.querySelector('[data-auth-form="login"]');
    const inputs = [...section.querySelectorAll('input')].map(i => ({ name: i.name, type: i.type }));
    const button = section.querySelector('button');
    return {
      inputs,
      buttonType: button ? button.type : null,
      buttonText: button ? button.textContent.trim() : null
    };
  })()`);

  console.log('\n--- LOGIN FORM VERIFICATION ---');
  console.log('Inputs found:', loginInfo.inputs);
  console.log('Submit button:', loginInfo.buttonText, '(type="' + loginInfo.buttonType + '")');

  // Verify Reset Form
  const resetInfo = await evaluate(`(() => {
    const section = document.querySelector('[data-auth-form="reset"]');
    const inputs = [...section.querySelectorAll('input')].map(i => ({ name: i.name, type: i.type }));
    const button = section.querySelector('button');
    return {
      inputs,
      buttonType: button ? button.type : null,
      buttonText: button ? button.textContent.trim() : null
    };
  })()`);

  console.log('\n--- RESET FORM VERIFICATION ---');
  console.log('Inputs found:', resetInfo.inputs);
  console.log('Submit button:', resetInfo.buttonText, '(type="' + resetInfo.buttonType + '")');

  // Verify Terms Page Loading
  await send('Page.navigate', { url: `${BASE}/terms` });
  await sleep(1000);

  const termsPageInfo = await evaluate(`(() => {
    return {
      title: document.title,
      h1: (document.querySelector('h1') || {}).textContent,
      hasDraftNote: document.body.textContent.includes('Draft')
    };
  })()`);

  console.log('\n--- TERMS PAGE VERIFICATION ---');
  console.log('Page Title:', termsPageInfo.title);
  console.log('H1:', termsPageInfo.h1);
  console.log('Draft note present:', termsPageInfo.hasDraftNote);

  ws.close();
} finally {
  chromeProc.kill();
}

