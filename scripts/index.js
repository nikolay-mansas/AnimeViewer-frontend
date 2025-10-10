const STORAGE_KEY = 'av:index:v1';
const grid = document.getElementById('grid');
const searchForm = document.getElementById('searchForm');
const qInput = document.getElementById('q');
const pageSizeWrap = document.getElementById('pageSize');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInd = document.getElementById('pageInd');

let state = { q: '', page: 1, pageSize: 12, total: 0, totalPages: 1 };

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
  page: state.page, pageSize: state.pageSize
  }));
}

function setPageSize(size, { resetPage = true, silent = false } = {}) {
  state.pageSize = size;
  if (resetPage) state.page = 1;
  [...pageSizeWrap.querySelectorAll('.chip')]
    .forEach(b => b.classList.toggle('active', Number(b.dataset.size) === size));
  if (!silent) saveState();
}

function skeleton(count){
  grid.innerHTML = '';
  for (let i=0; i<count; i++){
    const s = document.createElement('div');
    s.className='card skeleton';
    s.innerHTML = `<div class="card-img"></div><div class="card-body"><div class="card-title">&nbsp;</div></div>`;
    grid.appendChild(s);
  }
}

function renderEmpty(){
  grid.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'padding:16px;border:1px dashed rgba(154,107,255,.35);border-radius:14px;text-align:center;opacity:.9';
  box.textContent = 'Ничего не найдено';
  grid.appendChild(box);
}

function render(items, totalPages){
  grid.innerHTML = '';

  if (!items.length){
    renderEmpty();
    state.totalPages = Math.max(1, totalPages || 1);
    pageInd.textContent = `Стр. ${state.page} из ${state.totalPages}`;
    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= state.totalPages;
    return;
  }

  items.forEach(it=>{
    const title   = it.name || 'Без названия';
    const poster  = it.preview_path || '';
    const url     = '/anime/' + it.url || (it.gid ? `/anime/${it.gid}` : '#');
    const watched = Number(it.viewed_episodes ?? 0);                 // если бэк вернёт — покажем, иначе 0
    const totalEp = Number(it.series_count ?? 0);
    const fully   = Boolean(it.viewed === true || (totalEp > 0 && watched >= totalEp));

    const checkHtml = fully ? `
      <div class="watched-dot" title="Просмотрено" aria-label="Просмотрено">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>` : '';

    const card = document.createElement('a');
    card.href = url;
    card.className = 'card';
    card.innerHTML = `
      <div class="card-img" style="${poster ? `background-image:url('${poster}')` : ''}"></div>
      ${checkHtml}
      <div class="badge">${watched}/${totalEp}</div>
      <div class="card-body">
        <div class="card-title" title="${title}">${title}</div>
      </div>`;
    grid.appendChild(card);
  });

  state.totalPages = Math.max(1, totalPages || 1);
  pageInd.textContent = `Стр. ${state.page} из ${state.totalPages}`;
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
}

async function fetchAnime(q, page, pageSize){
  const isSearch = q && q.trim().length > 0;

  const paramsList  = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const paramsSearch = new URLSearchParams({ text: q?.trim() || '', page: String(page), page_size: String(pageSize) });

  const url = isSearch
    ? `/api/v1/anime/search?${paramsSearch}`
    : `/api/v1/anime/?${paramsList}`;

  try{
    window.Auth?.gateOn('Загружаем…');
    const data = await window.Auth.fetchJSON('GET', url);
    window.Auth?.gateOff();

    // Ожидаемые форматы:
    // /api/v1/anime             -> [ [ {...}, ... ], totalPages ]
    // /api/v1/anime/search      -> [ { text, anime: [ {...}, ... ] }, totalPages ]
    let items = [];
    let totalCount = 0;

    if (Array.isArray(data)) {
      const payload = data[0];
      totalCount = Number(data[1]) || 0;

      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload && Array.isArray(payload.anime)) {
        items = payload.anime;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return { items, totalPages };
  }catch(e){
    window.Auth?.gateOff();
    // Фолбэк: пусто — чтобы корректно отрисовать "ничего не найдено"
    return { items: [], totalPages: 1 };
  }
}

async function runSearch(){
  skeleton(state.pageSize);
  const { items, totalPages } = await fetchAnime(state.q, state.page, state.pageSize);
  render(items, totalPages);
}

searchForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  state.q = qInput.value.trim();
  state.page = 1;
  saveState();
  runSearch();
});

pageSizeWrap.addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip');
  if (!btn) return;
  setPageSize(Number(btn.dataset.size));
  runSearch();
});

prevBtn.addEventListener('click', ()=>{
  if (state.page>1){ state.page--; saveState(); runSearch(); }
});

nextBtn.addEventListener('click', ()=>{
  if (state.page<state.totalPages){ state.page++; saveState(); runSearch(); }
});

window.addEventListener('DOMContentLoaded', ()=>{
  const saved = loadState();
  setPageSize(saved.pageSize || 12, { resetPage:false, silent:true });
  state.page = saved.page || 1;
  runSearch();
});