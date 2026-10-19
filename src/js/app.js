import { Hair } from './hair.js';
import { Reveal } from './reveal.js';

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

/* ---------------- hero: brush away the frizz to reveal the real result ---------------- */
{
  const mirror = $('#mirror'), cv = $('#hero-hair'), pct = $('#frizz-pct');
  const reveal = new Reveal(cv, `/img/${encodeURIComponent(DATA.hero.photo)}-800.webp`, { focusY: DATA.hero.focusY });
  reveal.onLevel = (v) => {
    const n = Math.round(v * 100);
    pct.textContent = `${n}%`;
    if (n <= 50) reveal.finish();
    mirror.classList.toggle('done', n <= 2);
  };

  let last = null, demo = null;
  const stopDemo = () => { if (demo) { clearInterval(demo); demo = null; } };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const begin = (p) => { stopDemo(); mirror.classList.add('used'); last = p; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); begin(pos(e)); reveal.comb(last[0], last[1], last[0], last[1] + 1); });
  cv.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (!last) { if (e.pointerType === 'mouse') begin(p); return; }
    reveal.comb(last[0], last[1], p[0], p[1]);
    last = p;
  });
  const end = () => { last = null; };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => cv.addEventListener(t, end));
  $('#refrizz').addEventListener('click', () => { reveal.reset(); mirror.classList.remove('done'); });

  // A ghost comb makes three strokes so visitors see what happens, unless they get there first.
  if (!REDUCED) reveal.ready.then(() => setTimeout(() => {
    if (mirror.classList.contains('used')) return;
    let t = 0, prev = null;
    const xs = [0.5, 0.36, 0.64], N = 46;
    demo = setInterval(() => {
      const pass = Math.floor(t / N), u = (t % N) / N; t++;
      if (pass >= xs.length) return stopDemo();
      const x = reveal.w * (xs[pass] + Math.sin(u * 3) * 0.02), y = reveal.h * (0.1 + u * 0.85);
      if (u === 0) prev = null;
      if (prev) reveal.comb(prev[0], prev[1], x, y);
      prev = [x, y];
    }, 16);
  }, 1200)).catch(() => {});
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
    $('#form-ok-link').href = url;
    $('#form-ok').hidden = false;
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

/* ---------------- mobile menu ---------------- */
{
  const btn = $('.menu-toggle'), nav = $('#site-nav');
  const set = (open) => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu'); };
  btn.addEventListener('click', () => set(!nav.classList.contains('open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); } });
  matchMedia('(min-width: 901px)').addEventListener('change', () => set(false));
}

/* ---------------- reveal on scroll ---------------- */
{
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));
}
