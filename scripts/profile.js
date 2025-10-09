const fUser = document.getElementById('f-username');
const fMail = document.getElementById('f-email');
const fOld  = document.getElementById('f-oldpass');
const fN1   = document.getElementById('f-newpass1');
const fN2   = document.getElementById('f-newpass2');

const iUser = document.getElementById('username');
const iMail = document.getElementById('email');
const iOld  = document.getElementById('oldpass');
const iN1   = document.getElementById('newpass1');
const iN2   = document.getElementById('newpass2');

const bUser = document.getElementById('btnUserEdit');
const bMail = document.getElementById('btnEmailEdit');
const bVer  = document.getElementById('btnEmailVerify');
const emailOk = document.getElementById('emailOk');
const toasts = document.getElementById('toasts');

const btnPassToggle = document.getElementById('btnPassToggle');
const passBlock = document.getElementById('passBlock');

const API = {
  me: '/api/v1/account/me',
  setUsername: '/api/v1/account/username',
  setEmail: '/api/v1/account/email',
  verifyEmail: '/api/v1/account/email/confirm',
  setPassword: '/api/v1/account/password'
};

let user = null;
let editingUser = false;
let editingMail = false;

function isStrongPassword(p){
  return {
    ok: p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && p.length <= 256,
    len: p.length >= 8,
    lower: /[a-z]/.test(p),
    upper: /[A-Z]/.test(p),
    digit: /\d/.test(p)
  };
}

function updateFilledState(){
  [fUser,fMail,fOld,fN1,fN2].forEach(w=>{
    const input = w.querySelector('.input');
    if ((input.value||'').trim()) w.classList.add('filled'); else w.classList.remove('filled');
  });
}

function showToast(message, kind='err'){
  const t = document.createElement('div');
  t.className = 'toast';
  const ok = kind==='ok';
  if (ok){ t.style.borderColor = 'rgba(154,107,255,.5)'; t.style.boxShadow = '0 10px 28px rgba(154,107,255,.26), inset 0 0 16px rgba(255,255,255,.06)'; }
  t.innerHTML = ok
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="url(#ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="ok" x1="0" x2="1"><stop offset="0%" stop-color="#b38cff"/><stop offset="100%" stop-color="#9a6bff"/></linearGradient></defs><path d="M20 6L9 17l-5-5"></path></svg><span>${message}</span>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="url(#e)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="e" x1="0" x2="1"><stop offset="0%" stop-color="var(--err1)"/><stop offset="100%" stop-color="var(--err2)"/></linearGradient></defs><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="7" x2="12" y2="13"></line><circle cx="12" cy="17" r="1"></circle></svg><span>${message}</span>`;
  toasts.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=> t.remove(), 250); }, ok?1800:2300);
}
const showError = (m, el)=>{ if(el){ el.classList.add('error'); setTimeout(()=>el.classList.remove('error'),600);} showToast(m,'err'); };
const showOk    = (m)=> showToast(m,'ok');
function focusEnd(el){
  if (!el) return;
  el.focus();
  try {
    if (typeof el.setSelectionRange === 'function' && el.type !== 'email') {
      const l = el.value.length;
      el.setSelectionRange(l, l);
    }
  } catch {}
}

const USER_RE  = /^[a-zA-Z0-9_-]+$/;
const EMAIL_RE = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;


function valUsername(v){
  const s = (v ?? '').trim();
  return {
    ok: s.length >= 6 && s.length <= 128 && USER_RE.test(s),
    len: s.length >= 6 && s.length <= 128,
    charset: USER_RE.test(s),
    value: s
  }
}

function valEmail(v){
  const s = (v ?? '').trim();
  return {
    ok: s.length > 0 && s.length <= 128 && EMAIL_RE.test(s),
    len: s.length <= 128,
    pattern: EMAIL_RE.test(s),
    value: s
  };
}

function normalizeUsername(v){ return (v ?? '').trim().replace(/\s+/g,''); }

async function loadMe(){
  window.Auth.gateOn('Загружаем профиль…');
  try {
    const me = await window.Auth.fetchJSON('GET', API.me);
    // формат: { created_at, updated_at, gid, username, email, is_admin, is_email_verified }
    user = me;

    iUser.value = me.username || '';
    iMail.value = me.email || '';

    // по умолчанию поля выключены и визуально «заблокированы»
    iUser.disabled = true;  fUser.classList.add('locked');
    iMail.disabled = true;  fMail.classList.add('locked');

    // статуса email_verified нет — считаем, что не подтверждён
    if (me.is_email_verified) {
        emailOk.style.display = '';
        if (bVer) bVer.style.display = 'none';   // спрятать кнопку
    } else {
        emailOk.style.display = 'none';
        if (bVer) {
            bVer.style.display = '';               // показать кнопку
            bVer.disabled = false;
            bVer.classList.remove('pending');
            bVer.textContent = 'Подтвердить почту';
            bVer.removeAttribute('aria-disabled');
        }
    }

    updateFilledState();
  } catch(e){
    showError((e?.data?.detail)||'Не удалось загрузить профиль', fUser);
  } finally {
    window.Auth.gateOff();
  }
}

function pickApiDetail(e){
  const d = e?.data;
  if (!d) return e?.message || '';
  if (typeof d === 'string') return d;
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail)) return d.detail.join('\n');
  if (d.message) return d.message;
  if (d.errors) {
    if (Array.isArray(d.errors)) return d.errors.map(x=>x.msg||x.message||x).join('\n');
    try { return Object.values(d.errors).flat().join('\n'); } catch {}
  }
  try { return JSON.stringify(d); } catch { return String(d); }
}

function translateUsernameError(raw){
  const s = String(raw||'');
  if (s.includes('Username already exists.'))
    return 'Юзернейм уже используется. Попробуйте другую.';
  return null;
}

function translateEmailError(raw){
  const s = String(raw||'');
  if (s.includes('Email already exists.'))
    return 'Почта уже используется. Попробуйте другую.';
  return null;
}

function translatePasswordError(raw){
  const s = String(raw||'');
  if (s.includes('Invalid password.'))
    return 'Пароль не совпадает с текущим.';
  return null;
}

async function saveUsername(){
  const check = valUsername(iUser.value);
  if (!check.value){ showError('Введите юзернейм', fUser); iUser.focus(); return; }
  if (!check.len){ showError('Юзернейм должен быть от 6 до 128 символов', fUser); iUser.focus(); return; }
  if (!check.charset){ showError('Допустимы только латинские буквы, цифры, _ и -', fUser); iUser.focus(); return; }

  // не отправляем, если новый = старому (игнорируя лишние пробелы)
  const oldNorm = normalizeUsername(user?.username);
  const newNorm = normalizeUsername(check.value);
  if (oldNorm && oldNorm === newNorm){
    // просто «закрываем» режим редактирования без запроса
    iUser.disabled = true;
    fUser.classList.add('locked');
    editingUser = false;
    bUser.textContent = 'Сменить юзернейм';
    iUser.value = newNorm;
    // showOk('Юзернейм не изменился');
    return;
  }

  bUser.disabled = true;
  try{
    window.Auth.gateOn('Сохраняем юзернейм…');
    await window.Auth.fetchJSON('PUT', API.setUsername, { username: check.value });
    user.username = check.value;
    iUser.disabled = true;
    fUser.classList.add('locked');
    editingUser = false;
    bUser.textContent = 'Сменить юзернейм';
    showOk('Юзернейм обновлён');
    window.Auth.clearToken();
    window.location.replace('/login.html');
  }catch(e){
    const raw = pickApiDetail(e);
    const friendly = (e?.status === 400 && translateUsernameError(raw)) || raw || 'Ошибка при смене юзернейма';
    showError(friendly, fUser);
  }finally{
    window.Auth.gateOff(); bUser.disabled = false;
  }
}

async function saveEmail(){
  const check = valEmail(iMail.value);
  if (!check.value){ showError('Введите почту', fMail); iMail.focus(); return; }
  if (!check.len){ showError('Почта не должна превышать 128 символов', fMail); iMail.focus(); return; }
  if (!check.pattern){ showError('Укажите корректную почту', fMail); iMail.focus(); return; }

  const oldNorm = normalizeUsername(user?.email);
  const newNorm = normalizeUsername(check.value);

  if (oldNorm && oldNorm === newNorm){
    iMail.disabled = true;
    fMail.classList.add('locked');
    editingMail = false;
    bMail.textContent = 'Сменить почту';
    iMail.value = newNorm;
    return;
  }


  bMail.disabled = true;
  try{
    window.Auth.gateOn('Сохраняем почту…');
    await window.Auth.fetchJSON('PUT', API.setEmail, { email: check.value });
    user.email = check.value;
    user.is_email_verified = false;
    emailOk.style.display = 'none';

    if (bVer) {
      bVer.style.display = '';
      bVer.disabled = false;
      bVer.classList.remove('pending');
      bVer.textContent = 'Подтвердить почту';
      bVer.removeAttribute('aria-disabled');
    }

    iMail.disabled = true;
    fMail.classList.add('locked');
    editingMail = false;
    bMail.textContent = 'Сменить почту';
    showOk('Почта обновлена');
  }catch(e){
    const raw = pickApiDetail(e);
    const friendly = (e?.status === 400 && translateEmailError(raw)) || raw || 'Ошибка при смене почты';
    showError(friendly, fMail);
  }finally{
    window.Auth.gateOff(); bMail.disabled = false;
  }
}

async function sendVerify(){
  try{
    window.Auth.gateOn('Отправляем подтверждение…');
    await window.Auth.fetchJSON('POST', API.verifyEmail, {});
    showOk('Письмо отправлено. Проверьте почту.');
    if (bVer) {
      bVer.disabled = true;
      bVer.classList.add('pending');
      bVer.textContent = 'Письмо отправлено';
      bVer.setAttribute('aria-disabled','true');
    }
  }catch(e){
    showError((e?.data?.detail)||'Ошибка при отправке письма', fMail);
  }finally{
    window.Auth.gateOff();
  }
}

async function changePassword(){
  const oldP = iOld.value;
  const n1 = iN1.value;
  const n2 = iN2.value;
  if (!oldP){ showError('Введите текущий пароль', fOld); iOld.focus(); return; }
  const st_old = isStrongPassword(oldP);
  if (!st_old.ok){ showError('Пароль должен быть ≥8, с цифрой, строчной и заглавной буквами', fOld); fOld.focus(); return; }
  if (!n1){ showError('Введите новый пароль', fN1); iN1.focus(); return; }
  const st = isStrongPassword(n1);
  if (!st.ok){ showError('Пароль должен быть ≥8, с цифрой, строчной и заглавной буквами', fN1); iN1.focus(); return; }
  if (n1 !== n2){ showError('Пароли не совпадают', fN2); iN2.focus(); return; }
  const btn = document.getElementById('btnPassChange');
  btn.disabled = true;
  try{
    window.Auth.gateOn('Обновляем пароль…');
    await window.Auth.fetchJSON('PUT', API.setPassword, { old_password: oldP, new_password: n1 });
    iOld.value = iN1.value = iN2.value = '';
    updateFilledState();
    showOk('Пароль изменён');
  }catch(e){
    const raw = pickApiDetail(e);
    const friendly = (e?.status === 400 && translatePasswordError(raw)) || raw || 'Ошибка при смене пароля';
    showError(friendly, fOld);
  }finally{
    window.Auth.gateOff(); btn.disabled = false;
  }
}

[iUser,iMail,iOld,iN1,iN2]
  .filter(Boolean)
  .forEach(el => el.addEventListener('input', updateFilledState));

if (bUser) bUser.addEventListener('click', ()=>{
  if (!editingUser){
    editingUser = true;
    iUser.disabled = false; fUser.classList.remove('locked');
    focusEnd(iUser);
    bUser.textContent = 'Сохранить';
  } else {
    saveUsername();
  }
});
if (bMail) bMail.addEventListener('click', ()=>{
  if (!editingMail){
    editingMail = true;
    iMail.disabled = false; fMail.classList.remove('locked');
    focusEnd(iMail);
    bMail.textContent = 'Сохранить';
  } else {
    saveEmail();
  }
});
if (bVer) bVer.addEventListener('click', sendVerify);
document.getElementById('btnPassChange').addEventListener('click', changePassword);

window.initProfileApp = async function(){
  await loadMe();
};

btnPassToggle.addEventListener('click', ()=>{
  const show = passBlock.style.display === 'none';
  passBlock.style.display = show ? '' : 'none';
  if (show) {
    iOld.focus();
  } else {
    // скрываем — очищаем поля и «filled»-состояния
    iOld.value = iN1.value = iN2.value = '';
    updateFilledState();
  }
});
