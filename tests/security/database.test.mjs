import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL RLS/trigger execution in a disposable WASM database. No live API calls.
const db = new PGlite();
const ids = { alice:'00000000-0000-0000-0000-000000000001', bob:'00000000-0000-0000-0000-000000000002', carol:'00000000-0000-0000-0000-000000000003', newcomer:'00000000-0000-0000-0000-000000000004', owner:'00000000-0000-0000-0000-000000000005' };
const sqlFile = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');
async function asUser(name, sql) {
  await db.exec('begin; set local role authenticated;');
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [ids[name]]);
    const result = await db.query(sql);
    await db.exec('commit'); return result;
  } catch(error) { await db.exec('rollback'); throw error; }
}
async function denied(name, sql) { await assert.rejects(asUser(name,sql)); }

await test('database authorization and anti-abuse regression suite', async t => {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,storage to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text,name text,owner_id text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
    create publication supabase_realtime;`);
  await db.exec(await sqlFile('supabase.sql'));
  await db.exec(await sqlFile('supabase-pr2.sql'));
  for(const id of Object.values(ids)) await db.query('insert into auth.users(id) values($1)',[id]);
  const migration = await sqlFile('supabase-security.sql');
  if(!process.env.SECURITY_BASELINE) {
    // An upgrade must also preserve cooldowns for messages deleted before it.
    await db.query('insert into profiles(id,username) values($1,$2)',[ids.alice,'existing']);
    await db.exec(`update rooms set slow_mode_seconds=60 where slug='lobby';
      insert into messages(user_id,body) values('${ids.alice}','pre-migration');
      delete from messages where body='pre-migration';`);
    await db.exec(migration); await db.exec(migration);
    await t.test('upgrade migration is rerunnable and seeds cooldowns from deletion history',async()=>{
      assert.ok((await asUser('alice',"select my_room_cooldown_remaining('lobby') as remaining")).rows[0].remaining>0);
      await denied('alice',`insert into messages(user_id,body) values(auth.uid(),'upgrade bypass')`);
    });
  }
  t.beforeEach(async()=>{
    await db.exec('truncate public.profiles restart identity cascade; truncate public.message_deletion_logs restart identity;');
    for(const [name,id] of Object.entries(ids)) {
      if(name!=='newcomer') await db.query('insert into public.profiles(id,username,role,tags) values($1,$2,$3,$4)',[id,name,name==='owner'?'moderator':'member',name==='owner'?['OWNER']:[]]);
    }
    await db.exec("insert into rooms(slug,name,is_builtin) values('lobby','Lobby',true),('random','Random',true),('nostalgia','Nostalgia',true)");
  });

  await t.test('profile creation cannot choose moderator or OWNER; normal signup works', async()=>{
    await denied('newcomer',`insert into profiles(id,username,role) values(auth.uid(),'rogue','moderator')`);
    await denied('newcomer',`insert into profiles(id,username,tags) values(auth.uid(),'rogue',array['OWNER'])`);
    await asUser('newcomer',`insert into profiles(id,username) values(auth.uid(),'newcomer')`);
    await denied('alice',`update profiles set tags=array['OWNER'] where id=auth.uid()`);
    await asUser('alice',`update profiles set bio='normal profile edit' where id=auth.uid()`);
    await asUser('owner',`update profiles set tags=array['DEVELOPER'] where id='${ids.carol}'`);
  });
  await t.test('friendship approval cannot replace the requester or bypass a block',async()=>{
    await asUser('alice',`insert into friendships(requester_id,addressee_id) values(auth.uid(),'${ids.bob}')`);
    await denied('bob',`update friendships set requester_id='${ids.carol}',status='accepted' where requester_id='${ids.alice}'`);
    await asUser('bob',`update friendships set status='accepted' where requester_id='${ids.alice}'`);
    await asUser('alice',`insert into direct_messages(sender_id,recipient_id,body) values(auth.uid(),'${ids.bob}','private')`);
    assert.equal((await asUser('carol','select * from direct_messages')).rows.length,0);
    assert.equal((await asUser('bob','select * from direct_messages')).rows.length,1);
    await asUser('carol',`insert into friendships(requester_id,addressee_id) values(auth.uid(),'${ids.bob}')`);
    await asUser('carol',`insert into blocks(blocker_id,blocked_id) values(auth.uid(),'${ids.bob}')`);
    await denied('bob',`update friendships set status='accepted' where requester_id='${ids.carol}'`);
    await denied('carol',`insert into direct_messages(sender_id,recipient_id,body) values(auth.uid(),'${ids.bob}','blocked')`);
  });
  await t.test('locked rooms deny direct reads, posting, and forged room creation',async()=>{
    await asUser('owner',`insert into rooms(slug,name,owner_id,minimum_role) values('staff','Staff',auth.uid(),'owner')`);
    await asUser('owner',`insert into messages(user_id,body,room) values(auth.uid(),'staff only','staff')`);
    assert.equal((await asUser('alice',"select * from messages where room='staff'")).rows.length,0);
    assert.equal((await asUser('alice',"select pinned_notice from rooms where slug='staff'")).rows.length,0);
    await denied('owner',"update rooms set slug='renamed' where slug='staff'");
    assert.equal((await asUser('owner',"select * from messages where room='staff'")).rows.length,1);
    await denied('alice',`insert into messages(user_id,body,room) values(auth.uid(),'intruder','staff')`);
    await denied('alice',`insert into rooms(slug,name,owner_id,minimum_role) values('fake','Fake',auth.uid(),'owner')`);
    await asUser('alice',`insert into rooms(slug,name,owner_id) values('public','Public',auth.uid())`);
  });
  await t.test('slow mode survives forged timestamps, deletion and batched posts',async()=>{
    await db.exec("update rooms set slow_mode_seconds=60 where slug='lobby'");
    await asUser('alice',`insert into messages(user_id,body,created_at) values(auth.uid(),'first','2000-01-01')`);
    const sent=(await asUser('alice',"select created_at from messages where body='first'")).rows[0];
    assert.ok(new Date(sent.created_at).getTime()>Date.now()-10000);
    await denied('alice',`insert into messages(user_id,body) values(auth.uid(),'second')`);
    await asUser('alice',"delete from messages where body='first'");
    assert.ok((await asUser('alice',"select my_room_cooldown_remaining('lobby') as remaining")).rows[0].remaining>0);
    await denied('alice',`insert into messages(user_id,body) values(auth.uid(),'after delete')`);
    await denied('carol',`insert into messages(user_id,body) values(auth.uid(),'batch one'),(auth.uid(),'batch two')`);
    assert.equal((await asUser('carol',"select * from messages where body like 'batch%'")).rows.length,0);
    await asUser('owner',`insert into messages(user_id,body) values(auth.uid(),'staff one'),(auth.uid(),'staff two')`);
  });
  await t.test('site ban cannot be bypassed with direct DM, bulletin, room or upload writes',async()=>{
    await asUser('alice',`insert into friendships(requester_id,addressee_id) values(auth.uid(),'${ids.bob}')`);
    await asUser('bob',`update friendships set status='accepted' where requester_id='${ids.alice}'`);
    await asUser('owner',`insert into moderation_actions(target_user_id,moderator_id,action_type) values('${ids.alice}',auth.uid(),'ban')`);
    assert.equal((await asUser('alice','select * from moderation_actions where target_user_id=auth.uid()')).rows.length,1,'Ban screen must retain its own action');
    await denied('alice',`insert into direct_messages(sender_id,recipient_id,body) values(auth.uid(),'${ids.bob}','banned DM')`);
    assert.equal((await asUser('alice','select * from direct_messages')).rows.length,0);
    await denied('alice',`insert into bulletins(author_id,title,body) values(auth.uid(),'Banned','post')`);
    await denied('alice',`insert into rooms(slug,name,owner_id) values('banned','Banned',auth.uid())`);
    await denied('alice',`insert into storage.objects(bucket_id,name,owner_id) values('room-media',auth.uid()||'/test.png',auth.uid()::text)`);
    await denied('alice',`insert into messages(user_id,body) values(auth.uid(),'banned post')`);
    await asUser('owner',`update moderation_actions set revoked_at=now() where target_user_id='${ids.alice}'`);
    await asUser('alice',`insert into direct_messages(sender_id,recipient_id,body) values(auth.uid(),'${ids.bob}','restored')`);
    await asUser('owner',`insert into moderation_actions(target_user_id,moderator_id,action_type) values(auth.uid(),auth.uid(),'ban')`);
    await denied('owner',`insert into moderation_actions(target_user_id,moderator_id,action_type) values('${ids.bob}',auth.uid(),'ban')`);
    assert.equal((await asUser('owner','select * from moderation_actions')).rows.length,1,'Banned staff should see only their own action');
  });
  await t.test('private block relationships cannot be probed by a third account',async()=>{
    await asUser('carol',`insert into blocks(blocker_id,blocked_id) values(auth.uid(),'${ids.bob}')`);
    const probe=(await asUser('alice',`select users_blocked('${ids.carol}','${ids.bob}') as blocked`)).rows[0];
    assert.equal(probe.blocked,false);
    assert.equal((await asUser('bob',`select users_blocked('${ids.carol}',auth.uid()) as blocked`)).rows[0].blocked,true);
  });
  await t.test('account exports and login histories stay scoped to the caller',async()=>{
    await asUser('bob',`insert into login_history(user_id,device_label) values(auth.uid(),'test device')`);
    assert.equal((await asUser('carol','select * from login_history')).rows.length,0);
    const exported=(await asUser('carol','select export_my_account_data() as data')).rows[0].data;
    assert.equal(exported.account_id,ids.carol); assert.equal(exported.direct_messages.length,0);
    await denied('carol',`insert into login_history(user_id) values('${ids.bob}')`);
  });
  await t.test('anonymous access and direct rate-limit tampering are denied',async()=>{
    await db.exec('begin; set local role anon;');
    try { await assert.rejects(db.query('select * from direct_messages')); } finally {await db.exec('rollback');}
    if(!process.env.SECURITY_BASELINE) await denied('bob','delete from message_rate_limits');
  });
  await db.close();
});
