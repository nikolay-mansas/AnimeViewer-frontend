const fUser  = document.getElementById('f-username');
const fMail  = document.getElementById('f-email');
const fPass1 = document.getElementById('f-1-password');
const fPass2 = document.getElementById('f-2-password');

const iUser  = document.getElementById('username');
const iMail  = document.getElementById('email');
const iPass1 = document.getElementById('1-password');
const iPass2 = document.getElementById('2-password');

const form   = document.getElementById('registrationForm');
const toasts = document.getElementById('toasts');

function updateFilledState() {
  [fUser, fMail, fPass1, fPass2].forEach(w => {
    const input = w.querySelector('.input');
    if ((input.value || '').trim().length) w.classList.add('filled');
    else w.classList.remove('filled');
  });
}

function showError(message, fieldEl){
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
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=> t.remove(), 250);
  }, 2400);
}

function showOk(message){
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderColor = 'rgba(154,107,255,.5)';
  t.style.boxShadow  = '0 10px 28px rgba(154,107,255,.26), inset 0 0 16px rgba(255,255,255,.06)';
  t.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="url(#ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="ok" x1="0" x2="1">
          <stop offset="0%" stop-color="#b38cff"/>
          <stop offset="100%" stop-color="#9a6bff"/>
        </linearGradient>
      </defs>
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
    <span>${message}</span>
  `;
  toasts.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
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

function disableForm(disabled){
  [iUser, iMail, iPass1, iPass2].forEach(el => el.disabled = disabled);
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = disabled;
}

function submitRegistrationStub(payload){
  return new Promise((resolve) => {
    setTimeout(()=> resolve({ ok: true, id: Date.now(), payload }), 1200);
  });
}

function validate(){
  const username = iUser.value.trim();
  const email    = iMail.value.trim();
  const pass1    = iPass1.value;
  const pass2    = iPass2.value;

  if (!username){ showError('Введите юзернейм', fUser); iUser.focus(); return null; }
  const strong_username = isStrongUsername(username);
  if (!strong_username.ok){
    if (!strong_username.len) {
        showError('Юзернейм должен быть длиннее 6 символов и короче 128', fUser);
    } else {
      showError('Юзернейм может содержать только маленькие, заглавные и _ - символы', fUser);
    }
    iUser.focus(); return null;
  }

  if (!email){ showError('Введите почту', fMail); iMail.focus(); return null; }
  if (iMail.type === 'email' && !iMail.checkValidity()){ showError('Укажите корректную почту', fMail); iMail.focus(); return null; }

  if (!pass1){ showError('Введите пароль', fPass1); iPass1.focus(); return null; }
  const strong_password = isStrongPassword(pass1);
  if (!strong_password.ok){
    if (!strong_password.len) {
      showError('Пароль должен быть длиннее 8 символов и короче 256 символов.', fPass1);
    } else {
      showError('Пароль должен содержать цифру, строчную и заглавную буквы', fPass1);
    }
    iPass1.focus(); return null;
  }


  if (!pass2){ showError('Повторите пароль', fPass2); iPass2.focus(); return null; }
  if (pass1 !== pass2){ showError('Пароли не совпадают', fPass2); iPass2.focus(); return null; }

  return { username, email, password: pass1 };
}

const CFREG = {
  token: null,
  ready: false,
  widgetId: null,
  submitBtn: document.getElementById('submit-btn'),

  onSuccess(token) {
    this.token = token;
    this.ready = true;
    document.getElementById('f-captcha')?.classList.add('filled');
    if (this.submitBtn) this.submitBtn.disabled = false;
  },
  onExpired() {
    this.token = null;
    this.ready = false;
    if (this.submitBtn) this.submitBtn.disabled = true;
  },
  onError() {
    this.token = null;
    this.ready = false;
    if (this.submitBtn) this.submitBtn.disabled = true;
  },
  reset() {
    try {
      if (window.turnstile) {
        if (this.widgetId !== null && this.widgetId !== undefined) {
          turnstile.reset(this.widgetId);
        } else {
          turnstile.reset();
        }
      }
    } catch {}
    this.token = null;
    this.ready = false;
    if (this.submitBtn) this.submitBtn.disabled = true;
  },
  init() {
    // запретить отправку, пока нет токена
    if (this.submitBtn) this.submitBtn.disabled = true;

    // грузим скрипт (если ещё не загружен)
    if (!window.turnstile) {
      const s = document.createElement('script');
      // s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      s.onload = () => this.render();
      document.head.appendChild(s);
    } else {
      this.render();
    }
  },
  render() {
    const el = document.getElementById('cf-box');
    if (el && !el.dataset.rendered) {
      this.widgetId = turnstile.render(el, {
        sitekey: '0x4AAAAAABwSZHTYMw5z1qbe',
        theme: 'dark',
        size: 'flexible',
        language: 'ru',
        callback: (token) => CFREG.onSuccess(token),
        'expired-callback': () => CFREG.onExpired(),
        'error-callback': () => CFREG.onError(),
      });
      el.dataset.rendered = '1';
    }
  }
};

[iUser, iMail, iPass1, iPass2].forEach(el => el.addEventListener('input', updateFilledState));
updateFilledState();
CFREG.init();

window.initRegisterApp = function initRegisterApp(){
  // страница доступна неавторизованным; если на проекте используется auth.js, он сам вызовет initLoginApp,
  // поэтому пробросим алиас на совместимость
};
window.initLoginApp = window.initRegisterApp;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = validate();
  if (!payload) {
    disableForm(false);
    return;
  }

  if (!CFREG.ready || !CFREG.token) {
    showError('Подтвердите, что вы не робот', document.getElementById('f-captcha'));
    return;
  }

  payload.cf_token = CFREG.token;

  try {
    disableForm(true);
    if (window.Auth && typeof window.Auth.gateOn === 'function') {
      window.Auth.gateOn('Создаём аккаунт…');
    }
    const data = await submitRegistrationStub(payload);
    if (data && data.ok){
      if (window.Auth && typeof window.Auth.gateOff === 'function') window.Auth.gateOff();
      try {
        window.Auth.gateOn('Выполняем регистрацию…');
        const res = await window.Auth.fetchJSON('POST', '/api/v1/account/signup', data.payload, { timeout: 12000 });
        if (res && res.email) {
          window.Auth.gateOff();
          showOk('Регистрация успешна. Переадресация на страницу авторизации');
          setTimeout(() => {
            window.location.replace('/login.html');
          }, 5000);
        } else {
            window.Auth.gateOff();
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
        disableForm(false);
      }
    } else {
      if (window.Auth && typeof window.Auth.gateOff === 'function') window.Auth.gateOff();
      showError('Не удалось создать аккаунт', null);
      disableForm(false);
    }
  } catch (err){
    if (window.Auth && typeof window.Auth.gateOff === 'function') window.Auth.gateOff();
    if (err.name === 'AbortError') showError('Превышено время ожидания ответа от сервера.', null);
    else if (err.message === 'Failed to fetch') showError('Ошибка подключения к интернету. Проверьте соединение.', null);
    else showError(`Ошибка сервера: ${(err && err.message) || 'Неизвестная ошибка'}`, null);
    disableForm(false);
  } finally {
    // disableForm(false);
    CFREG.reset();
  }
});
