import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mediaEmbed} from '../../src/services/media.js';
const source = path => readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('media embedding rejects script/data schemes and never turns lookalike hosts into frames',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','//evil.example/a','https://']) assert.equal(mediaEmbed(url),null);
  for(const url of ['https://tenor.com.evil.example/a-123','https://giphy.com@evil.example/a-123']) assert.equal(mediaEmbed(url).type,'image');
  assert.deepEqual(mediaEmbed('https://tenor.com/view/a-123'),{type:'frame',src:'https://tenor.com/embed/123'});
  assert.deepEqual(mediaEmbed('https://giphy.com/gifs/example-abc123'),{type:'frame',src:'https://giphy.com/embed/abc123'});
});
test('production headers prevent framing, inline script injection, object embeds and referrer leaks',async()=>{
  const config=JSON.parse(await source('vercel.json'));
  const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
  assert.equal(headers['X-Frame-Options'],'DENY');
  assert.equal(headers['X-Content-Type-Options'],'nosniff');
  assert.equal(headers['Referrer-Policy'],'no-referrer');
  const csp=headers['Content-Security-Policy'];
  assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/object-src 'none'/);
  assert.match(csp,/script-src 'self';/);assert.doesNotMatch(csp,/unsafe-eval/);
});
