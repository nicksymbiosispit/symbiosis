import { useCallback, useEffect, useState } from 'react';
import { attachProfiles } from '../services/profiles.js';
import { supabase } from '../services/supabase.js';

export function useMessages(user, blockedIds = []) {
  const userId = user?.id || null;
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');
  const [lastSentAt, setLastSentAt] = useState(null);
  const [serverRemaining, setServerRemaining] = useState(0);
  const blockedKey = blockedIds.join(',');

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('messages')
      .select('id, user_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setStatus(error.message);
      return;
    }
    try {
      const newestFirst = data || [];
      const visible = newestFirst.filter(row => !blockedIds.includes(row.user_id)).reverse();
      setMessages(await attachProfiles(visible));
      const own = newestFirst.find(row => row.user_id === userId);
      setLastSentAt(own ? new Date(own.created_at).getTime() : null);
      const { data: remaining, error: cooldownError } = await supabase.rpc('my_lobby_cooldown_remaining');
      if (!cooldownError) setServerRemaining(Number(remaining) || 0);
    } catch (error) {
      setStatus(error.message || 'Could not load message profiles.');
    }
  }, [userId, blockedKey]);

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
          if (!active || blockedIds.includes(message.user_id)) return;
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, ({ old: row }) => {
        if (active) setMessages(current => current.filter(message => message.id !== row.id));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [load, userId, blockedKey]);

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
    setLastSentAt(Date.now());
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }, [userId]);

  return { messages, status, send, lastSentAt, serverRemaining, reload: load };
}
