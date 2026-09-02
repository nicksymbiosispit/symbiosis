import { useCallback, useEffect, useState } from 'react';
import { attachProfiles } from '../services/profiles.js';
import { supabase } from '../services/supabase.js';

export function useMessages(user, blockedIds = [], room = 'lobby', username = '', targetMessageId = null) {
  const userId = user?.id || null;
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');
  const [lastSentAt, setLastSentAt] = useState(null);
  const [serverRemaining, setServerRemaining] = useState(0);
  const [pingsEnabled, setPingsEnabled] = useState(()=>localStorage.getItem('symbiosis-pings')==='on');
  const blockedKey = blockedIds.join(',');

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('messages')
      .select('id, user_id, body, caption, created_at')
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setStatus(error.message);
      return;
    }
    try {
      const newestFirst = data || [];
      if (targetMessageId && !newestFirst.some(row => String(row.id) === String(targetMessageId))) {
        const { data: linked, error: linkedError } = await supabase.from('messages').select('id, user_id, body, caption, created_at').eq('room', room).eq('id', targetMessageId).maybeSingle();
        if (!linkedError && linked) newestFirst.push(linked);
      }
      const visible = newestFirst.filter(row => !blockedIds.includes(row.user_id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      setMessages(await attachProfiles(visible));
      const own = newestFirst.find(row => row.user_id === userId);
      setLastSentAt(own ? new Date(own.created_at).getTime() : null);
      // Per-room slow mode is derived from this room's newest own message.
      // The database trigger remains authoritative and survives reloads.
      setServerRemaining(0);
    } catch (error) {
      setStatus(error.message || 'Could not load message profiles.');
    }
  }, [userId, blockedKey, room, targetMessageId]);

  useEffect(() => {
    if (!supabase || !userId) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    void load();
    const channel = supabase.channel(`symbiosis-lobby-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room=eq.${room}` }, async ({ new: row }) => {
        if (!active) return;
        try {
          const [message] = await attachProfiles([row]);
          if (!active || blockedIds.includes(message.user_id)) return;
          const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (pingsEnabled && username && new RegExp(`(^|\\s)@${escaped}(?![A-Za-z0-9_!@])`, 'i').test(message.body) && message.user_id !== userId) {
            try { const Context=window.AudioContext||window.webkitAudioContext; const context=new Context(); const oscillator=context.createOscillator(); const gain=context.createGain(); oscillator.frequency.value=880; gain.gain.value=.05; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime+.12); } catch {}
            if (document.hidden && window.Notification?.permission==='granted') new Notification(`${message.profile?.username||'Someone'} pinged you in #${room}`, { body:message.body });
            setStatus(`${message.profile?.username||'Someone'} pinged you!`);
          }
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
  }, [load, userId, blockedKey, room, username, pingsEnabled]);

  const send = useCallback(async (body,caption='') => {
    const clean = String(body || '').trim();
    if (!clean || !userId || !supabase) return false;
    if (clean.length > 500) {
      setStatus('Keep messages under 500 characters.');
      return false;
    }
    setStatus('sending…');
    const { error } = await supabase.from('messages').insert({ user_id: userId, body: clean, caption:String(caption||'').trim(), room });
    if (error) {
      setStatus(error.message);
      return false;
    }
    setStatus('sent!');
    setLastSentAt(Date.now());
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }, [userId, room]);

  async function enablePings(){ if(window.Notification&&Notification.permission==='default')await Notification.requestPermission();localStorage.setItem('symbiosis-pings','on');setPingsEnabled(true); }
  async function deleteMessage(id){const {error}=await supabase.from('messages').delete().eq('id',id).eq('user_id',userId);if(error){setStatus(error.message);return false}setStatus('Message deleted.');return true}
  return { messages, status, send, deleteMessage, lastSentAt, serverRemaining, reload: load, pingsEnabled, enablePings };
}
