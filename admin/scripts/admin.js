// =========== API endpoints (подкорректируй под свой бэк при необходимости) ===========
const API = {
  me: '/api/v1/account/me',

  // users
  users: (page, page_size, q) => q && q.trim()
    ? `/api/v1/account/search?text=${encodeURIComponent(q)}&page=${page}&page_size=${page_size}`
    : `/api/v1/account/?page=${page}&page_size=${page_size}`,
  userById: (gid)=> `/api/v1/account/${gid}`,
  userUpdate: (gid)=> `/api/v1/account/${gid}`,
  userSetPassword: (gid)=> `/api/v1/account/${gid}/password`,
  watchHistory: (account_gid, page, page_size)=> `/api/v1/watcher/${account_gid}?page=${page}&page_size=${page_size}`,

  // anime
  animeList: (page, page_size, q) => q && q.trim()
    ? `/api/v1/anime/search?text=${encodeURIComponent(q)}&page=${page}&page_size=${page_size}`
    : `/api/v1/anime/admin-anime?page=${page}&page_size=${page_size}`,
  animeById: (gid)=> `/api/v1/anime/${gid}`,
  animeCreate: `/api/v1/anime/create`,
  animeUpdate: (gid)=> `/api/v1/anime/${gid}`,
  animeNames: (gid)=> `/api/v1/anime/${gid}/names`,
  animeCreateName: `/api/v1/anime/create/name`,
  animeLinks: (gid)=> `/api/v1/anime/${gid}/links`,
  animeCreateLink: `/api/v1/anime/create/link`,
  animeNameById: (gid, nameGid)=> `/api/v1/anime/${gid}/names/${nameGid}`,
  animeUpdateName: `/api/v1/anime/names`,
  animeDeleteName: (gid)=> `/api/v1/anime/names/${gid}`,
  animeLinkById: (gid, linkGid)=> `/api/v1/anime/${gid}/links/${linkGid}`,
  animeUpdateLink: `/api/v1/anime/links`,
  animeDeleteLink: (gid)=> `/api/v1/anime/links/${gid}`,
};

// =========== UI helpers ===========
const $ = (s, root=document)=> root.querySelector(s);
const $$ = (s, root=document)=> Array.from(root.querySelectorAll(s));
const toasts = $('#toasts');
const fUdPass   = $('#f-ud-pass');
const udNewPass = $('#udNewPass');
const udSetPass = $('#udSetPass');

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
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=> t.remove(), 250); }, ok?1600:2200);
}
const showOk = (m)=> showToast(m,'ok');

// validators
const USER_RE  = /^[a-zA-Z0-9_-]+$/;
const EMAIL_RE = /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,}|[0-9]{1,3})(\]?)$/;

function isStrongPassword(p){
  return p && p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && p.length <= 256;
}
function valUsername(v){
  const s = (v ?? '').trim();
  return s.length >= 6 && s.length <= 128 && USER_RE.test(s);
}
function valEmail(v){
  const s = (v ?? '').trim();
  return s.length > 0 && s.length <= 128 && EMAIL_RE.test(s);
}
const fmtDT = (s)=> s ? new Date(s).toLocaleString() : '';
function pad2(n){ return n<10?'0'+n:String(n); }
function fmtTC(sec){
  sec = Math.max(0, Number(sec||0)|0);
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return h>0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}
function setChips(container, size){
  $$('.chip', container).forEach(b=> b.classList.toggle('active', Number(b.dataset.size)===size));
}

// tabs (top-level)
const tabs = $$('.tab[data-tab]');
tabs.forEach(t=>{
  t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.tab;
    $$('.area').forEach(a=> a.classList.remove('show'));
    $('#area-'+target).classList.add('show');
  });
});

// ==================== USERS LIST ====================
const usersState = { q:'', page:1, size:20, totalPages:1, current:null };
const uTableBody = $('#usersTbody');
const uInd = $('#usersInd'); const uPrev = $('#usersPrev'); const uNext = $('#usersNext'); const uSize = $('#usersPageSize');

function renderUsers(items=[]){
  uTableBody.innerHTML = '';
  if (!items.length){
    uTableBody.innerHTML = `<tr><td colspan="5" class="muted">Ничего не найдено</td></tr>`;
    return;
  }
  for (const u of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.username}</strong><div class="mono muted">${u.gid}</div></td>
      <td>${u.email}</td>
      <td>
        ${u.is_email_verified ? '<span class="badge-sm badge-ok">email ok</span>' : '<span class="badge-sm">email?</span>'}
        ${u.is_admin ? '<span class="badge-sm badge-ok">admin</span>' : ''}
      </td>
      <td>${fmtDT(u.created_at)}</td>
      <td style="text-align:right"><button class="btn small" data-open="${u.gid}">Открыть</button></td>
    `;
    uTableBody.appendChild(tr);
  }
  // open handlers
  $$('button[data-open]', uTableBody).forEach(b=>{
    b.addEventListener('click', ()=> openUser(b.dataset.open));
  });
}

async function fetchUsers(){
  window.Auth.gateOn('Загружаем пользователей…');
  try{
    const url = API.users(usersState.page, usersState.size, usersState.q);
    const data = await window.Auth.fetchJSON('GET', url);
    // ожидаем формат: [ [ {...}, ... ], totalPages ]
    let items = [], totalCount = 0;
    if (Array.isArray(data)){
      items = Array.isArray(data[0]) ? data[0] : (Array.isArray(data[0]?.accounts) ? data[0].accounts : []);
      totalCount = Number(data[1] || 0); // <-- бэк вернул «всего объектов»
    } else {
      // на случай объектного ответа {items, total} / {accounts, count}
      items = data.items || data.accounts || [];
      totalCount = Number(data.total || data.count || 0);
    }
    renderUsers(items);

    usersState.totalPages = Math.max(1, Math.ceil(totalCount / usersState.size));
    uInd.textContent = `Стр. ${usersState.page} из ${usersState.totalPages}`;
    uPrev.disabled = usersState.page<=1;
    uNext.disabled = usersState.page>=usersState.totalPages;
  }catch(e){
    showToast('Ошибка загрузки списка пользователей');
  }finally{
    window.Auth.gateOff();
  }
}

$('#usersSearch').addEventListener('submit', (e)=>{
  e.preventDefault();
  usersState.q = ($('#uq').value||'').trim();
  usersState.page = 1;
  fetchUsers();
});
uPrev.addEventListener('click', ()=>{ if (usersState.page>1){ usersState.page--; fetchUsers(); }});
uNext.addEventListener('click', ()=>{ if (usersState.page<usersState.totalPages){ usersState.page++; fetchUsers(); }});
uSize.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip'); if (!btn) return;
  usersState.size = Number(btn.dataset.size)||20; usersState.page=1; setChips(uSize, usersState.size); fetchUsers();
});
setChips(uSize, usersState.size);

// ==================== USER DETAILS + WATCH HISTORY ====================
const udWrap = $('#userDetails');
const udClose = $('#udClose');
const udGid = $('#udGid');
const udUsername = $('#udUsername');
const udEmail = $('#udEmail');
const udEmailVerified = $('#udEmailVerified');
const udIsAdmin = $('#udIsAdmin');
const udCreated = $('#udCreated');
const udUpdated = $('#udUpdated');
const udSave = $('#udSave');

const udTabs = $$('.tab[data-udtab]');
const udAreas = { data: $('#udTabData'), history: $('#udTabHistory') };
udTabs.forEach(t=>{
  t.addEventListener('click', ()=>{
    udTabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
    Object.values(udAreas).forEach(a=>a.classList.remove('show'));
    udAreas[t.dataset.udtab].classList.add('show');
  });
});
udClose.addEventListener('click', ()=>{ udWrap.style.display='none'; usersState.current=null; });

async function openUser(gid){
  window.Auth.gateOn('Загружаем пользователя…');
  try{
    const u = await window.Auth.fetchJSON('GET', API.userById(gid));
    usersState.current = u;
    udGid.textContent = u.gid;
    udUsername.value = u.username||'';
    udEmail.value = u.email||'';
    udEmailVerified.checked = !!u.is_email_verified;
    udIsAdmin.checked = !!u.is_admin;
    udCreated.textContent = fmtDT(u.created_at);
    udUpdated.textContent = fmtDT(u.updated_at);
    udWrap.style.display='';
    // открыть вкладку "Данные"
    udTabs.forEach(x=>x.classList.remove('active')); udTabs[0].classList.add('active');
    Object.values(udAreas).forEach(a=>a.classList.remove('show')); udAreas.data.classList.add('show');
    // и загрузить историю (лениво)
    uhState.page=1; fetchHistory();
  }catch(e){
    showToast('Не удалось загрузить пользователя');
  }finally{
    window.Auth.gateOff();
  }
}

udSave.addEventListener('click', async ()=>{
  const username = (udUsername.value||'').trim();
  const email = (udEmail.value||'').trim();
  if (!valUsername(username)){ showToast('Неверный юзернейм', 'err'); return; }
  if (!valEmail(email)){ showToast('Некорректная почта', 'err'); return; }
  const payload = {
    username, email,
    is_email_verified: !!udEmailVerified.checked,
    is_admin: !!udIsAdmin.checked
  };
  try{
    window.Auth.gateOn('Сохраняем…');
    await window.Auth.fetchJSON('PUT', API.userUpdate(usersState.current.gid), payload);
    showOk('Сохранено');
    // перезагрузим «шапку» юзера
    await openUser(usersState.current.gid);
    // и таблицу — чтобы флаги обновились
    fetchUsers();
  }catch(e){
    showToast((e?.data?.detail)||'Ошибка сохранения');
  }finally{
    window.Auth.gateOff();
  }
});

// history
const uhState = { page:1, size:25, totalPages:1 };
const uhBody = $('#uhTbody'); const uhInd = $('#uhInd'); const uhPrev = $('#uhPrev'); const uhNext = $('#uhNext'); const uhSize = $('#uhPageSize');

function renderHistory(items=[]){
  uhBody.innerHTML = '';
  if (!items.length){
    uhBody.innerHTML = `<tr><td colspan="5" class="muted">Пока пусто</td></tr>`;
    return;
  }
  for (const h of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${h.anime_gid}</td>
      <td>${h.series_number}</td>
      <td>${fmtTC(h.timecode)}</td>
      <td>${h.viewed ? '<span class="badge-sm badge-ok">да</span>' : '<span class="badge-sm">нет</span>'}</td>
      <td>${fmtDT(h.updated_at)}</td>
    `;
    uhBody.appendChild(tr);
  }
}
async function fetchHistory(){
  if (!usersState.current) return;
  try{
    const url = API.watchHistory(usersState.current.gid, uhState.page, uhState.size);
    const data = await window.Auth.fetchJSON('GET', url);
    let items = [], totalCount = 0;
    if (Array.isArray(data)){
      items = Array.isArray(data[0]) ? data[0] : (Array.isArray(data[0]?.accounts) ? data[0].accounts : []);
      totalCount = Number(data[1] || 0); // <-- бэк вернул «всего объектов»
    } else {
      // на случай объектного ответа {items, total} / {accounts, count}
      items = data.items || data.accounts || [];
      totalCount = Number(data.total || data.count || 0);
    }
    renderHistory(items);

    usersState.totalPages = Math.max(1, Math.ceil(totalCount / usersState.size));
    uInd.textContent = `Стр. ${usersState.page} из ${usersState.totalPages}`;
    uPrev.disabled = usersState.page<=1;
    uNext.disabled = usersState.page>=usersState.totalPages;
  }catch(e){
    showToast('Ошибка загрузки истории');
  }
}
uhPrev.addEventListener('click', ()=>{ if (uhState.page>1){ uhState.page--; fetchHistory(); }});
uhNext.addEventListener('click', ()=>{ if (uhState.page<uhState.totalPages){ uhState.page++; fetchHistory(); }});
uhSize.addEventListener('click', (e)=>{ const b=e.target.closest('.chip'); if(!b) return; uhState.size=Number(b.dataset.size)||25; uhState.page=1; setChips(uhSize, uhState.size); fetchHistory(); });
setChips(uhSize, uhState.size);

// ==================== ANIME LIST ====================
const aState = { q:'', page:1, size:26, totalPages:1, current:null };
const aGrid = $('#animeGrid');
const aInd = $('#animeInd'); const aPrev = $('#animePrev'); const aNext = $('#animeNext'); const aSize = $('#animePageSize');

function skeletonGrid(n){
  aGrid.innerHTML=''; for(let i=0;i<n;i++){ const s=document.createElement('div'); s.className='card skeleton'; s.innerHTML=`<div class="card-img"></div><div class="card-body"><div class="card-title">&nbsp;</div></div>`; aGrid.appendChild(s); }
}
function renderAnime(items=[]){
  aGrid.innerHTML='';
  if (!items.length){
    const box=document.createElement('div'); box.style.cssText='padding:16px;border:1px dashed rgba(154,107,255,.35);border-radius:14px;text-align:center;opacity:.9';
    box.textContent='Ничего не найдено'; aGrid.appendChild(box); return;
  }
  items.forEach(it=>{
    const poster = it.preview_path||'';
    const title  = (it.title||it.name||'') || (it.video_path||'Без названия');
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="card-img" style="${poster?`background-image:url('${poster}')`:''}"></div>
      <div class="badge">${it.series_count ?? '-' } серий</div>
      <div class="card-body">
        <div class="card-title" title="${title}">${title}</div>
        <div class="mono muted" style="font-size:12px">${it.gid || ''}</div>
        <div class="hstack" style="margin-top:8px; justify-content:flex-end">
          <button class="btn small" data-open="${it.gid}">Открыть</button>
        </div>
      </div>`;
    aGrid.appendChild(card);
  });
  $$('button[data-open]', aGrid).forEach(b=> b.addEventListener('click', ()=> openAnime(b.dataset.open)));
}

async function fetchAnime(){
  skeletonGrid(aState.size);
  try{
    const url = API.animeList(aState.page, aState.size, aState.q);
    const data = await window.Auth.fetchJSON('GET', url);
    let items = [], totalCount = 0;
    if (Array.isArray(data)){
      items = Array.isArray(data[0]) ? data[0] : [];
      totalCount = Number(data[1] || 0);
    } else {
      items = data.items || [];
      totalCount = Number(data.total || data.count || 0);
    }
    renderAnime(items);

    uhState.totalPages = Math.max(1, Math.ceil(totalCount / uhState.size));
    uhInd.textContent = `Стр. ${uhState.page} из ${uhState.totalPages}`;
    uhPrev.disabled = uhState.page<=1;
    uhNext.disabled = uhState.page>=uhState.totalPages;
  }catch(e){
    aGrid.innerHTML=''; showToast('Ошибка загрузки аниме');
  }
}

$('#animeSearch').addEventListener('submit', (e)=>{
  e.preventDefault(); aState.q = ($('#aq').value||'').trim(); aState.page=1; fetchAnime();
});
aPrev.addEventListener('click', ()=>{ if (aState.page>1){ aState.page--; fetchAnime(); }});
aNext.addEventListener('click', ()=>{ if (aState.page<aState.totalPages){ aState.page++; fetchAnime(); }});
aSize.addEventListener('click', (e)=>{ const b=e.target.closest('.chip'); if(!b) return; aState.size=Number(b.dataset.size)||24; aState.page=1; setChips(aSize,aState.size); fetchAnime(); });
setChips(aSize, aState.size);

// ==================== ANIME DETAILS (view/edit/create) ====================
const adWrap = $('#animeDetails');
const adClose = $('#adClose');
const adGid = $('#adGid');
const adPreview = $('#adPreview');
const adVideoPath = $('#adVideoPath');
const adVideoSize = $('#adVideoSize');
const adSeries = $('#adSeries');
const adDesc = $('#adDesc');
const adCreated = $('#adCreated');
const adUpdated = $('#adUpdated');
const adSave = $('#adSave');
const adNames = $('#adNames');
const adLinks = $('#adLinks');
const adAddName = $('#adAddName');
const adAddLink = $('#adAddLink');

adClose.addEventListener('click', ()=>{ adWrap.style.display='none'; aState.current=null; });

function nameRow({gid='', name='' }={}){
  const row = document.createElement('div'); row.className='item';
  row.innerHTML = `
    <input class="input" placeholder="Название" value="${name||''}">
    <button class="btn small" data-save="${gid||''}">💾</button>
    <button class="btn small danger" data-del="${gid||''}">✖</button>
  `;
  return row;
}
function linkRow({gid='', url='' }={}){
  const row = document.createElement('div'); row.className='item';
  row.innerHTML = `
    <input class="input" placeholder="URL" value="${url||''}">
    <button class="btn small" data-save="${gid||''}">💾</button>
    <button class="btn small danger" data-del="${gid||''}">✖</button>
  `;
  return row;
}

async function openAnime(gid){
  window.Auth.gateOn('Загружаем аниме…');
  try{
    const a = await window.Auth.fetchJSON('GET', API.animeById(gid));
    aState.current = a;
    adGid.textContent = a.gid || '';
    adPreview.value = a.preview_path || '';
    adVideoPath.value = a.video_path || '';
    adVideoSize.value = Array.isArray(a.video_size) ? a.video_size.join(',') : '';
    adSeries.value = a.series_count ?? '';
    adDesc.value = a.description || '';
    adCreated.textContent = fmtDT(a.created_at);
    adUpdated.textContent = fmtDT(a.updated_at);
    adWrap.style.display='';

    // names
    adNames.innerHTML=''; 
    try{
      const names = await window.Auth.fetchJSON('GET', API.animeNames(a.gid));
      (names||[]).forEach(n=> adNames.appendChild(nameRow(n)));
    }catch{}
    // links
    adLinks.innerHTML='';
    try{
      const links = await window.Auth.fetchJSON('GET', API.animeLinks(a.gid));
      (links||[]).forEach(l=> adLinks.appendChild(linkRow(l)));
    }catch{}

    wireNameHandlers(); wireLinkHandlers();
  }catch(e){
    showToast('Не удалось загрузить аниме');
  }finally{
    window.Auth.gateOff();
  }
}

$('#animeCreate').addEventListener('click', ()=>{
  aState.current = { gid:null };
  adGid.textContent = '(новое)';
  adPreview.value=''; adVideoPath.value=''; adVideoSize.value='720p'; adSeries.value='1'; adDesc.value='';
  adCreated.textContent=''; adUpdated.textContent='';
  adNames.innerHTML=''; adLinks.innerHTML='';
  adWrap.style.display='';
  wireNameHandlers(); wireLinkHandlers();
});

adSave.addEventListener('click', async ()=>{
  const payload = {
    preview_path: adPreview.value.trim(),
    video_path: adVideoPath.value.trim(),
    video_size: adVideoSize.value.split(',').map(x=>x.trim()).filter(Boolean),
    series_count: Number(adSeries.value||0),
    description: adDesc.value.trim()
  };
  if (!payload.video_path){ showToast('Укажи video_path'); return; }
  if (!payload.series_count){ showToast('Кол-во серий > 0'); return; }

  try{
    window.Auth.gateOn('Сохраняем…');
    if (aState.current?.gid){
      await window.Auth.fetchJSON('PUT', API.animeUpdate(aState.current.gid), payload);
      showOk('Сохранено');
      await openAnime(aState.current.gid);
    } else {
      const created = await window.Auth.fetchJSON('POST', API.animeCreate, payload);
      showOk('Создано');
      if (created?.gid) await openAnime(created.gid);
    }
    fetchAnime();
  }catch(e){
    showToast((e?.data?.detail)||'Ошибка сохранения аниме');
  }finally{
    window.Auth.gateOff();
  }
});

// names CRUD
function wireNameHandlers(){
  // save
  $$('[data-save]', adNames).forEach(btn=>{
    btn.onclick = async ()=>{
      const row = btn.closest('.item'); const input = $('input', row);
      const val = (input.value||'').trim(); if (!val) { showToast('Пустое название'); return; }
      try{
        window.Auth.gateOn('Сохраняем название…');
        if (btn.dataset.save){ // update
          await window.Auth.fetchJSON('PUT', API.animeUpdateName, { anime_gid: btn.dataset.save, name: val });
        } else { // create
          await window.Auth.fetchJSON('POST', API.animeCreateName, { anime_gid: aState.current.gid, name: val });
        }
        await openAnime(aState.current.gid);
      }catch(e){ showToast('Ошибка названия'); }
      finally{ window.Auth.gateOff(); }
    };
  });
  // delete
  $$('[data-del]', adNames).forEach(btn=>{
    btn.onclick = async ()=>{
      if (!btn.dataset.del) { btn.closest('.item').remove(); return; }
      try{
        window.Auth.gateOn('Удаляем…');
        await window.Auth.fetchJSON('DELETE', API.animeDeleteName(btn.dataset.del));
        await openAnime(aState.current.gid);
      }catch(e){ showToast('Ошибка удаления'); }
      finally{ window.Auth.gateOff(); }
    };
  });
}
adAddName.addEventListener('click', ()=>{
  const row = nameRow(); adNames.prepend(row); wireNameHandlers();
});

// links CRUD
function wireLinkHandlers(){
  $$('[data-save]', adLinks).forEach(btn=>{
    btn.onclick = async ()=>{
      const row = btn.closest('.item'); const input = $('input', row);
      const val = (input.value||'').trim(); if (!val) { showToast('Пустая ссылка'); return; }
      try{
        window.Auth.gateOn('Сохраняем ссылку…');
        if (btn.dataset.save){ // update
          await window.Auth.fetchJSON('PUT', API.animeUpdateLink, { anime_gid: btn.dataset.save, url: val });
        } else { // create
          await window.Auth.fetchJSON('POST', API.animeCreateLink, { anime_gid: aState.current.gid, url: val });
        }
        await openAnime(aState.current.gid);
      }catch(e){ showToast('Ошибка ссылки'); }
      finally{ window.Auth.gateOff(); }
    };
  });
  $$('[data-del]', adLinks).forEach(btn=>{
    btn.onclick = async ()=>{
      if (!btn.dataset.del) { btn.closest('.item').remove(); return; }
      try{
        window.Auth.gateOn('Удаляем…');
        await window.Auth.fetchJSON('DELETE', API.animeDeleteLink(btn.dataset.del));
        await openAnime(aState.current.gid);
      }catch(e){ showToast('Ошибка удаления'); }
      finally{ window.Auth.gateOff(); }
    };
  });
}
adAddLink.addEventListener('click', ()=>{
  const row = linkRow(); adLinks.prepend(row); wireLinkHandlers();
});
if (udSetPass) {
  udSetPass.addEventListener('click', async ()=>{
    const newP = (udNewPass.value || '').trim();
    if (!isStrongPassword(newP)){
      showToast('Пароль должен быть ≥8, с цифрой, строчной и заглавной буквами');
      udNewPass.focus();
      return;
    }
    if (!usersState.current?.gid){
      showToast('Пользователь не выбран');
      return;
    }
    try{
      udSetPass.disabled = true;
      window.Auth.gateOn('Меняем пароль…');
      await window.Auth.fetchJSON('PUT', API.userSetPassword(usersState.current.gid), { new_password: newP });
      udNewPass.value = '';
      showOk('Пароль изменён');
    }catch(e){
      showToast((e?.data?.detail) || 'Не удалось изменить пароль');
    }finally{
      window.Auth.gateOff();
      udSetPass.disabled = false;
    }
  });
}

// ==================== bootstrap (auth + admin gate) ====================
window.addEventListener('DOMContentLoaded', ()=>{
  window.Auth.requireAuth({
    onAuthorized: async ()=>{
      try{
        window.Auth.gateOn('Проверка прав…');
        const me = await window.Auth.fetchJSON('GET', API.me);
        if (!me?.is_admin){
          window.location.replace('/index.html');
          return;
        }
        // init lists
        await Promise.all([fetchUsers(), fetchAnime()]);
      }catch(e){
        showToast('Не удалось проверить права'); window.location.replace('/index.html');
      }finally{
        window.Auth.gateOff();
      }
    },
    onUnauthorized: ()=> window.location.replace('/login.html')
  });
});