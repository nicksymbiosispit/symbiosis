import { supabase } from './supabase.js';

export async function recordLogin(userId) {
  if (!supabase || !userId) return;
  const key = `symbiosis-login-recorded:${userId}`;
  if (sessionStorage.getItem(key)) return;
  const { error } = await supabase.from('login_history').insert({
    user_id: userId,
    user_agent: navigator.userAgent.slice(0, 500),
    device_label: [navigator.platform, navigator.language].filter(Boolean).join(' · ').slice(0, 120)
  });
  if (!error) sessionStorage.setItem(key, '1');
}

export async function loadLoginHistory(userId) {
  const { data, error } = await supabase.from('login_history').select('id,logged_in_at,device_label,user_agent').eq('user_id', userId).order('logged_in_at', { ascending: false }).limit(25);
  if (error) throw error;
  return data || [];
}

export async function downloadAccountExport() {
  const { data, error } = await supabase.rpc('export_my_account_data');
  if (error) throw error;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `symbiosis-account-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
