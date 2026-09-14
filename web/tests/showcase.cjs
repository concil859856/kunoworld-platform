// Browser interactions for the cinematic hero and screening room.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.SITE_TEST_ORIGIN || 'http://127.0.0.1:8788';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Hero reel: the clips are data (lib/showcase.ts), so assert behaviour and labelling, not file names.
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('.reel-media video')?.getAttribute('src'));
  const firstClip=await page.locator('.reel-media video').getAttribute('src');
  await page.getByRole('button',{name:/^Show clip 2 of /}).click();
  await page.waitForFunction(first=>{const src=document.querySelector('.reel-media video')?.getAttribute('src');return Boolean(src&&src!==first);},firstClip);
  await page.locator('.reel-media video').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=2)return resolve();v.addEventListener('canplay',resolve,{once:true});v.addEventListener('error',reject,{once:true});}));
  await page.locator('.reel-hero').getByRole('button',{name:'Pause background video'}).click();
  assert.equal(await page.locator('.reel-media video').evaluate(v=>v.paused),true);
  assert.match(await page.locator('.reel-provenance').innerText(),/^Sample · .+, not made on the network$/);
  // Sample footage never claims to be network output, on any card or tab.
  assert.equal(await page.locator('.model-card').count(),6);
  for(const chip of await page.locator('.sample-chip').allInnerTexts())assert.match(chip,/^Sample · /);
  await page.getByRole('tab',{name:'Keyframes',exact:true}).click();
  assert.match(await page.getByRole('tabpanel').locator('.mode-provenance').innerText(),/not made on the network/);
  // Radix moves focus on the next tick, so wait for the selection rather than reading it at once.
  await page.getByRole('tab',{name:'Keyframes',exact:true}).press('ArrowRight');
  await page.getByRole('tab',{name:'References',exact:true,selected:true}).waitFor();
  await page.goto(origin+'/showcase');await page.getByRole('tab',{name:'Fashion',exact:true}).click();
  assert.equal(await page.locator('.film-gallery-card').count(),1);
  await page.getByRole('button',{name:'Watch A moment, in vermilion',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  const dimensions=await dialog.locator('video').evaluate(v=>new Promise((resolve,reject)=>{const done=()=>resolve({width:v.videoWidth,height:v.videoHeight});if(v.readyState>=1)return done();v.addEventListener('loadedmetadata',done,{once:true});v.addEventListener('error',reject,{once:true});}));
  assert.ok(dimensions.height>dimensions.width);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await page.getByRole('tab',{name:'Animation',exact:true}).click();assert.equal(await page.locator('.film-gallery-card').count(),1);
  await page.getByRole('button',{name:'Watch A city, folded into being',exact:true}).click();await dialog.waitFor();
  assert.equal(await dialog.locator('video').getAttribute('src'),'/media/paper-metropolis.mp4');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await page.getByRole('tab',{name:'Art & motion',exact:true}).click();assert.equal(await page.locator('.film-gallery-card').count(),2);
  await page.getByRole('tab',{name:'All films',exact:true}).click();assert.equal(await page.locator('.film-gallery-card').count(),9);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(origin);await page.getByRole('button',{name:'Play background video'}).first().waitFor();
  assert.equal(await page.locator('.reel-media video').evaluate(v=>v.paused),true);
  const articleSlugs=['directing-the-impossible','a-language-for-camera-movement','why-a-video-needs-a-receipt','building-a-product-film-one-shot-at-a-time','one-movement-for-a-vertical-fashion-film'];
  for(const route of ['/','/showcase','/use-cases','/docs','/developers','/api','/models','/blog','/about','/privacy','/studio',...articleSlugs.map(slug=>'/blog/'+slug)]){
   for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});const response=await page.goto(origin+route);assert.equal(response.status(),200,route);
    await page.locator('h1').first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${route} overflows ${width}`);
    await page.locator('img').evaluateAll(images=>images.forEach(img=>{img.loading='eager'}));
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete));
    const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src));assert.deepEqual(broken,[],`${route} missing images`);
    const retired=await page.locator('img,video').evaluateAll(media=>media.flatMap(el=>[el.getAttribute('src'),el.getAttribute('poster')]).filter(src=>src&&/\/(hero-cove|horizon|shoreline|sailboat|limestone)(-poster)?\.(webp|mp4)/.test(src)));assert.deepEqual(retired,[],`${route} still uses an ocean scene`);
   }
  }
  const missing=await page.goto(origin+'/blog/this-article-does-not-exist');assert.equal(missing.status(),404);
  assert.deepEqual(errors,[]);console.log('Hero switching, film modal, filters, portrait playback, reduced motion, 16 page routes × 2 widths, images, 404: passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
