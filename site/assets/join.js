/* ShaPop — inscription depuis le site (/sell, /buy). Même compte Supabase que l'appli. */
const SUPA_URL = 'https://jscmqcjornseiclxvvqv.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzY21xY2pvcm5zZWljbHh2dnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDI0MjAsImV4cCI6MjA4NjY3ODQyMH0.4h-xYK7D2MnaFvqI-JHTc6bcESQadoUVGsoE27rWEWg';
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const REDIRECT = 'https://shapop.app/welcome';

const form = document.getElementById('signup-form');
const SP = window.SP || { t: (k) => k, lang: () => 'en' };
const tr = (k) => SP.t(k) || k;
const api = window.SPJoin = { status: 'loading', client: null, signUpImpl: null, lastPayload: null };

api.ready = import(SUPA_JS)
  .then((m) => {
    api.client = m.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    api.status = 'ready';
    return api.client;
  })
  .catch((e) => { api.status = 'error'; console.error('supabase-js', e); return null; });

if (form) init();

function init() {
  const kind = form.dataset.kind; // 'sell' | 'buy'
  const card = form.closest('.form-card');
  const done = card.querySelector('.done');
  const doneP = card.querySelector('.done-p');
  const topErr = form.querySelector('.form-err');
  const btn = form.querySelector('.submit');
  let sentTo = '';

  /* afficher / masquer le mot de passe */
  const pw = form.querySelector('#f-password');
  const tog = form.querySelector('.pw-toggle');
  tog.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    tog.setAttribute('data-i18n', show ? 'form.hide' : 'form.show');
    tog.textContent = tr(show ? 'form.hide' : 'form.show');
  });

  const field = (name) => form.querySelector(`[data-f="${name}"]`);
  function setErr(name, key) {
    const f = field(name); if (!f) return;
    const e = f.querySelector('.err');
    if (key) { f.classList.add('bad'); e.setAttribute('data-i18n', key); e.innerHTML = tr(key); }
    else { f.classList.remove('bad'); e.removeAttribute('data-i18n'); e.textContent = ''; }
  }
  function setTop(key) {
    if (key) { topErr.hidden = false; topErr.setAttribute('data-i18n', key); topErr.innerHTML = tr(key); }
    else { topErr.hidden = true; topErr.removeAttribute('data-i18n'); topErr.textContent = ''; }
  }

  const val = (n) => { const el = form.elements[n]; return el ? (el.type === 'checkbox' ? el.checked : String(el.value || '').trim()) : undefined; };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    const errs = {};
    if (!val('first')) errs.first = 'form.errRequired';
    if (kind === 'sell' && !val('last')) errs.last = 'form.errRequired';
    const email = val('email');
    if (!email) errs.email = 'form.errRequired'; else if (!EMAIL.test(email)) errs.email = 'form.errEmail';
    const p = form.elements.password.value;
    if (!p) errs.password = 'form.errRequired'; else if (p.length < 8) errs.password = 'form.errPassword';
    if (!val('country')) errs.country = 'form.errRequired';
    if (kind === 'sell') {
      if (!val('category')) errs.category = 'form.errRequired';
      if (!val('exp')) errs.exp = 'form.errRequired';
    }
    if (!val('rules')) errs.rules = 'form.errCheck';
    if (!val('terms')) errs.terms = 'form.errCheck';
    ['first', 'last', 'email', 'password', 'country', 'category', 'exp', 'rules', 'terms'].forEach((n) => setErr(n, errs[n]));
    return errs;
  }

  function payload() {
    const display_name = kind === 'sell' ? `${val('first')} ${val('last')}`.trim() : val('first');
    const data = { display_name, country: val('country'), wants_to_sell: kind === 'sell', language: SP.lang() };
    if (kind === 'sell') { data.main_category = val('category'); data.selling_experience = val('exp'); }
    return { email: val('email').toLowerCase(), password: form.elements.password.value, options: { data, emailRedirectTo: REDIRECT } };
  }
  api.validate = validate; api.payload = payload;

  /* effacer l'erreur d'un champ dès qu'on le corrige */
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f && f.classList.contains('bad')) setErr(f.dataset.f, null); });
  form.addEventListener('change', (e) => { const f = e.target.closest('.field'); if (f && f.classList.contains('bad')) setErr(f.dataset.f, null); });

  function busy(on) {
    btn.disabled = on; btn.classList.toggle('sending', on);
    const l = btn.querySelector('.lbl'); const k = on ? 'form.sending' : (kind === 'sell' ? 'form.submitSell' : 'form.submitBuy');
    l.setAttribute('data-i18n', k); l.textContent = tr(k);
  }

  function fillDone() {
    const safe = sentTo.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    doneP.innerHTML = String(tr(doneP.dataset.key)).replace('{email}', safe);
  }
  document.addEventListener('sp:lang', () => { if (!done.hidden) fillDone(); });

  function showDone(email) {
    sentTo = email; fillDone();
    form.hidden = true; done.hidden = false;
    const steps = card.querySelectorAll('.progress li');
    steps[0].classList.remove('now'); steps[0].classList.add('done');
    if (steps[1]) steps[1].classList.add('now');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function errorKey(error) {
    const code = String(error && (error.code || '')).toLowerCase();
    const msg = String(error && (error.message || '')).toLowerCase();
    if (code === 'user_already_exists' || code === 'email_exists' || /already (been )?registered|already exists/.test(msg)) return ['top', 'form.errExists'];
    if (code === 'weak_password' || /weak|pwned|easy to guess/.test(msg)) return ['password', 'form.errWeak'];
    if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/.test(msg)) return ['email', 'form.errEmail'];
    if ((error && error.status === 429) || /rate limit|too many/.test(msg)) return ['top', 'form.errRate'];
    return ['top', 'form.errGeneric'];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setTop(null);
    const errs = validate();
    const first = Object.keys(errs)[0];
    if (first) {
      const el = field(first).querySelector('input,select');
      if (el) el.focus();
      return;
    }
    const args = payload();
    api.lastPayload = { ...args, password: '***' };
    busy(true);
    try {
      let signUp = api.signUpImpl;
      if (!signUp) {
        const client = await api.ready;
        if (!client) { setTop('form.errLoad'); return; }
        signUp = (a) => client.auth.signUp(a);
      }
      const { data, error } = await signUp(args);
      if (error) {
        const [where, key] = errorKey(error);
        if (where === 'top') setTop(key); else { setErr(where, key); field(where).querySelector('input').focus(); }
        return;
      }
      /* Supabase renvoie un utilisateur sans identité quand l'e-mail existe déjà (confirmation activée) */
      if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { setTop('form.errExists'); return; }
      showDone(args.email);
    } catch (err) {
      console.error(err);
      setTop('form.errGeneric');
    } finally {
      busy(false);
    }
  });
}
