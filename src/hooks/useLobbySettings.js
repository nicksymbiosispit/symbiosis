import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function useLobbySettings(userId) {
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [chatFramesEnabled, setChatFramesEnabled] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('lobby_settings')
      .select('slow_mode_seconds, chat_frames_enabled')
      .eq('id', 1)
      .single();
    if (error) setStatus(error.message);
    else { setSlowModeSeconds(data.slow_mode_seconds || 0); setChatFramesEnabled(data.chat_frames_enabled !== false); }
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) return undefined;
    void load();
    const channel = supabase.channel(`lobby-settings-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobby_settings', filter: 'id=eq.1' }, ({ new: row }) => {
        setSlowModeSeconds(row.slow_mode_seconds || 0);
        setChatFramesEnabled(row.chat_frames_enabled !== false);
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

  const updateChatFrames = useCallback(async (enabled) => {
    if (!supabase || !userId) return false;
    setStatus('saving…');
    const { error } = await supabase.from('lobby_settings').update({ chat_frames_enabled:Boolean(enabled), updated_at:new Date().toISOString(), updated_by:userId }).eq('id',1);
    if (error) { setStatus(error.message); return false; }
    setChatFramesEnabled(Boolean(enabled)); setStatus('saved'); window.setTimeout(()=>setStatus(''),900); return true;
  }, [userId]);

  return { slowModeSeconds, chatFramesEnabled, status, updateSlowMode, updateChatFrames };
}
