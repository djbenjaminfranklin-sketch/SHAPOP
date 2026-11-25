// Génère les pages HTML du site ShaPop (texte anglais pré-rempli, traduit ensuite par assets/app.js).
// Lancer : node _src/build.mjs   (depuis le dossier site)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: { SP_T: {} } };
for (const f of ['i18n-en-fr.js', 'i18n-es-ru-he.js', 'i18n-delete.js', 'legal-en-fr.js', 'legal-es-ru-he.js', 'i18n-legal-rules.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), ctx);
}
const EN = ctx.window.SP_T.en;
const STORE_URL = 'https://apps.apple.com/app/id6759213156';
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

const appstore = (extra = '') => `<a class="appstore${extra}" href="${STORE_URL}" target="_blank" rel="noopener" data-i18n-aria="store.aria" aria-label="${esc(get('store.aria'))}">${ico('apple')}<span>${t('small', 'store.small')}<b>App Store</b></span></a>`;

function head(page, { title, desc, pathName }) {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(strip(title))}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F0908A">
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
<link rel="stylesheet" href="/assets/style.css?v=7">
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>`;
}

function header(active) {
  const a = (href, key, name) => `<a href="${href}"${active === name ? ' aria-current="page"' : ''} data-i18n="${key}">${get(key)}</a>`;
  return `
<header class="header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="ShaPop"><img src="/assets/logo.webp" width="760" height="383" alt="ShaPop"></a>
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
      <a class="btn-get" href="${STORE_URL}" target="_blank" rel="noopener">${ico('apple')}<span data-i18n="nav.get">${get('nav.get')}</span></a>
    </div>
  </div>
</header>`;
}

function footer(legal = false) {
  return `
<footer class="footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <img src="/assets/logo.webp" width="760" height="383" alt="ShaPop" loading="lazy">
        ${t('p', 'foot.tag')}
        <div style="margin-top:18px">${appstore()}</div>
      </div>
      <div>
        ${t('h4', 'foot.app')}
        <ul>
          <li><a href="/#how" data-i18n="nav.how">${get('nav.how')}</a></li>
          <li><a href="/#protect" data-i18n="nav.protect">${get('nav.protect')}</a></li>
          <li><a href="/#faq" data-i18n="nav.faq">${get('nav.faq')}</a></li>
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
<script src="/assets/i18n-legal-rules.js?v=8"></script>
${legal ? '<script src="/assets/legal-en-fr.js?v=7"></script>\n<script src="/assets/legal-es-ru-he.js?v=7"></script>\n' : ''}<script src="/assets/app.js?v=8"></script>
</body>
</html>
`;
}

const faqHtml = (items) => items.map(([q, a]) => `<details><summary>${q}</summary><div class="a"><p>${fill(a)}</p></div></details>`).join('');

/* ------------------------------ ACCUEIL ------------------------------ */
function home() {
  const step = (n, icon, extra = '', d = '') => `<li class="step reveal${d}"><div class="tile">${ico(icon)}</div>${t('h3', `buy.s${n}h`)}${t('p', `buy.s${n}p`)}${extra}</li>`;
  const pay = `<div class="pay-logos">${t('span', 'pay.card')}<span>Apple Pay</span>${t('span', 'pay.bit')}</div>`;
  const sitem = (n, icon) => `<li class="seller-item reveal">${'<div class="tile">' + ico(icon) + '</div>'}<div>${t('h3', `sell.s${n}h`)}${t('p', `sell.s${n}p`)}</div></li>`;
  const flow = (n, icon) => `<li class="reveal d${n - 1 || ''}"><div class="tile">${ico(icon)}</div><div>${t('b', `prot.f${n}b`)}${t('small', `prot.f${n}s`)}</div></li>`;
  const check = (k) => `<li>${ico('check')}${t('span', k)}</li>`;
  const perk = (n, icon, d) => `<div class="perk reveal${d}"><div class="tile">${ico(icon)}</div>${t('h3', `perks.p${n}h`)}${t('p', `perks.p${n}p`)}</div>`;
  const cats = get('cats').map((c) => `<span>${c}</span>`).join('');

  return head('home', { title: get('home.metaTitle'), desc: get('home.metaDesc'), pathName: '/' }) + header('') + `
<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-text reveal in">
        <img class="hero-logo" src="/assets/logo.webp" width="760" height="383" alt="ShaPop">
        <span class="pill">${ico('globe')}<span data-i18n="hero.badge">${get('hero.badge')}</span></span>
        ${t('h1', 'hero.title')}
        ${t('p', 'hero.lead', 'class="lead"')}
        <div class="hero-cta">
          ${appstore()}
          <a class="link-more" href="#how">${t('span', 'hero.more')}${ico('arrow')}</a>
        </div>
        <ul class="trust">
          <li>${ico('lock')}${t('span', 'hero.t1')}</li>
          <li>${ico('card')}${t('span', 'hero.t2')}</li>
          <li>${ico('package')}${t('span', 'hero.t3')}</li>
        </ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
<div class="stage">
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
        ${t('span', 'buy.kicker', 'class="kicker"')}
        ${t('h2', 'buy.title')}
        ${t('p', 'buy.intro', 'class="intro"')}
      </div>
      <ol class="steps five">
        ${step(1, 'eye')}
        ${step(2, 'gavel', '', ' d1')}
        ${step(3, 'card', pay, ' d2')}
        ${step(4, 'chat', '', ' d3')}
        ${step(5, 'package', '', ' d4')}
      </ol>
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
      ${appstore()}
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
