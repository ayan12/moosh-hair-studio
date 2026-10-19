// Procedural hair renderer: strands rooted on a rounded crown, with frizz, curl, colour and shine.
// Each canvas only animates while it is on screen.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const hexToRgb = (h) => {
  const n = parseInt(String(h).replace('#', ''), 16);
  return Number.isFinite(n) ? [n >> 16, (n >> 8) & 255, n & 255] : [74, 46, 34];
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const scale = (c, f) => c.map((v) => Math.min(255, v * f));
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export class Hair {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.out = canvas.getContext('2d');
    this.buf = document.createElement('canvas');
    this.ctx = this.buf.getContext('2d');
    this.o = { n: 200, seg: 34, top: 0.1, len: 1, sway: false, ...opts };
    this.p = { wave: 0, frizz: 1, dull: 0.4, shine: 1, col: hexToRgb('#4A2E22') };
    this.t = { ...this.p, col: this.p.col.slice() };
    this.visible = false;
    this.raf = 0;
    this.time = 0;
    this.resize();
    // Resizing clears a canvas, so redraw straight away even if it's off screen.
    new ResizeObserver(() => { this.resize(); this.draw(); this.present(); this.dirty = false; this.request(); }).observe(canvas);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.request(); }).observe(canvas);
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height); this.dpr = dpr;
    this.cv.width = this.buf.width = Math.round(this.w * dpr); this.cv.height = this.buf.height = Math.round(this.h * dpr);
    this.dirty = true;
    const n = this.w < 380 ? Math.round(this.o.n * 0.65) : this.o.n;
    const S = this.o.seg;
    if (!this.s || this.s.length !== n) {
      const rnd = mulberry32(7);
      this.s = Array.from({ length: n }, () => ({
        ph1: rnd() * 6.28, ph2: rnd() * 6.28, ph3: rnd() * 6.28,
        lr: 0.88 + rnd() * 0.14, sh: 0.8 + rnd() * 0.32, hl: rnd() < 0.08,
        fz: new Float32Array(S + 1).fill(1), dx: new Float32Array(S + 1),
        jit: Float32Array.from({ length: S + 1 }, () => rnd() * 2 - 1)
      }));
    }
  }

  set(target) {
    Object.assign(this.t, target);
    if (target.color) this.t.col = hexToRgb(target.color);
    this.request();
  }
  snap() { Object.assign(this.p, this.t); this.p.col = this.t.col.slice(); this.dirty = true; this.request(); }
  smooth() { for (const s of this.s) s.fz.fill(0); this.dirty = true; this.request(); }
  refrizz() { for (const s of this.s) s.fz.fill(1); this.dirty = true; this.request(); }

  point(i, k) {
    const s = this.s[i], S = this.o.seg, n = this.s.length, p = this.p;
    const t = i / (n - 1), u = k / S, w = this.w, h = this.h;
    const side = (t - 0.5) * 2, cx = w / 2, top = h * this.o.top;
    const hr = Math.min(w * 0.27, h * 0.24), al = side * 1.52;
    const rx = cx + hr * Math.sin(al), ry = top + hr * 1.05 * (1 - Math.cos(al));
    const L = (h * this.o.len - top) * (0.8 + 0.2 * (1 - side * side)) * s.lr - (ry - top) * 0.6;
    const g = 0.15 + 0.85 * Math.min(1, u / 0.22);
    let x = rx + side * w * 0.045 * u * u + Math.sin(u * 3 + s.ph1) * w * 0.006 * u;
    let y = ry + L * u;
    const ef = p.frizz * s.fz[k];
    x += g * p.wave * w * 0.032 * (u * 0.9 + 0.1) * (0.3 + 0.7 * Math.max(ef, p.frizz ? 0 : 0.5)) * Math.sin(k * 0.8 + s.ph3 * (0.15 + 0.85 * ef) + side * 1.2);
    const f = ef * g * Math.sqrt(u);
    x += f * w * 0.03 * (0.55 * Math.sin(k * 1.9 + s.ph2) + 0.45 * s.jit[k]);
    y += f * h * 0.006 * s.jit[(k + 7) % (S + 1)];
    return [x + s.dx[k], y];
  }

  comb(px, py, vx, vy) {
    const R = Math.max(30, this.w * 0.085), S = this.o.seg;
    let hit = false;
    for (let i = 0; i < this.s.length; i++) {
      const s = this.s[i];
      for (let k = 0; k <= S; k++) {
        const [x, y] = this.point(i, k);
        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const f = 1 - Math.sqrt(d2) / R;
          s.fz[k] *= 1 - 0.55 * f * Math.min(1, Math.abs(vy) / 5 + 0.35);
          if (s.fz[k] < 0.02) s.fz[k] = 0;
          s.dx[k] += Math.sign(dx || 1) * f * 2.2 + vx * 0.08 * f;
          hit = true;
        }
      }
    }
    if (hit) { this.dirty = true; this.request(); }
  }

  frizzLevel() {
    let a = 0, c = 0;
    for (const s of this.s) for (let k = 0; k < s.fz.length; k++) { a += s.fz[k]; c++; }
    return this.p.frizz * (a / c);
  }

  step(dt) {
    const p = this.p, t = this.t, e = REDUCED ? 1 : 1 - Math.pow(0.0005, dt);
    let moving = false;
    for (const key of ['wave', 'frizz', 'dull', 'shine']) {
      const d = t[key] - p[key];
      if (Math.abs(d) > 0.002) { p[key] += d * e; moving = true; } else p[key] = t[key];
    }
    for (let j = 0; j < 3; j++) {
      const d = t.col[j] - p.col[j];
      if (Math.abs(d) > 0.5) { p.col[j] += d * e; moving = true; } else p.col[j] = t.col[j];
    }
    for (const s of this.s) for (let k = 0; k < s.dx.length; k++) {
      if (s.dx[k]) { s.dx[k] *= 0.9; if (Math.abs(s.dx[k]) < 0.05) s.dx[k] = 0; else moving = true; }
    }
    return moving;
  }

  draw() {
    const c = this.ctx, S = this.o.seg, p = this.p, n = this.s.length;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    const grey = [120, 110, 102];
    const base = mix(p.col, scale(mix(p.col, grey, 0.55), 1.08), p.dull);
    const root = scale(base, 0.62), tip = mix(base, [236, 214, 188], 0.16 * (1 - p.dull));
    const pts = new Array(n);
    for (let i = 0; i < n; i++) { const a = new Array(S + 1); for (let k = 0; k <= S; k++) a[k] = this.point(i, k); pts[i] = a; }

    // 1. volume: a dark body under the strands so the hair reads as thick, not see-through
    c.save();
    c.beginPath();
    const L = pts[0], R = pts[n - 1];
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) c.lineTo(pts[i][0][0], pts[i][0][1]);
    for (let k = 1; k <= S; k++) c.lineTo(R[k][0], R[k][1]);
    for (let i = n - 1; i >= 0; i -= 3) c.lineTo(pts[i][S - 2][0], pts[i][S - 2][1]);
    for (let k = S; k >= 0; k--) c.lineTo(L[k][0], L[k][1]);
    c.closePath();
    const g = c.createLinearGradient(0, this.h * this.o.top, 0, this.h);
    g.addColorStop(0, rgba(scale(base, 0.5), 0.95));
    g.addColorStop(0.7, rgba(scale(base, 0.42), 0.85));
    g.addColorStop(1, rgba(scale(base, 0.4), 0));
    c.fillStyle = g;
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    c.fill();
    c.restore();

    c.lineCap = 'round'; c.lineJoin = 'round';
    const thin = this.w < 380 ? 0.85 : 1;

    // 2. back layer: thicker, darker strands for depth
    c.lineWidth = 2.4 * thin;
    c.strokeStyle = rgba(scale(base, 0.55), 0.35);
    for (let i = 0; i < n; i += 2) this.path(pts[i], 0, S), c.stroke();

    // 3. front strands: one smooth gradient per strand (darker roots, lighter, softer ends)
    for (let i = 0; i < n; i++) {
      const s = this.s[i], a = pts[i], hl = s.hl ? 1.22 : 1;
      const gr = c.createLinearGradient(0, a[0][1], 0, a[S][1]);
      gr.addColorStop(0, rgba(scale(root, s.sh * hl), 0.9));
      gr.addColorStop(0.3, rgba(scale(base, s.sh * hl), 0.85));
      gr.addColorStop(0.75, rgba(scale(base, s.sh * hl * 1.04), 0.8));
      gr.addColorStop(1, rgba(scale(tip, s.sh * hl), 0.35));
      c.strokeStyle = gr;
      c.lineWidth = (s.hl ? 0.9 : 1.15) * thin;
      this.path(a, 0, S); c.stroke();
      if (p.frizz * s.fz[S] > 0.4 && i % 3 === 0) {
        const e = a[S];
        c.lineWidth = 0.7; c.strokeStyle = rgba(scale(tip, s.sh), 0.35);
        c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[0] + s.jit[3] * 14 * p.frizz, e[1] + 6 + s.jit[5] * 8); c.stroke();
      }
    }

    // 4. shine: soft, feathered highlights that follow the crown and the lengths, only where hair is smooth
    const hi = mix(p.col, [255, 238, 210], 0.55);
    c.globalCompositeOperation = 'screen';
    this.sheen(pts, hi, 0.05, 0.19, 0.42, 1, 1.5 * thin);
    this.sheen(pts, hi, 0.4, 0.56, 0.14, 2, 1.3 * thin);
    c.globalCompositeOperation = 'source-over';
    if (this.onDraw) this.onDraw();
  }

  // Copy the rendered hair to the visible canvas. Idle sway is a gentle skew from the crown, so it costs one drawImage.
  present() {
    const c = this.out, d = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    if (this.o.sway && !REDUCED) {
      const k = Math.sin(this.time * 0.9) * 0.014 + Math.sin(this.time * 0.37) * 0.006;
      const top = this.h * this.o.top * d;
      c.setTransform(1, 0, k, 1, -k * top, 0);
    }
    c.drawImage(this.buf, 0, 0);
  }

  path(a, k0, k1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(a[k0][0], a[k0][1]);
    for (let k = k0 + 1; k < k1; k++) c.quadraticCurveTo(a[k][0], a[k][1], (a[k][0] + a[k + 1][0]) / 2, (a[k][1] + a[k + 1][1]) / 2);
    c.lineTo(a[k1][0], a[k1][1]);
  }

  sheen(pts, hi, from, to, strength, every, width) {
    const c = this.ctx, S = this.o.seg, p = this.p;
    c.lineWidth = width;
    for (let i = 0; i < pts.length; i += every) {
      const s = this.s[i], a = pts[i];
      const y0 = a[0][1] + this.h * from, y1 = a[0][1] + this.h * to;
      let k0 = -1, k1 = -1, sm = 0, cnt = 0;
      for (let k = 0; k <= S; k++) {
        const y = a[k][1];
        if (y >= y0 && y <= y1) { if (k0 < 0) k0 = k; k1 = k; sm += 1 - p.frizz * s.fz[k] * 0.9; cnt++; }
      }
      if (k0 < 1 || k1 - k0 < 1) continue;
      const smooth = (sm / cnt) * (1 - p.dull) * (0.3 + p.shine * 0.7);
      if (smooth < 0.04) continue;
      const peak = rgba(hi, Math.min(1, smooth * strength * s.sh));
      const gr = c.createLinearGradient(0, a[k0][1], 0, a[k1][1]);
      gr.addColorStop(0, rgba(hi, 0)); gr.addColorStop(0.5, peak); gr.addColorStop(1, rgba(hi, 0));
      c.strokeStyle = gr;
      this.path(a, k0 - 1, Math.min(S, k1 + 1)); c.stroke();
    }
  }

  request() {
    if (this.raf || !this.visible) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const animating = this.o.sway && !REDUCED;
      if (animating) this.time += dt;
      const moving = this.step(dt);
      if (moving || this.dirty || this.active) { this.draw(); this.dirty = false; }
      this.present();
      if (this.visible && (moving || this.active || animating)) this.raf = requestAnimationFrame(loop);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(loop);
  }
}

// Small seeded random so the hair looks the same on every visit.
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
