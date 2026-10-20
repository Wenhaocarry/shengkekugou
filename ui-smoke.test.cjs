// Run after building bin/shengke. Uses isolated data and local Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'shengke-v3-ui-'));
  const previews = path.join(__dirname, 'docs/previews');
  fs.mkdirSync(previews, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'data/state.json'), path.join(temp, 'state.json'));
  fs.cpSync(path.join(__dirname, 'data/media'), path.join(temp, 'media'), { recursive: true });
  const server = spawn(path.join(__dirname, 'bin/shengke'), ['-addr', '127.0.0.1:18100', '-data', temp]);
  const base = 'http://127.0.0.1:18100';
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { if ((await fetch(base + '/api/state')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'isolated server did not start');
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
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
    const state = async () => (await page.request.get(base + '/api/state')).json();
    const layout = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal page overflow');
    const initial = await (await fetch(base + '/api/state')).json();

    await page.goto(base);
    await page.locator('.home').waitFor();
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
    await click('entry');
    await click('detail', saved.id);
    await click('delete-confirm', saved.id);
    await click('delete', saved.id);
    await page.locator('.memory-body').waitFor();
    assert.equal((await state()).memories.length, initial.memories.length, 'delete failed');
    await snapshot('memories');
    await click('review', 'timeline');
    assert(await page.locator('.timeline-group').count() > 0);
    await click('review', 'ring');
    assert(await page.locator('.ring').count() > 0);
    await click('period', 'all');
    await page.goto(base + '/#favorites');
    await page.locator('.song-row .label').first().click();
    await click('history-tab', 'album');
    if (await page.locator('.album-item').count()) {
      await page.locator('.album-item').first().click();
      await page.locator('.photo-view-stage img').waitFor();
      await click('photo-memory');
      assert.equal(await page.locator('.memory-focus').count(), 1);
    }
    for (const width of [360, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const view of ['home', 'mine', 'player']) {
        await page.goto(base + '/#' + view);
        await page.locator('section').first().waitFor();
        await layout();
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
    console.log('PASS: 360/390/430px layouts, inert navigation tabs, queue playback/history/likes/removal/bulk edit, fixed playlist, playback/seek/lyrics, three photos, create/edit/delete, sharing and memory views.');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await new Promise(resolve => server.once('close', resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
