// Run after building bin/shengke. Uses isolated data and local Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'shengke-v3-ui-'));
  const previews = path.join(__dirname, 'docs/previews');
  fs.mkdirSync(previews, { recursive: true });
  const browserMode = process.argv.includes('--browser');
  if (!browserMode) {
    fs.copyFileSync(path.join(__dirname, 'data/state.json'), path.join(temp, 'state.json'));
    fs.cpSync(path.join(__dirname, 'data/media'), path.join(temp, 'media'), { recursive: true });
  }
  const server = browserMode
    ? spawn(process.execPath, [path.join(__dirname,'scripts/preview-demo.cjs'),'18100'])
    : spawn(path.join(__dirname, 'bin/shengke'), ['-addr', '127.0.0.1:18100', '-data', temp]);
  const base = 'http://127.0.0.1:18100';
  let browser,page;
  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { if ((await fetch(base + (browserMode ? '/' : '/api/state'))).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'isolated server did not start');
    if(browserMode){
      const partial=await fetch(base+'/media/sample-a.wav',{headers:{Range:'bytes=0-43'}});
      assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,44);
      assert.equal((await fetch(base+'/media/sample-a.wav',{headers:{Range:'bytes=999999999-'}})).status,416);
      assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);
    }
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context=await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const click = async (act, id) => {
      const selector = `[data-act="${act}"]${id === undefined ? '' : `[data-id="${id}"]`}`;
      const modal = page.locator('dialog[open]');
      const scope = await modal.locator(selector).count() ? modal : page;
      await scope.locator(selector+':visible').first().click();
    };
    const snapshot = name => page.screenshot({ path: path.join(previews, name + '.png') });
    const state = async () => browserMode ? page.evaluate(() => fetch('/api/state').then(r=>r.json())) : (await page.request.get(base + '/api/state')).json();
    const layout = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal page overflow');
    await page.goto(base);
    await page.locator('.home').waitFor();
    const initial = await state();
    await layout();
    assert.deepEqual((await page.locator('.app-tabs button').allTextContents()).map(s=>s.replace('K','').trim()), ['首页','直播','会员','福利','我的']);
    const homeURL=page.url();
    for(const index of [1,2,3]){
      await page.locator('.app-tabs button').nth(index).click({force:true});
      assert.equal(page.url(),homeURL,'unused tab navigated');
      assert.equal(await page.locator('dialog[open]').count(),0,'unused tab opened a panel');
    }
    await snapshot('home');
    await click('queue');
    assert.equal(await page.locator('dialog[data-kind="queue"] .queue-row').count(),initial.songs.length);
    assert.deepEqual(await page.locator('.queue-tabs button').allTextContents(),['正在播放','单曲足迹','歌单足迹']);
    const toolbarY=(await page.locator('.queue-toolbar').boundingBox()).y;
    await page.locator('.queue-list').evaluate(el=>{el.scrollTop=180;});
    assert.equal((await page.locator('.queue-toolbar').boundingBox()).y,toolbarY,'queue toolbar moved');
    await page.locator('.queue-list').evaluate(el=>{el.scrollTop=0;});
    await click('queue-play',initial.songs[3].id);
    try { await page.waitForFunction(()=>!document.querySelector('audio').paused,{},{timeout:5000}); }
    catch(error){
      console.log('Queue playback failure:',await page.locator('audio').evaluate(el=>({src:el.src,paused:el.paused,readyState:el.readyState,error:el.error?.message,toast:document.querySelector('#toast').textContent})),errors);
      await snapshot('queue-error');throw error;
    }
    assert.equal(await page.locator('.queue-row.current-song [data-act="queue-play"]').getAttribute('data-id'),initial.songs[3].id);
    assert.equal(await page.locator('dialog[data-kind="queue"][open]').count(),1,'selecting a song closed queue');
    await click('like',initial.songs[3].id);
    assert.equal(await page.locator(`[data-act="like"][data-id="${initial.songs[3].id}"].active`).count(),2,'queue and mini-player likes differ');
    await snapshot('queue');
    await click('queue-tab','recent');
    assert(await page.locator(`[data-act="queue-play"][data-id="${initial.songs[3].id}"]`).count()>0);
    await click('queue-tab','playlists');
    assert.equal(await page.locator('.queue-playlist').count(),1);
    await click('queue-tab','playing');
    await click('queue-loop');
    assert.equal(await page.locator('.queue-order-label').innerText(),'单曲循环');
    await click('queue-loop');
    await click('queue-remove',initial.songs[2].id);
    assert.equal(await page.locator('.queue-row').count(),initial.songs.length-1);
    assert.equal((await state()).songs.length,initial.songs.length,'queue removal deleted a library song');
    await click('queue-edit');
    await click('queue-select-all');
    await click('queue-edit');
    assert.equal(await page.locator('.queue-row').count(),0);
    assert(await page.locator('audio').evaluate(el=>el.paused),'empty queue kept playing');
    assert.equal((await state()).memories.length,initial.memories.length,'queue edit changed memories');
    await click('close');
    await page.goto(base+'/#favorites');
    await page.locator('.favorites-page').waitFor();
    await click('play-all');
    await page.waitForFunction(()=>!document.querySelector('audio').paused);
    await click('toggle');
    await page.goto(base+'/#home');
    await page.locator('.home').waitFor();
    await click('songs');
    await page.locator('#song-search').fill('Piggy');
    assert.equal(await page.locator('.song-pick').count(), 1, 'song search');
    await click('close');
    await click('nav', 'mine');
    await page.locator('.mine').waitFor();
    await page.waitForFunction(() => scrollY === 0);
    await layout();
    await snapshot('mine');
    await click('nav', 'favorites');
    assert.equal(await page.locator('.song-row').count(), initial.songs.length);
    const beforeScroll = await page.locator('.favorites-page > .top').boundingBox();
    const dockBefore = await page.locator('.mini-dock').boundingBox();
    await page.locator('.favorites').evaluate(el => { el.scrollTop = 260; });
    assert.equal((await page.locator('.favorites-page > .top').boundingBox()).y, beforeScroll.y, 'playlist heading moved');
    assert.equal((await page.locator('.mini-dock').boundingBox()).y, dockBefore.y, 'mini player moved');
    await snapshot('favorites');

    await page.goto(base + '/#player');
    await page.locator('.player').waitFor();
    await page.waitForFunction(() => document.querySelector('audio').readyState > 0);
    await snapshot('player');
    await click('toggle');
    await page.waitForFunction(() => !document.querySelector('audio').paused);
    await click('toggle');
    await page.locator('#seek').evaluate(el => { el.value = '16'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#current-time').textContent === '00:16');
    await click('player-panel', 'lyrics');
    assert.equal(await page.locator('.lyric-line.is-current').getAttribute('data-id'), '16', 'lyric highlighting');
    await page.locator('.lyric-line').last().click();
    await page.waitForFunction(() => Math.abs(document.querySelector('audio').currentTime - 32) < 1);
    await snapshot('lyrics');
    await click('loop');
    assert.equal(await page.locator('.loop-button').getAttribute('aria-pressed'), 'true');
    await click('loop');
    await click('next');
    await click('player-panel', 'cover');
    assert.match(await page.locator('.player-title').innerText(), /孤独的总和/);
    await click('previous');
    await click('toggle');
    await click('like', 'demo-a');
    assert(await page.locator('.player-bottom .heart').evaluate(el => el.classList.contains('active')));
    if (await page.locator('[data-act="nudge-close"]').isVisible()) await click('nudge-close');
    await click('player-panel', 'story');
    await snapshot('story');
    await click('player-panel', 'related');
    await snapshot('related');
    await click('player-panel', 'story');
    await click('compose');
    const note = 'V3 自动验证：让音乐记住这一刻';
    await page.locator('#note').fill(note);
    assert.equal(await page.locator('#note').evaluate(el=>getComputedStyle(el).outlineStyle),'none','editor has a focus frame');
    await click('pick-mood');
    await click('expand');
    assert(await page.locator('.picker-grid > button').count() >= 33);
    await click('pick-mood-item', '开心');
    await click('picker-done');
    await click('pick-scenes');
    for (const scene of ['下雨天', '通勤路上', '咖啡馆']) await click('pick-scenes-item', scene);
    await click('picker-done');
    await click('pick-location');
    await page.locator('#location').fill('上海 · 窗边');
    await click('location-done');
    await click('pick-privacy');
    await click('privacy-item', 'friends');
    await click('pick-time');
    await page.locator('#record-time').fill('12:34');
    await click('time-done');
    await click('pick-photos');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
    await page.locator('#photo-files').setInputFiles([1,2,3].map(n => ({ name: 'test-' + n + '.png', mimeType: 'image/png', buffer: png })));
    await page.waitForFunction(() => document.querySelectorAll('.photo-item').length === 3);
    await click('draft-back');
    assert.equal(await page.locator('#note').inputValue(), note, 'draft lost across pickers');
    await snapshot('composer');
    await page.locator('#composer [type="submit"]').click();
    await page.locator('dialog[data-kind="success"]').waitFor();
    let saved = (await state()).memories.find(m => m.note === note);
    assert(saved, 'memory not persisted');
    assert.equal(saved.photo_urls.length, 3);
    assert.equal(saved.scenes.length, 3);
    assert.equal(saved.record_time, '12:34');
    assert.equal(saved.visibility, 'friends');
    assert.equal(saved.location, '上海 · 窗边');
    if (browserMode) {
      const peer=await page.context().newPage();
      await peer.goto(base+'/#settings');
      await peer.locator('.setting-block').waitFor();
      await peer.reload();
      await peer.locator('.setting-block').waitFor();
      const persisted=await peer.evaluate(async memoryID=>{
        const state=await (await fetch('/api/state')).json();
        const memory=state.memories.find(m=>m.id===memoryID);
        return {note:memory.note,photos:await Promise.all(memory.photo_urls.map(async url=>(await (await fetch(url)).blob()).size))};
      },saved.id);
      assert.equal(persisted.note,note);
      assert.deepEqual(persisted.photos,[png.length,png.length,png.length],'photos did not survive another tab and reload');
      await peer.goto(base+'/#player');await peer.locator('.player').waitFor();
      await peer.locator('[data-act="entry"]').first().click();
      await peer.locator(`[data-act="photo-view"][data-id="${saved.id}|1"]`).click();
      await peer.waitForFunction(()=>document.querySelector('.photo-view-stage img')?.naturalWidth>0);
      assert.equal(await peer.locator('.photo-view-actions button').count(),1);
      assert.equal(await peer.locator('.photo-view-actions').innerText(),'保存图片');
      assert.equal(await peer.locator('.photo-view-meta p').innerText(),note);
      const photoDownload=peer.waitForEvent('download');
      await peer.locator('[data-act="photo-save"]').click();
      const photo=await photoDownload,photoPath=path.join(temp,'original-photo.png');
      await photo.saveAs(photoPath);
      assert.match(photo.suggestedFilename(),/\.png$/,'photo extension does not match its actual format');
      assert.deepEqual(fs.readFileSync(photoPath),png,'save included card UI or changed original image bytes');
      await peer.locator('[data-act="photo-close"]').click();
      assert.equal(await peer.locator('dialog[data-kind="journal"][open]').count(),1,'photo close lost source journal');
      assert.equal(await peer.locator('dialog .photo-thumb:focus').getAttribute('data-id'),saved.id+'|1');
      await peer.locator(`[data-act="photo-view"][data-id="${saved.id}|2"]`).click();
      await peer.keyboard.press('Escape');
      assert.equal(await peer.locator('dialog[data-kind="journal"][open]').count(),1,'Escape lost source journal');
      await peer.locator('dialog [data-act="close"]').click();
      await peer.goto(base+'/#settings');await peer.locator('.setting-block').waitFor();
      const backupReady=peer.waitForEvent('download');
      await peer.locator('a[href="/api/backup"]').click();
      const archive=await backupReady,archivePath=path.join(temp,'browser-backup.zip');
      await archive.saveAs(archivePath);
      const check=spawnSync('python3',['-c','import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; s=json.loads(z.read("state.json")); m=next(m for m in s["memories"] if m["id"]==sys.argv[2]); assert len(m["photo_urls"])==3; assert all(z.read(p.lstrip("/")) for p in m["photo_urls"]); assert len(s["songs"])==12; print("ZIP verified")',archivePath,saved.id],{encoding:'utf8'});
      assert.equal(check.status,0,check.stderr);
      const isolated=await browser.newContext({viewport:{width:390,height:844}});
      const fresh=await isolated.newPage();await fresh.goto(base);await fresh.locator('.home').waitFor();
      assert.equal(await fresh.evaluate(memoryID=>fetch('/api/state').then(r=>r.json()).then(s=>s.memories.some(m=>m.id===memoryID)),saved.id),false);
      assert.equal(await fresh.evaluate(()=>fetch('/api/state').then(r=>r.json()).then(s=>s.memories.length)),initial.memories.length,'browser contexts shared records');
      await isolated.close();
      await peer.locator('[data-act="upload"]').click();
      await peer.locator('#audio-file').setInputFiles(path.join(__dirname,'dist/media/sample-a.wav'));
      await peer.locator('[name="title"]').fill('浏览器上传验证');
      await peer.locator('#upload [type="submit"]').click();
      await peer.locator('.player').waitFor();await peer.reload();await peer.locator('.player').waitFor();
      await peer.waitForFunction(()=>document.querySelector('audio').readyState>0);
      assert((await peer.locator('audio').getAttribute('src')).startsWith('blob:'),'uploaded audio did not survive reload');
      await peer.locator('[data-act="toggle"]').click();await peer.waitForFunction(()=>!document.querySelector('audio').paused);
      const uploaded=await peer.evaluate(()=>fetch('/api/state').then(r=>r.json()).then(s=>s.songs.find(song=>song.title==='浏览器上传验证')));
      assert(uploaded);
      await peer.evaluate(songID=>fetch('/api/songs/'+songID,{method:'DELETE'}),uploaded.id);
      await peer.close();
    }
    await click('share', saved.id);
    await page.locator('#live-share-image:not([hidden])').waitFor();
    assert.equal(await page.locator('#live-share-image').evaluate(el => el.naturalWidth), 720);
    await snapshot('share');
    for (const theme of ['paper', 'rose', 'night', 'ocean']) {
      await click('share-theme', theme);
      await page.locator('#live-share-image:not([hidden])').waitFor();
    }
    await click('share-type', 'status');
    await page.locator('#live-share-image:not([hidden])').waitFor();
    await click('close');
    await click('entry');
    await click('detail', saved.id);
    await click('edit', saved.id);
    await page.locator('#note').fill(note + '（已编辑）');
    await page.locator('#composer [type="submit"]').click();
    await page.locator('dialog[data-kind="success"]').waitFor();
    saved = (await state()).memories.find(m => m.id === saved.id);
    assert.equal(saved.note, note + '（已编辑）');
    assert.equal(saved.photo_urls.length, 3, 'editing lost photos');
    await click('close');
    await page.goto(base+'/#memories');
    await click('review','timeline');
    const reviewRecords=(await state()).memories;
    assert.equal(await page.locator('.song-timeline').count(),new Set(reviewRecords.map(m=>m.song_id)).size,'a song appeared in multiple timeline groups');
    assert.equal(await page.locator('.timeline-row').count(),reviewRecords.length,'grouping lost records');
    const groups=await page.locator('.song-timeline').evaluateAll(elements=>elements.map(el=>({songID:el.dataset.songId,ids:[...el.querySelectorAll('.timeline-row')].map(row=>row.dataset.memoryId)})));
    for(const group of groups){
      const records=reviewRecords.filter(m=>m.song_id===group.songID).sort((a,b)=>(b.date+(b.record_time||'12:00')+b.created_at).localeCompare(a.date+(a.record_time||'12:00')+a.created_at));
      assert.deepEqual(group.ids,records.map(m=>m.id),'song records are not in chronological order');
    }
    await snapshot('song-timeline');
    await click('memory-filter','photos');
    const withPhotos=reviewRecords.filter(m=>(m.photo_urls?.length||m.photo_url));
    assert.equal(await page.locator('.timeline-row').count(),withPhotos.length,'photo filter includes text-only records');
    await click('detail',saved.id);
    await click('detail-back');
    assert.equal(await page.locator('[data-act="review"][data-id="timeline"].selected').count(),1,'detail return changed view');
    assert.equal(await page.locator('[data-act="memory-filter"][data-id="photos"][aria-pressed="true"]').count(),1,'detail return lost filter');
    await click('full-history',saved.song_id);
    assert.equal(await page.locator('.history-page .memory-card').count(),withPhotos.filter(m=>m.song_id===saved.song_id).length);
    await click('history-back');
    await click('review','calendar');
    const selectedDay=await page.locator('.calendar .selected').getAttribute('data-id');
    assert.equal(await page.locator('.day-entry').count(),withPhotos.filter(m=>m.date===selectedDay).length,'calendar ignored photo filter');
    await click('review','timeline');
    assert.equal(await page.locator('[data-act="review"][data-id="album"]').count(),0,'standalone album tab remains');
    const timelineURL=page.url();
    await page.locator(`[data-act="photo-view"][data-id="${saved.id}|2"]`).click();
    assert.equal(await page.locator('.photo-view-stage img').getAttribute('src'),saved.photo_urls[2],'clicked photo index changed');
    assert.equal(await page.locator('.photo-view-meta p').innerText(),saved.note);
    assert.equal(await page.locator('[data-act="photo-memory"]').count(),0);
    await click('photo-close');
    assert.equal(page.url(),timelineURL,'photo changed timeline route');
    assert.equal(await page.locator('[data-act="memory-filter"][data-id="photos"][aria-pressed="true"]').count(),1,'photo close lost filter');
    assert.equal(await page.locator('.photo-thumb').evaluateAll(elements=>elements.some(el=>el.parentElement.closest('button'))),false,'photo buttons are nested in record buttons');
    await page.goto(base+'/#player');
    await page.locator('.player').waitFor();
    await click('entry');
    await click('memory-filter','all');
    assert.equal(await page.locator('dialog .memory-card').count(),reviewRecords.filter(m=>m.song_id===saved.song_id).length,'journal did not clear photo filter');
    await click('memory-filter','photos');
    assert.equal(await page.locator('dialog .memory-card').count(),withPhotos.filter(m=>m.song_id===saved.song_id).length,'journal ignored photo filter');
    await click('detail', saved.id);
    await click('delete-confirm', saved.id);
    await click('delete', saved.id);
    await page.locator('.memory-body').waitFor();
    assert.equal((await state()).memories.length, initial.memories.length, 'delete failed');
    await snapshot('memories');
    await click('review', 'timeline');
    if(!initial.memories.some(m=>m.photo_urls?.length||m.photo_url)){
      assert.equal(await page.locator('.timeline-row').count(),0,'deleted image record remained in filter');
      assert.equal(await page.locator('.empty [data-act="memory-filter"][data-id="all"]').count(),1,'empty filter has no way back');
    }
    await click('memory-filter','all');
    assert(await page.locator('.timeline-group').count() > 0);
    await click('review', 'ring');
    assert(await page.locator('.ring').count() > 0);
    await click('period', 'all');
    await page.goto(base + '/#favorites');
    await page.locator('.song-row .label').first().click();
    assert.equal(await page.locator('[data-act="history-tab"]').count(),0,'song album tab remains');
    if (await page.locator('.photo-thumb').count()) {
      await page.locator('.photo-thumb').first().click();
      await page.locator('.photo-view-stage img').waitFor();
      await click('photo-close');
    }
    for (const width of [360, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const view of ['home', 'mine', 'player', 'memories']) {
        await page.goto(base + '/#' + view);
        await page.locator('section').first().waitFor();
        await layout();
        if(view==='memories')for(const tab of ['calendar','timeline','ring']){await click('review',tab);await layout();}
        if(view==='mine'){
          await click('queue');
          await layout();
          const queueBox=await page.locator('dialog[data-kind="queue"]').boundingBox();
          assert(queueBox.y>=0&&queueBox.y+queueBox.height<=844,'queue outside viewport');
          await click('close');
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 360/390/430px layouts, inert navigation tabs, queue playback/history/likes/removal/bulk edit, fixed playlist, playback/seek/lyrics, three photos, create/edit/delete, sharing, song timelines, photo filters, original photo downloads and return navigation.');
  } catch(error) {
    if(page){
      console.log('Browser failure:',await page.evaluate(()=>({url:location.href,form:document.querySelector('#form-error')?.textContent,upload:document.querySelector('#upload-error')?.textContent,toast:document.querySelector('#toast')?.textContent})).catch(()=>null));
      await page.screenshot({path:path.join(previews,'failure.png')}).catch(()=>{});
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await new Promise(resolve => server.once('close', resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
