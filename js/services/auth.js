import { supabase } from './supabase.js';

export async function ensureProfile(user, usernameFromSignup = null) {
  const { data, error } = await supabase.from('profiles').select('id, username').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const username = usernameFromSignup || user.user_metadata?.username || `user${user.id.slice(0, 6)}`;
  const { data: inserted, error: insertError } = await supabase
    .from('profiles').insert({ id: user.id, username }).select('id, username').single();
  if (insertError) throw insertError;
  return inserted;
}
