import { supabase } from './supabase.js';

export async function loadFriendships(userId) {
  const { data, error } = await supabase.from('friendships').select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function requestFriend(userId, personId) {
  const { error } = await supabase.from('friendships').insert({ requester_id: userId, addressee_id: personId });
  if (error) throw error;
}

export async function answerFriendRequest(id, status) {
  const { error } = await supabase.from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function removeFriendship(id) {
  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) throw error;
}
