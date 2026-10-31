#!/usr/bin/env node
// Nit's Cut — convert the Figma Design Tokens export into CSS custom properties.
//
// Usage (from the repository root):
//   node task-01-design-system/tokens/build-css.mjs
//
// Inputs (read-only evidence):
//   - task-01-design-system/evidence/06-tokens-complete.json (primitives, Dark roles, typography, shadows)
//   - task-01-design-system/evidence/06b-tokens-colour-roles-modes-from-figma-state.json (explicit Light modeId 19:1 & Dark modeId 19:2 role aliases from work/figma-m3-state.json)
// Outputs (generated):
//   - task-01-design-system/tokens/generated/nc-tokens.css
//   - task-01-design-system/tokens/generated/build-report.json
//
// Rules:
// - Only the current M3 collections are used: "nc · m3 primitives" and "nc · m3 colour roles".
//   The earlier draft collections ("nc · primitives", "nc · colour roles") are excluded.
// - Primitives become --nc-ref-* variables. They exist only so roles can point at them.
// - Roles become --nc-color-* variables that reference primitives with var(), never raw hex.
// - Interface code must use --nc-color-* roles, --nc-type-* and --nc-shadow-* only.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, '..', 'evidence', '06-tokens-complete.json');
const MODES_SOURCE = join(here, '..', 'evidence', '06b-tokens-colour-roles-modes-from-figma-state.json');
const OUT_DIR = join(here, 'generated');
const OUT_CSS = join(OUT_DIR, 'nc-tokens.css');
const OUT_REPORT = join(OUT_DIR, 'build-report.json');

const PRIMITIVES = 'nc · m3 primitives';
const ROLES = 'nc · m3 colour roles';
const EXCLUDED = ['nc · primitives', 'nc · colour roles'];

const errors = [];
const warnings = [];
const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'));
const modesData = JSON.parse(readFileSync(MODES_SOURCE, 'utf8'));

const kebab = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isColour = (v) => typeof v === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
const normaliseHex = (v) => (v.length === 9 && v.toLowerCase().endsWith('ff') ? v.slice(0, 7) : v).toUpperCase();

// ---- 1. Primitives -------------------------------------------------------------------
const prim = tokens[PRIMITIVES];
if (!prim) errors.push(`Missing collection "${PRIMITIVES}"`);
const primVars = new Map(); // "primary.40" -> { name, value }
for (const [family, tones] of Object.entries(prim ?? {})) {
  for (const [tone, tok] of Object.entries(tones)) {
    const path = `${family}.${tone}`;
    if (tok?.type !== 'color' || !isColour(tok.value)) {
      errors.push(`Invalid primitive ${path}: ${JSON.stringify(tok?.value)}`);
      continue;
    }
    primVars.set(path, { name: `--nc-ref-${kebab(family)}-${kebab(tone)}`, value: normaliseHex(tok.value) });
  }
}

// ---- 2. Roles (Light and Dark modes must resolve to an M3 primitive) ------------------
function resolveRoleMap(roleMap, modeLabel) {
  const list = [];
  if (!roleMap) {
    errors.push(`Missing ${modeLabel} role collection`);
    return list;
  }
  for (const [role, tok] of Object.entries(roleMap)) {
    const m = typeof tok?.value === 'string' && tok.value.match(/^\{(.+)\}$/);
    if (!m) {
      errors.push(`[${modeLabel}] Role ${role} is not an alias (raw value ${JSON.stringify(tok?.value)})`);
      continue;
    }
    const ref = m[1];
    const prefix = `${PRIMITIVES}.`;
    if (!ref.startsWith(prefix)) {
      errors.push(`[${modeLabel}] Role ${role} references outside "${PRIMITIVES}": {${ref}}`);
      continue;
    }
    const target = primVars.get(ref.slice(prefix.length));
    if (!target) {
      errors.push(`[${modeLabel}] Role ${role} has unresolved reference {${ref}}`);
      continue;
    }
    list.push({ role, name: `--nc-color-${kebab(role)}`, ref: ref.slice(prefix.length), target });
  }
  return list;
}

const exportRoles = resolveRoleMap(tokens[ROLES], '06-export');
const lightRoleVars = resolveRoleMap(modesData[ROLES]?.light, 'light');
const darkRoleVars = resolveRoleMap(modesData[ROLES]?.dark, 'dark');

// Verify 06-tokens-complete.json's single-mode export matches the Dark mode in 06b
for (const r of exportRoles) {
  const darkMatch = darkRoleVars.find((d) => d.role === r.role);
  if (!darkMatch || darkMatch.ref !== r.ref) {
    errors.push(`Role ${r.role} in 06-tokens-complete.json (${r.ref}) does not match Dark mode in 06b (${darkMatch?.ref})`);
  }
}

// ---- 3. Typography (custom-fontStyle tokens under "font") -----------------------------
const typeVars = [];
for (const [roleName, sizes] of Object.entries(tokens.font?.nc ?? {})) {
  for (const [size, tok] of Object.entries(sizes)) {
    const v = tok?.value;
    const id = `${kebab(roleName)}-${kebab(size)}`;
    const need = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing'];
    const missing = need.filter((k) => v?.[k] === undefined || v?.[k] === null);
    if (missing.length) {
      errors.push(`Typography ${id} missing ${missing.join(', ')}`);
      continue;
    }
    const fallback = v.fontFamily === 'Cormorant Garamond' ? 'Georgia, serif' : 'system-ui, sans-serif';
    typeVars.push({
      id,
      family: `"${v.fontFamily}", ${fallback}`,
      weight: v.fontWeight,
      size: `${+(v.fontSize / 16).toFixed(4)}rem`,
      lineHeight: `${+(v.lineHeight / 16).toFixed(4)}rem`,
      tracking: `${v.letterSpacing}px`,
      raw: v,
    });
  }
}
if (typeVars.length !== 15) errors.push(`Expected 15 typography styles, found ${typeVars.length}`);

// ---- 4. Shadows (custom-shadow tokens under "effect") ---------------------------------
const shadowVars = [];
const brand = primVars.get('primary.40');
for (const [name, tok] of Object.entries(tokens.effect?.nc?.shadow ?? {})) {
  const v = tok?.value;
  if (!v || !isColour(v.color)) {
    errors.push(`Shadow ${name} invalid: ${JSON.stringify(v)}`);
    continue;
  }
  const rgb = v.color.slice(0, 7).toUpperCase();
  const alpha = v.color.length === 9 ? parseInt(v.color.slice(7, 9), 16) / 255 : 1;
  const pct = Math.round(alpha * 100);
  if (!brand || rgb !== brand.value) {
    warnings.push(`Shadow ${name} colour ${rgb} does not match primary/40`);
  }
  // Express the shadow colour through the brand primitive instead of repeating the hex.
  const colour = brand && rgb === brand.value
    ? `color-mix(in srgb, var(${brand.name}) ${pct}%, transparent)`
    : v.color;
  shadowVars.push({
    name,
    css: `${v.offsetX}px ${v.offsetY}px ${v.radius}px ${v.spread}px ${colour}`,
    raw: { ...v, opacityPercent: pct },
  });
}
if (shadowVars.length !== 3) errors.push(`Expected 3 shadows, found ${shadowVars.length}`);

// ---- 5. Emit CSS ---------------------------------------------------------------------
const L = [];
L.push('/* GENERATED FILE — do not edit by hand.');
L.push(' * Sources:');
L.push(' *   - task-01-design-system/evidence/06-tokens-complete.json');
L.push(' *   - task-01-design-system/evidence/06b-tokens-colour-roles-modes-from-figma-state.json');
L.push(' * Regenerate: node task-01-design-system/tokens/build-css.mjs');
L.push(` * Excluded draft collections: ${EXCLUDED.join(', ')}`);
L.push(' *');
L.push(' * Interface code: use --nc-color-*, --nc-type-*, --nc-shadow-* only.');
L.push(' * --nc-ref-* primitives exist so roles can reference them; do not use them in components.');
L.push(' */');
L.push('');
L.push('/* Primitives (internal) */');
L.push(':root {');
for (const p of primVars.values()) L.push(`  ${p.name}: ${p.value};`);
L.push('}');
L.push('');
L.push('/* Colour roles — LIGHT mode (default :root and explicit [data-theme="light"], Figma modeId 19:1) */');
L.push(':root, [data-theme="light"] {');
L.push('  color-scheme: light;');
for (const r of lightRoleVars) L.push(`  ${r.name}: var(${r.target.name});`);
L.push('}');
L.push('');
L.push('/* Colour roles — DARK mode (explicit [data-theme="dark"], Figma modeId 19:2) */');
L.push('[data-theme="dark"] {');
L.push('  color-scheme: dark;');
for (const r of darkRoleVars) L.push(`  ${r.name}: var(${r.target.name});`);
L.push('}');
L.push('');
L.push('/* Typography and shadows (theme-independent) */');
L.push(':root {');
for (const t of typeVars) {
  L.push(`  --nc-type-${t.id}-family: ${t.family};`);
  L.push(`  --nc-type-${t.id}-weight: ${t.weight};`);
  L.push(`  --nc-type-${t.id}-size: ${t.size};`);
  L.push(`  --nc-type-${t.id}-line-height: ${t.lineHeight};`);
  L.push(`  --nc-type-${t.id}-tracking: ${t.tracking};`);
}
for (const s of shadowVars) L.push(`  --nc-shadow-${kebab(s.name)}: ${s.css};`);
L.push('}');
L.push('');
L.push('/* Typography classes — reference tokens only, no colour */');
for (const t of typeVars) {
  L.push(`.nc-type-${t.id} {`);
  L.push(`  font-family: var(--nc-type-${t.id}-family);`);
  L.push(`  font-weight: var(--nc-type-${t.id}-weight);`);
  L.push(`  font-size: var(--nc-type-${t.id}-size);`);
  L.push(`  line-height: var(--nc-type-${t.id}-line-height);`);
  L.push(`  letter-spacing: var(--nc-type-${t.id}-tracking);`);
  L.push('}');
}

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  sources: [
    'task-01-design-system/evidence/06-tokens-complete.json',
    'task-01-design-system/evidence/06b-tokens-colour-roles-modes-from-figma-state.json',
  ],
  usedCollections: [PRIMITIVES, ROLES, 'font', 'effect'],
  excludedCollections: EXCLUDED.filter((c) => c in tokens),
  modeMetadataIn06Export: false,
  roleThemeIn06Export: 'dark',
  lightModeRolesPresent: lightRoleVars.length === 57,
  darkModeRolesPresent: darkRoleVars.length === 57,
  counts: {
    primitives: primVars.size,
    rolesPerMode: darkRoleVars.length,
    lightRoles: lightRoleVars.length,
    darkRoles: darkRoleVars.length,
    typography: typeVars.length,
    shadows: shadowVars.length,
  },
  rolesLight: Object.fromEntries(lightRoleVars.map((r) => [r.role, `${r.ref} (${r.target.value})`])),
  rolesDark: Object.fromEntries(darkRoleVars.map((r) => [r.role, `${r.ref} (${r.target.value})`])),
  errors,
  warnings,
};
writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2) + '\n');

if (errors.length) {
  console.error(`FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
writeFileSync(OUT_CSS, L.join('\n') + '\n');
console.log(`Wrote ${OUT_CSS}`);
console.log(JSON.stringify(report.counts));
for (const w of warnings) console.warn(`warning: ${w}`);
