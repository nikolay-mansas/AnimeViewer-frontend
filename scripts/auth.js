const KEY = 'auth';

function ensureGate() {
  let gate = document.getElementById('auth-gate');
  if (!gate) {
    gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.className = 'gate';
    gate.innerHTML = `
      <div class="gate-card">
        <div class="gate-spinner" aria-hidden="true"></div>
        <div class="gate-text">Проверка авторизации…</div>
      </div>`;
  document.documentElement.appendChild(gate);
  }
  return gate;
}

function gateOn(text = 'Проверка авторизации…') {
  const gate = ensureGate();
  const t = gate.querySelector('.gate-text');
  if (t) t.textContent = text;
  gate.classList.add('show');
}

function gateOff() {
  const gate = ensureGate();
  gate.classList.remove('show');
}

function getToken() {
  return localStorage.getItem(KEY);
}
function setToken(token) {
  localStorage.setItem(KEY, token);
}
function clearToken() {
  localStorage.removeItem(KEY);
}
function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fetchJSON(method, url, body = null, { timeout = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: ctrl.signal
  }).then(async (r) => {
    clearTimeout(id);
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (r.ok) return data;
    const err = new Error((data && (data.detail || data.message)) || `HTTP ${r.status}`);
    err.status = r.status;
    err.data = data;
     throw err;
  });
}

async function checkAuth(meEndpoint = '/api/v1/account/me') {
  const token = getToken();
  if (!token) throw new Error('NO_TOKEN');
  return fetchJSON('GET', meEndpoint);
}

async function requireAuth({
  meEndpoint = '/api/v1/account/me',
  onAuthorized,
  onUnauthorized,
  redirectIfAuthorized = '/',
  redirectToLogin = '/login.html',
  gateText = 'Проверка авторизации…'
} = {}) {
  gateOn(gateText);
  try {
    const me = await checkAuth(meEndpoint);
    if (onAuthorized) onAuthorized(me);
    else if (redirectIfAuthorized) window.location.replace(redirectIfAuthorized);
  } catch (e) {
    if (e?.status === 401 || e?.message === 'NO_TOKEN') {
      clearToken();
      if (location.pathname.endsWith('/login.html') || location.pathname.endsWith('/registration.html')) {
        if (onUnauthorized) onUnauthorized();
        gateOff();
      } else {
        window.location.replace(redirectToLogin);
      }
    } else {
      gateOff()
    }
  }
}

window.Auth = { getToken, setToken, clearToken, getAuthHeader, fetchJSON, requireAuth, gateOn, gateOff };

window.addEventListener('DOMContentLoaded', () => {
  window.Auth.requireAuth({
    onAuthorized: () => {
      const p = location.pathname;

      if (p === '/' || p.endsWith('/index.html')) {
        if (typeof window.initIndexApp === 'function') window.initIndexApp();
        window.Auth.gateOff();
        return;
      }

      if (p.startsWith('/anime/')) {
        if (typeof window.initAnimeApp === 'function') window.initAnimeApp();
        window.Auth.gateOff();
        return;
      }

      if (p.endsWith('/profile.html')) {
        window.Auth.gateOn('Загружаем профиль…');
        window.initProfileApp();
        return;
      }

      if (p.endsWith('/login.html') || p.endsWith('/registration.html')) {
        window.location.replace('/');
      }

      window.Auth.gateOff();
    },

    onUnauthorized: () => {
      const p = location.pathname;

      if (p.endsWith('/login.html') || p.endsWith('/registration.html')) {
        if (typeof window.initLoginApp === 'function') window.initLoginApp();
        if (typeof window.initRegisterApp === 'function') window.initRegisterApp();
        window.Auth.gateOff();
        return;
      }

      window.location.replace('/login.html');
    }
  });
});