#!/usr/bin/env node
// Nit's Cut — capture the token-consuming screen after waiting for web fonts to load,
// and verify:
//   1. Actual rendered platform fonts via Chrome DevTools Protocol (CDP).
//   2. Semantic colour overrides on .date-previous, .date-updated, .amount-paid, .amount-owed
//      and their WCAG 2.1 contrast ratios against .card (--nc-color-surface-container)
//      in both Dark and Light modes.
//   3. Layout overflow/clipping at 1280x960 (desktop) and 375x812 (narrow mobile).
//
// Usage:
//   node task-01-design-system/tokens/capture-and-verify-screen.mjs [optional-single-png-filename]
//
// Output (default run):
//   task-01-design-system/evidence/10-screen-with-system.png (1280x960 Dark)
//   task-01-design-system/evidence/10c-screen-with-system-light.png (1280x960 Light)
//   task-01-design-system/evidence/10d-screen-with-system-mobile-dark.png (375x812 Dark, full-page)
//   task-01-design-system/evidence/step7-font-loading-verification.txt

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const SCREEN_URL = `file://${encodeURI(join(here, '..', 'screen', 'index.html'))}`;
const customPng = process.argv[2];
const OUT_PNG = join(here, '..', 'evidence', customPng || '10-screen-with-system.png');
const OUT_LIGHT_PNG = customPng ? null : join(here, '..', 'evidence', '10c-screen-with-system-light.png');
const OUT_MOBILE_PNG = customPng ? null : join(here, '..', 'evidence', '10d-screen-with-system-mobile-dark.png');
const OUT_LOG = customPng ? null : join(here, '..', 'evidence', 'step7-font-loading-verification.txt');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;

const proc = spawn(CHROME, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/chrome-nc-fontcheck',
  '--window-size=1280,960',
  SCREEN_URL,
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stderr = '';
proc.stderr.on('data', (d) => { stderr += d.toString(); });

try {
  let targets = null;
  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      targets = await res.json();
      if (targets.length > 0) break;
    } catch {}
    await delay(200);
  }
  if (!targets || !targets.length) {
    throw new Error('Could not connect to Chrome DevTools: ' + stderr);
  }
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    const listener = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === msgId) {
        ws.removeEventListener('message', listener);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', listener);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  const failedRequests = [];
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Network.loadingFailed') {
      failedRequests.push(data.params);
    }
  });

  await send('Runtime.enable');
  await send('Network.enable');
  await send('DOM.enable');
  await send('CSS.enable');
  await send('Page.enable');
  // Match the 1280x960 (1x) viewport of 09-screen-without-system.png and 10a-screen-with-system-before-font-fix.png
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.reload');
  await delay(2500);

  const evalResult = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      await Promise.all([
        document.fonts.load('600 32px "Cormorant Garamond"'),
        document.fonts.load('400 16px "Manrope"'),
        document.fonts.load('600 16px "Manrope"'),
      ]);
      await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      function parseRgb(str) {
        const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
      }
      function rgbToHex([r, g, b]) {
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      function relLum([r, g, b]) {
        const f = c => {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      }
      function contrast(rgbA, rgbB) {
        const l1 = relLum(rgbA);
        const l2 = relLum(rgbB);
        const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
        return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
      }

      function inspectThemeColours() {
        const card = document.querySelector('article.card');
        const cardBgRgb = parseRgb(getComputedStyle(card).backgroundColor);
        const cardBgHex = rgbToHex(cardBgRgb);

        const bodyBgRgb = parseRgb(getComputedStyle(document.body).backgroundColor);
        const bodyFgRgb = parseRgb(getComputedStyle(document.body).color);

        const items = {
          'dd.date-previous (--nc-color-on-surface-variant)': document.querySelector('dd.date-previous'),
          'dd.date-updated (--nc-color-warning)': document.querySelector('dd.date-updated'),
          'dd.amount-paid (--nc-color-success)': document.querySelector('dd.amount-paid'),
          'dd.amount-owed (--nc-color-primary)': document.querySelector('dd.amount-owed'),
        };
        const recordRowOverrides = {};
        for (const [label, el] of Object.entries(items)) {
          const fgRgb = parseRgb(getComputedStyle(el).color);
          const ratio = contrast(fgRgb, cardBgRgb);
          recordRowOverrides[label] = {
            computedColor: getComputedStyle(el).color,
            computedHex: rgbToHex(fgRgb),
            backgroundHex: cardBgHex,
            contrastRatio: ratio,
            passesWCAG_AA_4_5: ratio >= 4.5,
          };
        }
        return {
          theme: document.documentElement.getAttribute('data-theme') || 'light (default :root)',
          surfaceBackgroundHex: rgbToHex(bodyBgRgb),
          onSurfaceTextHex: rgbToHex(bodyFgRgb),
          surfaceContrastRatio: contrast(bodyFgRgb, bodyBgRgb),
          cardSurfaceContainerHex: cardBgHex,
          recordRowOverrides,
        };
      }

      function checkViewportOverflow() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docScrollWidth = document.documentElement.scrollWidth;
        const docScrollHeight = document.documentElement.scrollHeight;
        const overflowingSelectors = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.left < -0.5 || r.right > vw + 0.5)) {
            overflowingSelectors.push({
              tag: el.tagName.toLowerCase(),
              className: el.className,
              left: Math.round(r.left * 10) / 10,
              right: Math.round(r.right * 10) / 10,
            });
          }
        }
        return {
          viewportWidth: vw,
          viewportHeight: vh,
          documentScrollWidth: docScrollWidth,
          documentScrollHeight: docScrollHeight,
          hasHorizontalOverflow: docScrollWidth > vw,
          overflowingElementsCount: overflowingSelectors.length,
          overflowingElements: overflowingSelectors.slice(0, 10),
        };
      }

      const h1 = document.querySelector('h1.hero-title');
      const h1Style = getComputedStyle(h1);
      const h1Range = document.createRange();
      h1Range.selectNodeContents(h1);
      const h1TextRect = h1Range.getBoundingClientRect();

      const owed = document.querySelector('dd.amount-owed');
      const owedStyle = getComputedStyle(owed);

      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize,
        decodedBodySize: r.decodedBodySize,
        duration: Math.round(r.duration)
      }));
      const loadedFontFaces = Array.from(document.fonts)
        .filter(f => f.status === 'loaded')
        .map(f => ({
          family: f.family,
          weight: f.weight,
          style: f.style,
          status: f.status,
          unicodeRange: f.unicodeRange
        }));

      const c = document.createElement('canvas').getContext('2d');
      const sample = 'Two-Piece Senator Native Wear & Fitted Trousers';
      c.font = '600 32px "Cormorant Garamond", Georgia, serif';
      const widthDeclared = c.measureText(sample).width;
      c.font = '600 32px Georgia, serif';
      const widthGeorgia = c.measureText(sample).width;

      const darkColourVerification = inspectThemeColours();
      const desktopLayoutCheck = checkViewportOverflow();

      return {
        fontsStatus: document.fonts.status,
        checkCormorant600: document.fonts.check('600 32px "Cormorant Garamond"'),
        checkManrope400: document.fonts.check('400 16px "Manrope"'),
        checkManrope600: document.fonts.check('600 16px "Manrope"'),
        h1ComputedTypography: {
          className: h1.className,
          fontFamily: h1Style.fontFamily,
          fontWeight: h1Style.fontWeight,
          fontSize: h1Style.fontSize,
          lineHeight: h1Style.lineHeight,
          letterSpacing: h1Style.letterSpacing,
        },
        amountOwedComputedTypography: {
          className: owed.className,
          fontFamily: owedStyle.fontFamily,
          fontWeight: owedStyle.fontWeight,
          fontSize: owedStyle.fontSize,
          lineHeight: owedStyle.lineHeight,
          letterSpacing: owedStyle.letterSpacing,
        },
        h1InlineTextWidthPx: h1TextRect.width,
        canvasWidthComparisonPx: {
          cormorantGaramond600At32px: widthDeclared,
          georgia600At32px: widthGeorgia
        },
        darkColourVerification,
        desktopLayoutCheck,
        loadedFontFaces,
        resources
      };
    })()`,
  });

  const doc = await send('DOM.getDocument', { depth: -1 });
  const selectors = {
    'h1.hero-title (.nc-type-headline-large)': 'h1.hero-title',
    'h2.card-title (.nc-type-title-large)': 'h2.card-title',
    'p.hero-copy (.nc-type-body-large)': 'p.hero-copy',
    'p.delay-text (.nc-type-body-medium)': 'p.delay-text',
    'p.footnote (.nc-type-body-small)': 'p.footnote',
    'button.btn-primary (.nc-type-label-large)': 'button.btn-primary',
    'span.order-ref (.nc-type-label-medium)': 'span.order-ref',
    'span.stage-badge (.nc-type-label-small)': 'span.stage-badge',
    'dd.amount-owed (.nc-type-title-large)': 'dd.amount-owed',
  };

  const platformFonts = {};
  for (const [label, sel] of Object.entries(selectors)) {
    const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    const pf = await send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
    platformFonts[label] = pf.fonts;
  }

  // 1. Capture Dark-mode 1280x960 screenshot (10-screen-with-system.png or customPng)
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT_PNG, Buffer.from(shot.data, 'base64'));

  let lightVerification = null;
  let mobileLayoutVerification = null;

  if (!customPng) {
    // 2. Switch to Light mode at 1280x960, verify Light-mode colours & contrast, and capture 10c-screen-with-system-light.png
    const lightEval = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        document.documentElement.setAttribute('data-theme', 'light');
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        function parseRgb(str) {
          const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
        }
        function rgbToHex([r, g, b]) {
          return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        }
        function relLum([r, g, b]) {
          const f = c => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        }
        function contrast(rgbA, rgbB) {
          const l1 = relLum(rgbA);
          const l2 = relLum(rgbB);
          const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
          return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
        }

        const card = document.querySelector('article.card');
        const cardBgRgb = parseRgb(getComputedStyle(card).backgroundColor);
        const cardBgHex = rgbToHex(cardBgRgb);
        const bodyBgRgb = parseRgb(getComputedStyle(document.body).backgroundColor);
        const bodyFgRgb = parseRgb(getComputedStyle(document.body).color);

        const items = {
          'dd.date-previous (--nc-color-on-surface-variant)': document.querySelector('dd.date-previous'),
          'dd.date-updated (--nc-color-warning)': document.querySelector('dd.date-updated'),
          'dd.amount-paid (--nc-color-success)': document.querySelector('dd.amount-paid'),
          'dd.amount-owed (--nc-color-primary)': document.querySelector('dd.amount-owed'),
        };
        const recordRowOverrides = {};
        for (const [label, el] of Object.entries(items)) {
          const fgRgb = parseRgb(getComputedStyle(el).color);
          const ratio = contrast(fgRgb, cardBgRgb);
          recordRowOverrides[label] = {
            computedColor: getComputedStyle(el).color,
            computedHex: rgbToHex(fgRgb),
            backgroundHex: cardBgHex,
            contrastRatio: ratio,
            passesWCAG_AA_4_5: ratio >= 4.5,
          };
        }
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          surfaceBackgroundHex: rgbToHex(bodyBgRgb),
          onSurfaceTextHex: rgbToHex(bodyFgRgb),
          surfaceContrastRatio: contrast(bodyFgRgb, bodyBgRgb),
          cardSurfaceContainerHex: cardBgHex,
          recordRowOverrides,
        };
      })()`,
    });
    lightVerification = lightEval.result.value;

    const lightShot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(OUT_LIGHT_PNG, Buffer.from(lightShot.data, 'base64'));

    // 3. Switch back to Dark mode and test narrow mobile viewport (375x812) for clipping/overflow
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const mobileEval = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docScrollWidth = document.documentElement.scrollWidth;
        const docScrollHeight = document.documentElement.scrollHeight;
        const overflowingSelectors = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.left < -0.5 || r.right > vw + 0.5)) {
            overflowingSelectors.push({
              tag: el.tagName.toLowerCase(),
              className: el.className,
              left: Math.round(r.left * 10) / 10,
              right: Math.round(r.right * 10) / 10,
            });
          }
        }
        return {
          viewportWidth: vw,
          viewportHeight: vh,
          documentScrollWidth: docScrollWidth,
          documentScrollHeight: docScrollHeight,
          hasHorizontalOverflow: docScrollWidth > vw,
          overflowingElementsCount: overflowingSelectors.length,
          overflowingElements: overflowingSelectors.slice(0, 10),
        };
      })()`,
    });
    mobileLayoutVerification = mobileEval.result.value;

    const mobileShot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    writeFileSync(OUT_MOBILE_PNG, Buffer.from(mobileShot.data, 'base64'));
  }

  const output = {
    timestamp: new Date().toISOString(),
    viewport: '1280x960 (deviceScaleFactor: 1)',
    failedNetworkRequests: failedRequests,
    fontLoadingVerification: evalResult.result.value,
    lightModeColourVerification: lightVerification,
    mobileViewportLayoutCheck: mobileLayoutVerification,
    renderedPlatformFontsByElement: platformFonts,
  };
  if (OUT_LOG) {
    writeFileSync(OUT_LOG, JSON.stringify(output, null, 2) + '\n');
  }
  console.log(JSON.stringify(output, null, 2));

  ws.close();
} finally {
  proc.kill();
}
