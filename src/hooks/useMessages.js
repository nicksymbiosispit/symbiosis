import { useCallback, useEffect, useState } from 'react';
import { attachProfiles } from '../services/profiles.js';
import { supabase } from '../services/supabase.js';

export function useMessages(user) {
  const userId = user?.id || null;
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('messages')
      .select('id, user_id, body, created_at')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      setStatus(error.message);
      return;
    }
    try {
      setMessages(await attachProfiles(data || []));
    } catch (error) {
      setStatus(error.message || 'Could not load message profiles.');
    }
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    void load();
    const channel = supabase.channel(`symbiosis-lobby-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: row }) => {
        if (!active) return;
        try {
          const [message] = await attachProfiles([row]);
          if (!active) return;
          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) return current;
            return [...current, message]
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .slice(-100);
          });
        } catch (error) {
          if (active) setStatus(error.message || 'Could not receive the new message.');
        }
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const send = useCallback(async (body) => {
    const clean = String(body || '').trim();
    if (!clean || !userId || !supabase) return false;
    if (clean.length > 500) {
      setStatus('Keep messages under 500 characters.');
      return false;
    }
    setStatus('sending…');
    const { error } = await supabase.from('messages').insert({ user_id: userId, body: clean });
    if (error) {
      setStatus(error.message);
      return false;
    }
    setStatus('sent!');
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }, [userId]);

  return { messages, status, send };
}
