// Fresh browser storage only; run after `npm run build` with local Chrome + Playwright.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
async function main(){
  const server=spawn(process.execPath,[path.join(__dirname,'scripts/preview-demo.cjs'),'18104']);
  const base='http://127.0.0.1:18104',output=path.join(__dirname,'docs/previews');
  fs.mkdirSync(output,{recursive:true});
  let browser;
  try{
    for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:720,height:1558},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/#memories');await page.locator('[data-center=true]').waitFor();
    const fixture=await page.evaluate(async()=>{
      const photo_urls=[];
      for(const n of ['07','11']){
        const body=new FormData();body.append('file',new File([await(await fetch(`/memory-covers-v2/${n}.png`)).blob()],n+'.png',{type:'image/png'}));
        const result=await(await fetch('/api/photos',{method:'POST',body})).json();photo_urls.push(result.url);
      }
      const data={song_id:'demo-a',position:7,note:'那天的风很轻。\n戴上耳机，世界就慢了下来。',mood:'怀念',scenes:['海边'],location:'厦门 · 环岛路',date:'2026-10-22',record_time:'18:20',visibility:'private',photo_urls};
      const response=await fetch('/api/memories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!response.ok)throw Error(await response.text());return response.json();
    });
    await page.reload();await page.locator('.coverflow-card[data-center=true]').waitFor();
    const chosen=page.locator('.coverflow-card[data-id="demo-a"]');
    const source=await chosen.boundingBox(),url=page.url();
    await chosen.click();await page.waitForTimeout(150);
    assert((await page.locator('.gallery-focus img').boundingBox()).width>source.width,'cover never enlarged before settling');
    await page.waitForTimeout(1000);
    assert.equal(page.url(),url,'record reveal navigated');
    assert.equal(await page.locator('.story-memory.is-current').getAttribute('data-memory-id'),fixture.id);
    assert.equal(await page.locator('.is-current .photo-thumb').count(),2);
    assert((await page.locator('.is-current .story-tags').innerText()).includes('厦门'));
    await page.screenshot({path:path.join(output,'v53-memory-ticket.png')});
    const first=await page.locator('.story-memory.is-current').getAttribute('data-memory-id');
    await page.locator('[data-act="gallery-moment-step"][data-id="1"]').click();
    await page.waitForFunction(id=>document.querySelector('.story-memory.is-current').dataset.memoryId!==id,first);
    await page.waitForFunction(()=>Math.abs(document.querySelector('.story-scroll').scrollLeft-document.querySelector('.story-memory.is-current').offsetLeft)<1);
    assert.equal(await page.locator('.story-memory').first().evaluate(el=>el.inert),true,'inactive record remains keyboard accessible');
    assert.equal(await page.locator('.story-count').innerText(),`2 / ${await page.locator('.story-memory').count()}`);
    await page.locator('.story-memory.is-current').focus();await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>document.querySelector('.story-scroll').scrollLeft<1);
    assert.equal(await page.locator('.story-memory.is-current .story-note').evaluate(el=>getComputedStyle(el).animationDelay),'0s','paging repeats the initial entrance delay');
    const touch=await context.newCDPSession(page),box=await page.locator('.story-scroll').boundingBox();
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y:box.y+90}]});
    for(let i=1;i<=14;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.8-box.width*.65*i/14,y:box.y+90}]});await page.waitForTimeout(16);}
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    await page.waitForFunction(()=>Number(document.querySelector('.gallery-story').dataset.moment)>0);
    await page.locator('[data-act="gallery-close"]').click();
    await page.waitForFunction(()=>!document.querySelector('.memory-gallery').classList.contains('story-open'));
    assert.equal(await page.locator('.gallery-scene').getAttribute('data-center-id'),'demo-a','closing lost selected song');
    // Closing while the cover is still moving must cancel cleanly and restore the wall.
    await page.locator('.coverflow-card[data-id="demo-a"]').click();await page.waitForTimeout(80);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.memory-gallery').classList.contains('story-open'));
    for(const [width,height] of [[390,844],[720,1558],[1440,900]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(100);
      await page.locator('.coverflow-card[data-id="demo-a"]').click();await page.waitForTimeout(1000);
      const frame=await page.locator('.app-canvas').boundingBox();
      for(const selector of ['.gallery-focus img','.memory-vinyl','.gallery-story','.story-memory.is-current']){
        const b=await page.locator(selector).boundingBox();assert(b.x>=frame.x-1&&b.x+b.width<=frame.x+frame.width+1&&b.y>=frame.y-1&&b.y+b.height<=frame.y+frame.height+1,selector+' escaped canvas');
      }
      if(width===390)await page.screenshot({path:path.join(output,'v53-memory-phone.png')});
      await page.locator('[data-act="gallery-close"]').click();await page.waitForFunction(()=>!document.querySelector('.memory-gallery').classList.contains('story-open'));
    }
    await page.evaluate(async id=>{const state=await(await fetch('/api/state')).json(),m=state.memories.find(m=>m.id===id);m.note='这一段很长的记忆，也应该能完整读完。'.repeat(45);const r=await fetch('/api/memories/'+m.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)});if(!r.ok)throw Error(await r.text());},fixture.id);
    await page.reload();await page.locator('.coverflow-card[data-id="demo-a"]').click();await page.waitForTimeout(1000);
    const record=page.locator('.story-memory.is-current');
    assert(await record.evaluate(el=>el.scrollHeight>el.clientHeight),'long memory cannot scroll');
    const vertical=await context.newCDPSession(page),longBox=await record.boundingBox();
    await vertical.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:longBox.x+longBox.width*.5,y:longBox.y+longBox.height*.75}]});
    for(let i=1;i<=12;i++){await vertical.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:longBox.x+longBox.width*.5,y:longBox.y+longBox.height*.75-longBox.height*.5*i/12}]});await page.waitForTimeout(16);}
    await vertical.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await vertical.detach();
    await page.waitForFunction(()=>document.querySelector('.story-memory.is-current').scrollTop>20);
    assert.equal(await page.locator('.gallery-story').getAttribute('data-moment'),'0','vertical reading turned the memory page');
    await record.evaluate(el=>el.scrollTop=el.scrollHeight);
    await record.locator('.story-edit').click();await page.locator('#composer').waitFor();
    assert((await page.locator('#note').inputValue()).endsWith('完整读完。'),'long memory lost content');
    assert.deepEqual(errors,[]);
    console.log('PASS: staged cover zoom, horizontal paging + vertical reading, photos/location, reverse + interrupted animation, long records and mobile/desktop bounds.');
  }finally{await browser?.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
