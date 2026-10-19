// Fails if any page links to a missing file or to an #anchor that doesn't exist.
// External links are listed, so they can be spot-checked by hand.
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const pages = (await readdir(dist)).filter((f) => f.endsWith('.html'));
const problems = [], external = new Set();

for (const page of pages) {
  const html = await readFile(path.join(dist, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  for (const s of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of s[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
  for (const ref of refs) {
    if (/^(https?:)?\/\//.test(ref)) { external.add(ref.split('?')[0]); continue; }
    if (ref.startsWith('#')) { if (ref.length > 1 && !ids.has(ref.slice(1))) problems.push(`${page}: anchor ${ref} has no matching id`); continue; }
    if (/^(mailto|tel|data):/.test(ref)) continue;
    const file = path.join(dist, ref.split(/[?#]/)[0].replace(/\/$/, '/index.html'));
    try { await access(file); } catch { problems.push(`${page}: ${ref} not found`); }
  }
}

console.log(`Checked ${pages.length} pages. External links (${external.size}):\n  ${[...external].join('\n  ')}`);
if (problems.length) { console.error(`\n${problems.length} broken link(s):\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log('No broken internal links.');
