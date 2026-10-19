import { Hair } from './hair.js';

document.documentElement.classList.add('js');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let DATA;
try { DATA = JSON.parse($('#site-data').textContent); } catch { DATA = null; }
if (!DATA) throw new Error('site-data missing');

const wa = (text) => `https://wa.me/${encodeURIComponent(DATA.whatsapp)}?text=${encodeURIComponent(text)}`;
// Strip control characters and trim user input before it goes into a message.
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const press = (buttons, active) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));

/* ---------------- hero: comb the hair ---------------- */
{
  const mirror = $('#mirror'), cv = $('#hero-hair'), pct = $('#frizz-pct');
  const hair = new Hair(cv, { n: 280, seg: 40, top: 0.13, len: 0.97, sway: true });
  hair.set({ wave: 0.25, frizz: 1, dull: 0.35, shine: 1, color: '#4A2E22' }); hair.snap();
  let shown = -1;
  hair.onDraw = () => { const v = Math.round(hair.frizzLevel() * 100); if (v !== shown) { shown = v; pct.textContent = `${v}%`; } };

  let last = null, demo = null;
  const stopDemo = () => { if (demo) { clearInterval(demo); demo = null; hair.active = false; } };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const begin = (p) => { stopDemo(); mirror.classList.add('used'); last = p; hair.active = true; hair.request(); };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); begin(pos(e)); });
  cv.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (!last) { if (e.pointerType === 'mouse') begin(p); return; }
    const vx = p[0] - last[0], vy = p[1] - last[1], steps = Math.max(1, Math.ceil(Math.hypot(vx, vy) / 10));
    for (let j = 1; j <= steps; j++) hair.comb(last[0] + (vx * j) / steps, last[1] + (vy * j) / steps, vx, vy);
    last = p;
  });
  const end = () => { last = null; hair.active = false; };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, end));
  $('#refrizz').addEventListener('click', () => hair.refrizz());

  // A ghost comb shows what to do, once, unless the visitor gets there first.
  if (!REDUCED) setTimeout(() => {
    if (mirror.classList.contains('used')) return;
    let t = 0; hair.active = true; hair.request();
    const xs = [0.5, 0.38, 0.62, 0.28, 0.72];
    demo = setInterval(() => {
      t++; const pass = Math.floor(t / 40), u = (t % 40) / 40;
      if (pass >= xs.length) return stopDemo();
      hair.comb(hair.w * xs[pass], hair.h * (0.14 + u * 0.8), 0, 10);
    }, 16);
  }, 1400);
}

/* ---------------- rumus: problem → treatment ---------------- */
{
  const hair = new Hair($('#ba-hair'), { n: 200, seg: 32, top: 0.08, len: 1.04 });
  const probs = $$('.prob'), toggles = $$('.toggle button');
  let cur = 0, after = false, timer = 0;
  const show = (snap) => {
    const pr = DATA.problems[cur];
    $('#rx-name').textContent = pr.treatment;
    $('#rx-desc').textContent = pr.result;
    $('#ba-lab').textContent = after ? `Sesudah · ${pr.treatment}` : `Sebelum · ${pr.title}`;
    hair.set(after ? { ...pr.after, shine: 1 } : { shine: 0.2, ...pr.before });
    if (snap) hair.snap();
    press(toggles, toggles[after ? 1 : 0]);
    $('#rx-wa').href = wa(`Halo ${DATA.name}! Rambut saya ${pr.title.toLowerCase()} (${pr.detail.toLowerCase()}). Saya mau tanya dan booking ${pr.treatment}.`);
  };
  probs.forEach((b) => b.addEventListener('click', () => {
    cur = Number(b.dataset.i); after = false; press(probs, b); show(true);
    if (innerWidth < 900) $('#result').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    clearTimeout(timer); timer = setTimeout(() => { after = true; show(); }, 900);
  }));
  toggles.forEach((b) => b.addEventListener('click', () => { clearTimeout(timer); after = b.dataset.s === '1'; show(); }));
  show(true);
  new IntersectionObserver(([e], o) => {
    if (e.isIntersecting) { timer = setTimeout(() => { after = true; show(); }, 700); o.disconnect(); }
  }, { threshold: 0.4 }).observe($('#result'));
}

/* ---------------- colour lab ---------------- */
{
  const hair = new Hair($('#color-hair'), { n: 230, seg: 34, top: 0.1, len: 0.92 });
  hair.set({ wave: 0.35, frizz: 0, dull: 0, shine: 1, color: DATA.colors[0].hex }); hair.snap(); hair.smooth();
  const swatches = $$('.swatch');
  swatches.forEach((b) => { $('i', b).style.background = b.querySelector('i').dataset.hex; });
  const real = $('#lab-real'), realImg = $('#lab-real-img'), quote = $('#quote');
  const pick = (i) => {
    const c = DATA.colors[i];
    hair.set({ color: c.hex });
    $('#col-name').textContent = c.name; $('#col-note').textContent = c.note;
    real.hidden = !c.photo;
    if (c.photo) { realImg.src = `/img/${encodeURIComponent(c.photo)}-480.webp`; realImg.alt = `Hasil warna ${c.name} di Moosh`; }
    quote.hidden = !c.quote;
    if (c.quote) { $('#quote-text').textContent = `“${c.quote}”`; $('#quote-by').textContent = `${c.quoteBy}, hair color by Moosh, di Instagram`; }
    press(swatches, swatches[i]);
    $('#col-wa').href = wa(`Halo ${DATA.name}! Saya mau konsultasi hair color ${c.name}. Kira-kira cocok untuk rambut saya dan berapa biayanya?`);
  };
  swatches.forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.i))));
  pick(0);
}

/* ---------------- booking form ---------------- */
{
  const form = $('#book-form'), name = $('#f-name'), date = $('#f-date');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(), tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  date.min = iso(today); date.value = iso(tomorrow);
  const fail = (input, msgId, bad) => { input.setAttribute('aria-invalid', String(bad)); $(msgId).hidden = !bad; return bad; };
  name.addEventListener('input', () => fail(name, '#e-name', false));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = clean(name.value, 60);
    const d = date.value;
    const badName = fail(name, '#e-name', !n);
    const badDate = fail(date, '#e-date', !d || d < date.min);
    if (badName || badDate) { (badName ? name : date).focus(); return; }
    const when = new Date(`${d}T00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    const note = clean($('#f-note').value, 300);
    const lines = [
      `Halo ${DATA.name}! Saya mau booking:`,
      `• Nama: ${n}`,
      `• Layanan: ${clean($('#f-svc').value, 40)}`,
      `• Panjang rambut: ${clean($('#f-len').value, 20)}`,
      `• Tanggal: ${when}`,
      `• Jam: ${clean($('#f-time').value, 10)} WITA`,
      ...(note ? [`• Catatan: ${note}`] : []),
      '', 'Apakah jadwalnya tersedia?'
    ];
    const url = wa(lines.join('\n'));
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) location.href = url;
  });

  const copy = $('#copy-num');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = 'Tersalin'; }
    catch { const r = document.createRange(); r.selectNodeContents($('#wa-num')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = 'Terpilih'; }
    setTimeout(() => { copy.textContent = 'Salin'; }, 1500);
  });
}

/* ---------------- reveal on scroll ---------------- */
{
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));
}
