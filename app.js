(() => {
  const root = document.documentElement;
  const body = document.body;
  const hdr = document.getElementById('hdr');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Demon på GitHub Pages: märks som demo, visas inte i sökmotorer och formuläret skickar inget
  const demo = location.hostname.endsWith('github.io');
  if (demo) {
    root.classList.add('demo');
    document.head.append(Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' }));
  }

  const go = () => root.classList.add('loaded');
  requestAnimationFrame(() => requestAnimationFrame(go));
  setTimeout(go, 400);

  // E-postadresser byggs i webbläsaren, som på originalsajten
  document.querySelectorAll('.mail').forEach(a => {
    const addr = a.dataset.u + '@' + a.dataset.d;
    a.href = 'mailto:' + addr;
    a.querySelector('.mail-t').textContent = addr;
  });

  // Meny (mobil)
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menuBtn');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    body.style.overflow = open ? 'hidden' : '';
    if (open) menu.hidden = false;
    else setTimeout(() => { if (!body.classList.contains('menu-open')) menu.hidden = true; }, 700);
  };
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false); });

  // Header: bakgrund, mörkt läge över mörka sektioner, aktiv länk
  const darks = [...document.querySelectorAll('[data-theme="dark"]')];
  const navLinks = [...document.querySelectorAll('.nav a[data-nav]')];
  const sections = navLinks.map(a => document.getElementById(a.dataset.nav));
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    const probe = hdr.offsetHeight / 2;
    hdr.classList.toggle('scrolled', y > 8);
    hdr.classList.toggle('on-dark', darks.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom >= probe;
    }));
    const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (!body.classList.contains('menu-open')) {
      if (goingDown && y > window.innerHeight * .9) hdr.classList.add('hide');
      else if (goingUp || y < 40) hdr.classList.remove('hide');
    }
    if (Math.abs(y - lastY) > 4) lastY = y;

    const mark = window.innerHeight * .4;
    let current = sections[0].id;
    sections.forEach(s => { if (s.getBoundingClientRect().top <= mark) current = s.id; });
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].id;
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === current));
  };

  // Parallax på bilder
  const plx = [...document.querySelectorAll('[data-parallax]')];
  const parallax = () => {
    const vh = window.innerHeight;
    plx.forEach(img => {
      const r = img.closest('.band').getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const amp = +img.dataset.parallax || 2;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      img.style.transform = `translate3d(0, ${(p * amp).toFixed(2)}%, 0) scale(${1 + amp * 2.2 / 100})`;
    });
  };

  let ticking = false;
  const tick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); if (!reduce) parallax(); ticking = false; });
  };
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  onScroll();
  if (!reduce) parallax();

  // Räkna upp siffror
  const countUp = el => {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    const dur = 1400, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };

  // Visa vid scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains('rv') || c.classList.contains('panel')) : [];
      const i = Math.max(0, sibs.indexOf(el));
      el.style.transitionDelay = el.classList.contains('kpi') || el.classList.contains('person') ? `${i * 90}ms` : '';
      el.classList.add('in');
      el.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  document.querySelectorAll('.rv, .panel').forEach(el => io.observe(el));

  // Tooltip på intervallstaplarna
  const tip = document.getElementById('tip');
  const showTip = bar => {
    const r = bar.getBoundingClientRect();
    tip.textContent = bar.dataset.tip;
    tip.hidden = false;
    tip.style.left = `${r.left + r.width / 2}px`;
    tip.style.top = `${r.top - 18}px`;
  };
  const hideTip = () => { tip.hidden = true; };
  document.querySelectorAll('.rc-bar').forEach(bar => {
    bar.addEventListener('mouseenter', () => showTip(bar));
    bar.addEventListener('focus', () => showTip(bar));
    bar.addEventListener('mouseleave', hideTip);
    bar.addEventListener('blur', hideTip);
  });
  window.addEventListener('scroll', hideTip, { passive: true });

  // Formulär
  const form = document.getElementById('leadForm');
  const ranges = { 'Hotell': [20, 100], 'Fastighet/er': [15, 200] };
  const pris = document.getElementById('pris');
  const prisOut = document.getElementById('prisOut');
  const fPrice = document.getElementById('fPrice');
  const fBand = document.getElementById('fBand');
  const fMatch = document.getElementById('fMatch');
  const fMatchT = document.getElementById('fMatchT');
  const fError = document.getElementById('fError');
  const fDone = document.getElementById('fDone');
  const typ = () => form.querySelector('input[name="typ"]:checked').value;

  const updatePrice = () => {
    const t = typ();
    const v = +pris.value;
    fPrice.hidden = t === 'Samarbetspartner';
    pris.disabled = fPrice.hidden;
    prisOut.textContent = (v >= +pris.max ? v + '+' : v) + ' MSEK';
    const r = ranges[t];
    fMatch.hidden = !r;
    fBand.style.setProperty('--a', r ? r[0] : 0);
    fBand.style.setProperty('--b', r ? r[1] : 0);
    if (r) {
      fMatchT.textContent = `${t}: ${r[0]}-${r[1]} MSEK`;
      fMatch.classList.toggle('ok', v >= r[0] && v <= r[1]);
    }
  };
  pris.addEventListener('input', updatePrice);
  form.querySelectorAll('input[name="typ"]').forEach(r => r.addEventListener('change', updatePrice));
  updatePrice();

  // Nyckeltalen öppnar formuläret med rätt ärende ifyllt
  document.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="typ"][value="${a.dataset.pick}"]`);
    if (!r) return;
    r.checked = true;
    const [lo, hi] = ranges[a.dataset.pick];
    pris.value = Math.round((lo + hi) / 2 / 5) * 5;
    updatePrice();
  }));

  const showDone = () => {
    form.hidden = true;
    fDone.hidden = false;
    fDone.focus({ preventScroll: true });
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (demo) { showDone(); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    fError.hidden = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new URLSearchParams(new FormData(form))
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(res.status);
      showDone();
    } catch (err) {
      fError.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  // Utan JavaScript skickas formuläret vanligt och sidan laddas om med ?skickat=1
  if (new URLSearchParams(location.search).has('skickat')) showDone();

  // Spara kontakt (vCard)
  document.querySelectorAll('.vcf').forEach(b => b.addEventListener('click', () => {
    const d = b.dataset;
    const [first, ...rest] = d.name.split(' ');
    const vcf = [
      'BEGIN:VCARD', 'VERSION:3.0',
      `N:${rest.join(' ')};${first};;;`, `FN:${d.name}`,
      'ORG:Agmenta Holding AB',
      `TEL;TYPE=CELL:${d.tel}`, `EMAIL;TYPE=WORK:${d.u}@${d.d}`,
      'ADR;TYPE=WORK:;;Stora Torget 7;Linköping;;582 19;Sverige',
      'URL:https://agmenta.se/', 'END:VCARD'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: d.name.replace(/\s+/g, '-') + '.vcf' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));

  // Kontaktknapp i mobilen: syns efter toppen, döljs vid kontaktdelen
  const fab = document.getElementById('fab');
  const hero = document.getElementById('hem');
  const contact = document.getElementById('kontakt');
  const fabUpdate = () => {
    const pastHero = hero.getBoundingClientRect().bottom < window.innerHeight * .4;
    const atContact = contact.getBoundingClientRect().top < window.innerHeight * .9;
    fab.classList.toggle('show', pastHero && !atContact && !body.classList.contains('menu-open'));
  };
  window.addEventListener('scroll', fabUpdate, { passive: true });
  fabUpdate();
})();
