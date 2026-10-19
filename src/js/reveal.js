// Brush-to-reveal hero: the real salon photo sits underneath, with a "before" version on top
// (dull, greyed, frizzy flyaways). Each comb stroke wipes the before layer away in soft comb-tooth streaks.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Reveal {
  constructor(canvas, src, { focusY = 0.55 } = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.focusY = focusY;
    this.before = document.createElement('canvas');
    this.bctx = this.before.getContext('2d', { willReadFrequently: true });
    this.img = new Image();
    this.img.decoding = 'async';
    this.ready = new Promise((res, rej) => { this.img.onload = res; this.img.onerror = rej; });
    this.img.src = src;
    this.time = 0; this.raf = 0; this.visible = false; this.level = 1; this.fade = 1; this.finishing = false;
    this.ready.then(() => { this.layout(); this.request(); }).catch(() => {});
    new ResizeObserver(() => { if (this.img.complete && this.img.naturalWidth) { this.layout(); this.request(); } }).observe(canvas);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.request(); }).observe(canvas);
  }

  layout() {
    const r = this.cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(10, Math.round(r.width * d)), H = Math.max(10, Math.round(r.height * d));
    this.cv.width = this.before.width = W; this.cv.height = this.before.height = H;
    this.w = r.width; this.h = r.height; this.d = d;
    // "cover" crop of the photo, biased towards the hair
    const iw = this.img.naturalWidth, ih = this.img.naturalHeight, s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    this.crop = [(W - dw) / 2, Math.min(0, Math.max(H - dh, (H - dh) * this.focusY)), dw, dh];
    this.paintBefore();
    this.level = 1;
  }

  // Build the "before" layer once: same photo, desaturated and flattened, with frizzy flyaways where the hair is.
  paintBefore() {
    const c = this.bctx, W = this.before.width, H = this.before.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    c.drawImage(this.img, ...this.crop);
    const data = c.getImageData(0, 0, W, H), p = data.data;
    const hairMask = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, sat = mx ? (mx - mn) / mx : 0;
      const isHair = sat > 0.28 || l < 0.32;
      hairMask[j] = isHair ? 1 : 0;
      // dull: towards a tired brown-grey, lower contrast, no shine
      const grey = 0.3 * r + 0.59 * g + 0.11 * b;
      const k = isHair ? 0.74 : 0.3;
      let nr = r + (grey * 1.1 + 16 - r) * k, ng = g + (grey * 0.95 + 6 - g) * k, nb = b + (grey * 0.8 - b) * k;
      const flat = isHair ? 0.55 : 0.85;              // squash highlights so the gloss disappears
      nr = 120 + (nr - 120) * flat; ng = 104 + (ng - 104) * flat; nb = 92 + (nb - 92) * flat;
      p[i] = nr; p[i + 1] = ng; p[i + 2] = nb;
    }
    c.putImageData(data, 0, 0);
    this.mask = hairMask; this.mw = W; this.mh = H;

    // frizz: short, kinky flyaway strands scattered over the hair (seeded, so it's the same every time)
    const rnd = mulberry32(11), n = Math.round((W * H) / 520);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!hairMask[(y | 0) * W + (x | 0)]) continue;
      // long, loose flyaways that roughly follow the hair downwards, with a little kink
      const len = (30 + rnd() * 70) * this.d, amp = (2 + rnd() * 6) * this.d, turns = 0.8 + rnd() * 2.2;
      const ang = Math.PI / 2 + (rnd() - 0.5) * 1.1, ph = rnd() * 6.28;
      const light = rnd() < 0.6;
      c.strokeStyle = light ? `rgba(214,192,170,${0.14 + rnd() * 0.2})` : `rgba(64,50,42,${0.16 + rnd() * 0.18})`;
      c.lineWidth = (0.5 + rnd() * 0.8) * this.d;
      c.beginPath();
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const along = t * len, side = Math.sin(ph + t * turns * Math.PI * 2) * amp * (0.3 + t) + (rnd() - 0.5) * this.d * 1.2;
        const px = x + ca * along - sa * side, py = y + sa * along + ca * side;
        t === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
    }
    // a halo of frizz around the silhouette edge
    for (let i = 0; i < n * 0.25; i++) {
      const x = (rnd() * W) | 0, y = (rnd() * H) | 0, j = y * W + x;
      if (!hairMask[j] || (hairMask[j - 6 * this.d | 0] && hairMask[j + 6 * this.d | 0])) continue;
      c.strokeStyle = `rgba(190,170,150,${0.25 + rnd() * 0.25})`; c.lineWidth = 0.7 * this.d;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 1; k < 6; k++) c.lineTo(x + (rnd() - 0.5) * 22 * this.d, y + (rnd() - 0.7) * 16 * this.d);
      c.stroke();
    }
  }

  // One comb stroke segment, from (x0,y0) to (x1,y1) in CSS pixels: a soft core plus comb-tooth streaks.
  comb(x0, y0, x1, y1) {
    const c = this.bctx, d = this.d, R = Math.max(26, this.w * 0.075) * d;
    const ax = x0 * d, ay = y0 * d, bx = x1 * d, by = y1 * d;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.lineCap = 'round';
    // soft core
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = R * 1.4;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    // teeth: thin parallel streaks that follow the stroke
    const teeth = 9;
    for (let i = 0; i < teeth; i++) {
      const o = ((i / (teeth - 1)) - 0.5) * R * 1.6;
      const edge = 1 - Math.abs(o) / (R * 0.9);
      c.strokeStyle = `rgba(0,0,0,${0.18 + 0.4 * Math.max(0, edge)})`;
      c.lineWidth = R * 0.12;
      c.beginPath(); c.moveTo(ax + nx * o, ay + ny * o); c.lineTo(bx + nx * o, by + ny * o); c.stroke();
    }
    c.restore();
    this.dirty = true; this.request();
  }

  reset() { this.paintBefore(); this.level = 1; this.fade = 1; this.finishing = false; this.dirty = true; this.request(); }

  // Once most of the frizz is gone, melt the rest away so the finish feels complete.
  finish() { if (!this.finishing) { this.finishing = true; this.request(); } }

  // Share of hair still covered by the "before" layer (sampled on a coarse grid).
  measure() {
    const W = this.mw, H = this.mh, step = Math.max(6, Math.round(W / 70));
    const a = this.bctx.getImageData(0, 0, W, H).data;
    let tot = 0, cov = 0;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const j = y * W + x; if (!this.mask[j]) continue;
      tot++; cov += a[j * 4 + 3] / 255;
    }
    this.level = (tot ? cov / tot : 0) * this.fade;
    return this.level;
  }

  draw() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.drawImage(this.img, ...this.crop);
    // a slow sheen that travels down the revealed hair
    if (!REDUCED) {
      const y = ((this.time * 0.08) % 1.4 - 0.2) * H;
      const g = c.createLinearGradient(0, y - H * 0.12, 0, y + H * 0.12);
      g.addColorStop(0, 'rgba(255,235,240,0)'); g.addColorStop(0.5, 'rgba(255,235,240,0.10)'); g.addColorStop(1, 'rgba(255,235,240,0)');
      c.globalCompositeOperation = 'soft-light'; c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
    if (this.fade > 0) { c.globalAlpha = this.fade; c.drawImage(this.before, 0, 0); c.globalAlpha = 1; }
  }

  request() {
    if (this.raf || !this.visible || !this.w) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); this.time += dt; last = now;
      if (this.finishing && this.fade > 0) { this.fade = Math.max(0, this.fade - dt * 1.2); if (this.fade === 0 && this.onLevel) this.onLevel(0); }
      this.draw();
      if (this.dirty && now - (this.lastMeasure || 0) > 250) { this.lastMeasure = now; this.dirty = false; if (this.onLevel) this.onLevel(this.measure()); }
      this.raf = this.visible && (!REDUCED || this.dirty || (this.finishing && this.fade > 0)) ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
