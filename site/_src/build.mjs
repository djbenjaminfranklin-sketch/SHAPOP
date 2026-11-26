// Génère les pages HTML du site ShaPop (texte anglais pré-rempli, traduit ensuite par assets/app.js).
// Lancer : node _src/build.mjs   (depuis le dossier site)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: { SP_T: {} } };
for (const f of ['i18n-en-fr.js', 'i18n-es-ru-he.js', 'i18n-delete.js', 'legal-en-fr.js', 'legal-es-ru-he.js', 'i18n-legal-rules.js', 'i18n-join.js', 'i18n-home-rules.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), ctx);
}
const EN = ctx.window.SP_T.en;
const STORE_URL = 'https://apps.apple.com/app/id6759213156';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.shapop.app';
const SITE = 'https://shapop.app';
const MAIL = '<a class="email" href="mailto:support@shapop.app">support@shapop.app</a>';

const get = (k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), EN);
const OP = '<bdi dir="ltr">Benjamin Franklin Charles TAIEB, entrepreneur individuel (SIRET 528 074 370 00032, 11 rue Jacques Duchesne, 75019 Paris, France)</bdi>';
const fill = (s) => String(s).replace(/\{mail\}/g, MAIL).replace(/\{op\}/g, OP);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const strip = (s) => String(s).replace(/<[^>]+>/g, '');
// élément traduit
const t = (tag, key, attrs = '') => `<${tag} data-i18n="${key}"${attrs ? ' ' + attrs : ''}>${fill(get(key))}</${tag}>`;
const ico = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="/assets/icons.svg#${id}"/></svg>`;

const playstore = () => `<a class="playstore" href="${PLAY_URL}" target="_blank" rel="noopener" data-i18n-aria="cta2.gpAria" aria-label="${esc(get('cta2.gpAria'))}">${ico('play')}<span>${t('small', 'cta2.gpSmall')}<b>Google Play</b></span></a>`;
const stores = () => `<div class="stores">${appstore()}${playstore()}</div>`;
const appstore = (extra = '') => `<a class="appstore${extra}" href="${STORE_URL}" target="_blank" rel="noopener" data-i18n-aria="store.aria" aria-label="${esc(get('store.aria'))}">${ico('apple')}<span>${t('small', 'store.small')}<b>App Store</b></span></a>`;

const sVideo = () => `<video class="s-video" src="/assets/hero-s.mp4" poster="/assets/hero-poster.webp" autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1"></video>`;

function head(page, { title, desc, pathName }) {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(strip(title))}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#04070A">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${SITE}${pathName}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta name="apple-itunes-app" content="app-id=6759213156">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ShaPop">
<meta property="og:title" content="${esc(strip(title))}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${pathName}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ShaPop — live shopping &amp; auctions">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/assets/og-image.png">
<script>(function(){var L={en:1,fr:1,es:1,ru:1,he:1},l=null,d=document.documentElement;try{l=new URLSearchParams(location.search).get('lang')}catch(e){}if(!L[l]){try{l=localStorage.getItem('shapop-lang')}catch(e){}}if(!L[l]){l=null;var a=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en'];for(var i=0;i<a.length;i++){var c=String(a[i]).toLowerCase().split('-')[0];if(c==='iw')c='he';if(L[c]){l=c;break}}}if(!L[l])l='en';d.lang=l;d.dir=l==='he'?'rtl':'ltr';d.className+=' js'})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Heebo:wght@400;500;700;800;900&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=13">
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>`;
}

function header(active) {
  const a = (href, key, name) => `<a href="${href}"${active === name ? ' aria-current="page"' : ''} data-i18n="${key}">${get(key)}</a>`;
  return `
<header class="header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="ShaPop"><img src="/assets/logo.webp" width="760" height="356" alt="ShaPop"></a>
    <nav class="nav" aria-label="Main">
      ${a('/#how', 'nav.how', 'how')}
      ${a('/#protect', 'nav.protect', 'protect')}
      ${a('/#faq', 'nav.faq', 'faq')}
      ${a('/support', 'nav.support', 'support')}
    </nav>
    <div class="header-tools">
      <div class="lang">
        <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Language"><span class="flag"></span><span class="lang-name">English</span><svg class="ico chev" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
        <ul class="lang-menu" role="menu"></ul>
      </div>
      <a class="hbtn buy" href="/buy"${active === 'buy' ? ' aria-current="page"' : ''}><span class="long" data-i18n="cta2.buy">${get('cta2.buy')}</span><span class="short" data-i18n="cta2.buyShort">${get('cta2.buyShort')}</span></a>
      <a class="hbtn sell" href="/sell"${active === 'sell' ? ' aria-current="page"' : ''}><span class="long" data-i18n="cta2.sell">${get('cta2.sell')}</span><span class="short" data-i18n="cta2.sellShort">${get('cta2.sellShort')}</span></a>
    </div>
  </div>
</header>`;
}

function footer(legal = false, extra = '') {
  return `
<footer class="footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <img src="/assets/logo.webp" width="760" height="356" alt="ShaPop" loading="lazy">
        ${t('p', 'foot.tag')}
        ${stores()}
      </div>
      <div>
        ${t('h4', 'foot.app')}
        <ul>
          <li><a href="/#how" data-i18n="nav.how">${get('nav.how')}</a></li>
          <li><a href="/#protect" data-i18n="nav.protect">${get('nav.protect')}</a></li>
          <li><a href="/#faq" data-i18n="nav.faq">${get('nav.faq')}</a></li>
          <li><a href="/sell" data-i18n="cta2.sell">${get('cta2.sell')}</a></li>
          <li><a href="/buy" data-i18n="cta2.buy">${get('cta2.buy')}</a></li>
        </ul>
      </div>
      <div>
        ${t('h4', 'foot.help')}
        <ul>
          <li><a href="/rules" data-i18n="foot.rules">${get('foot.rules')}</a></li>
          <li><a href="/support" data-i18n="foot.support">${get('foot.support')}</a></li>
          <li><a href="/privacy" data-i18n="foot.privacy">${get('foot.privacy')}</a></li>
          <li><a href="/terms" data-i18n="foot.terms">${get('foot.terms')}</a></li>
          <li><a href="/delete-account" data-i18n="foot.del">${get('foot.del')}</a></li>
          <li><a href="/legal" data-i18n="foot.mentions">${get('foot.mentions')}</a></li>
          <li><a class="email" href="mailto:support@shapop.app">support@shapop.app</a></li>
        </ul>
      </div>
    </div>
    <div class="bottom"><span>© <span data-year>2026</span> ShaPop. <span data-i18n="foot.rights">${get('foot.rights')}</span></span><span class="email">shapop.app</span></div>
    <p class="legal-line" data-i18n="foot.legalLine" style="margin:14px 0 0;font-size:13px;opacity:.75;line-height:1.5">${fill(get('foot.legalLine'))}</p>
  </div>
</footer>
<script src="/assets/i18n-en-fr.js?v=7"></script>
<script src="/assets/i18n-es-ru-he.js?v=7"></script>
<script src="/assets/i18n-delete.js?v=7"></script>
<script src="/assets/i18n-legal-rules.js?v=9"></script>
<script src="/assets/i18n-join.js?v=2"></script>
<script src="/assets/i18n-home-rules.js?v=1"></script>
${legal ? '<script src="/assets/legal-en-fr.js?v=8"></script>\n<script src="/assets/legal-es-ru-he.js?v=8"></script>\n' : ''}<script src="/assets/app.js?v=10"></script>${extra}
</body>
</html>
`;
}

const faqHtml = (items) => items.map(([q, a]) => `<details><summary>${q}</summary><div class="a"><p>${fill(a)}</p></div></details>`).join('');

/* ------------------------------ ACCUEIL ------------------------------ */
function home() {
  const step = (n, icon, extra = '', d = '') => `<li class="step reveal${d}"><div class="tile">${ico(icon)}</div>${t('h3', `buy.s${n}h`)}${t('p', `buy.s${n}p`)}${extra}</li>`;
  const pay = `<div class="pay-logos">${t('span', 'pay.card')}<span>Apple Pay</span></div>`;
  const sitem = (n, icon) => `<li class="seller-item reveal">${'<div class="tile">' + ico(icon) + '</div>'}<div>${t('h3', `sell.s${n}h`)}${t('p', `sell.s${n}p`)}</div></li>`;
  const flow = (n, icon) => `<li class="reveal d${n - 1 || ''}"><div class="tile">${ico(icon)}</div><div>${t('b', `prot.f${n}b`)}${t('small', `prot.f${n}s`)}</div></li>`;
  const check = (k) => `<li>${ico('check')}${t('span', k)}</li>`;
  const perk = (n, icon, d) => `<div class="perk reveal${d}"><div class="tile">${ico(icon)}</div>${t('h3', `perks.p${n}h`)}${t('p', `perks.p${n}p`)}</div>`;
  const cats = get('cats').map((c) => `<span>${c}</span>`).join('');
  const shot = (n, img, d = '') => `<li class="shot reveal${d}"><div class="phone"><div class="screen"><img class="shot-img" src="/assets/shots/${img}.webp" width="600" height="1304" alt="" loading="lazy"></div></div><span class="num">0${n}</span>${t('h3', `how2.s${n}h`)}${t('p', `how2.s${n}p`)}</li>`;

  return head('home', { title: get('home.metaTitle'), desc: get('home.metaDesc'), pathName: '/' }) + header('') + `
<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-text reveal in">
        <img class="hero-logo" src="/assets/logo.webp" width="760" height="356" alt="ShaPop">
        <span class="pill">${ico('globe')}<span data-i18n="hero.badge">${get('hero.badge')}</span></span>
        ${t('h1', 'hero.title')}
        ${t('p', 'hero.lead', 'class="lead"')}
        <div class="hero-cta">
          <a class="btn-neon btn-xl" href="/sell">${ico('store')}${t('span', 'cta2.sell')}</a>
          <a class="btn-line btn-xl" href="/buy">${ico('gavel')}${t('span', 'cta2.buy')}</a>
        </div>
        ${stores()}
        <ul class="trust">
          <li>${ico('lock')}${t('span', 'hero.t1')}</li>
          <li>${ico('card')}${t('span', 'hero.t2')}</li>
          <li>${ico('package')}${t('span', 'hero.t3')}</li>
        </ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
<div class="stage">
        ${sVideo()}
        <div class="float-chip chip-a"><span class="dot">${ico('check')}</span><span data-i18n="chip.a">${get('chip.a')}</span></div>
        <div class="float-chip chip-b"><span class="dot">${ico('shield')}</span><span data-i18n="chip.b">${get('chip.b')}</span></div>
        
        <div class="phone">
          <div class="screen live">
            <div class="live-room"><div class="lamp"></div><div class="shelf"></div><div class="product">👟</div></div>
            <div class="live-top">
              <span class="avatar" data-i18n="mock.initial">${get('mock.initial')}</span>
              <span class="who"><span data-i18n="mock.sellerName">${get('mock.sellerName')}</span><small data-i18n="mock.city">${get('mock.city')}</small></span>
              <span class="badge-live" data-i18n="mock.live">LIVE</span>
              <span class="viewers">${ico('eye')}248</span>
            </div>
            <div class="live-bottom">
              <div class="chat"></div>
              <div class="bid-card">
                <div class="bid-row"><span class="bid-title" data-i18n="mock.item">${get('mock.item')}</span><span class="timer">${ico('clock')}<b>0:15</b></span></div>
                <div class="bid-label" data-i18n="mock.cur">${get('mock.cur')}</div>
                <span class="bid-amount">$90</span>
                <div class="bid-btns"><span class="b1">Bid $95</span><span class="b2" data-tpl="mock.buy|buy">Buy $140</span></div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track" data-list="cats">${cats}${cats}</div></div>

  <section class="section buyer" id="how">
    <div class="wrap">
      <div class="center reveal">
        ${t('span', 'how2.kicker', 'class="kicker"')}
        ${t('h2', 'how2.title')}
        ${t('p', 'how2.intro', 'class="intro"')}
      </div>
      <ol class="shots">
        ${shot(1, '01-home')}${shot(2, '02-direct', ' d1')}${shot(3, '03-item', ' d2')}
        ${shot(4, '04-activity')}${shot(5, '05-sell', ' d1')}${shot(6, '06-intro', ' d2')}
      </ol>
      <div class="choose">
        <a class="reveal" href="/sell"><span class="tile">${ico('store')}</span><span>${t('b', 'cta2.sell')}${t('small', 'sellp.formIntro')}</span>${ico('arrow', 'ico flip')}</a>
        <a class="reveal d1" href="/buy"><span class="tile">${ico('gavel')}</span><span>${t('b', 'cta2.buy')}${t('small', 'buyp.formIntro')}</span>${ico('arrow', 'ico flip')}</a>
      </div>
    </div>
  </section>

  <section class="section seller" id="sell">
    <div class="wrap">
      <div>
        <div class="reveal">
          ${t('span', 'sell.kicker', 'class="kicker"')}
          ${t('h2', 'sell.title')}
          ${t('p', 'sell.intro', 'class="intro"')}
        </div>
        <ul class="seller-list">
          ${sitem(1, 'video')}
          ${sitem(2, 'sparkles')}
          ${sitem(3, 'wallet')}
        </ul>
        <div class="btn-row"><a class="btn-neon" href="/sell">${ico('store')}${t('span', 'cta2.sell')}</a></div>
      </div>
      <div class="ai-card reveal d2" aria-hidden="true">
        <div class="shot"><span class="ai-badge">${ico('sparkles')}<span data-i18n="ai.badge">${get('ai.badge')}</span></span>⌚<div class="scan"></div></div>
        <div class="ai-fields">
          <div class="ai-field"><span data-i18n="ai.f1l">${get('ai.f1l')}</span><b data-i18n="ai.f1v">${get('ai.f1v')}</b></div>
          <div class="ai-field"><span data-i18n="ai.f2l">${get('ai.f2l')}</span><b data-i18n="ai.f2v">${get('ai.f2v')}</b></div>
          <div class="ai-field"><span data-i18n="ai.f3l">${get('ai.f3l')}</span><b data-i18n="ai.f3v">${get('ai.f3v')}</b></div>
          <div class="ai-field price"><span data-i18n="ai.f4l">${get('ai.f4l')}</span><b data-money="ai">$45 – $70</b></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section protect" id="protect">
    <div class="wrap">
      <div class="center reveal">
        ${t('span', 'prot.kicker', 'class="kicker"')}
        ${t('h2', 'prot.title')}
        ${t('p', 'prot.intro', 'class="intro"')}
      </div>
      <ol class="flow">
        ${flow(1, 'card')}
        ${flow(2, 'lock')}
        ${flow(3, 'handshake')}
        ${flow(4, 'wallet')}
      </ol>

      <div class="methods">
        <article class="method reveal">
          <div>
            <span class="label">${ico('hash')}<span data-i18n="hand.label">${get('hand.label')}</span></span>
            ${t('h3', 'hand.title')}
            ${t('p', 'hand.p')}
            <ul class="checks">${check('hand.c1')}${check('hand.c2')}${check('hand.c3')}</ul>
            <p class="tip">${ico('alert')}<span data-i18n="hand.tip">${get('hand.tip')}</span></p>
          </div>
          <div class="phone" aria-hidden="true">
            <div class="screen app" data-anim="code">
              <div class="app-head">${ico('lock')}<span data-i18n="code.head">${get('code.head')}</span></div>
              <div class="order"><span class="thumb">👟</span><div><div class="t" data-i18n="mock.item">${get('mock.item')}</div><div class="s" data-tpl="code.paidAmt|start">Paid $90</div></div></div>
              <div class="code-box"><p data-i18n="code.hint">${get('code.hint')}</p><div class="digits"><span>4</span><span>8</span><span>2</span><span>7</span></div></div>
              <div class="status locked">${ico('lock')}<span data-i18n="code.locked">${get('code.locked')}</span></div>
            </div>
          </div>
        </article>

        <article class="method post reveal d1">
          <div>
            <span class="label">${ico('package')}<span data-i18n="post.label">${get('post.label')}</span></span>
            ${t('h3', 'post.title')}
            ${t('p', 'post.p')}
            <ul class="checks">${check('post.c1')}${check('post.c2')}${check('post.c3')}</ul>
          </div>
          <div class="phone" aria-hidden="true">
            <div class="screen app" data-anim="proof">
              <div class="app-head">${ico('camera')}<span data-i18n="proof.head">${get('proof.head')}</span></div>
              <div class="order"><span class="thumb">⌚</span><div><div class="t" data-i18n="ai.f1v">${get('ai.f1v')}</div><div class="s" data-tpl="code.paidAmt|start">Paid $90</div></div></div>
              <div class="proof-grid">
                <div class="proof"><span class="ok">${ico('check')}</span><div class="pic box"><span>⌚</span></div><span data-i18n="proof.box">${get('proof.box')}</span></div>
                <div class="proof"><span class="ok">${ico('check')}</span><div class="pic slip"><div class="slip-lines"><i></i><i></i><i></i><i></i></div><span class="stamp" data-i18n="proof.stamp">POST</span></div><span data-i18n="proof.slip">${get('proof.slip')}</span></div>
              </div>
              <div class="send-btn"><span data-i18n="proof.send">${get('proof.send')}</span></div>
            </div>
          </div>
        </article>
      </div>

      <div class="dispute reveal">${ico('help')}<div>${t('h3', 'disp.title')}${t('p', 'disp.p')}</div></div>
    </div>
  </section>

  <section class="section perks">
    <div class="wrap">
      <div class="center reveal">
        ${t('span', 'perks.kicker', 'class="kicker"')}
        ${t('h2', 'perks.title')}
        ${t('p', 'perks.intro', 'class="intro"')}
      </div>
      <div class="grid-perks">
        ${perk(1, 'card', '')}${perk(2, 'zap', ' d1')}${perk(3, 'clock', ' d2')}${perk(4, 'tag', ' d3')}
        ${perk(5, 'sparkles', '')}${perk(6, 'pin', ' d1')}${perk(7, 'bell', ' d2')}${perk(8, 'heart', ' d3')}
      </div>
    </div>
  </section>

  <section class="section faq" id="faq">
    <div class="wrap">
      <div class="center reveal">
        ${t('span', 'faq.kicker', 'class="kicker"')}
        ${t('h2', 'faq.title')}
      </div>
      <div class="faq-list" data-faq="faq.items">${faqHtml(get('faq.items'))}</div>
      <div class="faq-more"><a class="btn" href="/support">${t('span', 'faq.more')}${ico('arrow', 'ico flip')}</a></div>
    </div>
  </section>

  <section class="section cta">
    <div class="wrap reveal">
      ${t('h2', 'cta.title')}
      ${t('p', 'cta.p')}
      <div class="btn-row"><a class="btn-neon btn-xl" href="/sell">${ico('store')}${t('span', 'cta2.sell')}</a><a class="btn-line btn-xl" href="/buy">${ico('gavel')}${t('span', 'cta2.buy')}</a></div>
      ${stores()}
    </div>
  </section>
</main>` + footer();
}

/* ------------------------------ SUPPORT ------------------------------ */
function support() {
  const card = (n, icon) => `<div class="help-card reveal d${n - 1 || ''}"><div class="tile">${ico(icon)}</div>${t('h3', `support.h${n}h`)}${t('p', `support.h${n}p`)}</div>`;
  const group = (n) => `<div class="faq-group reveal">${t('h3', `support.g${n}`)}<div class="faq-list" data-faq="support.q${n}">${faqHtml(get(`support.q${n}`))}</div></div>`;
  return head('support', { title: get('support.metaTitle'), desc: get('support.metaDesc'), pathName: '/support' }) + header('support') + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${t('span', 'support.kicker', 'class="kicker"')}
      ${t('h1', 'support.title')}
      ${t('p', 'support.p')}
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="contact-card">
        <div class="tile">${ico('mail')}</div>
        <div>${t('h2', 'support.cardH')}${t('p', 'support.cardP')}</div>
        <a class="btn" href="mailto:support@shapop.app">${ico('mail')}<span data-i18n="support.cardBtn">${get('support.cardBtn')}</span></a>
      </div>
      <div class="help-cards">${card(1, 'alert')}${card(2, 'shield')}${card(3, 'users')}</div>
      <div class="center reveal" style="margin-top:72px">${t('h2', 'support.faqTitle')}</div>
      ${group(1)}${group(2)}${group(3)}${group(4)}
    </div>
  </section>
</main>` + footer();
}

/* ------------------------------ LÉGAL ------------------------------ */
function legal(kind) {
  const d = EN[kind];
  const toc = d.sections.map((s, i) => `<li><a href="#s${i + 1}">${i + 1}. ${s[0]}</a></li>`).join('');
  const body = d.sections.map((s, i) => `<h2 id="s${i + 1}"><span class="n">${i + 1}.</span> ${s[0]}</h2>${fill(s[1])}`).join('\n');
  return head(kind, { title: d.metaTitle, desc: d.metaDesc, pathName: '/' + kind }) + header(kind) + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${t('span', 'legal.kicker', 'class="kicker"')}
      ${t('h1', kind + '.title')}
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <article class="legal-box">
        ${t('span', 'legal.updated', 'class="updated"')}
        ${t('p', kind + '.lede', 'class="lede"')}
        <section class="legal-operator">
          ${t('h2', kind + '.opH')}
          ${t('p', kind + '.opP')}
        </section>
        <div data-legal="${kind}"><ul class="legal-toc">${toc}</ul>${body}</div>
      </article>
    </div>
  </section>
</main>` + footer(true);
}

/* ------------------------- SUPPRESSION DE COMPTE ------------------------- */
function deleteAccount() {
  return head('delete', { title: get('del.metaTitle'), desc: get('del.metaDesc'), pathName: '/delete-account' }) + header('delete') + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${t('span', 'del.kicker', 'class="kicker"')}
      ${t('h1', 'del.title')}
      ${t('p', 'del.p')}
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <article class="legal-box">
        ${t('h2', 'del.appH')}
        <ol>${t('li', 'del.s1')}${t('li', 'del.s2')}${t('li', 'del.s3')}</ol>
        ${t('h2', 'del.mailH')}
        ${t('p', 'del.mailP')}
        ${t('h2', 'del.goneH')}
        ${t('div', 'del.gone')}
        ${t('h2', 'del.keptH')}
        ${t('div', 'del.kept')}
        ${t('p', 'del.note', 'class="lede"')}
      </article>
    </div>
  </section>
</main>` + footer();
}

/* ------------------------- RÈGLES D'ACHAT ET DE VENTE ------------------------- */
function rulesPage() {
  return head('rules', { title: get('rules.metaTitle'), desc: get('rules.metaDesc'), pathName: '/rules' }) + header('rules') + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${t('span', 'rules.kicker', 'class="kicker"')}
      ${t('h1', 'rules.title')}
      ${t('p', 'rules.intro')}
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <article class="legal-box">
        ${t('h2', 'rules.buyerH')}
        ${t('ol', 'rules.buyer')}
        ${t('h2', 'rules.sellerH')}
        ${t('ol', 'rules.seller')}
        ${t('h2', 'rules.pickupH')}
        ${t('ol', 'rules.pickup')}
        ${t('h2', 'rules.luxuryH')}
        ${t('ol', 'rules.luxury')}
      </article>
    </div>
  </section>
</main>` + footer();
}

/* ------------------------------ MENTIONS LÉGALES ------------------------------ */
function mentionsPage() {
  const block = (k) => `${t('h2', 'mentions.' + k + 'H')}${t('div', 'mentions.' + k)}`;
  return head('legal', { title: get('mentions.metaTitle'), desc: get('mentions.metaDesc'), pathName: '/legal' }) + header('legal') + `
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      ${t('span', 'mentions.kicker', 'class="kicker"')}
      ${t('h1', 'mentions.title')}
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <article class="legal-box">
        ${block('pub')}${block('dir')}${block('host')}${block('pay')}${block('more')}
      </article>
    </div>
  </section>
</main>` + footer();
}


/* ------------------- DEVENIR VENDEUR / ACHETEUR / BIENVENUE ------------------- */
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const shotPhone = (img, cls = '') => `<div class="phone${cls}" aria-hidden="true"><div class="screen"><img class="shot-img" src="/assets/shots/${img}.webp" width="600" height="1304" alt="" loading="lazy"></div></div>`;
const opt = (group, code) => `<option value="${code}" data-i18n="form.${group}.${code}">${get(`form.${group}.${code}`)}</option>`;
const COUNTRIES = ['IL', 'FR', 'ES', 'US', 'GB', 'DE', 'IT', 'BE', 'CH', 'PT', 'NL', 'CA', 'OTHER'];
const CATS = ['fashion_w', 'fashion_m', 'sneakers', 'bags', 'jewelry', 'watches', 'beauty', 'electronics', 'gaming', 'cards', 'toys', 'vintage', 'home', 'kids', 'collect', 'other'];
const EXPS = ['none', 'marketplaces', 'shop', 'live'];
const errEl = '<div class="err" role="alert"></div>';

function progress(kind) {
  const a = kind === 'sell' ? ['p2', 'p3'] : ['b2', 'b3'];
  const li = (k, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><b data-i18n="prog.${k}">${get('prog.' + k)}</b><span data-i18n="prog.${k}s">${get('prog.' + k + 's')}</span></li>`;
  return `<ol class="progress" aria-label="${esc(get('prog.label'))}" data-i18n-aria="prog.label">${li('p1', 'now')}${li(a[0])}${li(a[1])}</ol>`;
}

function signupForm(kind) {
  const sell = kind === 'sell';
  const sel = (id, label, pick, group, list) => `<div class="field" data-f="${id}"><label for="f-${id}" data-i18n="form.${label}">${get('form.' + label)}</label><select id="f-${id}" name="${id}" required><option value="" data-i18n="form.${pick}">${get('form.' + pick)}</option>${list.map((c) => opt(group, c)).join('')}</select>${errEl}</div>`;
  const names = sell
    ? `<div class="two"><div class="field" data-f="first"><label for="f-first" data-i18n="form.first">${get('form.first')}</label><input id="f-first" name="first" type="text" autocomplete="given-name" required maxlength="60" data-i18n-ph="form.firstPh" placeholder="${esc(get('form.firstPh'))}">${errEl}</div><div class="field" data-f="last"><label for="f-last" data-i18n="form.last">${get('form.last')}</label><input id="f-last" name="last" type="text" autocomplete="family-name" required maxlength="60" data-i18n-ph="form.lastPh" placeholder="${esc(get('form.lastPh'))}">${errEl}</div></div>`
    : `<div class="field" data-f="first"><label for="f-first" data-i18n="form.name">${get('form.name')}</label><input id="f-first" name="first" type="text" autocomplete="given-name" required maxlength="60" data-i18n-ph="form.firstPh" placeholder="${esc(get('form.firstPh'))}">${errEl}</div>`;
  return `<div class="form-card reveal">
        ${progress(kind)}
        <form id="signup-form" class="fields" data-kind="${kind}" novalidate>
          ${names}
          <div class="field" data-f="email"><label for="f-email" data-i18n="form.email">${get('form.email')}</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="160" data-i18n-ph="form.emailPh" placeholder="${esc(get('form.emailPh'))}">${errEl}</div>
          <div class="field" data-f="password"><label for="f-password" data-i18n="form.password">${get('form.password')}</label><div class="pw"><input id="f-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72"><button type="button" class="pw-toggle" data-i18n="form.show">${get('form.show')}</button></div><div class="hint" data-i18n="form.passwordHint">${get('form.passwordHint')}</div>${errEl}</div>
          ${sell ? `<div class="two">${sel('country', 'country', 'countryPick', 'countries', COUNTRIES)}${sel('category', 'category', 'categoryPick', 'categories', CATS)}</div>${sel('exp', 'exp', 'expPick', 'exps', EXPS)}` : sel('country', 'country', 'countryPick', 'countries', COUNTRIES)}
          <div class="field" data-f="rules"><label class="check"><input type="checkbox" name="rules" required><span data-i18n="form.acceptRules">${get('form.acceptRules')}</span></label>${errEl}</div>
          <div class="field" data-f="terms"><label class="check"><input type="checkbox" name="terms" required><span data-i18n="form.acceptTerms">${get('form.acceptTerms')}</span></label>${errEl}</div>
          <div class="form-err" role="alert" hidden></div>
          <button class="btn-neon btn-xl submit" type="submit"><span class="spinner" aria-hidden="true"></span><span class="lbl" data-i18n="form.${sell ? 'submitSell' : 'submitBuy'}">${get('form.' + (sell ? 'submitSell' : 'submitBuy'))}</span></button>
          <p class="form-foot" data-i18n="form.already">${get('form.already')}</p>
        </form>
        <div class="done" hidden aria-live="polite">
          <div class="big-ok">${ico('mail')}</div>
          <h3 data-i18n="done.title">${get('done.title')}</h3>
          <p class="done-p" data-key="done.${sell ? 'p' : 'pBuy'}"></p>
          ${stores()}
          <small data-i18n="done.spam">${get('done.spam')}</small>
        </div>
      </div>`;
}

function signupSection(kind) {
  const k = kind === 'sell' ? 'sellp' : 'buyp';
  return `
  <section class="section signup" id="signup">
    <div class="wrap">
      <div class="signup-grid">
        <div class="signup-side reveal">
          ${t('span', k + '.formKicker', 'class="kicker"')}
          ${t('h2', k + '.formTitle')}
          ${t('p', k + '.formIntro', 'class="intro"')}
          <ul class="checks">
            <li>${ico('check')}${t('span', 'form.same')}</li>
          </ul>
          ${stores()}
        </div>
        ${signupForm(kind)}
      </div>
    </div>
  </section>`;
}

const joinScripts = `\n<script type="module" src="/assets/join.js?v=1"></script>`;

function joinHero(k, img, ctaIcon) {
  return `
  <section class="join-hero">
    <div class="wrap">
      <div class="reveal in">
        ${t('span', k + '.kicker', 'class="kicker"')}
        ${t('h1', k + '.title')}
        ${t('p', k + '.lead', 'class="lead"')}
        <div class="btn-row">
          <a class="btn-neon btn-xl" href="#signup">${ico(ctaIcon)}${t('span', k + '.cta')}</a>
          <a class="btn-line btn-xl" href="#steps">${t('span', k + '.ctaMore')}</a>
        </div>
        ${k === 'sellp' ? `<div class="stats">${[1, 2, 3].map((n) => `<div class="stat"><b data-i18n="sellp.stat${n}">${get('sellp.stat' + n)}</b><span data-i18n="sellp.stat${n}s">${get('sellp.stat' + n + 's')}</span></div>`).join('')}</div>` : `<ul class="trust"><li>${ico('card')}${t('span', 'buyp.steps.2.0')}</li><li>${ico('clock')}${t('span', 'buyp.steps.4.0')}</li></ul>`}
      </div>
      <div class="join-visual">
        ${sVideo()}
        ${shotPhone(img)}
      </div>
    </div>
  </section>`;
}

const stepList = (k, icons, cls) => `<ol class="steps ${cls}">${icons.map((ic, i) => `<li class="step reveal${i ? ' d' + i : ''}"><div class="tile">${ico(ic)}</div>${t('h3', `${k}.steps.${i}.0`)}${t('p', `${k}.steps.${i}.1`)}</li>`).join('')}</ol>`;
const protList = (k, icons) => `<ul class="prot-list">${icons.map((ic, i) => `<li class="reveal${i ? ' d' + i : ''}"><div class="tile">${ico(ic)}</div><div>${t('h3', `${k}.prot.${i}.0`)}${t('p', `${k}.prot.${i}.1`)}</div></li>`).join('')}</ul>`;

function sellPage() {
  const why = (i, ic) => `<div class="why reveal${i % 2 ? ' d1' : ''}"><div class="tile">${ico(ic)}</div><div>${t('h3', `sellp.why.${i}.0`)}${t('p', `sellp.why.${i}.1`)}</div></div>`;
  const fee = (n, ic) => `<div class="fee reveal"><div class="tile">${ico(ic)}</div><div>${t('h3', `sellp.fee${n}h`)}${t('p', `sellp.fee${n}p`)}</div></div>`;
  return head('sellp', { title: get('sellp.metaTitle'), desc: get('sellp.metaDesc'), pathName: '/sell' }) + header('sell') + `
<main id="main">${joinHero('sellp', '05-sell', 'store')}

  <section class="section alt">
    <div class="wrap">
      <div class="center reveal">${t('span', 'sellp.whyKicker', 'class="kicker"')}${t('h2', 'sellp.whyTitle')}</div>
      <div class="why-grid">${why(0, 'gavel')}${why(1, 'video')}${why(2, 'sparkles')}${why(3, 'lock')}</div>
    </div>
  </section>

  <section class="section" id="steps">
    <div class="wrap">
      <div class="center reveal">${t('span', 'sellp.stepsKicker', 'class="kicker"')}${t('h2', 'sellp.stepsTitle')}</div>
      ${stepList('sellp', ['users', 'camera', 'video', 'wallet'], 'four')}
    </div>
  </section>

  <section class="section alt" id="fees">
    <div class="wrap">
      <div class="center reveal">${t('span', 'sellp.feesKicker', 'class="kicker"')}${t('h2', 'sellp.feesTitle')}</div>
      <div class="fees">
        <div class="fee-list">${fee(1, 'tag')}${fee(2, 'card')}${fee(3, 'check')}</div>
        <div class="ticket reveal d1">
          ${t('h3', 'sellp.exTitle')}
          <div class="row"><span data-i18n="sellp.exSale">${get('sellp.exSale')}</span><b data-i18n="sellp.exSaleV">${get('sellp.exSaleV')}</b></div>
          <div class="row"><span data-i18n="sellp.exFees">${get('sellp.exFees')}</span><b data-i18n="sellp.exFeesV">${get('sellp.exFeesV')}</b></div>
          <div class="row total"><span data-i18n="sellp.exNet">${get('sellp.exNet')}</span><b data-i18n="sellp.exNetV">${get('sellp.exNetV')}</b></div>
          ${t('small', 'sellp.exNote')}
        </div>
      </div>
    </div>
  </section>

  <section class="section protect">
    <div class="wrap">
      <div class="center reveal">${t('span', 'sellp.protKicker', 'class="kicker"')}${t('h2', 'sellp.protTitle')}</div>
      <div class="prot-wrap">
        <div>${protList('sellp', ['card', 'clock', 'shield'])}<a class="rules-link" href="/rules">${t('span', 'sellp.rulesLink')}${ico('arrow', 'ico flip')}</a></div>
        ${shotPhone('07-rules', ' reveal d1')}
      </div>
    </div>
  </section>

  <section class="section faq">
    <div class="wrap">
      <div class="center reveal">${t('h2', 'sellp.faqTitle')}</div>
      <div class="faq-list" data-faq="sellp.faq">${faqHtml(get('sellp.faq'))}</div>
    </div>
  </section>
${signupSection('sell')}
</main>` + footer(false, joinScripts);
}

function buyPage() {
  return head('buyp', { title: get('buyp.metaTitle'), desc: get('buyp.metaDesc'), pathName: '/buy' }) + header('buy') + `
<main id="main">${joinHero('buyp', '02-direct', 'gavel')}

  <section class="section alt" id="steps">
    <div class="wrap">
      <div class="center reveal">${t('span', 'buyp.stepsKicker', 'class="kicker"')}${t('h2', 'buyp.stepsTitle')}</div>
      ${stepList('buyp', ['heart', 'gavel', 'card', 'package', 'clock'], 'five')}
    </div>
  </section>

  <section class="section protect">
    <div class="wrap">
      <div class="center reveal">${t('span', 'buyp.protKicker', 'class="kicker"')}${t('h2', 'buyp.protTitle')}</div>
      <div class="prot-wrap">
        <div>${protList('buyp', ['wallet', 'alert', 'lock'])}<a class="rules-link" href="/rules">${t('span', 'buyp.rulesLink')}${ico('arrow', 'ico flip')}</a></div>
        ${shotPhone('03-item', ' reveal d1')}
      </div>
    </div>
  </section>
${signupSection('buy')}
</main>` + footer(false, joinScripts);
}

function welcomePage() {
  return head('welcome', { title: get('welcome.metaTitle'), desc: get('welcome.metaDesc'), pathName: '/welcome' }) + header('welcome') + `
<main id="main">
  <section class="welcome">
    <div class="wrap">
      <div class="welcome-card reveal in">
        <img class="s" src="/assets/s-cyan.webp" width="184" height="234" alt="">
        <div class="w-ok">
          ${t('span', 'welcome.kicker', 'class="kicker"')}
          ${t('h1', 'welcome.title')}
          ${t('p', 'welcome.p')}
        </div>
        <div class="w-err" hidden>
          ${t('h1', 'welcome.errTitle')}
          ${t('p', 'welcome.errP')}
        </div>
        ${stores()}
        ${t('small', 'welcome.hint')}
      </div>
    </div>
  </section>
</main>
<script>(function(){var h=location.hash+location.search;if(/error(_code|_description)?=/.test(h)){document.querySelector('.w-ok').hidden=true;document.querySelector('.w-err').hidden=false;}if(location.hash){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}})()</script>` + footer();
}

const write = (rel, html) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
  console.log('écrit', rel, html.length, 'octets');
};
write('index.html', home());
write('support/index.html', support());
write('privacy/index.html', legal('privacy'));
write('terms/index.html', legal('terms'));
write('delete-account/index.html', deleteAccount());
write('rules/index.html', rulesPage());
write('legal/index.html', mentionsPage());
write('sell/index.html', sellPage());
write('buy/index.html', buyPage());
write('welcome/index.html', welcomePage());
