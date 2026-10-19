// Local preview of dist/ with the same security headers as production (read from vercel.json).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const cfg = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const rules = cfg.headers.map((h) => ({ re: new RegExp('^' + h.source.replace(/\(\.\*\)/g, '.*').replace(/\((\w+)\|(\w+)\)/g, '($1|$2)') + '$'), headers: h.headers }));
const port = Number(process.env.PORT || 4173);

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(dist, url));
  if (!file.startsWith(dist)) { res.writeHead(400).end(); return; }
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); } catch { file = path.join(dist, '404.html'); res.statusCode = 404; }
  for (const r of rules) if (r.re.test(url)) for (const h of r.headers) res.setHeader(h.key, h.value);
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(await readFile(file));
}).listen(port, () => console.log(`Preview on http://localhost:${port}`));
