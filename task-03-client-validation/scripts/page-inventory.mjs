// Page inventory probe for Task 3 Step 1.
//
// Counting rule (same for the before and after counts):
//   A "user-facing page" is a distinct URL path that answers an HTTP GET with status 200
//   and a text/html document meant for a person to read.
//   - Query-string variants of one path (for example /auth?mode=login and /auth?mode=reset)
//     count as ONE page, because they are the same route and the same template.
//   - Redirects, the 404 page, POST-only endpoints and static assets are not counted.
//
// Usage: node page-inventory.mjs <baseUrl> [extra paths...]
const base = process.argv[2];
const extra = process.argv.slice(3);
if (!base) {
  console.error('usage: node page-inventory.mjs <baseUrl> [extra paths...]');
  process.exit(2);
}

const candidates = [
  '/', '/services', '/inquiries',
  '/signup', '/register', '/login', '/reset', '/forgot-password', '/reset-password', '/password-reset',
  '/auth', '/auth?mode=signup', '/auth?mode=login', '/auth?mode=reset',
  '/does-not-exist-control',
  ...extra
];

const rows = [];
for (const path of candidates) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const type = res.headers.get('content-type') || '';
  const body = await res.text();
  const title = (body.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const location = res.headers.get('location') || '';
  rows.push({ path, status: res.status, type: type.split(';')[0], title: title.replace(/&#39;/g, "'"), location });
}

const isPage = (r) => r.status === 200 && r.type === 'text/html';
const pathOnly = (p) => p.split('?')[0];
const countedPaths = new Map();
for (const r of rows) {
  if (isPage(r) && !countedPaths.has(pathOnly(r.path))) countedPaths.set(pathOnly(r.path), r);
}

console.log('Probe results (GET):');
for (const r of rows) {
  const note = r.location ? ` -> redirects to ${r.location}` : '';
  console.log(`  ${String(r.status).padEnd(4)} ${r.path.padEnd(26)} ${r.type.padEnd(10)} ${r.title}${note}`);
}
console.log('');
console.log('Pages counted under the rule (distinct paths returning 200 text/html):');
for (const [p, r] of countedPaths) console.log(`  ${p.padEnd(12)} ${r.title}`);
console.log('');
console.log(`TOTAL USER-FACING PAGES: ${countedPaths.size}`);
const authPaths = [...countedPaths.keys()].filter((p) =>
  ['/signup', '/register', '/login', '/reset', '/forgot-password', '/reset-password', '/password-reset', '/auth'].includes(p));
console.log(`  of which authentication pages: ${authPaths.length}${authPaths.length ? ' (' + authPaths.join(', ') + ')' : ''}`);
