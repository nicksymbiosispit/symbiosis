import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.security-dist');
const config=JSON.parse(await readFile('vercel.json','utf8'));
const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try {
    const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
    if(!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    const body=await readFile(file); res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(origin);
  await page.getByRole('button',{name:'Sign In »',exact:true}).waitFor();
  for(const width of [360,390,768,1440]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Auth overflow at ${width}`);
  }
  await page.getByRole('button',{name:'Help',exact:true}).click();
  await page.getByRole('heading',{name:'Symbiosis Help'}).waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Privacy',exact:true}).click();
  await page.locator('.privacy-policy').waitFor();
  console.log('PASS: production app loads under CSP; auth widths, Help and Privacy');
  await page.goto(`${origin}/tests/security/fixture.html`);
  await page.getByRole('button',{name:'Send',exact:true}).waitFor();
  assert.equal(await page.locator('.message-body img').count(),0,'Message payload became HTML');
  assert.equal(await page.evaluate(()=>window.__xss),undefined);
  assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts allow-same-origin');
  // Inline attacker code must be rejected by the HTTP CSP.
  await page.evaluate(()=>{const script=document.createElement('script');script.textContent='window.__inlineXss=1';document.body.append(script)});
  assert.equal(await page.evaluate(()=>window.__inlineXss),undefined);
  for(const view of ['profile','rooms','moderation']){
    await page.goto(`${origin}/tests/security/fixture.html?view=${view}`);
    await page.locator('main').waitFor();
    assert.equal(await page.evaluate(()=>window.__xss),undefined);
    if(view==='profile') {
      const frame=page.frameLocator('.custom-html-box iframe');
      await frame.getByText('Custom HTML works',{exact:true}).waitFor();
      assert.equal(await frame.locator('#custom').evaluate(el=>getComputedStyle(el).color),'rgb(10, 90, 10)');
      await frame.getByRole('button',{name:'Submit attack'}).click();
      assert.ok(page.url().includes('view=profile'),'Sandbox escaped through a form');
      assert.equal(await page.evaluate(()=>window.__xss),undefined);
      assert.equal(await page.locator('.profile-space').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(8, 11, 16)');
    }
    for(const width of [360,390,768,1440]){
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} overflow at ${width}`);
    }
  }
  console.log('PASS: rendered XSS payloads, profile sandbox/forms, custom HTML/CSS, personal colors, room/moderation layouts');
  const attacker=await context.newPage();
  await attacker.route(`${origin}/attacker`,route=>route.fulfill({contentType:'text/html',body:`<iframe src="${origin}/"></iframe>`}));
  await attacker.goto(`${origin}/attacker`);
  await assert.rejects(attacker.frameLocator('iframe').getByRole('button',{name:'Sign In »',exact:true}).waitFor({timeout:1000}));
  console.log('PASS: application cannot be framed (clickjacking protection)');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
