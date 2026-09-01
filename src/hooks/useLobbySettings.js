import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function useLobbySettings(userId) {
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [showChatProfileBorders, setShowChatProfileBorders] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('lobby_settings')
      .select('slow_mode_seconds, show_chat_profile_borders')
      .eq('id', 1)
      .single();
    if (error) setStatus(error.message);
    else { setSlowModeSeconds(data.slow_mode_seconds || 0); setShowChatProfileBorders(data.show_chat_profile_borders !== false); }
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) return undefined;
    void load();
    const channel = supabase.channel(`lobby-settings-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobby_settings', filter: 'id=eq.1' }, ({ new: row }) => {
        setSlowModeSeconds(row.slow_mode_seconds || 0); setShowChatProfileBorders(row.show_chat_profile_borders !== false);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, userId]);

  const updateSlowMode = useCallback(async (seconds) => {
    if (!supabase || !userId) return false;
    setStatus('saving…');
    const { error } = await supabase.from('lobby_settings').update({
      slow_mode_seconds: Number(seconds),
      updated_at: new Date().toISOString(),
      updated_by: userId
    }).eq('id', 1);
    if (error) {
      setStatus(error.message);
      return false;
    }
    setSlowModeSeconds(Number(seconds));
    setStatus('saved');
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }, [userId]);

  const updateChatProfileBorders = useCallback(async (enabled) => {
    if (!supabase || !userId) return false;
    setStatus('saving…');
    const { error } = await supabase.from('lobby_settings').update({
      show_chat_profile_borders: Boolean(enabled),
      updated_at: new Date().toISOString(),
      updated_by: userId
    }).eq('id', 1);
    if (error) { setStatus(error.message); return false; }
    setShowChatProfileBorders(Boolean(enabled));
    setStatus('saved');
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }, [userId]);

  return { slowModeSeconds, showChatProfileBorders, status, updateSlowMode, updateChatProfileBorders };
}
