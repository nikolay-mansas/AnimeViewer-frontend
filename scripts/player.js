const titleEl = document.getElementById('animeTitle');
const videoEl = document.getElementById('video');
const posterEl = document.getElementById('poster');
const prevBtn = document.getElementById('prevEp');
const nextBtn = document.getElementById('nextEp');
const epCounter = document.getElementById('epCounter');
const qSel = document.getElementById('quality');
const descBox = document.getElementById('descBox');
const descToggle = document.getElementById('descToggle');
const descBody = document.getElementById('descBody');

let hls = null;
let anime = null;
let updateTimer = null;
let viewedSent = false;

let state = { episode: 1, max: 1, base: '', qualities: [], currentQuality: 'auto', native: false, resumeTime: 0 };

const QUALITY_STORAGE_KEY = `av:q:${location.pathname}`;

function pathSlug(){ return location.pathname.split('/').pop(); }
function join(a,b){ return a.replace(/\/?$/,'/') + String(b).replace(/^\/?/,''); }
function episodeUrlWithQuality(q, ep){ return join(state.base, `${q}/${ep}/playlist.m3u8`); }

function loadSavedQuality(){
  try { return localStorage.getItem(QUALITY_STORAGE_KEY) || 'auto'; } catch { return 'auto'; }
}
function saveQuality(q){
  try { localStorage.setItem(QUALITY_STORAGE_KEY, q); } catch {}
}

function qHeight(q){
  const m = String(q).match(/(\d+)/);
  return m ? parseInt(m[1],10) : NaN;
}
function nearestQuality(desired, list){
  const d = qHeight(desired);
  if (!list?.length || !d) return list?.[0] || '720p';
  let best = list[0], diff = Math.abs(qHeight(best)-d)||1e9;
  for (const q of list){
    const h = qHeight(q); if (!h) continue;
    const df = Math.abs(h - d);
    if (df < diff){ diff = df; best = q; }
  }
  return best;
}
function pickAuto(list){
  if (!list?.length) return '720p';
  if (list.includes('1080p')) return '1080p';
  if (list.includes('720p')) return '720p';
  return nearestQuality('720p', list);
}
function ensureAvailableQuality(desired, list){
  if (desired === 'auto') return 'auto';
  if (list?.includes(desired)) return desired;
  return nearestQuality(desired, list);
}

function setQualities(list, selected='auto'){
  const opts = ['<option value="auto">Авто</option>'].concat((list||[]).map(v=>`<option value="${v}">${v}</option>`)).join('');
  qSel.innerHTML = opts;
  qSel.value = selected;
}

function updateEpisodeButtons(){
  epCounter.textContent = `${state.episode} / ${state.max}`;
  prevBtn.disabled = state.episode<=1;
  nextBtn.disabled = state.episode>=state.max;
}

function destroyHls(){
  if (hls){ hls.destroy(); hls = null; }
}

async function loadEpisode(){
  const eff = state.currentQuality === 'auto' ? pickAuto(state.qualities) : ensureAvailableQuality(state.currentQuality, state.qualities);
  const url = episodeUrlWithQuality(eff, state.episode);

  const startAt = Math.max(0, Math.floor(state.resumeTime || 0));

  destroyHls();

  if (Hls.isSupported()){
    hls = new Hls({ autoStartLoad:true, capLevelToPlayerSize:false, startPosition: startAt });
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MEDIA_ATTACHED, ()=> hls.loadSource(url));
    hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
      if (startAt > 0) { try { videoEl.currentTime = startAt; } catch {} }
      videoEl.play().catch(()=>{});
    });
    videoEl.addEventListener('loadedmetadata', ()=>{
      if (startAt > 0 && Math.abs((videoEl.currentTime||0) - startAt) > 1) {
        try { videoEl.currentTime = startAt; } catch {}
      }
    }, { once:true });
    videoEl.addEventListener('canplay', ()=>{
      if (startAt > 0 && Math.abs((videoEl.currentTime||0) - startAt) > 1) {
        try { videoEl.currentTime = startAt; } catch {}
      }
    }, { once:true });
    const seek = ()=> {
      if (state.resumeTime > 0 && isFinite(videoEl.duration) && state.resumeTime < (videoEl.duration - 1)) {
        try { videoEl.currentTime = state.resumeTime; } catch {}
      }
      videoEl.play().catch(()=>{});
    };
    hls.on(Hls.Events.MANIFEST_PARSED, seek);
    videoEl.addEventListener('loadedmetadata', seek, { once:true });
  } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    state.native = true;
    videoEl.src = url;
    const seekNative = ()=>{
      if (startAt > 0) { try { videoEl.currentTime = startAt; } catch {} }
      videoEl.play().catch(()=>{});
    };
    videoEl.addEventListener('loadedmetadata', seekNative, { once:true });
    videoEl.addEventListener('canplay', ()=>{
      if (startAt > 0 && Math.abs((videoEl.currentTime||0) - startAt) > 1) {
        try { videoEl.currentTime = startAt; } catch {}
      }
    }, { once:true });
  } else {
    videoEl.src = '';
  }

  updateEpisodeButtons();
}

async function fetchAnime(){
  const url = `/api/v1/anime/link?url=${encodeURIComponent(pathSlug())}`;
  window.Auth?.gateOn('Загружаем…');
  try{
    const data = await window.Auth.fetchJSON('GET', url);
    window.Auth?.gateOff();
    return data;
  }catch(e){
    window.Auth?.gateOff();
    return null;
  }
}

function fillUI(){
  titleEl.textContent = anime.name || 'Без названия';
  posterEl.style.backgroundImage = anime.preview_path ? `url('${anime.preview_path}')` : '';
  descBody.textContent = anime.description || 'Без описания';
  state.base = join(anime.video_path || '/', '');
  state.max = Number(anime.series_count || 1) || 1;
  state.episode = Math.min(Math.max(1, state.episode), state.max);
  state.qualities = Array.isArray(anime.video_size) ? anime.video_size.slice().sort((a,b)=>qHeight(a)-qHeight(b)) : [];
  const saved = loadSavedQuality();
  state.currentQuality = ensureAvailableQuality(saved, state.qualities);
  setQualities(state.qualities, saved);
  updateEpisodeButtons();
}

async function getLastWatcher(gid){
  const qs = new URLSearchParams({ anime_gid: gid, need_last: 'true' }).toString();
  try{
    const data = await window.Auth.fetchJSON('GET', `/api/v1/watcher/?${qs}`);
    if (data && typeof data.series_number !== 'undefined') return data;
  }catch(e){
  }
  return null;
}

async function getWatcher(gid, series){
  const qs = new URLSearchParams({ anime_gid: gid, series_number: String(series) }).toString();
  try{
    const data = await window.Auth.fetchJSON('GET', `/api/v1/watcher/?${qs}`);
    return data || { timecode: 0, viewed: false };
  }catch(e){
    if (e?.status === 400) return { timecode: 0, viewed: false };
    return { timecode: 0, viewed: false };
  }
}

async function putWatcher({ timecode, viewed }){
  const payload = {
    anime_gid: anime.gid,
    series_number: state.episode,
    timecode: Math.max(0, Math.floor(timecode||0)),
    viewed: !!viewed
  };
  try{ await window.Auth.fetchJSON('PUT', '/api/v1/watcher/', payload); }catch(e){}
}

function shouldMarkViewed(){
  const dur = Number(videoEl.duration || 0);
  const cur = Number(videoEl.currentTime || 0);
  if (!dur || !isFinite(dur)) return false;
  return (dur - cur) <= 180;
}


async function sendUpdate(forceViewed=false){
  const viewed = forceViewed || shouldMarkViewed();
  if (viewed && viewedSent) return;
  await putWatcher({ timecode: videoEl.currentTime || 0, viewed });
  if (viewed) viewedSent = true;
}


function startWatcherTimer(){
  stopWatcherTimer();
  updateTimer = setInterval(()=>{ sendUpdate(false); }, 15000);
}
function stopWatcherTimer(){
  if (updateTimer){ clearInterval(updateTimer); updateTimer = null; }
}

async function prepareAndLoadEpisode({ fetchResume } = { fetchResume:true }){
  viewedSent = false;
  stopWatcherTimer();
  if (fetchResume) {
    state.resumeTime = 0;
    try { videoEl.currentTime = 0; } catch {}
    const w = await getWatcher(anime.gid, state.episode);
    state.resumeTime = Math.max(0, Number(w?.timecode||0));
  }
  await loadEpisode();
}

function bind(){
  prevBtn.addEventListener('click', async ()=>{
    if (state.episode>1){
      state.episode--;
      state.resumeTime = 0; // сброс
      await prepareAndLoadEpisode({ fetchResume:true });
    }
  });
  nextBtn.addEventListener('click', async ()=>{
    if (state.episode<state.max){
      state.episode++;
      state.resumeTime = 0;
      await prepareAndLoadEpisode({ fetchResume:true });
    }
  });
  qSel.addEventListener('change', async ()=>{
    const t = Math.floor(videoEl.currentTime || state.resumeTime || 0);
    state.resumeTime = t;

    state.currentQuality = qSel.value;
    saveQuality(state.currentQuality);

    await prepareAndLoadEpisode({ fetchResume:false });
  });
  descToggle.addEventListener('click', ()=> descBox.classList.toggle('open'));

  videoEl.addEventListener('play', startWatcherTimer);
  videoEl.addEventListener('pause', ()=>{ sendUpdate(false); stopWatcherTimer(); });
  videoEl.addEventListener('ended', ()=>{ sendUpdate(true); stopWatcherTimer(); });
  videoEl.addEventListener('timeupdate', ()=>{ state.resumeTime = Math.floor(videoEl.currentTime||0); });

  window.addEventListener('beforeunload', ()=>{ try{ navigator.sendBeacon && navigator.sendBeacon('/api/v1/watcher/', new Blob([JSON.stringify({
    anime_gid: anime?.gid, series_number: state.episode, timecode: Math.max(0, Math.floor(videoEl.currentTime||0)), viewed: shouldMarkViewed()
  })], { type:'application/json' })); }catch{} });
}

window.initAnimeApp = async function(){
  const a = await fetchAnime();
  if (!a){
    titleEl.textContent = 'Аниме не найдено';
    return;
  }
  anime = a;
  fillUI();

  const last = await getLastWatcher(anime.gid);
  if (last) {
    state.episode    = Math.min(Math.max(1, Number(last.series_number)), state.max);
    state.resumeTime = Math.max(0, Number(last.timecode || 0));
  }

  await prepareAndLoadEpisode({ fetchResume:false });
  bind();
};