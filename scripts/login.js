const fUser = document.getElementById('f-username');
const fMail = document.getElementById('f-email');
const fPass = document.getElementById('f-password');
const iUser = document.getElementById('username');
const iMail = document.getElementById('email');
const iPass = document.getElementById('password');
const form  = document.getElementById('loginForm');
const toasts = document.getElementById('toasts');

let activeField = null;

function updateFilledState() {
  [fUser, fMail, fPass].forEach(w => {
  const input = w.querySelector('.input');
  if ((input.value || '').trim().length) w.classList.add('filled');
    else w.classList.remove('filled');
  });
}

function makeSwapButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swap';
  btn.setAttribute('aria-label','Переключить поле');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="url(#g)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stop-color="#b38cff"/>
          <stop offset="100%" stop-color="#9a6bff"/>
        </linearGradient>
      </defs>
      <path d="M14 3l7 7-7 7"/>
      <path d="M21 10H3"/>
    </svg>`;
  return btn;
}

function setActive(which) {
  activeField = which;
  const active = which === 'username' ? fUser : fMail;
  const collapsed = which === 'username' ? fMail : fUser;

  active.classList.remove('collapsed');
  const oldBtn = active.querySelector('.swap'); if (oldBtn) oldBtn.remove();

  collapsed.classList.add('collapsed');
  if (!collapsed.querySelector('.swap')){
    const btn = makeSwapButton();
    btn.addEventListener('click', () => {
      btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
      setTimeout(() => {
        setActive(collapsed.dataset.field);
        const input = collapsed.dataset.field === 'username' ? iUser : iMail;
        input.focus({preventScroll:true});
      }, 150);
    });
    collapsed.appendChild(btn);
  }

  const focusInput = which === 'username' ? iUser : iMail;
  requestAnimationFrame(()=> focusInput.focus({preventScroll:true}));
}

function showError(message, fieldEl) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#e)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <defs>
            <linearGradient id="e" x1="0" x2="1">
              <stop offset="0%" stop-color="${getComputedStyle(document.documentElement).getPropertyValue('--err1').trim()}"/>
              <stop offset="100%" stop-color="${getComputedStyle(document.documentElement).getPropertyValue('--err2').trim()}"/>
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9"></circle>
          <line x1="12" y1="7" x2="12" y2="13"></line>
          <circle cx="12" cy="17" r="1"></circle>
        </svg>
        <span>${message}</span>
      `;
  toasts.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));

  if (fieldEl) {
    fieldEl.classList.add('error');
    setTimeout(()=> fieldEl.classList.remove('error'), 600);
  }
  setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
  }, 5000);
}

function isStrongPassword(p){
  return {
    ok: p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && p.length <= 256,
    len: p.length >= 8,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    digit: /\d/.test(p)
  };
}

function isStrongUsername(p){
    return {
        ok: p.length >= 6 && /^[a-zA-Z0-9_-]+$/.test(p) && p.length <= 128,
        len: p.length >= 6 && p.length <= 128,
        charster: /^[a-zA-Z0-9_-]+$/.test(p),
    }
}
window.CF = {
  token: null,
  ready: false,
  submitBtn: null,
  onSuccess(token) {
    console.log("1");
    this.token = token;
    this.ready = true;
    document.getElementById('f-captcha')?.classList.add('filled');
    if (this.submitBtn) this.submitBtn.disabled = false;
  },
  onExpired() {
    console.log("2");
    this.token = null;
    this.ready = false;
    if (this.submitBtn) this.submitBtn.disabled = true;
  },
  onError() {
    console.log("3");
    this.token = null;
    this.ready = false;
    showError('Не удалось загрузить капчу. Обновите страницу или попробуйте позже.', document.getElementById('f-captcha'));
    if (this.submitBtn) this.submitBtn.disabled = true;
  },
  reset() {
    console.log("4");
    try {
      if (window.turnstile) {
        if (window.turnstile) {
          if (window.CF.widgetId !== undefined) {
            turnstile.reset(window.CF.widgetId);
          } else {
            turnstile.reset();
          }
        }
      }
    } catch {}
    this.token = null;
    this.ready = false;
    if (this.submitBtn) this.submitBtn.disabled = true;
  }
};

window.initLoginApp = function initLoginApp() {
  const form = document.getElementById('loginForm');
  const submitBtn = form.querySelector('button.submit');
  window.CF.submitBtn = submitBtn;
  if (submitBtn) submitBtn.disabled = true;
  iUser.addEventListener('focus', () => setActive('username'));
  iMail.addEventListener('focus', () => setActive('email'));
  [iUser, iMail, iPass].forEach(el => el.addEventListener('input', updateFilledState));
  updateFilledState();

  const s = document.createElement('script');
  // s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  s.defer = true;
  s.onload = () => {
    const el = document.querySelector('.cf-turnstile');
    if (el && !el.dataset.rendered) {
      // сохраняем id виджета — пригодится для точного reset
      window.CF.widgetId = turnstile.render(el, {
        sitekey: '0x4AAAAAABwSZHTYMw5z1qbe',
        theme: 'dark',
        size: 'flexible',
        language: 'ru',
        callback: (token) => window.CF.onSuccess(token),
        'expired-callback': () => window.CF.onExpired(),
        'error-callback': () => window.CF.onError(),
      });
      el.dataset.rendered = '1';
    }
  };
  document.head.appendChild(s);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (window.CF?.submitBtn) window.CF.submitBtn.disabled = true;
    if (!activeField) { setActive(iUser.value ? 'username' : 'email'); }

    const username = iUser.value.trim();
    const email = iMail.value.trim();
    const password = iPass.value;

    if (activeField === 'username') {
      if (!username) { showError('Введите юзернейм', fUser); iUser.focus(); return; }
      const strong_username = isStrongUsername(username);
      if (!strong_username.ok){
        if (!strong_username.len) {
            showError('Юзернейм должен быть длиннее 6 символов и короче 128', fUser);
        } else {
          showError('Юзернейм может содержать только маленькие, заглавные и _ - символы', fUser);
        }
        iUser.focus(); return null;
      }
    } else {
      if (!email) { showError('Введите почту', fMail); iMail.focus(); return; }
    }
    if (iMail.type === 'email' && !iMail.checkValidity()){ showError('Укажите корректную почту', fMail); iMail.focus(); return; }

    if (!password) { showError('Введите пароль', fPass); iPass.focus(); return; }
    const strong_password = isStrongPassword(password);
    if (!strong_password.ok){
      if (!strong_password.len) {
        showError('Пароль должен быть длиннее 8 символов и короче 256 символов.', fPass);
      } else {
        showError('Пароль должен содержать цифру, строчную и заглавную буквы', fPass);
      }
      fPass.focus(); return null;
    }

    if (!window.CF.ready || !window.CF.token) {
      showError('Подтвердите, что вы не робот', document.getElementById('f-captcha'));
      return;
    }

    const payload = { password };
    if (activeField === 'username') payload.username = username;
    else payload.email = email;
    payload.cf_token = window.CF.token;

    try {
      window.Auth.gateOn('Выполняем вход…');
      const res = await window.Auth.fetchJSON('POST', '/api/v1/account/token', payload, { timeout: 12000 });
      if (res && res.access_token) {
        window.Auth.setToken(res.access_token);
        window.location.replace('/');
      } else {
        const detailText = (err?.data?.detail ?? err?.message ?? '').toString();
        if (/invalid.*(cloudflare|turnstile).*token/i.test(detailText)) {
          showError('Капча устарела. Подтвердите её ещё раз.', document.getElementById('f-captcha'));
        }
        showError('Не удалось получить токен', null);
      }
    } catch (err) {
      window.Auth.gateOff();
      const detail = (err && err.data && err.data.detail) || err.message || 'Ошибка';
      if (err.name === 'AbortError') {
        showError('Превышено время ожидания ответа от сервера.', null);
      } else if (err.message === 'Failed to fetch') {
        showError('Ошибка подключения к интернету. Проверьте соединение.', null);
      } else if (err.status === undefined) {
        showError('Сетевая ошибка. Попробуйте позже.', null);
      } else {
        const detail = (err.data && err.data.detail) || err.message || 'Ошибка';
        if (detail === 'Account not found.' || /not\s*found/i.test(detail)) {
          showError('Аккаунт с такими данными не найден.', null);
        } else {
          showError(`Ошибка сервера: ${detail}`, null);
        }
      }
    } finally {
      window.CF?.reset();
      window.Auth.gateOff();
    }
  });
};

// document.addEventListener('DOMContentLoaded', () => {
//   if (typeof window.initLoginApp === 'function') window.initLoginApp();
// });