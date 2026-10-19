// Renders the full HTML page from content/site.json.
// Every value from content goes through esc() / attr(), so edits made in the CMS can never inject markup.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const attr = esc;

const waLink = (number, text) => `https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(text)}`;
const igLink = (handle) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;
const ext = 'target="_blank" rel="noopener noreferrer"';

const icon = {
  wa: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  ig: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
  heart: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  door: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16"/><circle cx="14.5" cy="12" r="1" fill="currentColor"/></svg>',
  spark: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>'
};

const picture = (name, alt, { sizes = '(max-width: 700px) 90vw, 420px', cls = '', eager = false } = {}) =>
  `<img class="${attr(cls)}" src="/img/${attr(name)}-800.webp" srcset="/img/${attr(name)}-480.webp 480w, /img/${attr(name)}-800.webp 800w" sizes="${attr(sizes)}" width="800" height="1448" alt="${attr(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

export function renderPage(c, assets) {
  const b = c.business, s = c.site, p = c.promo;
  const years = new Date().getFullYear() - b.since;
  const waGeneral = waLink(b.whatsapp, `Halo ${b.legalName}! Saya mau tanya dan booking.`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: b.name,
    alternateName: b.legalName,
    url: s.url,
    image: `${s.url}/img/og.jpg`,
    telephone: `+${b.whatsapp}`,
    foundingDate: String(b.since),
    address: { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: b.city, addressRegion: b.region, addressCountry: b.country },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: b.hours.open, closes: b.hours.close }],
    sameAs: [igLink(b.instagram)]
  };
  // JSON in a data block: escape "<" so the content can never close the script element.
  const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

  const clientData = {
    whatsapp: b.whatsapp, name: b.legalName, hero: c.hero,
    problems: c.problems, colors: c.colors.map(({ name, hex, note, photo, quote, quoteBy }) => ({ name, hex, note, photo: photo || null, quote: quote || null, quoteBy: quoteBy || null }))
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(s.title)}</title>
<meta name="description" content="${attr(s.description)}">
<link rel="canonical" href="${attr(s.url)}/">
<meta name="theme-color" content="#1E1411">
<meta property="og:type" content="website">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${attr(s.title)}">
<meta property="og:description" content="${attr(s.description)}">
<meta property="og:url" content="${attr(s.url)}/">
<meta property="og:image" content="${attr(s.url)}/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/${attr(c.hero.photo)}-800.webp" as="image" type="image/webp" fetchpriority="high">
<link rel="stylesheet" href="${attr(assets.css)}">
<script type="application/ld+json">${json(jsonLd)}</script>
<script type="application/json" id="site-data">${json(clientData)}</script>
<script type="module" src="${attr(assets.js)}"></script>
</head>
<body>
<a class="skip" href="#main">Lewati ke konten</a>

<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/" aria-label="${attr(b.name)}, beranda"><span class="logo-m">Moosh</span><span class="logo-s">HAIR STUDIO</span></a>
    <nav class="nav" id="site-nav" aria-label="Menu utama">
      <a href="#rumus">Rumus rambut</a><a href="#hasil">Hasil</a><a href="#warna">Warna</a><a href="#ladies">Ladies only</a><a href="#booking">Booking</a>
    </nav>
    <div class="top-actions">
      <a class="btn btn-sm" href="${attr(waGeneral)}" ${ext}>${icon.wa}<span>Booking via WA</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Buka menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>

<main id="main">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Salon khusus perempuan · ${esc(b.city)} · sejak ${esc(b.since)}</p>
        <h1>Rambut sehat, cantik, <span class="script">percaya diri.</span></h1>
        <p class="lede">Smoothing, keratin, hair color dan potong rambut di ${esc(b.name)}. Sudah ${esc(years)} tahun merawat rambut perempuan ${esc(b.city)}, dengan produk L'Oréal Professionnel dan Matrix.</p>
        <div class="ctas">
          <a class="btn" href="#booking">Booking sekarang</a>
          <a class="btn btn-ghost" href="#rumus">Cek masalah rambutmu</a>
        </div>
        <ul class="facts">
          <li>${icon.door}Khusus perempuan</li>
          <li>${icon.clock}${esc(b.hours.label)}</li>
          <li>${icon.pin}Depan Supermarket Azahra</li>
        </ul>
      </div>
      <div class="mirror" id="mirror">
        <canvas id="hero-hair" role="img" aria-label="Foto rambut ${attr(c.hero.label)} hasil Moosh. Usap untuk menghilangkan frizz dan melihat hasilnya."></canvas>
        <div class="mirror-frame" aria-hidden="true"></div>
        <p class="mirror-hint" aria-hidden="true">sisir rambutnya…</p>
        <p class="mirror-result" aria-hidden="true"><span class="script">${esc(c.hero.label)}</span><small>Hasil asli di Moosh</small></p>
        <div class="mirror-tag"><span>Frizz <b id="frizz-pct">100%</b></span><button type="button" id="refrizz">Kusutkan lagi</button></div>
      </div>
    </div>
  </section>

  <div class="band"><div class="wrap band-in">
    <span><b>Ladies only</b> · khusus pelanggan perempuan</span>
    <span><b>Buka</b> ${esc(b.hours.label)}</span>
    <span><b>L'Oréal</b> &amp; <b>Matrix</b> trained</span>
    <span><b>${esc(b.instagramFollowers)}</b> pengikut Instagram</span>
  </div></div>

  <section class="light" id="rumus" aria-labelledby="rumus-h">
    <div class="wrap">
      <p class="eyebrow">Rumus hair treatment</p>
      <h2 id="rumus-h">Apa masalah <span class="script">rambutmu?</span></h2>
      <p class="lede">Pilih kondisi rambutmu dan lihat perawatan yang kami sarankan. Ini rumus yang kami pakai setiap hari di salon.</p>
      <div class="rumus">
        <div class="probs" role="group" aria-label="Masalah rambut">
          ${c.problems.map((pr, i) => `<button class="prob" type="button" data-i="${i}" aria-pressed="${i === 0}"><span class="prob-t">${esc(pr.title)}</span><span class="prob-d">${esc(pr.detail)}</span><span class="prob-rx">→ ${esc(pr.treatment)}</span></button>`).join('\n          ')}
        </div>
        <div class="result" id="result" aria-live="polite">
          <div class="ba"><canvas id="ba-hair" role="img" aria-label="Simulasi rambut sebelum dan sesudah perawatan"></canvas><span class="ba-lab" id="ba-lab">Sebelum</span></div>
          <div class="toggle" role="group" aria-label="Sebelum atau sesudah"><button type="button" data-s="0" aria-pressed="true">Sebelum</button><button type="button" data-s="1" aria-pressed="false">Sesudah</button></div>
          <h3 id="rx-name">${esc(c.problems[0].treatment)}</h3>
          <p id="rx-desc">${esc(c.problems[0].result)}</p>
          <a class="btn btn-wa" id="rx-wa" href="${attr(waGeneral)}" ${ext}>${icon.wa}Tanya &amp; booking treatment ini</a>
        </div>
      </div>
    </div>
  </section>

  <section id="hasil" aria-labelledby="hasil-h">
    <div class="wrap">
      <div class="sec-head">
        <div><p class="eyebrow">Hasil kerja kami</p><h2 id="hasil-h">Langsung dari <span class="script">kursi salon.</span></h2></div>
        <a class="link-ig" href="${attr(igLink(b.instagram))}" ${ext}>${icon.ig}Lihat ${esc(b.instagramPosts)} hasil lainnya di Instagram</a>
      </div>
      <ul class="gallery">
        ${c.gallery.map((g, i) => `<li class="shot reveal">${picture(g.photo, g.alt, { sizes: '(max-width: 700px) 46vw, 280px' })}<span class="shot-lab">${esc(g.label)}</span></li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="light" id="layanan" aria-labelledby="layanan-h">
    <div class="wrap">
      <p class="eyebrow">Layanan</p>
      <h2 id="layanan-h">Semua yang rambutmu <span class="script">butuhkan.</span></h2>
      <ol class="svc">
        ${c.services.map((sv) => `<li class="reveal"><h3>${esc(sv.name)}</h3><p>${esc(sv.text)}</p></li>`).join('\n        ')}
      </ol>
      <p class="svc-note">Harga tergantung panjang dan kondisi rambut. <a href="${attr(waLink(b.whatsapp, `Halo ${b.legalName}! Saya mau tanya daftar harga.`))}" ${ext}>Tanya daftar harga lewat WhatsApp →</a></p>
    </div>
  </section>

  <section id="warna" aria-labelledby="warna-h">
    <div class="wrap">
      <p class="eyebrow">Colour lab</p>
      <h2 id="warna-h">Coba warna <span class="script">sebelum datang.</span></h2>
      <div class="lab">
        <div class="lab-stage reveal">
          <canvas id="color-hair" role="img" aria-label="Pratinjau warna rambut"></canvas>
          <figure class="lab-real" id="lab-real" hidden><img id="lab-real-img" src="/img/copper-480.webp" alt="" width="800" height="1448" loading="lazy" decoding="async"><figcaption>Hasil asli di Moosh</figcaption></figure>
          <div class="lab-cap"><b id="col-name">${esc(c.colors[0].name)}</b><span id="col-note">${esc(c.colors[0].note)}</span></div>
        </div>
        <div>
          <p class="lede lede-flush">Semua warna di bawah sudah pernah kami kerjakan di salon. Pilih satu untuk melihat pratinjaunya, lalu konsultasikan dengan kami.</p>
          <div class="swatches" role="group" aria-label="Pilihan warna">
            ${c.colors.map((col, i) => `<button class="swatch" type="button" data-i="${i}" aria-pressed="${i === 0}"><i data-hex="${attr(col.hex)}"></i>${esc(col.name)}</button>`).join('\n            ')}
          </div>
          <blockquote class="quote" id="quote" hidden><p id="quote-text"></p><footer id="quote-by"></footer></blockquote>
          <a class="btn btn-wa" id="col-wa" href="${attr(waGeneral)}" ${ext}>${icon.wa}Konsultasi warna ini</a>
        </div>
      </div>
    </div>
  </section>

  <section class="ladies" id="ladies" aria-labelledby="ladies-h">
    <div class="ribbon" aria-hidden="true"><div class="ribbon-track">${'<span>Ladies only</span><span>Khusus perempuan</span><span>Lepas hijab dengan tenang</span><span>Me-time kamu</span>'.repeat(4)}</div></div>
    <div class="wrap ladies-grid">
      <div class="collage" aria-hidden="true">
        <div class="arch arch-a">${picture('salon-interior', '', { sizes: '(max-width: 700px) 70vw, 340px' })}</div>
        <div class="arch arch-b">${picture('copper', '', { sizes: '200px' })}</div>
        <div class="arch arch-c">${picture('blonde-ash', '', { sizes: '200px' })}</div>
        <div class="seal"><span class="script">Ladies</span><small>ONLY · SINCE ${esc(b.since)}</small></div>
      </div>
      <div class="ladies-copy">
        <p class="eyebrow">Ladies only</p>
        <h2 id="ladies-h">Lepas hijab, <span class="script">lepas penat.</span></h2>
        <p class="lede">Di Moosh, semua pelanggannya perempuan. Jadi kamu bisa melepas hijab, bersandar, dan menikmati me-time tanpa rasa canggung. Datang kusut, pulang dengan rambut yang bikin percaya diri.</p>
        <ul class="promises">
          <li>${icon.door}<div><b>Khusus pelanggan perempuan</b><span>Tidak ada pelanggan laki-laki yang masuk ke ruang salon.</span></div></li>
          <li>${icon.heart}<div><b>Tenang dan tanpa buru-buru</b><span>Booking dulu lewat WhatsApp, kursimu sudah siap saat kamu datang.</span></div></li>
          <li>${icon.spark}<div><b>Terlatih di L'Oréal &amp; Matrix</b><span>Tim kami ikut L'Oréal Bootcamp dan Matrix MDay 2024.</span></div></li>
        </ul>
        <dl class="stats">
          <div><dt>Tahun merawat rambut</dt><dd>${esc(years)}</dd></div>
          <div><dt>Pengikut Instagram</dt><dd>${esc(b.instagramFollowers)}</dd></div>
          <div><dt>Hasil kerja diunggah</dt><dd>${esc(b.instagramPosts)}</dd></div>
        </dl>
        <a class="btn" href="#booking">Booking me-time kamu</a>
      </div>
    </div>
  </section>

  <section class="promo-sec" aria-labelledby="promo-h">
    <div class="wrap">
      <div class="promo reveal">
        <div>
          <p class="eyebrow">${p.active ? 'Promo bulan ini' : 'Promo terakhir'} · ${esc(p.label)}</p>
          <p class="promo-big" id="promo-h">${esc(p.price)}<small>${esc(p.priceNote)}</small></p>
        </div>
        <div>
          <ul class="combos">${p.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
          <p class="promo-note">${p.active ? esc(p.terms) : `Promo ini sudah berakhir. ${esc(p.inactiveText)}`}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="light" id="booking" aria-labelledby="booking-h">
    <div class="wrap book">
      <div>
        <p class="eyebrow">Booking</p>
        <h2 id="booking-h">Pesan jadwalmu <span class="script">sekarang.</span></h2>
        <p class="lede">Isi form ini dan pesannya langsung terbuka di WhatsApp. Kami konfirmasi jadwal dan harga lewat chat.</p>
        <dl class="visit">
          <div><dt>${icon.pin}Alamat</dt><dd>${esc(b.address)}, ${esc(b.city)}<br><a href="${attr(b.mapsUrl)}" ${ext}>Buka di Google Maps →</a></dd></div>
          <div><dt>${icon.clock}Jam buka</dt><dd>${esc(b.hours.label)}</dd></div>
          <div><dt>${icon.wa}WhatsApp</dt><dd><a id="wa-num" href="${attr(waGeneral)}" ${ext}>${esc(b.whatsappDisplay)}</a> <button class="copy" type="button" id="copy-num" data-copy="0${attr(b.whatsapp.slice(2))}">Salin</button><br><small>${esc(b.whatsappNote)}</small></dd></div>
          <div><dt>${icon.ig}Instagram</dt><dd><a href="${attr(igLink(b.instagram))}" ${ext}>@${esc(b.instagram)}</a></dd></div>
        </dl>
      </div>
      <form class="form" id="book-form" novalidate>
        <div class="form-head"><h3>Form booking</h3><p>Butuh ±1 menit</p></div>
        <div class="fields">
          <div class="field span-2">
            <label for="f-name">Nama</label>
            <input type="text" id="f-name" name="name" autocomplete="given-name" maxlength="60" required placeholder="Nama kamu">
            <p class="err" id="e-name" hidden>Isi nama kamu dulu ya.</p>
          </div>
          <div class="field">
            <label for="f-svc">Layanan</label>
            <select id="f-svc" name="service">${c.booking.services.map((x) => `<option>${esc(x)}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="f-len">Panjang rambut</label>
            <select id="f-len" name="length"><option>Pendek</option><option selected>Sebahu</option><option>Panjang</option></select>
          </div>
          <div class="field">
            <label for="f-date">Tanggal</label>
            <input type="date" id="f-date" name="date" required>
            <p class="err" id="e-date" hidden>Pilih tanggal hari ini atau setelahnya.</p>
          </div>
          <div class="field">
            <label for="f-time">Jam</label>
            <select id="f-time" name="time">${c.booking.slots.map((x, i) => `<option${i === 1 ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
          </div>
          <div class="field span-2">
            <label for="f-note">Catatan <span class="opt">(opsional)</span></label>
            <textarea id="f-note" name="note" maxlength="300" rows="3" placeholder="Misal: rambut pernah di-bleaching"></textarea>
          </div>
        </div>
        <div class="form-foot">
          <p class="form-hint">Jam ${esc(b.hours.label)} · Kami balas secepatnya di jam kerja.</p>
          <button class="btn btn-wa btn-block" type="submit">${icon.wa}Kirim booking ke WhatsApp</button>
          <div class="form-ok" id="form-ok" role="status" hidden>
            <b>Pesan booking sudah siap ✓</b>
            <span>WhatsApp sudah terbuka dengan pesanmu. Tinggal tekan kirim, lalu kami konfirmasi jadwalnya.</span>
            <a id="form-ok-link" href="${attr(waGeneral)}" ${ext}>WhatsApp tidak terbuka? Klik di sini →</a>
          </div>
        </div>
      </form>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <p class="foot-logo">Moosh<span>HAIR STUDIO</span></p>
    <div class="foot-cols">
      <p>Salon khusus perempuan<br>${esc(b.city)} · sejak ${esc(b.since)}</p>
      <p>${esc(b.address)}<br>${esc(b.city)}, ${esc(b.region)}</p>
      <p>WhatsApp <a href="${attr(waGeneral)}" ${ext}>${esc(b.whatsappDisplay)}</a><br>Instagram <a href="${attr(igLink(b.instagram))}" ${ext}>@${esc(b.instagram)}</a></p>
    </div>
    <nav class="foot-nav" aria-label="Menu footer"><a href="#rumus">Rumus rambut</a><a href="#hasil">Hasil</a><a href="#warna">Warna</a><a href="#ladies">Ladies only</a><a href="#booking">Booking</a><a href="${attr(igLink(b.instagram))}" ${ext}>Instagram</a><a href="${attr(b.mapsUrl)}" ${ext}>Google Maps</a></nav>
    <p class="foot-copy">© ${new Date().getFullYear()} ${esc(b.name)}. Semua hak dilindungi.</p>
  </div>
</footer>

<a class="fab" href="${attr(waGeneral)}" ${ext} aria-label="Chat WhatsApp">${icon.wa}<span>Chat kami</span></a>
</body>
</html>
`;
}
