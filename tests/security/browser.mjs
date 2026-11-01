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
  await context.routeWebSocket('**/*', socket => socket.close());
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>console.error('Browser error:',error.message));
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
  await page.goto(`${origin}/tests/security/fixture.html?view=editor`);
  await page.getByLabel('Profile frame').waitFor();
  assert.equal(await page.getByLabel('Profile frame').inputValue(),'none');
  assert.equal(await page.locator('option[value="fire"]').count(),0);
  assert.equal(await page.locator('.custom-preview .frame-none').count(),1);
  console.log('PASS: fire border removed from the editor and legacy saved fire profiles');

  // Exercise the actual search service and friendship hook with a local API double.
  // All other external requests and all WebSocket connections remain blocked.
  const uid = suffix => `00000000-0000-0000-0000-${String(suffix).padStart(12,'0')}`;
  const users = [[1,'tester'],[2,'Alice'],[3,'Bob'],[4,'Charlie'],[5,'Daisy'],[6,'Blocked'],[7,'Under_score'],[8,'<img src=x onerror=alert(1)>'],[9,'Fail']].map(([id,username])=>({id:uid(id),username,created_at:new Date().toISOString(),frame_style:'none'}));
  const relationships=[
    {id:1,requester_id:uid(3),addressee_id:uid(1),status:'pending'},
    {id:2,requester_id:uid(1),addressee_id:uid(4),status:'pending'},
    {id:3,requester_id:uid(1),addressee_id:uid(5),status:'accepted'}
  ];
  const mutations=[];
  const queries=[];
  await page.route('**/*.supabase.co/rest/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.endsWith('/profiles')) {
      assert.equal(url.searchParams.get('id'),`neq.${uid(1)}`);
      assert.equal(url.searchParams.get('limit'),'10');
      const pattern=url.searchParams.get('username'); queries.push(pattern);
      const term=pattern.slice('ilike.%'.length,-1).replace(/\\([\\%_])/g,'$1').toLowerCase();
      if(term==='error') return route.fulfill({status:500,json:{message:'Search unavailable'}});
      return route.fulfill({json:users.filter(p=>p.username.toLowerCase().includes(term))});
    }
    if(url.pathname.endsWith('/friendships')) {
      if(req.method()==='POST') {
        const row=req.postDataJSON();mutations.push(row);
        assert.equal(row.requester_id,uid(1));
        if(row.addressee_id===uid(9)) return route.fulfill({status:403,json:{message:'Friend request denied'}});
        assert.ok(!relationships.some(r=>r.requester_id===uid(1)&&r.addressee_id===row.addressee_id),'Duplicate request');
        relationships.push({id:relationships.length+1,...row,status:'pending'});
        return route.fulfill({status:201,json:null});
      }
      if(req.method()==='PATCH') {
        const id=Number(url.searchParams.get('id').slice(3));
        Object.assign(relationships.find(r=>r.id===id),req.postDataJSON());
        return route.fulfill({status:204,body:''});
      }
      return route.fulfill({json:relationships});
    }
    return route.abort();
  });
  await page.goto(`${origin}/tests/security/fixture.html?view=search`);
  const search=page.getByRole('searchbox',{name:'Search users'});
  const results=page.getByRole('region',{name:'User search results'});
  await search.fill('aLi');
  await results.getByRole('button',{name:'+ Add friend',exact:true}).click();
  await results.getByText('Request sent',{exact:true}).waitFor();
  assert.equal(mutations.length,1);assert.equal(mutations[0].addressee_id,uid(2));
  await search.fill('Bob');
  await results.getByRole('button',{name:'Accept request',exact:true}).click();
  await results.getByText('✓ Friends',{exact:true}).waitFor();
  for(const [term,label] of [['Charlie','Request sent'],['Daisy','✓ Friends']]) {
    await search.fill(term);await results.getByText(label,{exact:true}).waitFor();
    assert.equal(await results.getByRole('button',{name:'+ Add friend',exact:true}).count(),0);
  }
  for(const term of ['tester','Blocked','zzzz']) {
    await search.fill(term);await results.getByText('No users found.',{exact:true}).waitFor();
  }
  await search.fill('_');await results.getByRole('button',{name:'Under_score View profile',exact:true}).waitFor();
  assert.ok(queries.includes('ilike.%\\_%'),'Underscore was not escaped');
  await search.fill('error');await results.getByText('Search unavailable',{exact:true}).waitFor();
  await search.fill('Fail');await results.getByRole('button',{name:'+ Add friend',exact:true}).click();
  await results.getByText('Friend request denied',{exact:true}).waitFor();
  await search.fill('<img');await results.getByRole('button',{name:'<img src=x onerror=alert(1)> View profile',exact:true}).waitFor();
  assert.equal(await results.locator('.search-person>span img').count(),0,'Search rendered username as HTML');
  for(const width of [360,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Search overflow at ${width}`);
  }
  await search.press('Escape');await results.waitFor({state:'hidden'});
  await search.fill('Under_score');await results.getByRole('button',{name:'Under_score View profile',exact:true}).waitFor();
  await search.press('ArrowDown');await page.keyboard.press('Enter');
  await page.getByText('Selected Under_score',{exact:true}).waitFor();
  await results.waitFor({state:'hidden'});
  await search.fill('Alice');await results.getByText('Request sent',{exact:true}).waitFor();
  await page.locator('.logo-button').click();await results.waitFor({state:'hidden'});
  assert.equal(mutations.length,2,'Unexpected or duplicated friend request');
  console.log('PASS: username search, friend/accept actions, pending/friend states, self/block filters, errors, wildcard escaping, XSS and keyboard/mobile behavior');

  const attacker=await context.newPage();
  await attacker.route(`${origin}/attacker`,route=>route.fulfill({contentType:'text/html',body:`<iframe src="${origin}/"></iframe>`}));
  await attacker.goto(`${origin}/attacker`);
  await assert.rejects(attacker.frameLocator('iframe').getByRole('button',{name:'Sign In »',exact:true}).waitFor({timeout:1000}));
  console.log('PASS: application cannot be framed (clickjacking protection)');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
