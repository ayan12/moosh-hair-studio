// Build: content/site.json + src/ → dist/ (static site).
// No dependencies. Assets get content hashes so they can be cached forever.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderPage, esc } from '../src/page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

const content = JSON.parse(await readFile(r('content/site.json'), 'utf8'));
validate(content);

await rm(r('dist'), { recursive: true, force: true });
await mkdir(r('dist/assets'), { recursive: true });
await cp(r('public'), r('dist'), { recursive: true });

// CSS
const css = await readFile(r('src/styles.css'), 'utf8');
const cssName = `/assets/styles.${hash(css)}.css`;
await writeFile(r('dist' + cssName), css);

// JS: tiny bundle (hair.js inlined into app.js) so one hashed file is served.
const hair = (await readFile(r('src/js/hair.js'), 'utf8')).replace(/^export /gm, '');
const reveal = (await readFile(r('src/js/reveal.js'), 'utf8')).replace(/^export /gm, '');
const app = (await readFile(r('src/js/app.js'), 'utf8')).replace(/^import .*$/gm, '');
// hair.js gets its own scope so its top-level names can never clash with app.js.
const js = `// Moosh Hair Studio\nconst { Hair } = (() => {\n${hair}\nreturn { Hair };\n})();\nconst { Reveal } = (() => {\n${reveal}\nreturn { Reveal };\n})();\n${app}`;
const jsName = `/assets/app.${hash(js)}.js`;
await writeFile(r('dist' + jsName), js);

await writeFile(r('dist/index.html'), renderPage(content, { css: cssName, js: jsName }));

const url = content.site.url.replace(/\/$/, '');
await writeFile(r('dist/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
await writeFile(r('dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(url)}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`);
await writeFile(r('dist/404.html'), notFound(content, cssName));

console.log(`Built dist/ → ${cssName}, ${jsName}`);

function notFound(c, cssHref) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Halaman tidak ditemukan · ${esc(c.business.name)}</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${esc(cssHref)}"></head><body><main class="wrap nf"><p class="logo-m">Moosh</p><h1>Halaman ini <span class="script">tidak ada.</span></h1><p class="lede">Mungkin tautannya sudah berubah.</p><p class="ctas"><a class="btn" href="/">Kembali ke beranda</a></p></main></body></html>\n`;
}

// Fail the build early if the content file is missing something the page needs.
function validate(c) {
  const need = (cond, msg) => { if (!cond) throw new Error(`content/site.json: ${msg}`); };
  need(c.business?.name, 'business.name is required');
  need(/^62\d{8,13}$/.test(c.business?.whatsapp || ''), 'business.whatsapp must look like 62xxxxxxxxxx');
  need(/^\d{2}:\d{2}$/.test(c.business?.hours?.open || '') && /^\d{2}:\d{2}$/.test(c.business?.hours?.close || ''), 'hours.open/close must be HH:MM');
  need(/^https:\/\//.test(c.site?.url || ''), 'site.url must start with https://');
  need(Array.isArray(c.problems) && c.problems.length > 0, 'problems must be a non-empty list');
  need(Array.isArray(c.colors) && c.colors.length > 0, 'colors must be a non-empty list');
  for (const col of c.colors) need(/^#[0-9a-fA-F]{6}$/.test(col.hex), `color "${col.name}" needs a hex like #A8552C`);
  for (const g of c.gallery || []) need(/^[a-z0-9-]+$/.test(g.photo), `gallery photo "${g.photo}" must be a simple file name`);
  need(/^[a-z0-9-]+$/.test(c.hero?.photo || ''), 'hero.photo must be a simple file name');
  for (const col of c.colors) if (col.photo) need(/^[a-z0-9-]+$/.test(col.photo), `color photo "${col.photo}" must be a simple file name`);
}
