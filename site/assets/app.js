/* ShaPop — langue, rendu des textes, animations */
(function () {
  'use strict';
  var T = window.SP_T || {};
  var LANGS = [
    { code: 'en', name: 'English', dir: 'ltr', flag: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="fgb"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#fgb)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>' },
    { code: 'fr', name: 'Français', dir: 'ltr', flag: '<svg viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true"><path fill="#002654" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#CE1126" d="M2 0h1v2H2z"/></svg>' },
    { code: 'es', name: 'Español', dir: 'ltr', flag: '<svg viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true"><path fill="#AA151B" d="M0 0h3v2H0z"/><path fill="#F1BF00" d="M0 .5h3v1H0z"/></svg>' },
    { code: 'ru', name: 'Русский', dir: 'ltr', flag: '<svg viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true"><path fill="#fff" d="M0 0h3v.67H0z"/><path fill="#0039A6" d="M0 .67h3v.67H0z"/><path fill="#D52B1E" d="M0 1.33h3V2H0z"/></svg>' },
    { code: 'he', name: 'עברית', dir: 'rtl', flag: '<svg viewBox="0 0 220 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="#fff" d="M0 0h220v160H0z"/><path fill="#0038B8" d="M0 15h220v25H0zM0 120h220v25H0z"/><g fill="none" stroke="#0038B8" stroke-width="5.5"><path d="M110 48l28 48H82z"/><path d="M110 112L82 64h56z"/></g></svg>' }
  ];
  var BY = {}; LANGS.forEach(function (l) { BY[l.code] = l; });
  var KEY = 'shapop-lang';

  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function detect() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (q && BY[q]) { store(q); return q; }
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    if (s && BY[s]) return s;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i]).toLowerCase().split('-')[0];
      if (c === 'iw') c = 'he';
      if (BY[c]) return c;
    }
    return 'en';
  }

  var lang = detect();
  var page = document.body.getAttribute('data-page') || 'home';

  function get(key, l) {
    var d = T[l || lang] || T.en, parts = key.split('.'), v = d;
    for (var i = 0; i < parts.length; i++) { v = v == null ? v : v[parts[i]]; }
    if (v == null && (l || lang) !== 'en') return get(key, 'en');
    return v;
  }
  var MAIL = '<a class="email" href="mailto:support@shapop.app">support@shapop.app</a>';
  var OP = '<bdi dir="ltr">Benjamin Franklin Charles TAIEB, entrepreneur individuel (SIRET 528 074 370 00032, 11 rue Jacques Duchesne, 75019 Paris, France)</bdi>';
  function fill(s) { return typeof s === 'string' ? s.replace(/\{mail\}/g, MAIL).replace(/\{op\}/g, OP) : s; }

  /* monnaie selon la langue (₪ en hébreu, $ en anglais, € ailleurs) */
  var CUR = { he: { start: 340, step: 20, buy: 520, ai: [180, 260] }, def: { start: 90, step: 5, buy: 140, ai: [45, 70] } };
  function cur() { return lang === 'he' ? CUR.he : CUR.def; }
  function money(n) {
    if (lang === 'he') return n + ' ₪';
    if (lang === 'en') return '$' + n;
    return n + ' €';
  }

  function renderFaq(el, items) {
    el.innerHTML = '';
    (items || []).forEach(function (it) {
      var d = document.createElement('details');
      var s = document.createElement('summary'); s.innerHTML = it[0];
      var a = document.createElement('div'); a.className = 'a';
      a.innerHTML = '<p>' + fill(it[1]).split('\n').join('</p><p>') + '</p>';
      d.appendChild(s); d.appendChild(a); el.appendChild(d);
    });
  }

  function renderLegal(el, data) {
    var toc = '<ul class="legal-toc">', body = '';
    data.sections.forEach(function (s, i) {
      var id = 's' + (i + 1);
      toc += '<li><a href="#' + id + '">' + (i + 1) + '. ' + s[0] + '</a></li>';
      body += '<h2 id="' + id + '"><span class="n">' + (i + 1) + '.</span> ' + s[0] + '</h2>' + fill(s[1]);
    });
    el.innerHTML = toc + '</ul>' + body;
  }

  function apply() {
    var L = BY[lang];
    var root = document.documentElement;
    root.lang = lang; root.dir = L.dir;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.innerHTML = fill(v);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-aria')); if (v) el.setAttribute('aria-label', v.replace(/<[^>]+>/g, ''));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-ph')); if (typeof v === 'string') el.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-faq]').forEach(function (el) { renderFaq(el, get(el.getAttribute('data-faq'))); });
    document.querySelectorAll('[data-legal]').forEach(function (el) { renderLegal(el, get(el.getAttribute('data-legal'))); });
    document.querySelectorAll('[data-list]').forEach(function (el) {
      var arr = get(el.getAttribute('data-list')) || [];
      var html = arr.map(function (x) { return '<span>' + x + '</span>'; }).join('');
      el.innerHTML = html + html; /* doublé pour le défilement continu */
    });
    document.querySelectorAll('[data-money]').forEach(function (el) {
      var c = cur(), k = el.getAttribute('data-money');
      el.textContent = k === 'ai' ? money(c.ai[0]) + ' – ' + money(c.ai[1]) : money(c[k]);
    });
    document.querySelectorAll('[data-tpl]').forEach(function (el) {
      var parts = el.getAttribute('data-tpl').split('|');
      el.textContent = String(get(parts[0]) || '').replace('{p}', money(cur()[parts[1]]));
    });

    var t = get(page + '.metaTitle'); if (t) document.title = t.replace(/<[^>]+>/g, '');
    var d = get(page + '.metaDesc'); var m = document.querySelector('meta[name="description"]');
    if (d && m) m.setAttribute('content', d);

    /* bouton de langue */
    var btn = document.querySelector('.lang-btn');
    if (btn) {
      btn.querySelector('.flag').innerHTML = L.flag;
      btn.querySelector('.lang-name').textContent = L.name;
      btn.setAttribute('aria-label', (get('nav.lang') || 'Language') + ' : ' + L.name);
    }
    document.querySelectorAll('.lang-menu button').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    resetMock();
    try { document.dispatchEvent(new CustomEvent('sp:lang', { detail: lang })); } catch (e) {}
  }

  /* ---------- sélecteur de langue ---------- */
  function buildLang() {
    var wrap = document.querySelector('.lang'); if (!wrap) return;
    var btn = wrap.querySelector('.lang-btn'), menu = wrap.querySelector('.lang-menu');
    menu.innerHTML = LANGS.map(function (l) {
      return '<li><button type="button" role="menuitemradio" data-lang="' + l.code + '" lang="' + l.code + '" dir="' + l.dir + '"><span class="flag">' + l.flag.replace('id="fgb"', 'id="fgb2"').replace('url(#fgb)', 'url(#fgb2)') + '</span>' + l.name + '</button></li>';
    }).join('');
    function open(v) { menu.classList.toggle('open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(!menu.classList.contains('open')); if (menu.classList.contains('open')) { var c = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'); c && c.focus(); } });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-lang]'); if (!b) return;
      lang = b.getAttribute('data-lang'); store(lang); open(false); apply(); btn.focus();
    });
    menu.addEventListener('keydown', function (e) {
      var items = [].slice.call(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape') { open(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) open(false); });
  }

  /* ---------- maquettes animées ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bid = 0, timer = 15, nameIdx = 0;
  function resetMock() {
    bid = cur().start; timer = 15;
    var a = document.querySelector('.bid-amount'); if (a) a.textContent = money(bid);
    var b = document.querySelector('.b1'); if (b) b.textContent = String(get('mock.bid')).replace('{p}', money(bid + cur().step));
    var chat = document.querySelector('.chat');
    if (chat) {
      var n = get('mock.names') || [];
      chat.innerHTML = '<div class="msg"><b>' + n[0] + '</b>' + get('mock.m1') + '</div><div class="msg"><b>' + get('mock.sellerName') + '</b>' + get('mock.m2') + '</div>';
    }
  }
  function tickBid() {
    var c = cur();
    bid += c.step; if (bid > c.buy - c.step) bid = c.start;
    timer = 15;
    var a = document.querySelector('.bid-amount');
    if (a) { a.textContent = money(bid); a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); }
    var b = document.querySelector('.b1'); if (b) b.textContent = String(get('mock.bid')).replace('{p}', money(bid + c.step));
    var chat = document.querySelector('.chat');
    if (chat) {
      var n = get('mock.names') || ['A'];
      nameIdx = (nameIdx + 1) % n.length;
      var m = document.createElement('div'); m.className = 'msg bid';
      m.innerHTML = '<b>' + n[nameIdx] + '</b>' + money(bid) + ' 🔥';
      chat.appendChild(m);
      while (chat.children.length > 4) chat.removeChild(chat.firstChild);
    }
  }
  function startLive() {
    if (!document.querySelector('.bid-amount') || reduce) return;
    setInterval(tickBid, 2800);
    setInterval(function () {
      timer = timer > 1 ? timer - 1 : 15;
      var el = document.querySelector('.timer b'); if (el) el.textContent = '0:' + (timer < 10 ? '0' : '') + timer;
    }, 1000);
  }

  function codeLoop(box) {
    var spans = box.querySelectorAll('.digits span'), st = box.querySelector('.status');
    var digits = ['4', '8', '2', '7'];
    function run() {
      spans.forEach(function (s) { s.textContent = '•'; s.classList.add('empty'); s.classList.remove('on'); });
      st.className = 'status locked'; st.querySelector('[data-i18n]').innerHTML = get('code.locked');
      st.querySelector('use').setAttribute('href', '/assets/icons.svg#lock');
      spans.forEach(function (s, i) {
        setTimeout(function () { s.textContent = digits[i]; s.classList.remove('empty'); s.classList.add('on'); }, 700 + i * 450);
      });
      setTimeout(function () {
        st.className = 'status paid'; st.querySelector('[data-i18n]').innerHTML = get('code.paid');
        st.querySelector('use').setAttribute('href', '/assets/icons.svg#check');
      }, 3200);
    }
    run(); setInterval(run, 7000);
  }
  function proofLoop(box) {
    var p = box.querySelectorAll('.proof'), btn = box.querySelector('.send-btn [data-i18n]');
    function run() {
      p.forEach(function (x) { x.classList.remove('done'); });
      btn.innerHTML = get('proof.send');
      setTimeout(function () { p[0].classList.add('done'); }, 900);
      setTimeout(function () { p[1].classList.add('done'); }, 1900);
      setTimeout(function () { btn.innerHTML = get('proof.sent'); }, 3000);
    }
    run(); setInterval(run, 7000);
  }

  /* ---------- apparition au défilement ---------- */
  function reveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (e) { io.observe(e); });
    var once = {};
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.getAttribute('data-anim');
        if (en.isIntersecting && !once[id]) { once[id] = 1; id === 'code' ? codeLoop(en.target) : proofLoop(en.target); }
      });
    }, { threshold: .3 });
    document.querySelectorAll('[data-anim]').forEach(function (e) { io2.observe(e); });
  }

  buildLang();
  apply();
  startLive();
  reveal();
  var y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
  window.SP = { setLang: function (l) { if (BY[l]) { lang = l; store(l); apply(); } }, t: function (k) { return get(k); }, lang: function () { return lang; } };
  try { document.dispatchEvent(new CustomEvent('sp:ready')); } catch (e) {}
})();
