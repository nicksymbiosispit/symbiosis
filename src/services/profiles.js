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
    music_url: changes.music_url.trim(), music_title: changes.music_title.trim(),
    music_track: changes.music_track || '', player_style: changes.player_style || 'terminal',
    stickers: Array.isArray(changes.stickers) ? changes.stickers.slice(0, 40) : []
  };
  const { data, error } = await supabase.from('profiles').update(allowed).eq('id', userId)
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId, file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile images must be 5 MB or smaller.');
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
}

export async function uploadProfileMusic(userId, file) {
  const allowed = ['audio/mpeg', 'audio/ogg', 'application/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'];
  if (!allowed.includes(file?.type)) throw new Error('Choose an MP3, OGG, WAV, or M4A audio file.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Profile songs must be 20 MB or smaller.');
  const extension = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  const path = `${userId}/song-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('profile-music').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('profile-music').getPublicUrl(path).data.publicUrl;
}
