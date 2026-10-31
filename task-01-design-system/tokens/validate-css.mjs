#!/usr/bin/env node
// Validates the generated CSS and both Light and Dark theme mappings against docs/colour-roles.md.
// Usage: node task-01-design-system/tokens/validate-css.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'generated', 'nc-tokens.css'), 'utf8');
const report = JSON.parse(readFileSync(join(here, 'generated', 'build-report.json'), 'utf8'));
const doc = readFileSync(join(here, '..', 'docs', 'colour-roles.md'), 'utf8');

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

// 1. Every var() used is defined.
const defined = new Set([...css.matchAll(/(--nc-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const used = [...css.matchAll(/var\((--nc-[a-z0-9-]+)\)/g)].map((m) => m[1]);
const undefinedRefs = [...new Set(used.filter((u) => !defined.has(u)))];
check(undefinedRefs.length === 0, `all var() references resolve (${used.length} uses, undefined: ${JSON.stringify(undefinedRefs)})`);

// 2. Raw hex only appears on primitive (--nc-ref-*) lines.
const hexLines = css.split('\n').filter((l) => /#[0-9a-f]{3,8}\b/i.test(l) && !l.trim().startsWith('/*') && !l.trim().startsWith('*'));
const badHex = hexLines.filter((l) => !/^\s*--nc-ref-/.test(l));
check(badHex.length === 0, `raw hex confined to --nc-ref-* primitives (${hexLines.length} hex lines, ${badHex.length} elsewhere)`);

// 3. Roles reference primitives, never hex (57 Light + 57 Dark = 114 declarations).
const roleLines = css.split('\n').filter((l) => /^\s*--nc-color-/.test(l));
check(roleLines.length === 114 && roleLines.every((l) => /var\(--nc-ref-/.test(l)),
  `all ${roleLines.length} role declarations (57 Light + 57 Dark) alias a primitive`);

// 4. Classes do not use primitives.
const classBlocks = css.split('/* Typography classes')[1] ?? '';
check(!/--nc-ref-/.test(classBlocks), 'typography classes do not reference primitives');

// 5. Coverage.
const c = report.counts;
check(c.primitives === 192 && c.lightRoles === 57 && c.darkRoles === 57 && c.typography === 15 && c.shadows === 3,
  `coverage ${JSON.stringify(c)} (expected 192 primitives, 57 light, 57 dark, 15 typography, 3 shadows)`);
// Strip comments first: the header comment intentionally names the excluded collections.
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
check(!/dark-panel|nc · primitives|nc · colour roles/.test(cssNoComments), 'draft collections absent from output (comments ignored)');

// 6. Verify both Light and Dark role aliases match docs/colour-roles.md 57/57.
const rows = [...doc.matchAll(/^\| ([a-z-]+) \| ([a-z-]+\/\d+) \| #[0-9A-F]{6} \| ([a-z-]+\/\d+) \| #[0-9A-F]{6} \|$/gm)];
let lightMatch = 0, darkMatch = 0;
for (const [, role, l, d] of rows) {
  const lightExported = report.rolesLight?.[role]?.split(' ')[0].replace('.', '/');
  const darkExported = report.rolesDark?.[role]?.split(' ')[0].replace('.', '/');
  if (lightExported === l) lightMatch++;
  if (darkExported === d) darkMatch++;
}
console.log(`INFO  role aliases vs docs: Light ${lightMatch}/${rows.length}, Dark ${darkMatch}/${rows.length}`);
check(lightMatch === rows.length && rows.length === 57, `Light-mode role aliases match documented Light mapping (${lightMatch}/57)`);
check(darkMatch === rows.length && rows.length === 57, `Dark-mode role aliases match documented Dark mapping (${darkMatch}/57)`);

// 7. Representative values.
check(/--nc-type-display-large-family: "Cormorant Garamond"/.test(css) && /--nc-type-display-large-size: 3.5625rem/.test(css)
  && /--nc-type-display-large-line-height: 4.9875rem/.test(css) && /--nc-type-display-large-tracking: -0.5px/.test(css),
  'Display Large = Cormorant Garamond 600, 57px (3.5625rem) / 79.8px (4.9875rem), -0.5px');
check(/--nc-type-body-large-family: "Manrope"/.test(css) && /--nc-type-body-large-weight: 400/.test(css), 'Body Large = Manrope 400');
check(/--nc-shadow-soft: 0px 2px 8px 0px color-mix\(in srgb, var\(--nc-ref-primary-40\) 10%/.test(css), 'Soft shadow 0/2/8/0 at 10% primary/40');
check(/--nc-shadow-medium: 0px 6px 18px 0px color-mix\(in srgb, var\(--nc-ref-primary-40\) 16%/.test(css), 'Medium shadow 0/6/18/0 at 16% primary/40');
check(/--nc-shadow-hard: 0px 4px 2px 0px color-mix\(in srgb, var\(--nc-ref-primary-40\) 24%/.test(css), 'Hard shadow 0/4/2/0 at 24% primary/40');
check(/--nc-ref-primary-40: #334DAF;/.test(css), 'primary/40 primitive = #334DAF');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
