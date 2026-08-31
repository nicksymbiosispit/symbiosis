import { supabase } from './supabase.js';

export async function ensureProfile(user, requestedUsername = null) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const username = requestedUsername || user.user_metadata?.username || `user${user.id.slice(0, 6)}`;
  const result = await supabase.from('profiles').insert({ id: user.id, username })
    .select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function attachProfiles(messages) {
  const ids = [...new Set(messages.map((message) => message.user_id))];
  if (!ids.length) return messages;
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  const profileMap = new Map((data || []).map((profile) => [profile.id, profile]));
  return messages.map((message) => ({
    ...message,
    profile: profileMap.get(message.user_id) || { username: 'Unknown user' }
  }));
}

export async function listProfiles(currentUserId) {
  const { data, error } = await supabase.from('profiles')
    .select('*').neq('id', currentUserId).order('username');
  if (error) throw error;
  return data || [];
}

export async function updateProfile(userId, changes) {
  const allowed = {
    bio: changes.bio.trim(), location: changes.location.trim(), mood: changes.mood.trim(),
    avatar_url: changes.avatar_url.trim(), accent_color: changes.accent_color,
    background_color: changes.background_color, frame_style: changes.frame_style,
    music_url: changes.music_url.trim(), music_title: changes.music_title.trim()
  };
  const { data, error } = await supabase.from('profiles').update(allowed).eq('id', userId)
    .select('*').single();
  if (error) throw error;
  return data;
}
