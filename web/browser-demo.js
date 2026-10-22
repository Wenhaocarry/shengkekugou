import { makeZip } from './demo-zip.js';

export async function installBrowserDemo() {
  const networkFetch = window.fetch.bind(window);
  const db = await new Promise((resolve, reject) => {
    // Keep the existing database so newer versions retain records created in V3.
    const request = indexedDB.open('shengke-browser-v3', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('state'); request.result.createObjectStore('media'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('请先关闭本站的其他标签页。'));
  });
  db.onversionchange = () => db.close();
  const value = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const readState = () => value(db.transaction('state').objectStore('state').get('current'));
  const edit = (change, seed) => new Promise((resolve, reject) => {
    const transaction = db.transaction(['state', 'media'], 'readwrite'), states = transaction.objectStore('state');
    let result;
    const request = states.get('current');
    request.onsuccess = () => {
      try {
        const state = request.result || structuredClone(seed);
        if (!state || state.version !== 1) throw Error('不支持的记录版本，已保留原数据');
        result = change(state, transaction.objectStore('media'));
        states.put(state, 'current');
      } catch (error) { transaction.abort(); reject(error); }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || Error('保存已中止，原记录仍保留'));
  });
  if (!await readState()) {
    const response = await networkFetch('/demo-state.json');
    if (!response.ok) throw Error('示例数据暂时无法加载，请刷新重试');
    const seed = await response.json();
    if (seed.version !== 1 || !Array.isArray(seed.songs) || !Array.isArray(seed.memories)) throw Error('示例数据无效');
    await edit(() => undefined, seed);
  }
  const urls = new Map(), storedPaths = new Map();
  const mediaURL = (path, blob) => {
    if (!urls.has(path)) { const url = URL.createObjectURL(blob); urls.set(path, url); storedPaths.set(url, path); }
    return urls.get(path);
  };
  async function snapshot() {
    const transaction = db.transaction(['state', 'media']), media = transaction.objectStore('media');
    const [state, keys, blobs] = await Promise.all([value(transaction.objectStore('state').get('current')), value(media.getAllKeys()), value(media.getAll())]);
    keys.forEach((key, index) => mediaURL(key, blobs[index]));
    const resolve = path => urls.get(path) || path;
    state.songs.forEach(song => { song.audio_url = resolve(song.audio_url); song.cover_url = resolve(song.cover_url); });
    state.memories.forEach(memory => { memory.photo_url = resolve(memory.photo_url); memory.photo_urls = (memory.photo_urls || []).map(resolve); });
    return state;
  }
  const fail = (message, status = 400) => { throw Object.assign(Error(message), { status }); };
  const id = () => crypto.randomUUID().replaceAll('-', '').slice(0, 24);
  const now = () => new Date().toISOString();
  const text = (s, max) => typeof s === 'string' && [...s].length <= max;
  const stored = path => storedPaths.get(path) || path;
  const validPhoto = path => !path || (urls.has(path) && /\.(png|jpg|webp)$/.test(path));
  const validDate = date => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const [y, m, d] = date.split('-').map(Number), parsed = new Date(y, m - 1, d);
    return y >= 1900 && y <= new Date().getFullYear() + 1 && parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
  };
  function memoryInput(input, state) {
    const song = state.songs.find(song => song.id === input.song_id);
    if (!song || !Number.isFinite(input.position) || input.position < 0 || input.position > song.duration) fail('请选择有效歌曲和刻点');
    const note = String(input.note || '').trim(), mood = String(input.mood || '').trim(), location = String(input.location || '').trim();
    if (!text(note, 1000) || !text(mood, 20) || !text(location, 80)) fail('文字过长');
    const scenes = [...new Set((input.scenes || []).map(s => String(s).trim()).filter(Boolean))];
    if (scenes.length > 3 || scenes.some(scene => !text(scene, 20))) fail('最多选择 3 个场景，每项不超过 20 字');
    const photos = (input.photo_urls || []).map(stored), photo = photos[0] || stored(input.photo_url || '');
    if (photos.length > 3 || photos.some(path => !path || !validPhoto(path)) || !validPhoto(photo)) fail('照片不存在或超过 3 张');
    if (!note && !mood && !photo) fail('请留下一句话、心情或照片');
    if (!validDate(input.date) || (input.record_time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.record_time))) fail('记录日期或时间无效');
    const visibility = input.visibility || 'private', chapter = input.chapter_id || '';
    if (!['private', 'friends', 'public'].includes(visibility)) fail('可见范围无效');
    if (chapter && !state.chapters.some(c => c.id === chapter)) fail('章节不存在');
    return { song_id: song.id, position: input.position, note, mood, scenes, location, date: input.date, record_time: input.record_time || '', visibility, chapter_id: chapter, photo_url: photo, photo_urls: photos };
  }
  async function backup() {
    const state = await readState(), paths = new Set();
    state.songs.forEach(song => [song.audio_url, song.cover_url].filter(Boolean).forEach(path => paths.add(path)));
    state.memories.forEach(memory => [...(memory.photo_urls || []), memory.photo_url].filter(Boolean).forEach(path => paths.add(path)));
    const files = [['state.json', new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })]];
    for (const path of paths) {
      let blob = await value(db.transaction('media').objectStore('media').get(path));
      if (!blob) { const response = await networkFetch(path); if (!response.ok) fail('无法读取备份媒体，请稍后重试', 503); blob = await response.blob(); }
      files.push([path.replace(/^\//, ''), blob]);
    }
    return makeZip(files);
  }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  async function route(path, method, input) {
    if (method === 'GET' && path === '/api/state') return json(await snapshot());
    if (method === 'GET' && path === '/api/health') return json({ status: 'ok', mode: 'browser-demo' });
    if (method === 'GET' && path === '/api/export') return json(await readState());
    if (method === 'GET' && path === '/api/backup') return new Response(await backup(), { headers: { 'Content-Type': 'application/zip' } });
    if (method === 'POST' && (path === '/api/photos' || path === '/api/songs')) {
      const photo = path === '/api/photos', file = input?.get('file');
      if (!(file instanceof Blob) || !file.size || file.size > (photo ? 8 : 52) * 1024 * 1024) fail(photo ? '请选择 8 MB 以内的图片' : '音频最大 52 MB');
      const extensions = photo ? { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } : { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/flac': 'flac', 'audio/x-flac': 'flac', 'audio/ogg': 'ogg', 'video/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/webm': 'webm', 'video/webm': 'webm' };
      const extension = extensions[file.type];
      if (!extension) fail(photo ? '仅支持 JPG、PNG 和 WebP' : '请选择支持的音频文件');
      const mediaPath = '/media/' + id() + '.' + extension;
      let song;
      if (!photo) {
        const title = String(input.get('title') || '').trim(), artist = String(input.get('artist') || '').trim(), duration = Number(input.get('duration'));
        if (!title || !text(title, 120) || !text(artist, 120) || !Number.isFinite(duration) || duration <= 0 || duration > 86400) fail('请选择有效音频并填写标题');
        song = { id: id(), title, artist, duration, audio_url: mediaPath, cover_url: '', color: '#42698c', lyrics: [], sample: false, created_at: now() };
      }
      await edit((state, media) => { media.put(file, mediaPath); if (song) state.songs.push(song); });
      const url = mediaURL(mediaPath, file);
      return json(photo ? { url } : { ...song, audio_url: url }, 201);
    }
    if (method === 'PUT' && path === '/api/settings') return json(await edit(state => state.settings = { memory_hints: !!input.memory_hints, demo_member: !!input.demo_member }));
    if (method === 'POST' && path === '/api/events') {
      if (!['song_played', 'memory_opened', 'memory_hint_opened', 'card_exported'].includes(input.name)) fail('事件类型无效');
      await edit(state => { state.events = [...state.events, { name: input.name, at: now() }].slice(-2000); });
      return json({ ok: true });
    }
    const memoryID = path.match(/^\/api\/memories\/([^/]+)$/)?.[1];
    if ((method === 'POST' && path === '/api/memories') || (memoryID && ['PUT', 'DELETE'].includes(method))) {
      const result = await edit(state => {
        const index = state.memories.findIndex(memory => memory.id === memoryID);
        if (memoryID && index < 0) fail('记录不存在', 404);
        if (method === 'DELETE') { state.memories.splice(index, 1); return { ok: true }; }
        const fields = memoryInput(input, state);
        if (memoryID) return Object.assign(state.memories[index], fields);
        const memory = { ...fields, id: id(), sample: false, replies: [], created_at: now() };
        state.memories.push(memory); return memory;
      });
      return json(result, method === 'POST' ? 201 : 200);
    }
    const songID = path.match(/^\/api\/songs\/([^/]+)$/)?.[1];
    if (method === 'DELETE' && songID) {
      await edit(state => {
        if (state.memories.some(memory => memory.song_id === songID)) fail('这首歌仍有关联记忆，请先处理记忆再删除', 409);
        const index = state.songs.findIndex(song => song.id === songID);
        if (index < 0) fail('歌曲不存在', 404);
        state.songs.splice(index, 1);
      });
      return json({ ok: true });
    }
    return json({ error: '浏览器演示版不提供这个接口' }, 404);
  }
  window.fetch = async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return networkFetch(input, options);
    try {
      const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      return await route(url.pathname, method, body);
    } catch (error) {
      const quota = error.name === 'QuotaExceededError';
      return json({ error: quota ? '浏览器空间不足，请先备份记录并释放空间；原数据已保留' : error.message || '浏览器保存失败，请重试' }, error.status || (quota ? 507 : 500));
    }
  };
  document.documentElement.dataset.storage = 'browser';
  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !['/api/export', '/api/backup'].includes(url.pathname)) return;
    event.preventDefault();
    try {
      const response = await window.fetch(url.href);
      if (!response.ok) throw Error((await response.json()).error);
      const blob = await response.blob(), download = document.createElement('a'), objectURL = URL.createObjectURL(blob);
      download.href = objectURL; download.download = url.pathname.endsWith('backup') ? 'shengke-backup.zip' : 'shengke-memories.json'; download.click();
      setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
    } catch (error) {
      const toast = document.querySelector('#toast'); toast.textContent = error.message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 5000);
    }
  });
}
