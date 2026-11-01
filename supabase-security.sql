-- Apply AFTER supabase.sql and supabase-pr2.sql, using the Supabase SQL Editor.
-- Transactional and rerunnable; this changes authorization, not user content.
-- Deploying the web app alone does NOT apply this migration.
begin;

-- JWT-bearing clients must not choose staff privileges at profile creation.
-- A SQL Editor/service operation without an end-user JWT may provision staff.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and (new.role <> 'member' or cardinality(new.tags) <> 0) then
      raise exception 'New accounts must start as members' using errcode = '42501';
    end if;
  else
    if new.id is distinct from old.id then
      raise exception 'Account identity is immutable' using errcode = '42501';
    end if;
    if auth.uid() is not null
       and (new.role is distinct from old.role or new.tags is distinct from old.tags)
       and not public.has_staff_access(auth.uid(),'owner') then
      raise exception 'Only an owner can change account tags or staff access' using errcode = '42501';
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before insert or update on public.profiles
for each row execute function public.protect_profile_role();

-- An invite recipient may approve/decline the existing pair, never substitute
-- another account and fabricate an accepted friendship with that person.
create or replace function public.protect_friendship_participants()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
     or new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Friendship participants are immutable' using errcode = '42501';
  end if;
  if public.users_blocked(new.requester_id,new.addressee_id) then
    raise exception 'This friendship is blocked' using errcode = '42501';
  end if;
  return new;
end;$$;
drop trigger if exists protect_friendship_participants_trigger on public.friendships;
create trigger protect_friendship_participants_trigger before update on public.friendships
for each row execute function public.protect_friendship_participants();

-- Do not expose third parties' private block relationships through the RPC.
create or replace function public.users_blocked(user_a uuid, user_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (auth.uid() = user_a or auth.uid() = user_b) and exists (
    select 1 from public.blocks where
      (blocker_id = user_a and blocked_id = user_b) or
      (blocker_id = user_b and blocked_id = user_a)
  );
$$;

create or replace function public.is_site_banned()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.moderation_actions a
    where a.target_user_id = auth.uid() and a.action_type = 'ban' and a.room_slug is null
      and a.revoked_at is null and (a.expires_at is null or a.expires_at > now()));
$$;

-- A locked room must protect both messages and metadata (including pinned
-- notices and banners), not just new posts.
create or replace function public.can_read_room(check_room text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and not public.is_site_banned()
    and exists(select 1 from public.rooms r where r.slug = check_room
      and (r.minimum_role = 'everyone' or public.has_staff_access(auth.uid(),r.minimum_role)))
    and not exists(select 1 from public.moderation_actions a
      where a.target_user_id = auth.uid() and a.action_type in ('ban','kick')
        and (a.room_slug is null or a.room_slug = check_room)
        and a.revoked_at is null and (a.expires_at is null or a.expires_at > now()));
$$;
drop policy if exists "messages_select_authenticated" on public.messages;
create policy "messages_select_authenticated" on public.messages for select to authenticated
using (public.can_read_room(room));
drop policy if exists "rooms_read" on public.rooms;
create policy "rooms_read" on public.rooms for select to authenticated
using (public.can_read_room(slug));

-- The room key cannot change: messages use it as a text reference. Otherwise
-- a renamed locked room could be recreated publicly under its old key.
create or replace function public.protect_room_staff_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'Room URL names are immutable' using errcode = '42501';
  end if;
  if not public.is_moderator(auth.uid()) and
    (new.owner_id is distinct from old.owner_id or new.minimum_role is distinct from old.minimum_role or new.is_builtin is distinct from old.is_builtin) then
    raise exception 'Only staff can change room ownership or access locks' using errcode = '42501';
  end if;
  return new;
end;$$;

-- Insert restrictions are needed in addition to the existing update trigger.
drop policy if exists "rooms_create" on public.rooms;
create policy "rooms_create" on public.rooms for insert to authenticated
with check (auth.uid() = owner_id and not is_builtin
  and (minimum_role = 'everyone' or public.is_moderator()));

-- The ban screen is not an authorization boundary. These restrictive policies
-- apply even when other permissive policies allow the operation.
do $$
declare target_table text;
begin
  foreach target_table in array array['direct_messages','friendships','bulletins','top_friends',
    'room_favorites','site_events'] loop
    execute format('drop policy if exists security_site_ban on public.%I',target_table);
    execute format('create policy security_site_ban on public.%I as restrictive for all to authenticated using (not public.is_site_banned()) with check (not public.is_site_banned())',target_table);
  end loop;
end;$$;
-- Preserve the banned account's own action so the existing ban screen can
-- display its reason/expiry, while denying further staff mutations.
drop policy if exists "security_site_ban" on public.moderation_actions;
drop policy if exists "security_action_ban_read" on public.moderation_actions;
create policy "security_action_ban_read" on public.moderation_actions as restrictive for select to authenticated
using (not public.is_site_banned() or target_user_id = auth.uid());
drop policy if exists "security_action_ban_insert" on public.moderation_actions;
create policy "security_action_ban_insert" on public.moderation_actions as restrictive for insert to authenticated
with check (not public.is_site_banned());
drop policy if exists "security_action_ban_update" on public.moderation_actions;
create policy "security_action_ban_update" on public.moderation_actions as restrictive for update to authenticated
using (not public.is_site_banned()) with check (not public.is_site_banned());
drop policy if exists "security_room_ban_insert" on public.rooms;
create policy "security_room_ban_insert" on public.rooms as restrictive for insert to authenticated
with check (not public.is_site_banned());
drop policy if exists "security_room_ban_update" on public.rooms;
create policy "security_room_ban_update" on public.rooms as restrictive for update to authenticated
using (not public.is_site_banned()) with check (not public.is_site_banned());
drop policy if exists "security_profile_ban_update" on public.profiles;
create policy "security_profile_ban_update" on public.profiles as restrictive for update to authenticated
using (not public.is_site_banned()) with check (not public.is_site_banned());
-- Keep the banned user's own profile and action readable for the existing ban UI.
-- Reports/blocks and caller-scoped account export remain available.
drop policy if exists "security_upload_ban" on storage.objects;
create policy "security_upload_ban" on storage.objects as restrictive for insert to authenticated
with check (bucket_id not in ('profile-images','profile-music','room-media') or not public.is_site_banned());
drop policy if exists "security_upload_ban_update" on storage.objects;
create policy "security_upload_ban_update" on storage.objects as restrictive for update to authenticated
using (bucket_id not in ('profile-images','profile-music','room-media') or not public.is_site_banned())
with check (bucket_id not in ('profile-images','profile-music','room-media') or not public.is_site_banned());

-- Atomic per-user/per-room send clock. It is private, survives message deletion,
-- and uses database time instead of a caller-supplied created_at. ON CONFLICT
-- serializes competing inserts on the same key, including batched requests.
create table if not exists public.message_rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  room text not null references public.rooms(slug) on delete cascade,
  last_sent_at timestamptz not null,
  primary key(user_id,room)
);
alter table public.message_rate_limits enable row level security;
revoke all on public.message_rate_limits from public, anon, authenticated;
insert into public.message_rate_limits(user_id,room,last_sent_at)
select history.user_id,history.room,max(history.created_at) from (
  select user_id,room,created_at from public.messages
  union all select author_id,room,created_at from public.message_deletion_logs
) history join public.profiles p on p.id = history.user_id
join public.rooms r on r.slug = history.room
group by history.user_id,history.room
on conflict(user_id,room) do update set last_sent_at = greatest(public.message_rate_limits.last_sent_at,excluded.last_sent_at);

create or replace function public.enforce_message_access()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.rooms%rowtype; wait_seconds integer;
begin
  select * into r from public.rooms where slug = new.room;
  if not found then raise exception 'Room does not exist'; end if;
  if r.minimum_role <> 'everyone' and not public.has_staff_access(new.user_id,r.minimum_role) then
    raise exception 'This room is locked to %+',r.minimum_role using errcode = '42501';
  end if;
  if exists(select 1 from public.moderation_actions a where a.target_user_id = new.user_id
    and a.revoked_at is null and (a.expires_at is null or a.expires_at > now())
    and a.action_type in ('timeout','mute','kick','ban') and (a.room_slug is null or a.room_slug = new.room)) then
    raise exception 'You cannot post while a moderation action is active' using errcode = '42501';
  end if;
  if r.media_mode = 'images_only' and new.body !~* '^https?://[^[:space:]]+$' then
    raise exception '#% accepts image/GIF links only',new.room;
  end if;
  if r.media_mode = 'disabled' and new.body ~* '^https?://[^[:space:]]+$' then
    raise exception 'Media is disabled in this room';
  end if;
  wait_seconds := case when public.is_moderator(new.user_id) then 0 else r.slow_mode_seconds end;
  new.created_at := clock_timestamp();
  insert into public.message_rate_limits(user_id,room,last_sent_at)
  values(new.user_id,new.room,new.created_at)
  on conflict(user_id,room) do update set last_sent_at = greatest(public.message_rate_limits.last_sent_at,excluded.last_sent_at)
    where wait_seconds = 0 or public.message_rate_limits.last_sent_at <= excluded.last_sent_at - make_interval(secs => wait_seconds);
  if not found then raise exception 'Slow mode is active. Wait before sending again.'; end if;
  return new;
end;$$;

create or replace function public.my_room_cooldown_remaining(check_room text)
returns integer language sql stable security definer set search_path = '' as $$
  select case when public.is_moderator() then 0 else coalesce((
    select greatest(0,ceil(extract(epoch from (limits.last_sent_at + make_interval(secs => r.slow_mode_seconds) - now())))::integer)
    from public.message_rate_limits limits join public.rooms r on r.slug = limits.room
    where limits.user_id = auth.uid() and limits.room = check_room
  ),0) end;
$$;
-- Keep the legacy endpoint consistent for older clients too.
create or replace function public.my_lobby_cooldown_remaining(check_room text default 'lobby')
returns integer language sql stable security definer set search_path = '' as $$
  select public.my_room_cooldown_remaining(check_room);
$$;

revoke all on function public.is_site_banned(),public.can_read_room(text),
  public.users_blocked(uuid,uuid),public.my_room_cooldown_remaining(text),
  public.my_lobby_cooldown_remaining(text),public.has_staff_access(uuid,text) from public,anon;
grant execute on function public.is_site_banned(),public.can_read_room(text),
  public.users_blocked(uuid,uuid),public.my_room_cooldown_remaining(text),
  public.my_lobby_cooldown_remaining(text),public.has_staff_access(uuid,text) to authenticated;
revoke all on function public.protect_profile_role(),public.protect_friendship_participants(),
  public.enforce_message_access(),public.protect_room_staff_fields() from public,anon,authenticated;
commit;
