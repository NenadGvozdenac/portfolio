(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- Basics (always on) ---------- */

  document.getElementById('year').textContent = new Date().getFullYear();

  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  const links = [...document.querySelectorAll('.nav__links a')];
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });

  /* ---------- Auto image slider (runs without GSAP too) ---------- */
  document.querySelectorAll('[data-slider]').forEach(slider => {
    const slides = [...slider.querySelectorAll('.slide')];
    const bars = [...slider.querySelectorAll('.slider__bars i')];
    if (slides.length < 2) return;
    const DURATION = 4500;
    slider.style.setProperty('--slide-ms', DURATION + 'ms');
    let index = 0, timer = null;
    const show = i => {
      index = i;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      bars.forEach((b, k) => {
        b.classList.remove('is-active');
        b.classList.toggle('is-done', k < i);
      });
      void bars[i].offsetWidth; // restart the bar animation
      bars[i].classList.add('is-active');
    };
    const next = () => show((index + 1) % slides.length);
    const start = () => { stop(); timer = setInterval(next, DURATION); };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    show(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { show(index); start(); } });
  });

  /* ---------- Static fallback ---------- */
  const preloader = document.querySelector('.preloader');
  if (!hasGsap || reduced) {
    root.classList.remove('js');
    preloader && preloader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Split helpers ---------- */
  function splitChars(el) {
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only'; sr.textContent = text;
    el.appendChild(sr);
    const chars = [];
    words.forEach((w, i) => {
      const ws = document.createElement('span');
      ws.className = 'w'; ws.setAttribute('aria-hidden', 'true');
      [...w].forEach(ch => {
        const c = document.createElement('span');
        c.className = 'c'; c.textContent = ch;
        ws.appendChild(c); chars.push(c);
      });
      el.appendChild(ws);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return chars;
  }

  function splitWords(el) {
    const out = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
    return out;
  }

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = id === '#top' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
      });
    });
  }

  /* ---------- Hero intro ---------- */
  const nameEl = document.querySelector('.hero__name');
  const roleEl = document.querySelector('.hero__role');
  const nameChars = splitChars(nameEl);
  const roleWords = splitWords(roleEl);
  gsap.set(nameChars, { yPercent: 115, rotate: 8 });
  gsap.set(roleWords, { yPercent: 110 });
  gsap.set([nameEl, roleEl], { visibility: 'visible' });

  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .to(nameChars, { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.04 }, 0)
    .to(roleWords, { yPercent: 0, duration: 1.1, stagger: 0.035 }, 0.35)
    .fromTo('.intro', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.5);

  /* ---------- Preloader ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('ng-seen') === '1'; sessionStorage.setItem('ng-seen', '1'); } catch (e) {}

  if (seen) {
    preloader.remove();
    intro.play();
  } else {
    lenis && lenis.stop();
    const countEl = document.getElementById('count');
    const counter = { v: 0 };
    gsap.timeline({ onComplete: () => { preloader.remove(); lenis && lenis.start(); } })
      .to(counter, { v: 100, duration: 1.8, ease: 'power3.inOut', onUpdate: () => { countEl.textContent = Math.round(counter.v); } }, 0)
      .to('.preloader__bar', { scaleX: 1, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=0.15')
      .add(() => intro.play(), '-=0.6');
  }

  /* ---------- Hero: proximity weight on name ---------- */
  let mx = -9999, my = -9999;
  window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  let heroVisible = true;
  ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: s => { heroVisible = s.isActive; } });

  if (finePointer) {
    nameChars.forEach(c => { c._w = 500; });
    gsap.ticker.add(() => {
      if (!heroVisible) return;
      nameChars.forEach(c => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        const target = 500 + 300 * Math.max(0, 1 - d / 320);
        c._w += (target - c._w) * 0.12;
        c.style.fontWeight = c._w.toFixed(0);
      });
    });
  }

  /* ---------- Hero: interactive dot field ---------- */
  const canvas = document.querySelector('.hero__canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dots = [], inkColor = '#000', accentColor = '#00f';
  const GAP = 28;
  const readColors = () => {
    const cs = getComputedStyle(root);
    inkColor = cs.getPropertyValue('--ink').trim();
    accentColor = cs.getPropertyValue('--accent').trim();
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) dots.push({ x, y, ox: 0, oy: 0 });
  };
  readColors(); resize();
  window.addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });

  gsap.ticker.add(time => {
    if (!heroVisible) return;
    const r = canvas.getBoundingClientRect();
    const lx = mx - r.left, ly = my - r.top;
    const t = time * 1000;
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      const dx = d.x - lx, dy = d.y - ly;
      const dist = Math.hypot(dx, dy) || 1;
      const f = Math.max(0, 1 - dist / 200);
      const push = f * f * 36;
      d.ox += ((dx / dist) * push - d.ox) * 0.12;
      d.oy += ((dy / dist) * push - d.oy) * 0.12;
      const wave = Math.sin(d.x * 0.011 + t * 0.0011) * Math.cos(d.y * 0.013 + t * 0.0008);
      const size = 1 + f * 2.4 + wave * 0.35;
      ctx.globalAlpha = Math.min(1, 0.13 + wave * 0.06 + f * 0.75);
      ctx.fillStyle = f > 0.04 ? accentColor : inkColor;
      ctx.fillRect(d.x + d.ox - size / 2, d.y + d.oy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  });

  /* ---------- Hero: scroll out ---------- */
  gsap.to('.hero__inner', {
    yPercent: 18, autoAlpha: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to(canvas, {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- Scroll progress ---------- */
  gsap.to('.nav__progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* ---------- Marquee (constant speed) ---------- */
  const track = document.querySelector('.marquee__track');
  const groups = track.getElementsByClassName('marquee__group');
  // Keep enough copies so the strip always covers the viewport plus one loop width.
  const fillMarquee = () => {
    const w = groups[0].offsetWidth;
    if (!w) return;
    while (groups.length * w < window.innerWidth + w * 2) {
      const clone = groups[0].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
  };
  fillMarquee();
  window.addEventListener('resize', fillMarquee);
  document.fonts && document.fonts.ready.then(fillMarquee);
  let mqX = 0;
  gsap.ticker.add((time, delta) => {
    mqX -= 0.06 * delta;
    const w = groups[0].offsetWidth;
    if (mqX <= -w) mqX += w;
    track.style.transform = `translate3d(${mqX}px,0,0)`;
  });

  /* ---------- Headings: word mask reveal ---------- */
  document.querySelectorAll('[data-split]').forEach(el => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.3, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---------- About lead: scrubbed word highlight ---------- */
  document.querySelectorAll('[data-scrub]').forEach(el => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.12 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  /* ---------- Fade ups ---------- */
  document.querySelectorAll('[data-fade]').forEach(el => {
    gsap.from(el, {
      y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  /* ---------- Project media: gentle parallax only ---------- */
  document.querySelectorAll('.project__media').forEach(m => {
    const img = m.querySelector(':scope > img');
    if (!img) return;
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- Timeline rows ---------- */
  document.querySelectorAll('.role').forEach(row => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%' } });
    tl.from(row.querySelector('.role__line'), { scaleX: 0, duration: 1.4, ease: 'expo.inOut' })
      .from(row.querySelectorAll('.role__date, h3, p, .clients li'), { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.25);
  });

  /* ---------- List items ---------- */
  document.querySelectorAll('.list').forEach(list => {
    gsap.from(list.children, {
      x: -16, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: list, start: 'top 90%' }
    });
  });

  /* ---------- Footer giant name ---------- */
  const footName = document.querySelector('.footer__name');
  const footChars = splitChars(footName);
  gsap.from(footChars, {
    yPercent: 100, ease: 'none', stagger: 0.04,
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  /* ---------- Text scramble ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+';
  const scramble = el => {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    let frame = 0;
    const total = 22;
    const run = () => {
      el.textContent = [...final].map((ch, i) => {
        if (ch === ' ' || frame / total > i / final.length + 0.35) return ch;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      if (frame++ < total) requestAnimationFrame(run); else el.textContent = final;
    };
    run();
  };
  document.querySelectorAll('[data-scramble]').forEach(el => {
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scramble(el) });
    el.addEventListener('mouseenter', () => scramble(el));
  });

  /* ---------- Magnetic elements ---------- */
  if (finePointer) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.35)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.35)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Custom cursor ---------- */
  if (finePointer) {
    document.body.classList.add('has-cursor');
    const dot = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor-ring');
    const label = ring.querySelector('span');
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    window.addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', () => { dot.classList.add('is-hidden'); ring.classList.add('is-hidden'); });
    document.addEventListener('pointerenter', () => { dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden'); });

    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('pointerenter', () => { label.textContent = el.dataset.cursor; ring.classList.add('is-label'); dot.classList.add('is-hidden'); });
      el.addEventListener('pointerleave', () => { ring.classList.remove('is-label'); dot.classList.remove('is-hidden'); });
    });
    document.querySelectorAll('a:not([data-cursor]), button').forEach(el => {
      el.addEventListener('pointerenter', () => ring.classList.add('is-link'));
      el.addEventListener('pointerleave', () => ring.classList.remove('is-link'));
    });
  }

  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
