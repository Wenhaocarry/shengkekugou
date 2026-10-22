import { playerAdapter } from './bridge.js';
import { memoryLabel } from './memory-labels.js';
import { toneIcon, flowerDoodle } from './v2-icons.js';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const app = $('#app'), audio = $('#audio'), sheet = $('#sheet');
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const localTime = () => new Date().toTimeString().slice(0,5);
const fmt = v => `${String(Math.floor((+v || 0)/60)).padStart(2,'0')}:${String(Math.floor((+v || 0)%60)).padStart(2,'0')}`;
const memoryTime = m => m.record_time || (m.created_at ? new Date(m.created_at).toTimeString().slice(0,5) : '00:00');
const newest = list => [...list].sort((a,b) => `${b.date}${memoryTime(b)}${b.created_at}`.localeCompare(`${a.date}${memoryTime(a)}${a.created_at}`));
const icons = {
 back:'M15 5l-7 7 7 7',down:'M5 8l7 7 7-7',plus:'M12 4v16M4 12h16',more:'M4 12h.01M12 12h.01M20 12h.01',
 share:'M14 4h6v6M20 4L10 14M10 5H5v15h15v-6',heart:'M12 21S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 13-10 13Z',
 play:'M7 4l14 8L7 20Z',pause:'M6 4h4v16H6zM14 4h4v16h-4z',prev:'M5 4h2v16H5zM19 4L7 12l12 8Z',next:'M17 4h2v16h-2zM5 4l12 8L5 20Z',
 loop:'M5 6h13l-3-3M19 18H6l3 3M20 6v8M4 18v-8',queue:'M11 6h10M3 13h18M3 20h18',
 lyric:'M4 5h16M4 10h16M4 15h10M4 20h7',photo:'M3 3h18v18H3zM3 16l5-5 5 5 4-4 4 4M15 7h.01',
 pin:'M12 22S4 13 4 9a8 8 0 1 1 16 0c0 4-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 smile:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M8 9h.01M16 9h.01M7 14q5 6 10 0',
 scene:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 6v6l4 2',
 lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4zM12 15v3',close:'M6 6l12 12M18 6L6 18',
 comment:'M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z',download:'M12 2v13M7 10l5 5 5-5M4 15v6h16v-6',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 3 3 1 3 4-2 3 1 3-4 4-3-1-3 2-4-3-1-3-3-1V9l3-1 1-3Z',
 edit:'M15 3l6 6-12 12H3v-6ZM12 6l6 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',search:'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16M16 16l6 6',phone:'M7 2h10v20H7zM10 18h4'
};
Object.assign(icons, {
 home:'M4 4h16v16H4zM9 8v8M15 8l-6 5M11 12l5 4',
 live:'M3 5h13v14H3zM16 10l5-3v10l-5-3M7 9l5 3-5 3Z',
 diamond:'M7 3h10l5 6-10 12L2 9ZM2 9h20M7 3l5 12 5-12',
 benefit:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M8 6l4 5 4-5M8 11h8M8 14h8M12 11v7',
 user:'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 19c0-6 18-6 18 0s-18 5-18 0Z',
 menu:'M3 5h18M3 12h18M3 19h18',book:'M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1ZM12 5v15',
 bag:'M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2',gift:'M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8H8a3 3 0 1 1 3-3ZM12 8h4a3 3 0 1 0-3-3Z',
 mail:'M2 4h20v16H2zM2 5l10 8L22 5',chevron:'M9 5l7 7-7 7',
 bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4',
 trophy:'M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 5 4M17 5h4v3a4 4 0 0 1-5 4M12 15v5M8 21h8',
 note:'M9 18V5l12-2v13M9 9l12-2M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6'
});
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${name==='queue'?'<path d="M3 2l5 4-5 4Z" fill="currentColor" stroke="none"/>':''}<path d="${icons[name] || icons.more}"/></svg>`;
const ib = (name,action,label,id='',cls='') => `<button class="icon ${cls}" data-act="${action}" data-id="${esc(id)}" aria-label="${esc(label)}">${svg(name)}</button>`;
const status = () => `<div class="status"><span>${localTime()} <svg class="silent" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7v5H1V7h3l5-4v14l-5-5M13 5l5 10M18 5l-5 10"/></svg></span><span class="status-device"><svg viewBox="0 0 24 18" aria-hidden="true"><rect x="1" y="12" width="4" height="6" rx="1"/><rect x="7" y="8" width="4" height="10" rx="1"/><rect x="13" y="4" width="4" height="14" rx="1"/><rect x="19" y="0" width="4" height="18" rx="1"/></svg><small>5G</small><span class="battery">86</span></span></div>`;
const top = (title,back='mine',right='',backAction='nav') => `<div class="top">${ib('back',backAction,'返回',back)}<h1>${esc(title)}</h1>${right || '<span class="spacer"></span>'}</div>`;
const MOODS = [['😌','平静下来'],['😄','开心'],['🥹','被治愈了'],['🌙','今晚有点emo'],['❤️','突然想起TA'],['🤗','越听越上头'],['🌊','放空一下'],['🔥','满血复活'],['🎧','单曲循环'],['⚡','被这句击中'],['🥲','听破防了'],['💗','心动时刻'],['🌊','情绪翻涌'],['🎤','忍不住跟唱'],['🥺','被感动'],['📼','怀念'],['🫥','孤独'],['💔','失恋了'],['🍃','放松'],['😴','困了'],['💭','发呆'],['💪','打鸡血'],['😣','委屈'],['🥀','遗憾'],['🌱','充满希望'],['🕊️','自由'],['🍷','微醺'],['🌀','上头'],['🌸','温柔'],['🛡️','坚强'],['💌','想念'],['🎉','激动'],['💕','恋爱了']];
const SCENES = [['🌧️','下雨天'],['🚎','通勤路上'],['☕','咖啡馆'],['🎧','深夜戴耳机'],['🌇','日落时分'],['🌙','睡不着'],['📚','学习中'],['🏃','跑步中'],['🚗','兜风中'],['🏠','一个人宅着'],['👭','和朋友一起'],['💼','加班中'],['🛣️','在路上'],['🎤','K歌时刻'],['🏋️','健身房'],['🛏️','睡前助眠'],['🌅','清晨醒来'],['🫖','午后时光'],['🌃','深夜独处'],['🚘','自驾路上'],['🛋️','周末宅家'],['🎊','聚会现场'],['📖','图书馆'],['🚇','地铁上'],['🚌','公交上'],['✈️','飞机上'],['🏖️','海边'],['⛰️','山野'],['⛺','露营'],['🚿','洗澡时'],['🍳','做饭时'],['🧹','打扫时'],['🎮','打游戏'],['🛍️','逛街'],['⏳','等人'],['🌧️','分手后'],['🤝','重逢'],['🎂','生日'],['🏮','节日'],['📝','考试前'],['🧳','旅行途中'],['🤒','生病时'],['🏡','想家时']];
const emoji = m => MOODS.find(x=>x[1]===m)?.[0] || ({'出发':'🎧','小确幸':'😄','松口气':'😌'})[m] || '🙂';
const privacy = v => ({private:'仅自己可见',friends:'好友可见',public:'公开'})[v] || '仅自己可见';
let state={songs:[],memories:[],settings:{},events:[]}, view='home', currentID='', playerPanel='cover', review='gallery', month=localDate().slice(0,7), day=localDate(), period='month';
let draft=null, draftPanel='', expanded=false, sheetReturn=null, selectedMemory='', historyID='', shareID='', shareType='card', shareURL='';
let galleryID='', galleryFrame=0, galleryItems=[], galleryStoryOpen=false;
let photoReturn=null, photoOnly=false, detailReturn='memories', detailScroll=0, historyReturn='favorites', historyScroll=0;
let pendingSeek=null, shouldPlay=false, completed=0, seeks=0, lastSeek=0, toastTimer, successTimer, nudgeTimer, saving=false;
const liked=new Set();
let queueIDs=null, queueTab='playing', queueEditing=false;
const queueSelection=new Set();
// shortcut: 足迹只记录当前页面会话；接入客户端后使用真实听歌历史。
let recentSongIDs=[];
let shareTheme='paper', shareGeneration=0, shareFile=null, favoriteScroll=0, pickerScroll=0;
const WEEKDAYS=['周日','周一','周二','周三','周四','周五','周六'];
const bySong = id => state.songs.find(s=>s.id===id);
const current = () => bySong(currentID);
const memories = id => newest(state.memories.filter(m=>m.song_id===id));
const byMemory = id => state.memories.find(m=>m.id===id);
const photos = m => m.photo_urls?.length ? m.photo_urls : m.photo_url ? [m.photo_url] : [];
const filteredMemories = ms => photoOnly ? ms.filter(m=>photos(m).length) : ms;
// Reference artwork and titles identify the product mockup; demo audio stays explicitly labeled.
function track(s){if(!s)return {title:'选择歌曲',artist:'',cover:'/prd-player.jpg'};const legacy={'demo-a':['我讨厌坏天气','Piggy','/prd-player.jpg'],'demo-b':['孤独的总和','吴汶芳','/prd-rain.jpg'],'demo-c':['日落与海','陈听雨','/prd-sunset.jpg']}[s.id];if(s.sample&&legacy)return {...s,title:legacy[0],artist:legacy[1],cover:legacy[2]};return {...s,cover:s.cover_url||'/prd-rain.jpg'};}
function songInline(s,play=false){const t=track(s);return `<div class="song-inline"><img class="thumb" src="${esc(t.cover)}" alt="${esc(t.title)}封面"><div class="info"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div>${play?ib('play','play-song','播放歌曲',s.id,'play-round'):''}</div>`;}
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'操作失败，请稍后再试');return data;}
async function refresh(){const known=new Set(state.songs.map(s=>s.id));state=await api('/api/state');state.memories=state.memories.map(m=>({...m,scenes:m.scenes||[],photo_urls:m.photo_urls||[],visibility:m.visibility||'private'}));queueIDs=queueIDs===null?state.songs.map(s=>s.id):[...queueIDs.filter(id=>bySong(id)),...state.songs.filter(s=>!known.has(s.id)).map(s=>s.id)];}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function nav(v){if(v==='memories'&&['home','mine'].includes(view)){review='gallery';galleryStoryOpen=false;}if(view==='favorites')favoriteScroll=$('.favorites')?.scrollTop||0;view=v;location.hash=v;render();window.scrollTo(0,0);if(v==='favorites'&&$('.favorites'))$('.favorites').scrollTop=favoriteScroll;}
function openSheet(title,html,{back=false,right='',kind=''}={}){
  draftPanel=back?draftPanel:'';
  sheet.dataset.kind=kind;
  $('#sheet-head').innerHTML=`${back?ib('back','draft-back','返回创建面板','','back'):'<span class="sheet-spacer"></span>'}<h2>${esc(title)}</h2>${right||ib('close','close','关闭面板','','small')}`;
  $('#sheet-body').innerHTML=html;
  sheet.setAttribute('aria-labelledby','sheet-title');
  $('#sheet-head h2').id='sheet-title';
  if(!sheet.open)sheet.showModal();
  $('#sheet-body').scrollTop=0;
}
function closeSheet(){if(saving)return;sheet.close();draftPanel='';}
function render(){if(galleryFrame){cancelAnimationFrame(galleryFrame);galleryFrame=0;}document.body.classList.toggle('gallery-open',view==='memories'&&review==='gallery');app.innerHTML=({home:homePage,player:playerPage,mine:minePage,favorites:favoritesPage,memories:memoriesPage,history:historyPage,detail:detailPage,settings:settingsPage})[view]?.()||homePage();updatePlay();mountGallery();}
const avatar = () => `<span class="avatar"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#eaf5ff"/><path d="M12 64c0-16 8-23 20-23s20 7 20 23" fill="#8eb5e4"/><path d="M26 42v7l6 6 6-6v-7" fill="#f3d9cb"/><ellipse cx="32" cy="28" rx="15" ry="18" fill="#ffe8d8"/><path d="M16 29C9 6 42-4 49 20l-2 13-5-16c-8 11-16 4-22 12l-2 9Z" fill="#9caac2"/><path d="M25 31h2m10 0h2" stroke="#4c6082" stroke-width="2" stroke-linecap="round"/><path d="M29 37q3 3 6 0" fill="none" stroke="#d59d94" stroke-width="1.5"/></svg></span>`;
function appTabs(selected){
  return `<nav class="app-tabs" aria-label="主导航">${[['home','home','首页'],['live','live','直播'],['member','diamond','会员'],['benefit','benefit','福利'],['mine','user','我的']].map(([id,icon,label])=>`<button type="button" class="${selected===id?'selected':''}" ${id==='home'||id==='mine'?`data-act="nav" data-id="${id}"`:'aria-disabled="true"'} ${selected===id?'aria-current="page"':''}><span class="tab-icon">${id==='home'?'<span class="kugou-tab-logo">K</span>':svg(icon)}</span>${label}</button>`).join('')}</nav>`;
}
function mini(withTabs=false){
  const s=current(),t=track(s);
  return `<div class="mini-dock ${withTabs?'with-tabs':''}"><button class="mini-memory" data-act="compose"><span class="mini-seal">刻</span><span>让这首歌，记住此刻的你</span><b>记一笔 ${svg('chevron')}</b></button><div class="mini-player"><button class="mini-main" data-act="open-player" data-id="${esc(s?.id||'')}" aria-label="进入${esc(t.title)}播放页">${songInline(s)}</button>${ib('heart','like','喜欢歌曲',s?.id||'',`heart ${liked.has(s?.id)?'active':''}`)}${ib(audio.paused?'play':'pause','toggle','播放或暂停')}${ib('queue','queue','播放列表')}</div></div>`;
}
function sectionTitle(title,act='songs',id=''){
  return `<div class="section-title"><h2>${title}</h2><button data-act="${act}" data-id="${esc(id)}" aria-label="查看${title}">${svg('chevron')}</button></div>`;
}
function homePage(){
  const songs=state.songs,first=songs[0],daily=songs[1]||first;
  const feature=(song,title,cls)=>{const t=track(song);return `<button class="recommend-card ${cls}" data-act="play-song" data-id="${esc(song?.id||'')}"><h2>${title}</h2><p>${esc(t.title)} · ${esc(t.artist)}</p><span class="record-disc"></span><img src="${esc(t.cover)}" alt="${esc(t.title)}封面"><span class="card-play">${svg('play')}</span></button>`;};
  return `<section class="light-page home">${status()}<header class="home-header"><div class="home-channels"><button data-act="songs">刷歌<small>免费</small></button><button class="selected" aria-current="page">推荐</button><button data-act="songs">乐库</button><button data-act="songs">听书</button><button data-act="songs">儿童</button></div>${ib('menu','nav','设置','settings')}</header>
  <div class="home-content"><div class="search-row"><button class="search-box" data-act="songs"><span class="search-ai">♪</span><span>搜索喜欢的歌曲、歌手</span>${svg('search')}</button>${ib('clock','nav','我的声刻','memories')}${ib('note','songs','打开音乐库')}</div>
  <button class="listening-banner" data-act="open-player" data-id="${esc(currentID)}"><span>继续体验沉浸式播放，发现更多好音乐</span><b>播放</b></button>
  <div class="home-user"><button data-act="nav" data-id="mine">${avatar()}<b>zero</b><span class="member-badge">${svg('diamond')} 音乐相伴</span></button><button class="memory-link" data-act="nav" data-id="memories"><i></i>我的声刻 ${svg('chevron')}</button></div>
  <div class="recommendations">${feature(first,'猜你喜欢','warm')}${feature(daily,'每日推荐','blue')}<div class="small-recommendations"><button class="rank-card" data-act="songs"><b>音乐歌单</b>${svg('trophy')}<small>${songs.length} 首好歌</small></button><button class="collection-card" data-act="nav" data-id="memories"><b>声刻收藏</b>${svg('heart')}<small>${state.memories.length} 个瞬间</small></button></div></div>
  ${sectionTitle('你的专属歌单','nav','favorites')}<div class="playlist-grid">${songs.slice(0,6).map((song,i)=>{const t=track(song),count=memories(song.id).length;return `<button class="playlist-tile" data-act="${i<2?'nav':count?'full-history':'play-song'}" data-id="${i===0?'favorites':i===1?'memories':esc(song.id)}"><span class="tile-art"><img src="${esc(t.cover)}" alt="${esc(t.title)}封面"><small>${count?'声刻 · '+count+' 段回忆':'发现好音乐'}</small><i>${svg('play')}</i></span><b>${esc(i===0?'我喜欢的音乐':i===1?'那些被音乐记住的瞬间':t.title)}</b><span>${esc(t.artist)}</span></button>`;}).join('')}</div>
  ${sectionTitle('把生活，留在歌里','nav','memories')}<button class="home-memory-card" data-act="nav" data-id="memories"><span class="memory-card-icon">${svg('scene')}</span><span><b>我的声刻回忆</b><small>${state.memories.length} 个瞬间，${new Set(state.memories.map(m=>m.song_id)).size} 首有故事的歌</small></span>${svg('chevron')}</button></div>${mini(true)}${appTabs('home')}</section>`;
}
function playerScene(s,t,ms){
  if(playerPanel==='lyrics')return `<div class="lyrics-scene"><div class="lyric-heading"><h2>${esc(t.title)}</h2><p>${esc(t.artist)} <span>标准</span></p></div><div class="lyric-lines">${(s?.lyrics||[]).length?s.lyrics.map((l,i)=>`<button data-act="seek-line" data-id="${l.time}" data-lyric-index="${i}" class="lyric-line">${esc(l.text)}</button>`).join(''):'<div class="lyrics-empty">暂无时间轴歌词<small>让旋律，陪你停留一会儿</small></div>'}</div><small class="lyric-tip">${s?.sample?'演示音频 · 示例文案':'点击歌词，回到这一刻'}</small></div>`;
  if(playerPanel==='story')return `<div class="player-cards"><h2 class="scene-heading">音乐与我的故事</h2><article class="glass-card story-profile"><div class="profile-line">${avatar()}<div><b>zero</b><small>让每次心动，都有迹可循</small></div><strong>${ms.length}<small>个声刻</small></strong></div><button class="gold-button" data-act="compose">${svg('edit')} 记录此刻</button></article><article class="glass-card"><h3>这首歌的专属回忆</h3>${ms[0]?`<button class="story-note" data-act="detail" data-id="${esc(ms[0].id)}"><small>${esc(ms[0].date)} · ${esc(ms[0].mood)}</small><p>${esc(ms[0].note||'一个值得记住的音乐瞬间')}</p></button>`:'<p class="glass-description">第一次听到这首歌时，你想到了什么？</p>'}<button class="glass-row" data-act="full-history" data-id="${esc(s?.id||'')}"><span class="glass-icon">${svg('clock')}</span><span><b>情绪轨迹</b><small>重遇这首歌里的每一个自己</small></span>${svg('chevron')}</button></article></div>`;
  if(playerPanel==='related')return `<div class="player-cards"><h2 class="scene-heading">歌曲相关</h2><article class="glass-card related-info"><h2>${esc(t.title)}</h2><small class="release-note">${s?.created_at?esc(s.created_at.slice(0,10))+' 加入音乐库':'我的音乐库'}</small><div class="related-line"><img src="${esc(t.cover)}" alt=""><span>歌手</span><b>${esc(t.artist)}</b></div><div class="related-line"><span class="glass-icon">${svg('note')}</span><span>时长</span><b>${fmt(s?.duration)}</b></div><div class="related-line"><span class="glass-icon">${svg('phone')}</span><span>音频</span><b>${s?.sample?'原创合成演示音频':'本地上传音频'}</b></div><p class="glass-description">喜欢的旋律，会替你记住平凡生活里的闪光时刻。</p><button class="topic-tag" data-act="full-history" data-id="${esc(s?.id||'')}"># 这首歌的声刻回忆 ${svg('chevron')}</button></article><article class="glass-card"><h3>声刻数据</h3><div class="related-stats"><span><b>${ms.length}</b><small>记忆瞬间</small></span><span><b>${new Set(ms.map(m=>m.date)).size}</b><small>记录天数</small></span><span><b>${ms.reduce((n,m)=>n+photos(m).length,0)}</b><small>珍藏照片</small></span></div><button class="glass-row" data-act="full-history" data-id="${esc(s?.id||'')}"><span>查看这首歌的全部回忆</span>${svg('chevron')}</button></article></div>`;
  return `<div class="cover-scene"><div class="cover-caption"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div></div>`;
}
function playerPage(){
  const s=current(),t=track(s),ms=memories(currentID);
  return `<section class="player panel-${playerPanel}"><div class="player-art" style="background-image:url('${esc(t.cover)}')"></div>${status()}
  <div class="top">${ib('down','nav','返回首页','home')}
  <nav class="player-pagination" aria-label="播放器页面">${[['story','音乐故事'],['cover','歌曲封面'],['lyrics','歌词'],['related','歌曲相关']].map(([id,n])=>`<button data-act="player-panel" data-id="${id}" aria-label="${n}" aria-pressed="${playerPanel===id}" class="${playerPanel===id?'selected':''}"><span></span></button>`).join('')}</nav>
  <div class="right-tools">${ib('phone','nav','我的','mine')}${ib('share','song-share','分享歌曲记忆')}</div></div>
  <div class="player-space">${playerScene(s,t,ms)}</div>
  ${playerPanel==='cover'?`<div class="player-info"><div class="player-title"><h1>${esc(t.title)}</h1></div><div class="artist-line"><span>${esc(t.artist)}</span><button data-act="player-panel" data-id="related">歌曲信息 ${svg('chevron')}</button></div><div class="sound-tags"><button data-act="player-panel" data-id="lyrics">歌词</button><span>标准</span><span>立体声</span><span>${s?.sample?'演示音频':'本地音乐'}</span></div></div>`:''}
  <div class="player-bottom">${ib('lyric','player-panel','切换歌词','lyrics')}${ib('download','download-song','保存音频')}${ib('bell','entry','这首歌的声刻')}${ib('heart','like','喜欢歌曲',s?.id||'',`heart ${liked.has(s?.id)?'active':''}`)}${ib('comment','history-sheet','这首歌的记忆',currentID)}${ib('more','player-menu','歌曲选项')}<div id="nudge" class="nudge" hidden><button data-act="nudge-create">此刻想留下些什么？</button><button class="dismiss" data-act="nudge-close" aria-label="收起提醒">×</button></div></div>
  <div class="progress"><input id="seek" aria-label="播放进度" type="range" min="0" max="${s?.duration||40}" step=".1" value="${audio.currentTime||0}"><div class="time"><span id="current-time">${fmt(audio.currentTime)}</span><span>${fmt(s?.duration||0)}</span></div></div>
  <div class="transport">${ib('loop','loop','单曲循环','','loop-button')}${ib('prev','previous','上一首','','skip')}${ib(audio.paused?'play':'pause','toggle','播放或暂停','','play')}${ib('next','next','下一首','','skip')}${ib('queue','queue','播放列表')}</div>
  <div class="player-foot"><button data-act="compose"><span class="foot-diamond">${svg('diamond')}</span>让喜欢的歌，成为生活的记忆 <b>记一笔 ›</b></button></div></section>`;
}
function minePage(){
  const recent=[current(),...state.songs.filter(s=>s.id!==currentID)].filter(Boolean).slice(0,5);
  return `<section class="light-page mine">${status()}<header class="mine-header"><h1>音乐 <button data-act="nav" data-id="memories">声刻</button></h1><div>${ib('search','songs','找歌')}${ib('gift','nav','声刻回忆','memories')}${ib('mail','history-sheet','歌曲记忆',currentID)}${ib('menu','nav','设置','settings')}</div></header>
  <div class="mine-content">${memoryGateway()}<article class="profile-card"><div class="profile-line">${avatar()}<div><strong>zero</strong><small>音乐里的每一刻，都值得记住</small></div><button data-act="nav" data-id="settings">个人设置 ${svg('chevron')}</button></div><div class="profile-badges"><span class="member-badge">${svg('diamond')} 音乐相伴</span><span class="silver-badge">SOUND</span><span class="level-badge">♪ Lv.1</span><span class="purple-badge">✦ 声刻收藏家</span></div><button class="profile-membership" data-act="nav" data-id="memories"><span><b>我的音乐生活 ${svg('chevron')}</b><small>用旋律串起每一个值得收藏的瞬间</small></span><em>去回顾</em></button><div class="entry-row"><button data-act="listening"><strong>${Math.floor((state.events||[]).filter(e=>e.name==='song_played').length*40/60)}</strong><small>分钟 · 累计听歌</small></button><button data-act="leqian"><strong>乐签</strong><small>音乐日常</small></button><button data-act="nav" data-id="memories"><strong>声刻回忆 ${svg('chevron')}</strong><small>${state.memories.length} 个音乐瞬间</small></button></div></article>
  <div class="memory-invite"><span><b>今天，也记一笔</b><small>音乐心情</small><i><em></em></i></span><button data-act="compose">记此刻</button></div>
  <div class="shortcut-row">${[['heart','我喜欢','nav','favorites',state.songs.length],['download','本地/云盘','upload','',state.songs.filter(s=>!s.sample).length],['book','听书','songs','','—'],['bag','已购','songs','','—'],['note','全部','songs','',state.songs.length]].map(([icon,title,act,id,count])=>`<button data-act="${act}" data-id="${id}"><span class="shortcut-icon ${icon}">${svg(icon)}</span>${title}<small>${count}</small></button>`).join('')}</div>
  ${sectionTitle('最近播放')}<div class="recent-grid">${recent.map(s=>{const t=track(s);return `<button class="recent-tile" data-act="play-song" data-id="${esc(s.id)}"><span><img src="${esc(t.cover)}" alt="${esc(t.title)}封面"><small>单曲</small><i>${svg('play')}</i></span><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></button>`;}).join('')}</div>
  ${sectionTitle('我的歌单','nav','favorites')}<button class="my-playlist" data-act="nav" data-id="favorites"><span class="liked-cover">${svg('heart')}</span><span><b>我喜欢的音乐</b><small>${state.songs.length} 首 · ${state.memories.length} 段声刻记忆</small></span>${svg('chevron')}</button></div>${mini(true)}${appTabs('mine')}</section>`;
}
function favoritesPage(){return `<section class="page-dark favorites-page">${status()}${top('我喜欢的音乐','mine',ib('more','songs','歌单选项'))}<p class="playlist-count">${state.songs.length} 首</p><div class="favorites"><div class="list-tools">${ib('play','play-all','播放全部')}<span>播放全部 <small>(${state.songs.length})</small></span><span class="push"></span>${ib('download','upload','添加本地歌曲')}${ib('queue','queue','歌曲列表')}</div>${state.songs.map(s=>{const t=track(s),m=memories(s.id)[0];return `<div class="song-row"><button data-act="play-song" data-id="${s.id}" aria-label="播放${esc(t.title)}"><img class="thumb" src="${t.cover}" alt=""></button><div class="info"><div class="title-row"><button class="song-name" data-act="play-song" data-id="${s.id}">${esc(t.title)}</button>${m?`<button class="label" data-act="full-history" data-id="${s.id}">${esc(memoryLabel(memories(s.id)))}</button>`:''}</div><small>${esc(t.artist)} <span class="quality vip">VIP</span><span class="quality">MV</span></small></div>${ib('heart','like','喜欢歌曲',s.id)}${ib('more','song-menu','歌曲选项',s.id,'small')}</div>`;}).join('')}<div style="flex:1;min-height:90px"></div>${mini()}</div></section>`;}
function memoryCard(m){return `<article id="memory-${esc(m.id)}" class="memory-card"><div class="meta"><span><strong>${esc(m.date.slice(5).replace('-','.'))}</strong>　${esc(m.date.slice(0,4))} · ${esc(memoryTime(m))}${m.sample?' · 示例':''}</span>${ib('more','memory-menu','记忆选项',m.id,'small')}</div><button class="memory-read" data-act="detail" data-id="${m.id}"><p>${esc(m.note||m.mood)}</p></button>${photoHTML(m)}<div class="tags">${m.location?`<span class="pill">📍 ${esc(m.location)}</span>`:''}${m.mood?`<span class="pill mood">${toneIcon(m.mood)}${esc(m.mood)}</span>`:''}${m.scenes.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div></article>`;}
function photoHTML(m){return photos(m).length?`<div class="photos">${photos(m).map((p,index)=>`<button type="button" class="photo-thumb" data-act="photo-view" data-id="${esc(m.id)}|${index}" aria-label="查看${esc(m.date)}的第${index+1}张照片"><img src="${esc(p)}" alt="记忆照片"></button>`).join('')}</div>`:'';}
function openHistory(id=currentID){
  historyID=id;const ms=memories(id),t=track(bySong(id)),visible=filteredMemories(ms);
  openSheet('这首歌的记忆',`<div class="journal-hero"><img class="thumb" src="${esc(t.cover)}" alt="${esc(t.title)}封面"><div class="info"><div class="journal-kicker">MUSIC & MEMORIES</div><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div><span class="record-total">${String(ms.length).padStart(2,'0')}</span></div>${recordFilters(ms)}<div class="history-list">${visible.map(memoryCard).join('')||emptyRecords(photoOnly?'这首歌还没有有图的记录':'这首歌的故事，等你写下')}</div><div class="history-footer"><button class="primary" data-act="compose" data-id="${id}">＋ 新建一条记录</button></div>`,{kind:'journal'});
}
function recordFilters(ms){
  const photoCount=ms.filter(m=>photos(m).length).length;
  return `<div class="record-filters" role="group" aria-label="记录筛选"><button data-act="memory-filter" data-id="all" aria-pressed="${!photoOnly}">全部记录<span>${ms.length}</span></button><button data-act="memory-filter" data-id="photos" aria-pressed="${photoOnly}">只看有图<span>${photoCount}</span></button><small>${new Set(ms.map(m=>m.song_id)).size} 首歌</small></div>`;
}
function emptyRecords(title){return `<div class="empty"><b>${esc(title)}</b>${photoOnly?'切回全部记录，或在记录中添加照片。<button class="secondary" data-act="memory-filter" data-id="all">查看全部记录</button>':'听到心动的歌，就来记一笔。'}</div>`;}
function historyPage(){
  const ms=memories(historyID),visible=filteredMemories(ms);
  return `<section class="page-white history-screen">${status()}${top('声刻记忆',historyReturn,ib('more','history-options','更多'),'history-back')}<div class="history-page">${songInline(bySong(historyID),true)}<p class="history-summary">情绪轨迹 · ${ms.length} 段记忆</p>${recordFilters(ms)}${visible.map(memoryCard).join('')||emptyRecords(photoOnly?'这首歌还没有有图的记录':'这首歌还没有记忆')}<div class="sticky-bottom"><button class="primary" data-act="compose" data-id="${historyID}">再记一笔</button></div></div></section>`;
}
function photoViewer(key){
  const split=key.lastIndexOf('|'),m=byMemory(key.slice(0,split)),index=Number(key.slice(split+1)),src=photos(m||{})[index];if(!m||!src)return;
  photoReturn={key,historyID:sheet.open&&sheet.dataset.kind==='journal'?historyID:'',scroll:$('#sheet-body').scrollTop};
  openSheet('查看照片',`<div class="photo-view-stage"><img src="${esc(src)}" alt="${esc(m.date)} 的记忆照片"></div><div class="photo-view-meta"><small>${esc(m.date.replaceAll('-','.'))} · ${esc(memoryTime(m))}</small>${m.note?`<p>${esc(m.note)}</p>`:''}</div><div class="photo-view-actions"><button class="primary" data-act="photo-save" data-id="${esc(key)}"><span class="icon">${svg('download')}</span>保存图片</button></div>`,{kind:'photo-viewer',right:ib('close','photo-close','关闭照片')});
}
function closePhotoViewer(){
  const previous=photoReturn;photoReturn=null;
  if(previous?.historyID){openHistory(previous.historyID);$('#sheet-body').scrollTop=previous.scroll;}else closeSheet();
  $$('[data-act="photo-view"]',sheet.open?sheet:document).find(button=>button.dataset.id===previous?.key)?.focus({preventScroll:true});
}
async function savePhoto(key,button){
  const split=key.lastIndexOf('|'),m=byMemory(key.slice(0,split)),index=Number(key.slice(split+1)),src=photos(m||{})[index];if(!src)return;
  button.disabled=true;
  try{
    const response=await fetch(src);if(!response.ok)throw Error('图片暂时无法保存，请重试');
    const blob=await response.blob(),ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[blob.type]||'jpg';
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`声刻-${m.date}-${index+1}.${ext}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }finally{button.disabled=false;}
}
function dayEntry(m){return `<div class="day-entry"><div class="entry-song"><button data-act="detail" data-id="${m.id}" style="text-align:left;padding:0">${songInline(bySong(m.song_id))}</button><span class="pill mood">${m.mood?toneIcon(m.mood):''}${esc(m.mood||'此刻')}</span></div><button data-act="detail" data-id="${m.id}" style="text-align:left;padding:0;width:100%"><p>${esc(m.note||m.mood)}</p></button>${photoHTML(m)}</div>`;}
function calendar(){
  const records=filteredMemories(state.memories),[y,mo]=month.split('-').map(Number),start=new Date(y,mo-1,1).getDay(),count=new Date(y,mo,0).getDate();
  const cells=Array.from({length:start},()=>'<span></span>');
  for(let i=1;i<=count;i++){
    const date=`${month}-${String(i).padStart(2,'0')}`,ms=newest(records.filter(m=>m.date===date));
    cells.push(`<button class="${day===date?'selected':''}" data-act="day" data-id="${date}" aria-label="${date}${ms.length?'，'+ms.length+'条记忆':''}">${i}${ms.length?`<span class="day-mood">${emoji(ms[0].mood)}</span>`:''}</button>`);
  }
  const ms=newest(records.filter(m=>m.date===day));
  return `<div class="month-nav">${ib('back','month','上个月','-1')}<b>${y}年${mo}月</b><button class="icon" data-act="month" data-id="1" aria-label="下个月" style="transform:rotate(180deg)">${svg('back')}</button></div><div class="weekdays">${'日一二三四五六'.split('').map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar">${cells.join('')}</div><h3 class="day-heading">${+day.slice(5,7)}月${+day.slice(8)}日 · ${ms.length} 条记录</h3>${ms.map(dayEntry).join('')||emptyRecords(photoOnly?'这一天没有有图的记录':'这一天还没有留下声刻')}`;
}
function timeline(){
  const groups=new Map();
  newest(filteredMemories(state.memories)).forEach(m=>{if(!groups.has(m.song_id))groups.set(m.song_id,[]);groups.get(m.song_id).push(m);});
  return [...groups].map(([songID,ms])=>`<section class="timeline-group song-timeline" data-song-id="${esc(songID)}" aria-label="${esc(track(bySong(songID)).title)}的时间轴">
    <button class="timeline-song" data-act="full-history" data-id="${esc(songID)}" aria-label="查看${esc(track(bySong(songID)).title)}的记忆">${songInline(bySong(songID))}<span>${ms.length} 段记忆 ${svg('chevron')}</span></button>
    ${ms.map(m=>`<article class="timeline-row" data-memory-id="${esc(m.id)}">
      <time class="clock-col" datetime="${esc(m.date)}T${esc(memoryTime(m))}"><b>${esc(memoryTime(m))}</b><small>${esc(m.date.slice(0,4)===localDate().slice(0,4)?m.date.slice(5).replace('-','.'):m.date.replaceAll('-','.'))}</small></time>
      <div class="event"><div class="timeline-entry-head">${m.mood?`<span class="pill mood">${toneIcon(m.mood)}${esc(m.mood)}</span>`:'<span class="pill">此刻</span>'}${ib('more','memory-menu','记忆选项',m.id,'small')}</div><button class="timeline-read" data-act="detail" data-id="${esc(m.id)}"><p>${esc(m.note||m.mood||'留下了一段音乐记忆')}</p></button>${photoHTML(m)}<div class="timeline-tags">${m.scenes.map(label=>`<span class="pill">${esc(label)}</span>`).join('')}${m.location?`<span class="pill">📍 ${esc(m.location)}</span>`:''}</div></div>
    </article>`).join('')}</section>`).join('')||emptyRecords(photoOnly?'还没有有图的记录':'从第一条记录开始，留下你的音乐时间轴');
}
function ring(){const cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-2);const cutoffDate=localDate(new Date(cutoff.getFullYear(),cutoff.getMonth(),1));const list=state.memories.filter(m=>period==='all'||(period==='month'?m.date.slice(0,7)===localDate().slice(0,7):m.date>=cutoffDate));const counts=new Map();list.forEach(m=>counts.set(m.mood||'此刻',(counts.get(m.mood||'此刻')||0)+1));const dist=[...counts].sort((a,b)=>b[1]-a[1]),colors=['#7759ff','#16bbaa','#ff9d4c','#fa6288','#3888ff','#22ae70'];const days=new Set(list.map(m=>m.date)).size;const ringDays=[...new Set(newest(list).map(m=>m.date))].slice(0,7).map(d=>newest(list.filter(m=>m.date===d))[0]);const ringColors=Array.from({length:7},(_,i)=>`${ringDays[i]?colors[i%colors.length]:'#edf1f7'} ${i*360/7}deg ${(i+1)*360/7-3}deg, white ${(i+1)*360/7-3}deg ${(i+1)*360/7}deg`).join(',');return `<div class="periods">${[['month','本月'],['quarter','近3月'],['all','全部']].map(([id,name])=>`<button class="${period===id?'selected':''}" data-act="period" data-id="${id}">${name}</button>`).join('')}</div><div class="ring" style="background:conic-gradient(${ringColors})" aria-label="最近七个记录日的心情"><div class="center"><b>声刻</b><small>${period==='all'?'累计':'本期'} ${days} 天</small><em>${list.length?'音乐记得你的每一刻':'等待第一段音乐记忆'}</em></div>${ringDays.map((m,i)=>{const a=(i+.5)/7*Math.PI*2-Math.PI/2;return `<span class="ring-emoji" style="left:${50+43*Math.cos(a)}%;top:${50+43*Math.sin(a)}%">${emoji(m.mood)}</span>`;}).join('')}</div><div class="stats"><div><b>${list.length}</b><small>总记录数</small></div><div><b>${new Set(list.map(m=>m.song_id)).size}</b><small>涉及歌曲</small></div><div><b>${counts.size}</b><small>心情类型</small></div></div><div class="mood-bars"><h3>心情分布</h3>${dist.map(([name,n],i)=>`<div class="mood-bar"><span class="name">${emoji(name)} ${esc(name)}</span><div class="bar-track"><i style="width:${100*n/list.length}%;background:${colors[i%colors.length]}"></i></div><span class="percent">${Math.round(100*n/list.length)}%</span></div>`).join('')||'<div class="empty">这个周期还没有记录</div>'}</div><div class="keywords"><small>本期关键词</small>${dist.slice(0,3).map(([n])=>esc(n)).join(' · ')||'下一刻，从你开始'}</div>`;}
function gallerySongs(){return [...new Set(newest(state.memories).map(m=>m.song_id))].map(bySong).filter(Boolean);}
function galleryArt(song){return song?.cover_url&&!song.sample?song.cover_url:`/memory-covers/${String(Math.max(0,state.songs.findIndex(s=>s.id===song?.id))%13+1).padStart(2,'0')}.webp`;}
function memoryGateway(){
  const songs=gallerySongs();
  return `<button class="memory-gateway" data-act="nav" data-id="memories"><span class="gateway-copy"><small>声刻记忆 · MEMORY</small><strong>你的音乐，<br>有故事。</strong><span>${state.memories.length} 个瞬间，等你重逢 ${svg('chevron')}</span></span><span class="gateway-covers" aria-hidden="true">${(songs.length?songs:state.songs).slice(0,3).map(s=>`<img src="${esc(galleryArt(s))}" alt="">`).join('')}</span></button>`;
}
function galleryStory(song){
  const ms=memories(song.id),t=track(song);
  return `<div class="story-handle" aria-hidden="true"></div><header class="story-head"><span><small>${esc(t.artist)} · ${ms.length} 段记忆</small><h2>${esc(t.title)}</h2></span>${ib('close','gallery-close','收起记忆')}</header><div class="story-scroll">${ms.map(m=>`<article class="story-memory" data-memory-id="${esc(m.id)}"><div class="story-meta"><time datetime="${esc(m.date)}T${esc(memoryTime(m))}">${esc(m.date.replaceAll('-','.'))} · ${esc(memoryTime(m))}</time>${m.mood?`<span class="story-mood">${toneIcon(m.mood)} ${esc(m.mood)}</span>`:''}</div><p>${esc(m.note||'这一刻，旋律记得。')}</p>${photoHTML(m)}${m.scenes.length||m.location?`<div class="story-tags">${m.scenes.map(x=>`<span>${esc(x)}</span>`).join('')}${m.location?`<span>📍 ${esc(m.location)}</span>`:''}</div>`:''}<button class="story-edit" data-act="edit" data-id="${esc(m.id)}">编辑这段记忆 ${svg('chevron')}</button></article>`).join('')}<button class="story-add" data-act="compose" data-id="${esc(song.id)}">＋ 再记一笔</button></div>`;
}
function galleryMosaic(song,index){
  const offsets=[-3,-2,-1,2,0,3,1,4];
  return `<span class="mosaic-wall" aria-hidden="true">${offsets.map((offset,tile)=>{const neighbor=galleryItems[(index+offset+galleryItems.length)%galleryItems.length]||song;return `<span class="mosaic-tile mosaic-tile-${tile+1}"><img src="${esc(galleryArt(neighbor))}" alt="" draggable="false"></span>`;}).join('')}</span>`;
}
function memoryGalleryPage(){
  galleryItems=gallerySongs();
  if(!galleryItems.some(s=>s.id===galleryID))galleryID=galleryItems[Math.floor(galleryItems.length/2)]?.id||'';
  const active=bySong(galleryID),t=track(current());
  return `<section class="memory-gallery ${galleryStoryOpen?'story-open':''}"><div class="gallery-backdrop" aria-hidden="true"><img src="${esc(galleryArt(active))}" alt=""></div>${status()}
    <header class="gallery-top">${ib('back','nav','返回我的','mine')}<span>声刻记忆</span><button class="icon gallery-switch" data-act="gallery-mode" aria-label="切换到日历、歌曲时间轴和声刻环" title="切换到回顾视图"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v16H3zM3 10h18M9 4v16M14 14h4M14 17h4"/></svg></button></header>
    ${galleryItems.length?`<div class="coverflow-track" role="region" aria-label="歌曲记忆封面墙，左右滑动或按方向键切换" aria-roledescription="轮播" tabindex="0">${galleryItems.map((s,i)=>{const ms=memories(s.id);return `<div class="coverflow-item"><button class="coverflow-card" data-act="gallery-select" data-id="${esc(s.id)}" aria-label="选择${esc(track(s).title)}的记忆封面">${galleryMosaic(s,i)}<span class="coverflow-shade"></span><span class="coverflow-caption"><small>${esc(ms[0]?.date.replaceAll('-','.')||'')}</small><b>${esc(track(s).title)}</b><em>${ms.length} 段记忆</em></span></button></div>`;}).join('')}</div>
    <div class="gallery-footer"><div class="gallery-selection" aria-live="polite" aria-atomic="true"></div><div class="gallery-nav">${ib('back','gallery-step','上一张记忆封面','-1')}<span class="gallery-counter"></span><button class="icon gallery-next" data-act="gallery-step" data-id="1" aria-label="下一张记忆封面">${svg('chevron')}</button></div><div class="gallery-actions"><button class="gallery-open" data-act="gallery-open" data-id="${esc(active.id)}">翻开这首歌的记忆 ${svg('chevron')}</button><button class="gallery-listen" data-act="gallery-play" data-id="${esc(active.id)}" aria-label="播放选中的歌曲">${svg('play')}</button></div><p class="gallery-hint">滑动封面，轻触展开回忆</p></div>`:`<div class="gallery-empty"><div class="empty-cover-fan" aria-hidden="true">${[1,2,6].map(n=>`<img src="/memory-covers/${String(n).padStart(2,'0')}.webp" alt="">`).join('')}</div><h2>第一段回忆，从这首歌开始。</h2><p>写下一句话，让喜欢的旋律记住今天。</p><button class="gallery-open" data-act="compose">留下第一段声刻 ${svg('plus')}</button></div>`}
    ${current()?`<div class="gallery-dock"><button class="gallery-dock-song" data-act="open-player" data-id="${esc(currentID)}"><img src="${esc(t.cover)}" alt=""><span><small class="gallery-now-label">${audio.paused?'上次聆听':'正在播放'}</small><b>${esc(t.title)}</b></span></button>${ib(audio.paused?'play':'pause','toggle','播放或暂停')}</div>`:''}
    <section class="gallery-story" aria-label="歌曲记忆详情" aria-hidden="${galleryStoryOpen?'false':'true'}" ${galleryStoryOpen?'':'inert'}>${active?galleryStory(active):''}</section>
  </section>`;
}
function paintGallery(){
  galleryFrame=0;const stage=$('.coverflow-track');if(!stage||!galleryItems.length)return;
  const step=stage.firstElementChild.getBoundingClientRect().width,position=stage.scrollLeft/step,index=Math.max(0,Math.min(galleryItems.length-1,Math.round(position))),song=galleryItems[index];
  galleryID=song.id;
  [...stage.children].forEach((item,i)=>{const offset=i-position,button=item.firstElementChild;item.style.setProperty('--offset',String(Math.max(-1.5,Math.min(1.5,offset))));button.classList.toggle('is-selected',i===index);button.setAttribute('aria-pressed',String(i===index));button.tabIndex=i===index?0:-1;button.setAttribute('aria-label',`${i===index?'打开':'选择'}${track(galleryItems[i]).title}的记忆`);});
  const detail=$('.gallery-selection');
  if(detail.dataset.songId!==song.id){const ms=memories(song.id),t=track(song);detail.dataset.songId=song.id;detail.innerHTML=`<h2>${esc(t.title)}</h2><p>${esc(t.artist)} <span>${ms.length} 段记忆</span></p>`;$('.gallery-open').dataset.id=song.id;$('.gallery-listen').dataset.id=song.id;$('.gallery-counter').textContent=`${String(index+1).padStart(2,'0')} / ${String(galleryItems.length).padStart(2,'0')}`;$('.gallery-backdrop img').src=galleryArt(song);$('.gallery-story').innerHTML=galleryStory(song);updatePlay();}
}
function mountGallery(){
  const stage=$('.coverflow-track');if(!stage)return;
  stage.scrollLeft=Math.max(0,galleryItems.findIndex(s=>s.id===galleryID))*stage.firstElementChild.getBoundingClientRect().width;
  stage.onscroll=()=>{if(!galleryFrame)galleryFrame=requestAnimationFrame(paintGallery);};
  stage.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='End')scrollGallery(galleryItems[e.key==='Home'?0:galleryItems.length-1].id);else stepGallery(e.key==='ArrowLeft'?-1:1);}};
  let drag=null,suppressClick=false;
  stage.onpointerdown=e=>{suppressClick=false;if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:stage.scrollLeft,id:e.pointerId,moved:false};};
  stage.onpointermove=e=>{if(!drag)return;if(!e.buttons){finishDrag();return;}const delta=e.clientX-drag.x;if(Math.abs(delta)>5&&!drag.moved){drag.moved=true;stage.setPointerCapture(drag.id);stage.style.scrollSnapType='none';stage.classList.add('is-dragging');}if(drag.moved){e.preventDefault();stage.scrollLeft=drag.left-delta;}};
  const finishDrag=()=>{if(!drag)return;const moved=drag.moved;drag=null;stage.style.scrollSnapType='';stage.classList.remove('is-dragging');if(moved){suppressClick=true;paintGallery();scrollGallery(galleryID);}};
  stage.onpointerup=finishDrag;stage.onpointercancel=finishDrag;
  stage.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();}},true);
  paintGallery();
}
function scrollGallery(id){const stage=$('.coverflow-track'),index=galleryItems.findIndex(s=>s.id===id);if(!stage||index<0)return;stage.scrollTo({left:index*stage.firstElementChild.getBoundingClientRect().width,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function stepGallery(step){const index=galleryItems.findIndex(s=>s.id===galleryID);if(galleryItems.length)scrollGallery(galleryItems[(index+step+galleryItems.length)%galleryItems.length].id);}
function openGalleryStory(id){const song=bySong(id);if(!song)return;galleryStoryOpen=true;const stage=$('.memory-gallery'),panel=$('.gallery-story');stage.classList.add('story-open');panel.innerHTML=galleryStory(song);panel.inert=false;panel.setAttribute('aria-hidden','false');panel.querySelector('[data-act="gallery-close"]')?.focus({preventScroll:true});}
function closeGalleryStory(){galleryStoryOpen=false;$('.memory-gallery')?.classList.remove('story-open');const panel=$('.gallery-story');if(panel){panel.inert=true;panel.setAttribute('aria-hidden','true');}$('.coverflow-card.is-selected')?.focus({preventScroll:true});}
function memoriesPage(){
  if(review==='gallery')return memoryGalleryPage();
  return `<section class="page-white"><header class="memory-head">${status()}${top('我的声刻','mine',ib('menu','review','返回封面','gallery'))}<div class="hero"><h2>把生活的每一种情绪<br>都留在歌里</h2><p>${state.memories.length} 个音乐瞬间 · ${new Set(state.memories.map(m=>m.song_id)).size} 首歌 · ${new Set(state.memories.map(m=>m.mood).filter(Boolean)).size} 种心情</p></div></header><div class="memory-body"><nav class="tabs">${[['calendar','日历'],['timeline','歌曲时间轴'],['ring','声刻环']].map(([id,n])=>`<button class="${review===id?'selected':''}" data-act="review" data-id="${id}" aria-current="${review===id?'page':'false'}">${n}</button>`).join('')}</nav>${review==='calendar'||review==='timeline'?recordFilters(state.memories):''}${review==='calendar'?calendar():review==='timeline'?timeline():ring()}<div class="sticky-bottom"><button class="primary" data-act="compose">＋ 再记一笔</button></div></div></section>`;
}
function detailPage(){const m=byMemory(selectedMemory);if(!m)return memoriesPage();return `<section class="page-white">${status()}${top('声刻记忆',detailReturn,ib('more','memory-menu','更多',m.id),'detail-back')}<div class="detail-body"><div class="journal-kicker" style="margin-bottom:14px">MUSIC & MEMORIES</div>${songInline(bySong(m.song_id),true)}<article class="memory-card"><div class="meta"><span><strong>${esc(m.date.slice(5).replace('-','.'))}</strong>　${esc(m.date.slice(0,4))} · ${esc(memoryTime(m))}</span><span>${esc(privacy(m.visibility))}</span></div><p>${esc(m.note||m.mood)}</p>${photoHTML(m)}<div class="tags">${m.mood?`<span class="pill mood">${toneIcon(m.mood)}${esc(m.mood)}</span>`:''}${m.scenes.map(s=>`<span class="pill">${esc(s)}</span>`).join('')}${m.location?`<span class="pill">📍 ${esc(m.location)}</span>`:''}</div></article><div class="detail-actions"><button data-act="delete-confirm" data-id="${m.id}"><span class="icon">${svg('trash')}</span>删除</button><button data-act="edit" data-id="${m.id}"><span class="icon">${svg('edit')}</span>编辑</button><button data-act="share" data-id="${m.id}"><span class="icon">${svg('share')}</span>分享</button><button data-act="replay" data-id="${m.id}"><span class="icon">${svg('play')}</span>重听这一刻</button></div></div></section>`;}
function settingsPage(){return `<section class="page-white">${status()}${top('声刻设置','mine')}<div class="setting-block"><label>音乐情绪提醒<input id="hints" type="checkbox" ${state.settings.memory_hints?'checked':''}></label><p>在喜欢歌曲、重复播放、深夜听歌等时刻轻轻提醒。每种触发均有频控，每天最多三次；喜欢与被动提醒分开计算。</p><button class="form-row" data-act="upload">添加本地歌曲<span class="value">›</span></button><a class="form-row" href="/api/export" download>导出声刻记录<span class="value">↓</span></a><a class="form-row" href="/api/backup" download>完整备份<span class="value">↓</span></a><p class="footer-note">${document.documentElement.dataset.storage==='browser'?'浏览器演示版：记录、照片和歌曲仅保存在当前浏览器，清除本站数据会删除它们。请使用导出或完整备份保存重要记录。':'当前为课题演示环境，内置歌曲使用示例音频；酷狗账号、好友可见权限和微信直达分享等待宿主接口联调。'}</p></div></section>`;}
function compose(id=currentID,old=null){const s=bySong(old?.song_id||id)||current();if(!s)return songsPicker(false);draft={id:old?.id||'',song_id:s.id,position:old?.position??Math.min(audio.currentTime||0,s.duration),note:old?.note||'',mood:old?.mood||'',scenes:[...(old?.scenes||[])],location:old?.location||'',visibility:old?.visibility||'private',date:old?.date||localDate(),record_time:old?.record_time||localTime(),photo_urls:[...photos(old||{})],files:[],chapter_id:old?.chapter_id||''};showComposer();}
function retainDraft(){if($('#note'))draft.note=$('#note').value;}
function showComposer(){
  draftPanel='';
  openSheet(draft.id?'编辑音乐记忆':'创建音乐记忆',`<form id="composer">
  <div class="composer-intro"><small>MUSIC & MEMORIES</small><h3><span>此刻，值得被记住。</span></h3>${flowerDoodle}</div>
  <div class="paper-editor">
    <div class="compose-song">${songInline(bySong(draft.song_id))}<button class="change-song" type="button" data-act="change-song">换一首 ↻</button></div>
    <div class="paper-date" style="margin-top:14px"><strong>${draft.date.slice(5).replace('-','.')}</strong><span>${draft.date.slice(0,4)} · ${draft.record_time}</span><span class="weekday">${WEEKDAYS[new Date(draft.date+'T12:00:00').getDay()]}</span></div>
    <div class="note-box"><textarea id="note" rows="1" aria-label="记录此刻的想法" maxlength="1000" placeholder="今天听到这首歌，想起了什么？">${esc(draft.note)}</textarea><span class="word-count" id="word-count">${[...draft.note].length}/1000</span></div>
    ${draft.photo_urls.length||draft.files.length?draftPhotos():''}
    <div class="selected-tags">${draft.mood?`<span class="pill mood">${toneIcon(draft.mood)}${esc(draft.mood)}</span>`:''}${draft.scenes.map(s=>`<span class="pill">${esc(s)}</span>`).join('')}${draft.location?`<span class="pill">📍 ${esc(draft.location)}</span>`:''}</div>
  </div>
  <div class="compose-tools"><button type="button" data-act="pick-photos"><span class="icon">${svg('photo')}</span>照片</button><button type="button" data-act="pick-location"><span class="icon">${svg('pin')}</span>位置</button><button type="button" data-act="pick-mood"><span class="icon">${svg('smile')}</span>心情</button><button type="button" data-act="pick-scenes"><span class="icon">${svg('scene')}</span>场景</button></div>
  <div class="composer-meta"><button type="button" class="form-row" data-act="pick-privacy"><span class="icon small">${svg('lock')}</span>可见范围<span class="value">${privacy(draft.visibility)}</span><span class="chevron">›</span></button><button type="button" class="form-row" data-act="pick-time"><span class="icon small">${svg('clock')}</span>记录时间<span class="value">${draft.date} ${draft.record_time}</span><span class="chevron">›</span></button></div>
  <div id="form-error" class="form-error" role="alert"></div><div class="composer-actions"><button type="submit" class="primary">${draft.id?'保存这页记忆':'留下这一刻'}</button></div></form>`,{kind:'compose'});
  resizeNote();
}
function resizeNote(){const note=$('#note');if(note){note.style.height='auto';note.style.height=note.scrollHeight+'px';}}
function draftPhotos(){return `<div class="photo-strip">${draft.photo_urls.map((u,i)=>`<span class="photo-item"><img src="${esc(u)}" alt="已添加的照片"><button type="button" data-act="remove-photo" data-id="url-${i}" aria-label="移除照片">×</button></span>`).join('')}${draft.files.map((f,i)=>`<span class="photo-item"><img src="${f.url}" alt="待上传的照片"><button type="button" data-act="remove-photo" data-id="file-${i}" aria-label="移除照片">×</button></span>`).join('')}</div>`;}
function picker(type){retainDraft();draftPanel=type;expanded=false;pickerScroll=0;showPicker(type);}
function showPicker(type){
  const isMood=type==='mood',list=isMood?MOODS:SCENES,choices=expanded?list:list.slice(0,8),selected=isMood?[draft.mood]:draft.scenes;
  const extra=selected.filter(s=>s&&!choices.some(x=>x[1]===s));
  openSheet(isMood?'选择心情':'选择场景',`<p class="picker-hint">${isMood?'听见此刻的自己':'记录发生在什么地方？'}<span class="selected-count">${isMood?'单选':`已选 ${draft.scenes.length}/3`}</span></p><div class="picker-grid">${[...choices,...extra.map(n=>['',n])].map(([,n])=>`<button aria-pressed="${selected.includes(n)}" class="${selected.includes(n)?'selected':''}" data-act="pick-${type}-item" data-id="${esc(n)}">${toneIcon(n)}<span>${esc(n)}</span></button>`).join('')}${!expanded?'<button data-act="expand" aria-label="更多"><span class="icon">'+svg('more')+'</span><span>更多</span></button>':''}</div><div class="picker-footer"><input id="custom-choice" class="text-field" maxlength="20" aria-label="自定义${isMood?'状态':'场景'}" placeholder="＋ 自定义${isMood?'状态':'场景'}"><button class="primary" data-act="picker-done">完成${isMood?'':`（${draft.scenes.length}/3）`}</button></div>`,{back:true,kind:'picker'});
  draftPanel=type;
  $('#sheet-body').scrollTop=pickerScroll;
}
function locationPicker(){retainDraft();draftPanel='location';openSheet('选择位置',`<input class="text-field" id="location" maxlength="80" placeholder="搜索位置（如：上海·徐汇区）" value="${esc(draft.location)}"><button class="row-choice" data-act="location-clear"><span class="icon">${svg('pin')}</span><div class="copy"><b>不显示位置</b><small>也可以手动填写你想记住的地点</small></div></button><button class="primary" data-act="location-done" style="margin-top:22px">确定</button>`,{back:true});draftPanel='location';}
function privacyPicker(){retainDraft();draftPanel='privacy';openSheet('可见范围',`<div>${[['public','公开','所有人可见','smile'],['private','仅自己可见','只有自己可见','lock'],['friends','好友可见','互相关注的好友可见','comment']].map(([id,title,copy,ico])=>`<button class="row-choice" data-act="privacy-item" data-id="${id}"><span class="icon">${svg(ico)}</span><span class="copy"><b>${title}</b><small>${copy}</small></span>${draft.visibility===id?'<span class="check">●</span>':''}</button>`).join('')}</div>`,{back:true});draftPanel='privacy';}
function timePicker(){retainDraft();draftPanel='time';openSheet('修改记录时间',`<label class="muted tiny">记录日期<input id="record-date" class="text-field" type="date" min="1900-01-01" max="${localDate()}" value="${draft.date}" aria-label="记录日期"></label><label class="muted tiny">记录时间<input id="record-time" class="text-field" type="time" value="${draft.record_time}" aria-label="记录时间"></label><button class="primary" data-act="time-done">确定</button>`,{back:true});draftPanel='time';}
function photoPicker(){retainDraft();draftPanel='photos';openSheet('添加图片',`<p class="picker-hint">最多 3 张，把此刻的画面也留下</p>${draftPhotos()}<label class="photo-input-label"><span class="icon">${svg('photo')}</span>从相册中选择<input id="photo-files" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="选择图片"></label><p class="picker-hint">支持 JPG / PNG / WebP，每张不超过 8 MB</p><div class="form-error" id="photo-error"></div><button class="primary" data-act="draft-back">完成（${draft.photo_urls.length+draft.files.length}/3）</button>`,{back:true});draftPanel='photos';}
function songsPicker(forDraft=false){if(forDraft)retainDraft();sheetReturn=forDraft?'draft':null;openSheet(forDraft?'选择关联歌曲':'播放列表',`<div class="song-search-field"><span class="icon">${svg('search')}</span><input class="text-field" id="song-search" placeholder="搜索歌曲、歌手" aria-label="搜索歌曲"></div><p class="song-count">我的音乐 · ${state.songs.length} 首</p><div id="song-results">${songChoices(forDraft)}</div><button class="sheet-cancel" data-act="upload">＋ 添加本地歌曲</button>`,{back:forDraft,kind:'songs'});}
function songChoices(forDraft,q=''){return state.songs.filter(s=>`${track(s).title} ${track(s).artist}`.toLowerCase().includes(q.trim().toLowerCase())).map(s=>{const selected=(forDraft?draft.song_id:currentID)===s.id,t=track(s);return `<button class="row-choice song-pick" data-act="${forDraft?'draft-song':'play-song'}" data-id="${s.id}" aria-pressed="${selected}"><img class="thumb" src="${esc(t.cover)}" alt=""><div class="copy"><b class="${selected?'active-title':''}">${esc(t.title)}</b><small>${esc(t.artist)} <span class="quality">VIP</span></small></div><span class="row-end">${selected?'<span class="check">✓</span>':'<span class="icon">'+svg('play')+'</span>'}</span></button>`;}).join('')||'<div class="empty">没有找到歌曲</div>';}
function showPlaybackQueue(scroll=0){
  const songs=(queueTab==='recent'?recentSongIDs:queueIDs||[]).map(bySong).filter(Boolean);
  const tabs=[['playing','正在播放'],['recent','单曲足迹'],['playlists','歌单足迹']];
  const index=(queueIDs||[]).indexOf(currentID);
  const rows=songs.map(s=>{
    const t=track(s),active=s.id===currentID,selected=queueSelection.has(s.id);
    return `<div class="queue-row ${active?'current-song':''}"><button class="queue-main" data-act="${queueEditing?'queue-select':'queue-play'}" data-id="${esc(s.id)}" aria-label="${queueEditing?'选择':'播放'}${esc(t.title)}" ${queueEditing?`aria-pressed="${selected}"`:''}><span class="queue-cover"><img src="${esc(t.cover)}" alt="">${active?'<span class="queue-now" aria-hidden="true"><i></i><i></i><i></i></span>':''}</span><span class="queue-song-info"><b>${esc(t.title)}</b><small>${esc(t.artist)} ${s.sample?'<em>示例</em>':''}</small></span></button>${queueEditing?`<button class="queue-check ${selected?'checked':''}" data-act="queue-select" data-id="${esc(s.id)}" aria-label="${selected?'取消选择':'选择'}${esc(t.title)}" aria-pressed="${selected}">${selected?'✓':''}</button>`:`${ib('heart','like','喜欢'+t.title,s.id,`heart ${liked.has(s.id)?'active':''}`)}${queueTab==='playing'?ib('close','queue-remove','移出播放列表：'+t.title,s.id,'queue-remove'):'<span class="queue-remove-spacer"></span>'}`}</div>`;
  }).join('');
  const footprints=recentSongIDs.length?`<button class="queue-playlist" data-act="queue-tab" data-id="playing"><span class="queue-playlist-cover">${svg('queue')}</span><span><b>我的音乐</b><small>${(queueIDs||[]).length} 首 · 最近播放的歌单</small></span>${svg('chevron')}</button>`:'<div class="empty"><b>还没有歌单足迹</b>播放音乐后，在这里回到你的歌单。</div>';
  openSheet('播放列表',`<nav class="queue-tabs" aria-label="播放列表分类">${tabs.map(([id,title])=>`<button data-act="queue-tab" data-id="${id}" aria-pressed="${queueTab===id}" class="${queueTab===id?'selected':''}">${title}</button>`).join('')}</nav><div class="queue-notice"><span class="queue-seal">刻</span><span>听到喜欢的歌，留住此刻心情</span><button data-act="compose">记一笔</button></div><div class="queue-source"><span>${svg('note')} 来自：我的音乐</span><small>${queueTab==='playing'?`当前 ${index<0?0:index+1}/${(queueIDs||[]).length}`:queueTab==='recent'?`${recentSongIDs.length} 首足迹`:''}</small></div><div class="queue-list">${queueTab==='playlists'?footprints:rows||`<div class="empty"><b>${queueTab==='recent'?'还没有单曲足迹':'播放列表已清空'}</b>${queueTab==='recent'?'播放过的歌曲会出现在这里。':'可以从音乐库重新添加喜欢的歌。'}</div>`}</div><footer class="queue-toolbar"><button data-act="${queueEditing?'queue-select-all':'queue-loop'}"><span>${svg(queueEditing?'scene':'loop')}</span><small class="queue-order-label">${queueEditing?(queueSelection.size===songs.length&&songs.length?'取消全选':'全选'):(audio.loop?'单曲循环':'顺序')}</small></button><button data-act="queue-edit"><span>${svg(queueEditing&&queueSelection.size?'trash':'edit')}</span><small>${queueEditing?(queueSelection.size?'删除 '+queueSelection.size:'完成'):'编辑'}</small></button><button data-act="queue-tab" data-id="recent"><span class="queue-recent-icon">${svg('scene')}<i>${recentSongIDs.length}</i></span><small>最近</small></button><button data-act="close"><span>${svg('down')}</span><small>收起</small></button></footer>`,{kind:'queue'});
  $('.queue-list').scrollTop=scroll;
  updatePlay();
}
function removeFromQueue(ids){
  const removed=new Set(ids),index=(queueIDs||[]).indexOf(currentID),playing=!audio.paused,scroll=$('.queue-list')?.scrollTop||0;
  queueIDs=(queueIDs||[]).filter(id=>!removed.has(id));queueSelection.clear();
  if(removed.has(currentID)){
    if(queueIDs.length)selectSong(queueIDs[Math.min(Math.max(index,0),queueIDs.length-1)],playing);
    else audio.pause();
    render();
  }
  showPlaybackQueue(scroll);
}
async function publish(){
  if(saving)return;retainDraft();
  if(!draft.note.trim()&&!draft.mood&&!draft.photo_urls.length&&!draft.files.length){$('#form-error').textContent='写一句话、选择心情或添加图片，留住这一刻吧';return;}
  saving=true;const button=$('#composer .primary');button.disabled=true;button.textContent='正在保存…';
  try{
    for(const entry of [...draft.files]){const form=new FormData();form.append('file',entry.file);const result=await api('/api/photos','POST',form);draft.photo_urls.push(result.url);URL.revokeObjectURL(entry.url);draft.files.splice(draft.files.indexOf(entry),1);}
    const {id,files,...body}=draft;body.photo_url=body.photo_urls[0]||'';
    const result=await api('/api/memories'+(id?'/'+id:''),id?'PUT':'POST',body);
    await refresh();day=body.date;month=day.slice(0,7);if(currentID!==body.song_id)selectSong(body.song_id);
    saving=false;draft=null;nav('player');showSuccess(result.id,!!id);
  }catch(e){$('#form-error').textContent=e.message;button.disabled=false;button.textContent=draft.id?'保存这页记忆':'留下这一刻';saving=false;}
}
function showSuccess(id,edited){
  $('#success').hidden=true;clearTimeout(successTimer);
  const m=byMemory(id);
  openSheet('记忆已保存',`<div class="success-content"><div class="success-symbol">✓</div><h3>${edited?'这页记忆，已更新':'这一刻，已经好好收藏。'}</h3><p>以后再听到这首歌，就能遇见今天的自己。</p><div class="success-song">${songInline(bySong(m.song_id))}</div><button class="primary" data-act="share" data-id="${id}"><span class="icon">${svg('share')}</span>分享这份记忆</button><button class="later" data-act="close">留给自己，继续听歌</button></div>`,{kind:'success'});
}
function showShare(id){shareID=id;shareType='card';shareTheme='ocean';$('#success').hidden=true;return shareOptions();}
async function shareOptions(){
  const m=byMemory(shareID);if(!m)return;
  const generation=++shareGeneration;shareURL='';shareFile=null;
  openSheet('分享声刻记忆',`<div class="share-format"><button data-act="share-type" data-id="card" aria-pressed="${shareType==='card'}" class="${shareType==='card'?'selected':''}">声刻卡片</button><button data-act="share-type" data-id="status" aria-pressed="${shareType==='status'}" class="${shareType==='status'?'selected':''}">轻量心情</button></div><div class="share-stage"><span class="share-loading" role="status">正在装裱这份记忆…</span><img class="share-image" id="live-share-image" alt="声刻分享卡预览" hidden></div><div class="share-themes">${[['paper','手账'],['ocean','海盐'],['rose','落日'],['night','夜曲']].map(([id,n])=>`<button data-act="share-theme" data-id="${id}" aria-pressed="${shareTheme===id}"><span class="theme-thumb ${id}"></span>${n}</button>`).join('')}</div><div class="share-destinations"><button data-act="native-share" disabled><span class="sym wechat">●</span>微信好友</button><button data-act="native-share" disabled><span class="sym">◈</span>朋友圈</button><button data-act="save-share" disabled><span class="sym icon">${svg('download')}</span>保存图片</button><button data-act="native-share" disabled><span class="sym icon">${svg('more')}</span>更多</button></div><p class="share-note">保存图片，分享给想念的人</p>`,{kind:'share'});
  try{
    const canvas=await cardCanvas(m,{theme:shareTheme,type:shareType});
    const dataURL=canvas.toDataURL('image/png'),blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(generation!==shareGeneration||!sheet.open||sheet.dataset.kind!=='share')return;
    shareURL=dataURL;shareFile=new File([blob],'声刻记忆.png',{type:'image/png'});
    const img=$('#live-share-image');img.src=dataURL;img.hidden=false;$('.share-loading').remove();
    $$('.share-destinations button').forEach(b=>b.disabled=false);
  }catch(e){if(generation===shareGeneration&&sheet.dataset.kind==='share')$('.share-stage').innerHTML='<button class="share-retry" data-act="share-options">生成失败，点击重试</button>';}
}
async function cardCanvas(m,{theme=shareTheme,type=shareType}={}){
  const palettes={paper:['#f8f0db','#efe4c6','#455b61','#9c9c83'],ocean:['#d8e8e7','#a7c8ce','#2b5261','#718f95'],rose:['#f6e5df','#e4bab0','#724f53','#ad8285'],night:['#334960','#172838','#edf0e5','#adbac0']};
  const [a,b,ink,muted]=palettes[theme]||palettes.paper;
  const t=track(bySong(m.song_id)),c=document.createElement('canvas'),x=c.getContext('2d');c.width=720;
  x.font='30px sans-serif';const lines=[];let line='';const content=type==='status'?(m.note||m.mood).slice(0,100):(m.note||m.mood);
  for(const ch of content){if(ch==='\n'||x.measureText(line+ch).width>590){lines.push(line);line=ch==='\n'?'':ch;}else line+=ch;}if(line)lines.push(line);
  const hasPhotos=type==='card'&&photos(m).length>0,photoHeight=hasPhotos?235:0;
  c.height=Math.max(type==='status'?850:1000,500+lines.length*48+photoHeight);
  const g=x.createLinearGradient(0,0,720,c.height);g.addColorStop(0,a);g.addColorStop(1,b);x.fillStyle=g;x.fillRect(0,0,720,c.height);
  x.strokeStyle=theme==='night'?'#ffffff0b':'#72857a18';x.lineWidth=1;
  for(let y=196;y<c.height-245;y+=48){x.beginPath();x.moveTo(49,y);x.lineTo(671,y);x.stroke();}
  x.fillStyle=muted;x.font='17px sans-serif';x.fillText('KUGOU  /  MUSIC & MEMORIES',52,61);x.fillText('声刻 · 我的音乐手记',52,c.height-41);
  x.fillStyle=ink;x.font='italic 48px Georgia';x.fillText(m.date.slice(5).replace('-','.'),52,138);x.font='18px sans-serif';x.fillText(m.date.slice(0,4)+'  '+memoryTime(m),230,132);
  x.font='30px sans-serif';lines.forEach((l,i)=>x.fillText(l,53,224+i*48));
  let py=250+lines.length*48;
  if(hasPhotos){for(const [i,p] of photos(m).entries()){try{const img=await loadImage(p),side=Math.min(img.width,img.height);x.save();x.translate(145+i*216,py+102);x.rotate((i%2?3:-3)*Math.PI/180);x.shadowColor='#223a4926';x.shadowBlur=9;x.shadowOffsetY=5;x.fillStyle='#fff';x.fillRect(-92,-102,184,217);x.shadowColor='transparent';x.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,-84,-94,168,174);x.restore();}catch{}}}
  x.fillStyle=muted;x.font='18px sans-serif';x.fillText([m.mood,...(type==='card'?m.scenes:[])].filter(Boolean).join(' · '),53,c.height-292,604);
  if(type==='card'&&m.location)x.fillText('📍 '+m.location,53,c.height-263,604);
  x.fillStyle=theme==='night'?'#ffffff18':'#ffffff96';x.fillRect(39,c.height-226,642,140);
  try{const cover=await loadImage(t.cover);const size=Math.min(cover.width,cover.height);x.drawImage(cover,(cover.width-size)/2,(cover.height-size)/2,size,size,59,c.height-205,98,98);}catch{}
  x.fillStyle=ink;x.font='600 27px sans-serif';x.fillText(t.title,178,c.height-166,475);x.fillStyle=muted;x.font='20px sans-serif';x.fillText(t.artist,178,c.height-131,475);
  return c;
}
const loadImage = src => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
async function sharePreview(){return shareOptions();}
async function nativeShare(){if(!shareFile)return;if(navigator.canShare?.({files:[shareFile]})){await navigator.share({files:[shareFile],title:'我的声刻记忆'});}else{$('.share-note').textContent='当前浏览器请先保存图片，再在微信中发送';}}
function selectSong(id,play=false,position=null){const s=bySong(id);if(!s)return;if(queueIDs&&!queueIDs.includes(id))queueIDs.push(id);const changed=currentID!==id||audio.getAttribute('src')!==s.audio_url;currentID=id;try{sessionStorage.setItem('shengke.prd.song',id);}catch{}if(changed){audio.pause();pendingSeek=position??0;shouldPlay=play;audio.src=s.audio_url;audio.load();completed=0;seeks=0;}else{if(position!==null)audio.currentTime=Math.min(position,s.duration);if(play)audio.play().catch(()=>toast('点按播放开始听歌'));}if(view==='player')render();}
function updatePlay(){
  $$('[data-act="toggle"]').forEach(p=>p.innerHTML=svg(audio.paused?'play':'pause'));
  const galleryPlay=$('[data-act="gallery-play"]');if(galleryPlay){const playing=currentID===galleryPlay.dataset.id&&!audio.paused;galleryPlay.innerHTML=svg(playing?'pause':'play');galleryPlay.setAttribute('aria-label',`${playing?'暂停':'播放'}${track(bySong(galleryPlay.dataset.id)).title}`);}
  const galleryNow=$('.gallery-now-label');if(galleryNow)galleryNow.textContent=audio.paused?'上次聆听':'正在播放';
  const pos=$('#seek');
  if(pos){if(document.activeElement!==pos)pos.value=audio.currentTime||0;pos.style.setProperty('--progress',((audio.currentTime||0)/(current()?.duration||40)*100)+'%');}
  if($('#current-time'))$('#current-time').textContent=fmt(audio.currentTime);
  const lines=current()?.lyrics||[];
  const active=lines.findLastIndex(l=>l.time<=audio.currentTime);
  $$('.lyric-line').forEach((el,i)=>el.classList.toggle('is-current',i===active));
  const loop=$('.loop-button');if(loop){loop.classList.toggle('active',audio.loop);loop.setAttribute('aria-pressed',String(audio.loop));}
  $$('.queue-now').forEach(el=>el.classList.toggle('is-playing',!audio.paused));
  const order=$('.queue-order-label');if(order&&!queueEditing)order.textContent=audio.loop?'单曲循环':'顺序';
}
function hint(reason,source='passive'){if(view!=='player'||sheet.open||!state.settings.memory_hints)return;let stored={};try{stored=JSON.parse(localStorage.getItem('shengke.prd.hints')||'{}');}catch{}const now=Date.now(),songKey=source==='like'?`like:${currentID}`:currentID;if(now-(stored[songKey]||0)<86400000)return;const todayKey=localDate();if((stored[todayKey]||0)>=3)return;stored[songKey]=now;if(source==='like')stored[currentID]=now;stored[todayKey]=(stored[todayKey]||0)+1;try{localStorage.setItem('shengke.prd.hints',JSON.stringify(stored));}catch{}const n=$('#nudge');if(!n)return;n.querySelector('[data-act="nudge-create"]').textContent=reason||'此刻想留下些什么？';n.hidden=false;clearTimeout(nudgeTimer);nudgeTimer=setTimeout(()=>{n.hidden=true;},4500);}
function memoryMenu(id){const choices=[['share','分享记忆','share'],['detail','查看完整记忆','scene'],['replay','重听这一刻','play'],['edit','编辑记忆','edit'],['copy','复制文案','lyric'],['delete-confirm','删除记忆','trash']];openSheet('这段记忆',choices.map(([act,n,ico])=>`<button class="row-choice" data-act="${act}" data-id="${id}" ${act==='delete-confirm'?'style="color:#d46c70"':''}><span class="icon">${svg(ico)}</span>${n}</button>`).join('')+'<button class="sheet-cancel" data-act="close">取消</button>');}
function upload(){openSheet('添加本地歌曲',`<form id="upload" class="upload-form"><label>音频文件<input id="audio-file" type="file" accept="audio/*" required></label><label>歌曲名<input class="text-field" name="title" maxlength="120" required></label><label>歌手<input class="text-field" name="artist" maxlength="120"></label><p class="picker-hint">仅使用你有权播放的文件，最大 52 MB。</p><div id="upload-error" class="form-error"></div><button class="primary" type="submit">添加歌曲</button></form>`);}
const actions={
 nav:nav,close:closeSheet,
 'gallery-mode':()=>{galleryStoryOpen=false;review='calendar';render();},
 'gallery-select':id=>{if(galleryID===id)openGalleryStory(id);else scrollGallery(id);},
 'gallery-step':id=>stepGallery(Number(id)),
 'gallery-open':openGalleryStory,
 'gallery-close':closeGalleryStory,
 'gallery-play':async id=>{if(currentID===id){if(audio.paused)await audio.play();else audio.pause();}else{selectSong(id,true);render();}},
 'player-panel':id=>{if(!['cover','lyrics','story','related'].includes(id))return;playerPanel=id;render();},
 'download-song':()=>{const s=current();if(!s)return;const a=document.createElement('a');a.href=s.audio_url;a.download=track(s).title;a.click();},
 entry:()=>memories(currentID).length?openHistory():compose(),compose:id=>compose(id||currentID),edit:id=>compose('',byMemory(id)),
 'nudge-create':()=>{if($('#nudge'))$('#nudge').hidden=true;compose();},'nudge-close':()=>{$('#nudge').hidden=true;},
 toggle:()=>audio.paused?audio.play().catch(()=>toast('暂时无法播放，请重新选择歌曲')):audio.pause(),loop:()=>{audio.loop=!audio.loop;updatePlay();toast(audio.loop?'单曲循环已开启':'顺序播放');},previous:()=>step(-1),next:()=>step(1),
 like:id=>{if(liked.has(id))liked.delete(id);else{liked.add(id);hint('记下它打动你的那一刻','like');}$$(`[data-act="like"][data-id="${id}"]`).forEach(b=>{b.classList.toggle('active',liked.has(id));b.setAttribute('aria-pressed',String(liked.has(id)));});},
 queue:()=>{queueTab='playing';queueEditing=false;queueSelection.clear();showPlaybackQueue();},
 'queue-tab':id=>{if(!['playing','recent','playlists'].includes(id))return;queueTab=id;queueEditing=false;queueSelection.clear();showPlaybackQueue();},
 'queue-play':id=>{const scroll=$('.queue-list').scrollTop;selectSong(id,true);if(view!=='player')render();showPlaybackQueue(scroll);},
 'queue-remove':id=>removeFromQueue([id]),
 'queue-select':id=>{if(queueSelection.has(id))queueSelection.delete(id);else queueSelection.add(id);showPlaybackQueue($('.queue-list').scrollTop);},
 'queue-select-all':()=>{if(queueSelection.size===queueIDs.length)queueSelection.clear();else queueIDs.forEach(id=>queueSelection.add(id));showPlaybackQueue($('.queue-list').scrollTop);},
 'queue-edit':()=>{if(queueEditing&&queueSelection.size)return removeFromQueue([...queueSelection]);queueTab='playing';queueEditing=!queueEditing;queueSelection.clear();showPlaybackQueue($('.queue-list').scrollTop);},
 'queue-loop':()=>{audio.loop=!audio.loop;updatePlay();},
 songs:()=>songsPicker(false),'play-all':()=>{queueIDs=state.songs.map(s=>s.id);if(state.songs[0]){selectSong(state.songs[0].id,true);nav('player');}},'play-song':id=>{closeSheet();selectSong(id,true);nav('player');},'open-player':id=>{if(id&&id!==currentID)selectSong(id);nav('player');},
 'change-song':()=>songsPicker(true),'draft-song':id=>{draft.song_id=id;draft.position=0;showComposer();},'draft-back':showComposer,
 'pick-mood':()=>picker('mood'),'pick-scenes':()=>picker('scenes'),'pick-location':locationPicker,'pick-privacy':privacyPicker,'pick-time':timePicker,'pick-photos':photoPicker,
 'pick-mood-item':id=>{pickerScroll=$('#sheet-body').scrollTop;draft.mood=id;showPicker('mood');},'pick-scenes-item':id=>{pickerScroll=$('#sheet-body').scrollTop;if(draft.scenes.includes(id))draft.scenes=draft.scenes.filter(x=>x!==id);else{if(draft.scenes.length===3)return toast('最多选择 3 个场景');draft.scenes.push(id);}showPicker('scenes');},
 expand:()=>{expanded=true;showPicker(draftPanel);},'picker-done':()=>{const custom=$('#custom-choice').value.trim();if(custom){if(draftPanel==='mood')draft.mood=custom;else if(!draft.scenes.includes(custom)){if(draft.scenes.length===3)return toast('自定义场景也占一个名额，最多 3 个');draft.scenes.push(custom);}}showComposer();},
 'location-done':()=>{draft.location=$('#location').value.trim();showComposer();},'location-clear':()=>{draft.location='';showComposer();},'privacy-item':id=>{draft.visibility=id;showComposer();},
 'time-done':()=>{const d=$('#record-date'),t=$('#record-time');if(!d.value||!t.value||!d.checkValidity())return toast('请选择有效的日期和时间');draft.date=d.value;draft.record_time=t.value;showComposer();},
 'remove-photo':id=>{retainDraft();const [kind,n]=id.split('-');if(kind==='url')draft.photo_urls.splice(+n,1);else{URL.revokeObjectURL(draft.files[+n].url);draft.files.splice(+n,1);}draftPanel==='photos'?photoPicker():showComposer();},
 'full-history':id=>{if(view!=='history'){historyReturn=view;historyScroll=window.scrollY;}historyID=id;nav('history');},'history-back':()=>{nav(historyReturn);window.scrollTo(0,historyScroll);},'history-options':()=>openHistory(historyID),
 'photo-view':photoViewer,'photo-close':closePhotoViewer,'photo-save':savePhoto,
 'memory-filter':id=>{photoOnly=id==='photos';render();if(sheet.open&&sheet.dataset.kind==='journal')openHistory(historyID);},review:id=>{review=id;if(id==='gallery')galleryStoryOpen=false;render();},day:id=>{day=id;render();},month:id=>{const d=new Date(month+'-01T12:00:00');d.setMonth(d.getMonth()+Number(id));month=localDate(d).slice(0,7);day=month+'-01';render();},period:id=>{period=id;render();},
 detail:id=>{detailReturn=view;detailScroll=window.scrollY;selectedMemory=id;closeSheet();nav('detail');},'detail-back':()=>{nav(detailReturn);window.scrollTo(0,detailScroll);},'memory-menu':memoryMenu,replay:id=>{const m=byMemory(id);closeSheet();selectSong(m.song_id,true,m.position);nav('player');},
 share:showShare,'share-type':id=>{shareType=id;return shareOptions();},'share-theme':id=>{shareTheme=id;return shareOptions();},'save-share':()=>{if(!shareURL)return;const a=document.createElement('a');a.href=shareURL;a.download='声刻记忆.png';a.click();},'share-options':shareOptions,'share-preview':sharePreview,'native-share':nativeShare,
 'song-share':()=>{const m=memories(currentID)[0];m?showShare(m.id):compose();},copy:async id=>{await navigator.clipboard.writeText(byMemory(id).note);toast('文案已复制');},
 'delete-confirm':id=>openSheet('删除这条记忆？',`<p class="picker-hint">删除后无法在页面内恢复。</p><button class="primary" data-act="delete" data-id="${id}" style="margin:20px 0;background:#e65b6c">确认删除</button><button class="secondary" data-act="close" style="width:100%">取消</button>`),
 delete:async id=>{await api('/api/memories/'+id,'DELETE');await refresh();closeSheet();if(view==='detail')nav('memories');else render();toast('记忆已删除');},
 'player-menu':()=>{const ms=memories(currentID),m=ms[0];openSheet('歌曲选项',`<div class="collected-entry"><button class="memory-entry" data-act="entry" aria-label="${m?'查看这首歌的记忆':'创建音乐记忆'}">${m?(photos(m)[0]?`<img src="${esc(photos(m)[0])}" alt="">`:toneIcon(m.mood)):svg('plus')}${ms.length>0?`<span class="count">${ms.length}</span>`:''}</button></div><button class="row-choice" data-act="nav-close" data-id="favorites">我喜欢的音乐</button><button class="row-choice" data-act="nav-close" data-id="mine">我的</button>`);},
 'song-menu':id=>openSheet(track(bySong(id)).title,`<button class="row-choice" data-act="play-song" data-id="${id}">播放歌曲</button><button class="row-choice" data-act="compose" data-id="${id}">创建音乐记忆</button><button class="row-choice" data-act="history-sheet" data-id="${id}">这首歌的记忆</button>`),
 'history-sheet':openHistory,'nav-close':id=>{closeSheet();nav(id);},lyrics:()=>openSheet('歌词',`<div class="history-list">${(current()?.lyrics||[]).map(l=>`<button class="row-choice" data-act="seek-line" data-id="${l.time}">${fmt(l.time)}　${esc(l.text)}</button>`).join('')||'<div class="empty">暂无时间轴歌词</div>'}</div>`),
 'seek-line':id=>{audio.currentTime=+id;closeSheet();},upload,listening:()=>toast('累计时长来自本地演示播放'),leqian:()=>toast('每一个音乐日常，都可以记在声刻里'),retry:()=>boot()
};
function step(n){const ids=queueIDs||[],i=ids.indexOf(currentID);if(ids.length){selectSong(ids[(i+n+ids.length)%ids.length],true);if(view==='memories'&&review==='gallery')render();}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const fn=actions[b.dataset.act];if(!fn)return;try{await fn(b.dataset.id||'',b);}catch(err){if(err.name!=='AbortError')toast(err.message||'操作失败');}});
document.addEventListener('input',e=>{if(e.target.id==='note'){$('#word-count').textContent=[...e.target.value].length+'/1000';draft.note=e.target.value;resizeNote();}if(e.target.id==='song-search')$('#song-results').innerHTML=songChoices(sheetReturn==='draft',e.target.value);if(e.target.id==='seek'){audio.currentTime=+e.target.value;updatePlay();}});
window.addEventListener('resize',()=>{resizeNote();const stage=$('.coverflow-track');if(stage){const songs=gallerySongs(),index=songs.findIndex(s=>s.id===galleryID);stage.scrollLeft=Math.max(0,index)*stage.firstElementChild.getBoundingClientRect().width;paintGallery();}});
document.addEventListener('change',async e=>{if(e.target.id==='seek'){const now=Date.now();seeks=now-lastSeek<60000?seeks+1:1;lastSeek=now;if(seeks>=5)hint('这一句，让你想起了什么？');}if(e.target.id==='hints'){try{state.settings=await api('/api/settings','PUT',{...state.settings,memory_hints:e.target.checked});}catch(err){e.target.checked=!e.target.checked;toast(err.message);}}if(e.target.id==='photo-files'){const list=[...e.target.files];if(list.length+draft.photo_urls.length+draft.files.length>3){$('#photo-error').textContent='最多添加 3 张图片，请重新选择';return;}if(list.some(f=>f.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type))){$('#photo-error').textContent='请选择 8 MB 以内的 JPG、PNG 或 WebP 图片';return;}draft.files.push(...list.map(file=>({file,url:URL.createObjectURL(file)})));photoPicker();}if(e.target.id==='audio-file'&&e.target.files[0]){$('[name="title"]').value=e.target.files[0].name.replace(/\.[^.]+$/,'');}});
document.addEventListener('submit',async e=>{if(e.target.id==='composer'){e.preventDefault();await publish();}if(e.target.id==='upload'){e.preventDefault();const f=e.target,b=$('button[type="submit"]',f);b.disabled=true;try{const file=$('#audio-file').files[0];if(file.size>52*1024*1024)throw Error('音频最大 52 MB');const duration=await new Promise((resolve,reject)=>{const a=new Audio(),url=URL.createObjectURL(file);const timer=setTimeout(()=>done(Error('读取音频超时')),15000);function done(error){clearTimeout(timer);const d=a.duration;a.removeAttribute('src');a.load();URL.revokeObjectURL(url);error?reject(error):resolve(d);}a.onloadedmetadata=()=>Number.isFinite(a.duration)&&a.duration>0?done():done(Error('无效音频时长'));a.onerror=()=>done(Error('浏览器无法解码该文件'));a.src=url;});const data=new FormData(f);data.append('file',file);data.append('duration',duration);data.append('color','#42698c');const s=await api('/api/songs','POST',data);await refresh();closeSheet();selectSong(s.id);nav('player');toast('歌曲已添加');}catch(err){$('#upload-error').textContent=err.message;}finally{b.disabled=false;}}});
sheet.addEventListener('cancel',e=>{if(saving)e.preventDefault();else if(sheet.dataset.kind==='photo-viewer'){e.preventDefault();closePhotoViewer();}});
sheet.addEventListener('close',()=>{shareGeneration++;if(draft){draft.files.forEach(f=>URL.revokeObjectURL(f.url));draft=null;}});
audio.addEventListener('loadedmetadata',()=>{if(pendingSeek!==null){audio.currentTime=Math.min(pendingSeek,audio.duration||pendingSeek);pendingSeek=null;}if(shouldPlay){shouldPlay=false;audio.play().catch(()=>toast('点按播放开始听歌'));}updatePlay();});
audio.addEventListener('timeupdate',()=>{updatePlay();if(audio.loop&&audio.currentTime<1&&audio.dataset.last>audio.duration-2){completed++;if(completed>=2)hint('这首歌循环 3 次了，此刻心情？');}audio.dataset.last=audio.currentTime;});
audio.addEventListener('play',()=>{if(queueIDs&&!queueIDs.includes(currentID))queueIDs.push(currentID);recentSongIDs=[currentID,...recentSongIDs.filter(id=>id!==currentID)];updatePlay();if(sheet.open&&sheet.dataset.kind==='queue')showPlaybackQueue($('.queue-list').scrollTop);api('/api/events','POST',{name:'song_played'}).catch(()=>{});const hour=new Date().getHours();if(hour>=23||hour<6)hint('这个点了，写一句吧');});audio.addEventListener('pause',updatePlay);audio.addEventListener('ended',()=>{completed++;hint('听完这首歌，留下此刻心情');});audio.volume=.65;
window.addEventListener('hashchange',()=>{const hash=location.hash.slice(1);if(['home','player','mine','favorites','memories','settings'].includes(hash)&&hash!==view){view=hash;render();}});
async function boot(){try{await refresh();const hash=location.hash.slice(1);view=['home','player','mine','favorites','memories','settings'].includes(hash)?hash:'home';let saved='';try{saved=sessionStorage.getItem('shengke.prd.song')||'';}catch{}currentID=bySong(saved)?.id||state.songs[0]?.id||'';if(currentID)selectSong(currentID);render();}catch(e){app.innerHTML=`<div class="empty"><b>暂时无法打开声刻</b>${esc(e.message)}<button class="primary" data-act="retry">重新连接</button></div>`;}}
playerAdapter.connect({getSong:current,getPosition:()=>audio.currentTime||0,playSong:(id,position)=>selectSong(id,true,position)});
boot();
