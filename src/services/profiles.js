import { supabase } from './supabase.js';

export async function ensureProfile(user, requestedUsername = null) {
  const { data, error } = await supabase.from('profiles').select('id, username, bio, location, mood').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const username = requestedUsername || user.user_metadata?.username || `user${user.id.slice(0, 6)}`;
  const result = await supabase.from('profiles').insert({ id: user.id, username })
    .select('id, username, bio, location, mood').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function attachProfiles(messages) {
  const ids = [...new Set(messages.map((message) => message.user_id))];
  if (!ids.length) return messages;
  const { data, error } = await supabase.from('profiles').select('id, username, bio, location, mood').in('id', ids);
  if (error) throw error;
  const profileMap = new Map((data || []).map((profile) => [profile.id, profile]));
  return messages.map((message) => ({
    ...message,
    profile: profileMap.get(message.user_id) || { username: 'Unknown user' }
  }));
}

export async function listProfiles(currentUserId) {
  const { data, error } = await supabase.from('profiles')
    .select('id, username, bio, location, mood, created_at').neq('id', currentUserId).order('username');
  if (error) throw error;
  return data || [];
}

export async function updateProfile(userId, changes) {
  const allowed = {
    bio: changes.bio.trim(), location: changes.location.trim(), mood: changes.mood.trim()
  };
  const { data, error } = await supabase.from('profiles').update(allowed).eq('id', userId)
    .select('id, username, bio, location, mood').single();
  if (error) throw error;
  return data;
}
